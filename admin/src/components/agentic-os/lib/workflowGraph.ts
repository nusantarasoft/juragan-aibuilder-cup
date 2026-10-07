/**
 * Agentic OS — workflow graph helpers (client side).
 * `validateGraph` mirrors the middleware rules so the builder can show problems
 * instantly; the server re-validates before a run starts.
 */

import type { OsAgent, OsPlaybook, WfAgentData, WfEdge, WfGraph, WfLabelData, WfNode } from "./types";

export const isAgentData = (n: WfNode): n is WfNode & { data: WfAgentData } => n.type === "agent";
export const nodeLabel = (n: WfNode): string => (n.type === "agent" ? (n.data as WfAgentData).title || "Agent step" : (n.data as WfLabelData).label || n.type);

export function asGraph(g: unknown): WfGraph {
    const o = (g ?? {}) as Partial<WfGraph>;
    return {
        nodes: Array.isArray(o.nodes) ? (o.nodes as WfNode[]) : [],
        edges: Array.isArray(o.edges) ? (o.edges as WfEdge[]) : [],
    };
}

export function emptyGraph(): WfGraph {
    return {
        nodes: [
            { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
            { id: "end", type: "end", position: { x: 520, y: 0 }, data: { label: "Done" } },
        ],
        edges: [],
    };
}

export function newAgentData(agent?: OsAgent): WfAgentData {
    return {
        agentId: agent?.id ?? "",
        playbookId: null,
        title: "",
        description: "",
        moduleId: agent?.modules[0] ?? "",
        steps: [],
        priority: "normal",
        waitFor: "review",
    };
}

export function uid(prefix: string) {
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

/** Topological order (Kahn). Returns null when the graph has a cycle. */
export function topoOrder(g: WfGraph): string[] | null {
    const indeg = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
    for (const e of g.edges) if (indeg.has(e.target)) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    const q = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
    const out: string[] = [];
    while (q.length) {
        const id = q.shift()!;
        out.push(id);
        for (const e of g.edges.filter((x) => x.source === id)) {
            const d = (indeg.get(e.target) ?? 0) - 1;
            indeg.set(e.target, d);
            if (d === 0) q.push(e.target);
        }
    }
    return out.length === g.nodes.length ? out : null;
}

export function validateGraph(g: WfGraph, agents: OsAgent[], playbooks: OsPlaybook[]): string[] {
    const issues: string[] = [];
    const ids = new Set(g.nodes.map((n) => n.id));
    const starts = g.nodes.filter((n) => n.type === "start");
    const ends = g.nodes.filter((n) => n.type === "end");
    if (starts.length !== 1) issues.push(starts.length ? "Only one Start node is allowed" : "Add a Start node");
    if (!ends.length) issues.push("Add at least one End node");
    for (const e of g.edges) if (!ids.has(e.source) || !ids.has(e.target)) issues.push(`Edge ${e.id} points to a missing node`);
    if (starts[0] && g.edges.some((e) => e.target === starts[0].id)) issues.push("Start cannot have incoming connections");
    for (const n of ends) if (g.edges.some((e) => e.source === n.id)) issues.push(`"${nodeLabel(n)}" (End) cannot have outgoing connections`);
    if (!topoOrder(g)) issues.push("The workflow has a loop — connections must flow one way");
    if (starts[0]) {
        const seen = new Set<string>([starts[0].id]);
        const stack = [starts[0].id];
        while (stack.length) {
            const id = stack.pop()!;
            for (const e of g.edges) if (e.source === id && !seen.has(e.target)) (seen.add(e.target), stack.push(e.target));
        }
        for (const n of g.nodes) if (!seen.has(n.id)) issues.push(`"${nodeLabel(n)}" is not connected to Start`);
    }
    for (const n of g.nodes) {
        if (!isAgentData(n)) continue;
        const a = agents.find((x) => x.id === n.data.agentId || x.slug === n.data.agentId);
        if (!a || a.archivedAt) issues.push(`"${nodeLabel(n)}" needs an active agent`);
        const pb = n.data.playbookId ? playbooks.find((p) => p.id === n.data.playbookId) : null;
        if (!pb && !n.data.title?.trim()) issues.push("Every agent step needs a playbook or a title");
    }
    return [...new Set(issues)];
}

/** Simple left-to-right layered layout (rank = longest path from start). */
export function autoLayout(g: WfGraph): WfGraph {
    const order = topoOrder(g);
    if (!order) return g;
    const rank = new Map<string, number>(order.map((id) => [id, 0]));
    for (const id of order) for (const e of g.edges.filter((x) => x.source === id)) rank.set(e.target, Math.max(rank.get(e.target) ?? 0, (rank.get(id) ?? 0) + 1));
    const byRank = new Map<number, string[]>();
    for (const id of order) byRank.set(rank.get(id)!, [...(byRank.get(rank.get(id)!) ?? []), id]);
    const pos = new Map<string, { x: number; y: number }>();
    for (const [r, list] of byRank) list.forEach((id, i) => pos.set(id, { x: r * 260, y: (i - (list.length - 1) / 2) * 180 }));
    return { ...g, nodes: g.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })) };
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    /** Module preference per agent step, used to pick a matching agent. */
    build: (pick: (modules: string[]) => OsAgent | undefined) => WfGraph;
}

const step = (id: string, agent: OsAgent | undefined, title: string, moduleId: string, extra: Partial<WfAgentData> = {}): WfNode => ({
    id,
    type: "agent",
    position: { x: 0, y: 0 },
    data: { ...newAgentData(agent), title, moduleId: agent?.modules.includes(moduleId) ? moduleId : agent?.modules[0] ?? moduleId, ...extra },
});
const gate = (id: string, label: string): WfNode => ({ id, type: "gate", position: { x: 0, y: 0 }, data: { label } });
const S: WfNode = { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } };
const E: WfNode = { id: "end", type: "end", position: { x: 0, y: 0 }, data: { label: "Done" } };
const chain = (...pairs: [string, string][]): WfEdge[] => pairs.map(([s, t]) => ({ id: `e-${s}-${t}`, source: s, target: t }));

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: "major-incident",
        name: "Major incident response",
        description: "Triage → commander approves → mitigation + customer update in parallel",
        build: (pick) =>
            autoLayout({
                nodes: [
                    S,
                    step("triage", pick(["itsm"]), "Triage the major incident", "itsm"),
                    gate("approve", "Incident commander approves the plan"),
                    step("mitigate", pick(["ops", "infrastructure", "devops"]), "Apply the mitigation", "ops"),
                    step("comms", pick(["crm", "command-center", "reports"]), "Draft the customer update", "crm"),
                    E,
                ],
                edges: chain(["start", "triage"], ["triage", "approve"], ["approve", "mitigate"], ["approve", "comms"], ["mitigate", "end"], ["comms", "end"]),
            }),
    },
    {
        id: "kb-from-ticket",
        name: "Ticket → knowledge article",
        description: "Resolve a ticket, draft a KB article, human approves publishing",
        build: (pick) =>
            autoLayout({
                nodes: [
                    S,
                    step("resolve", pick(["itsm"]), "Summarise the ticket resolution", "itsm"),
                    step("draft", pick(["knowledge", "itsm"]), "Draft a knowledge article", "knowledge"),
                    gate("publish", "Knowledge manager approves publishing"),
                    E,
                ],
                edges: chain(["start", "resolve"], ["resolve", "draft"], ["draft", "publish"], ["publish", "end"]),
            }),
    },
    {
        id: "release",
        name: "Release readiness",
        description: "Security scan + pipeline check in parallel, then a go/no-go gate",
        build: (pick) =>
            autoLayout({
                nodes: [
                    S,
                    step("sec", pick(["security"]), "Scan the release for vulnerabilities", "security"),
                    step("ci", pick(["devops"]), "Verify the pipeline and staging health", "devops"),
                    gate("go", "Release manager go / no-go"),
                    step("notes", pick(["reports", "pm"]), "Write the release notes", "reports"),
                    E,
                ],
                edges: chain(["start", "sec"], ["start", "ci"], ["sec", "go"], ["ci", "go"], ["go", "notes"], ["notes", "end"]),
            }),
    },
    {
        id: "month-end",
        name: "Month-end close",
        description: "Reconcile → report → CFO sign-off",
        build: (pick) =>
            autoLayout({
                nodes: [
                    S,
                    step("recon", pick(["accounting"]), "Reconcile the ledgers", "accounting"),
                    step("report", pick(["reports", "accounting"]), "Prepare the month-end report", "reports"),
                    gate("cfo", "CFO signs off"),
                    E,
                ],
                edges: chain(["start", "recon"], ["recon", "report"], ["report", "cfo"], ["cfo", "end"]),
            }),
    },
    {
        id: "facility-alarm",
        name: "Facility alarm handling",
        description: "Acknowledge the alarm → open a work order → verify recovery",
        build: (pick) =>
            autoLayout({
                nodes: [
                    S,
                    step("ack", pick(["bms", "scada", "dcim"]), "Acknowledge and assess the alarm", "bms"),
                    step("wo", pick(["itsm", "bms"]), "Open a work order for the technician", "itsm"),
                    step("verify", pick(["dcim", "bms"]), "Verify the telemetry is back to normal", "dcim", { waitFor: "done" }),
                    E,
                ],
                edges: chain(["start", "ack"], ["ack", "wo"], ["wo", "verify"], ["verify", "end"]),
            }),
    },
];

export const WF_RUN_META: Record<string, { label: string; color: string }> = {
    running: { label: "Running", color: "#38bdf8" },
    waiting_approval: { label: "Waiting approval", color: "#f59e0b" },
    success: { label: "Success", color: "#22c55e" },
    failed: { label: "Failed", color: "#ef4444" },
    cancelled: { label: "Cancelled", color: "#94a3b8" },
};

export const NODE_STATE_COLOR: Record<string, string> = {
    pending: "#475569",
    active: "#38bdf8",
    done: "#22c55e",
    failed: "#ef4444",
    cancelled: "#94a3b8",
    skipped: "#64748b",
};
