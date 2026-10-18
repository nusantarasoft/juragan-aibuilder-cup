import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioMarketingPublicController } from './studio-marketing-public.controller';
import { resetMarketingPublicRateLimitsForTests } from './studio-marketing-rate-limit';

describe('StudioMarketingPublicController', () => {
    beforeEach(() => {
        resetMarketingPublicRateLimitsForTests();
    });

    it('returns gallery list from service', async () => {
        const svc = {
            listPublicGallery: vi.fn(async () => ({
                items: [{ id: '1' }],
                page: 1,
                limit: 24,
                total: 1,
            })),
        };
        const ctrl = new StudioMarketingPublicController(svc as any, { get: () => undefined } as any);
        const res = await ctrl.listGallery({
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
        } as any);
        expect(res.items).toHaveLength(1);
    });
});
