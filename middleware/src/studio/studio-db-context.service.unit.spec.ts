import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    StudioDbContextService,
    getUmkmCommandsFromConfig,
    DEFAULT_STUDIO_SALES_CONTEXT,
} from './studio-db-context.service';

function build(queue: any[] = [], dremio: { preview?: any; sql?: any } = {}) {
    const q = [...queue];
    const next = () => (q.length ? q.shift() : { data: [], error: null });
    const makeChain = () => {
        const c: any = {
            from: () => c,
            select: () => c,
            in: () => Promise.resolve(next()),
            or: () => c,
            limit: () => Promise.resolve(next()),
            then: (r: any, j: any) => Promise.resolve(next()).then(r, j),
        };
        return c;
    };
    const supabaseService = { getAdminClient: () => makeChain() };
    const dremioService = {
        getDatasetPreview: vi.fn(async () => dremio.preview),
        runSQL: vi.fn(async () => dremio.sql),
    };
    const svc = new StudioDbContextService(supabaseService as any, dremioService as any);
    vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
    const setQueue = (arr: any[]) => {
        q.length = 0;
        q.push(...arr);
    };
    return { svc, dremioService, setQueue };
}

const qu = (over: any = {}) => ({
    original_query: 'q',
    detected_language: 'id',
    normalized_text: 'q',
    main_intent: 'tanya',
    rewritten_query: 'q',
    needs_clarification: false,
    clarification_question: '',
    confidence: 0.7,
    ...over,
});

describe('StudioDbContextService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('parseConfig', () => {
        it('raw null/non-object → {}', () => {
            const { svc } = build();
            expect(svc.parseConfig(null)).toEqual({});
            expect(svc.parseConfig('str')).toEqual({});
        });
        it('objek kosong → default sales context', () => {
            const { svc } = build();
            expect(svc.parseConfig({})).toEqual(DEFAULT_STUDIO_SALES_CONTEXT);
        });
        it('config berisi → dikembalikan apa adanya', () => {
            const { svc } = build();
            expect(svc.parseConfig({ audience: 'admin' })).toEqual({ audience: 'admin' });
            expect(svc.parseConfig({ supabase_views: ['x'] })).toEqual({ supabase_views: ['x'] });
        });
    });

    describe('getUmkmCommandsFromConfig', () => {
        it('tanpa umkm_commands → default', () => {
            const c = getUmkmCommandsFromConfig({});
            expect(c).toBeTruthy();
            expect(c.menu).toBeTruthy();
        });
        it('dengan umkm_commands parsial', () => {
            const c = getUmkmCommandsFromConfig({ umkm_commands: { menu: [] } as any });
            expect(c).toBeTruthy();
        });
    });

    describe('isSafeIdentifier', () => {
        it('valid & invalid', () => {
            const { svc } = build();
            expect((svc as any).isSafeIdentifier('v_studio_sales_today')).toBe(true);
            expect((svc as any).isSafeIdentifier('1bad')).toBe(false);
            expect((svc as any).isSafeIdentifier('bad-view')).toBe(false);
        });
    });

    describe('isReadOnlySql', () => {
        it('menerima SELECT murni', () => {
            const { svc } = build();
            expect((svc as any).isReadOnlySql('SELECT * FROM t')).toBe(true);
        });
        it('menolak non-SELECT', () => {
            const { svc } = build();
            expect((svc as any).isReadOnlySql('UPDATE t SET a=1')).toBe(false);
        });
        it('menolak SELECT dengan kata terlarang', () => {
            const { svc } = build();
            expect((svc as any).isReadOnlySql('SELECT 1; DROP TABLE t')).toBe(false);
        });
    });

    describe('shouldFetchView', () => {
        const call = (svc: any, v: string, intent: string, query = '') =>
            svc.shouldFetchView(v, intent, query);

        it('sales_today', () => {
            const { svc } = build();
            expect(call(svc, 'v_studio_sales_today', 'penjualan', 'hari ini')).toBe(true);
            expect(call(svc, 'v_studio_sales_today', 'penjualan', '')).toBe(true);
            expect(call(svc, 'v_studio_sales_today', 'pelanggan', '')).toBe(false);
            // sales + top tanpa today → evaluasi operand ketiga (wantsSales && wantsToday)
            expect(call(svc, 'v_studio_sales_today', 'penjualan', 'produk terlaris')).toBe(false);
        });
        it('sales_summary', () => {
            const { svc } = build();
            expect(call(svc, 'v_studio_sales_summary', 'penjualan keseluruhan', '')).toBe(true);
            expect(call(svc, 'v_studio_sales_summary', 'penjualan', '')).toBe(true);
            expect(call(svc, 'v_studio_sales_summary', 'pelanggan', '')).toBe(false);
        });
        it('top_products', () => {
            const { svc } = build();
            expect(call(svc, 'v_studio_top_products', 'produk terlaris', '')).toBe(true);
            expect(call(svc, 'v_studio_top_products', 'penjualan produk', '')).toBe(true);
            expect(call(svc, 'v_studio_top_products', 'pelanggan', '')).toBe(false);
        });
        it('recent_orders / cs_orders', () => {
            const { svc } = build();
            expect(call(svc, 'v_studio_recent_orders', 'status pesanan', 'order 12')).toBe(true);
            expect(call(svc, 'v_studio_recent_orders', 'terbaru', '')).toBe(true);
            expect(call(svc, 'v_studio_recent_orders', 'cuaca', '')).toBe(false);
            expect(call(svc, 'v_studio_cs_orders', 'order', '')).toBe(true);
        });
        it('cs_customers', () => {
            const { svc } = build();
            expect(call(svc, 'v_studio_cs_customers', 'pelanggan', '')).toBe(true);
            expect(call(svc, 'v_studio_cs_customers', 'penjualan', '')).toBe(false);
        });
        it('view generik → fallback wantsSales/order/customer', () => {
            const { svc } = build();
            expect(call(svc, 'v_custom_generic', 'penjualan', '')).toBe(true);
            expect(call(svc, 'v_custom_generic', 'cuaca', '')).toBe(false);
        });
    });

    describe('queryAllowlistedView', () => {
        const run = (svc: any, view: string, intent: string, query: string) =>
            (svc as any).queryAllowlistedView(view, intent, query);

        it('orderMatch pada view order → or().limit(10)', async () => {
            const { svc } = build([{ data: [{ id: 1 }], error: null }]);
            const rows = await run(svc, 'v_studio_recent_orders', 'order', 'order ORD-123');
            expect(rows).toEqual([{ id: 1 }]);
        });
        it('compact analytics view → limit 25', async () => {
            const { svc } = build([{ data: [{ a: 1 }], error: null }]);
            const rows = await run(svc, 'v_studio_sales_today', 'penjualan', 'q');
            expect(rows).toHaveLength(1);
        });
        it('orderMatch tapi view bukan order → evaluasi operand === lalu compact', async () => {
            const { svc } = build([{ data: [{ a: 1 }], error: null }]);
            const rows = await run(svc, 'v_studio_sales_today', 'penjualan', 'order ORD-1');
            expect(rows).toHaveLength(1);
        });
        it('customer view → limit 15', async () => {
            const { svc } = build([{ data: [{ c: 1 }], error: null }]);
            const rows = await run(svc, 'v_studio_cs_customers', 'customer', 'pelanggan');
            expect(rows).toHaveLength(1);
        });
        it('top_product custom view → limit 15', async () => {
            const { svc } = build([{ data: [{ p: 1 }], error: null }]);
            const rows = await run(svc, 'x_top_product', 'q', 'q');
            expect(rows).toHaveLength(1);
        });
        it('default view → limit 25', async () => {
            const { svc } = build([{ data: [{ x: 1 }], error: null }]);
            const rows = await run(svc, 'v_other', 'q', 'q');
            expect(rows).toHaveLength(1);
        });
        it('error 42P01 → []', async () => {
            const { svc } = build([{ data: null, error: { code: '42P01' } }]);
            const rows = await run(svc, 'v_other', 'q', 'q');
            expect(rows).toEqual([]);
        });
        it('error lain → throw', async () => {
            const { svc } = build([{ data: null, error: { code: 'XX', message: 'e' } }]);
            await expect(run(svc, 'v_other', 'q', 'q')).rejects.toBeTruthy();
        });
        it('data null → []', async () => {
            const { svc } = build([{ data: null, error: null }]);
            const rows = await run(svc, 'v_other', 'q', 'q');
            expect(rows).toEqual([]);
        });
    });

    describe('fetchCatalogHint', () => {
        it('data ada → blok katalog (dengan & tanpa contoh)', async () => {
            const { svc } = build([
                {
                    data: [
                        { object_name: 'v1', description: 'd1', example_questions: ['a', 'b', 'c'] },
                        { object_name: 'v2', description: 'd2' },
                    ],
                    error: null,
                },
            ]);
            const out = await (svc as any).fetchCatalogHint(['v1', 'v2']);
            expect(out).toContain('Katalog data');
            expect(out).toContain('contoh: a; b');
        });
        it('error 42P01 → ""', async () => {
            const { svc } = build([{ data: null, error: { code: '42P01' } }]);
            expect(await (svc as any).fetchCatalogHint(['v1'])).toBe('');
        });
        it('error lain → ""', async () => {
            const { svc } = build([{ data: null, error: { code: 'XX' } }]);
            expect(await (svc as any).fetchCatalogHint(['v1'])).toBe('');
        });
        it('data kosong → ""', async () => {
            const { svc } = build([{ data: [], error: null }]);
            expect(await (svc as any).fetchCatalogHint(['v1'])).toBe('');
        });
        it('exception → ""', async () => {
            const svc = new StudioDbContextService(
                { getAdminClient: () => { throw new Error('down'); } } as any,
                {} as any,
            );
            expect(await (svc as any).fetchCatalogHint(['v1'])).toBe('');
        });
    });

    describe('fetchSupabaseContext', () => {
        it('default views, catalog + rows', async () => {
            // queue: catalog hint, then sales_today rows, sales_summary rows, etc.
            const { svc } = build([
                { data: [{ object_name: 'v_studio_sales_today', description: 'd' }], error: null },
                { data: [{ total: 5 }], error: null },
                { data: [{ total: 9 }], error: null },
            ]);
            const out = await svc.fetchSupabaseContext(
                {},
                qu({ main_intent: 'penjualan', rewritten_query: 'penjualan hari ini' }),
            );
            expect(out).toContain('Katalog data');
            expect(out).toContain('Supabase:');
        });
        it('skip unsafe identifier & view yang tidak relevan', async () => {
            const { svc } = build([{ data: [], error: null }]);
            const out = await svc.fetchSupabaseContext(
                { supabase_views: ['bad-view', 'v_studio_cs_customers'] },
                qu({ main_intent: 'cuaca', rewritten_query: 'cuaca' }),
            );
            expect(out).toBe('');
        });
        it('rewritten_query kosong → pakai normalized_text', async () => {
            const { svc } = build([
                { data: [], error: null },
                { data: [{ x: 1 }], error: null },
            ]);
            const out = await svc.fetchSupabaseContext(
                { supabase_views: ['v_studio_sales_summary'] },
                qu({ main_intent: 'penjualan', rewritten_query: '', normalized_text: 'penjualan' }),
            );
            expect(out).toContain('Supabase:');
        });

        it('main_intent & query kosong (fallback ke "")', async () => {
            const { svc } = build([{ data: [], error: null }]);
            const out = await svc.fetchSupabaseContext(
                { supabase_views: ['v_studio_sales_summary'] },
                qu({ main_intent: '', rewritten_query: '', normalized_text: '' }),
            );
            expect(out).toBe('');
        });

        it('rows kosong → tidak push blok', async () => {
            const { svc } = build([
                { data: [], error: null },
                { data: [], error: null },
            ]);
            const out = await svc.fetchSupabaseContext(
                { supabase_views: ['v_studio_sales_summary'] },
                qu({ main_intent: 'penjualan', rewritten_query: 'penjualan' }),
            );
            expect(out).toBe('');
        });

        it('query view melempar → warn, lanjut', async () => {
            const { svc } = build([
                { data: [], error: null },
                { data: null, error: { code: 'XX', message: 'boom' } },
            ]);
            const out = await svc.fetchSupabaseContext(
                { supabase_views: ['v_studio_sales_summary'] },
                qu({ main_intent: 'penjualan', rewritten_query: 'penjualan' }),
            );
            expect(out).toBe('');
            expect(svc['logger'].warn).toHaveBeenCalled();
        });
    });

    describe('fetchDremioContext', () => {
        it('tanpa paths → ""', async () => {
            const { svc } = build();
            expect(await svc.fetchDremioContext({}, qu())).toBe('');
        });
        it('preview rows + template SQL', async () => {
            const { svc } = build([], {
                preview: { rows: [{ a: 1 }], columns: [{ name: 'a' }] },
                sql: { rows: [{ b: 2 }] },
            });
            const out = await svc.fetchDremioContext(
                {
                    dremio_context_paths: [['space', 'ds'], [], 'x' as any],
                    dremio_sql_templates: [{ id: 't1', sql: 'SELECT 1' }],
                },
                qu({ main_intent: 'analitik', rewritten_query: 'laporan' }),
            );
            expect(out).toContain('Dremio dataset');
            expect(out).toContain('Dremio SQL (t1)');
        });
        it('paths ada tanpa templates (|| []) & main_intent kosong', async () => {
            const { svc } = build([], {
                preview: { rows: [{ a: 1 }], columns: [{ name: 'a' }] },
            });
            const out = await svc.fetchDremioContext(
                { dremio_context_paths: [['space', 'ds']] },
                qu({ main_intent: '', rewritten_query: '' }),
            );
            expect(out).toContain('Dremio dataset');
        });

        it('template read-only cocok tapi runSQL tanpa rows → tidak push', async () => {
            const { svc } = build([], {
                preview: { rows: [], columns: [] },
                sql: { rows: [] },
            });
            const out = await svc.fetchDremioContext(
                {
                    dremio_context_paths: [['space', 'ds']],
                    dremio_sql_templates: [{ id: 't1', sql: 'SELECT 1' }],
                },
                qu({ main_intent: 'analitik', rewritten_query: 'laporan' }),
            );
            expect(out).toBe('');
        });

        it('preview error → warn; template SQL tidak read-only → dilewati', async () => {
            const dremioService = {
                getDatasetPreview: vi.fn(async () => {
                    throw new Error('prev fail');
                }),
                runSQL: vi.fn(),
            };
            const svc = new StudioDbContextService(
                { getAdminClient: () => ({}) } as any,
                dremioService as any,
            );
            vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
            const out = await svc.fetchDremioContext(
                {
                    dremio_context_paths: [['space', 'ds']],
                    dremio_sql_templates: [{ id: 't1', sql: 'UPDATE t SET a=1' }],
                },
                qu({ main_intent: 'analitik', rewritten_query: 'laporan' }),
            );
            expect(out).toBe('');
            expect(svc['logger'].warn).toHaveBeenCalled();
            expect(dremioService.runSQL).not.toHaveBeenCalled();
        });
        it('template runSQL melempar → warn', async () => {
            const dremioService = {
                getDatasetPreview: vi.fn(async () => ({ rows: [], columns: [] })),
                runSQL: vi.fn(async () => {
                    throw new Error('sql fail');
                }),
            };
            const svc = new StudioDbContextService(
                { getAdminClient: () => ({}) } as any,
                dremioService as any,
            );
            vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
            const out = await svc.fetchDremioContext(
                {
                    dremio_context_paths: [['space', 'ds']],
                    dremio_sql_templates: [{ id: 't1', sql: 'SELECT 1' }],
                },
                qu({ main_intent: 'report', rewritten_query: 'trend' }),
            );
            expect(out).toBe('');
            expect(svc['logger'].warn).toHaveBeenCalledWith(
                expect.stringContaining('Dremio template t1'),
            );
        });
    });
});
