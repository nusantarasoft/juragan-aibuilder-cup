import { describe, expect, it } from 'vitest';
import {
    filterEligibleProducts,
    finalizeMarketingCaptionLlm,
    formatPriceIdr,
    isPublicGalleryRow,
    marketingContentBlocksRegeneration,
    prepareMarketingBatchCandidates,
    productHasRealPhoto,
    type MarketingItemHistory,
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
    it('keeps only consented stores with media when AI product off', () => {
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

    it('allows consented stores without media when AI product on', () => {
        const rows = filterEligibleProducts(
            [
                {
                    tenant_id: 'b',
                    item_id: '2',
                    product_name: 'Y',
                    selling_price: 2000,
                    media_id: null,
                    store_label: 'Toko B',
                    category_name: null,
                    marketing_consent: true,
                },
            ],
            { allowAiProductImage: true },
        );
        expect(rows).toHaveLength(1);
    });
});

describe('marketingContentBlocksRegeneration', () => {
    it('blocks only pending and approved', () => {
        expect(marketingContentBlocksRegeneration('pending')).toBe(true);
        expect(marketingContentBlocksRegeneration('approved')).toBe(true);
        expect(marketingContentBlocksRegeneration('rejected')).toBe(false);
        expect(marketingContentBlocksRegeneration('unpublished')).toBe(false);
    });
});

describe('prepareMarketingBatchCandidates', () => {
    const row = (id: string, name: string) => ({
        tenant_id: 't',
        item_id: id,
        product_name: name,
        selling_price: 1000,
        media_id: null,
        store_label: 'Toko',
        category_name: null,
        marketing_consent: true,
    });

    it('excludes products with active ads and prefers never-marketed', () => {
        const history = new Map<string, MarketingItemHistory>([
            ['1', { lastCreatedAt: '2026-01-01T00:00:00Z', hasActiveAd: true }],
            ['2', { lastCreatedAt: null, hasActiveAd: false }],
            ['3', { lastCreatedAt: '2026-06-01T00:00:00Z', hasActiveAd: false }],
        ]);
        const out = prepareMarketingBatchCandidates([row('1', 'A'), row('2', 'B'), row('3', 'C')], history);
        expect(out.map((r) => r.item_id)).toEqual(['2', '3']);
    });

    it('rotates oldest last-ad first among eligible', () => {
        const history = new Map<string, MarketingItemHistory>([
            ['a', { lastCreatedAt: '2026-08-01T00:00:00Z', hasActiveAd: false }],
            ['b', { lastCreatedAt: '2026-02-01T00:00:00Z', hasActiveAd: false }],
        ]);
        const out = prepareMarketingBatchCandidates([row('a', 'X'), row('b', 'Y')], history);
        expect(out.map((r) => r.item_id)).toEqual(['b', 'a']);
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
