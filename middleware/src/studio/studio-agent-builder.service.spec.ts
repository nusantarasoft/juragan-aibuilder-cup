import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioAgentBuilderService } from './studio-agent-builder.service';
import { ForbiddenException } from '@nestjs/common';

describe('StudioAgentBuilderService', () => {
    let svc: StudioAgentBuilderService;
    let from: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        from = vi.fn();
        svc = new StudioAgentBuilderService({
            getAdminClient: () => ({ from }),
        } as never);
    });

    it('lists workflows for tenant', async () => {
        from.mockReturnValueOnce({
            select: () => ({
                eq: () => ({
                    neq: () => ({
                        order: async () => ({
                            data: [
                                {
                                    id: 'w1',
                                    tenant_id: 't1',
                                    name: 'Onboarding',
                                    description: '',
                                    status: 'draft',
                                    graph: { nodes: [], edges: [] },
                                },
                            ],
                            error: null,
                        }),
                    }),
                }),
            }),
        });
        const rows = await svc.listWorkflows('t1');
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe('Onboarding');
    });

    it('rejects delete for wrong tenant', async () => {
        from.mockReturnValueOnce({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: { id: 'w1', tenant_id: 'other-tenant' },
                        error: null,
                    }),
                }),
            }),
        });
        await expect(svc.deleteWorkflow('home-tenant', 'w1')).rejects.toBeInstanceOf(ForbiddenException);
    });
});
