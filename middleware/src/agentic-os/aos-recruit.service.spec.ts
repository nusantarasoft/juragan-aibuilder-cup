import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AosRecruitService } from './aos-recruit.service';
import {
    FINANCE_RECRUIT_TEMPLATE_ID,
    KASIR_RECRUIT_TEMPLATE_ID,
    SERVICE_DESK_RECRUIT_TEMPLATE_ID,
} from './aos-recruit.catalog';

const TENANT = '00000000-0000-0000-0000-000000000201';

function mockAos(overrides: Partial<{
    agents: { slug: string; archivedAt?: string | null }[];
    plan: string;
}> = {}) {
    const agents = overrides.agents ?? [];
    return {
        listAgents: vi.fn(async () =>
            agents.map((a, i) => ({
                id: `a${i}`,
                slug: a.slug,
                archivedAt: a.archivedAt ?? null,
            })),
        ),
        getTenantSubscriptionPlan: vi.fn(async () => overrides.plan ?? 'trial'),
        uniqueSlug: vi.fn(async (_t, _tid, base: string) => base),
        createAgent: vi.fn(async (_t, input) => ({
            id: 'new-agent',
            slug: input.slug,
            name: input.name,
            role: input.role,
        })),
    };
}

describe('AosRecruitService', () => {
    it('lists recruitable Kasir + Service Desk for tenant_owner', () => {
        const svc = new AosRecruitService(mockAos() as any);
        const catalog = svc.listCatalogForRole('tenant_owner');
        expect(catalog.some((c) => c.id === KASIR_RECRUIT_TEMPLATE_ID && c.recruitable)).toBe(true);
        expect(catalog.some((c) => c.id === SERVICE_DESK_RECRUIT_TEMPLATE_ID && c.recruitable)).toBe(true);
        expect(catalog.some((c) => c.id === FINANCE_RECRUIT_TEMPLATE_ID && c.recruitable)).toBe(true);
        expect(catalog.some((c) => c.id === 'sales-soon' && c.kind === 'coming_soon')).toBe(true);
        expect(catalog.some((c) => c.kind === 'coming_soon')).toBe(true);
        expect(catalog.some((c) => c.id === 'pembukuan-soon')).toBe(false);
    });

    it('recruits kasir with browser runner preset', async () => {
        const aos = mockAos();
        const svc = new AosRecruitService(aos as any);
        const out = await svc.recruitAgent(
            TENANT,
            KASIR_RECRUIT_TEMPLATE_ID,
            { id: 'u1', role: 'tenant_owner', tenantId: TENANT },
            { id: 'u1' },
        );
        expect(out.agent.slug).toBe('umkm-kasir');
        expect(out.waConnectRequired).toBe(true);
        expect(aos.createAgent).toHaveBeenCalledWith(
            TENANT,
            expect.objectContaining({ runner: 'browser', slug: 'umkm-kasir' }),
            { id: 'u1' },
        );
    });

    it('recruits service desk with cloud runner and ticket guardrails', async () => {
        const aos = mockAos();
        const svc = new AosRecruitService(aos as any);
        const out = await svc.recruitAgent(
            TENANT,
            SERVICE_DESK_RECRUIT_TEMPLATE_ID,
            { id: 'u1', role: 'tenant_owner', tenantId: TENANT },
            { id: 'u1' },
        );
        expect(out.agent.slug).toBe('service-desk');
        expect(out.waConnectRequired).toBe(false);
        expect(aos.createAgent).toHaveBeenCalledWith(
            TENANT,
            expect.objectContaining({
                runner: 'cloud',
                slug: 'service-desk',
                modules: ['itsm', 'knowledge'],
                tools: expect.arrayContaining(['ticket.comment', 'module.draft']),
                guardrails: expect.objectContaining({
                    requireApproval: expect.arrayContaining(['ticket.close']),
                    noAutoCloseTickets: true,
                }),
            }),
            { id: 'u1' },
        );
    });

    it('rejects duplicate kasir', async () => {
        const svc = new AosRecruitService(
            mockAos({ agents: [{ slug: 'umkm-kasir' }] }) as any,
        );
        await expect(
            svc.recruitAgent(TENANT, KASIR_RECRUIT_TEMPLATE_ID, { id: 'u1', role: 'tenant_owner', tenantId: TENANT }, { id: 'u1' }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate service desk', async () => {
        const svc = new AosRecruitService(
            mockAos({ agents: [{ slug: 'service-desk' }] }) as any,
        );
        await expect(
            svc.recruitAgent(
                TENANT,
                SERVICE_DESK_RECRUIT_TEMPLATE_ID,
                { id: 'u1', role: 'tenant_owner', tenantId: TENANT },
                { id: 'u1' },
            ),
        ).rejects.toThrow(/Service Desk/i);
    });

    it('enforces trial cap of 3', async () => {
        const svc = new AosRecruitService(
            mockAos({
                agents: [
                    { slug: 'helper-1' },
                    { slug: 'helper-2' },
                    { slug: 'helper-3' },
                ],
            }) as any,
        );
        await expect(
            svc.recruitAgent(TENANT, KASIR_RECRUIT_TEMPLATE_ID, { id: 'u1', role: 'tenant_owner', tenantId: TENANT }, { id: 'u1' }),
        ).rejects.toThrow(/maksimal 3/i);
    });

    it('rejects coming soon template', async () => {
        const svc = new AosRecruitService(mockAos() as any);
        await expect(
            svc.recruitAgent(TENANT, 'cs-soon', { id: 'u1', role: 'tenant_owner', tenantId: TENANT }, { id: 'u1' }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects recruit without tenant membership', async () => {
        const svc = new AosRecruitService(mockAos() as any);
        await expect(
            svc.recruitAgent(TENANT, KASIR_RECRUIT_TEMPLATE_ID, { id: 'u1', role: 'tenant_owner', tenantId: null }, { id: 'u1' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('reports serviceDeskRecruited in status', async () => {
        const svc = new AosRecruitService(mockAos({ agents: [{ slug: 'service-desk-2' }] }) as any);
        const st = await svc.getRecruitStatus(TENANT);
        expect(st.serviceDeskRecruited).toBe(true);
        expect(st.kasirRecruited).toBe(false);
        expect(st.financeRecruited).toBe(false);
    });

    it('recruits finance with cloud runner and journal guardrails', async () => {
        const aos = mockAos();
        const svc = new AosRecruitService(aos as any);
        const out = await svc.recruitAgent(
            TENANT,
            FINANCE_RECRUIT_TEMPLATE_ID,
            { id: 'u1', role: 'tenant_owner', tenantId: TENANT },
            { id: 'u1' },
        );
        expect(out.agent.slug).toBe('finance');
        expect(out.waConnectRequired).toBe(false);
        expect(aos.createAgent).toHaveBeenCalledWith(
            TENANT,
            expect.objectContaining({
                runner: 'cloud',
                slug: 'finance',
                modules: ['accounting', 'reports'],
                tools: expect.arrayContaining(['report.generate', 'db.query']),
                guardrails: expect.objectContaining({
                    requireApproval: expect.arrayContaining(['journal.post']),
                    noAutoPostJournal: true,
                }),
            }),
            { id: 'u1' },
        );
    });

    it('rejects duplicate finance', async () => {
        const svc = new AosRecruitService(mockAos({ agents: [{ slug: 'finance' }] }) as any);
        await expect(
            svc.recruitAgent(
                TENANT,
                FINANCE_RECRUIT_TEMPLATE_ID,
                { id: 'u1', role: 'tenant_owner', tenantId: TENANT },
                { id: 'u1' },
            ),
        ).rejects.toThrow(/Finance/i);
    });

    it('reports financeRecruited in status', async () => {
        const svc = new AosRecruitService(mockAos({ agents: [{ slug: 'finance-2' }] }) as any);
        const st = await svc.getRecruitStatus(TENANT);
        expect(st.financeRecruited).toBe(true);
    });
});
