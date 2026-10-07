import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AgenticOsService, AosActor, isUuid, mapWorkflowRun, must, Row, stepsOf, tenantOf } from './agentic-os.service';
import { AosWorkflowRun } from './agentic-os.types';

const TICK_MS = 5000;
const HANDOFF_TASK_CHARS = 500;
const HANDOFF_GATE_CHARS = 2000;
const ACTIVE_RUN = ['running', 'waiting_approval'];
const NODE_TYPES = ['start', 'agent', 'gate', 'end'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
/** Task statuses a cancelled run takes down with it (review/done work is kept). */
const CANCELLABLE_TASKS = ['queued', 'running', 'awaiting_approval'];

export type WorkflowTrigger = 'manual' | 'routine' | 'event';
export type NodeStatus = 'pending' | 'active' | 'done' | 'failed' | 'cancelled';

/** One entry of aos_workflow_runs.node_states, keyed by node id. */
export interface NodeState {
    status: NodeStatus;
    taskId?: string;
    approvalId?: string;
    startedAt?: string;
    finishedAt?: string;
    /** Agent node: the task result (hand-off text). */
    output?: string;
    error?: string;
}

interface GraphNode {
    id: string;
    type: string;
    data: Row;
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
}

interface Graph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    byId: Map<string, GraphNode>;
    preds: Map<string, string[]>;
    succs: Map<string, string[]>;
}

type AgentIndex = Map<string, Row>;
type States = Record<string, NodeState>;

const nowIso = () => new Date().toISOString();
const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v)).trim();
const isObj = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);

/** Tolerant parse of the @xyflow/react graph JSON (preds/succs only for edges between existing nodes). */
function parseGraph(raw: unknown): Graph {
    const g = isObj(raw) ? raw : {};
    const nodes: GraphNode[] = (Array.isArray(g.nodes) ? g.nodes : []).filter(isObj).map((n) => ({
        id: text(n.id),
        type: text(n.type),
        data: isObj(n.data) ? n.data : {},
    }));
    const edges: GraphEdge[] = (Array.isArray(g.edges) ? g.edges : []).filter(isObj).map((e, i) => ({
        id: text(e.id) || `edge-${i + 1}`,
        source: text(e.source),
        target: text(e.target),
    }));
    const byId = new Map<string, GraphNode>();
    for (const n of nodes) if (n.id && !byId.has(n.id)) byId.set(n.id, n);
    const preds = new Map<string, string[]>();
    const succs = new Map<string, string[]>();
    for (const id of byId.keys()) {
        preds.set(id, []);
        succs.set(id, []);
    }
    for (const e of edges) {
        if (!byId.has(e.source) || !byId.has(e.target)) continue;
        const s = succs.get(e.source)!;
        const p = preds.get(e.target)!;
        if (!s.includes(e.target)) s.push(e.target);
        if (!p.includes(e.source)) p.push(e.source);
    }
    return { nodes: [...byId.values()], edges, byId, preds, succs };
}

function nodeLabel(n: GraphNode): string {
    return text(n.type === 'agent' ? n.data.title || n.data.label : n.data.label || n.data.title) || n.id;
}

/**
 * AgenticOsWorkflows — Phase 3 DAG engine.
 * A run snapshots the workflow graph; node_states tracks every node. Agent nodes
 * become aos_tasks at the front of the agent's queue (worked by the Phase 1
 * runner), gate nodes become `workflow_gate` approvals. A 5 s tick observes the
 * tasks/approvals, marks nodes done/failed and activates successors once ALL of
 * their predecessors are done.
 */
@Injectable()
export class AgenticOsWorkflows {
    private readonly logger = new Logger(AgenticOsWorkflows.name);
    private ticking = false;
    /** Runs currently being progressed in this process (start/tick never overlap on one run). */
    private readonly locks = new Set<string>();

    constructor(private readonly svc: AgenticOsService) {}

    // ════════════════════════════════════════════════════════════════════════
    // Validation
    // ════════════════════════════════════════════════════════════════════════

    /** Human-readable problems with a graph; an empty array means it can run. */
    async validateGraph(raw: unknown, tenantId?: string | null): Promise<string[]> {
        if (!isObj(raw) || !Array.isArray(raw.nodes)) return ['The workflow graph needs a list of nodes'];
        const issues: string[] = [];
        const g = parseGraph(raw);
        const rawNodes = (raw.nodes as unknown[]).filter(isObj);

        // Ids and types
        if (rawNodes.some((n) => !text(n.id))) issues.push('Every node needs an id');
        const seen = new Set<string>();
        for (const n of rawNodes) {
            const id = text(n.id);
            if (!id) continue;
            if (seen.has(id)) issues.push(`Node id "${id}" is used more than once`);
            seen.add(id);
        }
        for (const n of g.nodes) {
            if (!NODE_TYPES.includes(n.type)) {
                issues.push(`"${nodeLabel(n)}" has an unknown type "${n.type}" (use start, agent, gate or end)`);
            }
        }

        // Start / end
        const starts = g.nodes.filter((n) => n.type === 'start');
        const ends = g.nodes.filter((n) => n.type === 'end');
        if (starts.length === 0) issues.push('The workflow needs a Start node');
        if (starts.length > 1) issues.push(`The workflow has ${starts.length} Start nodes; keep exactly one`);
        if (ends.length === 0) issues.push('The workflow needs at least one End node');

        // Edges
        for (const e of g.edges) {
            if (!g.byId.has(e.source)) issues.push(`Connection "${e.id}" starts at a missing node "${e.source || '(none)'}"`);
            if (!g.byId.has(e.target)) issues.push(`Connection "${e.id}" ends at a missing node "${e.target || '(none)'}"`);
        }
        for (const s of starts) {
            if ((g.preds.get(s.id) ?? []).length) issues.push('Start cannot have incoming connections');
        }
        for (const e of ends) {
            if ((g.succs.get(e.id) ?? []).length) issues.push(`End "${nodeLabel(e)}" cannot have outgoing connections`);
        }

        // Cycles (Kahn): anything left with in-degree > 0 sits on or behind a loop.
        const indegree = new Map<string, number>();
        for (const n of g.nodes) indegree.set(n.id, (g.preds.get(n.id) ?? []).length);
        const queue = g.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
        let processed = 0;
        while (queue.length) {
            const id = queue.shift()!;
            processed++;
            for (const next of g.succs.get(id) ?? []) {
                indegree.set(next, (indegree.get(next) ?? 0) - 1);
                if (indegree.get(next) === 0) queue.push(next);
            }
        }
        if (processed < g.nodes.length) {
            const looped = g.nodes.filter((n) => (indegree.get(n.id) ?? 0) > 0).map((n) => `"${nodeLabel(n)}"`);
            issues.push(`The workflow has a loop (involving ${looped.slice(0, 3).join(', ')}${looped.length > 3 ? ', …' : ''})`);
        }

        // Reachability from start
        if (starts.length === 1) {
            const reached = new Set<string>([starts[0].id]);
            const stack = [starts[0].id];
            while (stack.length) {
                for (const next of g.succs.get(stack.pop()!) ?? []) {
                    if (!reached.has(next)) {
                        reached.add(next);
                        stack.push(next);
                    }
                }
            }
            for (const n of g.nodes) {
                if (!reached.has(n.id)) issues.push(`"${nodeLabel(n)}" is not connected to Start`);
            }
        }

        // Agent nodes: existing, non-archived agent + playbook or title
        const agentNodes = g.nodes.filter((n) => n.type === 'agent');
        if (agentNodes.length) {
            const agents = await this.agentIndex(tenantOf(tenantId));
            const playbookIds = agentNodes.map((n) => text(n.data.playbookId)).filter(isUuid);
            const playbooks = new Map<string, Row>();
            if (playbookIds.length) {
                const rows = must(await this.svc.db.from('aos_playbooks').select('id, title, archived_at').in('id', playbookIds)) as Row[];
                for (const p of rows ?? []) playbooks.set(p.id, p);
            }
            for (const n of agentNodes) {
                const label = nodeLabel(n);
                const ref = text(n.data.agentId);
                if (!ref) {
                    issues.push(`Agent step "${label}" has no agent assigned`);
                } else {
                    const agent = agents.get(ref);
                    if (!agent) issues.push(`Agent step "${label}": agent "${ref}" was not found`);
                    else if (agent.archived_at) issues.push(`Agent step "${label}": ${agent.name} is archived`);
                }
                const playbookId = text(n.data.playbookId);
                if (playbookId) {
                    const pb = playbooks.get(playbookId);
                    if (!pb) issues.push(`Agent step "${label}": playbook not found`);
                    else if (pb.archived_at) issues.push(`Agent step "${label}": playbook "${pb.title}" is archived`);
                } else if (!text(n.data.title)) {
                    issues.push(`Agent step "${n.id}" needs a playbook or a title`);
                }
            }
        }
        return issues;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Queries
    // ════════════════════════════════════════════════════════════════════════

    async listRuns(args: { tenantId?: string; workflowId?: string; status?: string; limit?: number }): Promise<AosWorkflowRun[]> {
        let q = this.svc.db.from('aos_workflow_runs').select('*').eq('tenant_id', tenantOf(args.tenantId));
        if (args.workflowId) q = q.eq('workflow_id', args.workflowId);
        if (args.status) q = q.eq('status', args.status);
        const limit = Math.max(1, Math.min(500, args.limit ?? 50));
        const rows = must(await q.order('started_at', { ascending: false }).limit(limit));
        return ((rows ?? []) as Row[]).map(mapWorkflowRun);
    }

    async getRun(id: string): Promise<AosWorkflowRun | null> {
        if (!isUuid(id)) return null;
        const row = must(await this.svc.db.from('aos_workflow_runs').select('*').eq('id', id).maybeSingle()) as Row | null;
        return row ? mapWorkflowRun(row) : null;
    }

    private async requireRunRow(id: string): Promise<Row> {
        const row = isUuid(id)
            ? (must(await this.svc.db.from('aos_workflow_runs').select('*').eq('id', id).maybeSingle()) as Row | null)
            : null;
        if (!row) throw new Error('Workflow run not found');
        return row;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Start / cancel
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Starts a run of a workflow. actor null = system (routine). Throws readable
     * errors: disabled workflow, kill switch, invalid graph.
     */
    async startRun(workflowId: string, trigger: WorkflowTrigger, actor: AosActor | null, routineId?: string | null): Promise<AosWorkflowRun> {
        const db = this.svc.db;
        const wf = isUuid(workflowId)
            ? (must(await db.from('aos_workflows').select('*').eq('id', workflowId).maybeSingle()) as Row | null)
            : null;
        if (!wf) throw new Error('Workflow not found');
        if (wf.archived_at || !wf.enabled) throw new Error('Workflow is disabled');
        const settings = await this.svc.getSettingsRow(wf.tenant_id);
        if (settings.kill_switch) throw new Error('Kill switch is on');
        const issues = await this.validateGraph(wf.graph, wf.tenant_id);
        if (issues.length) throw new Error(`Workflow has problems: ${issues[0]}`);

        const graph = parseGraph(wf.graph);
        const agents = await this.agentIndex(wf.tenant_id);
        const now = nowIso();
        const states: States = {};
        for (const n of graph.nodes) states[n.id] = n.type === 'start' ? { status: 'done', finishedAt: now } : { status: 'pending' };

        const id = randomUUID();
        this.locks.add(id); // before the insert, so the tick never sees an unlocked fresh run
        try {
            const run = must(
                await db
                    .from('aos_workflow_runs')
                    .insert({
                        id,
                        tenant_id: wf.tenant_id,
                        workflow_id: wf.id,
                        workflow_name: wf.name,
                        status: 'running',
                        trigger,
                        node_states: states,
                        graph_snapshot: wf.graph ?? {},
                        routine_id: routineId ?? null,
                        started_by: actor?.id ?? null,
                        started_at: now,
                    })
                    .select('*')
                    .single(),
            ) as Row;

            const agentSlugs: string[] = [];
            for (const n of graph.nodes) {
                if (n.type !== 'agent') continue;
                const slug = agents.get(text(n.data.agentId))?.slug;
                if (slug && !agentSlugs.includes(slug)) agentSlugs.push(slug);
            }
            await this.svc.audit(wf.tenant_id, {
                actorType: actor ? 'user' : 'system',
                actorId: actor?.id ?? null,
                action: 'workflow_started',
                entity: 'workflow',
                entityId: wf.id,
                summary: `Workflow "${wf.name}" started`,
                level: 'info',
                diff: { runId: id, agentSlugs, trigger, routineId: routineId ?? null },
            });
            const { error } = await db.from('aos_workflows').update({ last_run_at: now, last_status: 'running' }).eq('id', wf.id);
            if (error) this.logger.warn(`Workflow ${wf.id} last_run_at: ${error.message}`);

            try {
                await this.progress(run, agents);
            } catch (err) {
                await this.failRun(run, `Could not start: ${(err as Error).message}`);
            }
            return mapWorkflowRun(await this.requireRunRow(id));
        } finally {
            this.locks.delete(id);
        }
    }

    async cancelRun(id: string, actor: AosActor): Promise<AosWorkflowRun> {
        const db = this.svc.db;
        const run = await this.requireRunRow(id);
        if (!ACTIVE_RUN.includes(run.status)) throw new Error(`This run is already ${run.status}`);
        const now = nowIso();
        const states: States = JSON.parse(JSON.stringify(run.node_states ?? {}));
        for (const st of Object.values(states)) {
            if (st.status === 'active') Object.assign(st, { status: 'cancelled', finishedAt: now });
        }
        const saved = must(
            await db
                .from('aos_workflow_runs')
                .update({ status: 'cancelled', finished_at: now, node_states: states })
                .eq('id', run.id)
                .in('status', ACTIVE_RUN)
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        if (!saved) throw new Error('This run finished before it could be cancelled');

        const tasks = (must(
            await db
                .from('aos_tasks')
                .update({ status: 'cancelled', finished_at: now })
                .eq('workflow_run_id', run.id)
                .in('status', CANCELLABLE_TASKS)
                .select('id'),
        ) as Row[]) ?? [];
        const reject = { status: 'rejected', comment: 'Workflow cancelled', decided_by: actor.id ?? null, decided_at: now };
        const gates = (must(
            await db.from('aos_approvals').update(reject).eq('workflow_run_id', run.id).eq('status', 'pending').select('id'),
        ) as Row[]) ?? [];
        // Completion approvals of the cancelled tasks no longer need a decision either.
        let taskApprovals: Row[] = [];
        if (tasks.length) {
            taskApprovals = (must(
                await db.from('aos_approvals').update(reject).in('task_id', tasks.map((t) => t.id)).eq('status', 'pending').select('id'),
            ) as Row[]) ?? [];
        }

        await this.touchWorkflow(saved, 'cancelled');
        await this.svc.audit(run.tenant_id, {
            actorType: 'user',
            actorId: actor.id ?? null,
            action: 'workflow_cancelled',
            entity: 'workflow',
            entityId: run.workflow_id,
            summary: `Cancelled workflow "${run.workflow_name}"`,
            level: 'warning',
            diff: {
                runId: run.id,
                cancelledTasks: tasks.length,
                rejectedApprovals: gates.length + taskApprovals.length,
            },
        });
        return mapWorkflowRun(saved);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Tick
    // ════════════════════════════════════════════════════════════════════════

    @Interval(TICK_MS)
    async tick(): Promise<void> {
        if (this.ticking || process.env.AOS_WORKFLOWS_DISABLED === 'true') return;
        this.ticking = true;
        try {
            const runs = must(
                await this.svc.db
                    .from('aos_workflow_runs')
                    .select('*')
                    .in('status', ACTIVE_RUN)
                    .order('started_at', { ascending: true })
                    .limit(100),
            ) as Row[];
            if (!runs || !runs.length) return;
            const killSwitch = new Map<string, boolean>();
            const agentsByTenant = new Map<string, AgentIndex>();
            for (const run of runs) {
                if (this.locks.has(run.id)) continue;
                const t: string = run.tenant_id;
                try {
                    if (!killSwitch.has(t)) killSwitch.set(t, !!(await this.svc.getSettingsRow(t)).kill_switch);
                    if (killSwitch.get(t)) continue;
                    if (!agentsByTenant.has(t)) agentsByTenant.set(t, await this.agentIndex(t));
                } catch (err) {
                    this.logger.error(`Workflow tenant ${t}: ${(err as Error).message}`);
                    continue;
                }
                this.locks.add(run.id);
                try {
                    await this.progress(run, agentsByTenant.get(t));
                } catch (err) {
                    this.logger.error(`Workflow run ${run.id}: ${(err as Error).message}`);
                } finally {
                    this.locks.delete(run.id);
                }
            }
        } catch (err) {
            this.logger.error(`Workflow tick failed: ${(err as Error).message}`);
        } finally {
            this.ticking = false;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Engine
    // ════════════════════════════════════════════════════════════════════════

    /** Observe active nodes, activate ready ones, derive the run status and persist. */
    private async progress(run: Row, agentsIn?: AgentIndex): Promise<void> {
        const db = this.svc.db;
        const graph = parseGraph(run.graph_snapshot);
        const agents = agentsIn ?? (await this.agentIndex(run.tenant_id));
        const states: States = JSON.parse(JSON.stringify(run.node_states ?? {}));
        for (const n of graph.nodes) if (!states[n.id]) states[n.id] = { status: 'pending' };
        const now = nowIso();
        let changed = false;
        let failure: string | null = null;
        const createdTasks: string[] = [];
        const createdApprovals: string[] = [];

        // ── 1. Observe active agent / gate nodes ──────────────────────────────
        const activeAgents = graph.nodes.filter((n) => n.type === 'agent' && states[n.id].status === 'active');
        const activeGates = graph.nodes.filter((n) => n.type === 'gate' && states[n.id].status === 'active');

        const taskIds = activeAgents.map((n) => states[n.id].taskId).filter((v): v is string => !!v);
        const tasks = new Map<string, Row>();
        if (taskIds.length) {
            const rows = must(await db.from('aos_tasks').select('id, status, title, result, error').in('id', taskIds)) as Row[];
            for (const t of rows ?? []) tasks.set(t.id, t);
        }
        for (const node of activeAgents) {
            const st = states[node.id];
            const task = st.taskId ? tasks.get(st.taskId) : undefined;
            const title = task?.title ?? nodeLabel(node);
            const who = this.agentName(agents, node);
            if (!task) {
                Object.assign(st, { status: 'failed', error: 'Task was removed', finishedAt: now });
                failure = failure ?? `${who} could not finish "${title}"`;
                changed = true;
                continue;
            }
            const waitFor = node.data.waitFor === 'done' ? 'done' : 'review';
            if (task.status === 'done' || (waitFor === 'review' && task.status === 'review')) {
                Object.assign(st, { status: 'done', output: String(task.result ?? ''), finishedAt: now });
                changed = true;
            } else if (task.status === 'failed' || task.status === 'cancelled') {
                Object.assign(st, { status: 'failed', error: task.error || `Task ${task.status}`, finishedAt: now });
                failure = failure ?? `${who} could not finish "${title}"`;
                changed = true;
            }
        }

        const approvalIds = activeGates.map((n) => states[n.id].approvalId).filter((v): v is string => !!v);
        const approvals = new Map<string, Row>();
        if (approvalIds.length) {
            const rows = must(await db.from('aos_approvals').select('id, status, comment, decided_at').in('id', approvalIds)) as Row[];
            for (const a of rows ?? []) approvals.set(a.id, a);
        }
        for (const node of activeGates) {
            const st = states[node.id];
            const approval = st.approvalId ? approvals.get(st.approvalId) : undefined;
            const label = nodeLabel(node);
            if (!approval) {
                Object.assign(st, { status: 'failed', error: 'Approval was removed', finishedAt: now });
                failure = failure ?? `Rejected at "${label}": approval was removed`;
                changed = true;
            } else if (approval.status === 'approved') {
                Object.assign(st, { status: 'done', finishedAt: approval.decided_at ?? now });
                if (approval.comment) st.output = String(approval.comment);
                changed = true;
            } else if (approval.status === 'rejected') {
                Object.assign(st, { status: 'failed', error: approval.comment || 'Rejected', finishedAt: approval.decided_at ?? now });
                failure = failure ?? `Rejected at "${label}": ${approval.comment || 'no comment'}`;
                changed = true;
            }
        }

        // ── 2. Activate nodes whose predecessors are ALL done ─────────────────
        if (!failure) {
            let progressed = true;
            while (progressed && !failure) {
                progressed = false;
                for (const node of graph.nodes) {
                    if (states[node.id].status !== 'pending') continue;
                    const preds = graph.preds.get(node.id) ?? [];
                    if (!preds.length || !preds.every((p) => states[p]?.status === 'done')) continue;
                    progressed = changed = true;
                    if (node.type === 'agent') {
                        const res = await this.activateAgent(run, graph, states, node, agents);
                        if ('taskId' in res) {
                            createdTasks.push(res.taskId);
                            states[node.id] = { status: 'active', taskId: res.taskId, startedAt: now };
                        } else {
                            states[node.id] = { status: 'failed', error: res.error, startedAt: now, finishedAt: now };
                            failure = res.error;
                            break;
                        }
                    } else if (node.type === 'gate') {
                        const approvalId = await this.activateGate(run, graph, states, node, agents);
                        createdApprovals.push(approvalId);
                        states[node.id] = { status: 'active', approvalId, startedAt: now };
                    } else {
                        // end (and any stray start): nothing to wait for
                        states[node.id] = { status: 'done', startedAt: now, finishedAt: now };
                    }
                }
            }
        }

        // ── 3. Derive the run status ──────────────────────────────────────────
        const ends = graph.nodes.filter((n) => n.type === 'end');
        const anyActive = graph.nodes.some((n) => states[n.id].status === 'active');
        let status: string;
        if (failure) status = 'failed';
        else if (ends.length && ends.every((n) => states[n.id].status === 'done') && !anyActive) status = 'success';
        else status = graph.nodes.some((n) => n.type === 'gate' && states[n.id].status === 'active') ? 'waiting_approval' : 'running';
        if (!changed && status === run.status) return;

        const patch: Row = { node_states: states, status };
        if (status === 'success' || status === 'failed') patch.finished_at = now;
        if (failure) patch.error = failure;
        const saved = must(
            await db.from('aos_workflow_runs').update(patch).eq('id', run.id).in('status', ACTIVE_RUN).select('*').maybeSingle(),
        ) as Row | null;
        if (!saved) {
            // Cancelled underneath us: take back what this pass created.
            await this.undo(run, createdTasks, createdApprovals);
            return;
        }
        if (status !== run.status) await this.touchWorkflow(saved, status);

        if (status === 'success') {
            await this.svc.audit(run.tenant_id, {
                actorType: 'system',
                action: 'workflow_finished',
                entity: 'workflow',
                entityId: run.workflow_id,
                summary: `Workflow "${run.workflow_name}" finished`,
                level: 'success',
                diff: { runId: run.id, durationMs: Math.max(0, Date.now() - Date.parse(run.started_at)) },
            });
        } else if (status === 'failed') {
            await this.svc.audit(run.tenant_id, {
                actorType: 'system',
                action: 'workflow_failed',
                entity: 'workflow',
                entityId: run.workflow_id,
                summary: `Workflow "${run.workflow_name}" failed: ${failure}`,
                level: 'error',
                diff: { runId: run.id, error: failure },
            });
        }
    }

    /** Creates the node's task at the front of the agent's queue. */
    private async activateAgent(
        run: Row,
        graph: Graph,
        states: States,
        node: GraphNode,
        agents: AgentIndex,
    ): Promise<{ taskId: string } | { error: string }> {
        const db = this.svc.db;
        const data = node.data;
        const agent = agents.get(text(data.agentId));
        if (!agent || agent.archived_at) {
            return { error: `${agent?.name ?? 'The agent'} could not start "${nodeLabel(node)}" (agent missing or archived)` };
        }
        const playbookId = text(data.playbookId);
        const pb = isUuid(playbookId)
            ? (must(await db.from('aos_playbooks').select('*').eq('id', playbookId).maybeSingle()) as Row | null)
            : null;

        const nodeSteps = stepsOf(data.steps).map((s) => s.trim()).filter(Boolean);
        const modules: string[] = Array.isArray(agent.modules) ? agent.modules : [];
        const title = text(data.title) || text(pb?.title) || 'Workflow step';
        const moduleId = text(data.moduleId) || text(pb?.module_id) || modules[0] || 'agentic-os';
        const route = text(data.route) || text(pb?.route) || `/admin/${moduleId}`;
        const steps = nodeSteps.length ? nodeSteps : pb ? stepsOf(pb.steps) : [];
        const requiresApproval = typeof data.requiresApproval === 'boolean' ? data.requiresApproval : !!pb?.requires_approval;
        const priority = PRIORITIES.includes(text(data.priority)) ? text(data.priority) : text(pb?.priority) || 'normal';

        const from = this.agentAncestors(graph, node.id);
        let description = `${text(data.description) || text(pb?.description)}\n\nWorkflow: ${run.workflow_name}`.trimStart();
        for (const id of from) {
            const output = text(states[id]?.output);
            if (output) description += `\nHand-off from ${this.agentName(agents, graph.byId.get(id)!)}: ${output.slice(0, HANDOFF_TASK_CHARS)}`;
        }

        // Front of the agent's queue so it runs next.
        const first = must(
            await db
                .from('aos_tasks')
                .select('sort_order')
                .eq('tenant_id', run.tenant_id)
                .eq('agent_id', agent.id)
                .eq('status', 'queued')
                .is('archived_at', null)
                .order('sort_order', { ascending: true })
                .limit(1),
        ) as Row[];
        const sortOrder = first && first.length ? Number(first[0].sort_order) - 1 : 0;

        const task = must(
            await db
                .from('aos_tasks')
                .insert({
                    tenant_id: run.tenant_id,
                    agent_id: agent.id,
                    playbook_id: pb?.id ?? null,
                    workflow_id: run.workflow_id,
                    workflow_run_id: run.id,
                    node_id: node.id,
                    title,
                    description,
                    module_id: moduleId,
                    route,
                    steps,
                    priority,
                    requires_approval: requiresApproval,
                    status: 'queued',
                    source: 'workflow',
                    sort_order: sortOrder,
                    requested_by: run.started_by ?? null,
                })
                .select('id')
                .single(),
        ) as Row;

        await this.svc.audit(run.tenant_id, {
            actorType: 'system',
            action: 'create',
            entity: 'task',
            entityId: task.id,
            summary: `Workflow "${run.workflow_name}" queued "${title}" for ${agent.name}`,
            moduleId,
            route,
            diff: { workflowRunId: run.id, nodeId: node.id },
        });
        for (const id of from) {
            const prev = agents.get(text(graph.byId.get(id)?.data.agentId));
            await this.svc.audit(run.tenant_id, {
                actorType: prev?.slug ? 'agent' : 'system',
                actorId: prev?.slug ?? null,
                action: 'workflow_handoff',
                entity: 'workflow',
                entityId: run.workflow_id,
                summary: `${prev?.name ?? 'An agent'} handed off "${run.workflow_name}" to ${agent.name}`,
                moduleId,
                diff: { runId: run.id, fromNodeId: id, toNodeId: node.id, taskId: task.id },
            });
        }
        return { taskId: task.id };
    }

    /** Creates the gate's `workflow_gate` approval (decision-only). */
    private async activateGate(run: Row, graph: Graph, states: States, node: GraphNode, agents: AgentIndex): Promise<string> {
        const label = nodeLabel(node);
        const from = this.agentAncestors(graph, node.id);
        const handoff = from
            .map((id) => {
                const output = text(states[id]?.output);
                return output ? `${this.agentName(agents, graph.byId.get(id)!)}: ${output}` : '';
            })
            .filter(Boolean)
            .join('\n\n')
            .slice(0, HANDOFF_GATE_CHARS);
        const nearest = from.length ? agents.get(text(graph.byId.get(from[0])?.data.agentId)) ?? null : null;
        const summary = `Workflow "${run.workflow_name}": ${label}`;
        const approval = must(
            await this.svc.db
                .from('aos_approvals')
                .insert({
                    tenant_id: run.tenant_id,
                    task_id: null,
                    agent_id: nearest?.id ?? null,
                    action: 'workflow_gate',
                    summary,
                    payload: { workflowId: run.workflow_id, runId: run.id, nodeId: node.id, label, handoff },
                    workflow_run_id: run.id,
                    node_id: node.id,
                })
                .select('id')
                .single(),
        ) as Row;
        await this.svc.audit(run.tenant_id, {
            actorType: nearest?.slug ? 'agent' : 'system',
            actorId: nearest?.slug ?? null,
            action: 'request_approval',
            entity: 'approval',
            entityId: approval.id,
            summary,
            level: 'warning',
            diff: { workflowRunId: run.id, nodeId: node.id },
        });
        return approval.id;
    }

    /** Nearest agent nodes upstream of a node, looking through gates (nearest first). */
    private agentAncestors(graph: Graph, nodeId: string): string[] {
        const out: string[] = [];
        const seen = new Set<string>([nodeId]);
        const queue = [...(graph.preds.get(nodeId) ?? [])];
        while (queue.length) {
            const id = queue.shift()!;
            if (seen.has(id)) continue;
            seen.add(id);
            const n = graph.byId.get(id);
            if (!n) continue;
            if (n.type === 'agent') out.push(id);
            else if (n.type === 'gate') queue.push(...(graph.preds.get(id) ?? []));
        }
        return out;
    }

    private async failRun(run: Row, error: string): Promise<void> {
        const saved = must(
            await this.svc.db
                .from('aos_workflow_runs')
                .update({ status: 'failed', error, finished_at: nowIso() })
                .eq('id', run.id)
                .in('status', ACTIVE_RUN)
                .select('*')
                .maybeSingle(),
        ) as Row | null;
        if (!saved) return;
        await this.touchWorkflow(saved, 'failed');
        await this.svc.audit(run.tenant_id, {
            actorType: 'system',
            action: 'workflow_failed',
            entity: 'workflow',
            entityId: run.workflow_id,
            summary: `Workflow "${run.workflow_name}" failed: ${error}`,
            level: 'error',
            diff: { runId: run.id, error },
        });
    }

    private async undo(run: Row, taskIds: string[], approvalIds: string[]): Promise<void> {
        const db = this.svc.db;
        const now = nowIso();
        if (taskIds.length) {
            await db.from('aos_tasks').update({ status: 'cancelled', finished_at: now }).in('id', taskIds).in('status', CANCELLABLE_TASKS);
        }
        if (approvalIds.length) {
            await db
                .from('aos_approvals')
                .update({ status: 'rejected', comment: 'Workflow cancelled', decided_at: now })
                .in('id', approvalIds)
                .eq('status', 'pending');
        }
        if (taskIds.length || approvalIds.length) this.logger.warn(`Run ${run.id} changed state mid-tick; rolled back new work`);
    }

    /** Mirrors the run status on the workflow, unless a newer run has started since. */
    private async touchWorkflow(run: Row, status: string): Promise<void> {
        const db = this.svc.db;
        const wf = must(await db.from('aos_workflows').select('id, last_run_at').eq('id', run.workflow_id).maybeSingle()) as Row | null;
        if (!wf) return;
        if (wf.last_run_at && Date.parse(wf.last_run_at) > Date.parse(run.started_at)) return;
        const { error } = await db.from('aos_workflows').update({ last_status: status }).eq('id', wf.id);
        if (error) this.logger.warn(`Workflow ${wf.id} last_status: ${error.message}`);
    }

    // ── Agents ───────────────────────────────────────────────────────────────

    /** Tenant agents keyed by both uuid and slug (node agentId may be either). */
    private async agentIndex(tenantId: string): Promise<AgentIndex> {
        const rows = must(
            await this.svc.db.from('aos_agents').select('id, slug, name, modules, archived_at').eq('tenant_id', tenantId),
        ) as Row[];
        const index: AgentIndex = new Map();
        for (const a of rows ?? []) {
            index.set(a.id, a);
            if (a.slug) index.set(a.slug, a);
        }
        return index;
    }

    private agentName(agents: AgentIndex, node: GraphNode): string {
        return agents.get(text(node.data.agentId))?.name ?? 'An agent';
    }
}
