import { describe, expect, it, vi } from 'vitest';
import { AosUsageMetricsService, usagePeriodBounds } from './aos-usage-metrics.service';
import type { AosAgent } from './agentic-os.types';

describe('usagePeriodBounds', () => {
    it('clamps days between 1 and 90', () => {
        expect(usagePeriodBounds(0).days).toBe(1);
        expect(usagePeriodBounds(120).days).toBe(90);
    });
});

describe('AosUsageMetricsService', () => {
    const tenantId = '00000000-0000-0000-0000-000000000201';
    const agentA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const agentB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const agents: AosAgent[] = [
        {
            id: agentA,
            slug: 'umkm-kasir',
            name: 'Kasir',
            role: 'Kasir',
            status: 'active',
            archivedAt: null,
        } as AosAgent,
        {
            id: agentB,
            slug: 'umkm-kasir-2',
            name: 'Kasir 2',
            role: 'Kasir',
            status: 'paused',
            archivedAt: null,
        } as AosAgent,
    ];

    function buildSvc(taskRows: { agent_id: string | null; status: string; source: string }[]) {
        const messageCountChain = {
            eq: () => ({
                gte: () => ({
                    lte: async () => ({ count: 5, error: null }),
                }),
            }),
        };
        const from = vi.fn((table: string) => {
            if (table === 'studio_messages') {
                return {
                    select: () => ({
                        in: () => messageCountChain,
                    }),
                };
            }
            return {
                select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
                    if (table === 'aos_tasks') {
                        return {
                            eq: () => ({
                                is: () => ({
                                    gte: () => ({
                                        lte: async () => ({ data: taskRows, error: null }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === 'studio_whatsapp_sessions' && !opts?.head) {
                        return {
                            eq: async () => ({ data: [{ conversation_id: 'conv-1' }], error: null }),
                        };
                    }
                    if (opts?.head) {
                        return {
                            eq: () => ({
                                gte: () => ({
                                    lt: async () => ({ count: 2, error: null }),
                                    lte: async () => ({ count: 1, error: null }),
                                }),
                            }),
                        };
                    }
                    return {};
                },
            };
        });
        const admin = { from, rpc: vi.fn().mockResolvedValue({ data: [{ embedded_chunks: 12 }], error: null }) };
        const supabase = { getAdminClient: () => admin };
        const aos = { listAgents: vi.fn().mockResolvedValue(agents) };
        return new AosUsageMetricsService(supabase as never, aos as never);
    }

    it('aggregates tasks per recruited agent', async () => {
        const svc = buildSvc([
            { agent_id: agentA, status: 'done', source: 'kasir_wa' },
            { agent_id: agentA, status: 'failed', source: 'manual' },
            { agent_id: agentB, status: 'queued', source: 'manual' },
        ]);
        const m = await svc.getMetrics(tenantId, 7);
        expect(m.available).toBe(true);
        expect(m.tasksCreated).toBe(3);
        expect(m.tasksCompleted).toBe(1);
        expect(m.tasksFailed).toBe(1);
        expect(m.agents.find((a) => a.agentId === agentA)?.kasirWaTasks).toBe(1);
        expect(m.agents.find((a) => a.agentId === agentB)?.tasksCreated).toBe(1);
    });
});
