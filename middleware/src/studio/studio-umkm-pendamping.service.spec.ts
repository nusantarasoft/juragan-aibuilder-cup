/**
 * Pendamping Bisnis v1 — golden coach + ketik strip + curriculum miss.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioUmkmPendampingService } from './studio-umkm-pendamping.service';
import { stripDisallowedKetikActions } from './studio-umkm-read-tools';

describe('stripDisallowedKetikActions', () => {
    it('keeps allowlisted ketik lines and strips others', () => {
        const raw = [
            '1. Restock indomie',
            'Kenapa: on_hand=1',
            'Aksi: ketik: belanja 1 dus indomie',
            'ketik: hapus semua',
            'ketik: jual 2 bakso',
            'ketik: ubah harga',
        ].join('\n');
        const { text, stripped } = stripDisallowedKetikActions(raw);
        expect(stripped).toBe(2);
        expect(text).toMatch(/ketik: belanja 1 dus indomie/i);
        expect(text).toMatch(/ketik: jual 2 bakso/i);
        expect(text).not.toMatch(/hapus semua/i);
        expect(text).not.toMatch(/ubah harga/i);
    });
});

describe('StudioUmkmPendampingService golden', () => {
    const umkm = {
        buildCombinedReportMessage: vi.fn(async () =>
            [
                '📊 *Laporan gabungan*',
                'Penjualan: *12*',
                'Total penjualan: *Rp 450.000*',
                'Total belanja: *Rp 200.000*',
            ].join('\n'),
        ),
        buildProductListMessage: vi.fn(async () => '📦 Belum ada produk aktif.'),
        fetchStockRows: vi.fn(async () => [
            { name: 'Indomie', sku: 'IN-1', onHand: 1, available: 1, reserved: 0 },
            { name: 'Bakso', sku: 'BK-1', onHand: 2, available: 2, reserved: 0 },
            { name: 'Teh', sku: 'TH-1', onHand: 10, available: 10, reserved: 0 },
        ]),
    };
    const aiRouter = {
        generateText: vi.fn(async () =>
            [
                'Ringkasan: omzet minggu Rp 450.000',
                '',
                '1. Restock Indomie',
                'Kenapa: on_hand=1 di stok tipis',
                'Aksi: ketik: belanja 1 dus indomie',
                '',
                '2. Dorong Bakso',
                'Kenapa: Total penjualan Rp 450.000',
                'Aksi: ketik: jual 2 bakso',
            ].join('\n'),
        ),
    };

    let svc: StudioUmkmPendampingService;

    beforeEach(() => {
        vi.clearAllMocks();
        svc = new StudioUmkmPendampingService(umkm as any, aiRouter as any);
        svc.setCurriculumForTests('# Playbook\n\nCatat dulu, saran belakangan.\n');
    });

    it('golden #1 rich shop → tips cite tool fields, ≤800 chars', async () => {
        const out = await svc.coach('pendamping', 't1');
        expect(out).toBeTruthy();
        expect(out.length).toBeLessThanOrEqual(800);
        expect(out).toMatch(/on_hand=1|450\.000|Total penjualan/i);
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('t1', 'week');
        expect(umkm.fetchStockRows).toHaveBeenCalled();
        expect(aiRouter.generateText).toHaveBeenCalled();
        const m = svc.getMetrics();
        expect(m.pendamping_requests_total).toBe(1);
        expect(m.pendamping_success_total).toBe(1);
    });

    it('golden #2 empty shop → empty-state, no fake benchmarks', async () => {
        umkm.fetchStockRows.mockResolvedValueOnce([]);
        umkm.buildProductListMessage.mockResolvedValueOnce('📦 Belum ada produk.');
        const out = await svc.coach('pendamping', 't1');
        expect(out).toMatch(/Belum ada data/i);
        expect(out).not.toMatch(/benchmark|industri|rata-rata pasar/i);
        expect(aiRouter.generateText).not.toHaveBeenCalled();
    });

    it('golden #3 curriculum miss → numbers-only + honest miss on LLM fail', async () => {
        svc.setCurriculumForTests('');
        aiRouter.generateText.mockResolvedValueOnce('LLM provider not configured');
        const out = await svc.coach('pendamping', 't1');
        expect(out).toMatch(/ringkasan angka|Playbook pendamping belum/i);
        expect(svc.getMetrics().pendamping_fallback_total).toBe(1);
    });

    it('golden #4 invents ketik: hapus semua → stripped', async () => {
        aiRouter.generateText.mockResolvedValueOnce(
            [
                '1. Bersihkan data',
                'Kenapa: on_hand=1',
                'Aksi: ketik: hapus semua',
                'ketik: belanja 1 dus indomie',
            ].join('\n'),
        );
        const out = await svc.coach('pendamping', 't1');
        expect(out).not.toMatch(/hapus semua/i);
        expect(out).toMatch(/ketik: belanja/i);
        expect(svc.getMetrics().pendamping_action_stripped_total).toBeGreaterThanOrEqual(1);
    });

    it('LLM throw → numbers-only fallback, never empty', async () => {
        aiRouter.generateText.mockRejectedValueOnce(new Error('timeout'));
        const out = await svc.coach('saran bisnis', 't1');
        expect(out.trim().length).toBeGreaterThan(20);
        expect(out).toMatch(/Pendamping|angka/i);
        expect(svc.getMetrics().pendamping_fallback_total).toBe(1);
    });

    it('partial tool failure → still returns tips from surviving tools', async () => {
        umkm.fetchStockRows.mockRejectedValueOnce(new Error('stock down'));
        const out = await svc.coach('pendamping', 't1');
        expect(out.trim().length).toBeGreaterThan(20);
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalled();
        // synthesizer or numbers-only path must still answer
        expect(out).toMatch(/Pendamping|Ringkasan|angka|penjualan|450/i);
    });

    it('alias saran bisnis hits coach ritual', async () => {
        const out = await svc.coach('saran bisnis', 'tenant-x');
        expect(out.length).toBeLessThanOrEqual(800);
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('tenant-x', 'week');
    });
});
