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
    sourceResult?: { data: unknown; error: unknown };
    media?: Record<string, unknown> | null;
    getObjectImpl?: (bucket: string, key: string) => Readable | null;
    getObjectError?: boolean;
    describeMedia?: unknown;
    describeMediaReject?: unknown;
    extractText?: string;
    embedImpl?: () => Promise<unknown>;
    chunksInsertError?: unknown;
    config?: Record<string, string | undefined>;
    sourcesList?: { data: unknown; error?: unknown };
}) {
    const sourceRow = options?.source ?? {
        id: SOURCE_ID,
        notebook_id: NOTEBOOK_ID,
        media_id: MEDIA_ID,
        filename: 'report.docx',
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        s3_key: 'report.docx',
    };

    const sourceSingle = vi
        .fn()
        .mockResolvedValue(options?.sourceResult ?? { data: sourceRow, error: null });
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
    const chunksInsert = vi.fn().mockResolvedValue({ error: options?.chunksInsertError ?? null });

    // .eq() is both a thenable (reindex awaits the list) and exposes .single() (ingest reads one row).
    const sourcesListValue = options?.sourcesList ?? { data: [], error: null };
    const eqReturn: Record<string, unknown> = {
        single: sourceSingle,
        then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(sourcesListValue).then(resolve, reject),
    };

    const from = vi.fn((table: string) => {
        if (table === 'studio_notebook_sources') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue(eqReturn),
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

    const describeMedia = options?.describeMediaReject
        ? vi.fn().mockRejectedValue(options.describeMediaReject)
        : vi.fn().mockResolvedValue(options?.describeMedia ?? null);

    const ragService = {
        describeMedia,
        extractDocumentText: vi.fn().mockResolvedValue(
            options?.extractText ??
                'Laporan penjualan kuartal ini menunjukkan pertumbuhan yang stabil di seluruh kategori produk utama.',
        ),
        embedText: options?.embedImpl
            ? vi.fn().mockImplementation(options.embedImpl)
            : vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    } as unknown as RagService;

    const configValues: Record<string, string | undefined> = options?.config ?? {
        S3_ENDPOINT: 'http://127.0.0.1:9000',
        S3_BUCKET: 'cms-media',
    };
    const configMock = {
        get: (key: string) => configValues[key],
    } as unknown as ConfigService;

    const service = new StudioIngestionService(
        configMock,
        { getAdminClient: () => ({ from }) } as unknown as SupabaseService,
        ragService,
    );

    const getObject = vi.fn((bucket: string, key: string, cb: (err: Error | null, stream?: Readable) => void) => {
        if (options?.getObjectError) {
            const stream = new Readable({ read() {} });
            cb(null, stream);
            setImmediate(() => stream.emit('error', new Error('stream boom')));
            return;
        }
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

function errorPatchOf(sourceUpdate: ReturnType<typeof vi.fn>) {
    return sourceUpdate.mock.calls
        .map((call) => call[0] as { parse_status?: string; parse_error?: string })
        .find((patch) => patch?.parse_status === 'error');
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

    it('returns early (no patch) when the source row is missing', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            sourceResult: { data: null, error: { message: 'not found' } },
        });
        await service.ingestSource(SOURCE_ID);
        expect(sourceUpdate).not.toHaveBeenCalled();
    });

    it('uses media description text and skips document extraction', async () => {
        const { service, ragService } = buildIngestionService({
            describeMedia:
                'Deskripsi media panjang yang cukup untuk lolos ambang teks lemah pada ingestion service ini.',
        });
        await service.ingestSource(SOURCE_ID);
        expect(ragService.extractDocumentText).not.toHaveBeenCalled();
    });

    it('errors when extracted text is empty', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            extractText: '',
            getObjectImpl: () => streamFromText('bin'),
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_error).toContain('No extractable text');
    });

    it('errors when extracted text is too short (weak)', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            extractText: 'pendek',
            getObjectImpl: () => streamFromText('bin'),
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_error).toContain('Ekstraksi teks gagal');
    });

    it('errors when extracted text is only a placeholder', async () => {
        // Long filename so the placeholder string clears the 40-char "weak" length gate and
        // is caught specifically by the placeholder regex branch.
        const longName = 'laporan-penjualan-kuartal-tiga-2026-final-v3.docx';
        const { service, sourceUpdate } = buildIngestionService({
            source: {
                id: SOURCE_ID,
                notebook_id: NOTEBOOK_ID,
                media_id: null,
                filename: longName,
                file_type: 'application/pdf',
                s3_key: 'studio/nb-1/' + longName,
            },
            media: null,
            extractText: `Document: ${longName}`,
            getObjectImpl: () => streamFromText('bin'),
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_error).toContain('Ekstraksi teks gagal');
    });

    it('defaults file_type to octet-stream when missing', async () => {
        const { service, ragService } = buildIngestionService({
            source: {
                id: SOURCE_ID,
                notebook_id: NOTEBOOK_ID,
                media_id: null,
                filename: 'upload.bin',
                file_type: null,
                s3_key: 'studio/nb-1/upload.bin',
            },
            media: null,
            getObjectImpl: () => streamFromText('bin'),
        });
        await service.ingestSource(SOURCE_ID);
        expect(ragService.extractDocumentText).toHaveBeenCalledWith(
            expect.any(Buffer),
            'application/octet-stream',
            'upload.bin',
        );
    });

    it('errors when storage cannot be resolved', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            source: {
                id: SOURCE_ID,
                notebook_id: NOTEBOOK_ID,
                media_id: null,
                filename: '',
                file_type: 'application/pdf',
                s3_key: '',
            },
            media: null,
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_error).toContain('Could not resolve file storage');
    });

    it('errors when no chunk could be embedded', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            embedImpl: async () => null,
            getObjectImpl: () => streamFromText('bin'),
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_error).toContain('Vektorisasi gagal');
    });

    it('propagates a chunk insert error into parse_error', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            chunksInsertError: { message: 'insert failed' },
            getObjectImpl: () => streamFromText('bin'),
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_status).toBe('error');
    });

    it('handles a non-Error thrown during ingestion', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            describeMediaReject: 'string failure',
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_error).toContain('string failure');
    });

    it('handles a storage stream error', async () => {
        const { service, sourceUpdate } = buildIngestionService({
            getObjectError: true,
        });
        await service.ingestSource(SOURCE_ID);
        expect(errorPatchOf(sourceUpdate)?.parse_status).toBe('error');
    });
});

describe('StudioIngestionService constructor', () => {
    it('falls back to defaults for missing/invalid config', () => {
        const svc = buildIngestionService({ config: { S3_ENDPOINT: undefined, S3_BUCKET: undefined } }).service;
        expect((svc as unknown as { bucket: string }).bucket).toBe('cms-media');
    });

    it('handles an https endpoint without an explicit port', () => {
        const svc = buildIngestionService({
            config: { S3_ENDPOINT: 'https://minio.example.com', S3_BUCKET: 'b' },
        }).service;
        expect((svc as unknown as { bucket: string }).bucket).toBe('b');
    });

    it('handles an invalid endpoint URL', () => {
        const svc = buildIngestionService({
            config: { S3_ENDPOINT: 'not a valid url', S3_BUCKET: 'b' },
        }).service;
        expect((svc as unknown as { bucket: string }).bucket).toBe('b');
    });
});

describe('StudioIngestionService.reindexNotebook', () => {
    it('re-ingests every source in the notebook', async () => {
        const { service } = buildIngestionService({
            sourcesList: { data: [{ id: 'a' }, { id: 'b' }], error: null },
            getObjectImpl: () => streamFromText('bin'),
        });
        const spy = vi.spyOn(service, 'ingestSource').mockResolvedValue();
        await service.reindexNotebook(NOTEBOOK_ID);
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith('a');
        expect(spy).toHaveBeenCalledWith('b');
    });

    it('handles a null source list', async () => {
        const { service } = buildIngestionService({
            sourcesList: { data: null, error: null },
        });
        const spy = vi.spyOn(service, 'ingestSource').mockResolvedValue();
        await service.reindexNotebook(NOTEBOOK_ID);
        expect(spy).not.toHaveBeenCalled();
    });
});
