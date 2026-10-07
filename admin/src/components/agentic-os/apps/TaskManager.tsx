"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    Archive,
    CheckCheck,
    CircleCheck,
    ExternalLink,
    GripVertical,
    ListTodo,
    Plus,
    RotateCcw,
    Save,
    Search,
    ThumbsDown,
    ThumbsUp,
    X,
    XCircle,
} from "lucide-react";
import { MODULES, inferModule, sessionUrl, stepIndex, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { aosApi } from "../lib/api";
import { PRIORITY_META, STATUS_COLUMNS } from "../lib/catalog";
import { agentById, useAosStore } from "../lib/store";
import type { OsAgent, OsTask, OsTaskInput, Priority } from "../lib/types";
import { AgentDot, Button, Chip, EmptyState, Field, Progress, Select, TextArea, TextInput, cx, timeAgo } from "../ui/kit";
import { StepsEditor } from "../ui/StepsEditor";

const moduleOptions = Object.values(MODULES).map((mo) => ({ value: mo.id, label: mo.name }));
const priorityOptions = (Object.keys(PRIORITY_META) as Priority[]).map((p) => ({ value: p, label: PRIORITY_META[p].label }));

/* ------------------------------------------------------------------ */
/* Task form (create + edit)                                           */
/* ------------------------------------------------------------------ */

interface FormState {
    agentId: string;
    playbookId: string;
    title: string;
    description: string;
    moduleId: string;
    route: string;
    steps: string[];
    priority: Priority;
    dueAt: string;
    requiresApproval: boolean;
}

function TaskForm({ task, defaultAgentId, onDone }: { task?: OsTask; defaultAgentId?: string; onDone: () => void }) {
    const { agents, playbooks, approvals, run } = useAosStore(useShallow((s) => ({ agents: s.agents, playbooks: s.playbooks, approvals: s.approvals, run: s.run })));
    const activeAgents = agents.filter((a) => !a.archivedAt);
    const [f, setF] = useState<FormState>(() =>
        task
            ? {
                  agentId: task.agentId ?? "",
                  playbookId: task.playbookId ?? "",
                  title: task.title,
                  description: task.description,
                  moduleId: task.moduleId,
                  route: task.route,
                  steps: [...task.steps],
                  priority: task.priority,
                  dueAt: task.dueAt ? task.dueAt.slice(0, 16) : "",
                  requiresApproval: task.requiresApproval,
              }
            : {
                  agentId: defaultAgentId ?? activeAgents[0]?.id ?? "",
                  playbookId: "",
                  title: "",
                  description: "",
                  moduleId: "itsm",
                  route: MODULES.itsm.route,
                  steps: [...MODULES.itsm.steps],
                  priority: "normal",
                  dueAt: "",
                  requiresApproval: false,
              },
    );
    const [busy, setBusy] = useState(false);
    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
    const agent = agentById(agents, f.agentId);
    const editable = !task || task.status === "queued" || task.status === "failed" || task.status === "cancelled" || task.status === "review";
    const approval = task ? approvals.find((a) => a.taskId === task.id && a.status === "pending") : undefined;

    const agentPlaybooks = useMemo(
        () => playbooks.filter((p) => p.enabled && !p.archivedAt && (!agent || agent.modules.includes(p.moduleId)) && (!p.agentId || p.agentId === agent?.id)),
        [playbooks, agent],
    );

    const pickPlaybook = (id: string) => {
        const p = playbooks.find((x) => x.id === id);
        if (!p) return set("playbookId", "");
        setF((s) => ({ ...s, playbookId: p.id, title: p.title, description: p.description, moduleId: p.moduleId, route: p.route, steps: [...p.steps], priority: p.priority, requiresApproval: p.requiresApproval }));
    };

    const pickModule = (id: string) => {
        const mo = MODULES[id as ModuleId];
        setF((s) => ({ ...s, moduleId: id, route: mo?.route ?? s.route, steps: s.playbookId ? s.steps : [...(mo?.steps ?? s.steps)] }));
    };

    const submit = async () => {
        if (!f.title.trim() || !f.agentId) return;
        setBusy(true);
        const input: OsTaskInput = {
            agentId: f.agentId,
            playbookId: f.playbookId || null,
            title: f.title.trim(),
            description: f.description,
            moduleId: f.moduleId,
            route: f.route,
            steps: f.steps.map((s) => s.trim()).filter(Boolean),
            priority: f.priority,
            dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null,
            requiresApproval: f.requiresApproval,
        };
        const out = task
            ? await run("Task updated", () => aosApi.updateTask(task.id, input))
            : await run(`Task queued for ${agent?.name ?? "agent"}`, () => aosApi.createTask({ ...input, source: "manual" }));
        setBusy(false);
        if (out) onDone();
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <ListTodo className="h-4 w-4 text-indigo-300" />
                <span className="flex-1 truncate text-[14px] font-semibold text-white">{task ? task.title : "New task"}</span>
                {task && <Chip color={STATUS_COLUMNS.find((c) => c.id === task.status)?.color ?? "#94a3b8"}>{task.status.replace("_", " ")}</Chip>}
                <button type="button" onClick={onDone} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {task && (
                    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Progress · {Math.round(task.progress * 100)}%</span>
                            <span>{task.source} · created {timeAgo(task.createdAt)}</span>
                        </div>
                        <Progress value={task.progress} color={MODULES[task.moduleId as ModuleId]?.color ?? "#818cf8"} />
                        {task.result && <div className="text-[12px] text-slate-300">{task.result}</div>}
                        {task.error && <div className="text-[12px] text-red-300">{task.error}</div>}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {task.status === "review" && (
                                <Button size="sm" variant="success" icon={CircleCheck} onClick={() => run("Marked done", () => aosApi.completeTask(task.id)).then((o) => o && onDone())}>
                                    Mark done
                                </Button>
                            )}
                            {approval && (
                                <>
                                    <Button size="sm" variant="success" icon={ThumbsUp} onClick={() => run("Approved", () => aosApi.decideApproval(approval.id, true))}>
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="danger" icon={ThumbsDown} onClick={() => { const c = window.prompt("Reason for rejecting?") ?? undefined; void run("Rejected", () => aosApi.decideApproval(approval.id, false, c)); }}>
                                        Reject
                                    </Button>
                                </>
                            )}
                            {["failed", "cancelled", "review"].includes(task.status) && (
                                <Button size="sm" icon={RotateCcw} onClick={() => run("Re-queued", () => aosApi.retryTask(task.id))}>
                                    {task.status === "review" ? "Redo" : "Retry"}
                                </Button>
                            )}
                            {["queued", "running", "awaiting_approval", "review"].includes(task.status) && (
                                <Button size="sm" variant="danger" icon={XCircle} onClick={() => run("Task cancelled", () => aosApi.cancelTask(task.id))}>
                                    Cancel
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => window.open(sessionUrl(task.route, agent?.slug ?? ""), "_blank")}>
                                Open module
                            </Button>
                            <Button size="sm" variant="ghost" icon={Archive} onClick={() => run("Task archived", () => aosApi.archiveTask(task.id)).then((o) => o && onDone())}>
                                Archive
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Agent">
                        <Select
                            value={f.agentId}
                            disabled={!editable}
                            onChange={(v) => set("agentId", v)}
                            options={activeAgents.map((a) => ({ value: a.id, label: `${a.name} · ${a.role}` }))}
                        />
                    </Field>
                    <Field label="From playbook" hint="Optional">
                        <Select
                            value={f.playbookId}
                            disabled={!editable}
                            onChange={pickPlaybook}
                            options={[{ value: "", label: "— Custom task —" }, ...agentPlaybooks.map((p) => ({ value: p.id, label: `${MODULES[p.moduleId as ModuleId]?.name ?? p.moduleId} · ${p.title}` }))]}
                        />
                    </Field>
                    <Field label="Title" className="md:col-span-2">
                        <TextInput
                            value={f.title}
                            disabled={!editable}
                            onChange={(e) => {
                                const title = e.target.value;
                                setF((s) => {
                                    const inferred = !s.playbookId && !task ? inferModule(title) : null;
                                    return inferred && inferred !== s.moduleId
                                        ? { ...s, title, moduleId: inferred, route: MODULES[inferred].route, steps: [...MODULES[inferred].steps] }
                                        : { ...s, title };
                                });
                            }}
                            placeholder="e.g. Triage new ITSM tickets"
                        />
                    </Field>
                    <Field label="Module">
                        <Select value={f.moduleId} disabled={!editable} onChange={pickModule} options={moduleOptions} />
                    </Field>
                    <Field label="Page" hint="Where the agent works">
                        <TextInput value={f.route} disabled={!editable} onChange={(e) => set("route", e.target.value)} className="font-mono" />
                    </Field>
                    <Field label="Priority">
                        <Select value={f.priority} disabled={!editable} onChange={(v) => set("priority", v as Priority)} options={priorityOptions} />
                    </Field>
                    <Field label="Due">
                        <TextInput type="datetime-local" value={f.dueAt} disabled={!editable} onChange={(e) => set("dueAt", e.target.value)} />
                    </Field>
                    <Field label="Description" className="md:col-span-2">
                        <TextArea value={f.description} disabled={!editable} onChange={(e) => set("description", e.target.value)} placeholder="Context, acceptance criteria, links…" />
                    </Field>
                    <label className="flex items-center gap-2 text-[12px] text-slate-300 md:col-span-2">
                        <input type="checkbox" checked={f.requiresApproval} disabled={!editable} onChange={(e) => set("requiresApproval", e.target.checked)} className="accent-indigo-500" />
                        Require human approval before the agent finalises
                    </label>
                </div>

                <Field label={`Steps (${f.steps.length})`}>
                    {editable ? (
                        <StepsEditor steps={f.steps} onChange={(s) => set("steps", s)} color={MODULES[f.moduleId as ModuleId]?.color} />
                    ) : (
                        <ol className="space-y-1">
                            {f.steps.map((s, i) => {
                                const cur = task ? stepIndex(task.progress, task.steps.length) : -1;
                                return (
                                    <li key={i} className={cx("text-[12px]", i < cur ? "text-slate-500 line-through" : i === cur ? "font-semibold text-white" : "text-slate-400")}>
                                        {i + 1}. {s}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </Field>
                {!editable && <div className="text-[11px] text-amber-300/80">The agent is working on this task. Cancel it to edit.</div>}
            </div>

            {editable && (
                <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5">
                    <Button variant="ghost" onClick={onDone}>
                        Close
                    </Button>
                    <Button variant="primary" icon={task ? Save : Plus} loading={busy} disabled={!f.title.trim() || !f.agentId || !f.steps.some((s) => s.trim())} onClick={submit}>
                        {task ? "Save task" : "Queue task"}
                    </Button>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Kanban                                                              */
/* ------------------------------------------------------------------ */

function TaskCard({ task, agent, onOpen, onDragStart, onDropBefore }: { task: OsTask; agent?: OsAgent; onOpen: () => void; onDragStart: (e: React.DragEvent) => void; onDropBefore: (e: React.DragEvent) => void }) {
    const mo = MODULES[task.moduleId as ModuleId];
    const pr = PRIORITY_META[task.priority];
    const step = task.status === "running" ? task.steps[stepIndex(task.progress, task.steps.length)] : null;
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropBefore}
            onClick={onOpen}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900/70 p-2.5 transition hover:border-white/20 hover:bg-slate-900"
        >
            <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-400" />
                <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium leading-snug text-white">{task.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {mo && <Chip color={mo.color}>{mo.name}</Chip>}
                        {task.priority !== "normal" && <Chip color={pr.color}>{pr.label}</Chip>}
                        {task.source === "autopilot" && <Chip color="#64748b">autopilot</Chip>}
                        {task.requiresApproval && <Chip color="#f59e0b">approval</Chip>}
                    </div>
                    {task.status === "running" && (
                        <div className="mt-2 space-y-1">
                            <Progress value={task.progress} color={mo?.color ?? "#38bdf8"} />
                            {step && <div className="truncate text-[10px] text-slate-400">{step}</div>}
                        </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                        {agent && <AgentDot color={agent.color} name={agent.name} size={16} />}
                        <span className="truncate">{agent?.name ?? "Unassigned"}</span>
                        <span className="ml-auto shrink-0">{timeAgo(task.updatedAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TaskManager({ initialAgentId }: { initialAgentId?: string }) {
    const { agents, tasks, run, toast } = useAosStore(useShallow((s) => ({ agents: s.agents, tasks: s.tasks, run: s.run, toast: s.toast })));
    const [agentFilter, setAgentFilter] = useState<string>("all");
    const [moduleFilter, setModuleFilter] = useState<string>("all");
    const [hideAutopilot, setHideAutopilot] = useState(false);
    const [query, setQuery] = useState("");
    const [openId, setOpenId] = useState<string | "new" | null>(null);
    const [dragId, setDragId] = useState<string | null>(null);

    useEffect(() => {
        if (!initialAgentId) return;
        const a = agentById(agents, initialAgentId);
        if (a) setAgentFilter(a.id);
    }, [initialAgentId, agents]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return tasks.filter(
            (t) =>
                !t.archivedAt &&
                (agentFilter === "all" || t.agentId === agentFilter) &&
                (moduleFilter === "all" || t.moduleId === moduleFilter) &&
                (!hideAutopilot || t.source !== "autopilot") &&
                (!q || t.title.toLowerCase().includes(q)),
        );
    }, [tasks, agentFilter, moduleFilter, hideAutopilot, query]);

    const byStatus = (s: string) =>
        filtered
            .filter((t) => t.status === s)
            .sort((a, b) => (s === "done" ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)));
    const closed = filtered.filter((t) => t.status === "failed" || t.status === "cancelled");
    const review = byStatus("review");
    const openTask = openId && openId !== "new" ? tasks.find((t) => t.id === openId) : undefined;

    const dropOn = async (column: string, beforeId?: string) => {
        const t = tasks.find((x) => x.id === dragId);
        setDragId(null);
        if (!t) return;
        if (column === "queued") {
            if (t.status !== "queued") {
                await run("Re-queued", () => aosApi.retryTask(t.id));
                return;
            }
            const queue = byStatus("queued").filter((x) => x.agentId === t.agentId && x.id !== t.id);
            const idx = beforeId ? queue.findIndex((x) => x.id === beforeId) : queue.length;
            queue.splice(idx < 0 ? queue.length : idx, 0, t);
            await run("Queue reordered", () => aosApi.reorderTasks(queue.map((x) => x.id)), { silent: true });
        } else if (column === "done") {
            if (t.status === "review") await run("Marked done", () => aosApi.completeTask(t.id));
            else toast("info", "Only tasks in Review can be marked done — agents never close their own work.");
        } else if (column !== t.status) {
            toast("info", "Running, approval and review are set by the agent. Drag to Queued to redo, or to Done to confirm.");
        }
    };

    return (
        <div className="flex h-full min-h-0">
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5">
                    <label className="flex w-56 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 focus-within:border-indigo-400/50">
                        <Search className="h-3.5 w-3.5 text-slate-500" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Search tasks…" className="w-full bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none" />
                    </label>
                    <Select
                        value={agentFilter}
                        onChange={setAgentFilter}
                        className="w-48"
                        options={[{ value: "all", label: "All agents" }, ...agents.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))]}
                    />
                    <Select value={moduleFilter} onChange={setModuleFilter} className="w-44" options={[{ value: "all", label: "All modules" }, ...moduleOptions]} />
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <input type="checkbox" checked={hideAutopilot} onChange={(e) => setHideAutopilot(e.target.checked)} className="accent-indigo-500" />
                        Hide autopilot
                    </label>
                    <div className="ml-auto flex gap-1.5">
                        {review.length > 1 && (
                            <Button
                                icon={CheckCheck}
                                onClick={async () => {
                                    if (!window.confirm(`Mark all ${review.length} reviewed tasks as done?`)) return;
                                    for (const t of review) await aosApi.completeTask(t.id).catch(() => null);
                                    void run(`${review.length} tasks marked done`, async () => true);
                                }}
                            >
                                Approve all in review
                            </Button>
                        )}
                        <Button variant="primary" icon={Plus} onClick={() => setOpenId("new")}>
                            New task
                        </Button>
                    </div>
                </div>

                {/* Board */}
                <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-3">
                    {STATUS_COLUMNS.map((col) => {
                        const list = byStatus(col.id);
                        return (
                            <div
                                key={col.id}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    void dropOn(col.id);
                                }}
                                className={cx("flex w-64 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.02]", dragId && "border-dashed")}
                            >
                                <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                                    <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                                    <span className="text-[12px] font-bold text-white">{col.label}</span>
                                    <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-slate-300">{list.length}</span>
                                    <span className="ml-auto truncate text-[10px] text-slate-500">{col.hint}</span>
                                </div>
                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                                    {list.slice(0, col.id === "done" ? 40 : 200).map((t) => (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            agent={agentById(agents, t.agentId)}
                                            onOpen={() => setOpenId(t.id)}
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed = "move";
                                                setDragId(t.id);
                                            }}
                                            onDropBefore={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                void dropOn(col.id, t.id);
                                            }}
                                        />
                                    ))}
                                    {!list.length && <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[11px] text-slate-600">Empty</div>}
                                </div>
                            </div>
                        );
                    })}
                    {closed.length > 0 && (
                        <div className="flex w-56 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
                            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                                <span className="h-2 w-2 rounded-full bg-red-400" />
                                <span className="text-[12px] font-bold text-white">Failed / cancelled</span>
                                <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-slate-300">{closed.length}</span>
                            </div>
                            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
                                {closed.map((t) => (
                                    <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-400 hover:bg-white/5 hover:text-white">
                                        {t.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {!tasks.length && <EmptyState icon={ListTodo} title="No tasks yet" hint="Queue a task for any agent, or enable autopilot in Settings." />}
            </div>

            {/* Drawer */}
            {openId && (openId === "new" || openTask) && (
                <aside className="w-[420px] shrink-0 border-l border-white/10 bg-slate-950/40 animate-in slide-in-from-right-4 duration-200">
                    <TaskForm key={openId} task={openTask} defaultAgentId={agentFilter !== "all" ? agentFilter : undefined} onDone={() => setOpenId(null)} />
                </aside>
            )}
        </div>
    );
}
