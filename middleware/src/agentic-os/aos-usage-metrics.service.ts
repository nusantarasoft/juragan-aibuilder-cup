import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { AgenticOsService } from './agentic-os.service';
import { jakartaTodayUtcBounds } from './aos-kasir-live.service';
import type { AosAgentUsageMetrics, AosTenantUsageMetrics } from './agentic-os.types';

type TaskRow = { agent_id: string | null; status: string; source: string };

export function usagePeriodBounds(
    days: number,
    now = new Date(),
): { startIso: string; endIso: string; days: number } {
    const clamped = Math.min(Math.max(Math.floor(days), 1), 90);
    const end = now;
    const start = new Date(end.getTime() - clamped * 24 * 60 * 60 * 1000);
    return { startIso: start.toISOString(), endIso: end.toISOString(), days: clamped };
}

@Injectable()
export class AosUsageMetricsService {
    private readonly logger = new Logger(AosUsageMetricsService.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly aos: AgenticOsService,
    ) {}

    private admin(): SupabaseClient {
        return this.supabase.getAdminClient();
    }

    async getMetrics(tenantId: string, days = 30): Promise<AosTenantUsageMetrics> {
        const { startIso, endIso, days: periodDays } = usagePeriodBounds(days);
        const unavailable = (reason: string): AosTenantUsageMetrics => ({
            available: false,
            tenantId,
            periodDays,
            periodStart: startIso,
            periodEnd: endIso,
            unavailableReason: reason,
            recruitedAgents: 0,
            waChatsToday: null,
            tasksCreated: null,
            tasksCompleted: null,
            tasksFailed: null,
            waInboundMessages: null,
            waOutboundReplies: null,
            crawlJobs: null,
            builderWorkflows: null,
            kgEmbeddedChunks: null,
            agents: [],
        });

        try {
            const agents = (await this.aos.listAgents(tenantId, false)).filter((a) => !a.archivedAt);

            const perAgent = new Map<
                string,
                { tasksCreated: number; tasksCompleted: number; tasksFailed: number; kasirWaTasks: number }
            >();
            for (const a of agents) {
                perAgent.set(a.id, { tasksCreated: 0, tasksCompleted: 0, tasksFailed: 0, kasirWaTasks: 0 });
            }

            const tasksRes = await this.admin()
                .from('aos_tasks')
                .select('agent_id, status, source')
                .eq('tenant_id', tenantId)
                .is('archived_at', null)
                .gte('created_at', startIso)
                .lte('created_at', endIso);

            if (tasksRes.error) {
                this.logger.warn(`usage tasks read failed tenant=${tenantId}: ${tasksRes.error.message}`);
                return unavailable('data tidak tersedia');
            }

            let tasksCreated = 0;
            let tasksCompleted = 0;
            let tasksFailed = 0;

            for (const row of (tasksRes.data ?? []) as TaskRow[]) {
                tasksCreated += 1;
                const aid = row.agent_id ? String(row.agent_id) : null;
                const bucket = aid && perAgent.has(aid) ? perAgent.get(aid)! : null;
                if (row.status === 'done') {
                    tasksCompleted += 1;
                    if (bucket) bucket.tasksCompleted += 1;
                }
                if (row.status === 'failed') {
                    tasksFailed += 1;
                    if (bucket) bucket.tasksFailed += 1;
                }
                if (bucket) {
                    bucket.tasksCreated += 1;
                    if (row.source === 'kasir_wa') bucket.kasirWaTasks += 1;
                }
            }

            const { startIso: todayStart, endIso: todayEnd } = jakartaTodayUtcBounds();

            const [chatsTodayRes, sessionsRes, crawlRes, builderRes, kgRes] = await Promise.all([
                this.admin()
                    .from('studio_whatsapp_sessions')
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .gte('last_message_at', todayStart)
                    .lt('last_message_at', todayEnd),
                this.admin().from('studio_whatsapp_sessions').select('conversation_id').eq('tenant_id', tenantId),
                this.admin()
                    .from('studio_web_crawl_jobs')
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .gte('created_at', startIso)
                    .lte('created_at', endIso),
                this.admin()
                    .from('studio_agent_workflows')
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .gte('updated_at', startIso)
                    .lte('updated_at', endIso),
                this.admin().rpc('studio_knowledge_graph_stats', { p_tenant_id: tenantId }),
            ]);

            let waInboundMessages = 0;
            let waOutboundReplies = 0;
            const conversationIds = (sessionsRes.data ?? [])
                .map((r) => (r as { conversation_id?: string }).conversation_id)
                .filter(Boolean) as string[];

            if (conversationIds.length > 0) {
                const [inRes, outRes] = await Promise.all([
                    this.admin()
                        .from('studio_messages')
                        .select('id', { count: 'exact', head: true })
                        .in('conversation_id', conversationIds)
                        .eq('role', 'user')
                        .gte('created_at', startIso)
                        .lte('created_at', endIso),
                    this.admin()
                        .from('studio_messages')
                        .select('id', { count: 'exact', head: true })
                        .in('conversation_id', conversationIds)
                        .eq('role', 'assistant')
                        .gte('created_at', startIso)
                        .lte('created_at', endIso),
                ]);
                if (!inRes.error) waInboundMessages = inRes.count ?? 0;
                if (!outRes.error) waOutboundReplies = outRes.count ?? 0;
            }

            const kgRow = Array.isArray(kgRes.data) ? kgRes.data[0] : kgRes.data;
            const kgEmbeddedChunks =
                kgRow && typeof kgRow === 'object' && 'embedded_chunks' in kgRow
                    ? Number((kgRow as { embedded_chunks: number }).embedded_chunks)
                    : null;

            const agentRows: AosAgentUsageMetrics[] = agents.map((a) => {
                const m = perAgent.get(a.id)!;
                return {
                    agentId: a.id,
                    slug: a.slug,
                    name: a.name,
                    role: a.role,
                    status: a.status,
                    tasksCreated: m.tasksCreated,
                    tasksCompleted: m.tasksCompleted,
                    tasksFailed: m.tasksFailed,
                    kasirWaTasks: m.kasirWaTasks,
                };
            });

            return {
                available: true,
                tenantId,
                periodDays,
                periodStart: startIso,
                periodEnd: endIso,
                unavailableReason: null,
                recruitedAgents: agents.length,
                waChatsToday: chatsTodayRes.error ? null : (chatsTodayRes.count ?? 0),
                tasksCreated,
                tasksCompleted,
                tasksFailed,
                waInboundMessages,
                waOutboundReplies,
                crawlJobs: crawlRes.error ? null : (crawlRes.count ?? 0),
                builderWorkflows: builderRes.error ? null : (builderRes.count ?? 0),
                kgEmbeddedChunks: kgRes.error ? null : kgEmbeddedChunks,
                agents: agentRows,
            };
        } catch (e) {
            this.logger.warn(`usage metrics failed tenant=${tenantId}: ${e instanceof Error ? e.message : e}`);
            return unavailable('data tidak tersedia');
        }
    }
}
