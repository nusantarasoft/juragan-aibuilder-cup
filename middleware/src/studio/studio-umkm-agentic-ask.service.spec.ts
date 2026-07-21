import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioUmkmAgenticAskService } from './studio-umkm-agentic-ask.service';

describe('StudioUmkmAgenticAskService', () => {
    const umkm = {
        buildStockCheckMessage: vi.fn(async () => 'Stok Mie Ayam: 10'),
        buildSalesListMessage: vi.fn(async () => 'Penjualan hari ini: Rp 0'),
        buildPurchaseListMessage: vi.fn(async () => 'Belum ada belanja'),
        buildCombinedReportMessage: vi.fn(async () => '📊 Laporan\nPenjualan: *0*'),
        buildProductListMessage: vi.fn(async () => '📦 Daftar\n• Mie Ayam'),
    };
    const studio = {
        getNotebook: vi.fn(async () => ({ name: 'Toko Test', context_config: {} })),
    };
    const context = {
        retrieveContext: vi.fn(async () => ({
            fileContext: '',
            dbContext: '',
            references: [],
            rawChunks: [],
            documentRetrievalStatus: 'not_indexed',
            chunks: [],
        })),
    };
    const dbContext = {
        parseConfig: vi.fn(() => ({ umkm_mode: true, tenant_id: 't1' })),
    };
    const aiRouter = {
        generateText: vi.fn(async () => 'Jawaban agentic: stok mie ada 10.'),
    };

    let svc: StudioUmkmAgenticAskService;

    beforeEach(() => {
        vi.clearAllMocks();
        svc = new StudioUmkmAgenticAskService(
            umkm as any,
            studio as any,
            context as any,
            dbContext as any,
            aiRouter as any,
        );
    });

    it('POSITIF stok: memanggil get_stock tool + synthesize', async () => {
        const out = await svc.answer({
            question: 'cek stok mie ayam',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
            notebookName: 'Toko',
        });
        expect(umkm.buildStockCheckMessage).toHaveBeenCalled();
        expect(out.plan.tools.some((t) => t.name === 'get_stock')).toBe(true);
        expect(out.answer).toMatch(/stok|10/i);
        expect(aiRouter.generateText).toHaveBeenCalled();
    });

    it('POSITIF multi-hop tips: report + docs', async () => {
        const out = await svc.answer({
            question: 'tips tingkatkan omzet',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        });
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalled();
        expect(context.retrieveContext).toHaveBeenCalled();
        expect(out.toolResults.length).toBeGreaterThan(1);
    });

    it('NEGATIF jual… tidak memanggil write — hanya suggest', async () => {
        const out = await svc.answer({
            question: 'jual 2 bakso 30000',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        });
        expect(umkm.buildStockCheckMessage).not.toHaveBeenCalled();
        expect(umkm.buildCombinedReportMessage).not.toHaveBeenCalled();
        expect(out.plan.reason).toBe('write_action_redirect');
        expect(out.toolResults[0].name).toBe('suggest_menu_action');
    });

    it('NEGATIF LLM down → fallback dari tool content', async () => {
        aiRouter.generateText.mockResolvedValueOnce('LLM provider not configured');
        const out = await svc.answer({
            question: 'cek stok bakso',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        });
        expect(out.answer).toMatch(/Stok|data yang berhasil/i);
    });

    it('NEGATIF LLM down pada tips omzet → saran, bukan template laporan utuh', async () => {
        aiRouter.generateText.mockResolvedValueOnce('LLM provider not configured');
        umkm.buildCombinedReportMessage.mockResolvedValueOnce(
            [
                '📊 *Laporan hari ini*',
                '',
                'Penjualan: *0* order',
                'Total penjualan: *Rp 0*',
                'Total belanja: *Rp 0*',
                'Selisih: *Rp 0*',
                '',
                'Ketik *6* untuk laporan periode lain, atau *0* untuk menu utama.',
            ].join('\n'),
        );
        const out = await svc.answer({
            question: 'Bagaimana cara menaikkan omzet usaha saya hingga 20%',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        });
        expect(out.plan.reason).toMatch(/advice/);
        expect(out.answer).toMatch(/saran|Dorong|Catat/i);
        expect(out.answer).not.toMatch(/Ketik \*6\* untuk laporan periode lain/i);
    });

    it('synthesize melempar exception → tertangkap, pakai fallback', async () => {
        aiRouter.generateText.mockRejectedValueOnce(new Error('boom'));
        const out = await svc.answer({
            question: 'cek stok bakso',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        });
        expect(out.answer).toMatch(/Stok|data yang berhasil/i);
    });

    it('answer dengan question kosong tetap jalan', async () => {
        const out = await svc.answer({
            question: '',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        });
        expect(out.answer.length).toBeGreaterThan(0);
    });

    it('fallbackAnswer tanpa hasil tool → pesan default', () => {
        const msg = (svc as any).fallbackAnswer([], undefined);
        expect(msg).toMatch(/belum bisa menjawab/i);
    });

    it('fallbackAnswer non-advice + question undefined → daftar data', () => {
        const msg = (svc as any).fallbackAnswer(
            [{ name: 'get_stock', ok: true, content: 'Stok: 10' }],
            undefined,
        );
        expect(msg).toMatch(/data yang berhasil diambil/i);
        expect(msg).toMatch(/Stok: 10/);
    });

    it('fallbackAnswer advice tanpa report/catalog', () => {
        const msg = (svc as any).fallbackAnswer(
            [{ name: 'get_stock', ok: true, content: 'Stok: 10' }],
            'tips naikkan omzet',
        );
        expect(msg).toMatch(/saran singkat/i);
        expect(msg).not.toMatch(/Ringkasan data/);
        expect(msg).not.toMatch(/daftar menu lengkap/);
    });

    it('fallbackAnswer advice dengan report tanpa baris ringkasan', () => {
        const msg = (svc as any).fallbackAnswer(
            [{ name: 'get_combined_report', ok: true, content: 'Halo dunia\nbaris lain' }],
            'tips naikkan omzet',
        );
        expect(msg).toMatch(/saran singkat/i);
        expect(msg).not.toMatch(/Ringkasan data/);
    });

    describe('runTool langsung', () => {
        const baseInput = {
            question: 'q',
            notebookId: 'nb1',
            conversationId: 'c1',
            tenantId: 't1',
        };

        it('get_stock dengan productQuery', async () => {
            const r = await (svc as any).runTool(
                { name: 'get_stock', productQuery: 'mie' },
                baseInput,
            );
            expect(r.result.name).toBe('get_stock');
            expect(umkm.buildStockCheckMessage).toHaveBeenCalledWith('cek stok mie', 't1');
        });

        it('get_stock tanpa productQuery pakai question', async () => {
            const r = await (svc as any).runTool({ name: 'get_stock' }, baseInput);
            expect(r.result.ok).toBe(true);
            expect(umkm.buildStockCheckMessage).toHaveBeenCalledWith('q', 't1');
        });

        it('get_sales_summary dengan & tanpa period', async () => {
            await (svc as any).runTool(
                { name: 'get_sales_summary', period: 'week' },
                baseInput,
            );
            expect(umkm.buildSalesListMessage).toHaveBeenCalledWith('t1', 'week');
            await (svc as any).runTool({ name: 'get_sales_summary' }, baseInput);
            expect(umkm.buildSalesListMessage).toHaveBeenCalledWith('t1', 'today');
        });

        it('get_purchases_summary dengan & tanpa period', async () => {
            await (svc as any).runTool(
                { name: 'get_purchases_summary', period: 'week' },
                baseInput,
            );
            expect(umkm.buildPurchaseListMessage).toHaveBeenCalledWith('t1', 'week');
            await (svc as any).runTool({ name: 'get_purchases_summary' }, baseInput);
            expect(umkm.buildPurchaseListMessage).toHaveBeenCalledWith('t1', 'month');
        });

        it('get_combined_report dengan & tanpa period', async () => {
            await (svc as any).runTool(
                { name: 'get_combined_report', period: 'month' },
                baseInput,
            );
            expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('t1', 'month');
            await (svc as any).runTool({ name: 'get_combined_report' }, baseInput);
            expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('t1', 'today');
        });

        it('list_products', async () => {
            const r = await (svc as any).runTool({ name: 'list_products' }, baseInput);
            expect(r.result.ok).toBe(true);
            expect(umkm.buildProductListMessage).toHaveBeenCalled();
        });

        it('tool tidak dikenali → default not ok', async () => {
            const r = await (svc as any).runTool({ name: 'bogus' } as any, baseInput);
            expect(r.result.ok).toBe(false);
            expect(r.result.content).toMatch(/tidak dikenali/i);
        });

        it('tool melempar Error → ok false dengan message', async () => {
            umkm.buildStockCheckMessage.mockRejectedValueOnce(new Error('db fail'));
            const r = await (svc as any).runTool(
                { name: 'get_stock', productQuery: 'mie' },
                baseInput,
            );
            expect(r.result.ok).toBe(false);
            expect(r.result.content).toMatch(/Gagal menjalankan get_stock: db fail/);
        });

        it('tool melempar non-Error → fallback "error"', async () => {
            umkm.buildStockCheckMessage.mockRejectedValueOnce('kaboom');
            const r = await (svc as any).runTool(
                { name: 'get_stock', productQuery: 'mie' },
                baseInput,
            );
            expect(r.result.ok).toBe(false);
            expect(r.result.content).toMatch(/Gagal menjalankan get_stock: error/);
        });
    });

    describe('toolSearchDocs', () => {
        const input = { question: 'apa isi dokumen', notebookId: 'nb1' };

        it('dengan config + fileContext + dbContext', async () => {
            context.retrieveContext.mockResolvedValueOnce({
                fileContext: 'isi dokumen penting',
                dbContext: 'data view penjualan',
                references: [{ id: 'r1' }],
                rawChunks: [{ id: 'ch1' }],
                documentRetrievalStatus: 'indexed',
                chunks: [],
            } as any);
            const r = await (svc as any).toolSearchDocs(input, { umkm_mode: true });
            expect(studio.getNotebook).not.toHaveBeenCalled();
            expect(r.result.content).toMatch(/Cuplikan dokumen/);
            expect(r.result.content).toMatch(/Data view/);
            expect(r.references).toHaveLength(1);
            expect(r.rawChunks).toHaveLength(1);
        });

        it('tanpa config → ambil notebook, tanpa cuplikan (indexed)', async () => {
            context.retrieveContext.mockResolvedValueOnce({
                fileContext: '',
                dbContext: '',
                references: [],
                rawChunks: [],
                documentRetrievalStatus: 'indexed',
                chunks: [],
            } as any);
            const r = await (svc as any).toolSearchDocs(input, undefined);
            expect(studio.getNotebook).toHaveBeenCalledWith('nb1');
            expect(dbContext.parseConfig).toHaveBeenCalled();
            expect(r.result.content).toMatch(/Tidak ada cuplikan dokumen/);
        });

        it('tanpa cuplikan (not_indexed) → pesan belum terindeks', async () => {
            context.retrieveContext.mockResolvedValueOnce({
                fileContext: '',
                dbContext: '',
                references: [],
                rawChunks: [],
                documentRetrievalStatus: 'not_indexed',
                chunks: [],
            } as any);
            const r = await (svc as any).toolSearchDocs(input, { umkm_mode: true });
            expect(r.result.content).toMatch(/Belum ada dokumen terindeks/);
        });
    });
});
