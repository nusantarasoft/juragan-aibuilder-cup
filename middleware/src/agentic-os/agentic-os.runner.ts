import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AgenticOsService, must, Row, stepsOf } from './agentic-os.service';

const TICK_MS = 5000;
const TICK_SECONDS = TICK_MS / 1000;
const AUTOPILOT_COOLDOWN_MS = 45_000;
const ACTIVE_STATUSES = ['queued', 'running', 'awaiting_approval', 'review'];

const MODULE_LABELS: Record<string, string> = {
    'accounting': 'Accounting',
    'ai-studio': 'AI Studio',
    'bms': 'BMS',
    'command-center': 'Command Center',
    'crm': 'CRM',
    'dcim': 'DCIM',
    'devops': 'DevOps',
    'hr': 'HR',
    'infrastructure': 'Infrastructure',
    'inventory': 'Inventory',
    'itsm': 'ITSM',
    'knowledge': 'Knowledge Base',
    'news': 'News Intel',
    'ops': 'Ops Runbooks',
    'pm': 'Projects',
    'reports': 'Reports',
    'scada': 'SCADA',
    'security': 'Security',
};

function moduleLabel(moduleId: string): string {
    if (MODULE_LABELS[moduleId]) return MODULE_LABELS[moduleId];
    return (moduleId || 'the module')
        .split(/[-_]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const stepIndex = (progress: number, steps: number) => Math.min(steps - 1, Math.floor(progress * steps + 1e-9));
const runTrigger = (source: string) => (source === 'autopilot' ? 'autopilot' : source === 'routine' ? 'schedule' : 'dispatch');

/**
 * AgenticOsRunner — persisted task-queue worker.
 * Every 5 s each active cloud agent advances its running task in Postgres, claims
 * the next queued task, or (with autopilot on) enqueues work from a playbook.
 * Finished work lands in 'review'; a human marks it done. Step execution is
 * deterministic until real LLM runners replace it (Pulse / per-agent providers).
 */
@Injectable()
export class AgenticOsRunner {
    private readonly logger = new Logger(AgenticOsRunner.name);
    private running = false;
    private readonly lastAutopilotAt = new Map<string, number>();

    constructor(private readonly svc: AgenticOsService) {}

    private emit(tenantId: string, reason: string, taskId: string, stats = false): void {
        void this.svc.notifyTaskQueue(tenantId, reason, taskId, stats ? { includeStats: true } : undefined);
    }

    @Interval(TICK_MS)
    async tick(): Promise<void> {
        if (this.running || process.env.AOS_RUNNER_DISABLED === 'true') return;
        this.running = true;
        try {
            const tenants = await this.loadTenantSettings();
            for (const settings of tenants) {
                if (settings.kill_switch) continue;
                try {
                    await this.processTenant(settings);
                } catch (err) {
                    this.logger.error(`Tenant ${settings.tenant_id}: ${(err as Error).message}`);
                }
            }
        } catch (err) {
            this.logger.error(`Runner tick failed: ${(err as Error).message}`);
        } finally {
            this.running = false;
        }
    }

    private async loadTenantSettings(): Promise<Row[]> {
        const rows = must(await this.svc.db.from('aos_settings').select('*')) as Row[];
        if (rows && rows.length) return rows;
        return [await this.svc.getSettingsRow()];
    }

    private async processTenant(settings: Row): Promise<void> {
        const db = this.svc.db;
        const tenantId: string = settings.tenant_id;

        const agents = must(await db.from('aos_agents').select('*').eq('tenant_id', tenantId).is('archived_at', null)) as Row[];
        if (!agents || !agents.length) return;
        const agentsById = new Map<string, Row>(agents.map((a) => [a.id, a]));

        const tasks = must(
            await db
                .from('aos_tasks')
                .select('*')
                .eq('tenant_id', tenantId)
                .is('archived_at', null)
                .in('status', ACTIVE_STATUSES)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true }),
        ) as Row[];

        let playbooks: Row[] | null = null;
        const workers = agents.filter((a) => a.status === 'active' && a.runner === 'cloud');

        for (const agent of workers) {
            try {
                const mine = (tasks ?? []).filter((t) => t.agent_id === agent.id);
                const runningTask = mine.find((t) => t.status === 'running' && t.source !== 'kasir_wa');
                if (runningTask) {
                    await this.advance(agent, runningTask, settings);
                    continue;
                }
                const queuedTask = mine.find((t) => t.status === 'queued' && t.source !== 'kasir_wa');
                if (queuedTask) {
                    await this.claim(agent, queuedTask);
                    continue;
                }
                if (settings.autopilot) {
                    const inReview = mine.filter((t) => t.status === 'review').length;
                    const awaiting = mine.some((t) => t.status === 'awaiting_approval');
                    if (inReview < Number(settings.autopilot_review_cap ?? 0) && !awaiting) {
                        if (!playbooks) playbooks = await this.loadPlaybooks(tenantId);
                        await this.autopilot(agent, playbooks, mine);
                    }
                }
            } catch (err) {
                this.logger.error(`Agent ${agent.slug}: ${(err as Error).message}`);
            }
        }

        // Approved approvals whose task is still waiting → finalise into review.
        const awaitingTasks = (tasks ?? []).filter((t) => t.status === 'awaiting_approval');
        if (awaitingTasks.length) {
            try {
                await this.finalizeApproved(awaitingTasks, agentsById);
            } catch (err) {
                this.logger.error(`Approval sweep: ${(err as Error).message}`);
            }
        }
    }

    // ── Steps ────────────────────────────────────────────────────────────────

    private async advance(agent: Row, task: Row, settings: Row): Promise<void> {
        const steps = stepsOf(task.steps);
        const stepCount = Math.max(1, steps.length);
        const stepSeconds = Math.max(1, Number(settings.step_seconds ?? 15));
        const before = Number(task.progress ?? 0);
        const after = Math.min(1, round4(before + TICK_SECONDS / (stepCount * stepSeconds)));

        if (after >= 1) {
            await this.finish(agent, task);
            return;
        }

        const updated = must(
            await this.svc.db
                .from('aos_tasks')
                .update({ progress: after })
                .eq('id', task.id)
                .eq('status', 'running')
                .select('id')
                .maybeSingle(),
        );
        if (!updated) return; // a human changed the task underneath us

        const newIndex = stepIndex(after, stepCount);
        if (newIndex !== stepIndex(before, stepCount) && steps[newIndex]) {
            await this.agentAudit(agent, task, {
                action: 'step',
                summary: `${agent.name} · ${steps[newIndex]}`,
            });
            this.emit(task.tenant_id, 'running', task.id);
        }
    }

    private async finish(agent: Row, task: Row): Promise<void> {
        if (task.requires_approval) {
            const approvals = must(
                await this.svc.db.from('aos_approvals').select('id, status, decided_at').eq('task_id', task.id),
            ) as Row[];
            const startedAt = task.started_at ? Date.parse(task.started_at) : 0;
            const approved = (approvals ?? []).some(
                (a) => a.status === 'approved' && (!a.decided_at || Date.parse(a.decided_at) >= startedAt),
            );
            if (!approved) {
                await this.requestApproval(agent, task, approvals ?? []);
                return;
            }
        }
        await this.moveToReview(agent, task, ['running', 'awaiting_approval']);
    }

    private async requestApproval(agent: Row, task: Row, approvals: Row[]): Promise<void> {
        const db = this.svc.db;
        const moved = must(
            await db
                .from('aos_tasks')
                .update({ status: 'awaiting_approval', progress: 1 })
                .eq('id', task.id)
                .eq('status', 'running')
                .select('id')
                .maybeSingle(),
        );
        if (!moved) return;
        this.emit(task.tenant_id, 'awaiting_approval', task.id, true);

        const summary = `${agent.name} wants to finalise "${task.title}"`;
        if (!approvals.some((a) => a.status === 'pending')) {
            must(
                await db.from('aos_approvals').insert({
                    tenant_id: task.tenant_id,
                    task_id: task.id,
                    agent_id: agent.id,
                    action: 'complete',
                    summary,
                    payload: {
                        title: task.title,
                        moduleId: task.module_id,
                        route: task.route,
                        steps: stepsOf(task.steps),
                    },
                }),
            );
        }
        await this.agentAudit(agent, task, { action: 'request_approval', summary, level: 'warning' });
    }

    private async moveToReview(agent: Row, task: Row, fromStatuses: string[]): Promise<void> {
        const db = this.svc.db;
        const now = new Date();
        const steps = stepsOf(task.steps);
        const result = `Completed ${steps.length} steps in ${moduleLabel(task.module_id)}. Waiting for a human to confirm.`;

        const moved = must(
            await db
                .from('aos_tasks')
                .update({ status: 'review', progress: 1, finished_at: now.toISOString(), result, error: null })
                .eq('id', task.id)
                .in('status', fromStatuses)
                .select('id')
                .maybeSingle(),
        );
        if (!moved) return;
        this.emit(task.tenant_id, 'review', task.id, true);

        const startedAt = task.started_at ? new Date(task.started_at) : now;
        must(
            await db.from('aos_runs').insert({
                tenant_id: task.tenant_id,
                task_id: task.id,
                agent_id: agent.id,
                trigger: runTrigger(task.source),
                provider: agent.provider ?? null,
                model: agent.model ?? null,
                turns: steps.length,
                tokens_in: 0,
                tokens_out: 0,
                cost_usd: 0,
                duration_ms: Math.max(0, now.getTime() - startedAt.getTime()),
                status: 'success',
                output: result,
                started_at: startedAt.toISOString(),
                finished_at: now.toISOString(),
            }),
        );

        // Re-read stats so concurrent edits are not clobbered.
        const fresh = must(await db.from('aos_agents').select('stats').eq('id', agent.id).maybeSingle()) as Row | null;
        const stats: Row = { ...((fresh?.stats ?? agent.stats ?? {}) as Row) };
        stats.tasksCompleted = Number(stats.tasksCompleted ?? 0) + 1;
        must(await db.from('aos_agents').update({ stats }).eq('id', agent.id));

        await this.agentAudit(agent, task, {
            action: 'finish',
            summary: `${agent.name} finished "${task.title}" — ready for review`,
            level: 'success',
        });
    }

    private async claim(agent: Row, task: Row): Promise<void> {
        const claimed = must(
            await this.svc.db
                .from('aos_tasks')
                .update({ status: 'running', started_at: new Date().toISOString(), progress: 0, finished_at: null })
                .eq('id', task.id)
                .eq('status', 'queued')
                .select('id')
                .maybeSingle(),
        );
        if (!claimed) return;
        this.emit(task.tenant_id, 'running', task.id, true);
        await this.agentAudit(agent, task, { action: 'pick_up', summary: `${agent.name} picked up "${task.title}"` });
    }

    // ── Autopilot ────────────────────────────────────────────────────────────

    private async loadPlaybooks(tenantId: string): Promise<Row[]> {
        const rows = must(
            await this.svc.db
                .from('aos_playbooks')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('enabled', true)
                .is('archived_at', null),
        ) as Row[];
        return rows ?? [];
    }

    private async autopilot(agent: Row, playbooks: Row[], mine: Row[]): Promise<void> {
        const last = this.lastAutopilotAt.get(agent.id) ?? 0;
        if (Date.now() - last < AUTOPILOT_COOLDOWN_MS) return;

        const modules: string[] = Array.isArray(agent.modules) ? agent.modules : [];
        const candidates = playbooks.filter(
            (p) => modules.includes(p.module_id) && (!p.agent_id || p.agent_id === agent.id),
        );
        if (!candidates.length) return;

        // Prefer the agent's own playbooks, then avoid repeating work already in flight.
        const own = candidates.filter((p) => p.agent_id === agent.id);
        const pool = own.length && Math.random() < 0.7 ? own : candidates;
        const inFlight = new Set(mine.map((t) => t.playbook_id).filter(Boolean));
        const fresh = pool.filter((p) => !inFlight.has(p.id));
        const choices = fresh.length ? fresh : pool;
        const pick = choices[Math.floor(Math.random() * choices.length)];

        this.lastAutopilotAt.set(agent.id, Date.now());
        const sortOrder = await this.svc.nextQueueSortOrder(agent.tenant_id, agent.id);
        const created = must(
            await this.svc.db
                .from('aos_tasks')
                .insert({
                    tenant_id: agent.tenant_id,
                    agent_id: agent.id,
                    playbook_id: pick.id,
                    title: pick.title,
                    description: pick.description ?? '',
                    module_id: pick.module_id,
                    route: pick.route,
                    steps: stepsOf(pick.steps),
                    priority: pick.priority ?? 'normal',
                    requires_approval: !!pick.requires_approval,
                    status: 'queued',
                    source: 'autopilot',
                    sort_order: sortOrder,
                })
                .select('*')
                .single(),
        ) as Row;

        await this.agentAudit(agent, created, {
            action: 'autopilot',
            summary: `${agent.name} queued "${created.title}" on autopilot`,
        });
        this.emit(agent.tenant_id, 'queued', created.id, true);
    }

    // ── Approvals sweep ──────────────────────────────────────────────────────

    private async finalizeApproved(awaitingTasks: Row[], agentsById: Map<string, Row>): Promise<void> {
        const approvals = must(
            await this.svc.db
                .from('aos_approvals')
                .select('task_id')
                .eq('status', 'approved')
                .in('task_id', awaitingTasks.map((t) => t.id)),
        ) as Row[];
        const approvedTaskIds = new Set((approvals ?? []).map((a) => a.task_id));
        for (const task of awaitingTasks) {
            if (!approvedTaskIds.has(task.id)) continue;
            const agent = agentsById.get(task.agent_id) ?? { id: task.agent_id, slug: null, name: 'Agent', stats: {} };
            try {
                await this.moveToReview(agent, task, ['awaiting_approval']);
            } catch (err) {
                this.logger.error(`Finalise ${task.id}: ${(err as Error).message}`);
            }
        }
    }

    // ── Audit ────────────────────────────────────────────────────────────────

    private agentAudit(
        agent: Row,
        task: Row,
        entry: { action: string; summary: string; level?: 'info' | 'success' | 'warning' | 'error' },
    ): Promise<void> {
        return this.svc.audit(task.tenant_id, {
            actorType: agent.slug ? 'agent' : 'system',
            actorId: agent.slug ?? null,
            action: entry.action,
            entity: 'task',
            entityId: task.id,
            summary: entry.summary,
            level: entry.level ?? 'info',
            moduleId: task.module_id ?? null,
            route: task.route ?? null,
        });
    }
}
