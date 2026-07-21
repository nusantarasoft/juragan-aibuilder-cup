import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioContextService } from './studio-context.service';

// Admin stub with call-ordered queues: `rpc` shifts from rpcQueue; a `from()`
// chain is awaitable (shifts countQueue) and exposes `.single()` (shifts
// singleQueue).
function makeAdmin(opts: {
    rpc?: any[];
    count?: any[];
    single?: any[];
} = {}) {
    const rpcQueue = [...(opts.rpc ?? [])];
    const countQueue = [...(opts.count ?? [])];
    const singleQueue = [...(opts.single ?? [])];
    return {
        rpc: vi.fn(async () =>
            rpcQueue.length ? rpcQueue.shift() : { data: [], error: null },
        ),
        from: () => {
            const chain: any = {
                select: () => chain,
                eq: () => chain,
                single: () =>
                    Promise.resolve(
                        singleQueue.length ? singleQueue.shift() : { data: null, error: null },
                    ),
                then: (res: any, rej: any) =>
                    Promise.resolve(
                        countQueue.length ? countQueue.shift() : { count: 0, error: null },
                    ).then(res, rej),
            };
            return chain;
        },
    };
}

function build(opts: {
    admin?: any;
    embedding?: any;
    answer?: string;
    supa?: string;
    drem?: string;
} = {}) {
    const admin = makeAdmin(opts.admin ?? {});
    const supabaseService = { getAdminClient: () => admin };
    const ragService = {
        embedText: vi.fn(async () =>
            opts.embedding === undefined ? [0.1, 0.2] : opts.embedding,
        ),
    };
    const aiRouter = {
        generateText: vi.fn((_prompt: string) =>
            Promise.resolve(opts.answer === undefined ? 'ANSWER' : opts.answer),
        ),
    };
    const dbContextService = {
        fetchSupabaseContext: vi.fn(async () => opts.supa ?? ''),
        fetchDremioContext: vi.fn(async () => opts.drem ?? ''),
    };
    const svc = new StudioContextService(
        supabaseService as any,
        ragService as any,
        aiRouter as any,
        dbContextService as any,
    );
    vi.spyOn(svc['logger'], 'log').mockImplementation(() => undefined);
    vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
    vi.spyOn(svc['logger'], 'debug').mockImplementation(() => undefined);
    vi.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);
    return { svc, ragService, aiRouter, dbContextService, admin };
}

const row = (i: number) => ({
    chunk_id: `c${i}`,
    source_id: `s${i}`,
    filename: `f${i}.pdf`,
    content: `content ${i}`,
    similarity: 0.9,
});

describe('StudioContextService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('semanticSearchNotebook', () => {
        it('embedding null → []', async () => {
            const { svc } = build({ embedding: null });
            expect(await svc.semanticSearchNotebook('nb1', 'q')).toEqual([]);
        });

        it('rpc sukses → memetakan baris (tanpa sourceIds)', async () => {
            const { svc } = build({
                admin: { rpc: [{ data: [row(1), row(2)], error: null }] },
            });
            const hits = await svc.semanticSearchNotebook('nb1', 'q');
            expect(hits).toHaveLength(2);
            expect(hits[0]).toMatchObject({ chunkId: 'c1', sourceId: 's1', score: 0.9 });
        });

        it('rpc sukses tapi data null → []', async () => {
            const { svc } = build({
                admin: {
                    rpc: [{ data: null, error: null }],
                    count: [{ count: 0, error: null }],
                },
            });
            expect(await svc.semanticSearchNotebook('nb1', 'q')).toEqual([]);
        });

        it('rpc sukses dengan sourceIds → tidak ada fallback', async () => {
            const { svc } = build({
                admin: { rpc: [{ data: [row(1)], error: null }] },
            });
            const hits = await svc.semanticSearchNotebook('nb1', 'q', 8, ['s1']);
            expect(hits).toHaveLength(1);
        });

        it('rpc missing (42883) → warn & [], lalu fallback threshold 0 berhasil', async () => {
            const { svc } = build({
                admin: {
                    rpc: [
                        { data: null, error: { code: '42883' } },
                        { data: [row(3)], error: null },
                    ],
                    count: [{ count: 5, error: null }],
                },
            });
            const hits = await svc.semanticSearchNotebook('nb1', 'q');
            expect(hits).toHaveLength(1);
            expect(svc['logger'].warn).toHaveBeenCalled();
            expect(svc['logger'].debug).toHaveBeenCalled();
        });

        it('rpc error lain → logger.error & []', async () => {
            const { svc } = build({
                admin: {
                    rpc: [{ data: null, error: { code: 'X', message: 'oops' } }],
                    count: [{ count: 0, error: null }],
                },
            });
            const hits = await svc.semanticSearchNotebook('nb1', 'q');
            expect(hits).toEqual([]);
            expect(svc['logger'].error).toHaveBeenCalled();
        });

        it('fallback: count null (?? 0) → tidak search ulang', async () => {
            const { svc } = build({
                admin: {
                    rpc: [{ data: [], error: null }],
                    count: [{ count: null, error: null }],
                },
            });
            expect(await svc.semanticSearchNotebook('nb1', 'q')).toEqual([]);
        });

        it('fallback: total terlalu besar → tidak search ulang', async () => {
            const { svc } = build({
                admin: {
                    rpc: [{ data: [], error: null }],
                    count: [{ count: 100, error: null }],
                },
            });
            expect(await svc.semanticSearchNotebook('nb1', 'q')).toEqual([]);
        });

        it('fallback: search(0) tetap kosong → tanpa debug', async () => {
            const { svc } = build({
                admin: {
                    rpc: [
                        { data: [], error: null },
                        { data: [], error: null },
                    ],
                    count: [{ count: 5, error: null }],
                },
            });
            expect(await svc.semanticSearchNotebook('nb1', 'q')).toEqual([]);
            expect(svc['logger'].debug).not.toHaveBeenCalled();
        });

        it('fallback dilewati saat sourceIds ada', async () => {
            const { svc } = build({
                admin: { rpc: [{ data: [], error: null }] },
            });
            expect(await svc.semanticSearchNotebook('nb1', 'q', 8, ['s1'])).toEqual([]);
        });
    });

    describe('retrieveContext', () => {
        it('ada chunks → status matched + dbContext saat qu&config ada', async () => {
            const { svc, dbContextService } = build({ supa: 'SUPA', drem: 'DREM' });
            vi.spyOn(svc, 'semanticSearchNotebook').mockResolvedValue([
                { chunkId: 'c1', sourceId: 's1', filename: 'f.pdf', content: 'x', score: 0.8 },
            ] as any);
            const r = await svc.retrieveContext(
                'nb1',
                'q',
                { rewritten_query: 'q' } as any,
                { umkm_mode: true } as any,
            );
            expect(r.documentRetrievalStatus).toBe('matched');
            expect(r.fileContext).toContain('Sumber 1');
            expect(r.dbContext).toBe('SUPA\n\nDREM');
            expect(r.references[0].docName).toBe('f.pdf');
            expect(dbContextService.fetchSupabaseContext).toHaveBeenCalled();
        });

        it('tanpa chunks, count error → not_indexed + warn', async () => {
            const { svc } = build({ admin: { count: [{ count: null, error: { message: 'e' } }] } });
            vi.spyOn(svc, 'semanticSearchNotebook').mockResolvedValue([]);
            const r = await svc.retrieveContext('nb1', 'q');
            expect(r.documentRetrievalStatus).toBe('not_indexed');
            expect(svc['logger'].warn).toHaveBeenCalled();
            expect(r.dbContext).toBe('');
        });

        it('tanpa chunks, count>0 → no_relevant_chunks + debug', async () => {
            const { svc } = build({ admin: { count: [{ count: 3, error: null }] } });
            vi.spyOn(svc, 'semanticSearchNotebook').mockResolvedValue([]);
            const r = await svc.retrieveContext('nb1', 'q');
            expect(r.documentRetrievalStatus).toBe('no_relevant_chunks');
            expect(svc['logger'].debug).toHaveBeenCalled();
        });

        it('tanpa chunks, count null (?? 0) → not_indexed', async () => {
            const { svc } = build({ admin: { count: [{ count: null, error: null }] } });
            vi.spyOn(svc, 'semanticSearchNotebook').mockResolvedValue([]);
            const r = await svc.retrieveContext('nb1', 'q');
            expect(r.documentRetrievalStatus).toBe('not_indexed');
        });
    });

    describe('generateGroundedAnswer', () => {
        const baseRetrieval = {
            chunks: [],
            fileContext: 'DOC',
            dbContext: 'DB',
            references: [],
            rawChunks: [],
            documentRetrievalStatus: 'matched' as const,
        };

        it('audience customer, matched, hasDb, dengan instruksi & percakapan', async () => {
            const { svc, aiRouter } = build();
            const out = await svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'customer',
                question: 'apa?',
                instruction: 'ekstra',
                chatInstruction: 'ramah',
                conversationLines: ['U: hi'],
                retrieval: baseRetrieval,
            });
            expect(out).toBe('ANSWER');
            const prompt = aiRouter.generateText.mock.calls[0][0] as string;
            expect(prompt).toContain('layanan pelanggan');
            expect(prompt).toContain('Instruksi notebook: ramah');
            expect(prompt).toContain('Instruksi tambahan');
            expect(prompt).toContain('U: hi');
        });

        it('audience admin, no_relevant_chunks tanpa db, tanpa file, tanpa percakapan → fallback answer', async () => {
            const { svc } = build({ answer: '' });
            const out = await svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'admin',
                question: 'apa?',
                conversationLines: [],
                retrieval: {
                    ...baseRetrieval,
                    fileContext: '',
                    dbContext: '',
                    documentRetrievalStatus: 'no_relevant_chunks',
                },
            });
            expect(out).toBe('Maaf, saya tidak dapat menghasilkan jawaban saat ini.');
        });

        it('no_relevant_chunks dengan db', async () => {
            const { svc, aiRouter } = build();
            await svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'admin',
                question: 'q',
                conversationLines: [],
                retrieval: { ...baseRetrieval, fileContext: '', documentRetrievalStatus: 'no_relevant_chunks' },
            });
            const prompt = aiRouter.generateText.mock.calls[0][0] as string;
            expect(prompt).toContain('data database operasional');
        });

        it('not_indexed dengan db dan tanpa db', async () => {
            const withDb = build();
            await withDb.svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'admin',
                question: 'q',
                conversationLines: [],
                retrieval: { ...baseRetrieval, fileContext: '', documentRetrievalStatus: 'not_indexed' },
            });
            expect(withDb.aiRouter.generateText.mock.calls[0][0]).toContain('Belum ada dokumen terindeks');

            const noDb = build();
            await noDb.svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'admin',
                question: 'q',
                conversationLines: [],
                retrieval: {
                    ...baseRetrieval,
                    fileContext: '',
                    dbContext: '',
                    documentRetrievalStatus: 'not_indexed',
                },
            });
            expect(noDb.aiRouter.generateText.mock.calls[0][0]).toContain('menunggu indexing');
        });

        it('status undefined → derive dari hasFile (matched)', async () => {
            const { svc, aiRouter } = build();
            await svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'admin',
                question: 'q',
                conversationLines: [],
                retrieval: { ...baseRetrieval, documentRetrievalStatus: undefined as any },
            });
            expect(aiRouter.generateText.mock.calls[0][0]).toContain('HANYA berdasarkan cuplikan');
        });

        it('status undefined + tanpa file → derive not_indexed', async () => {
            const { svc, aiRouter } = build();
            await svc.generateGroundedAnswer({
                notebookName: 'NB',
                audience: 'admin',
                question: 'q',
                conversationLines: [],
                retrieval: {
                    ...baseRetrieval,
                    fileContext: '',
                    dbContext: '',
                    documentRetrievalStatus: undefined as any,
                },
            });
            expect(aiRouter.generateText.mock.calls[0][0]).toContain('Belum ada dokumen terindeks');
        });
    });

    describe('getChunkById', () => {
        it('chunk & source ditemukan', async () => {
            const { svc } = build({
                admin: {
                    single: [
                        {
                            data: {
                                id: 'c1',
                                content: 'isi',
                                chunk_index: 2,
                                source_id: 's1',
                                notebook_id: 'nb1',
                            },
                            error: null,
                        },
                        { data: { filename: 'doc.pdf' }, error: null },
                    ],
                },
            });
            const r = await svc.getChunkById('c1');
            expect(r).toMatchObject({ id: 'c1', filename: 'doc.pdf', notebook_id: 'nb1' });
        });

        it('chunk tidak ada → null', async () => {
            const { svc } = build({
                admin: { single: [{ data: null, error: { message: 'x' } }] },
            });
            expect(await svc.getChunkById('c1')).toBeNull();
        });

        it('source null → filename fallback "Dokumen"', async () => {
            const { svc } = build({
                admin: {
                    single: [
                        {
                            data: {
                                id: 'c1',
                                content: 'isi',
                                chunk_index: 0,
                                source_id: 's1',
                                notebook_id: 'nb1',
                            },
                            error: null,
                        },
                        { data: null, error: null },
                    ],
                },
            });
            const r = await svc.getChunkById('c1');
            expect(r?.filename).toBe('Dokumen');
        });
    });
});
