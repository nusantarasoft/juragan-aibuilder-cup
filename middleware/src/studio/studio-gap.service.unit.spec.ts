import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StudioService } from './studio.service';
import { DEFAULT_STUDIO_SALES_CONTEXT } from './studio-db-context.service';

/**
 * Unit tests for NotebookLM-parity gap surfaces on StudioService:
 * share links, paste-text source, updateNotebook(icon), and TTS MP3 synthesis.
 */

type TableHandlers = Record<string, any>;

function makeUpdateChain(result: { data?: any; error?: any } = { error: null }) {
    const chain: any = {
        eq: vi.fn(() => chain),
        select: vi.fn(() => chain),
        single: vi.fn(async () => result),
        then: (res: any, rej: any) => Promise.resolve(result).then(res, rej),
    };
    return chain;
}

function buildGapService(opts: {
    tables?: TableHandlers;
    getNotebook?: any;
    getOutput?: any;
    uploadSource?: any;
    parseConfig?: any;
    getRawSettings?: any;
} = {}) {
    const tables = opts.tables ?? {};
    const supabaseService = {
        getAdminClient: () => ({
            from: (table: string) => {
                if (tables[table]) return tables[table];
                throw new Error(`Unexpected table: ${table}`);
            },
        }),
    };

    const configService = {
        get: (key: string) => {
            if (key === 'S3_ENDPOINT') return 'http://127.0.0.1:9000';
            if (key === 'S3_ACCESS_KEY') return 'minioadmin';
            if (key === 'S3_SECRET_KEY') return 'minioadmin';
            if (key === 'S3_BUCKET') return 'cms-media';
            return undefined;
        },
    } as unknown as ConfigService;

    const outputService = {
        getOutput: vi.fn(async () => opts.getOutput ?? null),
    };
    const aiSettings = {
        getRawSettings: vi.fn(async () => opts.getRawSettings ?? { google_api_key: null }),
    };
    const dbContextService = {
        parseConfig: vi.fn(() => opts.parseConfig ?? { ...DEFAULT_STUDIO_SALES_CONTEXT }),
    };
    const ingestionService = { ingestSource: vi.fn() };
    const contextService = { languageRule: vi.fn((l?: string) => (l === 'en' ? 'Answer in English.' : '')) };

    const service = new StudioService(
        configService,
        supabaseService as any,
        {} as any,
        aiSettings as any,
        ingestionService as any,
        contextService as any,
        dbContextService as any,
        outputService as any,
    );

    // Replace MinIO client with a stub (constructor already built a real one).
    const minio = {
        putObject: vi.fn(async () => undefined),
        presignedGetObject: vi.fn(async () => 'https://minio/presigned.mp3'),
    };
    (service as any).minioClient = minio;

    if (opts.getNotebook !== undefined) {
        vi.spyOn(service, 'getNotebook').mockResolvedValue(opts.getNotebook);
    }
    if (opts.uploadSource) {
        vi.spyOn(service, 'uploadSource').mockImplementation(opts.uploadSource);
    }

    vi.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    vi.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

    return { service, minio, outputService, aiSettings, dbContextService, tables };
}

describe('StudioService gap features', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('createShareLink / revokeShareLink / getSharedNotebook', () => {
        it('createShareLink membuat token baru jika belum ada', async () => {
            const update = makeUpdateChain({ error: null });
            const { service } = buildGapService({
                getNotebook: { id: 'nb-1', share_token: null },
                tables: {
                    studio_notebooks: {
                        update: vi.fn(() => update),
                    },
                },
            });
            const res = await service.createShareLink('nb-1');
            expect(res.isShared).toBe(true);
            expect(res.token).toBeTruthy();
            expect(res.token.length).toBeGreaterThan(10);
        });

        it('createShareLink memakai ulang share_token yang sudah ada', async () => {
            const update = makeUpdateChain({ error: null });
            const { service } = buildGapService({
                getNotebook: { id: 'nb-1', share_token: 'existing-tok' },
                tables: {
                    studio_notebooks: { update: vi.fn(() => update) },
                },
            });
            const res = await service.createShareLink('nb-1');
            expect(res.token).toBe('existing-tok');
        });

        it('revokeShareLink membersihkan token', async () => {
            const update = makeUpdateChain({ error: null });
            const updateFn = vi.fn(() => update);
            const { service } = buildGapService({
                tables: { studio_notebooks: { update: updateFn } },
            });
            await expect(service.revokeShareLink('nb-1')).resolves.toBe(true);
            expect(updateFn).toHaveBeenCalledWith({
                share_token: null,
                is_shared: false,
                shared_at: null,
            });
        });

        it('getSharedNotebook menolak token kosong', async () => {
            const { service } = buildGapService({ tables: {} });
            await expect(service.getSharedNotebook('')).rejects.toBeInstanceOf(NotFoundException);
            await expect(service.getSharedNotebook('   ')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('getSharedNotebook mengembalikan proyeksi read-only', async () => {
            const notebookChain: any = {
                select: () => notebookChain,
                eq: () => notebookChain,
                single: vi.fn(async () => ({
                    data: {
                        id: 'nb-1',
                        name: 'Shared NB',
                        description: 'd',
                        icon: '📓',
                        is_shared: true,
                        share_token: 'tok',
                        created_at: '2026-01-01',
                        updated_at: '2026-01-02',
                    },
                    error: null,
                })),
            };
            const sourcesOrder = vi.fn(async () => ({
                data: [{ id: 's1', filename: 'a.pdf', parse_status: 'done' }],
                error: null,
            }));
            const sourcesChain: any = {
                select: () => sourcesChain,
                eq: () => sourcesChain,
                order: sourcesOrder,
            };
            const outputsOrder = vi.fn(async () => ({
                data: [{ id: 'o1', title: 'Brief', output_type: 'brief', content: 'x' }],
                error: null,
            }));
            const outputsChain: any = {
                select: () => outputsChain,
                eq: () => outputsChain,
                order: outputsOrder,
            };

            const { service } = buildGapService({
                tables: {
                    studio_notebooks: notebookChain,
                    studio_notebook_sources: sourcesChain,
                    studio_outputs: outputsChain,
                },
            });

            const res = await service.getSharedNotebook('tok');
            expect(res.notebook).toMatchObject({ id: 'nb-1', name: 'Shared NB', icon: '📓' });
            expect(res.sources).toHaveLength(1);
            expect(res.outputs).toHaveLength(1);
        });

        it('getSharedNotebook 404 jika token tidak valid', async () => {
            const notebookChain: any = {
                select: () => notebookChain,
                eq: () => notebookChain,
                single: vi.fn(async () => ({ data: null, error: { message: 'not found' } })),
            };
            const { service } = buildGapService({
                tables: { studio_notebooks: notebookChain },
            });
            await expect(service.getSharedNotebook('missing')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('updateNotebook', () => {
        it('memperbarui name, description, dan icon', async () => {
            const updated = { id: 'nb-1', name: 'Baru', description: 'd', icon: '🚀' };
            const updateChain = makeUpdateChain({ data: updated, error: null });
            const { service, dbContextService } = buildGapService({
                getNotebook: {
                    id: 'nb-1',
                    name: 'Lama',
                    context_config: DEFAULT_STUDIO_SALES_CONTEXT,
                },
                tables: {
                    studio_notebooks: { update: vi.fn(() => updateChain) },
                },
            });
            const res = await service.updateNotebook('nb-1', {
                name: '  Baru  ',
                description: 'd',
                icon: ' 🚀 ',
            });
            expect(res).toEqual(updated);
            expect(dbContextService.parseConfig).toHaveBeenCalled();
        });
    });

    describe('addTextSource', () => {
        it('menolak teks terlalu pendek', async () => {
            const { service } = buildGapService({});
            await expect(service.addTextSource('nb-1', 'Judul', 'pendek')).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('menyimpan teks sebagai sumber .txt', async () => {
            const upload = vi.fn(async () => ({ id: 'src-text' }));
            const { service } = buildGapService({ uploadSource: upload });
            const res = await service.addTextSource('nb-1', 'Catatan', 'Ini teks yang cukup panjang untuk diimpor sebagai sumber.');
            expect(res).toEqual({ id: 'src-text' });
            expect(upload).toHaveBeenCalledWith(
                'nb-1',
                expect.objectContaining({
                    mimetype: 'text/plain',
                    originalname: 'Catatan.txt',
                }),
            );
        });
    });

    describe('synthesizeAudioForOutput', () => {
        it('404 jika output milik notebook lain', async () => {
            const { service } = buildGapService({
                getOutput: { id: 'o1', notebook_id: 'other', content: 'halo', metadata: {} },
            });
            await expect(service.synthesizeAudioForOutput('nb-1', 'o1')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('memakai URL cached jika audio_s3_key ada', async () => {
            const { service, minio } = buildGapService({
                getOutput: {
                    id: 'o1',
                    notebook_id: 'nb-1',
                    content: 'halo',
                    metadata: { audio_s3_key: 'studio/nb-1/audio/o1.mp3' },
                },
            });
            const res = await service.synthesizeAudioForOutput('nb-1', 'o1');
            expect(res).toEqual({ url: 'https://minio/presigned.mp3', cached: true });
            expect(minio.presignedGetObject).toHaveBeenCalled();
        });

        it('menolak jika google_api_key belum dikonfigurasi', async () => {
            const { service } = buildGapService({
                getOutput: { id: 'o1', notebook_id: 'nb-1', content: 'Naskah audio cukup panjang.', metadata: {} },
                getRawSettings: { google_api_key: null },
            });
            await expect(service.synthesizeAudioForOutput('nb-1', 'o1')).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('mensintesis MP3, upload MinIO, dan simpan metadata', async () => {
            const updateChain = makeUpdateChain({ error: null });
            const updateFn = vi.fn(() => updateChain);
            const { service, minio, aiSettings } = buildGapService({
                getOutput: {
                    id: 'o1',
                    notebook_id: 'nb-1',
                    content: 'Host A: Halo semuanya. Host B: Selamat datang di overview.',
                    metadata: {},
                },
                getRawSettings: { google_api_key: 'gk-test' },
                tables: {
                    studio_outputs: { update: updateFn },
                },
            });

            const audioB64 = Buffer.from('ID3fake').toString('base64');
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => ({
                    ok: true,
                    json: async () => ({ audioContent: audioB64 }),
                    text: async () => '',
                })),
            );

            const res = await service.synthesizeAudioForOutput('nb-1', 'o1', 'en');
            expect(res.cached).toBe(false);
            expect(res.url).toBe('https://minio/presigned.mp3');
            expect(aiSettings.getRawSettings).toHaveBeenCalled();
            expect(minio.putObject).toHaveBeenCalledWith(
                'cms-media',
                'studio/nb-1/audio/o1.mp3',
                expect.any(Buffer),
                expect.any(Number),
                { 'Content-Type': 'audio/mpeg' },
            );
            expect(updateFn).toHaveBeenCalled();
        });

        it('menolak naskah kosong', async () => {
            const { service } = buildGapService({
                getOutput: { id: 'o1', notebook_id: 'nb-1', content: '   ', metadata: {} },
                getRawSettings: { google_api_key: 'gk' },
            });
            await expect(service.synthesizeAudioForOutput('nb-1', 'o1')).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });
    });
});
