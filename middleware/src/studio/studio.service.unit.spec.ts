import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StudioService } from './studio.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DEFAULT_STUDIO_SALES_CONTEXT } from './studio-db-context.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function buildStudioService(options: {
    insertResult?: { data: unknown; error: unknown };
    listResult?: { data: unknown; error: unknown };
    deleteResult?: { error: unknown };
}) {
    const insertSingle = vi.fn().mockResolvedValue(
        options.insertResult ?? {
            data: {
                id: 'nb-1',
                name: 'Sales KB',
                description: 'desc',
                user_id: USER_ID,
                audience: 'admin',
                context_config: DEFAULT_STUDIO_SALES_CONTEXT,
            },
            error: null,
        },
    );

    const listOrder = vi.fn().mockResolvedValue(
        options.listResult ?? {
            data: [{ id: 'nb-1', name: 'Sales KB' }],
            error: null,
        },
    );

    const deleteEq = vi.fn().mockResolvedValue(options.deleteResult ?? { error: null });

    const notebooksTable = {
        insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: insertSingle }),
        }),
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: listOrder }),
        }),
        delete: vi.fn().mockReturnValue({ eq: deleteEq }),
    };

    const supabaseMock = {
        getAdminClient: () => ({
            from: (table: string) => {
                if (table === 'studio_notebooks') return notebooksTable;
                throw new Error(`Unexpected table: ${table}`);
            },
        }),
    } as unknown as SupabaseService;

    const configMock = {
        get: (key: string) => {
            if (key === 'S3_ENDPOINT') return 'http://127.0.0.1:9000';
            if (key === 'S3_ACCESS_KEY') return 'minioadmin';
            if (key === 'S3_SECRET_KEY') return 'minioadmin';
            if (key === 'S3_BUCKET') return 'cms-media';
            return undefined;
        },
    } as unknown as ConfigService;

    const service = new StudioService(
        configMock,
        supabaseMock,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    );

    return { service, notebooksTable, insertSingle, listOrder, deleteEq };
}

describe('StudioService notebooks', () => {
    it('createNotebook inserts row with default sales context', async () => {
        const { service, notebooksTable } = buildStudioService({});

        const notebook = await service.createNotebook('Sales KB', 'desc', USER_ID);

        expect(notebooksTable.insert).toHaveBeenCalledWith({
            name: 'Sales KB',
            description: 'desc',
            user_id: USER_ID,
            audience: 'admin',
            context_config: DEFAULT_STUDIO_SALES_CONTEXT,
        });
        expect(notebook.id).toBe('nb-1');
        expect(notebook.name).toBe('Sales KB');
    });

    it('createNotebook throws Error (not Postgrest object) on Supabase failure', async () => {
        const { service } = buildStudioService({
            insertResult: {
                data: null,
                error: {
                    message: 'Could not query the database for the schema cache. Retrying.',
                    code: 'PGRST002',
                },
            },
        });

        await expect(service.createNotebook('X', '', USER_ID)).rejects.toThrowError(
            /Failed to create notebook.*PGRST002/,
        );

        try {
            await service.createNotebook('X', '', USER_ID);
        } catch (e) {
            expect(e).toBeInstanceOf(Error);
        }
    });

    it('getNotebooks returns rows for user', async () => {
        const { service } = buildStudioService({});

        const rows = await service.getNotebooks(USER_ID);

        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe('Sales KB');
    });

    it('getNotebooks throws readable error when query fails', async () => {
        const { service } = buildStudioService({
            listResult: { data: null, error: { message: 'permission denied', code: '42501' } },
        });

        await expect(service.getNotebooks(USER_ID)).rejects.toThrowError(
            'Failed to list notebooks: permission denied [42501]',
        );
    });

    it('deleteNotebook returns true on success', async () => {
        const { service, deleteEq } = buildStudioService({});

        await expect(service.deleteNotebook('nb-1')).resolves.toBe(true);
        expect(deleteEq).toHaveBeenCalledWith('id', 'nb-1');
    });

    it('deleteNotebook throws readable error on failure', async () => {
        const { service } = buildStudioService({
            deleteResult: { error: { message: 'row not found', code: 'PGRST116' } },
        });

        await expect(service.deleteNotebook('missing')).rejects.toThrowError(
            'Failed to delete notebook: row not found [PGRST116]',
        );
    });
});

function buildAddMediaService(options: {
    mediaResult?: { data: unknown; error: unknown };
    sourceInsert?: { data: unknown; error: unknown };
}) {
    const mediaId = '233c0096-0c2c-4738-8860-94559b87e954';
    const notebookId = 'nb-1';
    const sourceInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
                options.sourceInsert ?? {
                    data: { id: 'src-1', media_id: mediaId, s3_key: 'report.docx', file_size: 1234 },
                    error: null,
                },
            ),
        }),
    });
    const mediaSingle = vi.fn().mockResolvedValue(
        options.mediaResult ?? {
            data: {
                id: mediaId,
                filename: 'report.docx',
                s3_key: 'report.docx',
                bucket_name: 'percontohan',
                mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size_bytes: 1234,
            },
            error: null,
        },
    );
    const notebookSingle = vi.fn().mockResolvedValue({
        data: { id: notebookId, source_count: 0, studio_notebook_sources: [] },
        error: null,
    });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const ingestSource = vi.fn();

    const from = vi.fn((table: string) => {
        if (table === 'studio_notebooks') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({ single: notebookSingle }),
                }),
                update: vi.fn().mockReturnValue({ eq: updateEq }),
            };
        }
        if (table === 'media') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({ single: mediaSingle }),
                }),
            };
        }
        if (table === 'studio_notebook_sources') {
            return { insert: sourceInsert };
        }
        throw new Error(`Unexpected table: ${table}`);
    });

    const configMock = {
        get: (key: string) => {
            if (key === 'S3_ENDPOINT') return 'http://127.0.0.1:9000';
            if (key === 'S3_BUCKET') return 'cms-media';
            return undefined;
        },
    } as unknown as ConfigService;

    const service = new StudioService(
        configMock,
        { getAdminClient: () => ({ from }) } as unknown as SupabaseService,
        {} as any,
        {} as any,
        { ingestSource } as any,
        {} as any,
        {} as any,
        {} as any,
    );

    return { service, mediaId, notebookId, sourceInsert, ingestSource };
}

describe('StudioService.addMediaAsSource', () => {
    it('links media using size_bytes and media bucket s3 key', async () => {
        const { service, mediaId, notebookId, sourceInsert, ingestSource } = buildAddMediaService({});

        const source = await service.addMediaAsSource(notebookId, mediaId);

        expect(source.id).toBe('src-1');
        expect(sourceInsert).toHaveBeenCalledWith({
            notebook_id: notebookId,
            media_id: mediaId,
            filename: 'report.docx',
            file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            file_size: 1234,
            s3_key: 'report.docx',
            bucket_name: 'percontohan',
            parse_status: 'pending',
            parse_stage: 'queued',
            parse_progress: 0,
            parse_error: null,
            embed_total: 0,
            embed_done: 0,
            chunk_count: 0,
        });
        expect(ingestSource).toHaveBeenCalledWith('src-1');
    });

    it('throws NotFoundException when media row is missing', async () => {
        const { service, mediaId, notebookId } = buildAddMediaService({
            mediaResult: { data: null, error: { message: 'not found' } },
        });

        await expect(service.addMediaAsSource(notebookId, mediaId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when media has no storage key', async () => {
        const { service, notebookId } = buildAddMediaService({
            mediaResult: {
                data: {
                    id: '233c0096-0c2c-4738-8860-94559b87e954',
                    filename: '   ',
                    s3_key: null,
                    bucket_name: 'percontohan',
                    mime_type: 'application/pdf',
                    size_bytes: 10,
                },
                error: null,
            },
        });

        await expect(
            service.addMediaAsSource(notebookId, '233c0096-0c2c-4738-8860-94559b87e954'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws readable Error when source insert fails', async () => {
        const { service, mediaId, notebookId } = buildAddMediaService({
            sourceInsert: {
                data: null,
                error: { message: 'duplicate key', code: '23505' },
            },
        });

        await expect(service.addMediaAsSource(notebookId, mediaId)).rejects.toThrowError(
            'Failed to add media source: duplicate key [23505]',
        );
    });
});
