"use client";

import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Activity, AlertTriangle, Bot, CalendarClock, CircleCheck, Coins, Gauge, ListTodo, Play, Power, ShieldAlert, Sparkles, Timer } from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { aosApi, fetchAudit, fetchKasirLiveSnapshot } from "../lib/api";
import { formatKasirMetricLine, rosterKindForAgent } from "../lib/firstEmployee";
import { startPulsePolling, usePulseStore } from "../lib/pulseStore";
import { agentById, useAosStore } from "../lib/store";
import type { OsAuditEntry } from "../lib/types";
import { AgentDot, Button, Chip, Field, Section, TextInput, Toggle, cx, timeAgo } from "../ui/kit";
import { RosterKindBadge } from "../ui/RosterKindBadge";
import { CapBar, NextRuns } from "./Pulse";

const LEVEL_COLOR: Record<string, string> = { info: "#94a3b8", success: "#22c55e", warning: "#f59e0b", error: "#ef4444" };

/** Live audit feed (polls `aosAudit`). */
function useAudit(limit = 40, filter: { entity?: string; actorId?: string } = {}) {
    const [rows, setRows] = useState<OsAuditEntry[]>([]);
    const key = `${filter.entity ?? ""}|${filter.actorId ?? ""}|${limit}`;
    useEffect(() => {
        let alive = true;
        const load = () =>
            fetchAudit({ limit, entity: filter.entity || undefined, actorId: filter.actorId || undefined })
                .then((r) => alive && setRows(r))
                .catch(() => undefined);
        void load();
        const t = setInterval(load, 4000);
        return () => {
            alive = false;
            clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return rows;
}

function AuditRow({ e }: { e: OsAuditEntry }) {
    const agents = useAosStore((s) => s.agents);
    const agent = e.actorType === "agent" ? agentById(agents, e.actorId) : undefined;
    const mo = e.moduleId ? MODULES[e.moduleId as ModuleId] : undefined;
    return (
        <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
            {agent ? (
                <AgentDot color={agent.color} name={agent.name} size={20} />
            ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[e.level] }} />
            )}
            <div className="min-w-0 flex-1">
                <div className="text-[12px] leading-snug text-slate-200">{e.summary || `${e.action} ${e.entity}`}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>{e.actorType === "user" ? "You / team" : e.actorType === "agent" ? agent?.name ?? e.actorId : "System"}</span>
                    {mo && <Chip color={mo.color}>{mo.name}</Chip>}
                    <span className="ml-auto">{timeAgo(e.createdAt)}</span>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Overview (MAPS · Screen)                                            */
/* ------------------------------------------------------------------ */

export function Overview({ onOpen }: { onOpen: (app: string, params?: Record<string, string>) => void }) {
    const { stats, agents, tasks, settings, lastSync } = useAosStore(useShallow((s) => ({ stats: s.stats, agents: s.agents, tasks: s.tasks, settings: s.settings, lastSync: s.lastSync })));
    useEffect(() => startPulsePolling(10_000), []);
    const { pulse, pulseState, pulseSync } = usePulseStore(useShallow((s) => ({ pulse: s.status, pulseState: s.state, pulseSync: s.lastSync })));
    const audit = useAudit(14);
    const [kasirLive, setKasirLive] = useState<Awaited<ReturnType<typeof fetchKasirLiveSnapshot>> | null>(null);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        let alive = true;
        const load = () =>
            fetchKasirLiveSnapshot()
                .then((s) => alive && setKasirLive(s))
                .catch(
                    () =>
                        alive &&
                        setKasirLive({
                            available: false,
                            tenantId: "default",
                            slug: "umkm-kasir",
                            name: "Kasir UMKM",
                            role: "UMKM WhatsApp Kasir",
                            source: "ai_studio",
                            unavailableReason: "data tidak tersedia",
                            waChatsToday: null,
                            transactionsToday: null,
                            lastActivityAt: null,
                            waOnline: null,
                        }),
                );
        void load();
        const t = setInterval(load, 5000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const stale = lastSync ? now - lastSync > 15000 : true;
    const pulseStale = pulseSync ? now - pulseSync > 30000 : true;

    const kpis = [
        { label: "Active agents", value: `${stats?.activeAgents ?? 0}/${stats?.totalAgents ?? 0}`, icon: Bot, color: "#38bdf8", app: "studio" },
        { label: "Running", value: stats?.runningTasks ?? 0, icon: Activity, color: "#22d3ee", app: "tasks" },
        { label: "Queued", value: stats?.queuedTasks ?? 0, icon: ListTodo, color: "#94a3b8", app: "tasks" },
        { label: "Needs approval", value: stats?.pendingApprovals ?? 0, icon: ShieldAlert, color: "#f59e0b", app: "governance" },
        { label: "In review", value: stats?.reviewTasks ?? 0, icon: Sparkles, color: "#a855f7", app: "tasks" },
        { label: "Done today", value: stats?.doneToday ?? 0, icon: CircleCheck, color: "#22c55e", app: "tasks" },
    ];

    const busiest = agents
        .filter((a) => !a.archivedAt)
        .map((a) => ({ a, open: tasks.filter((t) => t.agentId === a.id && ["queued", "running", "awaiting_approval", "review"].includes(t.status)).length, running: tasks.find((t) => t.agentId === a.id && t.status === "running") }))
        .sort((x, y) => y.open - x.open)
        .slice(0, 8);

    return (
        <div className="h-full space-y-3 overflow-y-auto p-4">
            {settings?.killSwitch && (
                <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
                    <Power className="h-4 w-4" /> Kill switch is ON — every agent is frozen. Turn it off in Settings.
                </div>
            )}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                {kpis.map((k) => (
                    <button key={k.label} type="button" onClick={() => onOpen(k.app)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            <k.icon className="h-3.5 w-3.5" style={{ color: k.color }} /> {k.label}
                        </div>
                        <div className="mt-1 text-2xl font-bold tabular-nums text-white">{k.value}</div>
                    </button>
                ))}
            </div>

            {kasirLive && (
                <Section title="First employee · AI Studio Kasir" icon={Sparkles}>
                    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3">
                        <AgentDot color="#22c55e" name={kasirLive.name} size={36} />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[14px] font-semibold text-white">{kasirLive.name}</span>
                                <RosterKindBadge
                                    kind={rosterKindForAgent("kasir-live", kasirLive.slug, {
                                        uiDemoMode: settings?.uiDemoMode,
                                    })}
                                />
                                <Chip color="#38bdf8">AI Studio</Chip>
                            </div>
                            <p className="mt-1 text-[12px] text-slate-300">{formatKasirMetricLine(kasirLive)}</p>
                            <p className="mt-1 text-[10px] text-slate-500">
                                Task queue is persisted in Postgres and advances via the middleware worker. Roster agents show Live unless explicit UI demo mode is on.
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1.5">
                            <Button size="sm" onClick={() => onOpen("studio")}>
                                Agent roster
                            </Button>
                            <a href="/admin/ai-studio/ai-gateway" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-center text-[11px] font-semibold text-emerald-200 hover:bg-white/5">
                                Hubungkan WhatsApp
                            </a>
                            <a href="/admin/ai-studio/percakapan-wa" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-center text-[11px] font-semibold text-sky-200 hover:bg-white/5">
                                Percakapan WA
                            </a>
                        </div>
                    </div>
                </Section>
            )}

            <div className="grid gap-3 lg:grid-cols-5">
                <Section title="Agents at work" icon={Bot} className="lg:col-span-3" actions={<span className={cx("text-[10px]", stale ? "text-amber-300" : "text-slate-500")}>{stale ? "stale · " : ""}synced {lastSync ? timeAgo(new Date(lastSync).toISOString(), now) : "never"}</span>}>
                    <div className="space-y-1">
                        {busiest.map(({ a, open, running }) => (
                            <button key={a.id} type="button" onClick={() => onOpen("tasks", { agentId: a.id })} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
                                <AgentDot color={a.color} name={a.name} size={24} />
                                <span className="flex w-28 shrink-0 items-center gap-1 truncate text-[12px] font-semibold text-white">
                                    {a.name}
                                    <RosterKindBadge kind={rosterKindForAgent(a.id, a.slug, { uiDemoMode: settings?.uiDemoMode, agent: a })} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{running ? running.title : a.status === "active" ? "Idle" : a.status}</span>
                                {running && (
                                    <span className="w-20 shrink-0">
                                        <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                                            <span className="block h-full rounded-full" style={{ width: `${Math.round(running.progress * 100)}%`, background: a.color }} />
                                        </span>
                                    </span>
                                )}
                                <span className="w-14 shrink-0 text-right text-[10px] text-slate-500">{open} open</span>
                            </button>
                        ))}
                    </div>
                </Section>
                <Section title="Live activity" icon={Activity} className="lg:col-span-2">
                    <div className="max-h-[320px] space-y-0.5 overflow-y-auto">
                        {audit.map((e) => (
                            <AuditRow key={e.id} e={e} />
                        ))}
                        {!audit.length && <div className="py-6 text-center text-[12px] text-slate-500">No activity yet.</div>}
                    </div>
                </Section>
            </div>

            {pulseState !== "unavailable" && (
                <div className="grid gap-3 lg:grid-cols-5">
                    <Section
                        title="Pulse · caps"
                        icon={Gauge}
                        className="lg:col-span-2"
                        actions={
                            <span className={cx("text-[10px]", pulseStale ? "text-amber-300" : "text-slate-500")}>
                                {pulse?.llmMode === "dry_run" ? "dry run · " : ""}
                                {pulseStale ? "stale · " : ""}
                                {pulseSync ? timeAgo(new Date(pulseSync).toISOString(), now) : "never"}
                            </span>
                        }
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <CapBar label="Runs today" cap={pulse?.dailyRuns} format={(n) => `${Math.round(n)}`} icon={Play} />
                            <CapBar label="Rolling window" cap={pulse?.rollingRuns} format={(n) => `${Math.round(n)}`} icon={Timer} />
                            <CapBar label="Tokens / month" cap={pulse?.monthlyTokens} format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`)} icon={Coins} />
                            <CapBar label="Cost today" cap={pulse?.dailyCost} format={(n) => `$${n.toFixed(2)}`} icon={Coins} />
                        </div>
                    </Section>
                    <Section
                        title="Pulse · coming up"
                        icon={CalendarClock}
                        className="lg:col-span-3"
                        actions={
                            <Button size="sm" onClick={() => onOpen("pulse")}>
                                Open Pulse
                            </Button>
                        }
                    >
                        <NextRuns limit={6} />
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2 text-[10px]">
                            <Chip color="#22c55e">{pulse?.successToday ?? 0} ok today</Chip>
                            <Chip color="#ef4444">{pulse?.failedToday ?? 0} failed</Chip>
                            <Chip color="#f59e0b">{pulse?.blockedToday ?? 0} blocked</Chip>
                            <Chip color="#38bdf8">{pulse?.queueDepth ?? 0} queued</Chip>
                        </div>
                    </Section>
                </div>
            )}

            <Section title="MAPS layers" icon={Gauge}>
                <div className="grid gap-2 md:grid-cols-4">
                    {[
                        { k: "M", name: "Memory", desc: "Memory map: areas → signposts → items", app: "memory", ready: true },
                        { k: "A", name: "Agent", desc: "Personas, models, access, guardrails, workflows", app: "studio", ready: true },
                        { k: "P", name: "Pulse", desc: "Routines, run queue, caps & run log", app: "pulse", ready: true },
                        { k: "S", name: "Screen", desc: "Brain screens, this dashboard + the 3D office", app: "brain", ready: true },
                    ].map((l) => (
                        <button key={l.k} type="button" onClick={() => onOpen(l.app)} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-[14px] font-black text-indigo-200">{l.k}</span>
                            <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                                    {l.name} {!l.ready && <Chip color="#64748b">soon</Chip>}
                                </span>
                                <span className="block text-[10px] text-slate-500">{l.desc}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </Section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function OsSettingsApp() {
    const { settings, run } = useAosStore(useShallow((s) => ({ settings: s.settings, run: s.run })));
    const [d, setD] = useState(settings);
    useEffect(() => {
        if (settings && !d) setD(settings);
    }, [settings, d]);
    if (!d || !settings) return <div className="p-6 text-[12px] text-slate-500">Loading settings…</div>;
    const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD({ ...d, [k]: v });
    const dirty = JSON.stringify(d) !== JSON.stringify(settings);

    return (
        <div className="h-full space-y-3 overflow-y-auto p-4">
            <Section title="Emergency" icon={Power}>
                <div className={cx("flex items-center gap-3 rounded-xl border p-3", settings.killSwitch ? "border-red-400/40 bg-red-500/10" : "border-white/10")}>
                    <AlertTriangle className={cx("h-5 w-5", settings.killSwitch ? "text-red-300" : "text-slate-500")} />
                    <div className="flex-1">
                        <div className="text-[13px] font-semibold text-white">Kill switch</div>
                        <div className="text-[11px] text-slate-400">Freezes every agent and blocks every Pulse run immediately. Nothing is lost — queues resume when you turn it off.</div>
                    </div>
                    <Button variant={settings.killSwitch ? "success" : "danger"} icon={Power} onClick={() => run(settings.killSwitch ? "Agents resumed" : "All agents frozen", () => aosApi.setKillSwitch(!settings.killSwitch))}>
                        {settings.killSwitch ? "Resume all" : "Freeze all"}
                    </Button>
                </div>
            </Section>
            <div className="grid gap-3 md:grid-cols-2">
                <Section title="UI honesty (AI Studio)" icon={Sparkles}>
                    <Toggle
                        checked={d.uiDemoMode}
                        onChange={(v) => set("uiDemoMode", v)}
                        label="UI demo mode"
                        hint="When on, Knowledge Graph and Label Studio show sample data with Demo badges (F1-4)."
                    />
                </Section>
                <Section title="Autopilot (task queue)" icon={Sparkles}>
                    <Toggle checked={d.autopilot} onChange={(v) => set("autopilot", v)} label="Autopilot" hint="Idle agents pick playbooks from their modules" />
                    <Field label="Review cap per agent" hint="Stop autopilot when this many tasks wait for review">
                        <TextInput type="number" min={0} max={50} value={d.autopilotReviewCap} onChange={(e) => set("autopilotReviewCap", Number(e.target.value))} />
                    </Field>
                    <Field label="Seconds per step" hint="Middleware worker interval between task steps" className="mt-2">
                        <TextInput type="number" min={3} max={600} value={d.stepSeconds} onChange={(e) => set("stepSeconds", Number(e.target.value))} />
                    </Field>
                </Section>
                <Section title="Caps & budget (Pulse)" icon={Gauge}>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Runs per day">
                            <TextInput type="number" min={1} value={d.dailyRunCeiling} onChange={(e) => set("dailyRunCeiling", Number(e.target.value))} />
                        </Field>
                        <Field label="Monthly tokens">
                            <TextInput type="number" min={0} step={10000} value={d.monthlyTokenBudget} onChange={(e) => set("monthlyTokenBudget", Number(e.target.value))} />
                        </Field>
                        <Field label="Rolling window (min)">
                            <TextInput type="number" min={1} value={d.rollingWindowMinutes} onChange={(e) => set("rollingWindowMinutes", Number(e.target.value))} />
                        </Field>
                        <Field label="Runs per window">
                            <TextInput type="number" min={1} value={d.rollingWindowCeiling} onChange={(e) => set("rollingWindowCeiling", Number(e.target.value))} />
                        </Field>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">AI mode (live / dry run), the scheduler switch and the daily cost ceiling live in Pulse → Caps &amp; budget.</p>
                </Section>
            </div>
            <div className="flex justify-end gap-2">
                {dirty && (
                    <Button variant="ghost" onClick={() => setD(settings)}>
                        Discard
                    </Button>
                )}
                <Button
                    variant="primary"
                    disabled={!dirty}
                    onClick={async () => {
                        const out = await run("Settings saved", () =>
                            aosApi.updateSettings({
                                autopilot: d.autopilot,
                                autopilotReviewCap: d.autopilotReviewCap,
                                stepSeconds: d.stepSeconds,
                                dailyRunCeiling: d.dailyRunCeiling,
                                monthlyTokenBudget: d.monthlyTokenBudget,
                                rollingWindowMinutes: d.rollingWindowMinutes,
                                rollingWindowCeiling: d.rollingWindowCeiling,
                                uiDemoMode: d.uiDemoMode,
                            }),
                        );
                        if (out) setD(out);
                    }}
                >
                    Save settings
                </Button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Placeholder for upcoming MAPS layers                                */
/* ------------------------------------------------------------------ */

export function ComingSoon({ title, layer, bullets }: { title: string; layer: string; bullets: string[] }) {
    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-[16px] font-black text-indigo-200">{layer}</span>
                    <div>
                        <div className="text-[15px] font-semibold text-white">{title}</div>
                        <div className="text-[11px] text-slate-500">Coming in the next phase — tables &amp; API are already in place</div>
                    </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                    {bullets.map((b) => (
                        <li key={b} className="flex gap-2 text-[12px] text-slate-300">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                            {b}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
