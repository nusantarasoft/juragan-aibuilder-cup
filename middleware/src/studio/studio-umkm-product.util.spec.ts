import { describe, expect, it } from 'vitest';
import {
    findBestProductMatch,
    formatProductListWa,
    formatSaleConfirmationWithCatalog,
    formatSalePreviewWithCatalog,
    formatStockCheckWa,
    resolveSaleItemsAgainstCatalog,
    scoreProductMatch,
    type UmkmCatalogProduct,
} from './studio-umkm-product.util';

const catalog: UmkmCatalogProduct[] = [
    { id: '1', name: 'Es Kopi', sku: 'KOPI-001', sellingPrice: 15000 },
    { id: '2', name: 'Kopi Susu', sku: 'KOPI-002', sellingPrice: 18000 },
    { id: '3', name: 'Sabun Cuci', sku: 'SABUN-01', sellingPrice: 25000 },
];

describe('studio-umkm-product.util', () => {
    it('scores exact and partial name matches', () => {
        expect(scoreProductMatch('Es Kopi', catalog[0])).toBeGreaterThan(90);
        expect(scoreProductMatch('kopi susu', catalog[1])).toBeGreaterThan(90);
        expect(scoreProductMatch('es kopi', catalog[0])).toBeGreaterThan(50);
        expect(scoreProductMatch('xyz unknown', catalog[0])).toBeLessThan(55);
    });

    it('finds best product match', () => {
        const m = findBestProductMatch('jual kopi susu', catalog);
        expect(m?.name).toBe('Kopi Susu');
    });

    it('resolves sale items against catalog', () => {
        const resolved = resolveSaleItemsAgainstCatalog(
            [{ name: 'es kopi', quantity: 2, unitPrice: 0 }],
            catalog,
        );
        expect(resolved[0].catalogMatched).toBe(true);
        expect(resolved[0].itemId).toBe('1');
        expect(resolved[0].unitPrice).toBe(15000);
    });

    it('marks unknown items as unmatched', () => {
        const resolved = resolveSaleItemsAgainstCatalog(
            [{ name: 'produk asing', quantity: 1, unitPrice: 10000 }],
            catalog,
        );
        expect(resolved[0].catalogMatched).toBe(false);
    });

    it('formats product list for WA', () => {
        const text = formatProductListWa(catalog);
        expect(text).toContain('Es Kopi');
        expect(text).toContain('KOPI-001');
    });

    it('formats blocked message when catalog required', () => {
        const msg = formatSaleConfirmationWithCatalog({
            orderNumber: '',
            totalAmount: 0,
            items: [{ name: 'asal', quantity: 1, unitPrice: 1, catalogMatched: false }],
            unmatchedBlocked: true,
        });
        expect(msg).toContain('tidak dikenali');
    });

    it('formats sale preview before commit', () => {
        const msg = formatSalePreviewWithCatalog({
            totalAmount: 30000,
            items: [
                {
                    name: 'Es Kopi',
                    quantity: 2,
                    unitPrice: 15000,
                    catalogMatched: true,
                    itemSku: 'KOPI-001',
                },
            ],
            paymentMethod: 'tunai',
        });
        expect(msg).toContain('Konfirmasi');
        expect(msg).toContain('ya');
        expect(msg).not.toContain('tercatat');
    });

    it('formats stock check rows', () => {
        const msg = formatStockCheckWa(
            [{ name: 'Es Kopi', sku: 'KOPI-001', available: 12, onHand: 15, reserved: 3 }],
            { query: 'kopi' },
        );
        expect(msg).toContain('Cek Stok');
        expect(msg).toContain('12');
    });
});

describe('scoreProductMatch — edge cases', () => {
    it('returns 0 for an empty query', () => {
        expect(scoreProductMatch('', catalog[0])).toBe(0);
    });
    it('returns 100 for an exact SKU match', () => {
        expect(scoreProductMatch('KOPI-001', catalog[0])).toBe(100);
    });
    it('returns 0 when the query is only single-character tokens', () => {
        expect(scoreProductMatch('x y', { id: 'z', name: 'Zzz', sku: null, sellingPrice: 0 })).toBe(0);
    });
    it('returns 0 when no tokens overlap', () => {
        expect(scoreProductMatch('foobar qux', catalog[2])).toBe(0);
    });
    it('scores token overlap between 40 and 55', () => {
        // "kopi" overlaps "Es Kopi" -> 40 + 10 = 50 (below default minScore)
        const s = scoreProductMatch('kopi mantap', catalog[0]);
        expect(s).toBeGreaterThanOrEqual(40);
        expect(s).toBeLessThan(55);
    });
});

describe('resolveSaleItemsAgainstCatalog — pricing', () => {
    const withFree: UmkmCatalogProduct[] = [
        ...catalog,
        { id: '9', name: 'Sampel Gratis', sku: null, sellingPrice: 0 },
    ];

    it('keeps a positive item unit price even when matched', () => {
        const r = resolveSaleItemsAgainstCatalog(
            [{ name: 'es kopi', quantity: 1, unitPrice: 20000 }],
            catalog,
        );
        expect(r[0].catalogMatched).toBe(true);
        expect(r[0].unitPrice).toBe(20000);
    });

    it('falls back to item price when both item and catalog price are 0 (sku null)', () => {
        const r = resolveSaleItemsAgainstCatalog(
            [{ name: 'sampel gratis', quantity: 1, unitPrice: 0 }],
            withFree,
        );
        expect(r[0].catalogMatched).toBe(true);
        expect(r[0].unitPrice).toBe(0);
        expect(r[0].itemSku).toBeUndefined();
    });
});

describe('formatProductListWa — branches', () => {
    it('handles an empty catalog', () => {
        expect(formatProductListWa([])).toContain('Belum ada produk terdaftar');
    });
    it('omits price/sku when absent', () => {
        const text = formatProductListWa([
            { id: '1', name: 'Gratisan', sku: null, sellingPrice: 0 },
        ]);
        expect(text).toContain('• Gratisan');
        expect(text).not.toContain('—');
        expect(text).not.toContain('(');
    });
    it('shows overflow count past maxItems', () => {
        const text = formatProductListWa(catalog, { maxItems: 1 });
        expect(text).toContain('dan 2 produk lainnya');
    });
});

describe('formatSaleConfirmationWithCatalog — success path', () => {
    it('renders matched + unmatched items and payment method', () => {
        const msg = formatSaleConfirmationWithCatalog({
            orderNumber: 'INV-1',
            totalAmount: 45000,
            items: [
                { name: 'Es Kopi', quantity: 2, unitPrice: 15000, catalogMatched: true, itemSku: 'KOPI-001' },
                { name: 'cireng', quantity: 1, unitPrice: 15000, catalogMatched: false },
            ],
            paymentMethod: 'tunai',
        });
        expect(msg).toContain('tercatat');
        expect(msg).toContain('INV-1');
        expect(msg).toContain('[KOPI-001]');
        expect(msg).toContain('belum di katalog');
        expect(msg).toContain('Pembayaran: tunai');
    });

    it('handles no items and no payment method', () => {
        const msg = formatSaleConfirmationWithCatalog({
            orderNumber: 'INV-2',
            totalAmount: 0,
            items: [],
        });
        expect(msg).toContain('INV-2');
        expect(msg).not.toContain('Pembayaran');
        expect(msg).not.toContain('Item:');
    });
});

describe('formatSalePreviewWithCatalog — branches', () => {
    it('uses custom confirm/cancel hints and shows customer + unmatched tag', () => {
        const msg = formatSalePreviewWithCatalog(
            {
                totalAmount: 15000,
                items: [{ name: 'cireng', quantity: 1, unitPrice: 15000, catalogMatched: false }],
                paymentMethod: 'qris',
                customerName: 'Budi',
            },
            { confirm: 'oke', cancel: 'gak' },
        );
        expect(msg).toContain('*oke*');
        expect(msg).toContain('*gak*');
        expect(msg).toContain('Pelanggan: Budi');
        expect(msg).toContain('belum di katalog');
    });

    it('handles no items, payment or customer with default hints', () => {
        const msg = formatSalePreviewWithCatalog({ totalAmount: 0, items: [] });
        expect(msg).toContain('*ya*');
        expect(msg).toContain('*batal*');
        expect(msg).not.toContain('Item:');
        expect(msg).not.toContain('Pembayaran');
        expect(msg).not.toContain('Pelanggan');
    });
});

describe('formatStockCheckWa — branches', () => {
    it('empty rows with a query', () => {
        expect(formatStockCheckWa([], { query: 'gula' })).toContain('Tidak ditemukan stok untuk *gula*');
    });
    it('empty rows without a query', () => {
        expect(formatStockCheckWa([])).toContain('Belum ada data stok');
    });
    it('shows overflow count and fractional quantities (sku null)', () => {
        const rows = [
            { name: 'Beras', sku: null, available: 2.5, onHand: 3.25, reserved: 0.75 },
            { name: 'Gula', sku: 'G-1', available: 10, onHand: 10, reserved: 0 },
        ];
        const msg = formatStockCheckWa(rows, { maxItems: 1 });
        expect(msg).toContain('2.5');
        expect(msg).toContain('dan 1 item lainnya');
        expect(msg).not.toContain('[');
    });
});
