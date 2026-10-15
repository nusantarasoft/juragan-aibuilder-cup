import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AosRecruitService } from './aos-recruit.service';
import { KASIR_RECRUIT_TEMPLATE_ID } from './aos-recruit.catalog';

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
        createAgent: vi.fn(async () => ({
            id: 'new-agent',
            slug: 'umkm-kasir',
            name: 'Kasir UMKM',
            role: 'UMKM WhatsApp Kasir',
        })),
    };
}

describe('AosRecruitService', () => {
    it('lists coming soon SKUs for tenant_owner', () => {
        const svc = new AosRecruitService(mockAos() as any);
        const catalog = svc.listCatalogForRole('tenant_owner');
        expect(catalog.some((c) => c.id === KASIR_RECRUIT_TEMPLATE_ID && c.recruitable)).toBe(true);
        expect(catalog.some((c) => c.kind === 'coming_soon')).toBe(true);
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
        expect(aos.createAgent).toHaveBeenCalledWith(
            TENANT,
            expect.objectContaining({ runner: 'browser', slug: 'umkm-kasir' }),
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
            svc.recruitAgent(TENANT, 'pembukuan-soon', { id: 'u1', role: 'tenant_owner', tenantId: TENANT }, { id: 'u1' }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects recruit without tenant membership', async () => {
        const svc = new AosRecruitService(mockAos() as any);
        await expect(
            svc.recruitAgent(TENANT, KASIR_RECRUIT_TEMPLATE_ID, { id: 'u1', role: 'tenant_owner', tenantId: null }, { id: 'u1' }),
        ).rejects.toThrow(ForbiddenException);
    });
});
