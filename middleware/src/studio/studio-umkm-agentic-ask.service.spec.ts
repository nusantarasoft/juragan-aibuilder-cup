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
});
