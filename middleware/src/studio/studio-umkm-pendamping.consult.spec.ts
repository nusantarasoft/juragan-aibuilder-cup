/**
 * Fase 1 — consultFromNotebook (chunk-only; never coach / store tools).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { StudioUmkmPendampingService } from './studio-umkm-pendamping.service';
import {
    buildConsultFromNotebookPrompt,
    CONSULT_BUSY_COPY,
    CONSULT_LEDGER_REDIRECT_COPY,
    CONSULT_MISS_COPY,
    looksLikeKasirLedgerQuestion,
} from './studio-umkm-pendamping.prompts';

describe('buildConsultFromNotebookPrompt', () => {
    it('includes question + buku block; no tools/ledger blocks', () => {
        const prompt = buildConsultFromNotebookPrompt({
            question: 'gimana atur modal warung',
            chunkContext: 'Modal usaha kecil perlu dipisah dari uang pribadi.',
        });
        expect(prompt).toMatch(/USER_QUESTION/);
        expect(prompt).toMatch(/gimana atur modal warung/);
        expect(prompt).toMatch(/BLOK_BUKU/);
        expect(prompt).toMatch(/Modal usaha kecil/);
        expect(prompt).not.toMatch(/BLOK_KASIR|BLOK_TOOLS|BLOK_PLAYBOOK|Laporan minggu|on_hand/i);
        expect(prompt).toMatch(/Jangan sebut atau mengarang omzet/);
    });

    it('optional shopSnapshot → BLOK_KASIR labeled tools-only', () => {
        const prompt = buildConsultFromNotebookPrompt({
            question: 'gimana atur modal',
            chunkContext: 'Pisahkan modal.',
            shopSnapshot: 'Omzet hari ini: Rp 150.000',
        });
        expect(prompt).toMatch(/BLOK_KASIR/);
        expect(prompt).toMatch(/dari kasir toko kamu/);
        expect(prompt).toMatch(/Omzet hari ini/);
        expect(prompt).toMatch(/Jangan campur angka kasir/);
    });
});

describe('looksLikeKasirLedgerQuestion', () => {
    it('flags live kasir intents', () => {
        expect(looksLikeKasirLedgerQuestion('cek stok indomie')).toBe(true);
        expect(looksLikeKasirLedgerQuestion('tanya cek stok indomie')).toBe(true);
        expect(looksLikeKasirLedgerQuestion('laporan hari ini')).toBe(true);
        expect(looksLikeKasirLedgerQuestion('jual 2 indomie')).toBe(true);
    });

    it('allows kurikulum business questions', () => {
        expect(looksLikeKasirLedgerQuestion('tanya cara atur modal')).toBe(false);
        expect(looksLikeKasirLedgerQuestion('bauran pemasaran 7P')).toBe(false);
        expect(looksLikeKasirLedgerQuestion('jangan campur uang pribadi')).toBe(false);
    });
});

describe('StudioUmkmPendampingService.consultFromNotebook', () => {
    const umkm = {
        buildCombinedReportMessage: vi.fn(async () => 'should-not-run'),
        buildProductListMessage: vi.fn(async () => 'should-not-run'),
        fetchStockRows: vi.fn(async () => [{ name: 'Indomie', onHand: 1 }]),
    };
    const aiRouter = {
        generateText: vi.fn(async () =>
            'Pisahkan modal usaha dari uang belanja rumah. (dari buku Manajemen UKM)',
        ),
    };
    const context = {
        semanticSearchNotebook: vi.fn(async () => []),
        retrieveContext: vi.fn(async () => ({
            fileContext: '',
            documentRetrievalStatus: 'not_indexed',
        })),
    };

    let svc: StudioUmkmPendampingService;
    const prevNb = process.env.KASIR_CONSULT_NOTEBOOK_ID;

    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.KASIR_CONSULT_NOTEBOOK_ID;
        delete process.env.KASIR_CONSULT_INJECT_METRICS;
        svc = new StudioUmkmPendampingService(umkm as any, aiRouter as any, context as any);
    });

    afterEach(() => {
        if (prevNb === undefined) delete process.env.KASIR_CONSULT_NOTEBOOK_ID;
        else process.env.KASIR_CONSULT_NOTEBOOK_ID = prevNb;
        delete process.env.KASIR_CONSULT_INJECT_METRICS;
    });

    it('ledger-like question → redirect; no retrieve / LLM / stock tools', async () => {
        const out = await svc.consultFromNotebook('tanya cek stok indomie', 'nb-1');
        expect(out.status).toBe('redirect');
        expect(out.text).toBe(CONSULT_LEDGER_REDIRECT_COPY);
        expect(context.semanticSearchNotebook).not.toHaveBeenCalled();
        expect(aiRouter.generateText).not.toHaveBeenCalled();
        expect(umkm.fetchStockRows).not.toHaveBeenCalled();
    });

    it('notebookId unset → miss; no retrieve / LLM', async () => {
        const out = await svc.consultFromNotebook('tanya modal');
        expect(out.status).toBe('miss');
        expect(out.text).toBe(CONSULT_MISS_COPY);
        expect(context.semanticSearchNotebook).not.toHaveBeenCalled();
        expect(aiRouter.generateText).not.toHaveBeenCalled();
    });

    it('retrieve 0 chunks → miss; no LLM', async () => {
        context.semanticSearchNotebook.mockResolvedValueOnce([]);
        const out = await svc.consultFromNotebook('tanya modal', 'nb-kurikulum');
        expect(out.status).toBe('miss');
        expect(out.text).toBe(CONSULT_MISS_COPY);
        expect(context.semanticSearchNotebook).toHaveBeenCalledWith(
            'nb-kurikulum',
            'tanya modal',
            5,
        );
        expect(aiRouter.generateText).not.toHaveBeenCalled();
    });

    it('retrieve hit → synthesize ≤800; prompt has chunks', async () => {
        context.semanticSearchNotebook.mockResolvedValueOnce([
            {
                chunkId: 'c1',
                sourceId: 's1',
                filename: 'manajemen-ukm.pdf',
                content: 'Modal kerja harus dicatat terpisah. -- 12 of 200 --',
                score: 0.82,
            },
        ]);
        const out = await svc.consultFromNotebook('gimana atur modal', 'nb-1');
        expect(out.status).toBe('hit');
        expect(out.text.length).toBeLessThanOrEqual(800);
        expect(out.text).toMatch(/modal|Manajemen UKM/i);
        expect(out.text).toMatch(/hlm\.?\s*12/i);
        expect(aiRouter.generateText).toHaveBeenCalledTimes(1);
        const prompt = String(aiRouter.generateText.mock.calls[0][0]);
        expect(prompt).toMatch(/BLOK_BUKU/);
        expect(prompt).toMatch(/Modal kerja harus dicatat/);
        expect(prompt).toMatch(/hlm\. 12/);
        expect(prompt).not.toMatch(/BLOK_KASIR|BLOK_TOOLS/);
    });

    it('LLM throw → busy copy (not pendamping numbers)', async () => {
        context.semanticSearchNotebook.mockResolvedValueOnce([
            {
                chunkId: 'c1',
                sourceId: 's1',
                filename: 'buku.pdf',
                content: 'Isi buku.',
                score: 0.9,
            },
        ]);
        aiRouter.generateText.mockRejectedValueOnce(new Error('timeout'));
        const out = await svc.consultFromNotebook('tanya', 'nb-1');
        expect(out.status).toBe('error');
        expect(out.text).toBe(CONSULT_BUSY_COPY);
        expect(out.text).not.toMatch(/Pendamping|ringkasan angka/i);
    });

    it('LLM not configured → busy copy', async () => {
        context.semanticSearchNotebook.mockResolvedValueOnce([
            {
                chunkId: 'c1',
                sourceId: 's1',
                filename: 'buku.pdf',
                content: 'Isi.',
                score: 0.7,
            },
        ]);
        aiRouter.generateText.mockResolvedValueOnce('LLM provider not configured');
        const out = await svc.consultFromNotebook('tanya', 'nb-1');
        expect(out.status).toBe('error');
        expect(out.text).toBe(CONSULT_BUSY_COPY);
    });

    it('never calls store report / stock tools', async () => {
        context.semanticSearchNotebook.mockResolvedValueOnce([
            {
                chunkId: 'c1',
                sourceId: 's1',
                filename: 'buku.pdf',
                content: 'Tips modal.',
                score: 0.8,
            },
        ]);
        await svc.consultFromNotebook('tanya modal', 'nb-1', {
            phone: '6281111111111',
        });
        expect(umkm.fetchStockRows).not.toHaveBeenCalled();
        expect(umkm.buildCombinedReportMessage).not.toHaveBeenCalled();
        expect(context.retrieveContext).not.toHaveBeenCalled();
    });

    it('INJECT_METRICS on + phone → shop snapshot in prompt (not retrieve)', async () => {
        process.env.KASIR_CONSULT_INJECT_METRICS = '1';
        const whatsapp = {
            listConfigs: vi.fn(async () => [
                {
                    tenant_id: 't-shop',
                    enabled: true,
                    notebook_id: 'nb-1',
                    business_phone: '6281111111111',
                    allowlist_phones: [],
                },
            ]),
        };
        umkm.buildCombinedReportMessage.mockResolvedValueOnce(
            '📊 Omzet hari ini: Rp 100.000',
        );
        svc = new StudioUmkmPendampingService(
            umkm as any,
            aiRouter as any,
            context as any,
            whatsapp as any,
        );
        context.semanticSearchNotebook.mockResolvedValueOnce([
            {
                chunkId: 'c1',
                sourceId: 's1',
                filename: 'buku.pdf',
                content: 'Tips modal. -- 4 of 50 --',
                score: 0.8,
            },
        ]);
        await svc.consultFromNotebook('tanya modal', 'nb-1', {
            phone: '6281111111111',
        });
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('t-shop', 'today');
        expect(umkm.fetchStockRows).not.toHaveBeenCalled();
        const prompt = String(aiRouter.generateText.mock.calls[0][0]);
        expect(prompt).toMatch(/BLOK_KASIR/);
        expect(prompt).toMatch(/Omzet hari ini/);
        expect(prompt).toMatch(/BLOK_BUKU/);
    });

    it('question >500 chars truncated before retrieve', async () => {
        const longQ = 'a'.repeat(600);
        context.semanticSearchNotebook.mockResolvedValueOnce([]);
        await svc.consultFromNotebook(longQ, 'nb-1');
        expect(context.semanticSearchNotebook).toHaveBeenCalledWith(
            'nb-1',
            'a'.repeat(500),
            5,
        );
    });

    it('reads KASIR_CONSULT_NOTEBOOK_ID from env when arg omitted', async () => {
        process.env.KASIR_CONSULT_NOTEBOOK_ID = 'nb-from-env';
        context.semanticSearchNotebook.mockResolvedValueOnce([]);
        await svc.consultFromNotebook('tanya harga jual');
        expect(context.semanticSearchNotebook).toHaveBeenCalledWith(
            'nb-from-env',
            'tanya harga jual',
            5,
        );
    });
});
