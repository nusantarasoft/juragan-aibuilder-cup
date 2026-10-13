import { describe, expect, it, vi } from 'vitest';
import { AgenticOsResolver } from './agentic-os.resolver';
import { KASIR_EMPLOYEE_SLUG } from './aos-kasir-live.service';

describe('AgenticOsResolver.aosKasirLiveSnapshot', () => {
    it('delegates to AosKasirLiveService (read-only, no auth guard on query)', async () => {
        const kasirLive = {
            getSnapshot: vi.fn().mockResolvedValue({
                available: true,
                tenantId: 'default',
                slug: KASIR_EMPLOYEE_SLUG,
                name: 'Kasir',
                role: 'UMKM WhatsApp Kasir',
                source: 'ai_studio',
                unavailableReason: null,
                waChatsToday: 1,
                transactionsToday: 2,
                lastActivityAt: null,
                waOnline: true,
            }),
        };
        const resolver = new AgenticOsResolver({} as any, {} as any, {} as any, {} as any, kasirLive as any);
        const out = await resolver.aosKasirLiveSnapshot('tenant-a');
        expect(kasirLive.getSnapshot).toHaveBeenCalledWith('tenant-a');
        expect(out.slug).toBe(KASIR_EMPLOYEE_SLUG);
    });
});
