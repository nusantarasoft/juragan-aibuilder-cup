import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { StudioResearchResolver } from './studio-research.resolver';

describe('StudioResearchResolver', () => {
    const svc = {
        assertSuperAdmin: vi.fn(),
        listItems: vi.fn().mockResolvedValue([]),
        runResearchNow: vi.fn().mockResolvedValue({ runId: 'run-1', itemsCreated: 2 }),
    };
    const resolver = new StudioResearchResolver(svc as any);
    const superCtx = { req: { user: { id: 'u1', role: 'super_admin' } } };

    it('studioResearchRunNow requires super_admin', async () => {
        svc.assertSuperAdmin.mockImplementation((role?: string) => {
            if (role !== 'super_admin') throw new ForbiddenException();
        });
        await resolver.studioResearchRunNow(superCtx);
        expect(svc.runResearchNow).toHaveBeenCalledWith('u1');
    });
});
