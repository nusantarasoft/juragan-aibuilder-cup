import { describe, expect, it, vi } from 'vitest';
import { executeUmkmReadTool, stripDisallowedKetikActions } from './studio-umkm-read-tools';

describe('studio-umkm-read-tools', () => {
    it('strips disallowed ketik: lines and keeps allowlisted verbs', () => {
        const raw = [
            '1. Restock',
            'Aksi: ketik: belanja 1 dus indomie',
            'ketik: hapus semua stok',
            'ketik: jual 2 bakso',
            'ketik: cek stok indomie',
        ].join('\n');
        const { text, stripped } = stripDisallowedKetikActions(raw);
        expect(stripped).toBe(1);
        expect(text).toMatch(/belanja 1 dus/);
        expect(text).toMatch(/jual 2 bakso/);
        expect(text).toMatch(/cek stok/);
        expect(text).not.toMatch(/hapus semua/);
    });

    it('executeUmkmReadTool runs get_combined_report via host', async () => {
        const umkm = {
            buildStockCheckMessage: vi.fn(),
            buildSalesListMessage: vi.fn(),
            buildPurchaseListMessage: vi.fn(),
            buildCombinedReportMessage: vi.fn(async () => 'Laporan minggu'),
            buildProductListMessage: vi.fn(),
        };
        const out = await executeUmkmReadTool(
            umkm as any,
            { name: 'get_combined_report', period: 'week' },
            { question: 'pendamping', tenantId: 't1' },
        );
        expect(out?.result.ok).toBe(true);
        expect(out?.result.content).toBe('Laporan minggu');
        expect(umkm.buildCombinedReportMessage).toHaveBeenCalledWith('t1', 'week');
    });

    it('executeUmkmReadTool returns null for search_docs', async () => {
        const out = await executeUmkmReadTool(
            {} as any,
            { name: 'search_docs' },
            { question: 'x', tenantId: 't1' },
        );
        expect(out).toBeNull();
    });
});
