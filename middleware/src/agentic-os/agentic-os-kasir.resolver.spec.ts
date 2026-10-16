import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AgenticOsResolver } from './agentic-os.resolver';
import { KASIR_EMPLOYEE_SLUG } from './aos-kasir-live.service';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';

describe('AgenticOsResolver.aosKasirLiveSnapshot', () => {
    it('requires authenticated user and scopes tenant for admin', async () => {
        const kasirLive = {
            getSnapshot: vi.fn().mockResolvedValue({
                available: true,
                tenantId: AOS_DEFAULT_TENANT,
                slug: KASIR_EMPLOYEE_SLUG,
            }),
        };
        const resolver = new AgenticOsResolver({} as any, {} as any, {} as any, {} as any, kasirLive as any);

        expect(() => resolver.aosKasirLiveSnapshot({ req: { user: null } }, undefined)).toThrow(
            UnauthorizedException,
        );

        await resolver.aosKasirLiveSnapshot({ req: { user: { id: 'u1', role: 'admin' } } }, 'default');
        expect(kasirLive.getSnapshot).toHaveBeenCalledWith(AOS_DEFAULT_TENANT);
    });
});
