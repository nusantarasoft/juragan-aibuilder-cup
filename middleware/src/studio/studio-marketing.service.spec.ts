import { describe, expect, it, vi } from 'vitest';
import { StudioMarketingService } from './studio-marketing.service';
import { isPublicGalleryRow } from './studio-marketing.util';

function thenable<T>(result: T) {
    const chain: Record<string, unknown> = {
        eq: () => chain,
        ilike: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => Promise.resolve(result),
        range: () => Promise.resolve(result),
        then: (onFulfilled: (v: T) => unknown) => Promise.resolve(result).then(onFulfilled),
    };
    return chain;
}

describe('StudioMarketingService public visibility', () => {
    it('getPublicGalleryItem rejects non-approved via isPublicGalleryRow contract', () => {
        expect(isPublicGalleryRow({ status: 'pending', marketing_consent: true })).toBe(false);
    });

    it('loadEligibleProducts respects marketing_consent on store config', async () => {
        const items = [
            {
                id: 'item-1',
                tenant_id: 'toko-a',
                name: 'Produk A',
                selling_price: 5000,
                media_ids: ['media-1'],
                category_id: null,
                status: 'active',
            },
            {
                id: 'item-2',
                tenant_id: 'toko-b',
                name: 'Produk B',
                selling_price: 6000,
                media_ids: ['media-2'],
                category_id: null,
                status: 'active',
            },
        ];

        const adminClient = {
            from: vi.fn((table: string) => {
                if (table === 'studio_whatsapp_config') {
                    return {
                        select: () =>
                            Promise.resolve({
                                data: [
                                {
                                    tenant_id: 'toko-a',
                                    label: 'Toko A',
                                    marketing_consent: true,
                                    enabled: true,
                                },
                                {
                                    tenant_id: 'toko-b',
                                    label: 'Toko B',
                                    marketing_consent: false,
                                    enabled: true,
                                },
                                ],
                                error: null,
                            }),
                    };
                }
                if (table === 'inv_items') {
                    return {
                        select: () => thenable({ data: items, error: null }),
                    };
                }
                return { select: () => thenable({ data: [], error: null }) };
            }),
        };

        const svc = new StudioMarketingService(
            { getAdminClient: () => adminClient } as any,
            { get: () => undefined } as any,
            {} as any,
            {} as any,
        );

        const rows = await svc.loadEligibleProducts();
        expect(rows).toHaveLength(2);
        expect(rows.filter((r) => r.marketing_consent)).toHaveLength(1);
        expect(rows.find((r) => r.marketing_consent)?.tenant_id).toBe('toko-a');
    });
});

describe('StudioMarketingService publicAssetUrl', () => {
    const contentId = '550e8400-e29b-41d4-a716-446655440000';

    function svcWithConfig(get: (key: string) => unknown) {
        return new StudioMarketingService(
            { getAdminClient: () => ({}) } as any,
            { get } as any,
            {} as any,
            {} as any,
        );
    }

    it('uses STUDIO_MARKETING_PUBLIC_BASE_URL when set', () => {
        const svc = svcWithConfig((key) =>
            key === 'STUDIO_MARKETING_PUBLIC_BASE_URL' ? 'https://api.example.com/' : undefined,
        );
        expect(svc.publicAssetUrl(contentId)).toBe(
            `https://api.example.com/public/marketing/assets/${contentId}`,
        );
    });

    it('falls back to SITE_URL when public base URL is unset', () => {
        const svc = svcWithConfig((key) =>
            key === 'SITE_URL' ? 'http://31.97.66.39:8090' : undefined,
        );
        expect(svc.publicAssetUrl(contentId)).toBe(
            `http://31.97.66.39:8090/public/marketing/assets/${contentId}`,
        );
    });

    it('returns a relative path when no base URL is configured', () => {
        const svc = svcWithConfig(() => undefined);
        expect(svc.publicAssetUrl(contentId)).toBe(`/public/marketing/assets/${contentId}`);
    });
});
