import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hasMinRole, normalizeAppRole } from '../auth/app-roles';
import { AgenticOsService, AosActor, tenantOf } from './agentic-os.service';
import {
    agentAutoWorkBlocked,
    autoWorkUserMessage,
    readAgentQuietHours,
    type AgentQuietHoursConfig,
    type AgentAutoWorkBlockReason,
} from './aos-agent-work-gate';
import type { AosSessionUser } from './aos-tenant-access';
import { AosAgent, AosTenantOwnerAgentSettings, AosTenantOwnerAgentSettingsInput } from './agentic-os.types';

type Row = Record<string, unknown>;

const OWNER_ALLOWED_STATUS = new Set(['active', 'paused']);

@Injectable()
export class AosTenantAgentSettingsService {
    constructor(private readonly aos: AgenticOsService) {}

    async listOwnerSettings(tenantId: string): Promise<AosTenantOwnerAgentSettings[]> {
        const agents = await this.aos.listAgents(tenantId, false);
        const settings = await this.readTenantSettings(tenantId);
        return agents.map((a) => this.toOwnerView(a, settings));
    }

    async getOwnerSettings(tenantId: string, agentId: string): Promise<AosTenantOwnerAgentSettings> {
        const row = await this.requireAgentInTenant(agentId, tenantId);
        const agent = (await this.aos.getAgent(String(row.id)))!;
        const settings = await this.readTenantSettings(tenantId);
        return this.toOwnerView(agent, settings);
    }

    async updateOwnerSettings(
        tenantId: string,
        agentId: string,
        input: AosTenantOwnerAgentSettingsInput,
        user: AosSessionUser,
        actor: AosActor,
    ): Promise<AosTenantOwnerAgentSettings> {
        this.assertOwnerRole(user);
        const row = await this.requireAgentInTenant(agentId, tenantId);
        const slug = String(row.slug);

        if (input.status !== undefined && input.status !== null) {
            const st = String(input.status).trim();
            if (!OWNER_ALLOWED_STATUS.has(st)) {
                throw new BadRequestException('Status hanya boleh aktif atau libur (paused)');
            }
            await this.aos.updateAgent(String(row.id), { status: st }, 'Tenant owner settings', actor);
        }

        if (input.dailyRunBudget !== undefined && input.dailyRunBudget !== null) {
            const cap = Math.floor(Number(input.dailyRunBudget));
            if (!Number.isFinite(cap) || cap < 0 || cap > 10_000) {
                throw new BadRequestException('Batas balasan harian tidak valid (0 = tanpa batas)');
            }
            await this.aos.updateAgent(String(row.id), { dailyRunBudget: cap }, 'Tenant owner daily cap', actor);
        }

        if (input.quietHours !== undefined) {
            await this.writeQuietHours(tenantId, slug, input.quietHours ?? null);
        }

        return this.getOwnerSettings(tenantId, String(row.id));
    }

    async findRecruitedAgentForAutoGate(tenantId: string, agentRef: string | null): Promise<string | null> {
        if (agentRef) return agentRef;
        const agents = await this.aos.listAgents(tenantId, false);
        const kasir = agents.find((a) => a.slug === 'umkm-kasir' || a.slug.startsWith('umkm-kasir-'));
        return kasir?.id ?? null;
    }

    /** Kasir / recruited agent auto paths (WA consult, Pulse). */
    async assertAutoWorkAllowed(
        tenantId: string,
        agentRef: string,
    ): Promise<{ allowed: true } | { allowed: false; reason: AgentAutoWorkBlockReason; text: string; status: string }> {
        const row = await this.aos.getAgentRow(agentRef, tenantId);
        if (!row) {
            return { allowed: true };
        }
        const settings = await this.readTenantSettings(tenantId);
        const quiet = readAgentQuietHours(settings, String(row.slug));
        const block = agentAutoWorkBlocked(String(row.status), quiet);
        if (!block.blocked || !block.reason) return { allowed: true };
        return {
            allowed: false,
            reason: block.reason,
            text: autoWorkUserMessage(block.reason),
            status: block.reason === 'quiet_hours' ? 'quiet_hours' : 'paused',
        };
    }

    private toOwnerView(agent: AosAgent, settings: unknown): AosTenantOwnerAgentSettings {
        const quiet = readAgentQuietHours(settings, agent.slug);
        return {
            agentId: agent.id,
            slug: agent.slug,
            name: agent.name,
            role: agent.role,
            status: agent.status,
            dailyRunBudget: agent.dailyRunBudget,
            quietHoursEnabled: quiet?.enabled !== false && Boolean(quiet?.start && quiet?.end),
            quietHoursTimezone: quiet?.timezone ?? 'Asia/Jakarta',
            quietHoursStart: quiet?.start ?? '08:00',
            quietHoursEnd: quiet?.end ?? '21:00',
        };
    }

    private assertOwnerRole(user: AosSessionUser): void {
        const role = normalizeAppRole(user.role);
        if (!hasMinRole(role, 'tenant_owner') && !hasMinRole(role, 'admin')) {
            throw new ForbiddenException('Only store owners or admins can change agent settings');
        }
        if (role === 'tenant_owner' && !user.tenantId) {
            throw new ForbiddenException('Tenant membership required');
        }
    }

    private async requireAgentInTenant(agentRef: string, tenantId: string): Promise<Row> {
        const row = await this.aos.getAgentRow(agentRef, tenantId);
        if (!row) throw new NotFoundException('Agent not found');
        if (String(row.tenant_id) !== tenantOf(tenantId)) {
            throw new ForbiddenException('You do not have access to this agent');
        }
        return row;
    }

    private async readTenantSettings(tenantId: string): Promise<unknown> {
        const t = tenantOf(tenantId);
        const { data } = await this.aos.db.from('tenants').select('settings').eq('id', t).maybeSingle();
        return (data as Row | null)?.settings ?? {};
    }

    private async writeQuietHours(tenantId: string, agentSlug: string, quiet: AgentQuietHoursConfig | null): Promise<void> {
        const current = (await this.readTenantSettings(tenantId)) as Record<string, unknown>;
        const agents = { ...(typeof current.agents === 'object' && current.agents ? (current.agents as Record<string, unknown>) : {}) };
        if (!quiet) {
            delete agents[agentSlug];
        } else {
            agents[agentSlug] = {
                quietHours: {
                    enabled: quiet.enabled !== false,
                    timezone: quiet.timezone?.trim() || 'Asia/Jakarta',
                    start: quiet.start?.trim() || '08:00',
                    end: quiet.end?.trim() || '21:00',
                },
            };
        }
        const next = { ...current, agents };
        const t = tenantOf(tenantId);
        const { error } = await this.aos.db.from('tenants').update({ settings: next }).eq('id', t);
        if (error) throw new Error(`Failed to save tenant agent settings: ${error.message}`);
    }
}
