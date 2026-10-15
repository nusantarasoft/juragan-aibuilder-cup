import { Injectable, Logger, Optional } from '@nestjs/common';
import { AosTaskQueueEvents } from './aos-task-queue.events';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { cronNextDates, cronNextIso, DEFAULT_CRON_TZ, parseCron } from './aos-cron';
import {
    AOS_DEFAULT_TENANT,
    AosAgent,
    AosAgentInput,
    AosAgentVersion,
    AosApproval,
    AosAuditEntry,
    AosCronPreview,
    AosMemoryArea,
    AosMemoryAreaInput,
    AosMemoryItem,
    AosMemoryItemInput,
    AosPlaybook,
    AosPlaybookInput,
    AosRoutine,
    AosRoutineInput,
    AosRun,
    AosRunQueueItem,
    AosSettings,
    AosSettingsInput,
    AosStats,
    AosTask,
    AosTaskInput,
    AosWorkflow,
    AosWorkflowInput,
    AosWorkflowRun,
} from './agentic-os.types';

// ════════════════════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════════════════════

export type Row = Record<string, any>;

/** The signed-in user behind a mutation (null when anonymous access is allowed). */
export interface AosActor {
    id: string | null;
}

export type AuditLevel = 'info' | 'success' | 'warning' | 'error';

export interface AosAuditInput {
    actorType?: 'user' | 'agent' | 'system';
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    summary: string;
    level?: AuditLevel;
    moduleId?: string | null;
    route?: string | null;
    diff?: Row | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TASK_STATUSES = ['queued', 'running', 'awaiting_approval', 'review', 'done', 'failed', 'cancelled'] as const;
const ACTIVE_TASK_STATUSES = ['queued', 'running', 'awaiting_approval', 'review'];
const TASK_BUCKET: Record<string, number> = {
    running: 0,
    awaiting_approval: 1,
    queued: 2,
    review: 3,
    failed: 4,
    cancelled: 5,
    done: 6,
};
const CANCELLABLE = ['queued', 'running', 'awaiting_approval', 'review'];
const RETRYABLE = ['failed', 'cancelled', 'review'];
const MAX_LIMIT = 1000;
const JAKARTA_OFFSET_MS = 7 * 3600 * 1000;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
export const tenantOf = (tenantId?: string | null): string => tenantId || AOS_DEFAULT_TENANT;
const nowIso = () => new Date().toISOString();
const clampLimit = (limit: number | null | undefined, fallback: number) =>
    Math.max(1, Math.min(MAX_LIMIT, limit ?? fallback));

/** Unwrap a supabase response, throwing its error message. */
export function must<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data;
}

export function slugify(value: string, fallback = 'item'): string {
    const out = (value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '');
    return out || fallback;
}

/** Jakarta (UTC+7, no DST) start of the current day, as an ISO string. */
export function startOfTodayIso(): string {
    const local = new Date(Date.now() + JAKARTA_OFFSET_MS);
    local.setUTCHours(0, 0, 0, 0);
    return new Date(local.getTime() - JAKARTA_OFFSET_MS).toISOString();
}

/** Start of the current calendar month in UTC, as an ISO string. */
export function startOfMonthUtcIso(): string {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
const num = (v: unknown, fallback = 0): number => (v === null || v === undefined || v === '' ? fallback : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

/** `steps` jsonb is an array of strings; tolerate objects with a title/label. */
export function stepsOf(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.map((s) => {
        if (typeof s === 'string') return s;
        if (s && typeof s === 'object') {
            const o = s as Row;
            return String(o.title ?? o.label ?? o.name ?? JSON.stringify(o));
        }
        return String(s);
    });
}

/** [inputKey, column, nullable] — nullable columns accept an explicit null. */
type FieldSpec = readonly [string, string, boolean?];

function toRow(input: object | null | undefined, spec: readonly FieldSpec[]): Row {
    const row: Row = {};
    if (!input) return row;
    for (const [key, column, nullable] of spec) {
        const value = (input as Row)[key];
        if (value === undefined) continue;
        if (value === null && !nullable) continue;
        row[column] = value;
    }
    return row;
}

export function diffObjects(before: Row, after: Row): Row | null {
    const out: Row = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
        if (key === 'updatedAt') continue;
        if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
            out[key] = { from: before[key] ?? null, to: after[key] ?? null };
        }
    }
    return Object.keys(out).length ? out : null;
}

// ── Field specs ──────────────────────────────────────────────────────────────

const AGENT_FIELDS: readonly FieldSpec[] = [
    ['name', 'name'],
    ['role', 'role'],
    ['description', 'description'],
    ['persona', 'persona'],
    ['systemPrompt', 'system_prompt'],
    ['provider', 'provider'],
    ['model', 'model'],
    ['modelTier', 'model_tier'],
    ['temperature', 'temperature'],
    ['effort', 'effort'],
    ['color', 'color'],
    ['avatar', 'avatar'],
    ['zone', 'zone'],
    ['deskId', 'desk_id', true],
    ['modules', 'modules'],
    ['skills', 'skills'],
    ['tools', 'tools'],
    ['permissions', 'permissions'],
    ['guardrails', 'guardrails'],
    ['memoryScope', 'memory_scope'],
    ['runner', 'runner'],
    ['dailyTokenBudget', 'daily_token_budget'],
    ['dailyRunBudget', 'daily_run_budget'],
    ['status', 'status'],
    ['stats', 'stats'],
];

const PLAYBOOK_FIELDS: readonly FieldSpec[] = [
    ['agentId', 'agent_id', true],
    ['moduleId', 'module_id'],
    ['route', 'route'],
    ['title', 'title'],
    ['description', 'description'],
    ['steps', 'steps'],
    ['priority', 'priority'],
    ['estimatedMinutes', 'estimated_minutes'],
    ['requiresApproval', 'requires_approval'],
    ['enabled', 'enabled'],
    ['sortOrder', 'sort_order'],
];

const TASK_FIELDS: readonly FieldSpec[] = [
    ['agentId', 'agent_id', true],
    ['playbookId', 'playbook_id', true],
    ['routineId', 'routine_id', true],
    ['workflowId', 'workflow_id', true],
    ['title', 'title'],
    ['description', 'description'],
    ['moduleId', 'module_id'],
    ['route', 'route'],
    ['steps', 'steps'],
    ['status', 'status'],
    ['priority', 'priority'],
    ['sortOrder', 'sort_order'],
    ['source', 'source'],
    ['requiresApproval', 'requires_approval'],
    ['dueAt', 'due_at', true],
    ['result', 'result', true],
    ['error', 'error', true],
    ['goalId', 'goal_id', true],
];

const MEMORY_AREA_FIELDS: readonly FieldSpec[] = [
    ['name', 'name'],
    ['description', 'description'],
    ['color', 'color'],
    ['ownerAgentId', 'owner_agent_id', true],
    ['sortOrder', 'sort_order'],
];

const MEMORY_ITEM_FIELDS: readonly FieldSpec[] = [
    ['areaId', 'area_id'],
    ['section', 'section'],
    ['kind', 'kind'],
    ['title', 'title'],
    ['path', 'path', true],
    ['note', 'note'],
    ['content', 'content'],
    ['tags', 'tags'],
    ['pinned', 'pinned'],
    ['agentIds', 'agent_ids'],
    ['health', 'health'],
    ['lastVerifiedAt', 'last_verified_at', true],
];

const ROUTINE_FIELDS: readonly FieldSpec[] = [
    ['name', 'name'],
    ['description', 'description'],
    ['agentId', 'agent_id', true],
    ['cron', 'cron'],
    ['timezone', 'timezone'],
    ['runner', 'runner'],
    ['kind', 'kind'],
    ['playbookId', 'playbook_id', true],
    ['prompt', 'prompt'],
    ['model', 'model', true],
    ['effort', 'effort'],
    ['allowedTools', 'allowed_tools'],
    ['maxTurns', 'max_turns'],
    ['timeoutSeconds', 'timeout_seconds'],
    ['outputTarget', 'output_target'],
    ['enabled', 'enabled'],
    ['nextRunAt', 'next_run_at', true],
    ['workflowId', 'workflow_id', true],
];

const WORKFLOW_FIELDS: readonly FieldSpec[] = [
    ['name', 'name'],
    ['description', 'description'],
    ['trigger', 'trigger'],
    ['graph', 'graph'],
    ['enabled', 'enabled'],
];

const SETTINGS_FIELDS: readonly FieldSpec[] = [
    ['dailyRunCeiling', 'daily_run_ceiling'],
    ['rollingWindowMinutes', 'rolling_window_minutes'],
    ['rollingWindowCeiling', 'rolling_window_ceiling'],
    ['monthlyTokenBudget', 'monthly_token_budget'],
    ['killSwitch', 'kill_switch'],
    ['autopilot', 'autopilot'],
    ['autopilotReviewCap', 'autopilot_review_cap'],
    ['stepSeconds', 'step_seconds'],
    ['defaultRunner', 'default_runner'],
    ['defaultProvider', 'default_provider', true],
    ['defaultModel', 'default_model', true],
    ['requireApprovalFor', 'require_approval_for'],
    ['llmMode', 'llm_mode'],
    ['pulseEnabled', 'pulse_enabled'],
    ['runCostCeilingUsd', 'run_cost_ceiling_usd'],
    ['uiDemoMode', 'ui_demo_mode'],
];

// ── Row mappers ──────────────────────────────────────────────────────────────

export function mapAgent(r: Row): AosAgent {
    return {
        id: r.id,
        slug: r.slug,
        name: str(r.name),
        role: str(r.role),
        description: str(r.description),
        persona: str(r.persona),
        systemPrompt: str(r.system_prompt),
        provider: str(r.provider),
        model: str(r.model),
        modelTier: str(r.model_tier),
        temperature: num(r.temperature),
        effort: str(r.effort),
        color: str(r.color),
        avatar: r.avatar ?? {},
        zone: str(r.zone),
        deskId: strOrNull(r.desk_id),
        modules: strArr(r.modules),
        skills: strArr(r.skills),
        tools: strArr(r.tools),
        permissions: r.permissions ?? {},
        guardrails: r.guardrails ?? {},
        memoryScope: strArr(r.memory_scope),
        runner: str(r.runner),
        dailyTokenBudget: num(r.daily_token_budget),
        dailyRunBudget: num(r.daily_run_budget),
        status: str(r.status),
        version: num(r.version, 1),
        stats: r.stats ?? {},
        createdBy: strOrNull(r.created_by),
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
    };
}

/** Versioned agent config (camelCase, AosAgentInput-shaped; excludes runtime stats). */
export function agentSnapshot(r: Row): Row {
    const a = mapAgent(r);
    const snapshot: Row = { slug: a.slug };
    for (const [key] of AGENT_FIELDS) {
        if (key === 'stats') continue;
        snapshot[key] = (a as unknown as Row)[key];
    }
    return snapshot;
}

export function mapAgentVersion(r: Row): AosAgentVersion {
    return {
        id: r.id,
        agentId: r.agent_id,
        version: num(r.version),
        snapshot: r.snapshot ?? {},
        changeNote: strOrNull(r.change_note),
        changedBy: strOrNull(r.changed_by),
        createdAt: strOrNull(r.created_at),
    };
}

export function mapPlaybook(r: Row): AosPlaybook {
    return {
        id: r.id,
        agentId: strOrNull(r.agent_id),
        moduleId: str(r.module_id),
        route: str(r.route),
        title: str(r.title),
        description: str(r.description),
        steps: stepsOf(r.steps),
        priority: str(r.priority),
        estimatedMinutes: num(r.estimated_minutes),
        requiresApproval: !!r.requires_approval,
        enabled: !!r.enabled,
        sortOrder: num(r.sort_order),
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
    };
}

export function mapTask(r: Row): AosTask {
    return {
        id: r.id,
        agentId: strOrNull(r.agent_id),
        playbookId: strOrNull(r.playbook_id),
        routineId: strOrNull(r.routine_id),
        workflowId: strOrNull(r.workflow_id),
        title: str(r.title),
        description: str(r.description),
        moduleId: str(r.module_id),
        route: str(r.route),
        steps: stepsOf(r.steps),
        status: str(r.status),
        progress: num(r.progress),
        priority: str(r.priority),
        sortOrder: num(r.sort_order),
        source: str(r.source),
        requiresApproval: !!r.requires_approval,
        dueAt: strOrNull(r.due_at),
        startedAt: strOrNull(r.started_at),
        finishedAt: strOrNull(r.finished_at),
        completedAt: strOrNull(r.completed_at),
        completedBy: strOrNull(r.completed_by),
        result: strOrNull(r.result),
        error: strOrNull(r.error),
        requestedBy: strOrNull(r.requested_by),
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
        workflowRunId: strOrNull(r.workflow_run_id),
        nodeId: strOrNull(r.node_id),
        goalId: strOrNull(r.goal_id),
    };
}

export function mapMemoryArea(r: Row, itemCount = 0): AosMemoryArea {
    return {
        id: r.id,
        slug: r.slug,
        name: str(r.name),
        description: str(r.description),
        color: str(r.color),
        ownerAgentId: strOrNull(r.owner_agent_id),
        sortOrder: num(r.sort_order),
        itemCount,
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
    };
}

export function mapMemoryItem(r: Row): AosMemoryItem {
    return {
        id: r.id,
        areaId: r.area_id,
        section: str(r.section),
        kind: str(r.kind),
        title: str(r.title),
        path: strOrNull(r.path),
        note: str(r.note),
        content: str(r.content),
        tags: strArr(r.tags),
        pinned: !!r.pinned,
        agentIds: strArr(r.agent_ids),
        health: str(r.health),
        lastVerifiedAt: strOrNull(r.last_verified_at),
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
    };
}

export function mapRoutine(r: Row): AosRoutine {
    return {
        id: r.id,
        name: str(r.name),
        description: str(r.description),
        agentId: strOrNull(r.agent_id),
        cron: str(r.cron),
        timezone: str(r.timezone),
        runner: str(r.runner),
        kind: str(r.kind),
        playbookId: strOrNull(r.playbook_id),
        prompt: str(r.prompt),
        model: strOrNull(r.model),
        effort: str(r.effort),
        allowedTools: strArr(r.allowed_tools),
        maxTurns: num(r.max_turns),
        timeoutSeconds: num(r.timeout_seconds),
        outputTarget: str(r.output_target),
        enabled: !!r.enabled,
        lastRunAt: strOrNull(r.last_run_at),
        nextRunAt: strOrNull(r.next_run_at),
        lastStatus: strOrNull(r.last_status),
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
        workflowId: strOrNull(r.workflow_id),
    };
}

export function mapRun(r: Row): AosRun {
    return {
        id: r.id,
        routineId: strOrNull(r.routine_id),
        taskId: strOrNull(r.task_id),
        agentId: strOrNull(r.agent_id),
        trigger: str(r.trigger),
        provider: strOrNull(r.provider),
        model: strOrNull(r.model),
        turns: num(r.turns),
        tokensIn: num(r.tokens_in),
        tokensOut: num(r.tokens_out),
        costUsd: num(r.cost_usd),
        durationMs: numOrNull(r.duration_ms),
        status: str(r.status),
        output: strOrNull(r.output),
        error: strOrNull(r.error),
        startedAt: strOrNull(r.started_at),
        finishedAt: strOrNull(r.finished_at),
        routineName: strOrNull(r.routine_name),
        kind: strOrNull(r.kind),
        outputTarget: strOrNull(r.output_target),
        prompt: strOrNull(r.prompt),
        blockedReason: strOrNull(r.blocked_reason),
        approvalId: strOrNull(r.approval_id),
        requestedBy: strOrNull(r.requested_by),
    };
}

export function mapRunQueueItem(r: Row): AosRunQueueItem {
    return {
        id: r.id,
        routineId: r.routine_id,
        requestedBy: strOrNull(r.requested_by),
        requestedAt: strOrNull(r.requested_at),
        pickedAt: strOrNull(r.picked_at),
        runId: strOrNull(r.run_id),
    };
}

export function mapWorkflow(r: Row): AosWorkflow {
    return {
        id: r.id,
        name: str(r.name),
        description: str(r.description),
        trigger: str(r.trigger),
        graph: r.graph ?? { nodes: [], edges: [] },
        enabled: !!r.enabled,
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
        lastRunAt: strOrNull(r.last_run_at),
        lastStatus: strOrNull(r.last_status),
    };
}

export function mapWorkflowRun(r: Row): AosWorkflowRun {
    return {
        id: r.id,
        workflowId: r.workflow_id,
        workflowName: str(r.workflow_name),
        status: str(r.status),
        trigger: str(r.trigger),
        nodeStates: r.node_states ?? {},
        graphSnapshot: r.graph_snapshot ?? {},
        routineId: strOrNull(r.routine_id),
        startedBy: strOrNull(r.started_by),
        startedAt: str(r.started_at),
        finishedAt: strOrNull(r.finished_at),
        error: strOrNull(r.error),
    };
}

export function mapApproval(r: Row): AosApproval {
    return {
        id: r.id,
        taskId: strOrNull(r.task_id),
        agentId: strOrNull(r.agent_id),
        action: str(r.action),
        summary: str(r.summary),
        payload: r.payload ?? {},
        status: str(r.status),
        requestedAt: strOrNull(r.requested_at),
        decidedBy: strOrNull(r.decided_by),
        decidedAt: strOrNull(r.decided_at),
        comment: strOrNull(r.comment),
        runId: strOrNull(r.run_id),
        routineId: strOrNull(r.routine_id),
        workflowRunId: strOrNull(r.workflow_run_id),
        nodeId: strOrNull(r.node_id),
    };
}

export function mapAudit(r: Row): AosAuditEntry {
    return {
        id: r.id,
        actorType: str(r.actor_type),
        actorId: strOrNull(r.actor_id),
        action: str(r.action),
        entity: str(r.entity),
        entityId: strOrNull(r.entity_id),
        summary: str(r.summary),
        level: str(r.level),
        moduleId: strOrNull(r.module_id),
        route: strOrNull(r.route),
        diff: r.diff ?? null,
        createdAt: strOrNull(r.created_at),
    };
}

export function mapSettings(r: Row): AosSettings {
    return {
        tenantId: r.tenant_id,
        dailyRunCeiling: num(r.daily_run_ceiling),
        rollingWindowMinutes: num(r.rolling_window_minutes),
        rollingWindowCeiling: num(r.rolling_window_ceiling),
        monthlyTokenBudget: num(r.monthly_token_budget),
        killSwitch: !!r.kill_switch,
        autopilot: !!r.autopilot,
        autopilotReviewCap: num(r.autopilot_review_cap),
        stepSeconds: num(r.step_seconds, 15),
        defaultRunner: str(r.default_runner),
        defaultProvider: strOrNull(r.default_provider),
        defaultModel: strOrNull(r.default_model),
        requireApprovalFor: strArr(r.require_approval_for),
        updatedAt: strOrNull(r.updated_at),
        llmMode: str(r.llm_mode) || 'live',
        pulseEnabled: r.pulse_enabled === undefined || r.pulse_enabled === null ? true : !!r.pulse_enabled,
        runCostCeilingUsd: num(r.run_cost_ceiling_usd, 5),
        uiDemoMode:
            process.env.AOS_UI_DEMO_MODE === 'true' ? true : r.ui_demo_mode === undefined || r.ui_demo_mode === null ? false : !!r.ui_demo_mode,
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════════════════

@Injectable()
export class AgenticOsService {
    private readonly logger = new Logger(AgenticOsService.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly notifications: NotificationsService,
        @Optional() private readonly taskQueueEvents?: AosTaskQueueEvents,
    ) {}

    async notifyTaskQueue(
        tenantId: string,
        reason: string,
        taskId?: string | null,
        opts?: { includeStats?: boolean },
    ): Promise<void> {
        if (!this.taskQueueEvents) return;
        let task: AosTask | null = null;
        if (taskId) {
            const row = must(await this.db.from('aos_tasks').select('*').eq('id', taskId).maybeSingle()) as Row | null;
            task = row ? mapTask(row) : null;
        }
        let stats: AosStats | null = null;
        if (opts?.includeStats) {
            stats = await this.getStats(tenantId);
        }
        this.taskQueueEvents.publish(tenantId, { reason, task, stats });
    }

    get db(): SupabaseClient {
        return this.supabase.getAdminClient();
    }

    // ── Audit ────────────────────────────────────────────────────────────────

    /** Append one aos_audit_log row. Never throws (the mutation already happened). */
    async audit(tenantId: string, entry: AosAuditInput): Promise<void> {
        const { error } = await this.db.from('aos_audit_log').insert({
            tenant_id: tenantOf(tenantId),
            actor_type: entry.actorType ?? 'user',
            actor_id: entry.actorId ?? null,
            action: entry.action,
            entity: entry.entity,
            entity_id: entry.entityId ?? null,
            summary: entry.summary,
            level: entry.level ?? 'info',
            module_id: entry.moduleId ?? null,
            route: entry.route ?? null,
            diff: entry.diff ?? null,
        });
        if (error) this.logger.warn(`Audit insert failed (${entry.entity}.${entry.action}): ${error.message}`);
    }

    private userAudit(tenantId: string, actor: AosActor, entry: Omit<AosAuditInput, 'actorType' | 'actorId'>) {
        return this.audit(tenantId, { ...entry, actorType: 'user', actorId: actor.id ?? null });
    }

    async listAudit(args: {
        tenantId?: string;
        entity?: string;
        entityId?: string;
        actorId?: string;
        since?: string;
        until?: string;
        level?: string;
        action?: string;
        search?: string;
        limit?: number;
    }): Promise<AosAuditEntry[]> {
        let q = this.db.from('aos_audit_log').select('*').eq('tenant_id', tenantOf(args.tenantId));
        if (args.entity) q = q.eq('entity', args.entity);
        if (args.entityId) q = q.eq('entity_id', args.entityId);
        if (args.actorId) q = q.eq('actor_id', args.actorId);
        if (args.since) q = q.gt('created_at', args.since);
        if (args.until) q = q.lte('created_at', args.until);
        if (args.level) q = q.eq('level', args.level);
        if (args.action) q = q.eq('action', args.action);
        const search = (args.search ?? '').trim();
        if (search) q = q.ilike('summary', `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
        const rows = must(await q.order('created_at', { ascending: false }).limit(clampLimit(args.limit, 100)));
        return (rows ?? []).map(mapAudit);
    }

    // ── Slugs / references ───────────────────────────────────────────────────

    async uniqueSlug(
        table: 'aos_agents' | 'aos_memory_areas',
        tenantId: string,
        base: string,
        excludeId?: string,
    ): Promise<string> {
        const rows = must(await this.db.from(table).select('id, slug').eq('tenant_id', tenantId).like('slug', `${base}%`));
        const taken = new Set((rows ?? []).filter((r: Row) => r.id !== excludeId).map((r: Row) => r.slug));
        if (!taken.has(base)) return base;
        let i = 2;
        while (taken.has(`${base}-${i}`)) i++;
        return `${base}-${i}`;
    }

    /** Accepts an agent uuid or slug; returns the uuid (null for empty). */
    async resolveAgentId(tenantId: string, ref: string | null | undefined): Promise<string | null> {
        if (!ref) return null;
        if (isUuid(ref)) return ref;
        const row = must(
            await this.db.from('aos_agents').select('id').eq('tenant_id', tenantOf(tenantId)).eq('slug', ref).maybeSingle(),
        );
        if (!row) throw new Error(`Agent "${ref}" not found`);
        return (row as Row).id;
    }

    private async resolveAgentRefs(tenantId: string, row: Row, column: string): Promise<void> {
        if (row[column] === undefined) return;
        row[column] = await this.resolveAgentId(tenantId, row[column]);
    }

    private async agentName(agentId: string | null | undefined): Promise<string | null> {
        if (!agentId) return null;
        const { data } = await this.db.from('aos_agents').select('name').eq('id', agentId).maybeSingle();
        return data ? (data as Row).name : null;
    }

    private async maxSortOrder(table: string, apply: (q: any) => any): Promise<number> {
        const rows = must(
            await apply(this.db.from(table).select('sort_order')).order('sort_order', { ascending: false }).limit(1),
        ) as Row[];
        return rows && rows.length ? num(rows[0].sort_order) : -1;
    }

    // ── Agents ───────────────────────────────────────────────────────────────

    async getAgentRow(ref: string, tenantId?: string): Promise<Row | null> {
        let q = this.db.from('aos_agents').select('*');
        q = isUuid(ref) ? q.eq('id', ref) : q.eq('tenant_id', tenantOf(tenantId)).eq('slug', ref);
        return must(await q.maybeSingle()) as Row | null;
    }

    private async requireAgentRow(ref: string): Promise<Row> {
        const row = await this.getAgentRow(ref);
        if (!row) throw new Error('Agent not found');
        return row;
    }

    async listAgents(tenantId?: string, includeArchived = false): Promise<AosAgent[]> {
        let q = this.db.from('aos_agents').select('*').eq('tenant_id', tenantOf(tenantId));
        if (!includeArchived) q = q.is('archived_at', null);
        const rows = must(
            await q
                .order('created_at', { ascending: true })
                .order('desk_id', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true }),
        );
        return (rows ?? []).map(mapAgent);
    }

    async getAgent(ref: string): Promise<AosAgent | null> {
        const row = await this.getAgentRow(ref);
        return row ? mapAgent(row) : null;
    }

    async listAgentVersions(agentRef: string): Promise<AosAgentVersion[]> {
        const agent = await this.requireAgentRow(agentRef);
        const rows = must(
            await this.db.from('aos_agent_versions').select('*').eq('agent_id', agent.id).order('version', { ascending: false }),
        );
        return (rows ?? []).map(mapAgentVersion);
    }

    private async insertAgentVersion(row: Row, version: number, note: string | null, actor: AosActor): Promise<void> {
        must(
            await this.db.from('aos_agent_versions').insert({
                agent_id: row.id,
                version,
                snapshot: agentSnapshot(row),
                change_note: note,
                changed_by: actor.id ?? null,
            }),
        );
    }

    /** Apply a column patch as a new agent version (no audit). */
    private async applyAgentVersion(row: Row, patch: Row, note: string | null, actor: AosActor): Promise<Row> {
        const version = num(row.version, 1) + 1;
        const updated = must(
            await this.db.from('aos_agents').update({ ...patch, version }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.insertAgentVersion(updated, version, note, actor);
        return updated;
    }

    async createAgent(tenantId: string | undefined, input: AosAgentInput, actor: AosActor): Promise<AosAgent> {
        const t = tenantOf(tenantId);
        const name = (input.name ?? '').trim();
        if (!name) throw new Error('Agent name is required');
        const row = toRow(input, AGENT_FIELDS);
        row.name = name;
        row.slug = await this.uniqueSlug('aos_agents', t, slugify(input.slug || name, 'agent'));
        row.tenant_id = t;
        row.version = 1;
        row.created_by = actor.id ?? null;
        const created = must(await this.db.from('aos_agents').insert(row).select('*').single()) as Row;
        await this.insertAgentVersion(created, 1, 'Created', actor);
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'agent',
            entityId: created.id,
            summary: `Created agent ${created.name} (${created.role || 'no role'})`,
            level: 'success',
        });
        return mapAgent(created);
    }

    async updateAgent(id: string, input: AosAgentInput, changeNote: string | null | undefined, actor: AosActor): Promise<AosAgent> {
        const row = await this.requireAgentRow(id);
        const patch = toRow(input, AGENT_FIELDS);
        if (input.name !== undefined && input.name !== null) {
            const name = input.name.trim();
            if (!name) throw new Error('Agent name cannot be empty');
            patch.name = name;
        }
        if (input.slug) {
            const slug = slugify(input.slug, 'agent');
            if (slug !== row.slug) patch.slug = await this.uniqueSlug('aos_agents', row.tenant_id, slug, row.id);
        }
        const updated = await this.applyAgentVersion(row, patch, changeNote ?? null, actor);
        await this.userAudit(row.tenant_id, actor, {
            action: 'update',
            entity: 'agent',
            entityId: row.id,
            summary: `Updated agent ${updated.name} (v${updated.version})${changeNote ? ` — ${changeNote}` : ''}`,
            diff: diffObjects(agentSnapshot(row), agentSnapshot(updated)),
        });
        return mapAgent(updated);
    }

    async cloneAgent(id: string, name: string | null | undefined, actor: AosActor): Promise<AosAgent> {
        const src = await this.requireAgentRow(id);
        const newName = (name ?? '').trim() || `${src.name} (copy)`;
        const row = toRow(agentSnapshot(src), AGENT_FIELDS);
        row.name = newName;
        row.slug = await this.uniqueSlug('aos_agents', src.tenant_id, slugify(newName, 'agent'));
        row.desk_id = null;
        row.stats = {};
        row.tenant_id = src.tenant_id;
        row.version = 1;
        row.created_by = actor.id ?? null;
        const created = must(await this.db.from('aos_agents').insert(row).select('*').single()) as Row;
        await this.insertAgentVersion(created, 1, `Cloned from ${src.name}`, actor);
        await this.userAudit(src.tenant_id, actor, {
            action: 'clone',
            entity: 'agent',
            entityId: created.id,
            summary: `Cloned ${src.name} as ${created.name}`,
            level: 'success',
            diff: { sourceId: src.id },
        });
        return mapAgent(created);
    }

    async setAgentArchived(id: string, archived: boolean, actor: AosActor): Promise<AosAgent> {
        const row = await this.requireAgentRow(id);
        const updated = must(
            await this.db.from('aos_agents').update({ archived_at: archived ? nowIso() : null }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: archived ? 'archive' : 'restore',
            entity: 'agent',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} agent ${row.name}`,
            level: archived ? 'warning' : 'info',
        });
        return mapAgent(updated);
    }

    async restoreAgentVersion(agentId: string, version: number, actor: AosActor): Promise<AosAgent> {
        const row = await this.requireAgentRow(agentId);
        const v = must(
            await this.db.from('aos_agent_versions').select('*').eq('agent_id', row.id).eq('version', version).maybeSingle(),
        ) as Row | null;
        if (!v) throw new Error(`Version ${version} not found for ${row.name}`);
        const snapshot: Row = { ...(v.snapshot ?? {}) };
        delete snapshot.stats;
        const patch = toRow(snapshot, AGENT_FIELDS);
        const updated = await this.applyAgentVersion(row, patch, `Restored v${version}`, actor);
        await this.userAudit(row.tenant_id, actor, {
            action: 'restore_version',
            entity: 'agent',
            entityId: row.id,
            summary: `Restored ${updated.name} to v${version} (saved as v${updated.version})`,
            diff: diffObjects(agentSnapshot(row), agentSnapshot(updated)),
        });
        return mapAgent(updated);
    }

    // ── Playbooks ────────────────────────────────────────────────────────────

    private async requirePlaybookRow(id: string): Promise<Row> {
        const row = must(await this.db.from('aos_playbooks').select('*').eq('id', id).maybeSingle()) as Row | null;
        if (!row) throw new Error('Playbook not found');
        return row;
    }

    async listPlaybooks(args: { tenantId?: string; moduleId?: string; agentId?: string; includeArchived?: boolean }): Promise<AosPlaybook[]> {
        const t = tenantOf(args.tenantId);
        let q = this.db.from('aos_playbooks').select('*').eq('tenant_id', t);
        if (args.moduleId) q = q.eq('module_id', args.moduleId);
        if (args.agentId) {
            const agentUuid = await this.resolveAgentId(t, args.agentId);
            q = q.or(`agent_id.eq.${agentUuid},agent_id.is.null`);
        }
        if (!args.includeArchived) q = q.is('archived_at', null);
        const rows = must(await q.order('sort_order', { ascending: true }).order('title', { ascending: true }));
        return (rows ?? []).map(mapPlaybook);
    }

    async createPlaybook(tenantId: string | undefined, input: AosPlaybookInput, actor: AosActor): Promise<AosPlaybook> {
        const t = tenantOf(tenantId);
        const row = toRow(input, PLAYBOOK_FIELDS);
        await this.resolveAgentRefs(t, row, 'agent_id');
        row.title = (input.title ?? '').trim();
        if (!row.title || !row.module_id || !row.route) throw new Error('Playbook needs a title, moduleId and route');
        if (row.sort_order === undefined) {
            row.sort_order = (await this.maxSortOrder('aos_playbooks', (q) => q.eq('tenant_id', t))) + 1;
        }
        row.tenant_id = t;
        row.created_by = actor.id ?? null;
        const created = must(await this.db.from('aos_playbooks').insert(row).select('*').single()) as Row;
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'playbook',
            entityId: created.id,
            summary: `Created playbook "${created.title}"`,
            level: 'success',
            moduleId: created.module_id,
            route: created.route,
        });
        return mapPlaybook(created);
    }

    async updatePlaybook(id: string, input: AosPlaybookInput, actor: AosActor): Promise<AosPlaybook> {
        const row = await this.requirePlaybookRow(id);
        const patch = toRow(input, PLAYBOOK_FIELDS);
        await this.resolveAgentRefs(row.tenant_id, patch, 'agent_id');
        if (patch.title !== undefined) {
            patch.title = String(patch.title).trim();
            if (!patch.title) throw new Error('Playbook title cannot be empty');
        }
        const updated = must(await this.db.from('aos_playbooks').update(patch).eq('id', row.id).select('*').single()) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'update',
            entity: 'playbook',
            entityId: row.id,
            summary: `Updated playbook "${updated.title}"`,
            moduleId: updated.module_id,
            route: updated.route,
            diff: diffObjects(mapPlaybook(row), mapPlaybook(updated)),
        });
        return mapPlaybook(updated);
    }

    async setPlaybookArchived(id: string, archived: boolean, actor: AosActor): Promise<AosPlaybook> {
        const row = await this.requirePlaybookRow(id);
        const updated = must(
            await this.db.from('aos_playbooks').update({ archived_at: archived ? nowIso() : null }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: archived ? 'archive' : 'restore',
            entity: 'playbook',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} playbook "${row.title}"`,
            level: archived ? 'warning' : 'info',
            moduleId: row.module_id,
            route: row.route,
        });
        return mapPlaybook(updated);
    }

    // ── Tasks ────────────────────────────────────────────────────────────────

    async getTaskRow(id: string): Promise<Row | null> {
        return must(await this.db.from('aos_tasks').select('*').eq('id', id).maybeSingle()) as Row | null;
    }

    private async requireTaskRow(id: string): Promise<Row> {
        const row = await this.getTaskRow(id);
        if (!row) throw new Error('Task not found');
        return row;
    }

    /** Phase 4: '' clears the goal link; any other value must be an existing goal id. */
    private async checkGoalRef(row: Row): Promise<void> {
        if (row.goal_id === undefined || row.goal_id === null) return;
        if (row.goal_id === '') {
            row.goal_id = null;
            return;
        }
        const goal = isUuid(row.goal_id)
            ? (must(await this.db.from('aos_goals').select('id').eq('id', row.goal_id).maybeSingle()) as Row | null)
            : null;
        if (!goal) throw new Error('Goal not found');
    }

    /** Next sort_order within an agent's queue (unassigned tasks form their own queue). */
    async nextQueueSortOrder(tenantId: string, agentId: string | null): Promise<number> {
        const max = await this.maxSortOrder('aos_tasks', (q) => {
            let qq = q.eq('tenant_id', tenantId).eq('status', 'queued').is('archived_at', null);
            qq = agentId ? qq.eq('agent_id', agentId) : qq.is('agent_id', null);
            return qq;
        });
        return max + 1;
    }

    async listTasks(args: {
        tenantId?: string;
        agentId?: string;
        statuses?: string[];
        includeArchived?: boolean;
        limit?: number;
    }): Promise<AosTask[]> {
        const t = tenantOf(args.tenantId);
        const limit = clampLimit(args.limit, 300);
        const agentUuid = args.agentId ? await this.resolveAgentId(t, args.agentId) : null;
        const wanted = args.statuses && args.statuses.length ? args.statuses : [...TASK_STATUSES];
        const active = wanted.filter((s) => ACTIVE_TASK_STATUSES.includes(s));
        const terminal = wanted.filter((s) => !ACTIVE_TASK_STATUSES.includes(s));

        const base = () => {
            let q = this.db.from('aos_tasks').select('*').eq('tenant_id', t);
            if (agentUuid) q = q.eq('agent_id', agentUuid);
            if (!args.includeArchived) q = q.is('archived_at', null);
            return q;
        };

        const rows: Row[] = [];
        if (active.length) {
            const data = must(
                await base()
                    .in('status', active)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: true })
                    .limit(limit),
            );
            rows.push(...((data ?? []) as Row[]));
        }
        if (terminal.length && rows.length < limit) {
            // Most recent finished work first, so the limit keeps the relevant history.
            const data = must(
                await base()
                    .in('status', terminal)
                    .order('updated_at', { ascending: false })
                    .limit(limit - rows.length),
            );
            rows.push(...((data ?? []) as Row[]));
        }

        rows.sort((a, b) => {
            const bucket = (TASK_BUCKET[a.status] ?? 9) - (TASK_BUCKET[b.status] ?? 9);
            if (bucket) return bucket;
            const order = num(a.sort_order) - num(b.sort_order);
            if (order) return order;
            return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
        });
        return rows.map(mapTask);
    }

    async createTask(tenantId: string | undefined, input: AosTaskInput, actor: AosActor): Promise<AosTask> {
        const t = tenantOf(tenantId);
        if (input.status === 'done') throw new Error('Tasks cannot be created as done');

        const playbook = input.playbookId ? await this.requirePlaybookRow(input.playbookId) : null;
        const row = toRow(input, TASK_FIELDS);
        await this.resolveAgentRefs(t, row, 'agent_id');
        if (row.agent_id === undefined) row.agent_id = playbook?.agent_id ?? null;
        await this.checkGoalRef(row);

        row.title = String(input.title ?? playbook?.title ?? '').trim();
        row.module_id = input.moduleId || playbook?.module_id;
        row.route = input.route || playbook?.route;
        if (input.steps == null) row.steps = playbook ? stepsOf(playbook.steps) : [];
        if (input.description == null && playbook) row.description = playbook.description ?? '';
        if (input.priority == null && playbook) row.priority = playbook.priority;
        if (input.requiresApproval == null) row.requires_approval = playbook ? !!playbook.requires_approval : false;
        if (!row.title || !row.module_id || !row.route) {
            throw new Error('Task needs a title, moduleId and route (or a playbookId)');
        }

        row.status = input.status || 'queued';
        row.source = input.source || 'manual';
        if (row.sort_order === undefined) row.sort_order = await this.nextQueueSortOrder(t, row.agent_id);
        row.tenant_id = t;
        row.requested_by = actor.id ?? null;
        if (row.status === 'running') row.started_at = nowIso();

        const created = must(await this.db.from('aos_tasks').insert(row).select('*').single()) as Row;
        const agentName = await this.agentName(created.agent_id);
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'task',
            entityId: created.id,
            summary: `Queued "${created.title}" for ${agentName ?? 'the unassigned queue'}`,
            moduleId: created.module_id,
            route: created.route,
        });
        const out = mapTask(created);
        void this.notifyTaskQueue(t, 'queued', out.id, { includeStats: true });
        return out;
    }

    async updateTask(id: string, input: AosTaskInput, actor: AosActor): Promise<AosTask> {
        const row = await this.requireTaskRow(id);
        if (input.status === 'done') throw new Error('Use aosCompleteTask to mark a task as done');
        const patch = toRow(input, TASK_FIELDS);
        await this.resolveAgentRefs(row.tenant_id, patch, 'agent_id');
        await this.checkGoalRef(patch);
        if (patch.title !== undefined) {
            patch.title = String(patch.title).trim();
            if (!patch.title) throw new Error('Task title cannot be empty');
        }
        if (input.status === 'queued') {
            patch.progress = 0;
            patch.started_at = null;
            patch.finished_at = null;
        } else if (input.status === 'running' && row.status !== 'running' && !row.started_at) {
            patch.started_at = nowIso();
        }
        const updated = must(await this.db.from('aos_tasks').update(patch).eq('id', row.id).select('*').single()) as Row;
        const diff = diffObjects(mapTask(row), mapTask(updated));
        await this.userAudit(row.tenant_id, actor, {
            action: input.status && input.status !== row.status ? 'status' : 'update',
            entity: 'task',
            entityId: row.id,
            summary:
                input.status && input.status !== row.status
                    ? `Moved "${updated.title}" from ${row.status} to ${updated.status}`
                    : `Updated task "${updated.title}"`,
            moduleId: updated.module_id,
            route: updated.route,
            diff,
        });
        const out = mapTask(updated);
        void this.notifyTaskQueue(row.tenant_id, out.status, out.id, { includeStats: true });
        return out;
    }

    async reorderTasks(ids: string[], actor: AosActor): Promise<boolean> {
        if (!ids.length) return true;
        const rows = must(await this.db.from('aos_tasks').select('id, tenant_id').in('id', ids)) as Row[];
        if (!rows || !rows.length) throw new Error('No tasks found to reorder');
        const results = await Promise.all(
            ids.map((taskId, index) => this.db.from('aos_tasks').update({ sort_order: index }).eq('id', taskId)),
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw new Error(failed.error.message);
        await this.userAudit(rows[0].tenant_id, actor, {
            action: 'reorder',
            entity: 'task',
            summary: `Reordered ${ids.length} task${ids.length === 1 ? '' : 's'}`,
            diff: { ids },
        });
        return true;
    }

    async completeTask(id: string, actor: AosActor): Promise<AosTask> {
        const row = await this.requireTaskRow(id);
        if (row.status !== 'review') throw new Error(`Only tasks in review can be marked done (this one is ${row.status})`);
        const now = nowIso();
        const updated = must(
            await this.db
                .from('aos_tasks')
                .update({ status: 'done', progress: 1, completed_at: now, completed_by: actor.id ?? null, finished_at: row.finished_at ?? now })
                .eq('id', row.id)
                .eq('status', 'review')
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        if (!updated) throw new Error('Task changed state before it could be completed');
        await this.userAudit(row.tenant_id, actor, {
            action: 'complete',
            entity: 'task',
            entityId: row.id,
            summary: `Confirmed "${row.title}" as done`,
            level: 'success',
            moduleId: row.module_id,
            route: row.route,
        });
        const out = mapTask(updated);
        void this.notifyTaskQueue(row.tenant_id, 'done', out.id, { includeStats: true });
        return out;
    }

    async cancelTask(id: string, actor: AosActor): Promise<AosTask> {
        const row = await this.requireTaskRow(id);
        if (!CANCELLABLE.includes(row.status)) throw new Error(`A ${row.status} task cannot be cancelled`);
        const now = nowIso();
        const updated = must(
            await this.db
                .from('aos_tasks')
                .update({ status: 'cancelled', finished_at: row.finished_at ?? now })
                .eq('id', row.id)
                .select('*')
                .single(),
        ) as Row;
        // A cancelled task no longer needs a decision.
        must(
            await this.db
                .from('aos_approvals')
                .update({ status: 'rejected', decided_by: actor.id ?? null, decided_at: now, comment: 'Task cancelled' })
                .eq('task_id', row.id)
                .eq('status', 'pending'),
        );
        await this.userAudit(row.tenant_id, actor, {
            action: 'cancel',
            entity: 'task',
            entityId: row.id,
            summary: `Cancelled "${row.title}" (was ${row.status})`,
            level: 'warning',
            moduleId: row.module_id,
            route: row.route,
        });
        const cancelled = mapTask(updated);
        void this.notifyTaskQueue(row.tenant_id, 'cancelled', cancelled.id, { includeStats: true });
        return cancelled;
    }

    async retryTask(id: string, actor: AosActor): Promise<AosTask> {
        const row = await this.requireTaskRow(id);
        if (!RETRYABLE.includes(row.status)) throw new Error(`A ${row.status} task cannot be retried`);
        const updated = must(
            await this.db
                .from('aos_tasks')
                .update({
                    status: 'queued',
                    progress: 0,
                    started_at: null,
                    finished_at: null,
                    completed_at: null,
                    completed_by: null,
                    result: null,
                    error: null,
                })
                .eq('id', row.id)
                .select('*')
                .single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'retry',
            entity: 'task',
            entityId: row.id,
            summary: `Re-queued "${row.title}" (was ${row.status})`,
            moduleId: row.module_id,
            route: row.route,
        });
        const retried = mapTask(updated);
        void this.notifyTaskQueue(row.tenant_id, 'queued', retried.id, { includeStats: true });
        return retried;
    }

    async archiveTask(id: string, actor: AosActor): Promise<AosTask> {
        const row = await this.requireTaskRow(id);
        const updated = must(
            await this.db.from('aos_tasks').update({ archived_at: nowIso() }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'archive',
            entity: 'task',
            entityId: row.id,
            summary: `Archived task "${row.title}"`,
            moduleId: row.module_id,
            route: row.route,
        });
        const archived = mapTask(updated);
        void this.notifyTaskQueue(row.tenant_id, 'updated', archived.id, { includeStats: true });
        return archived;
    }

    // ── Memory: areas ────────────────────────────────────────────────────────

    private async requireMemoryAreaRow(ref: string, tenantId?: string): Promise<Row> {
        let q = this.db.from('aos_memory_areas').select('*');
        q = isUuid(ref) ? q.eq('id', ref) : q.eq('tenant_id', tenantOf(tenantId)).eq('slug', ref);
        const row = must(await q.maybeSingle()) as Row | null;
        if (!row) throw new Error('Memory area not found');
        return row;
    }

    private async memoryItemCounts(tenantId: string, areaIds?: string[]): Promise<Map<string, number>> {
        let q = this.db.from('aos_memory_items').select('area_id').eq('tenant_id', tenantId).is('archived_at', null);
        if (areaIds) q = q.in('area_id', areaIds);
        const rows = must(await q) as Row[];
        const counts = new Map<string, number>();
        for (const r of rows ?? []) counts.set(r.area_id, (counts.get(r.area_id) ?? 0) + 1);
        return counts;
    }

    private async withCount(row: Row): Promise<AosMemoryArea> {
        const counts = await this.memoryItemCounts(row.tenant_id, [row.id]);
        return mapMemoryArea(row, counts.get(row.id) ?? 0);
    }

    async listMemoryAreas(tenantId?: string, includeArchived = false): Promise<AosMemoryArea[]> {
        const t = tenantOf(tenantId);
        let q = this.db.from('aos_memory_areas').select('*').eq('tenant_id', t);
        if (!includeArchived) q = q.is('archived_at', null);
        const rows = must(await q.order('sort_order', { ascending: true }).order('name', { ascending: true })) as Row[];
        const counts = await this.memoryItemCounts(t);
        return (rows ?? []).map((r) => mapMemoryArea(r, counts.get(r.id) ?? 0));
    }

    async createMemoryArea(tenantId: string | undefined, input: AosMemoryAreaInput, actor: AosActor): Promise<AosMemoryArea> {
        const t = tenantOf(tenantId);
        const name = (input.name ?? '').trim();
        if (!name) throw new Error('Memory area name is required');
        const row = toRow(input, MEMORY_AREA_FIELDS);
        await this.resolveAgentRefs(t, row, 'owner_agent_id');
        row.name = name;
        row.slug = await this.uniqueSlug('aos_memory_areas', t, slugify(input.slug || name, 'area'));
        if (row.sort_order === undefined) {
            row.sort_order = (await this.maxSortOrder('aos_memory_areas', (q) => q.eq('tenant_id', t))) + 1;
        }
        row.tenant_id = t;
        const created = must(await this.db.from('aos_memory_areas').insert(row).select('*').single()) as Row;
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'memory_area',
            entityId: created.id,
            summary: `Created memory area ${created.name}`,
            level: 'success',
        });
        return mapMemoryArea(created, 0);
    }

    async updateMemoryArea(id: string, input: AosMemoryAreaInput, actor: AosActor): Promise<AosMemoryArea> {
        const row = await this.requireMemoryAreaRow(id);
        const patch = toRow(input, MEMORY_AREA_FIELDS);
        await this.resolveAgentRefs(row.tenant_id, patch, 'owner_agent_id');
        if (patch.name !== undefined) {
            patch.name = String(patch.name).trim();
            if (!patch.name) throw new Error('Memory area name cannot be empty');
        }
        if (input.slug) {
            const slug = slugify(input.slug, 'area');
            if (slug !== row.slug) patch.slug = await this.uniqueSlug('aos_memory_areas', row.tenant_id, slug, row.id);
        }
        const updated = must(await this.db.from('aos_memory_areas').update(patch).eq('id', row.id).select('*').single()) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'update',
            entity: 'memory_area',
            entityId: row.id,
            summary: `Updated memory area ${updated.name}`,
            diff: diffObjects(mapMemoryArea(row), mapMemoryArea(updated)),
        });
        return this.withCount(updated);
    }

    async setMemoryAreaArchived(id: string, archived: boolean, actor: AosActor): Promise<AosMemoryArea> {
        const row = await this.requireMemoryAreaRow(id);
        const updated = must(
            await this.db.from('aos_memory_areas').update({ archived_at: archived ? nowIso() : null }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: archived ? 'archive' : 'restore',
            entity: 'memory_area',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} memory area ${row.name}`,
            level: archived ? 'warning' : 'info',
        });
        return this.withCount(updated);
    }

    // ── Memory: items ────────────────────────────────────────────────────────

    private async requireMemoryItemRow(id: string): Promise<Row> {
        const row = must(await this.db.from('aos_memory_items').select('*').eq('id', id).maybeSingle()) as Row | null;
        if (!row) throw new Error('Memory item not found');
        return row;
    }

    private async resolveAgentIdList(tenantId: string, row: Row): Promise<void> {
        if (row.agent_ids === undefined) return;
        const ids: string[] = [];
        for (const ref of row.agent_ids as string[]) {
            const resolved = await this.resolveAgentId(tenantId, ref);
            if (resolved && !ids.includes(resolved)) ids.push(resolved);
        }
        row.agent_ids = ids;
    }

    async listMemoryItems(tenantId?: string, areaId?: string, includeArchived = false): Promise<AosMemoryItem[]> {
        const t = tenantOf(tenantId);
        let q = this.db.from('aos_memory_items').select('*').eq('tenant_id', t);
        if (areaId) {
            const area = isUuid(areaId) ? { id: areaId } : await this.requireMemoryAreaRow(areaId, t);
            q = q.eq('area_id', area.id);
        }
        if (!includeArchived) q = q.is('archived_at', null);
        const rows = must(
            await q.order('pinned', { ascending: false }).order('created_at', { ascending: true }).order('title', { ascending: true }),
        );
        return (rows ?? []).map(mapMemoryItem);
    }

    async createMemoryItem(tenantId: string | undefined, input: AosMemoryItemInput, actor: AosActor): Promise<AosMemoryItem> {
        const t = tenantOf(tenantId);
        if (!input.areaId) throw new Error('areaId is required');
        const title = (input.title ?? '').trim();
        if (!title) throw new Error('Memory item title is required');
        const area = await this.requireMemoryAreaRow(input.areaId, t);
        const row = toRow(input, MEMORY_ITEM_FIELDS);
        await this.resolveAgentIdList(t, row);
        row.area_id = area.id;
        row.title = title;
        row.tenant_id = t;
        row.created_by = actor.id ?? null;
        const created = must(await this.db.from('aos_memory_items').insert(row).select('*').single()) as Row;
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'memory_item',
            entityId: created.id,
            summary: `Added "${created.title}" to ${area.name} › ${created.section}`,
            level: 'success',
            route: created.path ?? null,
        });
        return mapMemoryItem(created);
    }

    async updateMemoryItem(id: string, input: AosMemoryItemInput, actor: AosActor): Promise<AosMemoryItem> {
        const row = await this.requireMemoryItemRow(id);
        const patch = toRow(input, MEMORY_ITEM_FIELDS);
        await this.resolveAgentIdList(row.tenant_id, patch);
        if (patch.area_id !== undefined) patch.area_id = (await this.requireMemoryAreaRow(patch.area_id, row.tenant_id)).id;
        if (patch.title !== undefined) {
            patch.title = String(patch.title).trim();
            if (!patch.title) throw new Error('Memory item title cannot be empty');
        }
        const updated = must(await this.db.from('aos_memory_items').update(patch).eq('id', row.id).select('*').single()) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'update',
            entity: 'memory_item',
            entityId: row.id,
            summary: `Updated memory item "${updated.title}"`,
            route: updated.path ?? null,
            diff: diffObjects(mapMemoryItem(row), mapMemoryItem(updated)),
        });
        return mapMemoryItem(updated);
    }

    async setMemoryItemArchived(id: string, archived: boolean, actor: AosActor): Promise<AosMemoryItem> {
        const row = await this.requireMemoryItemRow(id);
        const updated = must(
            await this.db.from('aos_memory_items').update({ archived_at: archived ? nowIso() : null }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: archived ? 'archive' : 'restore',
            entity: 'memory_item',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} memory item "${row.title}"`,
            level: archived ? 'warning' : 'info',
            route: row.path ?? null,
        });
        return mapMemoryItem(updated);
    }

    /** A human confirms the item is still accurate: health ok, last_verified_at now. */
    async verifyMemoryItem(id: string, actor: AosActor): Promise<AosMemoryItem> {
        const row = await this.requireMemoryItemRow(id);
        const updated = must(
            await this.db
                .from('aos_memory_items')
                .update({ health: 'ok', last_verified_at: nowIso() })
                .eq('id', row.id)
                .select('*')
                .single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'verify',
            entity: 'memory_item',
            entityId: row.id,
            summary: `Verified memory item "${row.title}"${row.health && row.health !== 'ok' ? ` (was ${row.health})` : ''}`,
            level: 'success',
            route: row.path ?? null,
        });
        return mapMemoryItem(updated);
    }

    // ── Pulse: routines, runs, queue ─────────────────────────────────────────

    async requireRoutineRow(id: string): Promise<Row> {
        const row = must(await this.db.from('aos_routines').select('*').eq('id', id).maybeSingle()) as Row | null;
        if (!row) throw new Error('Routine not found');
        return row;
    }

    async listRoutines(tenantId?: string, agentId?: string, includeArchived = false): Promise<AosRoutine[]> {
        const t = tenantOf(tenantId);
        let q = this.db.from('aos_routines').select('*').eq('tenant_id', t);
        if (agentId) q = q.eq('agent_id', await this.resolveAgentId(t, agentId));
        if (!includeArchived) q = q.is('archived_at', null);
        const rows = must(await q.order('name', { ascending: true }));
        return (rows ?? []).map(mapRoutine);
    }

    async createRoutine(tenantId: string | undefined, input: AosRoutineInput, actor: AosActor): Promise<AosRoutine> {
        const t = tenantOf(tenantId);
        const name = (input.name ?? '').trim();
        if (!name) throw new Error('Routine name is required');
        const row = toRow(input, ROUTINE_FIELDS);
        await this.resolveAgentRefs(t, row, 'agent_id');
        row.name = name;
        row.tenant_id = t;
        row.created_by = actor.id ?? null;
        // Validate the schedule (DB defaults apply when omitted) and compute the next fire time.
        const cron = row.cron ?? '0 7 * * 1-5';
        const timezone = row.timezone ?? DEFAULT_CRON_TZ;
        parseCron(cron, timezone);
        if (input.nextRunAt === undefined) row.next_run_at = row.enabled ? cronNextIso(cron, timezone) : null;
        const created = must(await this.db.from('aos_routines').insert(row).select('*').single()) as Row;
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'routine',
            entityId: created.id,
            summary: `Created routine "${created.name}" (${created.cron}, ${created.enabled ? 'enabled' : 'disabled'})`,
            level: 'success',
        });
        return mapRoutine(created);
    }

    async updateRoutine(id: string, input: AosRoutineInput, actor: AosActor): Promise<AosRoutine> {
        const row = await this.requireRoutineRow(id);
        const patch = toRow(input, ROUTINE_FIELDS);
        await this.resolveAgentRefs(row.tenant_id, patch, 'agent_id');
        if (patch.name !== undefined) {
            patch.name = String(patch.name).trim();
            if (!patch.name) throw new Error('Routine name cannot be empty');
        }
        if (patch.cron !== undefined || patch.timezone !== undefined || patch.enabled !== undefined) {
            const cron = patch.cron ?? row.cron;
            const timezone = patch.timezone ?? row.timezone;
            const enabled = patch.enabled ?? row.enabled;
            parseCron(cron, timezone);
            if (input.nextRunAt === undefined) patch.next_run_at = enabled ? cronNextIso(cron, timezone) : null;
        }
        const updated = must(await this.db.from('aos_routines').update(patch).eq('id', row.id).select('*').single()) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'update',
            entity: 'routine',
            entityId: row.id,
            summary: `Updated routine "${updated.name}"`,
            diff: diffObjects(mapRoutine(row), mapRoutine(updated)),
        });
        return mapRoutine(updated);
    }

    async setRoutineEnabled(id: string, enabled: boolean, actor: AosActor): Promise<AosRoutine> {
        const row = await this.requireRoutineRow(id);
        const next = enabled ? cronNextIso(row.cron, row.timezone) : null;
        if (enabled && !next) parseCron(row.cron, row.timezone); // throws `Invalid cron: …`
        const updated = must(
            await this.db.from('aos_routines').update({ enabled, next_run_at: next }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: enabled ? 'enable' : 'disable',
            entity: 'routine',
            entityId: row.id,
            summary: enabled
                ? `Enabled routine "${row.name}" (next run ${next})`
                : `Disabled routine "${row.name}"`,
            level: enabled ? 'success' : 'warning',
        });
        return mapRoutine(updated);
    }

    async setRoutineArchived(id: string, archived: boolean, actor: AosActor): Promise<AosRoutine> {
        const row = await this.requireRoutineRow(id);
        const patch: Row = { archived_at: archived ? nowIso() : null };
        // A restored routine must not fire immediately for a schedule missed while archived.
        if (!archived && row.enabled) patch.next_run_at = cronNextIso(row.cron, row.timezone);
        const updated = must(
            await this.db.from('aos_routines').update(patch).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: archived ? 'archive' : 'restore',
            entity: 'routine',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} routine "${row.name}"`,
            level: archived ? 'warning' : 'info',
        });
        return mapRoutine(updated);
    }

    async queueRoutine(routineId: string, actor: AosActor): Promise<AosRunQueueItem> {
        const routine = await this.requireRoutineRow(routineId);
        if (routine.archived_at) throw new Error('Archived routines cannot be run');
        const created = must(
            await this.db
                .from('aos_run_queue')
                .insert({ tenant_id: routine.tenant_id, routine_id: routine.id, requested_by: actor.id ?? null })
                .select('*')
                .single(),
        ) as Row;
        await this.userAudit(routine.tenant_id, actor, {
            action: 'queue',
            entity: 'routine',
            entityId: routine.id,
            summary: `Queued a manual run of "${routine.name}"`,
        });
        return mapRunQueueItem(created);
    }

    async cancelQueued(id: string, actor: AosActor): Promise<boolean> {
        const item = must(
            await this.db
                .from('aos_run_queue')
                .update({ picked_at: nowIso() })
                .eq('id', id)
                .is('picked_at', null)
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        if (!item) throw new Error('Queue item not found or already picked up');
        const routine = must(await this.db.from('aos_routines').select('name').eq('id', item.routine_id).maybeSingle()) as Row | null;
        await this.userAudit(item.tenant_id, actor, {
            action: 'cancel_queued',
            entity: 'routine',
            entityId: item.routine_id,
            summary: `Cancelled a queued run of "${routine?.name ?? 'routine'}"`,
            level: 'warning',
            diff: { queueId: item.id },
        });
        return true;
    }

    async listRuns(args: {
        tenantId?: string;
        routineId?: string;
        agentId?: string;
        status?: string;
        limit?: number;
        /** Only Pulse runs (kind IS NOT NULL); excludes Phase 1 simulated runs. */
        pulseOnly?: boolean;
    }): Promise<AosRun[]> {
        const t = tenantOf(args.tenantId);
        let q = this.db.from('aos_runs').select('*').eq('tenant_id', t);
        if (args.pulseOnly) q = q.not('kind', 'is', null);
        if (args.routineId) q = q.eq('routine_id', args.routineId);
        if (args.agentId) q = q.eq('agent_id', await this.resolveAgentId(t, args.agentId));
        if (args.status) q = q.eq('status', args.status);
        const rows = must(await q.order('started_at', { ascending: false }).limit(clampLimit(args.limit, 100)));
        return (rows ?? []).map(mapRun);
    }

    async listRunQueue(tenantId?: string): Promise<AosRunQueueItem[]> {
        const rows = must(
            await this.db
                .from('aos_run_queue')
                .select('*')
                .eq('tenant_id', tenantOf(tenantId))
                .is('picked_at', null)
                .order('requested_at', { ascending: true }),
        );
        return (rows ?? []).map(mapRunQueueItem);
    }

    cronPreview(cron: string, timezone?: string | null, count?: number | null): AosCronPreview {
        try {
            const n = Math.max(1, Math.min(20, count ?? 5));
            return { valid: true, error: null, next: cronNextDates(cron, timezone || DEFAULT_CRON_TZ, n).map((d) => d.toISOString()) };
        } catch (err) {
            return { valid: false, error: (err as Error).message, next: [] };
        }
    }

    /**
     * Exact run usage (aos_usage_summary RPC): today = Jakarta day, window = last
     * `windowMinutes`, month = UTC calendar month. agentId null = whole tenant.
     */
    async usageSummary(tenantId: string, windowMinutes: number, agentId: string | null = null): Promise<Row> {
        const windowStart = new Date(Date.now() - Math.max(1, windowMinutes) * 60_000).toISOString();
        const data = must(
            await this.db.rpc('aos_usage_summary', {
                p_tenant: tenantOf(tenantId),
                p_day_start: startOfTodayIso(),
                p_window_start: windowStart,
                p_month_start: startOfMonthUtcIso(),
                p_agent: agentId,
            }),
        ) as Row | null;
        const out: Row = {};
        for (const [k, v] of Object.entries(data ?? {})) out[k] = Number(v ?? 0);
        return out;
    }

    // ── Delivery (routine output) ────────────────────────────────────────────

    /**
     * Deliver routine output as an in-app notification. Recipients: the shared
     * 'system' inbox (same convention as other scheduled jobs) plus the requesting
     * user when known. Returns the number of notifications created.
     */
    async deliverNotification(
        tenantId: string,
        input: { title: string; message: string; requestedBy?: string | null },
    ): Promise<number> {
        const recipients = ['system'];
        if (input.requestedBy && !recipients.includes(input.requestedBy)) recipients.push(input.requestedBy);
        let sent = 0;
        for (const userId of recipients) {
            await this.notifications.createNotification(tenantOf(tenantId), {
                userId,
                title: input.title.slice(0, 200),
                message: input.message.slice(0, 4000),
                module: 'agentic-os',
                link: '/admin/agentic-os',
                icon: '🤖',
            });
            sent++;
        }
        return sent;
    }

    // ── Workflows ────────────────────────────────────────────────────────────

    private async requireWorkflowRow(id: string): Promise<Row> {
        const row = must(await this.db.from('aos_workflows').select('*').eq('id', id).maybeSingle()) as Row | null;
        if (!row) throw new Error('Workflow not found');
        return row;
    }

    async listWorkflows(tenantId?: string, includeArchived = false): Promise<AosWorkflow[]> {
        let q = this.db.from('aos_workflows').select('*').eq('tenant_id', tenantOf(tenantId));
        if (!includeArchived) q = q.is('archived_at', null);
        const rows = must(await q.order('name', { ascending: true }));
        return (rows ?? []).map(mapWorkflow);
    }

    async createWorkflow(tenantId: string | undefined, input: AosWorkflowInput, actor: AosActor): Promise<AosWorkflow> {
        const t = tenantOf(tenantId);
        const name = (input.name ?? '').trim();
        if (!name) throw new Error('Workflow name is required');
        const row = toRow(input, WORKFLOW_FIELDS);
        row.name = name;
        row.tenant_id = t;
        row.created_by = actor.id ?? null;
        const created = must(await this.db.from('aos_workflows').insert(row).select('*').single()) as Row;
        await this.userAudit(t, actor, {
            action: 'create',
            entity: 'workflow',
            entityId: created.id,
            summary: `Created workflow "${created.name}"`,
            level: 'success',
        });
        return mapWorkflow(created);
    }

    async updateWorkflow(id: string, input: AosWorkflowInput, actor: AosActor): Promise<AosWorkflow> {
        const row = await this.requireWorkflowRow(id);
        const patch = toRow(input, WORKFLOW_FIELDS);
        if (patch.name !== undefined) {
            patch.name = String(patch.name).trim();
            if (!patch.name) throw new Error('Workflow name cannot be empty');
        }
        const updated = must(await this.db.from('aos_workflows').update(patch).eq('id', row.id).select('*').single()) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: 'update',
            entity: 'workflow',
            entityId: row.id,
            summary: `Updated workflow "${updated.name}"`,
            diff: diffObjects(mapWorkflow(row), mapWorkflow(updated)),
        });
        return mapWorkflow(updated);
    }

    async setWorkflowArchived(id: string, archived: boolean, actor: AosActor): Promise<AosWorkflow> {
        const row = await this.requireWorkflowRow(id);
        const updated = must(
            await this.db.from('aos_workflows').update({ archived_at: archived ? nowIso() : null }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.userAudit(row.tenant_id, actor, {
            action: archived ? 'archive' : 'restore',
            entity: 'workflow',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} workflow "${row.name}"`,
            level: archived ? 'warning' : 'info',
        });
        return mapWorkflow(updated);
    }

    // ── Governance: approvals ────────────────────────────────────────────────

    async listApprovals(tenantId?: string, status?: string): Promise<AosApproval[]> {
        let q = this.db.from('aos_approvals').select('*').eq('tenant_id', tenantOf(tenantId));
        if (status) q = q.eq('status', status);
        const rows = must(await q.order('requested_at', { ascending: false }));
        return (rows ?? []).map(mapApproval);
    }

    async decideApproval(id: string, approve: boolean, comment: string | null | undefined, actor: AosActor): Promise<AosApproval> {
        const approval = must(await this.db.from('aos_approvals').select('*').eq('id', id).maybeSingle()) as Row | null;
        if (!approval) throw new Error('Approval not found');
        if (approval.status !== 'pending') throw new Error(`This approval was already ${approval.status}`);

        const now = nowIso();
        const updated = must(
            await this.db
                .from('aos_approvals')
                .update({
                    status: approve ? 'approved' : 'rejected',
                    decided_by: actor.id ?? null,
                    decided_at: now,
                    comment: comment ?? null,
                })
                .eq('id', approval.id)
                .eq('status', 'pending')
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        if (!updated) throw new Error('This approval was decided by someone else');

        // Workflow gates are decision-only: no task or delivery side effects —
        // the workflow engine tick advances (or fails) the run from the decision.
        if (approval.action === 'workflow_gate') {
            await this.userAudit(approval.tenant_id, actor, {
                action: approve ? 'approve' : 'reject',
                entity: 'approval',
                entityId: approval.id,
                summary: `${approve ? 'Approved' : 'Rejected'}: ${approval.summary || approval.action}${comment ? ` — ${comment}` : ''}`,
                level: approve ? 'success' : 'warning',
                diff: { workflowRunId: approval.workflow_run_id ?? null, nodeId: approval.node_id ?? null },
            });
            return mapApproval(updated);
        }

        let task: Row | null = null;
        if (approval.task_id) {
            task = await this.getTaskRow(approval.task_id);
            if (task) {
                if (approve) {
                    // Hand the task back to the agent; the runner finalises it into review.
                    must(
                        await this.db
                            .from('aos_tasks')
                            .update({ status: 'running' })
                            .eq('id', task.id)
                            .eq('status', 'awaiting_approval'),
                    );
                } else {
                    must(
                        await this.db
                            .from('aos_tasks')
                            .update({ status: 'cancelled', error: comment || 'Rejected by a human', finished_at: task.finished_at ?? now })
                            .eq('id', task.id)
                            .in('status', ['awaiting_approval', 'running']),
                    );
                }
            }
        }

        await this.userAudit(approval.tenant_id, actor, {
            action: approve ? 'approve' : 'reject',
            entity: 'approval',
            entityId: approval.id,
            summary: `${approve ? 'Approved' : 'Rejected'}: ${approval.summary || approval.action}${comment ? ` — ${comment}` : ''}`,
            level: approve ? 'success' : 'warning',
            moduleId: task?.module_id ?? null,
            route: task?.route ?? null,
        });

        // Routine output deliveries (no task): approve → deliver the held payload.
        if (approve && !approval.task_id && (approval.run_id || approval.routine_id)) {
            await this.deliverApprovedPayload(approval, actor);
        }
        return mapApproval(updated);
    }

    /** Delivers an approved routine output payload. Never throws (the decision is already stored). */
    private async deliverApprovedPayload(approval: Row, actor: AosActor): Promise<void> {
        const payload: Row = (approval.payload ?? {}) as Row;
        let routineName: string = payload.routineName ?? '';
        if (!routineName && approval.routine_id) {
            const r = must(await this.db.from('aos_routines').select('name').eq('id', approval.routine_id).maybeSingle()) as Row | null;
            routineName = r?.name ?? '';
        }
        routineName = routineName || 'routine output';
        const output = str(payload.output);
        const base = {
            entity: 'routine',
            entityId: approval.routine_id ?? null,
        };
        try {
            let delivered = 'activity';
            if (payload.target === 'notification') {
                try {
                    await this.deliverNotification(approval.tenant_id, {
                        title: str(payload.title) || routineName,
                        message: output,
                        requestedBy: payload.requestedBy ?? null,
                    });
                    delivered = 'notification';
                } catch (err) {
                    this.logger.warn(`Notification delivery failed, falling back to activity: ${(err as Error).message}`);
                }
            }
            await this.userAudit(approval.tenant_id, actor, {
                ...base,
                action: 'deliver',
                summary: `Approved delivery of "${routineName}"`,
                level: 'success',
                diff: { runId: approval.run_id ?? null, approvalId: approval.id, target: delivered, output: output.slice(0, 2000) },
            });
        } catch (err) {
            await this.userAudit(approval.tenant_id, actor, {
                ...base,
                action: 'deliver',
                summary: `Delivery of "${routineName}" failed: ${(err as Error).message}`,
                level: 'error',
                diff: { runId: approval.run_id ?? null, approvalId: approval.id },
            });
        }
    }

    // ── Settings ─────────────────────────────────────────────────────────────

    /** Returns the tenant settings row, creating the default row if missing. */
    async getSettingsRow(tenantId?: string): Promise<Row> {
        const t = tenantOf(tenantId);
        const existing = must(await this.db.from('aos_settings').select('*').eq('tenant_id', t).maybeSingle()) as Row | null;
        if (existing) return existing;
        must(await this.db.from('aos_settings').upsert({ tenant_id: t }, { onConflict: 'tenant_id', ignoreDuplicates: true }));
        return must(await this.db.from('aos_settings').select('*').eq('tenant_id', t).single()) as Row;
    }

    async getSettings(tenantId?: string): Promise<AosSettings> {
        return mapSettings(await this.getSettingsRow(tenantId));
    }

    async updateSettings(tenantId: string | undefined, input: AosSettingsInput, actor: AosActor): Promise<AosSettings> {
        const t = tenantOf(tenantId);
        const before = await this.getSettingsRow(t);
        const patch = toRow(input, SETTINGS_FIELDS);
        if (patch.monthly_token_budget !== undefined) patch.monthly_token_budget = Math.round(Number(patch.monthly_token_budget));
        if (patch.llm_mode !== undefined && !['live', 'dry_run'].includes(patch.llm_mode)) {
            throw new Error(`llmMode must be "live" or "dry_run" (got "${patch.llm_mode}")`);
        }
        if (patch.run_cost_ceiling_usd !== undefined) {
            const ceiling = Number(patch.run_cost_ceiling_usd);
            if (!Number.isFinite(ceiling) || ceiling < 0) throw new Error('runCostCeilingUsd must be a number ≥ 0');
            patch.run_cost_ceiling_usd = Math.round(ceiling * 100) / 100;
        }
        patch.updated_by = actor.id ?? null;
        const updated = must(await this.db.from('aos_settings').update(patch).eq('tenant_id', t).select('*').single()) as Row;
        await this.userAudit(t, actor, {
            action: 'update',
            entity: 'settings',
            entityId: t,
            summary: 'Updated Agentic OS settings',
            diff: diffObjects(mapSettings(before), mapSettings(updated)),
        });
        return mapSettings(updated);
    }

    async setKillSwitch(tenantId: string | undefined, on: boolean, actor: AosActor): Promise<AosSettings> {
        const t = tenantOf(tenantId);
        await this.getSettingsRow(t);
        const updated = must(
            await this.db
                .from('aos_settings')
                .update({ kill_switch: on, updated_by: actor.id ?? null })
                .eq('tenant_id', t)
                .select('*')
                .single(),
        ) as Row;
        await this.userAudit(t, actor, {
            action: on ? 'kill_switch_on' : 'kill_switch_off',
            entity: 'settings',
            entityId: t,
            summary: on ? 'Kill switch engaged — all agents stopped' : 'Kill switch released — agents may resume work',
            level: on ? 'warning' : 'info',
        });
        return mapSettings(updated);
    }

    // ── Stats ────────────────────────────────────────────────────────────────

    private async count(table: string, apply: (q: any) => any): Promise<number> {
        const { count, error } = await apply(this.db.from(table).select('id', { count: 'exact', head: true }));
        if (error) throw new Error(error.message);
        return count ?? 0;
    }

    async getStats(tenantId?: string): Promise<AosStats> {
        const t = tenantOf(tenantId);
        const today = startOfTodayIso();
        const agents = (q: any) => q.eq('tenant_id', t).is('archived_at', null);
        const tasks = (status: string) => (q: any) => q.eq('tenant_id', t).is('archived_at', null).eq('status', status);

        const [totalAgents, activeAgents, queuedTasks, runningTasks, reviewTasks, awaitingApproval, doneToday, failedToday, pendingApprovals, runs] =
            await Promise.all([
                this.count('aos_agents', agents),
                this.count('aos_agents', (q) => agents(q).eq('status', 'active')),
                this.count('aos_tasks', tasks('queued')),
                this.count('aos_tasks', tasks('running')),
                this.count('aos_tasks', tasks('review')),
                this.count('aos_tasks', tasks('awaiting_approval')),
                this.count('aos_tasks', (q) => q.eq('tenant_id', t).eq('status', 'done').gte('completed_at', today)),
                this.count('aos_tasks', (q) => q.eq('tenant_id', t).eq('status', 'failed').gte('updated_at', today)),
                this.count('aos_approvals', (q) => q.eq('tenant_id', t).eq('status', 'pending')),
                this.db.from('aos_runs').select('tokens_in, tokens_out, cost_usd').eq('tenant_id', t).gte('started_at', today),
            ]);

        const runRows = must(runs) as Row[];
        let tokensToday = 0;
        let costToday = 0;
        for (const r of runRows ?? []) {
            tokensToday += num(r.tokens_in) + num(r.tokens_out);
            costToday += num(r.cost_usd);
        }

        return {
            totalAgents,
            activeAgents,
            queuedTasks,
            runningTasks,
            reviewTasks,
            awaitingApproval,
            doneToday,
            failedToday,
            runsToday: (runRows ?? []).length,
            tokensToday,
            costToday: Math.round(costToday * 10000) / 10000,
            pendingApprovals,
        };
    }
}
