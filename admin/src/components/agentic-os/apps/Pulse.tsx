"use client";

/**
 * Agentic OS — Pulse (MAPS "P").
 * Routine registry with a visual cron builder, ▶ run-now / queue, the
 * append-only run log, caps & budget, and the run queue.
 *
 * MAPS rules enforced server-side and surfaced here:
 *  - deterministic gate (kill switch, caps, budget, permissions) before any model call
 *  - prompt output is always a DRAFT; "send" deliveries wait in Governance
 *  - the run log is append-only (finished runs are frozen)
 */

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    Archive,
    ArchiveRestore,
    BellRing,
    Brain,
    CalendarClock,
    CircleCheck,
    CircleSlash,
    Clock,
    Coins,
    FastForward,
    FileText,
    Gauge,
    GitBranch,
    Hourglass,
    ListChecks,
    ListTodo,
    Play,
    Plus,
    Power,
    RefreshCw,
    Save,
    Search,
    ShieldAlert,
    Sparkles,
    Stethoscope,
    Timer,
    X,
    XCircle,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { aosApi, fetchCronPreview, pulseApi } from "../lib/api";
import { TOOL_BY_ID } from "../lib/catalog";
import {
    CRON_PRESETS,
    DAY_SHORT,
    DEFAULT_BUILDER,
    TIMEZONES,
    buildCron,
    describeCron,
    formatWhen,
    parseToBuilder,
    timeUntil,
    type BuilderMode,
    type CronBuilder,
} from "../lib/cron";
import { startPhase3Polling, usePhase3Store } from "../lib/phase3Store";
import { runPulse, startPulsePolling, usePulseStore } from "../lib/pulseStore";
import { agentById, useAosStore } from "../lib/store";
import type { OsAgent, OsCapUsage, OsCronPreview, OsRoutine, OsRoutineInput, OsRun, OutputTarget, RoutineKind, RunStatus } from "../lib/types";
import { AgentDot, Button, Chip, EmptyState, Field, Section, Select, Tabs, TextArea, TextInput, Toggle, cx, timeAgo } from "../ui/kit";

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export const RUN_STATUS_META: Record<RunStatus, { label: string; color: string; icon: LucideIcon }> = {
    running: { label: "Running", color: "#38bdf8", icon: RefreshCw },
    success: { label: "Success", color: "#22c55e", icon: CircleCheck },
    failed: { label: "Failed", color: "#ef4444", icon: XCircle },
    blocked: { label: "Blocked", color: "#f59e0b", icon: CircleSlash },
    timeout: { label: "Timeout", color: "#f97316", icon: Hourglass },
};

const KIND_META: Record<RoutineKind, { label: string; icon: LucideIcon; color: string; hint: string }> = {
    prompt: { label: "Prompt", icon: Sparkles, color: "#a855f7", hint: "Asks the AI model with the agent persona + scoped memory. Output is a draft." },
    playbook: { label: "Playbook", icon: ListChecks, color: "#22d3ee", hint: "Queues a playbook task for the agent — no model call." },
    check: { label: "Health check", icon: Stethoscope, color: "#34d399", hint: "Deterministic Memory Map check (broken / stale signposts) — no model call." },
    workflow: { label: "Workflow", icon: GitBranch, color: "#c084fc", hint: "Starts a multi-agent workflow run (hand-offs + approval gates) — no model call." },
};

const TARGET_META: Record<OutputTarget, { label: string; icon: LucideIcon; hint: string }> = {
    activity: { label: "Activity feed", icon: Zap, hint: "Posted to the office activity / audit feed" },
    task: { label: "Review task", icon: ListTodo, hint: "Lands in the Review column — a human confirms" },
    memory: { label: "Memory note", icon: Brain, hint: "Saved as a note in the agent's memory area" },
    notification: { label: "Notify team", icon: BellRing, hint: "Sending needs approval in Governance first" },
};

const ROUTINE_TEMPLATES: { name: string; description: string; kind: RoutineKind; cron: string; prompt?: string; outputTarget: OutputTarget; module?: ModuleId }[] = [
    {
        name: "Morning briefing",
        description: "Overnight summary for the team lead",
        kind: "prompt",
        cron: "0 7 * * 1-5",
        prompt: "Write a short morning briefing: what happened overnight, open risks, tasks waiting for review and what needs a human today. Use bullet points.",
        outputTarget: "task",
    },
    {
        name: "SLA risk scan",
        description: "Spot tickets close to breaching SLA",
        kind: "prompt",
        cron: "*/30 * * * *",
        prompt: "Review the context and list anything at risk of breaching an SLA in the next 4 hours, with a suggested next action each.",
        outputTarget: "activity",
        module: "itsm",
    },
    {
        name: "Weekly lessons learned",
        description: "Turn the week's activity into reusable memory",
        kind: "prompt",
        cron: "0 16 * * 5",
        prompt: "From this week's activity, extract 3-5 lessons learned or reusable how-tos worth remembering. Keep each under 40 words.",
        outputTarget: "memory",
    },
    { name: "Nightly memory check", description: "Find broken or stale memory signposts", kind: "check", cron: "0 2 * * *", outputTarget: "memory" },
    { name: "Daily playbook run", description: "Queue a routine playbook every morning", kind: "playbook", cron: "0 8 * * 1-5", outputTarget: "task" },
    { name: "Weekly workflow", description: "Start a multi-agent workflow every Monday", kind: "workflow", cron: "0 9 * * 1", outputTarget: "activity" },
];

const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);
const fmtUsd = (n: number) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`;
const fmtMs = (ms: number | null) => (ms == null ? "—" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

export function RunStatusChip({ status }: { status: RunStatus | null | undefined }) {
    if (!status) return <Chip color="#64748b">never run</Chip>;
    const m = RUN_STATUS_META[status] ?? RUN_STATUS_META.failed;
    return (
        <Chip color={m.color}>
            <m.icon className={cx("h-3 w-3", status === "running" && "animate-spin")} />
            {m.label}
        </Chip>
    );
}

function useNow(ms = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(t);
    }, [ms]);
    return now;
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

type PulseTab = "routines" | "runs" | "caps" | "queue";

export function Pulse({ initialTab, initialRoutineId }: { initialTab?: string; initialRoutineId?: string }) {
    useEffect(() => startPulsePolling(5000), []);
    const { state, error, status, routines, queue, runs } = usePulseStore(
        useShallow((s) => ({ state: s.state, error: s.error, status: s.status, routines: s.routines, queue: s.queue, runs: s.runs })),
    );
    const [tab, setTab] = useState<PulseTab>((["routines", "runs", "caps", "queue"].includes(initialTab ?? "") ? initialTab : "routines") as PulseTab);
    const now = useNow(5000);

    if (state === "unavailable") {
        return (
            <EmptyState
                icon={Timer}
                title="Pulse backend not reachable"
                hint={`The middleware doesn't expose the Pulse API yet (${error ?? "unknown error"}). Rebuild the middleware container and reload.`}
                action={
                    <Button icon={RefreshCw} onClick={() => void usePulseStore.getState().refresh()}>
                        Retry
                    </Button>
                }
            />
        );
    }

    const stale = status?.lastTickAt ? now - new Date(status.lastTickAt).getTime() > 90_000 : true;
    const blockedToday = status?.blockedToday ?? 0;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
                <Tabs<PulseTab>
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { id: "routines", label: "Routines", icon: CalendarClock, badge: routines.filter((r) => r.enabled && !r.archivedAt).length },
                        { id: "runs", label: "Run log", icon: FileText, badge: runs.filter((r) => r.status === "running").length },
                        { id: "caps", label: "Caps & budget", icon: Gauge },
                        { id: "queue", label: "Queue", icon: FastForward, badge: queue.length },
                    ]}
                />
                <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px]">
                    {status?.killSwitch && (
                        <Chip color="#ef4444">
                            <Power className="h-3 w-3" /> Kill switch ON
                        </Chip>
                    )}
                    <Chip color={status?.pulseEnabled ? "#22c55e" : "#64748b"}>{status?.pulseEnabled ? "Pulse on" : "Pulse paused"}</Chip>
                    <Chip color={status?.llmMode === "live" ? "#a855f7" : "#38bdf8"}>{status?.llmMode === "live" ? "Live LLM" : "Dry run"}</Chip>
                    <Chip color={status?.providerReady ? "#22c55e" : "#f59e0b"} title="Provider configured in AI Studio settings">
                        {status?.provider ?? "provider ?"}
                        {status?.model ? ` · ${status.model}` : ""}
                    </Chip>
                    {blockedToday > 0 && <Chip color="#f59e0b">{blockedToday} blocked today</Chip>}
                    <span className={cx("text-slate-500", stale && "text-amber-300")} title="Last Pulse runner tick">
                        tick {status?.lastTickAt ? timeAgo(status.lastTickAt, now) : "never"}
                    </span>
                </div>
            </div>
            {status && status.llmMode === "live" && !status.providerReady && (
                <div className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-500/10 px-4 py-1.5 text-[11px] text-amber-100">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    No AI provider is configured in AI Studio — prompt routines and agent tests will fail. Configure one, or switch to Dry run.
                    <a href="/admin/ai-studio" className="ml-auto shrink-0 font-semibold text-amber-200 hover:underline">
                        AI Studio →
                    </a>
                    <button
                        type="button"
                        onClick={() => void runPulse("AI mode: Dry run", () => pulseApi.updatePulseSettings({ llmMode: "dry_run" }))}
                        className="shrink-0 rounded-md border border-amber-300/30 px-2 py-0.5 font-semibold text-amber-100 hover:bg-amber-500/20"
                    >
                        Use dry run
                    </button>
                </div>
            )}
            <div className="min-h-0 flex-1">
                {tab === "routines" && <RoutinesTab initialRoutineId={initialRoutineId} />}
                {tab === "runs" && <RunLog />}
                {tab === "caps" && <CapsPanel />}
                {tab === "queue" && <QueuePanel />}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Routines                                                            */
/* ------------------------------------------------------------------ */

type Draft = Required<Pick<OsRoutineInput, "name" | "description" | "cron" | "timezone" | "kind" | "prompt" | "effort" | "allowedTools" | "maxTurns" | "timeoutSeconds" | "outputTarget" | "enabled">> & {
    agentId: string | null;
    playbookId: string | null;
    workflowId: string | null;
};

const EMPTY_DRAFT: Draft = {
    name: "",
    description: "",
    agentId: null,
    cron: "0 7 * * 1-5",
    timezone: "Asia/Jakarta",
    kind: "prompt",
    playbookId: null,
    workflowId: null,
    prompt: "",
    effort: "medium",
    allowedTools: [],
    maxTurns: 8,
    timeoutSeconds: 120,
    outputTarget: "task",
    enabled: false,
};

const toDraft = (r: OsRoutine): Draft => ({
    name: r.name,
    description: r.description,
    agentId: r.agentId,
    cron: r.cron,
    timezone: r.timezone,
    kind: r.kind,
    playbookId: r.playbookId,
    workflowId: r.workflowId ?? null,
    prompt: r.prompt,
    effort: r.effort,
    allowedTools: [...r.allowedTools],
    maxTurns: r.maxTurns,
    timeoutSeconds: r.timeoutSeconds,
    outputTarget: r.outputTarget,
    enabled: r.enabled,
});

function RoutinesTab({ initialRoutineId }: { initialRoutineId?: string }) {
    const { routines, runs, includeArchived, setIncludeArchived } = usePulseStore(
        useShallow((s) => ({ routines: s.routines, runs: s.runs, includeArchived: s.includeArchived, setIncludeArchived: s.setIncludeArchived })),
    );
    const agents = useAosStore((s) => s.agents);
    const [selected, setSelected] = useState<string | "new" | null>(initialRoutineId ?? null);
    const [template, setTemplate] = useState<Partial<Draft> | null>(null);
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const now = useNow(10_000);

    useEffect(() => {
        if (!selected && routines.length) setSelected(routines[0].id);
    }, [routines, selected]);

    const list = useMemo(() => {
        const s = q.trim().toLowerCase();
        return routines
            .filter((r) => !s || r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s) || (agentById(agents, r.agentId)?.name ?? "").toLowerCase().includes(s))
            .sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt) || Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));
    }, [routines, q, agents]);

    const current = selected && selected !== "new" ? routines.find((r) => r.id === selected) : undefined;

    const runNow = async (r: OsRoutine) => {
        setBusy(r.id);
        const out = await runPulse(`Ran "${r.name}"`, () => pulseApi.runRoutineNow(r.id), { silent: true });
        setBusy(null);
        if (out) {
            const st = RUN_STATUS_META[out.status];
            useAosStore
                .getState()
                .toast(out.status === "success" ? "success" : out.status === "blocked" ? "info" : "error", `${r.name}: ${st?.label ?? out.status}${out.blockedReason ? ` — ${out.blockedReason}` : out.error ? ` — ${out.error}` : ""}`);
        }
    };

    return (
        <div className="grid h-full min-h-0 grid-cols-[320px_1fr]">
            <aside className="flex min-h-0 flex-col border-r border-white/10">
                <div className="space-y-2 border-b border-white/10 p-3">
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search routines…" className="pl-7" />
                        </div>
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={() => {
                                setTemplate(null);
                                setSelected("new");
                            }}
                        >
                            New
                        </Button>
                    </div>
                    <Toggle checked={includeArchived} onChange={setIncludeArchived} label="Show archived" />
                </div>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                    {list.map((r) => {
                        const agent = agentById(agents, r.agentId);
                        const K = KIND_META[r.kind];
                        const lastRun = runs.find((x) => x.routineId === r.id);
                        return (
                            <div
                                key={r.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelected(r.id)}
                                onKeyDown={(e) => e.key === "Enter" && setSelected(r.id)}
                                className={cx(
                                    "cursor-pointer rounded-xl border p-2.5 transition",
                                    selected === r.id ? "border-indigo-400/40 bg-indigo-500/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]",
                                    r.archivedAt && "opacity-50",
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <K.icon className="h-3.5 w-3.5 shrink-0" style={{ color: K.color }} />
                                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">{r.name}</span>
                                    <span onClick={(e) => e.stopPropagation()} className="w-9">
                                        <Toggle
                                            checked={r.enabled}
                                            disabled={!!r.archivedAt}
                                            onChange={(v) => void runPulse(v ? `"${r.name}" enabled` : `"${r.name}" paused`, () => pulseApi.setRoutineEnabled(r.id, v))}
                                        />
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    <span className="truncate">{describeCron(r.cron)}</span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    {agent ? <AgentDot color={agent.color} name={agent.name} size={16} /> : <span className="text-[10px] text-slate-500">No agent</span>}
                                    <RunStatusChip status={lastRun?.status ?? r.lastStatus} />
                                    <span className="ml-auto text-[10px] text-slate-500">{r.enabled && r.nextRunAt ? timeUntil(r.nextRunAt, now) : r.lastRunAt ? timeAgo(r.lastRunAt, now) : ""}</span>
                                    <button
                                        type="button"
                                        title="Run now"
                                        disabled={!!r.archivedAt || busy === r.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void runNow(r);
                                        }}
                                        className="rounded-md p-1 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-30"
                                    >
                                        {busy === r.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!list.length && <div className="py-10 text-center text-[12px] text-slate-500">No routines yet.</div>}
                </div>
            </aside>
            <div className="min-h-0 overflow-y-auto">
                {selected === "new" && !template ? (
                    <TemplatePicker onPick={(t) => setTemplate(t)} />
                ) : selected === "new" || current ? (
                    <RoutineEditor
                        key={current?.id ?? `new-${JSON.stringify(template)}`}
                        routine={current}
                        initial={template ?? undefined}
                        busy={busy === current?.id}
                        onRunNow={current ? () => void runNow(current) : undefined}
                        onSaved={(r) => {
                            setTemplate(null);
                            setSelected(r.id);
                        }}
                    />
                ) : (
                    <EmptyState icon={CalendarClock} title="Pick a routine" hint="Routines are scheduled jobs your agents run while nobody is watching." />
                )}
            </div>
        </div>
    );
}

function TemplatePicker({ onPick }: { onPick: (d: Partial<Draft>) => void }) {
    const agents = useAosStore((s) => s.agents);
    return (
        <div className="space-y-3 p-5">
            <div>
                <div className="text-[15px] font-semibold text-white">New routine</div>
                <div className="text-[12px] text-slate-400">Start from a template or a blank routine. You can change everything afterwards.</div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
                <button type="button" onClick={() => onPick({})} className="rounded-xl border border-dashed border-white/15 p-4 text-left hover:bg-white/[0.04]">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                        <Plus className="h-4 w-4" /> Blank routine
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Configure from scratch</div>
                </button>
                {ROUTINE_TEMPLATES.map((t) => {
                    const K = KIND_META[t.kind];
                    const agent = t.module ? agents.find((a) => !a.archivedAt && a.modules.includes(t.module!)) : agents.find((a) => !a.archivedAt);
                    return (
                        <button
                            key={t.name}
                            type="button"
                            onClick={() => onPick({ name: t.name, description: t.description, kind: t.kind, cron: t.cron, prompt: t.prompt ?? "", outputTarget: t.outputTarget, agentId: agent?.id ?? null })}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:bg-white/[0.05]"
                        >
                            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                                <K.icon className="h-4 w-4" style={{ color: K.color }} /> {t.name}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">{t.description}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                <Chip color={K.color}>{K.label}</Chip>
                                <Chip color="#94a3b8">{describeCron(t.cron)}</Chip>
                                <Chip color="#64748b">→ {TARGET_META[t.outputTarget].label}</Chip>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function RoutineEditor({
    routine,
    initial,
    busy,
    onRunNow,
    onSaved,
}: {
    routine?: OsRoutine;
    initial?: Partial<Draft>;
    busy?: boolean;
    onRunNow?: () => void;
    onSaved: (r: OsRoutine) => void;
}) {
    const { agents, playbooks, settings } = useAosStore(useShallow((s) => ({ agents: s.agents, playbooks: s.playbooks, settings: s.settings })));
    const runs = usePulseStore((s) => s.runs);
    const workflows = usePhase3Store((s) => s.workflows);
    useEffect(() => startPhase3Polling(30_000), []);
    const [d, setD] = useState<Draft>(() => (routine ? toDraft(routine) : { ...EMPTY_DRAFT, ...initial }));
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

    const agent: OsAgent | undefined = agentById(agents, d.agentId);
    const dirty = routine ? JSON.stringify(toDraft(routine)) !== JSON.stringify(d) : true;
    const capablePlaybooks = playbooks.filter((p) => !p.archivedAt && p.enabled && (!agent || agent.modules.includes(p.moduleId)));
    const myRuns = routine ? runs.filter((r) => r.routineId === routine.id).slice(0, 8) : [];
    const sendNeedsApproval = (settings?.requireApprovalFor ?? []).includes("send");
    const toolProblems = agent ? d.allowedTools.filter((t) => !agent.tools.includes(t)) : [];

    const problems: string[] = [];
    if (!d.name.trim()) problems.push("Give the routine a name");
    if (d.kind === "prompt" && !d.prompt.trim()) problems.push("Prompt routines need a prompt");
    if (d.kind === "playbook" && !d.playbookId) problems.push("Pick a playbook");
    if (d.kind === "workflow" && !d.workflowId) problems.push("Pick a workflow");
    if (toolProblems.length) problems.push(`Agent lacks tools: ${toolProblems.join(", ")}`);

    const save = async () => {
        if (problems.length) return;
        setSaving(true);
        const input: OsRoutineInput = {
            name: d.name.trim(),
            description: d.description,
            agentId: d.agentId,
            cron: d.cron.trim(),
            timezone: d.timezone,
            kind: d.kind,
            playbookId: d.kind === "playbook" ? d.playbookId : null,
            workflowId: d.kind === "workflow" ? d.workflowId : null,
            prompt: d.kind === "prompt" ? d.prompt : "",
            effort: d.effort,
            allowedTools: d.allowedTools,
            maxTurns: d.maxTurns,
            timeoutSeconds: d.timeoutSeconds,
            outputTarget: d.outputTarget,
            enabled: d.enabled,
        };
        const out = routine ? await runPulse("Routine saved", () => pulseApi.updateRoutine(routine.id, input)) : await runPulse("Routine created", () => pulseApi.createRoutine(input));
        setSaving(false);
        if (out) onSaved(out);
    };

    return (
        <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-white">{routine ? routine.name : "New routine"}</div>
                    <div className="text-[11px] text-slate-500">
                        {routine
                            ? `${routine.enabled ? `Next run ${formatWhen(routine.nextRunAt, routine.timezone)}` : "Paused"} · last run ${timeAgo(routine.lastRunAt)}`
                            : "Not saved yet"}
                    </div>
                </div>
                {routine && !routine.archivedAt && (
                    <>
                        <Button icon={Play} variant="success" loading={busy} onClick={onRunNow} title="Run immediately (gated by caps & kill switch)">
                            Run now
                        </Button>
                        <Button icon={FastForward} onClick={() => void runPulse(`"${routine.name}" queued`, () => pulseApi.queueRoutine(routine.id))} title="Add to the run queue">
                            Queue
                        </Button>
                        <Button icon={Archive} variant="danger" onClick={() => void runPulse(`"${routine.name}" archived`, () => pulseApi.archiveRoutine(routine.id))}>
                            Archive
                        </Button>
                    </>
                )}
                {routine?.archivedAt && (
                    <Button icon={ArchiveRestore} onClick={() => void runPulse(`"${routine.name}" restored`, () => pulseApi.restoreRoutine(routine.id))}>
                        Restore
                    </Button>
                )}
                <Button variant="primary" icon={Save} loading={saving} disabled={!dirty || problems.length > 0} onClick={save}>
                    {routine ? "Save" : "Create"}
                </Button>
            </div>

            {problems.length > 0 && dirty && (
                <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">{problems.join(" · ")}</div>
            )}

            <div className="grid gap-3 xl:grid-cols-2">
                <Section title="What" icon={FileText}>
                    <div className="space-y-2.5">
                        <Field label="Name">
                            <TextInput value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Morning briefing" />
                        </Field>
                        <Field label="Description">
                            <TextInput value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="Why this routine exists" />
                        </Field>
                        <Field label="Agent" hint="Runs with this agent's persona, memory and guardrails">
                            <Select
                                value={d.agentId ?? ""}
                                onChange={(v) => set("agentId", v || null)}
                                options={[{ value: "", label: "— No agent (system) —" }, ...agents.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: `${a.name} · ${a.role}${a.status !== "active" ? ` (${a.status})` : ""}` }))]}
                            />
                        </Field>
                        <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kind</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {(Object.keys(KIND_META) as RoutineKind[]).map((k) => {
                                    const K = KIND_META[k];
                                    return (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => set("kind", k)}
                                            className={cx("rounded-lg border p-2 text-left transition", d.kind === k ? "border-indigo-400/50 bg-indigo-500/10" : "border-white/10 hover:bg-white/5")}
                                        >
                                            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                                                <K.icon className="h-3.5 w-3.5" style={{ color: K.color }} />
                                                {K.label}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500">{KIND_META[d.kind].hint}</div>
                        </div>
                        {d.kind === "prompt" && (
                            <Field label="Prompt" hint="Live context (stats, recent activity, tasks) is appended automatically">
                                <TextArea rows={6} value={d.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="What should the agent produce?" />
                            </Field>
                        )}
                        {d.kind === "playbook" && (
                            <Field label="Playbook" hint={agent ? `Playbooks in ${agent.name}'s modules` : "All playbooks"}>
                                <Select
                                    value={d.playbookId ?? ""}
                                    onChange={(v) => set("playbookId", v || null)}
                                    options={[
                                        { value: "", label: "— Pick a playbook —" },
                                        ...capablePlaybooks.map((p) => ({ value: p.id, label: `${MODULES[p.moduleId as ModuleId]?.name ?? p.moduleId} · ${p.title}` })),
                                    ]}
                                />
                            </Field>
                        )}
                        {d.kind === "check" && (
                            <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-2.5 text-[11px] text-emerald-100">
                                Checks every memory item: missing content → <b>broken</b>, not verified for 30 days → <b>stale</b>, admin links to unknown modules → <b>broken</b>. Healthy items get
                                re-verified. No AI tokens are used.
                            </div>
                        )}
                        {d.kind === "workflow" && (
                            <Field label="Workflow" hint="Each run starts a new workflow run; agents follow the graph">
                                <Select
                                    value={d.workflowId ?? ""}
                                    onChange={(v) => set("workflowId", v || null)}
                                    options={[
                                        { value: "", label: "— Pick a workflow —" },
                                        ...workflows.filter((w) => !w.archivedAt).map((w) => ({ value: w.id, label: `${w.name}${w.enabled ? "" : " (disabled)"}` })),
                                    ]}
                                />
                            </Field>
                        )}
                    </div>
                </Section>

                <Section title="When" icon={CalendarClock}>
                    <CronField cron={d.cron} timezone={d.timezone} onCron={(c) => set("cron", c)} onTimezone={(tz) => set("timezone", tz)} />
                    <div className="mt-3 border-t border-white/10 pt-2">
                        <Toggle checked={d.enabled} onChange={(v) => set("enabled", v)} label="Enabled" hint="Paused routines can still be run manually" />
                    </div>
                </Section>

                <Section title="Output" icon={Zap}>
                    <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(TARGET_META) as OutputTarget[]).map((t) => {
                            const T = TARGET_META[t];
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => set("outputTarget", t)}
                                    className={cx("rounded-lg border p-2 text-left transition", d.outputTarget === t ? "border-indigo-400/50 bg-indigo-500/10" : "border-white/10 hover:bg-white/5")}
                                >
                                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                                        <T.icon className="h-3.5 w-3.5 text-slate-300" /> {T.label}
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-slate-500">{T.hint}</div>
                                </button>
                            );
                        })}
                    </div>
                    {d.outputTarget === "notification" && sendNeedsApproval && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200">
                            <ShieldAlert className="h-3.5 w-3.5" /> &quot;send&quot; requires approval — each delivery waits in Governance.
                        </div>
                    )}
                </Section>

                <Section title="Limits & tools" icon={Gauge}>
                    <div className="grid grid-cols-3 gap-2">
                        <Field label="Effort" hint="Output length">
                            <Select value={d.effort} onChange={(v) => set("effort", v as Draft["effort"])} options={["low", "medium", "high"].map((x) => ({ value: x, label: x }))} />
                        </Field>
                        <Field label="Max turns">
                            <TextInput type="number" min={1} max={50} value={d.maxTurns} onChange={(e) => set("maxTurns", Number(e.target.value))} />
                        </Field>
                        <Field label="Timeout (s)">
                            <TextInput type="number" min={10} max={3600} value={d.timeoutSeconds} onChange={(e) => set("timeoutSeconds", Number(e.target.value))} />
                        </Field>
                    </div>
                    <div className="mt-2.5">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Allowed tools</div>
                        {agent ? (
                            <div className="flex flex-wrap gap-1">
                                {agent.tools.map((t) => (
                                    <Chip
                                        key={t}
                                        color="#818cf8"
                                        active={d.allowedTools.includes(t)}
                                        onClick={() => set("allowedTools", d.allowedTools.includes(t) ? d.allowedTools.filter((x) => x !== t) : [...d.allowedTools, t])}
                                    >
                                        {TOOL_BY_ID[t]?.name ?? t}
                                    </Chip>
                                ))}
                                {!agent.tools.length && <span className="text-[11px] text-slate-500">This agent has no tools.</span>}
                                {toolProblems.map((t) => (
                                    <Chip key={t} color="#ef4444" onClick={() => set("allowedTools", d.allowedTools.filter((x) => x !== t))} title="Not permitted for this agent — click to remove">
                                        {TOOL_BY_ID[t]?.name ?? t} ✕
                                    </Chip>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11px] text-slate-500">Pick an agent to choose tools.</div>
                        )}
                        <div className="mt-1 text-[10px] text-slate-500">The gate blocks a run if a tool isn&apos;t in the agent&apos;s toolbox.</div>
                    </div>
                </Section>
            </div>

            {routine && (
                <Section title="Recent runs" icon={FileText}>
                    {myRuns.length ? <RunTable runs={myRuns} compact /> : <div className="py-4 text-center text-[12px] text-slate-500">No runs yet — press Run now to try it.</div>}
                </Section>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Cron builder                                                        */
/* ------------------------------------------------------------------ */

function CronField({ cron, timezone, onCron, onTimezone }: { cron: string; timezone: string; onCron: (c: string) => void; onTimezone: (tz: string) => void }) {
    const parsed = parseToBuilder(cron);
    const [mode, setMode] = useState<"simple" | "advanced">(parsed ? "simple" : "advanced");
    const b: CronBuilder = parsed ?? DEFAULT_BUILDER;
    const setB = (patch: Partial<CronBuilder>) => onCron(buildCron({ ...b, ...patch }));
    const [preview, setPreview] = useState<OsCronPreview | null>(null);

    useEffect(() => {
        let alive = true;
        const t = setTimeout(() => {
            fetchCronPreview(cron, timezone, 5)
                .then((p) => alive && setPreview(p))
                .catch(() => alive && setPreview(null));
        }, 350);
        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [cron, timezone]);

    const hours = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") }));
    const minutes = [0, 5, 10, 15, 20, 30, 45].map((m) => ({ value: String(m), label: String(m).padStart(2, "0") }));
    if (!minutes.some((m) => Number(m.value) === b.minute)) minutes.push({ value: String(b.minute), label: String(b.minute).padStart(2, "0") });

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1">
                {CRON_PRESETS.map((p) => (
                    <Chip key={p.id} color="#38bdf8" active={cron.trim() === p.cron} onClick={() => onCron(p.cron)}>
                        {p.label}
                    </Chip>
                ))}
            </div>
            <Tabs
                value={mode}
                onChange={setMode}
                tabs={[
                    { id: "simple", label: "Builder" },
                    { id: "advanced", label: "Cron expression" },
                ]}
            />
            {mode === "simple" ? (
                <div className="space-y-2 rounded-lg border border-white/10 p-2.5">
                    <div className="flex flex-wrap gap-1">
                        {(["minutes", "hourly", "daily", "weekly", "monthly"] as BuilderMode[]).map((m) => (
                            <Chip key={m} color="#a78bfa" active={b.mode === m} onClick={() => setB({ mode: m })}>
                                {m === "minutes" ? "Every N min" : m[0].toUpperCase() + m.slice(1)}
                            </Chip>
                        ))}
                    </div>
                    {b.mode === "minutes" && (
                        <Field label="Every (minutes)">
                            <Select value={String(b.everyMinutes)} onChange={(v) => setB({ everyMinutes: Number(v) })} options={[5, 10, 15, 20, 30, 45].map((n) => ({ value: String(n), label: `${n} minutes` }))} />
                        </Field>
                    )}
                    {b.mode !== "minutes" && (
                        <div className="grid grid-cols-2 gap-2">
                            {b.mode !== "hourly" && (
                                <Field label="Hour">
                                    <Select value={String(b.hour)} onChange={(v) => setB({ hour: Number(v) })} options={hours} />
                                </Field>
                            )}
                            <Field label="Minute">
                                <Select value={String(b.minute)} onChange={(v) => setB({ minute: Number(v) })} options={minutes} />
                            </Field>
                        </div>
                    )}
                    {b.mode === "weekly" && (
                        <div className="flex gap-1">
                            {DAY_SHORT.map((label, i) => {
                                const on = b.days.includes(i);
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => setB({ days: on ? b.days.filter((x) => x !== i) : [...b.days, i] })}
                                        className={cx("flex-1 rounded-md border py-1 text-[11px] font-semibold", on ? "border-indigo-400/50 bg-indigo-500/20 text-white" : "border-white/10 text-slate-500")}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {b.mode === "monthly" && (
                        <Field label="Day of month" hint="1–28">
                            <TextInput type="number" min={1} max={28} value={b.dayOfMonth} onChange={(e) => setB({ dayOfMonth: Number(e.target.value) })} />
                        </Field>
                    )}
                </div>
            ) : (
                <Field label="Expression" hint="minute hour day month weekday">
                    <TextInput value={cron} onChange={(e) => onCron(e.target.value)} className="font-mono" />
                </Field>
            )}
            <Field label="Timezone">
                <Select value={timezone} onChange={onTimezone} options={(TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]).map((t) => ({ value: t, label: t }))} />
            </Field>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
                    <Clock className="h-3.5 w-3.5 text-sky-300" /> {describeCron(cron)}
                    <code className="ml-auto text-[10px] text-slate-500">{cron}</code>
                </div>
                {preview && !preview.valid && <div className="mt-1 text-[11px] text-red-300">{preview.error ?? "Invalid expression"}</div>}
                {preview?.valid && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {preview.next.map((n) => (
                            <span key={n} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">
                                {formatWhen(n, timezone)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Run log                                                             */
/* ------------------------------------------------------------------ */

export function RunTable({ runs, compact, onSelect, selectedId }: { runs: OsRun[]; compact?: boolean; onSelect?: (r: OsRun) => void; selectedId?: string | null }) {
    const agents = useAosStore((s) => s.agents);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="px-2 py-1.5 font-semibold">When</th>
                        {!compact && <th className="px-2 py-1.5 font-semibold">Routine</th>}
                        <th className="px-2 py-1.5 font-semibold">Agent</th>
                        <th className="px-2 py-1.5 font-semibold">Trigger</th>
                        <th className="px-2 py-1.5 font-semibold">Status</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Tokens</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Cost</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {runs.map((r) => {
                        const agent = agentById(agents, r.agentId);
                        return (
                            <tr
                                key={r.id}
                                onClick={() => onSelect?.(r)}
                                className={cx("border-t border-white/5", onSelect && "cursor-pointer hover:bg-white/[0.04]", selectedId === r.id && "bg-indigo-500/10")}
                                title={r.blockedReason ?? r.error ?? undefined}
                            >
                                <td className="whitespace-nowrap px-2 py-1.5 text-slate-400">{timeAgo(r.startedAt)}</td>
                                {!compact && <td className="max-w-[220px] truncate px-2 py-1.5 font-medium text-slate-200">{r.routineName ?? (r.kind === "test" ? "Agent test" : "—")}</td>}
                                <td className="px-2 py-1.5">
                                    {agent ? (
                                        <span className="flex items-center gap-1.5">
                                            <AgentDot color={agent.color} name={agent.name} size={16} />
                                            <span className="text-slate-300">{agent.name}</span>
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">system</span>
                                    )}
                                </td>
                                <td className="px-2 py-1.5 text-slate-400">{r.trigger}</td>
                                <td className="px-2 py-1.5">
                                    <RunStatusChip status={r.status} />
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">{fmtTokens(r.tokensIn + r.tokensOut)}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">{fmtUsd(r.costUsd)}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{fmtMs(r.durationMs)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function RunDetail({ run, onClose }: { run: OsRun; onClose?: () => void }) {
    const agents = useAosStore((s) => s.agents);
    const agent = agentById(agents, run.agentId);
    return (
        <div className="space-y-2.5">
            <div className="flex items-center gap-2">
                <RunStatusChip status={run.status} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{run.routineName ?? (run.kind === "test" ? "Agent test" : "Run")}</span>
                {onClose && (
                    <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                    ["Agent", agent?.name ?? "system"],
                    ["Trigger", run.trigger],
                    ["Started", formatWhen(run.startedAt)],
                    ["Duration", fmtMs(run.durationMs)],
                    ["Model", [run.provider, run.model].filter(Boolean).join(" · ") || "—"],
                    ["Output to", run.outputTarget ?? "—"],
                    ["Tokens in / out", `${fmtTokens(run.tokensIn)} / ${fmtTokens(run.tokensOut)}`],
                    ["Cost", fmtUsd(run.costUsd)],
                ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">{k}</div>
                        <div className="truncate text-slate-200">{v}</div>
                    </div>
                ))}
            </div>
            {run.blockedReason && (
                <div className="flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 p-2 text-[11px] text-amber-100">
                    <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Blocked by the deterministic gate: {run.blockedReason}
                </div>
            )}
            {run.error && <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-2 text-[11px] text-red-200">{run.error}</div>}
            {run.approvalId && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-2 text-[11px] text-amber-100">
                    <ShieldAlert className="h-3.5 w-3.5" /> Delivery is waiting for approval in Governance.
                </div>
            )}
            {run.output && (
                <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Output (draft)</div>
                    <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-2.5 font-sans text-[12px] leading-relaxed text-slate-200">{run.output}</pre>
                </div>
            )}
            {run.prompt && (
                <details className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-500">Prompt sent</summary>
                    <pre className="mt-1.5 max-h-[220px] overflow-auto whitespace-pre-wrap font-mono text-[10px] text-slate-400">{run.prompt}</pre>
                </details>
            )}
            <div className="text-[10px] text-slate-600">Run log is append-only — finished runs can&apos;t be edited or deleted.</div>
        </div>
    );
}

function RunLog() {
    const { runs, routines } = usePulseStore(useShallow((s) => ({ runs: s.runs, routines: s.routines })));
    const agents = useAosStore((s) => s.agents);
    const [status, setStatus] = useState("");
    const [agentId, setAgentId] = useState("");
    const [routineId, setRoutineId] = useState("");
    const [trigger, setTrigger] = useState("");
    const [selected, setSelected] = useState<string | null>(null);

    const filtered = runs.filter((r) => (!status || r.status === status) && (!agentId || r.agentId === agentId) && (!routineId || r.routineId === routineId) && (!trigger || r.trigger === trigger));
    const sel = runs.find((r) => r.id === selected) ?? null;
    const totals = filtered.reduce((a, r) => ({ tokens: a.tokens + r.tokensIn + r.tokensOut, cost: a.cost + r.costUsd }), { tokens: 0, cost: 0 });

    return (
        <div className={cx("grid h-full min-h-0", sel ? "grid-cols-[1fr_380px]" : "grid-cols-1")}>
            <div className="flex min-h-0 flex-col">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-4 py-2">
                    <Select value={status} onChange={setStatus} className="w-32 py-1" options={[{ value: "", label: "All statuses" }, ...Object.entries(RUN_STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
                    <Select value={agentId} onChange={setAgentId} className="w-36 py-1" options={[{ value: "", label: "All agents" }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
                    <Select value={routineId} onChange={setRoutineId} className="w-44 py-1" options={[{ value: "", label: "All routines" }, ...routines.map((r) => ({ value: r.id, label: r.name }))]} />
                    <Select
                        value={trigger}
                        onChange={setTrigger}
                        className="w-32 py-1"
                        options={[{ value: "", label: "All triggers" }, ...["schedule", "manual", "queue", "dispatch", "autopilot", "workflow"].map((t) => ({ value: t, label: t }))]}
                    />
                    <span className="ml-auto text-[11px] text-slate-400">
                        {filtered.length} runs · {fmtTokens(totals.tokens)} tokens · {fmtUsd(totals.cost)}
                    </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
                    {filtered.length ? (
                        <RunTable runs={filtered} onSelect={(r) => setSelected(r.id)} selectedId={selected} />
                    ) : (
                        <EmptyState icon={FileText} title="No runs" hint="Runs appear here when routines fire, are queued, or you test an agent." />
                    )}
                </div>
            </div>
            {sel && (
                <aside className="min-h-0 overflow-y-auto border-l border-white/10 p-3">
                    <RunDetail run={sel} onClose={() => setSelected(null)} />
                </aside>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Caps & budget                                                       */
/* ------------------------------------------------------------------ */

export function CapBar({ label, cap, format, icon: Icon }: { label: string; cap: OsCapUsage | undefined; format: (n: number) => string; icon: LucideIcon }) {
    const pct = cap?.pct ?? 0;
    const color = pct >= 1 ? "#ef4444" : pct >= 0.8 ? "#f59e0b" : "#22c55e";
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <Icon className="h-3.5 w-3.5" style={{ color }} /> {label}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums text-white">{format(cap?.used ?? 0)}</span>
                <span className="text-[11px] text-slate-500">/ {cap?.limit ? format(cap.limit) : "∞"}</span>
                <span className="ml-auto text-[11px] font-semibold tabular-nums" style={{ color }}>
                    {Math.round(pct * 100)}%
                </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
            </div>
        </div>
    );
}

function CapsPanel() {
    const { status, pulseSettings } = usePulseStore(useShallow((s) => ({ status: s.status, pulseSettings: s.settings })));
    const settings = useAosStore((s) => s.settings);
    const [d, setD] = useState({
        dailyRunCeiling: 50,
        rollingWindowMinutes: 60,
        rollingWindowCeiling: 15,
        monthlyTokenBudget: 200000,
        runCostCeilingUsd: 5,
    });
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (!loaded && settings && pulseSettings) {
            setD({
                dailyRunCeiling: settings.dailyRunCeiling,
                rollingWindowMinutes: settings.rollingWindowMinutes,
                rollingWindowCeiling: settings.rollingWindowCeiling,
                monthlyTokenBudget: settings.monthlyTokenBudget,
                runCostCeilingUsd: pulseSettings.runCostCeilingUsd,
            });
            setLoaded(true);
        }
    }, [settings, pulseSettings, loaded]);
    const dirty =
        !!settings &&
        !!pulseSettings &&
        (d.dailyRunCeiling !== settings.dailyRunCeiling ||
            d.rollingWindowMinutes !== settings.rollingWindowMinutes ||
            d.rollingWindowCeiling !== settings.rollingWindowCeiling ||
            d.monthlyTokenBudget !== settings.monthlyTokenBudget ||
            d.runCostCeilingUsd !== pulseSettings.runCostCeilingUsd);

    return (
        <div className="h-full space-y-3 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <CapBar label="Runs today" cap={status?.dailyRuns} format={(n) => `${Math.round(n)}`} icon={Play} />
                <CapBar label={`Last ${settings?.rollingWindowMinutes ?? 60} min`} cap={status?.rollingRuns} format={(n) => `${Math.round(n)}`} icon={Timer} />
                <CapBar label="Tokens this month" cap={status?.monthlyTokens} format={fmtTokens} icon={Coins} />
                <CapBar label="Cost today" cap={status?.dailyCost} format={fmtUsd} icon={Coins} />
            </div>
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: "Success today", value: status?.successToday ?? 0, color: "#22c55e" },
                    { label: "Failed today", value: status?.failedToday ?? 0, color: "#ef4444" },
                    { label: "Blocked today", value: status?.blockedToday ?? 0, color: "#f59e0b" },
                    { label: "Queue depth", value: status?.queueDepth ?? 0, color: "#38bdf8" },
                ].map((k) => (
                    <div key={k.label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">{k.label}</div>
                        <div className="text-lg font-bold tabular-nums" style={{ color: k.color }}>
                            {k.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <Section title="Engine" icon={Zap}>
                    <div className="space-y-2">
                        <div className={cx("flex items-center gap-3 rounded-xl border p-2.5", status?.killSwitch ? "border-red-400/40 bg-red-500/10" : "border-white/10")}>
                            <Power className={cx("h-4 w-4", status?.killSwitch ? "text-red-300" : "text-slate-500")} />
                            <div className="flex-1">
                                <div className="text-[12px] font-semibold text-white">Kill switch</div>
                                <div className="text-[10px] text-slate-400">Blocks every run and freezes every agent.</div>
                            </div>
                            <Button
                                size="sm"
                                variant={status?.killSwitch ? "success" : "danger"}
                                icon={Power}
                                onClick={() => void runPulse(status?.killSwitch ? "Agents resumed" : "All agents frozen", () => aosApi.setKillSwitch(!status?.killSwitch))}
                            >
                                {status?.killSwitch ? "Resume all" : "Freeze all"}
                            </Button>
                        </div>
                        <Toggle
                            checked={!!pulseSettings?.pulseEnabled}
                            onChange={(v) => void runPulse(v ? "Pulse scheduler on" : "Pulse scheduler paused", () => pulseApi.updatePulseSettings({ pulseEnabled: v }))}
                            label="Scheduler"
                            hint="When paused, scheduled routines and the queue wait. Run-now still works (gated)."
                        />
                        <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">AI mode</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {(
                                    [
                                        { id: "live", label: "Live LLM", hint: "Calls your AI Studio provider — uses tokens" },
                                        { id: "dry_run", label: "Dry run", hint: "No model calls, zero cost — test schedules safely" },
                                    ] as const
                                ).map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => void runPulse(`AI mode: ${m.label}`, () => pulseApi.updatePulseSettings({ llmMode: m.id }))}
                                        className={cx("rounded-lg border p-2 text-left", pulseSettings?.llmMode === m.id ? "border-indigo-400/50 bg-indigo-500/10" : "border-white/10 hover:bg-white/5")}
                                    >
                                        <div className="text-[12px] font-semibold text-white">{m.label}</div>
                                        <div className="text-[10px] text-slate-500">{m.hint}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[11px]">
                            <span className={cx("h-2 w-2 rounded-full", status?.providerReady ? "bg-emerald-400" : "bg-amber-400")} />
                            <span className="text-slate-300">
                                Provider: <b className="text-white">{status?.provider ?? "unknown"}</b>
                                {status?.model ? ` · ${status.model}` : ""}
                            </span>
                            <a href="/admin/ai-studio" className="ml-auto text-indigo-300 hover:underline">
                                AI Studio settings →
                            </a>
                        </div>
                    </div>
                </Section>

                <Section title="Caps & budget" icon={Gauge}>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Runs per day">
                            <TextInput type="number" min={1} value={d.dailyRunCeiling} onChange={(e) => setD({ ...d, dailyRunCeiling: Number(e.target.value) })} />
                        </Field>
                        <Field label="Daily cost ceiling (USD)">
                            <TextInput type="number" min={0} step={0.5} value={d.runCostCeilingUsd} onChange={(e) => setD({ ...d, runCostCeilingUsd: Number(e.target.value) })} />
                        </Field>
                        <Field label="Rolling window (min)">
                            <TextInput type="number" min={1} value={d.rollingWindowMinutes} onChange={(e) => setD({ ...d, rollingWindowMinutes: Number(e.target.value) })} />
                        </Field>
                        <Field label="Runs per window">
                            <TextInput type="number" min={1} value={d.rollingWindowCeiling} onChange={(e) => setD({ ...d, rollingWindowCeiling: Number(e.target.value) })} />
                        </Field>
                        <Field label="Monthly token budget" className="col-span-2">
                            <TextInput type="number" min={0} step={10000} value={d.monthlyTokenBudget} onChange={(e) => setD({ ...d, monthlyTokenBudget: Number(e.target.value) })} />
                        </Field>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500">Checked before every run — no model call happens once a cap is hit.</span>
                        <Button variant="primary" icon={Save} disabled={!dirty} onClick={() => void runPulse("Caps saved", () => pulseApi.updatePulseSettings(d))}>
                            Save caps
                        </Button>
                    </div>
                </Section>
            </div>

            <Section title="Coming up" icon={CalendarClock}>
                <NextRuns />
            </Section>
        </div>
    );
}

export function NextRuns({ limit = 8 }: { limit?: number }) {
    const status = usePulseStore((s) => s.status);
    const agents = useAosStore((s) => s.agents);
    const now = useNow(10_000);
    const list = (status?.nextRuns ?? []).slice(0, limit);
    if (!list.length) return <div className="py-4 text-center text-[12px] text-slate-500">No enabled routines. Enable one in Pulse → Routines.</div>;
    return (
        <div className="space-y-1">
            {list.map((n) => {
                const agent = agentById(agents, n.agentId);
                const K = KIND_META[n.kind] ?? KIND_META.prompt;
                return (
                    <div key={n.routineId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                        <K.icon className="h-3.5 w-3.5 shrink-0" style={{ color: K.color }} />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200">{n.name}</span>
                        {agent && <AgentDot color={agent.color} name={agent.name} size={16} />}
                        <span className="w-36 truncate text-right text-[10px] text-slate-500">{describeCron(n.cron)}</span>
                        <span className="w-16 text-right text-[11px] font-semibold tabular-nums text-sky-300">{timeUntil(n.nextRunAt, now)}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

function QueuePanel() {
    const { queue, routines } = usePulseStore(useShallow((s) => ({ queue: s.queue, routines: s.routines })));
    const now = useNow(5000);
    return (
        <div className="h-full overflow-y-auto p-4">
            <Section title={`Run queue · ${queue.length}`} icon={FastForward}>
                <p className="mb-2 text-[11px] text-slate-500">Queued runs are picked up by the Pulse runner on its next tick (every ~20 s), oldest first, and pass the same gate as scheduled runs.</p>
                <div className="space-y-1">
                    {queue.map((q) => {
                        const r = routines.find((x) => x.id === q.routineId);
                        return (
                            <div key={q.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                                <Hourglass className="h-3.5 w-3.5 animate-pulse text-sky-300" />
                                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200">{r?.name ?? q.routineId}</span>
                                <span className="text-[10px] text-slate-500">queued {timeAgo(q.requestedAt, now)}</span>
                                <Button size="sm" variant="ghost" icon={X} onClick={() => void runPulse("Removed from queue", () => pulseApi.cancelQueued(q.id))}>
                                    Cancel
                                </Button>
                            </div>
                        );
                    })}
                    {!queue.length && <div className="py-8 text-center text-[12px] text-slate-500">Queue is empty.</div>}
                </div>
            </Section>
        </div>
    );
}
