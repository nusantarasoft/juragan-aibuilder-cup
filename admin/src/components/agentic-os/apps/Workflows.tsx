"use client";

/**
 * Agentic OS — Workflows: multi-agent chains with hand-offs and approval gates.
 * Visual builder (@xyflow/react) + run history with a live node-state overlay.
 * Agents never close work: agent steps finish at "review" (or wait for the
 * human tick), and gates are decided by a human in Governance.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    Background,
    BackgroundVariant,
    Controls,
    Handle,
    MiniMap,
    Position,
    ReactFlow,
    addEdge,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type Node,
    type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Archive,
    ArchiveRestore,
    Bot,
    CircleStop,
    Copy,
    Flag,
    GitBranch,
    History,
    LayoutGrid,
    ListChecks,
    Play,
    Plus,
    Save,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    TriangleAlert,
    Workflow as WorkflowIcon,
    X,
} from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { phase3Api, validateWorkflow } from "../lib/api";
import { PRIORITY_META } from "../lib/catalog";
import { useOsUi } from "../lib/osUi";
import { runP3, startPhase3Polling, usePhase3Store } from "../lib/phase3Store";
import { agentById, useAosStore } from "../lib/store";
import type { OsAgent, OsWorkflow, OsWorkflowRun, Priority, WfAgentData, WfGraph, WfLabelData, WfNode, WfNodeState, WorkflowTrigger } from "../lib/types";
import {
    NODE_STATE_COLOR,
    WF_RUN_META,
    WORKFLOW_TEMPLATES,
    asGraph,
    autoLayout,
    emptyGraph,
    newAgentData,
    nodeLabel,
    uid,
    validateGraph,
} from "../lib/workflowGraph";
import { AgentDot, Button, Chip, EmptyState, Field, Section, Select, Tabs, TextArea, TextInput, Toggle, cx, timeAgo } from "../ui/kit";
import { StepsEditor } from "../ui/StepsEditor";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const RunStateCtx = createContext<Record<string, WfNodeState> | null>(null);

export function WfRunChip({ status }: { status: string | null | undefined }) {
    if (!status) return <Chip color="#64748b">never run</Chip>;
    const m = WF_RUN_META[status] ?? { label: status, color: "#94a3b8" };
    return <Chip color={m.color}>{m.label}</Chip>;
}

const duration = (a: string, b: string | null) => {
    const ms = (b ? new Date(b).getTime() : Date.now()) - new Date(a).getTime();
    const s = Math.round(ms / 1000);
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`;
};

const toFlow = (g: WfGraph): { nodes: Node[]; edges: Edge[] } => ({
    nodes: g.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position ?? { x: 0, y: 0 }, data: { ...n.data } })),
    edges: g.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
});

const fromFlow = (nodes: Node[], edges: Edge[]): WfGraph => ({
    nodes: nodes.map((n) => ({ id: n.id, type: n.type as WfNode["type"], position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data as WfNode["data"] })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
});

const edgeStyle = (states: Record<string, WfNodeState> | null, e: { source: string; target: string }) => {
    if (!states) return { stroke: "#64748b", strokeWidth: 1.6 };
    const s = states[e.source]?.status;
    const t = states[e.target]?.status;
    if (s === "done" && (t === "active" || t === "done")) return { stroke: t === "active" ? "#38bdf8" : "#22c55e", strokeWidth: 2.2 };
    return { stroke: "#334155", strokeWidth: 1.4 };
};

/* ------------------------------------------------------------------ */
/* Custom nodes                                                        */
/* ------------------------------------------------------------------ */

function StateRing({ id, children, color, selected, shape = "rounded-xl" }: { id: string; children: React.ReactNode; color: string; selected?: boolean; shape?: string }) {
    const states = useContext(RunStateCtx);
    const st = states?.[id];
    const ring = st ? NODE_STATE_COLOR[st.status] ?? "#475569" : selected ? "#818cf8" : `${color}66`;
    return (
        <div
            className={cx("relative border-2 bg-slate-900/95 shadow-xl backdrop-blur", shape, st?.status === "active" && "animate-pulse")}
            style={{ borderColor: ring, boxShadow: st?.status === "active" ? `0 0 18px ${ring}88` : selected ? "0 0 0 3px rgba(129,140,248,0.25)" : undefined }}
        >
            {children}
            {st && (
                <span className="absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-950" style={{ background: ring }}>
                    {st.status}
                </span>
            )}
        </div>
    );
}

const handleCls = "!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-slate-300";

function StartNode({ id, selected }: NodeProps) {
    return (
        <StateRing id={id} color="#22c55e" selected={selected} shape="rounded-full">
            <div className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-emerald-300">
                <Play className="h-3.5 w-3.5" /> Start
            </div>
            <Handle type="source" position={Position.Right} className={handleCls} />
        </StateRing>
    );
}

function EndNode({ id, data, selected }: NodeProps) {
    return (
        <StateRing id={id} color="#94a3b8" selected={selected} shape="rounded-full">
            <Handle type="target" position={Position.Left} className={handleCls} />
            <div className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-slate-200">
                <Flag className="h-3.5 w-3.5" /> {(data as WfLabelData).label || "Done"}
            </div>
        </StateRing>
    );
}

function GateNode({ id, data, selected }: NodeProps) {
    return (
        <StateRing id={id} color="#f59e0b" selected={selected}>
            <Handle type="target" position={Position.Left} className={handleCls} />
            <div className="w-[180px] px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Approval gate
                </div>
                <div className="mt-0.5 text-[12px] font-medium leading-snug text-white">{(data as WfLabelData).label || "Human approves"}</div>
            </div>
            <Handle type="source" position={Position.Right} className={handleCls} />
        </StateRing>
    );
}

function AgentNode({ id, data, selected }: NodeProps) {
    const d = data as WfAgentData;
    const agents = useAosStore((s) => s.agents);
    const playbooks = useAosStore((s) => s.playbooks);
    const a = agentById(agents, d.agentId);
    const pb = d.playbookId ? playbooks.find((p) => p.id === d.playbookId) : undefined;
    const mod = MODULES[(d.moduleId || pb?.moduleId) as ModuleId];
    const color = a?.color ?? "#818cf8";
    return (
        <StateRing id={id} color={color} selected={selected}>
            <Handle type="target" position={Position.Left} className={handleCls} />
            <div className="w-[210px] px-3 py-2">
                <div className="flex items-center gap-2">
                    <AgentDot color={color} name={a?.name ?? "?"} size={22} />
                    <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-white">{a?.name ?? "Pick an agent"}</div>
                        <div className="truncate text-[10px] text-slate-500">{a?.role ?? "—"}</div>
                    </div>
                </div>
                <div className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-200">{d.title || pb?.title || <span className="text-amber-300">Needs a title</span>}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {mod && <Chip color={mod.color}>{mod.name}</Chip>}
                    {pb && <Chip color="#34d399">playbook</Chip>}
                    <Chip color={d.waitFor === "done" ? "#22c55e" : "#a855f7"}>{d.waitFor === "done" ? "waits for ✓" : "until review"}</Chip>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className={handleCls} />
        </StateRing>
    );
}

const nodeTypes = { start: StartNode, end: EndNode, gate: GateNode, agent: AgentNode };

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export function Workflows({ initialWorkflowId, initialRunId, initialTab }: { initialWorkflowId?: string; initialRunId?: string; initialTab?: string }) {
    const { workflows, workflowRuns, includeArchived, setIncludeArchived, state, error } = usePhase3Store(
        useShallow((s) => ({ workflows: s.workflows, workflowRuns: s.workflowRuns, includeArchived: s.includeArchived, setIncludeArchived: s.setIncludeArchived, state: s.state, error: s.error })),
    );
    const [selected, setSelected] = useState<string | null>(initialWorkflowId ?? null);
    const [tab, setTab] = useState<"builder" | "runs">(initialTab === "runs" || initialRunId ? "runs" : "builder");
    const [runId, setRunId] = useState<string | null>(initialRunId ?? null);
    const [q, setQ] = useState("");
    const [picker, setPicker] = useState(false);

    useEffect(() => startPhase3Polling(4_000), []);

    useEffect(() => {
        if (!selected && workflows.length) setSelected(workflows.find((w) => !w.archivedAt)?.id ?? null);
    }, [selected, workflows]);

    const list = useMemo(() => {
        const s = q.trim().toLowerCase();
        return workflows.filter((w) => !s || w.name.toLowerCase().includes(s) || w.description.toLowerCase().includes(s));
    }, [workflows, q]);
    const wf = workflows.find((w) => w.id === selected);
    const activeRuns = workflowRuns.filter((r) => r.status === "running" || r.status === "waiting_approval");

    if (state === "unavailable") return <EmptyState icon={WorkflowIcon} title="Workflows are unavailable" hint={error ?? "The Agentic OS backend did not answer."} />;

    return (
        <div className="relative flex h-full min-h-0">
            <aside className="flex w-[260px] shrink-0 flex-col border-r border-white/10">
                <div className="space-y-2 border-b border-white/10 p-3">
                    <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 focus-within:border-indigo-400/50">
                            <Search className="h-3.5 w-3.5 text-slate-500" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Search workflows…" className="w-full bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none" />
                        </label>
                        <Button variant="primary" icon={Plus} title="New workflow" onClick={() => setPicker(true)} />
                    </div>
                    <Toggle checked={includeArchived} onChange={setIncludeArchived} label="Show archived" />
                </div>
                {activeRuns.length > 0 && (
                    <div className="border-b border-white/10 p-2">
                        <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Running now</div>
                        {activeRuns.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                    setSelected(r.workflowId);
                                    setRunId(r.id);
                                    setTab("runs");
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-white/5"
                            >
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: WF_RUN_META[r.status]?.color }} />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-200">{r.workflowName}</span>
                                <span className="text-[9px] text-slate-500">{duration(r.startedAt, null)}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                    {list.map((w) => {
                        const g = asGraph(w.graph);
                        const steps = g.nodes.filter((n) => n.type === "agent").length;
                        const gates = g.nodes.filter((n) => n.type === "gate").length;
                        return (
                            <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                    setSelected(w.id);
                                    setRunId(null);
                                }}
                                className={cx("w-full rounded-lg border px-2.5 py-2 text-left transition", selected === w.id ? "border-white/20 bg-white/10" : "border-transparent hover:bg-white/5", w.archivedAt && "opacity-50")}
                            >
                                <div className="flex items-center gap-2">
                                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-purple-300" />
                                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">{w.name}</span>
                                    {!w.enabled && <Chip color="#64748b">off</Chip>}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 pl-[22px] text-[10px] text-slate-500">
                                    <span>
                                        {steps} step{steps === 1 ? "" : "s"} · {gates} gate{gates === 1 ? "" : "s"} · {w.trigger}
                                    </span>
                                    <span className="ml-auto">
                                        <WfRunChip status={w.lastStatus} />
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                    {!list.length && <div className="p-3 text-[11px] text-slate-500">No workflows yet.</div>}
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {wf ? (
                    <>
                        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                            <Tabs
                                value={tab}
                                onChange={setTab}
                                tabs={[
                                    { id: "builder", label: "Builder", icon: WorkflowIcon },
                                    { id: "runs", label: "Runs", icon: History, badge: workflowRuns.filter((r) => r.workflowId === wf.id && (r.status === "running" || r.status === "waiting_approval")).length },
                                ]}
                            />
                            <div className="ml-auto truncate text-[11px] text-slate-500">
                                {wf.lastRunAt ? `Last run ${timeAgo(wf.lastRunAt)}` : "Never run"}
                            </div>
                        </div>
                        <div className="min-h-0 flex-1">
                            {tab === "builder" ? (
                                <Builder
                                    key={wf.id}
                                    workflow={wf}
                                    onStarted={(r) => {
                                        setRunId(r.id);
                                        setTab("runs");
                                    }}
                                />
                            ) : (
                                <RunsTab workflow={wf} runId={runId} onRun={setRunId} />
                            )}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon={WorkflowIcon}
                        title="Chain agents together"
                        hint="A workflow hands work from one agent to the next, waits for human approval at gates and can run on a Pulse schedule."
                        action={
                            <Button variant="primary" icon={Plus} onClick={() => setPicker(true)}>
                                New workflow
                            </Button>
                        }
                    />
                )}
            </div>

            {picker && (
                <TemplatePicker
                    onClose={() => setPicker(false)}
                    onCreated={(w) => {
                        setPicker(false);
                        setSelected(w.id);
                        setTab("builder");
                    }}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Template picker                                                     */
/* ------------------------------------------------------------------ */

function pickerFor(agents: OsAgent[]) {
    const used = new Map<string, number>();
    return (modules: string[]) => {
        const live = agents.filter((a) => !a.archivedAt);
        const cands = live.filter((a) => modules.some((m) => a.modules.includes(m)));
        const pool = cands.length ? cands : live;
        const best = [...pool].sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0))[0];
        if (best) used.set(best.id, (used.get(best.id) ?? 0) + 1);
        return best;
    };
}

function TemplatePicker({ onClose, onCreated }: { onClose: () => void; onCreated: (w: OsWorkflow) => void }) {
    const agents = useAosStore((s) => s.agents);
    const [busy, setBusy] = useState<string | null>(null);

    const create = async (id: string, name: string, description: string, graph: WfGraph) => {
        setBusy(id);
        const out = await runP3(`Workflow "${name}" created`, () => phase3Api.createWorkflow({ name, description, trigger: "manual", enabled: true, graph }));
        setBusy(null);
        if (out) onCreated(out);
    };

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-300" />
                    <div className="flex-1 text-[14px] font-semibold text-white">New workflow</div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => void create("blank", "Untitled workflow", "", emptyGraph())}
                        className="rounded-xl border border-dashed border-white/15 p-3 text-left transition hover:bg-white/5"
                    >
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                            <Plus className="h-4 w-4" /> Blank canvas {busy === "blank" && "…"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">Start → Done; add agent steps and gates yourself.</div>
                    </button>
                    {WORKFLOW_TEMPLATES.map((t) => {
                        const g = t.build(pickerFor(agents));
                        const steps = g.nodes.filter((n) => n.type === "agent");
                        return (
                            <button key={t.id} type="button" onClick={() => void create(t.id, t.name, t.description, g)} className="rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/5">
                                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                                    <GitBranch className="h-4 w-4 text-purple-300" /> {t.name} {busy === t.id && "…"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">{t.description}</div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {steps.map((n) => {
                                        const a = agentById(agents, (n.data as WfAgentData).agentId);
                                        return (
                                            <Chip key={n.id} color={a?.color}>
                                                {a?.name ?? "?"}
                                            </Chip>
                                        );
                                    })}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

function Builder({ workflow, onStarted }: { workflow: OsWorkflow; onStarted: (r: OsWorkflowRun) => void }) {
    const { agents, playbooks } = useAosStore(useShallow((s) => ({ agents: s.agents, playbooks: s.playbooks })));
    const workflowRuns = usePhase3Store((s) => s.workflowRuns);
    const initial = useMemo(() => toFlow(asGraph(workflow.graph)), [workflow.graph]);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
    const [meta, setMeta] = useState({ name: workflow.name, description: workflow.description, trigger: workflow.trigger as WorkflowTrigger, enabled: workflow.enabled });
    const [sel, setSel] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [serverIssues, setServerIssues] = useState<string[] | null>(null);
    const [overlay, setOverlay] = useState(true);

    const graph = useMemo(() => fromFlow(nodes, edges), [nodes, edges]);
    const issues = useMemo(() => validateGraph(graph, agents, playbooks), [graph, agents, playbooks]);
    const savedGraph = useMemo(() => JSON.stringify(fromFlow(initial.nodes, initial.edges)), [initial]);
    const dirty =
        JSON.stringify(graph) !== savedGraph ||
        meta.name !== workflow.name ||
        meta.description !== workflow.description ||
        meta.trigger !== workflow.trigger ||
        meta.enabled !== workflow.enabled;
    const liveRun = workflowRuns.find((r) => r.workflowId === workflow.id && (r.status === "running" || r.status === "waiting_approval"));
    const states = overlay && liveRun ? liveRun.nodeStates : null;

    const onConnect = useCallback(
        (c: Connection) => {
            if (c.source === c.target) return;
            setEdges((eds) => addEdge({ ...c, id: `e-${c.source}-${c.target}` }, eds));
        },
        [setEdges],
    );

    const add = (type: WfNode["type"]) => {
        const id = uid(type === "agent" ? "n" : type === "gate" ? "g" : "end");
        const maxX = Math.max(0, ...nodes.map((n) => n.position.x));
        const data = type === "agent" ? newAgentData(agents.find((a) => !a.archivedAt && a.status === "active")) : { label: type === "gate" ? "Lead approves" : "Done" };
        setNodes((ns) => [...ns, { id, type, position: { x: maxX + 60, y: 160 + Math.random() * 60 }, data }]);
        setSel(id);
    };

    const updateNode = (id: string, patch: Record<string, unknown>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    const removeNode = (id: string) => {
        setNodes((ns) => ns.filter((n) => n.id !== id));
        setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
        setSel(null);
    };
    const layout = () => {
        const g = autoLayout(graph);
        setNodes((ns) => ns.map((n) => ({ ...n, position: g.nodes.find((x) => x.id === n.id)?.position ?? n.position })));
    };

    /** Delete/Backspace on the canvas removes the selection (Start is kept). */
    const onCanvasKey = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;
        const doomed = new Set(nodes.filter((n) => n.selected && n.type !== "start").map((n) => n.id));
        if (!doomed.size && !edges.some((x) => x.selected)) return;
        e.preventDefault();
        setNodes((ns) => ns.filter((n) => !doomed.has(n.id)));
        setEdges((es) => es.filter((x) => !x.selected && !doomed.has(x.source) && !doomed.has(x.target)));
        if (sel && doomed.has(sel)) setSel(null);
    };

    const save = async () => {
        setSaving(true);
        const out = await runP3("Workflow saved", () => phase3Api.updateWorkflow(workflow.id, { ...meta, name: meta.name.trim() || "Untitled workflow", graph }));
        setSaving(false);
        return out;
    };

    const checkServer = async () => {
        try {
            setServerIssues(await validateWorkflow(graph));
        } catch (e) {
            useAosStore.getState().toast("error", e instanceof Error ? e.message : String(e));
        }
    };

    const run = async () => {
        if (issues.length) return;
        setRunning(true);
        if (dirty && !(await save())) {
            setRunning(false);
            return;
        }
        const r = await runP3(`"${meta.name}" started — agents are heading to the War Room`, () => phase3Api.runWorkflow(workflow.id));
        setRunning(false);
        if (r) onStarted(r);
    };

    const duplicate = async () => {
        await runP3("Workflow duplicated", () => phase3Api.createWorkflow({ name: `${meta.name} (copy)`, description: meta.description, trigger: "manual", enabled: false, graph }));
    };

    const selNode = nodes.find((n) => n.id === sel);
    const styledEdges = edges.map((e) => ({ ...e, type: "smoothstep", animated: !!states && states[e.source]?.status === "done" && states[e.target]?.status === "active", style: edgeStyle(states, e) }));

    return (
        <div className="flex h-full min-h-0">
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                    <TextInput value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} className="!w-56 font-semibold" />
                    <Select
                        value={meta.trigger}
                        onChange={(v) => setMeta((m) => ({ ...m, trigger: v as WorkflowTrigger }))}
                        className="!w-32"
                        options={[
                            { value: "manual", label: "Manual" },
                            { value: "routine", label: "Pulse routine" },
                            { value: "event", label: "Event" },
                        ]}
                    />
                    <div className="w-28">
                        <Toggle checked={meta.enabled} onChange={(v) => setMeta((m) => ({ ...m, enabled: v }))} label="Enabled" />
                    </div>
                    <span className="mx-1 h-5 w-px bg-white/10" />
                    <Button size="sm" icon={Bot} onClick={() => add("agent")}>
                        Agent step
                    </Button>
                    <Button size="sm" icon={ShieldCheck} onClick={() => add("gate")}>
                        Gate
                    </Button>
                    <Button size="sm" icon={Flag} onClick={() => add("end")}>
                        End
                    </Button>
                    <Button size="sm" icon={LayoutGrid} variant="ghost" onClick={layout} title="Auto-arrange left to right" />
                    <div className="ml-auto flex items-center gap-1.5">
                        <Button size="sm" icon={ListChecks} variant="ghost" onClick={checkServer} title="Ask the server to validate">
                            Validate
                        </Button>
                        <Button size="sm" icon={Copy} variant="ghost" onClick={duplicate} title="Duplicate" />
                        {!workflow.archivedAt ? (
                            <Button size="sm" icon={Archive} variant="danger" onClick={() => void runP3("Workflow archived", () => phase3Api.archiveWorkflow(workflow.id))} title="Archive" />
                        ) : (
                            <Button size="sm" icon={ArchiveRestore} onClick={() => void runP3("Workflow restored", () => phase3Api.restoreWorkflow(workflow.id))}>
                                Restore
                            </Button>
                        )}
                        <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={() => void save()}>
                            Save
                        </Button>
                        <Button
                            variant="success"
                            icon={Play}
                            loading={running}
                            disabled={issues.length > 0 || !meta.enabled || !!workflow.archivedAt}
                            onClick={run}
                            title={issues.length ? "Fix the problems first" : !meta.enabled ? "Enable the workflow first" : dirty ? "Save and run" : "Run now"}
                        >
                            Run
                        </Button>
                    </div>
                </div>
                {(issues.length > 0 || (serverIssues && serverIssues.length > 0)) && (
                    <div className="flex items-start gap-2 border-b border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{[...new Set([...issues, ...(serverIssues ?? [])])].join(" · ")}</span>
                    </div>
                )}
                {serverIssues && serverIssues.length === 0 && issues.length === 0 && (
                    <div className="border-b border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200">Server says: ready to run.</div>
                )}
                {liveRun && (
                    <div className="flex items-center gap-2 border-b border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />A run is {WF_RUN_META[liveRun.status]?.label.toLowerCase()} — started {timeAgo(liveRun.startedAt)}
                        <label className="ml-auto flex items-center gap-1.5">
                            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> show live state
                        </label>
                    </div>
                )}
                <div className="min-h-0 flex-1" onKeyDown={onCanvasKey}>
                    <RunStateCtx.Provider value={states}>
                        <ReactFlow
                            nodes={nodes}
                            edges={styledEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={(_, n) => setSel(n.id)}
                            onPaneClick={() => setSel(null)}
                            nodeTypes={nodeTypes}
                            colorMode="dark"
                            fitView
                            fitViewOptions={{ padding: 0.25 }}
                            deleteKeyCode={null}
                            proOptions={{ hideAttribution: true }}
                            style={{ background: "transparent" }}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
                            <Controls showInteractive={false} />
                            <MiniMap pannable zoomable maskColor="rgba(2,6,23,0.7)" style={{ background: "#0f172a" }} nodeColor={(n) => (n.type === "gate" ? "#f59e0b" : n.type === "agent" ? "#818cf8" : "#64748b")} />
                        </ReactFlow>
                    </RunStateCtx.Provider>
                </div>
            </div>

            <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-white/10">
                {selNode ? (
                    <NodeInspector node={selNode} onChange={(p) => updateNode(selNode.id, p)} onRemove={() => removeNode(selNode.id)} state={liveRun?.nodeStates[selNode.id]} />
                ) : (
                    <div className="space-y-3 p-4">
                        <Field label="Description">
                            <TextArea rows={3} value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} placeholder="When and why to run this workflow" />
                        </Field>
                        <Section title="How it runs" icon={GitBranch}>
                            <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
                                <li>Drag from a node&apos;s right handle to the next node. A node starts when <b>all</b> incoming steps are done (parallel branches join).</li>
                                <li>Agent steps become tasks at the front of the agent&apos;s queue. They count as done at <b>review</b>, or when a human ticks them (“waits for ✓”).</li>
                                <li>Each step receives the previous agents&apos; output as a hand-off.</li>
                                <li>Gates create an approval in Governance; rejecting fails the run.</li>
                                <li>While a run is active, its agents meet in the War Room of the Virtual Office.</li>
                                <li>Schedule it from Pulse with a routine of kind “Workflow”.</li>
                            </ul>
                        </Section>
                        <div className="text-[10px] text-slate-600">Select a node to edit it · Delete/Backspace removes the selection.</div>
                    </div>
                )}
            </aside>
        </div>
    );
}

function NodeInspector({ node, onChange, onRemove, state }: { node: Node; onChange: (p: Record<string, unknown>) => void; onRemove: () => void; state?: WfNodeState }) {
    const { agents, playbooks } = useAosStore(useShallow((s) => ({ agents: s.agents, playbooks: s.playbooks })));
    const launch = useOsUi((s) => s.launch);

    const stateBox = state && (
        <div className="rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: `${NODE_STATE_COLOR[state.status]}55`, color: NODE_STATE_COLOR[state.status] }}>
            <div className="font-semibold uppercase">{state.status}</div>
            {state.taskId && (
                <button type="button" className="mt-1 text-sky-300 underline" onClick={() => launch("tasks", {})}>
                    Open the task
                </button>
            )}
            {state.approvalId && (
                <button type="button" className="mt-1 block text-amber-300 underline" onClick={() => launch("governance", { tab: "inbox" })}>
                    Decide in Governance
                </button>
            )}
            {state.output && <div className="mt-1 line-clamp-6 whitespace-pre-wrap text-slate-300">{state.output}</div>}
        </div>
    );

    if (node.type !== "agent") {
        const d = node.data as WfLabelData;
        return (
            <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold capitalize text-white">
                    {node.type === "gate" ? <ShieldCheck className="h-4 w-4 text-amber-300" /> : node.type === "start" ? <Play className="h-4 w-4 text-emerald-300" /> : <Flag className="h-4 w-4" />}
                    {node.type === "gate" ? "Approval gate" : node.type}
                </div>
                {stateBox}
                {node.type !== "start" && (
                    <Field label={node.type === "gate" ? "What the human approves" : "Label"}>
                        <TextInput value={d.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} />
                    </Field>
                )}
                {node.type === "gate" && <div className="text-[11px] text-slate-500">The approver sees this label plus everything the previous agents handed off (up to 2,000 chars).</div>}
                {node.type !== "start" && (
                    <Button variant="danger" icon={Trash2} onClick={onRemove}>
                        Remove node
                    </Button>
                )}
            </div>
        );
    }

    const d = node.data as WfAgentData;
    const agent = agentById(agents, d.agentId);
    const pbs = playbooks.filter((p) => !p.archivedAt && p.enabled && (!agent || agent.modules.includes(p.moduleId)));
    const modOpts = (agent?.modules.length ? agent.modules : Object.keys(MODULES)).map((m) => ({ value: m, label: MODULES[m as ModuleId]?.name ?? m }));

    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                <Bot className="h-4 w-4 text-indigo-300" /> Agent step
            </div>
            {stateBox}
            <Field label="Agent">
                <Select
                    value={agent?.id ?? ""}
                    onChange={(v) => {
                        const a = agents.find((x) => x.id === v);
                        onChange({ agentId: v, moduleId: a && !a.modules.includes(d.moduleId) ? a.modules[0] ?? "" : d.moduleId });
                    }}
                    options={[{ value: "", label: "— Pick an agent —" }, ...agents.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: `${a.name} · ${a.role}` }))]}
                />
            </Field>
            <Field label="Playbook" hint="Optional — fills steps & module">
                <Select
                    value={d.playbookId ?? ""}
                    onChange={(v) => {
                        const pb = playbooks.find((p) => p.id === v);
                        onChange(pb ? { playbookId: v, moduleId: pb.moduleId, title: d.title || pb.title, steps: d.steps.length ? d.steps : [...pb.steps] } : { playbookId: null });
                    }}
                    options={[{ value: "", label: "— none —" }, ...pbs.map((p) => ({ value: p.id, label: `${MODULES[p.moduleId as ModuleId]?.name ?? p.moduleId} · ${p.title}` }))]}
                />
            </Field>
            <Field label="Task title">
                <TextInput value={d.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="What should the agent do?" />
            </Field>
            <Field label="Instructions">
                <TextArea rows={3} value={d.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Context for the agent (hand-off notes are added automatically)" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
                <Field label="Module">
                    <Select value={d.moduleId} onChange={(v) => onChange({ moduleId: v })} options={[{ value: "", label: "—" }, ...modOpts]} />
                </Field>
                <Field label="Priority">
                    <Select value={d.priority} onChange={(v) => onChange({ priority: v as Priority })} options={Object.entries(PRIORITY_META).map(([k, v]) => ({ value: k, label: v.label }))} />
                </Field>
            </div>
            <Field label="Step counts as done when">
                <div className="grid grid-cols-2 gap-1.5">
                    {(["review", "done"] as const).map((w) => (
                        <button
                            key={w}
                            type="button"
                            onClick={() => onChange({ waitFor: w })}
                            className={cx("rounded-lg border px-2 py-1.5 text-left text-[11px] transition", d.waitFor === w ? "border-indigo-400/50 bg-indigo-500/10 text-white" : "border-white/10 text-slate-400 hover:bg-white/5")}
                        >
                            <div className="font-semibold">{w === "review" ? "Agent finishes" : "Human confirms"}</div>
                            <div className="text-[10px] text-slate-500">{w === "review" ? "task reaches Review" : "task is ticked Done"}</div>
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="Steps">
                <StepsEditor steps={d.steps} onChange={(s) => onChange({ steps: s })} color={agent?.color} />
            </Field>
            <Button variant="danger" icon={Trash2} onClick={onRemove}>
                Remove step
            </Button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

function RunsTab({ workflow, runId, onRun }: { workflow: OsWorkflow; runId: string | null; onRun: (id: string) => void }) {
    const workflowRuns = usePhase3Store((s) => s.workflowRuns);
    const runs = workflowRuns.filter((r) => r.workflowId === workflow.id);
    const run = runs.find((r) => r.id === runId) ?? runs[0];

    return (
        <div className="flex h-full min-h-0">
            <div className="w-[260px] shrink-0 overflow-y-auto border-r border-white/10 p-2">
                {runs.map((r) => (
                    <button
                        key={r.id}
                        type="button"
                        onClick={() => onRun(r.id)}
                        className={cx("mb-1 w-full rounded-lg border px-2.5 py-2 text-left transition", run?.id === r.id ? "border-white/20 bg-white/10" : "border-transparent hover:bg-white/5")}
                    >
                        <div className="flex items-center gap-2">
                            <WfRunChip status={r.status} />
                            <span className="ml-auto text-[10px] text-slate-500">{timeAgo(r.startedAt)}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">
                            #{r.id.slice(0, 8)} · {r.trigger} · {duration(r.startedAt, r.finishedAt)}
                        </div>
                    </button>
                ))}
                {!runs.length && <div className="p-3 text-[11px] text-slate-500">No runs yet. Press Run in the builder.</div>}
            </div>
            <div className="min-w-0 flex-1">{run ? <RunDetailView key={run.id} run={run} /> : <EmptyState icon={History} title="No runs yet" />}</div>
        </div>
    );
}

export function RunDetailView({ run }: { run: OsWorkflowRun }) {
    const agents = useAosStore((s) => s.agents);
    const launch = useOsUi((s) => s.launch);
    const g = asGraph(run.graphSnapshot);
    const flow = useMemo(() => toFlow(g), [run.graphSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps
    const active = run.status === "running" || run.status === "waiting_approval";
    const ordered = g.nodes
        .filter((n) => n.type !== "start")
        .map((n) => ({ n, s: run.nodeStates[n.id] }))
        .sort((a, b) => (a.s?.startedAt ?? a.s?.finishedAt ?? "~").localeCompare(b.s?.startedAt ?? b.s?.finishedAt ?? "~"));

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                <WfRunChip status={run.status} />
                <span className="text-[12px] font-semibold text-white">{run.workflowName}</span>
                <span className="text-[11px] text-slate-500">
                    #{run.id.slice(0, 8)} · {run.trigger} · started {timeAgo(run.startedAt)} · {duration(run.startedAt, run.finishedAt)}
                </span>
                <div className="ml-auto flex gap-1.5">
                    {run.status === "waiting_approval" && (
                        <Button size="sm" icon={ShieldCheck} onClick={() => launch("governance", { tab: "inbox" })}>
                            Open approvals
                        </Button>
                    )}
                    {active && (
                        <Button size="sm" variant="danger" icon={CircleStop} onClick={() => void runP3("Workflow run cancelled", () => phase3Api.cancelWorkflowRun(run.id))}>
                            Cancel run
                        </Button>
                    )}
                </div>
            </div>
            {run.error && <div className="border-b border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200">{run.error}</div>}
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px]">
                <div className="min-h-0">
                    <RunStateCtx.Provider value={run.nodeStates}>
                        <ReactFlow
                            nodes={flow.nodes}
                            edges={flow.edges.map((e) => ({ ...e, type: "smoothstep", animated: run.nodeStates[e.target]?.status === "active", style: edgeStyle(run.nodeStates, e) }))}
                            nodeTypes={nodeTypes}
                            colorMode="dark"
                            fitView
                            fitViewOptions={{ padding: 0.25 }}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            proOptions={{ hideAttribution: true }}
                            style={{ background: "transparent" }}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
                            <Controls showInteractive={false} />
                        </ReactFlow>
                    </RunStateCtx.Provider>
                </div>
                <div className="overflow-y-auto border-l border-white/10 p-3">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Timeline</div>
                    <div className="space-y-1.5">
                        {ordered.map(({ n, s }) => {
                            const color = NODE_STATE_COLOR[s?.status ?? "pending"];
                            const a = n.type === "agent" ? agentById(agents, (n.data as WfAgentData).agentId) : undefined;
                            return (
                                <div key={n.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                                        {a && <AgentDot color={a.color} name={a.name} size={16} />}
                                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-100">{nodeLabel(n)}</span>
                                        <span className="text-[9px] uppercase" style={{ color }}>
                                            {s?.status ?? "pending"}
                                        </span>
                                    </div>
                                    {(s?.finishedAt || s?.startedAt) && <div className="mt-0.5 pl-4 text-[9px] text-slate-500">{timeAgo(s.finishedAt ?? s.startedAt)}</div>}
                                    {s?.output && <div className="mt-1 line-clamp-4 whitespace-pre-wrap pl-4 text-[10px] text-slate-400">{s.output}</div>}
                                    {s?.error && <div className="mt-1 pl-4 text-[10px] text-red-300">{s.error}</div>}
                                    {s?.taskId && (
                                        <button type="button" className="mt-0.5 pl-4 text-[10px] text-sky-300 hover:underline" onClick={() => launch("tasks", a ? { agentId: a.id } : {})}>
                                            view task →
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
