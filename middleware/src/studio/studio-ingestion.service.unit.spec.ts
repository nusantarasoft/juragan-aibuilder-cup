import { Readable } from 'stream';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { StudioIngestionService } from './studio-ingestion.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';

const SOURCE_ID = 'src-1';
const MEDIA_ID = '233c0096-0c2c-4738-8860-94559b87e954';
const NOTEBOOK_ID = 'nb-1';

function streamFromText(text: string): Readable {
    const stream = new Readable();
    stream.push(Buffer.from(text));
    stream.push(null);
    return stream;
}

function buildIngestionService(options?: {
    source?: Record<string, unknown>;
    media?: Record<string, unknown> | null;
    getObjectImpl?: (bucket: string, key: string) => Readable | null;
}) {
    const sourceRow = options?.source ?? {
        id: SOURCE_ID,
        notebook_id: NOTEBOOK_ID,
        media_id: MEDIA_ID,
        filename: 'report.docx',
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        s3_key: 'report.docx',
    };

    const sourceSingle = vi.fn().mockResolvedValue({ data: sourceRow, error: null });
    const sourceUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const sourceUpdate = vi.fn().mockReturnValue({ eq: sourceUpdateEq });
    const mediaMaybeSingle = vi.fn().mockResolvedValue({
        data: options?.media ?? {
            s3_key: 'report.docx',
            filename: 'report.docx',
            bucket_name: 'percontohan',
        },
        error: null,
    });
    const chunksDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const chunksInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
        if (table === 'studio_notebook_sources') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({ single: sourceSingle }),
                }),
                update: sourceUpdate,
            };
        }
        if (table === 'media') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({ maybeSingle: mediaMaybeSingle }),
                }),
            };
        }
        if (table === 'studio_source_chunks') {
            return {
                delete: vi.fn().mockReturnValue({ eq: chunksDeleteEq }),
                insert: chunksInsert,
            };
        }
        throw new Error(`Unexpected table: ${table}`);
    });

    const ragService = {
        describeMedia: vi.fn().mockResolvedValue(null),
        extractDocumentText: vi.fn().mockResolvedValue(
            'Laporan penjualan kuartal ini menunjukkan pertumbuhan yang stabil di seluruh kategori produk utama.',
        ),
        embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    } as unknown as RagService;

    const configMock = {
        get: (key: string) => {
            if (key === 'S3_ENDPOINT') return 'http://127.0.0.1:9000';
            if (key === 'S3_BUCKET') return 'cms-media';
            return undefined;
        },
    } as unknown as ConfigService;

    const service = new StudioIngestionService(
        configMock,
        { getAdminClient: () => ({ from }) } as unknown as SupabaseService,
        ragService,
    );

    const getObject = vi.fn((bucket: string, key: string, cb: (err: Error | null, stream?: Readable) => void) => {
        const stream = options?.getObjectImpl?.(bucket, key);
        if (!stream) {
            cb(new Error('NoSuchKey'));
            return;
        }
        cb(null, stream);
    });
    (service as unknown as { minioClient: { getObject: typeof getObject } }).minioClient = { getObject };

    return {
        service,
        getObject,
        ragService,
        sourceUpdate,
        chunksInsert,
    };
}

describe('StudioIngestionService.ingestSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reads media-library files from the media bucket, not cms-media', async () => {
        const { service, getObject, ragService } = buildIngestionService({
            getObjectImpl: (bucket, key) => {
                expect(bucket).toBe('percontohan');
                expect(key).toBe('report.docx');
                return streamFromText('docx-binary');
            },
        });

        await service.ingestSource(SOURCE_ID);

        expect(getObject).toHaveBeenCalledWith(
            'percontohan',
            'report.docx',
            expect.any(Function),
        );
        expect(ragService.extractDocumentText).toHaveBeenCalled();
    });

    it('uses default bucket for direct uploads without media_id', async () => {
        const { service, getObject } = buildIngestionService({
            source: {
                id: SOURCE_ID,
                notebook_id: NOTEBOOK_ID,
                media_id: null,
                filename: 'upload.pdf',
                file_type: 'application/pdf',
                s3_key: 'studio/nb-1/upload.pdf',
            },
            media: null,
            getObjectImpl: (bucket, key) => {
                expect(bucket).toBe('cms-media');
                expect(key).toBe('studio/nb-1/upload.pdf');
                return streamFromText('pdf-binary');
            },
        });

        await service.ingestSource(SOURCE_ID);

        expect(getObject).toHaveBeenCalledWith(
            'cms-media',
            'studio/nb-1/upload.pdf',
            expect.any(Function),
        );
    });

    it('stores bucket/key in parse_error when storage read fails', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            getObjectImpl: () => null,
        });

        await service.ingestSource(SOURCE_ID);

        const errorPatch = sourceUpdate.mock.calls
            .map((call) => call[0] as { parse_status?: string; parse_error?: string; parse_stage?: string })
            .find((patch) => patch?.parse_status === 'error');
        expect(errorPatch?.parse_error).toContain('percontohan/report.docx');
        expect(errorPatch?.parse_stage).toBe('error');
    });
});
