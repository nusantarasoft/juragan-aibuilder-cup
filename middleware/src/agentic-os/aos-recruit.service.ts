import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { hasMinRole, normalizeAppRole } from '../auth/app-roles';
import { AgenticOsService, type AosActor } from './agentic-os.service';
import {
    KASIR_RECRUIT_TEMPLATE_ID,
    RECRUIT_CATALOG,
    SERVICE_DESK_RECRUIT_TEMPLATE_ID,
    TRIAL_MAX_RECRUITED_AGENTS,
    isRecruitedSlug,
    recruitDefaultsForTemplate,
    type RecruitCatalogEntryDef,
} from './aos-recruit.catalog';
import { KASIR_EMPLOYEE_SLUG } from './aos-kasir-live.service';
import type { AosRecruitCatalogEntry, AosRecruitResult } from './agentic-os.types';

export type RecruitSessionUser = {
    id: string;
    email?: string;
    role?: string;
    tenantId?: string | null;
};

const SERVICE_DESK_EMPLOYEE_SLUG = SERVICE_DESK_RECRUIT_TEMPLATE_ID;

@Injectable()
export class AosRecruitService {
    constructor(private readonly aos: AgenticOsService) {}

    listCatalogForRole(role?: string | null): AosRecruitCatalogEntry[] {
        const appRole = normalizeAppRole(role);
        const hideEnterprise = appRole === 'tenant_owner';
        return RECRUIT_CATALOG.filter((e) => !(hideEnterprise && e.kind === 'enterprise_hidden')).map(
            (e) => this.mapCatalogEntry(e),
        );
    }

    private mapCatalogEntry(e: RecruitCatalogEntryDef): AosRecruitCatalogEntry {
        return {
            id: e.id,
            name: e.name,
            role: e.role,
            description: e.description,
            kind: e.kind,
            color: e.color,
            sortOrder: e.sortOrder,
            recruitable: e.kind === 'recruitable',
        };
    }

    async getRecruitStatus(tenantId: string): Promise<{
        recruitedCount: number;
        maxAgents: number;
        kasirRecruited: boolean;
        serviceDeskRecruited: boolean;
    }> {
        const agents = await this.aos.listAgents(tenantId, false);
        const active = agents.filter((a) => !a.archivedAt);
        const kasirRecruited = active.some(
            (a) => isRecruitedSlug(KASIR_EMPLOYEE_SLUG, a.slug) || isRecruitedSlug(KASIR_RECRUIT_TEMPLATE_ID, a.slug),
        );
        const serviceDeskRecruited = active.some((a) => isRecruitedSlug(SERVICE_DESK_EMPLOYEE_SLUG, a.slug));
        const max = await this.maxAgentsForTenant(tenantId);
        return { recruitedCount: active.length, maxAgents: max, kasirRecruited, serviceDeskRecruited };
    }

    private async maxAgentsForTenant(tenantId: string): Promise<number> {
        const plan = await this.aos.getTenantSubscriptionPlan(tenantId);
        if (plan === 'trial') return TRIAL_MAX_RECRUITED_AGENTS;
        return TRIAL_MAX_RECRUITED_AGENTS;
    }

    async recruitAgent(
        tenantId: string,
        templateId: string,
        user: RecruitSessionUser,
        actor: AosActor,
    ): Promise<AosRecruitResult> {
        const role = normalizeAppRole(user.role);
        if (role === 'tenant_owner' && !user.tenantId) {
            throw new ForbiddenException('Tenant membership required');
        }
        if (!hasMinRole(role, 'tenant_owner') && !hasMinRole(role, 'admin')) {
            throw new ForbiddenException('Only store owners or admins can recruit agents');
        }

        const entry = RECRUIT_CATALOG.find((c) => c.id === templateId);
        if (!entry || entry.kind !== 'recruitable') {
            throw new BadRequestException('Agent type is not available for recruitment yet');
        }

        const defaults = recruitDefaultsForTemplate(templateId);
        if (!defaults) {
            throw new BadRequestException('Agent type is not available for recruitment yet');
        }

        const status = await this.getRecruitStatus(tenantId);
        if (status.recruitedCount >= status.maxAgents) {
            throw new BadRequestException(`Batas trial: maksimal ${status.maxAgents} karyawan AI`);
        }

        if (templateId === KASIR_RECRUIT_TEMPLATE_ID) {
            if (status.kasirRecruited) {
                throw new BadRequestException('Kasir UMKM sudah direkrut untuk toko ini');
            }
        } else if (templateId === SERVICE_DESK_RECRUIT_TEMPLATE_ID) {
            if (status.serviceDeskRecruited) {
                throw new BadRequestException('Service Desk sudah direkrut untuk toko ini');
            }
        }

        const d = defaults;
        const slug = await this.aos.uniqueSlug('aos_agents', tenantId, d.baseSlug);
        const agent = await this.aos.createAgent(
            tenantId,
            {
                name: d.name,
                slug,
                role: d.role,
                persona: d.persona,
                color: d.color,
                zone: d.zone,
                deskId: d.deskId,
                modules: d.modules,
                skills: d.skills,
                tools: d.tools,
                permissions: d.permissions,
                guardrails: d.guardrails,
                runner: d.runner,
                status: d.status,
            },
            actor,
        );

        if (templateId === KASIR_RECRUIT_TEMPLATE_ID) {
            return {
                agent,
                waConnectRequired: true,
                message: 'Kasir direkrut. Hubungkan WhatsApp (F2-3) agar bisa balas pelanggan.',
            };
        }

        return {
            agent,
            waConnectRequired: false,
            message: 'Service Desk direkrut. Buka ITSM untuk antrian tiket — hanya draft/komentar, tutup tiket butuh persetujuan manusia.',
        };
    }
}
