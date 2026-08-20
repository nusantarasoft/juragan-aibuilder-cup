import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioUmkmPendampingService } from './studio-umkm-pendamping.service';

describe('StudioUmkmPendampingService', () => {
    const umkm = {
        buildStockCheckMessage: vi.fn(async () => 'Stok'),
        buildSalesListMessage: vi.fn(async () => 'Sales'),
        buildPurchaseListMessage: vi.fn(async () => 'Buy'),
        buildCombinedReportMessage: vi.fn(
            async () =>
                '📊 *Laporan Minggu ini*\n\nPenjualan: *12* order\nTotal penjualan: *Rp 1.200.000*\nTotal belanja: *Rp 400.000*\nSelisih: *Rp 800.000*',
        ),
        buildProductListMessage: vi.fn(async () => '📦 Daftar\n• Indomie'),
        fetchStockRows: vi.fn(async () => [
            { name: 'Indomie', sku: 'I1', onHand: 1, available: 1, reserved: 0 },
            { name: 'Teh', sku: 'T1', onHand: 10, available: 10, reserved: 0 },
        ]),
    };
    const aiRouter = {
        generateText: vi.fn(
            async () =>
                [
                    'Ringkasan: omzet minggu Rp 1.200.000',
                    '',
                    '1. Dorong Indomie',
                    'Kenapa: on_hand=1 dari tools',
                    'Aksi: ketik: belanja 1 dus indomie',
                    '',
                    '2. Jaga margin',
                    'Kenapa: selisih Rp 800.000',
                    'Aksi: ketik: laporan',
                ].join('\n'),
        ),
    };

    let svc: StudioUmkmPendampingService;

    beforeEach(() => {
        vi.clearAllMocks();
        svc = new StudioUmkmPendampingService(umkm as any, aiRouter as any);
        svc.onModuleInit();
    });

    it('golden rich books → tips cite numbers and strip bad ketik', async () => {
        aiRouter.generateText.mockResolvedValueOnce(
            [
                'Ringkasan: Total penjualan Rp 1.200.000',
                '1. Restock Indomie',
                'Kenapa: on_hand=1',
                'Aksi: ketik: belanja 1 dus indomie',
                'ketik: hapus semua',
            ].join('\n'),
        );
        const out = await svc.coach('pendamping', 't1');
        expect(out).toBeTruthy();
        expect(out.length).toBeLessThanOrEqual(800);
        expect(out).toMatch(/1\.200\.000|on_hand|Indomie|belanja/i);
        expect(out).not.toMatch(/hapus semua/);
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('t1', 'week');
        expect(umkm.fetchStockRows).toHaveBeenCalled();
        expect(svc.getMetrics().pendamping_requests_total).toBeGreaterThanOrEqual(1);
        expect(svc.getMetrics().pendamping_action_stripped_total).toBeGreaterThanOrEqual(1);
    });

    it('golden empty shop → empty-state copy', async () => {
        umkm.buildCombinedReportMessage.mockResolvedValueOnce(
            '📊 *Laporan Minggu ini*\n\nPenjualan: *0* order\nTotal penjualan: *Rp 0*\nTotal belanja: *Rp 0*\nSelisih: *Rp 0*',
        );
        umkm.fetchStockRows.mockResolvedValueOnce([]);
        const out = await svc.coach('pendamping', 't1');
        expect(out).toMatch(/Belum ada data|jual|belanja/i);
        expect(aiRouter.generateText).not.toHaveBeenCalled();
    });

    it('golden LLM fail → numbers-only fallback', async () => {
        aiRouter.generateText.mockRejectedValueOnce(new Error('timeout'));
        const out = await svc.coach('saran bisnis', 't1');
        expect(out).toMatch(/Pendamping|angka|Laporan/i);
        expect(svc.getMetrics().pendamping_fallback_total).toBeGreaterThanOrEqual(1);
    });

    it('golden write-sounding tip still strips bad action', async () => {
        aiRouter.generateText.mockResolvedValueOnce(
            '1. Reset\nAksi: ketik: hapus semua stok\nAksi: ketik: jual 1 bakso',
        );
        const out = await svc.coach('pendamping bisnis', 't1');
        expect(out).toMatch(/jual 1 bakso/);
        expect(out).not.toMatch(/hapus/);
    });
});
