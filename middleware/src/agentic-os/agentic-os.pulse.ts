import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AiRouterService } from '../ai/ai-router.service';
import { AgenticOsService, AosActor, mapRun, must, Row, slugify, stepsOf, tenantOf } from './agentic-os.service';
import { AosCapUsage, AosNextRun, AosPulseStatus, AosRun } from './agentic-os.types';
import { cronNextIso } from './aos-cron';
import { estimateCostUsd } from './aos-pricing';
import { AgenticOsWorkflows } from './agentic-os.workflows';

const PULSE_TICK_MS = 20_000;
const QUEUE_BATCH = 5;
const PROMPT_MAX = 4000;
const MEMORY_MAX_CHARS = 3000;
const MEMORY_MAX_ITEMS = 20;
const ACTIVITY_MAX_LINES = 30;
const STALE_DAYS = 30;
const TEST_TIMEOUT_SECONDS = 120;
const MAX_TOKENS_BY_EFFORT: Record<string, number> = { low: 512, medium: 1024, high: 2048 };
const TASK_STATUSES = ['queued', 'running', 'awaiting_approval', 'review', 'done', 'failed', 'cancelled'];
const JAKARTA_OFFSET_MS = 7 * 3600 * 1000;

type RunTrigger = 'schedule' | 'manual' | 'queue';
type RunStatus = 'success' | 'failed' | 'blocked' | 'timeout';

interface ActiveAi {
    provider: string | null;
    model: string | null;
    ready: boolean;
}

interface ExecOptions {
    requestedBy?: string | null;
    /** Overrides the run kind (aosTestAgent stores 'test'). */
    kind?: string;
    timeoutSeconds?: number;
}

interface KindResult {
    status: Exclude<RunStatus, 'blocked'>;
    output: string | null;
    error: string | null;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    turns: number;
    provider?: string | null;
    model?: string | null;
    prompt?: string | null;
    taskId?: string | null;
    /** kind 'workflow': the workflow run that was started. */
    workflowRunId?: string | null;
}

class TimeoutError extends Error {}

const cap = (used: number, limit: number): AosCapUsage => ({
    used,
    limit,
    pct: limit > 0 ? Math.max(0, Math.min(1, used / limit)) : 0,
});

/** Jakarta wall-clock "YYYY-MM-DD HH:mm". */
function jakartaStamp(d = new Date()): string {
    return new Date(d.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

function guardrailSummary(guardrails: unknown): string {
    if (!guardrails || typeof guardrails !== 'object' || Array.isArray(guardrails)) return '';
    const g = guardrails as Row;
    const rules: string[] = [];
    if (g.denySend) rules.push('never send messages or emails');
    if (g.denyShare) rules.push('never share data outside the company');
    if (g.denyDelete) rules.push('never delete anything');
    if (Array.isArray(g.requireApproval) && g.requireApproval.length) {
        rules.push(`ask for human approval before: ${g.requireApproval.join(', ')}`);
    }
    for (const [k, v] of Object.entries(g)) {
        if (['denySend', 'denyShare', 'denyDelete', 'requireApproval'].includes(k)) continue;
        if (v !== null && v !== undefined && v !== false && v !== '') rules.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    }
    return rules.length ? `Guardrails: ${rules.join('; ')}.` : '';
}

/**
 * AgenticOsPulse — Phase 2 scheduler + executor for routines.
 * Every 20 s per tenant: backfill next_run_at, claim due routines (optimistic
 * update on next_run_at) and drain up to 5 queued runs. Every execution passes a
 * deterministic gate first (kill switch, caps, budgets, permissions); blocked runs
 * are recorded with a reason and never reach a model. The Phase 1 task simulation
 * runner (agentic-os.runner.ts) is untouched and keeps working queued tasks.
 */
@Injectable()
export class AgenticOsPulse {
    private readonly logger = new Logger(AgenticOsPulse.name);
    private running = false;
    private lastTickAt: string | null = null;

    constructor(
        private readonly svc: AgenticOsService,
        private readonly ai: AiRouterService,
        private readonly workflows: AgenticOsWorkflows,
    ) {}

    // ════════════════════════════════════════════════════════════════════════
    // Scheduler
    // ════════════════════════════════════════════════════════════════════════

    @Interval(PULSE_TICK_MS)
    async tick(): Promise<void> {
        if (this.running || process.env.AOS_PULSE_DISABLED === 'true') return;
        this.running = true;
        this.lastTickAt = new Date().toISOString();
        try {
            const tenants = must(await this.svc.db.from('aos_settings').select('*')) as Row[];
            for (const settings of tenants ?? []) {
                if (settings.pulse_enabled === false) continue;
                try {
                    await this.processTenant(settings.tenant_id);
                } catch (err) {
                    this.logger.error(`Pulse tenant ${settings.tenant_id}: ${(err as Error).message}`);
                }
            }
        } catch (err) {
            this.logger.error(`Pulse tick failed: ${(err as Error).message}`);
        } finally {
            this.running = false;
        }
    }

    getLastTickAt(): string | null {
        return this.lastTickAt;
    }

    private async processTenant(tenantId: string): Promise<void> {
        const db = this.svc.db;

        // 1. Backfill next_run_at for enabled routines that have none.
        const missing = must(
            await db
                .from('aos_routines')
                .select('id, cron, timezone')
                .eq('tenant_id', tenantId)
                .eq('enabled', true)
                .is('archived_at', null)
                .is('next_run_at', null),
        ) as Row[];
        for (const r of missing ?? []) {
            const next = cronNextIso(r.cron, r.timezone);
            if (next) await db.from('aos_routines').update({ next_run_at: next }).eq('id', r.id).is('next_run_at', null);
        }

        // 2. Due routines — claim each occurrence once (optimistic update on next_run_at).
        const due = must(
            await db
                .from('aos_routines')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('enabled', true)
                .is('archived_at', null)
                .lte('next_run_at', new Date().toISOString())
                .order('next_run_at', { ascending: true }),
        ) as Row[];
        for (const routine of due ?? []) {
            try {
                const next = cronNextIso(routine.cron, routine.timezone);
                const claimed = must(
                    await db
                        .from('aos_routines')
                        .update({ next_run_at: next })
                        .eq('id', routine.id)
                        .eq('next_run_at', routine.next_run_at)
                        .select('id')
                        .maybeSingle(),
                );
                if (!claimed) continue;
                if (!next) {
                    await this.svc.audit(tenantId, {
                        actorType: 'system',
                        action: 'schedule_error',
                        entity: 'routine',
                        entityId: routine.id,
                        summary: `Pulse could not schedule "${routine.name}": invalid cron "${routine.cron}"`,
                        level: 'error',
                    });
                }
                await this.execute(routine, 'schedule');
            } catch (err) {
                this.logger.error(`Routine ${routine.id}: ${(err as Error).message}`);
            }
        }

        // 3. Manual queue — oldest first, a few per tick.
        const queued = must(
            await db
                .from('aos_run_queue')
                .select('*')
                .eq('tenant_id', tenantId)
                .is('picked_at', null)
                .order('requested_at', { ascending: true })
                .limit(QUEUE_BATCH),
        ) as Row[];
        for (const item of queued ?? []) {
            try {
                const claimed = must(
                    await db
                        .from('aos_run_queue')
                        .update({ picked_at: new Date().toISOString() })
                        .eq('id', item.id)
                        .is('picked_at', null)
                        .select('id')
                        .maybeSingle(),
                );
                if (!claimed) continue;
                const routine = must(await db.from('aos_routines').select('*').eq('id', item.routine_id).maybeSingle()) as Row | null;
                if (!routine) continue;
                const run = await this.execute(routine, 'queue', { requestedBy: item.requested_by ?? null });
                if (run) await db.from('aos_run_queue').update({ run_id: run.id }).eq('id', item.id);
            } catch (err) {
                this.logger.error(`Queue item ${item.id}: ${(err as Error).message}`);
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Manual entry points (resolver)
    // ════════════════════════════════════════════════════════════════════════

    async runRoutineNow(routineId: string, actor: AosActor): Promise<AosRun> {
        const routine = await this.svc.requireRoutineRow(routineId);
        await this.svc.audit(routine.tenant_id, {
            actorType: 'user',
            actorId: actor.id ?? null,
            action: 'run_now',
            entity: 'routine',
            entityId: routine.id,
            summary: `Ran "${routine.name}" now`,
        });
        const run = await this.execute(routine, 'manual', { requestedBy: actor.id ?? null });
        if (!run) throw new Error('Routine was not executed');
        return mapRun(run);
    }

    async testAgent(agentRef: string, prompt: string, actor: AosActor): Promise<AosRun> {
        const agent = await this.svc.getAgentRow(agentRef);
        if (!agent) throw new Error(`Agent "${agentRef}" not found`);
        await this.svc.audit(agent.tenant_id, {
            actorType: 'user',
            actorId: actor.id ?? null,
            action: 'test',
            entity: 'agent',
            entityId: agent.id,
            summary: `Tested agent ${agent.name} in the playground`,
            diff: { prompt: String(prompt ?? '').slice(0, 500) },
        });
        // A transient, routine-less prompt run (routine_id stays NULL).
        const pseudo: Row = {
            id: null,
            tenant_id: agent.tenant_id,
            name: `Test · ${agent.name}`,
            agent_id: agent.id,
            kind: 'prompt',
            prompt: String(prompt ?? ''),
            output_target: 'activity',
            effort: agent.effort ?? 'medium',
            allowed_tools: [],
            enabled: true,
            archived_at: null,
            timeout_seconds: TEST_TIMEOUT_SECONDS,
        };
        const run = await this.execute(pseudo, 'manual', { requestedBy: actor.id ?? null, kind: 'test' });
        if (!run) throw new Error('Test run was not executed');
        return mapRun(run);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Status
    // ════════════════════════════════════════════════════════════════════════

    async status(tenantId?: string): Promise<AosPulseStatus> {
        const t = tenantOf(tenantId);
        const settings = await this.svc.getSettingsRow(t);
        const windowMinutes = Number(settings.rolling_window_minutes ?? 60);
        const [usage, ai, queueDepth, nextRows] = await Promise.all([
            this.svc.usageSummary(t, windowMinutes),
            this.activeAi(settings),
            this.svc.db
                .from('aos_run_queue')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', t)
                .is('picked_at', null),
            this.svc.db
                .from('aos_routines')
                .select('id, name, agent_id, next_run_at, cron, kind')
                .eq('tenant_id', t)
                .eq('enabled', true)
                .is('archived_at', null)
                .not('next_run_at', 'is', null)
                .order('next_run_at', { ascending: true })
                .limit(8),
        ]);
        if (queueDepth.error) throw new Error(queueDepth.error.message);
        const nextRuns: AosNextRun[] = ((must(nextRows) as Row[]) ?? []).map((r) => ({
            routineId: r.id,
            name: String(r.name ?? ''),
            agentId: r.agent_id ?? null,
            nextRunAt: String(r.next_run_at),
            cron: String(r.cron ?? ''),
            kind: String(r.kind ?? ''),
        }));

        return {
            now: new Date().toISOString(),
            lastTickAt: this.lastTickAt,
            pulseEnabled: settings.pulse_enabled !== false,
            killSwitch: !!settings.kill_switch,
            llmMode: settings.llm_mode || 'live',
            provider: ai.provider,
            model: ai.model,
            providerReady: ai.ready,
            dailyRuns: cap(usage.runs_today ?? 0, Number(settings.daily_run_ceiling ?? 0)),
            rollingRuns: cap(usage.runs_window ?? 0, Number(settings.rolling_window_ceiling ?? 0)),
            monthlyTokens: cap(usage.tokens_month ?? 0, Number(settings.monthly_token_budget ?? 0)),
            dailyCost: cap(Math.round((usage.cost_today ?? 0) * 10000) / 10000, Number(settings.run_cost_ceiling_usd ?? 0)),
            runsToday: usage.all_today ?? 0,
            successToday: usage.success_today ?? 0,
            failedToday: usage.failed_today ?? 0,
            blockedToday: usage.blocked_today ?? 0,
            queueDepth: queueDepth.count ?? 0,
            nextRuns,
        };
    }

    /** Active AI Studio provider/model (AI Studio default tenant), best effort. */
    private async activeAi(settings?: Row): Promise<ActiveAi> {
        try {
            const cfg = await this.ai.getActiveConfig();
            const readiness = (cfg.providers ?? []).find((p) => p.provider === cfg.llmProvider);
            return { provider: cfg.llmProvider ?? null, model: cfg.llmModel ?? null, ready: !!readiness?.configured };
        } catch (err) {
            this.logger.warn(`AI status unavailable: ${(err as Error).message}`);
            return { provider: settings?.default_provider ?? null, model: settings?.default_model ?? null, ready: false };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Execution
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Gate → run row → execute by kind → deliver → finalise. Returns the final run
     * row (blocked/failed included), or null when a scheduled routine was disabled
     * in the meantime (skipped silently).
     */
    async execute(routine: Row, trigger: RunTrigger, opts: ExecOptions = {}): Promise<Row | null> {
        const db = this.svc.db;
        const tenantId: string = routine.tenant_id;
        if (trigger === 'schedule' && !routine.enabled) return null;

        const settings = await this.svc.getSettingsRow(tenantId);
        const agent = routine.agent_id
            ? ((must(await db.from('aos_agents').select('*').eq('id', routine.agent_id).maybeSingle()) as Row | null) ?? null)
            : null;
        const ai = await this.activeAi(settings);
        const kind = opts.kind ?? routine.kind;
        const actorType = agent ? 'agent' : 'system';
        const actorId = agent?.slug ?? null;
        const moduleId: string | null = agent && Array.isArray(agent.modules) && agent.modules.length ? agent.modules[0] : null;
        const who = agent?.name ?? 'Pulse';
        const name = String(routine.name ?? 'routine');

        const baseRun: Row = {
            tenant_id: tenantId,
            routine_id: routine.id ?? null,
            agent_id: agent?.id ?? routine.agent_id ?? null,
            trigger,
            provider: ai.provider,
            model: ai.model,
            // Playground tests are routine-less: the frontend keys them on kind === 'test'.
            routine_name: kind === 'test' ? null : name,
            kind,
            output_target: routine.output_target ?? 'activity',
            prompt: String(routine.prompt ?? '').slice(0, PROMPT_MAX),
            requested_by: opts.requestedBy ?? null,
        };

        // ── 1. Deterministic gate ────────────────────────────────────────────
        const playbook = routine.kind === 'playbook' && routine.playbook_id
            ? ((must(await db.from('aos_playbooks').select('*').eq('id', routine.playbook_id).maybeSingle()) as Row | null) ?? null)
            : null;
        const reason = await this.gate(routine, agent, settings, playbook, routine.agent_id ?? null);
        if (reason) {
            const now = new Date().toISOString();
            const blocked = must(
                await db
                    .from('aos_runs')
                    .insert({ ...baseRun, status: 'blocked', blocked_reason: reason, duration_ms: 0, started_at: now, finished_at: now })
                    .select('*')
                    .single(),
            ) as Row;
            await this.svc.audit(tenantId, {
                actorType,
                actorId,
                action: 'run_blocked',
                entity: 'routine',
                entityId: routine.id ?? null,
                summary: `Pulse blocked "${name}": ${reason}`,
                level: 'warning',
                moduleId,
                diff: { runId: blocked.id, trigger, kind },
            });
            await this.touchRoutine(routine, 'blocked');
            return blocked;
        }

        // ── 2. Run row + start audit ─────────────────────────────────────────
        const startedAt = Date.now();
        const run = must(await db.from('aos_runs').insert({ ...baseRun, status: 'running' }).select('*').single()) as Row;
        await this.svc.audit(tenantId, {
            actorType,
            actorId,
            action: 'run_started',
            entity: 'routine',
            entityId: routine.id ?? null,
            summary: `${who} started "${name}"`,
            level: 'info',
            moduleId,
            diff: { runId: run.id, trigger, kind },
        });

        // ── 3. Execute by kind ───────────────────────────────────────────────
        let result: KindResult;
        try {
            if (routine.kind === 'playbook') {
                result = await this.runPlaybook(routine, agent, playbook as Row, run, opts);
            } else if (routine.kind === 'check') {
                result = await this.runMemoryCheck(tenantId);
            } else if (routine.kind === 'workflow') {
                result = await this.runWorkflow(routine);
            } else {
                result = await this.runPrompt(routine, agent, settings, ai, opts);
            }
        } catch (err) {
            result = {
                status: 'failed',
                output: null,
                error: (err as Error).message || 'Unknown error',
                tokensIn: 0,
                tokensOut: 0,
                costUsd: 0,
                turns: 0,
            };
        }

        // ── 4. Deliver (success only) ────────────────────────────────────────
        let approvalId: string | null = null;
        if (result.status === 'success') {
            try {
                approvalId = await this.deliver(routine, agent, settings, run, result, opts);
            } catch (err) {
                result = { ...result, status: 'failed', error: `Delivery failed: ${(err as Error).message}` };
            }
        }

        // ── 5. Finalise ──────────────────────────────────────────────────────
        const finished = must(
            await db
                .from('aos_runs')
                .update({
                    status: result.status,
                    output: result.output,
                    error: result.error,
                    tokens_in: result.tokensIn,
                    tokens_out: result.tokensOut,
                    cost_usd: result.costUsd,
                    turns: result.turns,
                    duration_ms: Date.now() - startedAt,
                    finished_at: new Date().toISOString(),
                    provider: result.provider !== undefined ? result.provider : run.provider,
                    model: result.model !== undefined ? result.model : run.model,
                    prompt: result.prompt != null ? result.prompt.slice(0, PROMPT_MAX) : run.prompt,
                    task_id: result.taskId ?? null,
                    approval_id: approvalId,
                })
                .eq('id', run.id)
                .eq('status', 'running')
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        await this.touchRoutine(routine, result.status);
        if (result.status !== 'success') {
            await this.svc.audit(tenantId, {
                actorType,
                actorId,
                action: 'run_failed',
                entity: 'routine',
                entityId: routine.id ?? null,
                summary: `"${name}" failed: ${result.error ?? result.status}`,
                level: 'error',
                moduleId,
                diff: { runId: run.id, status: result.status, kind },
            });
        }
        return finished ?? run;
    }

    private async touchRoutine(routine: Row, status: string): Promise<void> {
        if (!routine.id) return;
        const { error } = await this.svc.db
            .from('aos_routines')
            .update({ last_run_at: new Date().toISOString(), last_status: status })
            .eq('id', routine.id);
        if (error) this.logger.warn(`Routine ${routine.id} last_status: ${error.message}`);
    }

    // ── Gate ─────────────────────────────────────────────────────────────────

    private async gate(routine: Row, agent: Row | null, settings: Row, playbook: Row | null, agentRef: string | null): Promise<string | null> {
        if (settings.kill_switch) return 'Kill switch is on';
        if (routine.archived_at) return 'Routine archived';

        if (agentRef) {
            if (!agent) return `Agent ${agentRef} is missing`;
            if (agent.archived_at) return `Agent ${agent.name} is archived`;
            if (agent.status === 'offline' || agent.status === 'paused') return `Agent ${agent.name} is ${agent.status}`;
        }

        const windowMinutes = Number(settings.rolling_window_minutes ?? 60);
        const usage = await this.svc.usageSummary(routine.tenant_id, windowMinutes);
        const dailyCeiling = Number(settings.daily_run_ceiling ?? 0);
        if (dailyCeiling > 0 && usage.runs_today >= dailyCeiling) return `Daily run ceiling (${dailyCeiling}) reached`;
        const windowCeiling = Number(settings.rolling_window_ceiling ?? 0);
        if (windowCeiling > 0 && usage.runs_window >= windowCeiling) {
            return `Rolling window ceiling (${windowCeiling} per ${windowMinutes} min) reached`;
        }
        const monthlyBudget = Number(settings.monthly_token_budget ?? 0);
        if (monthlyBudget > 0 && usage.tokens_month >= monthlyBudget) return 'Monthly token budget exhausted';
        const costCeiling = Number(settings.run_cost_ceiling_usd ?? 0);
        if (costCeiling > 0 && usage.cost_today >= costCeiling) return `Daily cost ceiling ($${costCeiling.toFixed(2)}) reached`;

        if (agent) {
            const runBudget = Number(agent.daily_run_budget ?? 0);
            const tokenBudget = Number(agent.daily_token_budget ?? 0);
            if (runBudget > 0 || tokenBudget > 0) {
                const mine = await this.svc.usageSummary(routine.tenant_id, windowMinutes, agent.id);
                if (runBudget > 0 && mine.runs_today >= runBudget) return 'Agent daily run budget reached';
                if (tokenBudget > 0 && mine.tokens_today >= tokenBudget) return 'Agent daily token budget reached';
            }
            const agentTools: string[] = Array.isArray(agent.tools) ? agent.tools : [];
            const allowed: string[] = Array.isArray(routine.allowed_tools) ? routine.allowed_tools : [];
            const denied = allowed.find((tool) => !agentTools.includes(tool));
            if (denied) return `Tool not permitted for agent: ${denied}`;
        }

        if (routine.kind === 'prompt' && !String(routine.prompt ?? '').trim()) return 'Routine is misconfigured: prompt is empty';
        if (routine.kind === 'playbook') {
            if (!routine.playbook_id) return 'Routine is misconfigured: no playbook selected';
            if (!playbook) return 'Routine is misconfigured: playbook not found';
            if (playbook.archived_at) return `Routine is misconfigured: playbook "${playbook.title}" is archived`;
        }
        if (routine.kind === 'workflow' && !routine.workflow_id) return 'Routine is misconfigured: no workflow selected';
        return null;
    }

    // ── Kind: prompt ─────────────────────────────────────────────────────────

    private async runPrompt(routine: Row, agent: Row | null, settings: Row, ai: ActiveAi, opts: ExecOptions): Promise<KindResult> {
        const systemPrompt = await this.buildSystemPrompt(routine, agent);
        const userPrompt = await this.buildUserPrompt(routine, agent);
        const resolved = userPrompt.slice(0, PROMPT_MAX);

        if (settings.llm_mode === 'dry_run') {
            const target = `${ai.provider ?? 'unknown'}/${ai.model ?? 'unknown'}`;
            return {
                status: 'success',
                output: `[dry run] Would ask ${target}: ${userPrompt.slice(0, 300)}`,
                error: null,
                tokensIn: 0,
                tokensOut: 0,
                costUsd: 0,
                turns: 1,
                prompt: resolved,
            };
        }

        const effort = String(routine.effort || agent?.effort || 'medium');
        const temperature = agent && agent.temperature !== null && agent.temperature !== undefined ? Number(agent.temperature) : 0.4;
        const timeoutSeconds = Math.max(5, Number(opts.timeoutSeconds ?? routine.timeout_seconds ?? 300));
        let timer: NodeJS.Timeout | undefined;
        try {
            const res = await Promise.race([
                this.ai.playgroundGenerate(
                    { systemPrompt, userPrompt, temperature, maxOutputTokens: MAX_TOKENS_BY_EFFORT[effort] ?? 1024 },
                    undefined, // AI Studio settings live on the AI Studio default tenant
                ),
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new TimeoutError(`Timed out after ${timeoutSeconds}s`)), timeoutSeconds * 1000);
                }),
            ]);
            const provider = res.provider ?? ai.provider;
            const model = res.model ?? ai.model;
            const output = String(res.output ?? '').trim();
            if (provider === 'fallback') {
                return {
                    status: 'failed',
                    output: null,
                    error: 'No AI provider is configured (AI Studio returned its offline fallback). Configure a provider in AI Studio or switch Pulse to dry run.',
                    tokensIn: 0,
                    tokensOut: 0,
                    costUsd: 0,
                    turns: 1,
                    provider,
                    model,
                    prompt: resolved,
                };
            }
            if (!output) throw new Error(`${provider}/${model} returned an empty response`);
            const tokensIn = res.promptTokens ?? Math.ceil((systemPrompt.length + userPrompt.length) / 4);
            const tokensOut = res.completionTokens ?? Math.ceil(output.length / 4);
            return {
                status: 'success',
                output,
                error: null,
                tokensIn,
                tokensOut,
                costUsd: estimateCostUsd(provider, model, tokensIn, tokensOut),
                turns: 1,
                provider,
                model,
                prompt: resolved,
            };
        } catch (err) {
            const isTimeout = err instanceof TimeoutError;
            return {
                status: isTimeout ? 'timeout' : 'failed',
                output: null,
                error: (err as Error).message || 'Model call failed',
                tokensIn: 0,
                tokensOut: 0,
                costUsd: 0,
                turns: 1,
                prompt: resolved,
            };
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    private async buildSystemPrompt(routine: Row, agent: Row | null): Promise<string> {
        const parts: string[] = [];
        if (agent) {
            if (agent.persona) parts.push(String(agent.persona));
            else parts.push(`You are ${agent.name}, the ${agent.role || 'assistant'} of Nusantarasoft.`);
            if (agent.system_prompt) parts.push(String(agent.system_prompt));
            const rails = guardrailSummary(agent.guardrails);
            if (rails) parts.push(rails);
        } else {
            parts.push('You are the Agentic OS assistant of Nusantarasoft.');
        }
        parts.push(
            `You are running the routine "${routine.name}". Output is a DRAFT for human review; never claim to have sent, deleted or paid for anything.`,
        );
        const memory = agent ? await this.scopedMemory(agent) : '';
        if (memory) parts.push(`Relevant memory:\n${memory}`);
        return parts.join('\n\n');
    }

    /** agent.memory_scope area slugs → up to 20 items, ≤ 3000 chars. */
    private async scopedMemory(agent: Row): Promise<string> {
        const scope: string[] = Array.isArray(agent.memory_scope) ? agent.memory_scope : [];
        if (!scope.length) return '';
        const db = this.svc.db;
        const areas = must(
            await db.from('aos_memory_areas').select('id, slug').eq('tenant_id', agent.tenant_id).in('slug', scope).is('archived_at', null),
        ) as Row[];
        if (!areas || !areas.length) return '';
        const slugById = new Map(areas.map((a) => [a.id, a.slug]));
        const items = must(
            await db
                .from('aos_memory_items')
                .select('area_id, section, title, note')
                .in('area_id', areas.map((a) => a.id))
                .is('archived_at', null)
                .order('pinned', { ascending: false })
                .order('updated_at', { ascending: false })
                .limit(MEMORY_MAX_ITEMS),
        ) as Row[];
        let out = '';
        for (const it of items ?? []) {
            const line = `- [${slugById.get(it.area_id)}/${it.section}] ${it.title}: ${String(it.note ?? '').replace(/\s+/g, ' ').trim()}\n`;
            if (out.length + line.length > MEMORY_MAX_CHARS) break;
            out += line;
        }
        return out.trim();
    }

    private async buildUserPrompt(routine: Row, agent: Row | null): Promise<string> {
        const db = this.svc.db;
        const tenantId = routine.tenant_id;
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const modules: string[] = agent && Array.isArray(agent.modules) ? agent.modules : [];

        let auditQ = db.from('aos_audit_log').select('created_at, summary, module_id, level').eq('tenant_id', tenantId).gt('created_at', since);
        if (modules.length) auditQ = auditQ.in('module_id', modules);
        const [stats, auditRes, counts] = await Promise.all([
            this.svc.getStats(tenantId),
            auditQ.order('created_at', { ascending: false }).limit(ACTIVITY_MAX_LINES),
            Promise.all(
                TASK_STATUSES.map(async (s) => {
                    const { count } = await db
                        .from('aos_tasks')
                        .select('id', { count: 'exact', head: true })
                        .eq('tenant_id', tenantId)
                        .is('archived_at', null)
                        .eq('status', s);
                    return [s, count ?? 0] as const;
                }),
            ),
        ]);
        const activity = ((auditRes.data ?? []) as Row[])
            .map((a) => `- ${jakartaStamp(new Date(a.created_at)).slice(11)} [${a.level}${a.module_id ? ` · ${a.module_id}` : ''}] ${a.summary}`)
            .join('\n');

        return [
            String(routine.prompt ?? '').trim(),
            '',
            `--- Live context (${jakartaStamp()} WIB) ---`,
            `Agentic OS stats: ${JSON.stringify(stats)}`,
            `Task counts by status: ${JSON.stringify(Object.fromEntries(counts))}`,
            `Recent activity (last 24 h${modules.length ? `, modules ${modules.join(', ')}` : ''}):`,
            activity || '- (none)',
        ].join('\n');
    }

    // ── Kind: playbook ───────────────────────────────────────────────────────

    private async runPlaybook(routine: Row, agent: Row | null, playbook: Row, run: Row, opts: ExecOptions): Promise<KindResult> {
        const db = this.svc.db;
        const agentId: string | null = agent?.id ?? playbook.agent_id ?? null;
        let agentName = agent?.name ?? null;
        if (!agentName && agentId) {
            const a = must(await db.from('aos_agents').select('name').eq('id', agentId).maybeSingle()) as Row | null;
            agentName = a?.name ?? null;
        }
        const sortOrder = await this.svc.nextQueueSortOrder(routine.tenant_id, agentId);
        const task = must(
            await db
                .from('aos_tasks')
                .insert({
                    tenant_id: routine.tenant_id,
                    agent_id: agentId,
                    playbook_id: playbook.id,
                    routine_id: routine.id,
                    title: playbook.title,
                    description: playbook.description ?? '',
                    module_id: playbook.module_id,
                    route: playbook.route,
                    steps: stepsOf(playbook.steps),
                    priority: playbook.priority ?? 'normal',
                    requires_approval: !!playbook.requires_approval,
                    status: 'queued',
                    source: 'routine',
                    sort_order: sortOrder,
                    requested_by: opts.requestedBy ?? null,
                })
                .select('*')
                .single(),
        ) as Row;
        await this.svc.audit(routine.tenant_id, {
            actorType: agent ? 'agent' : 'system',
            actorId: agent?.slug ?? null,
            action: 'create',
            entity: 'task',
            entityId: task.id,
            summary: `Pulse queued "${task.title}" for ${agentName ?? 'the unassigned queue'} (routine "${routine.name}")`,
            moduleId: task.module_id,
            route: task.route,
            diff: { runId: run.id, routineId: routine.id },
        });
        return {
            status: 'success',
            output: `Queued task "${task.title}" for ${agentName ?? 'the unassigned queue'}`,
            error: null,
            tokensIn: 0,
            tokensOut: 0,
            costUsd: 0,
            turns: 0,
            taskId: task.id,
            provider: null,
            model: null,
        };
    }

    // ── Kind: workflow ───────────────────────────────────────────────────────

    /** Starts the routine's workflow (system actor). No LLM, 0 tokens; start errors fail the run. */
    private async runWorkflow(routine: Row): Promise<KindResult> {
        const base = { tokensIn: 0, tokensOut: 0, costUsd: 0, turns: 0, provider: null, model: null };
        try {
            const wr = await this.workflows.startRun(String(routine.workflow_id), 'routine', null, routine.id ?? null);
            return {
                ...base,
                status: 'success',
                output: `Started workflow "${wr.workflowName}" (run ${wr.id.slice(0, 8)})`,
                error: null,
                workflowRunId: wr.id,
            };
        } catch (err) {
            return { ...base, status: 'failed', output: null, error: (err as Error).message || 'Workflow could not start' };
        }
    }

    // ── Memory Map health check (on demand) ──────────────────────────────────

    /**
     * aosRunMemoryCheck: the deterministic check, run now. Only the kill switch
     * gates it (→ blocked). Recorded as a routine-less Pulse run (kind 'check').
     */
    async runMemoryCheckNow(actor: AosActor, tenantId?: string): Promise<AosRun> {
        const db = this.svc.db;
        const t = tenantOf(tenantId);
        const name = 'Memory Map health check';
        const settings = await this.svc.getSettingsRow(t);
        const baseRun: Row = {
            tenant_id: t,
            routine_id: null,
            agent_id: null,
            trigger: 'manual',
            provider: null,
            model: null,
            routine_name: name,
            kind: 'check',
            output_target: 'activity',
            prompt: null,
            requested_by: actor.id ?? null,
        };
        const userActor = { actorType: 'user' as const, actorId: actor.id ?? null };

        if (settings.kill_switch) {
            const now = new Date().toISOString();
            const blocked = must(
                await db
                    .from('aos_runs')
                    .insert({ ...baseRun, status: 'blocked', blocked_reason: 'Kill switch is on', duration_ms: 0, started_at: now, finished_at: now })
                    .select('*')
                    .single(),
            ) as Row;
            await this.svc.audit(t, {
                ...userActor,
                action: 'run_blocked',
                entity: 'routine',
                entityId: null,
                summary: `Pulse blocked "${name}": Kill switch is on`,
                level: 'warning',
                diff: { runId: blocked.id, trigger: 'manual', kind: 'check' },
            });
            return mapRun(blocked);
        }

        const startedAt = Date.now();
        const run = must(await db.from('aos_runs').insert({ ...baseRun, status: 'running' }).select('*').single()) as Row;
        await this.svc.audit(t, {
            ...userActor,
            action: 'run_started',
            entity: 'routine',
            entityId: null,
            summary: `Started "${name}"`,
            diff: { runId: run.id, trigger: 'manual', kind: 'check' },
        });
        let result: KindResult;
        try {
            result = await this.runMemoryCheck(t);
        } catch (err) {
            result = { status: 'failed', output: null, error: (err as Error).message || 'Unknown error', tokensIn: 0, tokensOut: 0, costUsd: 0, turns: 0 };
        }
        const finished = must(
            await db
                .from('aos_runs')
                .update({
                    status: result.status,
                    output: result.output,
                    error: result.error,
                    turns: 0,
                    duration_ms: Date.now() - startedAt,
                    finished_at: new Date().toISOString(),
                })
                .eq('id', run.id)
                .eq('status', 'running')
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        await this.svc.audit(t, {
            actorType: 'system',
            action: result.status === 'success' ? 'run_finished' : 'run_failed',
            entity: 'routine',
            entityId: null,
            summary: result.status === 'success' ? `Pulse finished "${name}"` : `"${name}" failed: ${result.error ?? result.status}`,
            level: result.status === 'success' ? 'success' : 'error',
            diff: { output: String(result.output ?? '').slice(0, 2000), runId: run.id, target: 'activity', kind: 'check', status: result.status },
        });
        return mapRun(finished ?? run);
    }

    // ── Kind: check (Memory Map Health Check) ────────────────────────────────

    private async runMemoryCheck(tenantId: string): Promise<KindResult> {
        const db = this.svc.db;
        const [itemsRes, playbooksRes] = await Promise.all([
            db.from('aos_memory_items').select('id, title, path, content, note, health, last_verified_at').eq('tenant_id', tenantId).is('archived_at', null),
            db.from('aos_playbooks').select('route').eq('tenant_id', tenantId),
        ]);
        const items = (must(itemsRes) as Row[]) ?? [];
        const known = new Set(
            ((must(playbooksRes) as Row[]) ?? [])
                .map((p) => /^\/admin\/([^/?#]+)/.exec(String(p.route ?? ''))?.[1])
                .filter((s): s is string => !!s),
        );
        const staleBefore = Date.now() - STALE_DAYS * 86400_000;
        const buckets: Record<'ok' | 'stale' | 'broken', Row[]> = { ok: [], stale: [], broken: [] };

        for (const it of items) {
            const path = String(it.path ?? '').trim();
            let health: 'ok' | 'stale' | 'broken';
            if (!path && !String(it.content ?? '').trim() && !String(it.note ?? '').trim()) {
                health = 'broken';
            } else if (path.startsWith('/admin/')) {
                // An admin page reference is verified by the route existing in a known module.
                const segment = /^\/admin\/([^/?#]+)/.exec(path)?.[1];
                health = segment && known.has(segment) ? 'ok' : 'broken';
            } else if (!it.last_verified_at || Date.parse(it.last_verified_at) < staleBefore) {
                health = 'stale';
            } else {
                health = 'ok';
            }
            buckets[health].push(it);
        }

        const now = new Date().toISOString();
        for (const health of ['ok', 'stale', 'broken'] as const) {
            const ids = buckets[health].map((i) => i.id);
            if (!ids.length) continue;
            const patch: Row = { health };
            if (health === 'ok') patch.last_verified_at = now;
            must(await db.from('aos_memory_items').update(patch).in('id', ids));
        }

        const brokenTitles = buckets.broken.slice(0, 10).map((i) => i.title);
        let output = `Checked ${items.length} items: ok ${buckets.ok.length}, stale ${buckets.stale.length}, broken ${buckets.broken.length}`;
        if (brokenTitles.length) output += `\nBroken: ${brokenTitles.join('; ')}`;
        return { status: 'success', output, error: null, tokensIn: 0, tokensOut: 0, costUsd: 0, turns: 0, provider: null, model: null };
    }

    // ── Delivery ─────────────────────────────────────────────────────────────

    /** Delivers a successful result by output_target. Returns an approval id when held for approval. */
    private async deliver(routine: Row, agent: Row | null, settings: Row, run: Row, result: KindResult, opts: ExecOptions): Promise<string | null> {
        const db = this.svc.db;
        const tenantId: string = routine.tenant_id;
        const target = String(routine.output_target ?? 'activity');
        const output = String(result.output ?? '');
        const who = agent?.name ?? 'Pulse';
        const name = String(routine.name ?? 'routine');
        const actor = { actorType: (agent ? 'agent' : 'system') as 'agent' | 'system', actorId: agent?.slug ?? null };
        const moduleId: string | null = agent && Array.isArray(agent.modules) && agent.modules.length ? agent.modules[0] : null;
        const finishedAudit = (extra: Row = {}) =>
            this.svc.audit(tenantId, {
                ...actor,
                action: 'run_finished',
                entity: 'routine',
                entityId: routine.id ?? null,
                summary: `${who} finished "${name}"`,
                level: 'success',
                moduleId,
                diff: { output: output.slice(0, 2000), runId: run.id, target, kind: run.kind ?? routine.kind, ...extra },
            });

        // A playbook routine's queued task *is* its deliverable.
        if (routine.kind === 'playbook' && target === 'task') {
            await finishedAudit({ taskId: result.taskId ?? null });
            return null;
        }
        // A workflow routine's started run *is* its deliverable: activity only.
        if (routine.kind === 'workflow') {
            await finishedAudit({ target: 'activity', workflowRunId: result.workflowRunId ?? null });
            return null;
        }

        switch (target) {
            case 'memory': {
                const area = await this.memoryAreaFor(tenantId, agent);
                if (!area) throw new Error('No memory area available');
                const item = must(
                    await db
                        .from('aos_memory_items')
                        .insert({
                            tenant_id: tenantId,
                            area_id: area.id,
                            section: 'memory',
                            kind: 'note',
                            title: `${name} · ${jakartaStamp()}`,
                            content: output,
                            note: output.replace(/\s+/g, ' ').trim().slice(0, 140),
                            tags: ['pulse', slugify(name, 'routine')],
                            agent_ids: agent ? [agent.id] : [],
                            health: 'ok',
                            last_verified_at: new Date().toISOString(),
                        })
                        .select('id')
                        .single(),
                ) as Row;
                await finishedAudit({ memoryItemId: item.id, areaId: area.id });
                return null;
            }
            case 'task': {
                const now = new Date().toISOString();
                const modules: string[] = agent && Array.isArray(agent.modules) ? agent.modules : [];
                const task = must(
                    await db
                        .from('aos_tasks')
                        .insert({
                            tenant_id: tenantId,
                            agent_id: agent?.id ?? null,
                            routine_id: routine.id ?? null,
                            title: name,
                            description: String(routine.description ?? ''),
                            module_id: modules[0] ?? 'agentic-os',
                            route: '/admin/agentic-os',
                            steps: [],
                            status: 'review',
                            progress: 1,
                            source: 'routine',
                            result: output,
                            started_at: now,
                            finished_at: now,
                            requested_by: opts.requestedBy ?? null,
                        })
                        .select('id')
                        .single(),
                ) as Row;
                await finishedAudit({ taskId: task.id });
                return null;
            }
            case 'notification': {
                const requireApproval: string[] = Array.isArray(settings.require_approval_for) ? settings.require_approval_for : [];
                if (requireApproval.includes('send')) {
                    const summary = `${who} wants to send "${name}"`;
                    const approval = must(
                        await db
                            .from('aos_approvals')
                            .insert({
                                tenant_id: tenantId,
                                agent_id: agent?.id ?? null,
                                action: 'send',
                                summary,
                                payload: {
                                    target: 'notification',
                                    output,
                                    routineId: routine.id ?? null,
                                    runId: run.id,
                                    routineName: name,
                                    title: name,
                                    requestedBy: opts.requestedBy ?? null,
                                },
                                run_id: run.id,
                                routine_id: routine.id ?? null,
                            })
                            .select('id')
                            .single(),
                    ) as Row;
                    await this.svc.audit(tenantId, {
                        ...actor,
                        action: 'request_approval',
                        entity: 'approval',
                        entityId: approval.id,
                        summary,
                        level: 'warning',
                        moduleId,
                        diff: { runId: run.id, routineId: routine.id ?? null, output: output.slice(0, 2000) },
                    });
                    return approval.id;
                }
                try {
                    const sent = await this.svc.deliverNotification(tenantId, {
                        title: name,
                        message: output,
                        requestedBy: opts.requestedBy ?? null,
                    });
                    await finishedAudit({ notifications: sent });
                } catch (err) {
                    this.logger.warn(`Notification delivery failed, falling back to activity: ${(err as Error).message}`);
                    await finishedAudit({ fallback: 'activity', notificationError: (err as Error).message });
                }
                return null;
            }
            default:
                await finishedAudit();
                return null;
        }
    }

    /** First area in agent.memory_scope, else the first area by sort_order. */
    private async memoryAreaFor(tenantId: string, agent: Row | null): Promise<Row | null> {
        const db = this.svc.db;
        const scope: string[] = agent && Array.isArray(agent.memory_scope) ? agent.memory_scope : [];
        if (scope.length) {
            const areas = must(
                await db.from('aos_memory_areas').select('id, slug').eq('tenant_id', tenantId).in('slug', scope).is('archived_at', null),
            ) as Row[];
            for (const slug of scope) {
                const hit = (areas ?? []).find((a) => a.slug === slug);
                if (hit) return hit;
            }
        }
        const first = must(
            await db
                .from('aos_memory_areas')
                .select('id, slug')
                .eq('tenant_id', tenantId)
                .is('archived_at', null)
                .order('sort_order', { ascending: true })
                .limit(1),
        ) as Row[];
        return first && first.length ? first[0] : null;
    }
}
