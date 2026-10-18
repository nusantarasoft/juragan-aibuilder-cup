import { describe, expect, it } from 'vitest';
import {
    filterEligibleProducts,
    finalizeMarketingCaptionLlm,
    formatPriceIdr,
    isPublicGalleryRow,
    productHasRealPhoto,
} from './studio-marketing.util';

describe('formatPriceIdr', () => {
    it('formats IDR with thousands separator', () => {
        expect(formatPriceIdr(12500)).toMatch(/Rp\s12\.500/);
    });

    it('handles null price', () => {
        expect(formatPriceIdr(null)).toContain('hubungi');
    });
});

describe('filterEligibleProducts', () => {
    it('keeps only consented stores with media', () => {
        const rows = filterEligibleProducts([
            {
                tenant_id: 'a',
                item_id: '1',
                product_name: 'X',
                selling_price: 1000,
                media_id: 'm1',
                store_label: 'Toko A',
                category_name: null,
                marketing_consent: true,
            },
            {
                tenant_id: 'b',
                item_id: '2',
                product_name: 'Y',
                selling_price: 2000,
                media_id: '',
                store_label: 'Toko B',
                category_name: null,
                marketing_consent: true,
            },
            {
                tenant_id: 'c',
                item_id: '3',
                product_name: 'Z',
                selling_price: 3000,
                media_id: 'm3',
                store_label: 'Toko C',
                category_name: null,
                marketing_consent: false,
            },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0].tenant_id).toBe('a');
    });
});

describe('productHasRealPhoto', () => {
    it('requires non-empty media_ids array', () => {
        expect(productHasRealPhoto([])).toBe(false);
        expect(productHasRealPhoto(['uuid-here'])).toBe(true);
    });
});

describe('isPublicGalleryRow', () => {
    it('only approved + consented', () => {
        expect(isPublicGalleryRow({ status: 'approved', marketing_consent: true })).toBe(true);
        expect(isPublicGalleryRow({ status: 'approved', marketing_consent: false })).toBe(false);
        expect(isPublicGalleryRow({ status: 'pending', marketing_consent: true })).toBe(false);
    });
});

describe('finalizeMarketingCaptionLlm', () => {
    it('throws on provider error text', () => {
        expect(() => finalizeMarketingCaptionLlm('Groq request failed (503)')).toThrow(/LLM provider/i);
    });

    it('parses valid JSON', () => {
        const out = finalizeMarketingCaptionLlm(
            '{"headline":"Es Teh Segar","caption":"Nikmati es teh segar di Warung Bu Siti. Harga Rp 5.000 — mampir ya!"}',
        );
        expect(out.headline).toBe('Es Teh Segar');
        expect(out.caption.length).toBeGreaterThan(12);
    });
});
