import { describe, expect, it } from 'vitest';
import {
    findBestProductMatch,
    formatProductListWa,
    formatSaleConfirmationWithCatalog,
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
});
