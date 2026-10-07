import { Injectable } from '@nestjs/common';
import { AgenticOsService, AosActor, AuditLevel, diffObjects, isUuid, must, Row, tenantOf } from './agentic-os.service';
import {
    AosDayStats,
    AosDeckStats,
    AosGoal,
    AosGoalInput,
    AosGoalReview,
    AosGoalReviewInput,
    AosWeekActivity,
    AosWeekStats,
} from './agentic-os.types';

// ════════════════════════════════════════════════════════════════════════════
// Phase 4 — Command Deck: goals, gate reviews and deck stats
// ════════════════════════════════════════════════════════════════════════════

export const GOAL_STATUSES = ['active', 'at_risk', 'paused', 'achieved', 'missed'] as const;
export const GOAL_VERDICTS = ['on_track', 'at_risk', 'off_track', 'achieved', 'missed'] as const;

/** A review verdict decides the goal status. */
const VERDICT_STATUS: Record<string, string> = {
    on_track: 'active',
    at_risk: 'at_risk',
    off_track: 'at_risk',
    achieved: 'achieved',
    missed: 'missed',
};
const VERDICT_LABEL: Record<string, string> = {
    on_track: 'on track',
    at_risk: 'at risk',
    off_track: 'off track',
    achieved: 'achieved',
    missed: 'missed',
};

export const DEFAULT_DECK_TZ = 'Asia/Jakarta';
const DEFAULT_WINDOW_DAYS = 90;
const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 366;
const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const nowIso = () => new Date().toISOString();
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const num = (v: unknown, fallback = 0): number => (v === null || v === undefined || v === '' ? fallback : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const clampWindow = (days: number): number => Math.min(MAX_WINDOW_DAYS, Math.max(MIN_WINDOW_DAYS, Math.round(days)));

/** Validates a 'YYYY-MM-DD' calendar date (real day, not just the shape). */
export function parseDate(value: unknown): string {
    const s = str(value).trim();
    const m = DATE_RE.exec(s);
    if (m) {
        const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
        if (d.toISOString().slice(0, 10) === s) return s;
    }
    throw new Error(`Invalid date: ${str(value)}`);
}

const dateMs = (date: string): number => Date.parse(`${date}T00:00:00Z`);
export const addDays = (date: string, days: number): string => new Date(dateMs(date) + days * DAY_MS).toISOString().slice(0, 10);
/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string): number => Math.round((dateMs(b) - dateMs(a)) / DAY_MS);

export function isValidTimezone(tz: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

/** Today's calendar date ('YYYY-MM-DD') in a timezone. */
export function todayIn(tz: string): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Postgres `date` values come back as 'YYYY-MM-DD'; tolerate a timestamp too. */
const dateStr = (v: unknown): string => str(v).slice(0, 10);
const dateOrNull = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : dateStr(v));

function finiteOrThrow(value: number, label: string): number {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
    return n;
}

function oneOf(value: string, allowed: readonly string[], label: string): string {
    if (!allowed.includes(value)) throw new Error(`Invalid ${label}: ${value} (expected one of ${allowed.join(', ')})`);
    return value;
}

interface GoalRollup {
    review_count: number;
    last_reviewed_at: string | null;
    last_verdict: string | null;
    open_tasks: number;
    done_tasks: number;
}

/** Stored goal columns (camelCase), used for audit diffs. */
function goalColumns(r: Row): Row {
    return {
        title: str(r.title),
        description: str(r.description),
        areaId: strOrNull(r.area_id),
        ownerAgentId: strOrNull(r.owner_agent_id),
        metric: str(r.metric),
        targetValue: numOrNull(r.target_value),
        currentValue: numOrNull(r.current_value),
        unit: str(r.unit),
        windowDays: num(r.window_days, DEFAULT_WINDOW_DAYS),
        startsOn: dateStr(r.starts_on),
        gateOn: dateStr(r.gate_on),
        status: str(r.status),
        progress: num(r.progress),
        nextAction: str(r.next_action),
        nextActionDue: dateOrNull(r.next_action_due),
        color: str(r.color),
        sortOrder: num(r.sort_order),
    };
}

export function mapGoal(r: Row, roll?: Partial<GoalRollup> | null): AosGoal {
    return {
        id: r.id,
        ...(goalColumns(r) as Omit<AosGoal, 'id' | 'createdBy' | 'archivedAt' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'lastReviewedAt' | 'lastVerdict' | 'openTasks' | 'doneTasks'>),
        createdBy: strOrNull(r.created_by),
        archivedAt: strOrNull(r.archived_at),
        createdAt: strOrNull(r.created_at),
        updatedAt: strOrNull(r.updated_at),
        reviewCount: num(roll?.review_count),
        lastReviewedAt: strOrNull(roll?.last_reviewed_at),
        lastVerdict: strOrNull(roll?.last_verdict),
        openTasks: num(roll?.open_tasks),
        doneTasks: num(roll?.done_tasks),
    };
}

export function mapGoalReview(r: Row): AosGoalReview {
    return {
        id: r.id,
        goalId: r.goal_id,
        verdict: str(r.verdict),
        progress: numOrNull(r.progress),
        currentValue: numOrNull(r.current_value),
        note: str(r.note),
        nextAction: strOrNull(r.next_action),
        nextGateOn: dateOrNull(r.next_gate_on),
        reviewedBy: strOrNull(r.reviewed_by),
        createdAt: str(r.created_at),
    };
}

function mapDay(j: Row | null | undefined): AosDayStats {
    const d = j ?? {};
    return {
        date: str(d.date),
        runs: num(d.runs),
        success: num(d.success),
        failed: num(d.failed),
        blocked: num(d.blocked),
        costUsd: Math.round(num(d.costUsd) * 10000) / 10000,
        tokens: num(d.tokens),
    };
}

function mapWeek(j: Row | null | undefined): AosWeekStats {
    const w = j ?? {};
    return {
        weekStart: str(w.weekStart),
        tasksCreated: num(w.tasksCreated),
        tasksDone: num(w.tasksDone),
        reviewsWaiting: num(w.reviewsWaiting),
        approvalsDecided: num(w.approvalsDecided),
        approvalsTotal: num(w.approvalsTotal),
        notesAdded: num(w.notesAdded),
        runs: num(w.runs),
        overdueTasks: num(w.overdueTasks),
    };
}

function mapWeekActivity(j: Row): AosWeekActivity {
    const tasksDone = num(j.tasksDone);
    const runs = num(j.runs);
    const approvals = num(j.approvals);
    const notes = num(j.notes);
    return { weekStart: str(j.weekStart), tasksDone, runs, approvals, notes, score: tasksDone + runs + approvals + notes };
}

/**
 * AgenticOsGoals — outcome goals with a review window and a gate date,
 * append-only gate reviews (aos_goal_reviews) and the Command Deck stats.
 * Goals are archived, never deleted. Every mutation is audited (entity 'goal').
 */
@Injectable()
export class AgenticOsGoals {
    constructor(private readonly svc: AgenticOsService) {}

    private get db() {
        return this.svc.db;
    }

    private goalAudit(tenantId: string, actor: AosActor, entry: { action: string; entityId: string; summary: string; level?: AuditLevel; diff?: Row | null }) {
        return this.svc.audit(tenantId, { ...entry, entity: 'goal', actorType: 'user', actorId: actor.id ?? null });
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    private async requireGoalRow(id: string): Promise<Row> {
        const row = isUuid(id) ? (must(await this.db.from('aos_goals').select('*').eq('id', id).maybeSingle()) as Row | null) : null;
        if (!row) throw new Error('Goal not found');
        return row;
    }

    private async rollups(tenantId: string, goalId?: string): Promise<Map<string, GoalRollup>> {
        let q = this.db.rpc('aos_goal_rollup', { p_tenant: tenantOf(tenantId) });
        if (goalId) q = q.eq('goal_id', goalId);
        const rows = (must(await q) as Row[] | null) ?? [];
        return new Map(rows.map((r) => [String(r.goal_id), r as GoalRollup]));
    }

    private async withRollup(row: Row): Promise<AosGoal> {
        const roll = await this.rollups(row.tenant_id, row.id);
        return mapGoal(row, roll.get(row.id));
    }

    /** Order: archived last, then gate_on asc, then sort_order. */
    async listGoals(tenantId?: string, includeArchived = false): Promise<AosGoal[]> {
        const t = tenantOf(tenantId);
        let q = this.db.from('aos_goals').select('*').eq('tenant_id', t);
        if (!includeArchived) q = q.is('archived_at', null);
        const [res, roll] = await Promise.all([q, this.rollups(t)]);
        const rows = (must(res) as Row[] | null) ?? [];
        return rows
            .sort((a, b) => {
                const archived = (a.archived_at ? 1 : 0) - (b.archived_at ? 1 : 0);
                if (archived) return archived;
                const gate = dateStr(a.gate_on).localeCompare(dateStr(b.gate_on));
                if (gate) return gate;
                const order = num(a.sort_order) - num(b.sort_order);
                return order || str(a.title).localeCompare(str(b.title));
            })
            .map((r) => mapGoal(r, roll.get(r.id)));
    }

    /** Newest first (default limit 50). */
    async listReviews(args: { tenantId?: string; goalId?: string; limit?: number | null }): Promise<AosGoalReview[]> {
        const limit = Math.max(1, Math.min(1000, args.limit ?? 50));
        let q = this.db.from('aos_goal_reviews').select('*').eq('tenant_id', tenantOf(args.tenantId));
        if (args.goalId) {
            if (!isUuid(args.goalId)) return [];
            q = q.eq('goal_id', args.goalId);
        }
        const rows = (must(await q.order('created_at', { ascending: false }).limit(limit)) as Row[] | null) ?? [];
        return rows.map(mapGoalReview);
    }

    // ── Input → columns ──────────────────────────────────────────────────────

    private async resolveAreaId(tenantId: string, ref: string): Promise<string> {
        let q = this.db.from('aos_memory_areas').select('id');
        q = isUuid(ref) ? q.eq('id', ref) : q.eq('tenant_id', tenantId).eq('slug', ref);
        const row = must(await q.maybeSingle()) as Row | null;
        if (!row) throw new Error(`Memory area "${ref}" not found`);
        return row.id;
    }

    private async resolveOwnerId(tenantId: string, ref: string): Promise<string> {
        const id = await this.svc.resolveAgentId(tenantId, ref);
        const row = must(await this.db.from('aos_agents').select('id').eq('id', id).maybeSingle()) as Row | null;
        if (!row) throw new Error(`Agent "${ref}" not found`);
        return row.id;
    }

    /** Validated column patch for the fields present in the input (no cross-field rules). */
    private async goalPatch(tenantId: string, input: AosGoalInput): Promise<Row> {
        const p: Row = {};
        if (input.title != null) {
            const title = input.title.trim();
            if (!title) throw new Error('Goal needs a title');
            p.title = title;
        }
        if (input.description != null) p.description = input.description;
        if (input.metric != null) p.metric = input.metric.trim();
        if (input.unit != null) p.unit = input.unit.trim();
        if (input.nextAction != null) p.next_action = input.nextAction.trim();
        if (input.color != null && input.color.trim()) p.color = input.color.trim();
        if (input.areaId !== undefined) p.area_id = input.areaId ? await this.resolveAreaId(tenantId, input.areaId) : null;
        if (input.ownerAgentId !== undefined) {
            p.owner_agent_id = input.ownerAgentId ? await this.resolveOwnerId(tenantId, input.ownerAgentId) : null;
        }
        if (input.targetValue !== undefined) p.target_value = input.targetValue === null ? null : finiteOrThrow(input.targetValue, 'targetValue');
        if (input.currentValue !== undefined) {
            p.current_value = input.currentValue === null ? null : finiteOrThrow(input.currentValue, 'currentValue');
        }
        if (input.windowDays != null) {
            const days = Math.round(finiteOrThrow(input.windowDays, 'windowDays'));
            if (days < MIN_WINDOW_DAYS || days > MAX_WINDOW_DAYS) {
                throw new Error(`Window must be between ${MIN_WINDOW_DAYS} and ${MAX_WINDOW_DAYS} days`);
            }
            p.window_days = days;
        }
        if (input.startsOn != null) p.starts_on = parseDate(input.startsOn);
        if (input.gateOn != null) p.gate_on = parseDate(input.gateOn);
        if (input.status != null) p.status = oneOf(input.status, GOAL_STATUSES, 'status');
        if (input.progress != null) p.progress = clamp01(finiteOrThrow(input.progress, 'progress'));
        if (input.nextActionDue !== undefined) p.next_action_due = input.nextActionDue ? parseDate(input.nextActionDue) : null;
        if (input.sortOrder != null) p.sort_order = Math.round(finiteOrThrow(input.sortOrder, 'sortOrder'));
        return p;
    }

    private static checkGate(startsOn: string, gateOn: string) {
        if (gateOn < startsOn) throw new Error('Gate date must be after the start date');
    }

    // ── Mutations ────────────────────────────────────────────────────────────

    async createGoal(tenantId: string | undefined, input: AosGoalInput, actor: AosActor): Promise<AosGoal> {
        const t = tenantOf(tenantId);
        if (!input || !(input.title ?? '').trim()) throw new Error('Goal needs a title');
        const row = await this.goalPatch(t, input);

        const startsOn: string = row.starts_on ?? todayIn(DEFAULT_DECK_TZ);
        // gateOn missing → startsOn + windowDays; gateOn given without windowDays → window = the span.
        if (row.gate_on === undefined) {
            row.window_days = row.window_days ?? DEFAULT_WINDOW_DAYS;
            row.gate_on = addDays(startsOn, row.window_days);
        } else if (row.window_days === undefined) {
            row.window_days = clampWindow(daysBetween(startsOn, row.gate_on));
        }
        row.starts_on = startsOn;
        AgenticOsGoals.checkGate(row.starts_on, row.gate_on);

        if (row.sort_order === undefined) {
            const last = (must(
                await this.db.from('aos_goals').select('sort_order').eq('tenant_id', t).order('sort_order', { ascending: false }).limit(1),
            ) as Row[] | null) ?? [];
            row.sort_order = last.length ? num(last[0].sort_order) + 1 : 0;
        }
        row.tenant_id = t;
        row.created_by = actor.id ?? null;

        const created = must(await this.db.from('aos_goals').insert(row).select('*').single()) as Row;
        await this.goalAudit(t, actor, {
            action: 'goal_created',
            entityId: created.id,
            summary: `Created goal "${created.title}" (gate ${dateStr(created.gate_on)})`,
            level: 'success',
        });
        return this.withRollup(created);
    }

    async updateGoal(id: string, input: AosGoalInput, actor: AosActor): Promise<AosGoal> {
        const row = await this.requireGoalRow(id);
        const patch = await this.goalPatch(row.tenant_id, input ?? {});

        const startsOn: string = patch.starts_on ?? dateStr(row.starts_on);
        if (patch.window_days !== undefined && patch.gate_on === undefined) {
            // A new window moves the gate.
            patch.gate_on = addDays(startsOn, patch.window_days);
        } else if ((patch.gate_on !== undefined || patch.starts_on !== undefined) && patch.window_days === undefined) {
            // New dates resize the window.
            patch.window_days = clampWindow(daysBetween(startsOn, patch.gate_on ?? dateStr(row.gate_on)));
        }
        AgenticOsGoals.checkGate(startsOn, patch.gate_on ?? dateStr(row.gate_on));

        if (!Object.keys(patch).length) return this.withRollup(row);
        const updated = must(await this.db.from('aos_goals').update(patch).eq('id', row.id).select('*').single()) as Row;
        await this.goalAudit(row.tenant_id, actor, {
            action: 'goal_updated',
            entityId: row.id,
            summary: `Updated goal "${updated.title}"`,
            diff: diffObjects(goalColumns(row), goalColumns(updated)),
        });
        return this.withRollup(updated);
    }

    async setGoalArchived(id: string, archived: boolean, actor: AosActor): Promise<AosGoal> {
        const row = await this.requireGoalRow(id);
        const updated = must(
            await this.db.from('aos_goals').update({ archived_at: archived ? nowIso() : null }).eq('id', row.id).select('*').single(),
        ) as Row;
        await this.goalAudit(row.tenant_id, actor, {
            action: archived ? 'goal_archived' : 'goal_restored',
            entityId: row.id,
            summary: `${archived ? 'Archived' : 'Restored'} goal "${row.title}"`,
            level: archived ? 'warning' : 'info',
        });
        return this.withRollup(updated);
    }

    /** Appends a gate review and applies it to the goal; returns the updated goal. */
    async reviewGoal(input: AosGoalReviewInput, actor: AosActor): Promise<AosGoal> {
        const goal = await this.requireGoalRow(input.goalId);
        if (goal.archived_at) throw new Error('Restore the goal before reviewing it');
        const verdict = oneOf(str(input.verdict).trim(), GOAL_VERDICTS, 'verdict');
        const progress = input.progress == null ? null : clamp01(finiteOrThrow(input.progress, 'progress'));
        const currentValue = input.currentValue == null ? null : finiteOrThrow(input.currentValue, 'currentValue');
        const nextAction = input.nextAction == null ? null : input.nextAction.trim();
        const oldGate = dateStr(goal.gate_on);
        const nextGateOn = input.nextGateOn ? parseDate(input.nextGateOn) : null;
        if (nextGateOn && nextGateOn <= oldGate) {
            throw new Error(`Next gate date must be after the current gate date (${oldGate})`);
        }

        const review = must(
            await this.db
                .from('aos_goal_reviews')
                .insert({
                    tenant_id: goal.tenant_id,
                    goal_id: goal.id,
                    verdict,
                    progress,
                    current_value: currentValue,
                    note: str(input.note).trim(),
                    next_action: nextAction,
                    next_gate_on: nextGateOn,
                    reviewed_by: actor.id ?? null,
                })
                .select('*')
                .single(),
        ) as Row;

        const patch: Row = { status: VERDICT_STATUS[verdict] };
        if (progress !== null) patch.progress = progress;
        if (currentValue !== null) patch.current_value = currentValue;
        if (nextAction !== null) patch.next_action = nextAction;
        if (nextGateOn) {
            // Roll the window: the old gate becomes the new start.
            patch.starts_on = oldGate;
            patch.gate_on = nextGateOn;
            patch.window_days = clampWindow(daysBetween(oldGate, nextGateOn));
        }
        const updated = must(await this.db.from('aos_goals').update(patch).eq('id', goal.id).select('*').single()) as Row;

        const label = VERDICT_LABEL[verdict] ?? verdict;
        await this.goalAudit(goal.tenant_id, actor, {
            action: 'goal_reviewed',
            entityId: goal.id,
            summary: `Reviewed goal "${goal.title}": ${label}${progress !== null ? ` (${Math.round(progress * 100)}%)` : ''}${
                nextGateOn ? ` — next gate ${nextGateOn}` : ''
            }`,
            level: verdict === 'on_track' || verdict === 'achieved' ? 'success' : 'warning',
            diff: { reviewId: review.id, verdict, ...(diffObjects(goalColumns(goal), goalColumns(updated)) ?? {}) },
        });
        return this.withRollup(updated);
    }

    // ── Command Deck stats ───────────────────────────────────────────────────

    async deckStats(timezone?: string | null, tenantId?: string): Promise<AosDeckStats> {
        const tz = (timezone ?? '').trim() || DEFAULT_DECK_TZ;
        if (!isValidTimezone(tz)) throw new Error(`Invalid timezone: ${tz}`);
        const data = must(await this.db.rpc('aos_deck_stats', { p_tenant: tenantOf(tenantId), p_tz: tz })) as Row | null;
        const j = data ?? {};
        return {
            now: nowIso(),
            timezone: tz,
            today: mapDay(j.today),
            yesterday: mapDay(j.yesterday),
            week: mapWeek(j.week),
            weeks: (Array.isArray(j.weeks) ? (j.weeks as Row[]) : []).map(mapWeekActivity),
        };
    }
}
