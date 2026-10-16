"use client";

import React, { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Activity, ChevronLeft, ChevronRight, CircleCheck, Info, Search, TriangleAlert, Users, XCircle, type LucideIcon } from "lucide-react";
import { STATUS_META, ZONES } from "../lib/floorplan";
import { useOfficeStore } from "../lib/store";
import type { ActivityEntry, ActivityLevel, Agent, AgentStatus } from "../lib/types";
import { RosterKindBadge } from "@/components/agentic-os/ui/RosterKindBadge";
import { AgentBadge, GLASS, ModuleChip, ProgressBar, cx, relativeTime, useNow } from "./shared";

type Filter = "all" | "active" | "idle" | "meeting" | "attention";

const FILTERS: { id: Filter; label: string; match: (s: AgentStatus) => boolean }[] = [
    { id: "all", label: "All", match: () => true },
    { id: "active", label: "Active", match: (s) => s === "working" || s === "thinking" },
    { id: "idle", label: "Idle", match: (s) => s === "idle" },
    { id: "meeting", label: "Meeting", match: (s) => s === "meeting" },
    { id: "attention", label: "Attention", match: (s) => s === "error" || s === "paused" || s === "offline" },
];

export const LEVEL_ICON: Record<ActivityLevel, { icon: LucideIcon; color: string }> = {
    info: { icon: Info, color: "#38bdf8" },
    success: { icon: CircleCheck, color: "#22c55e" },
    warning: { icon: TriangleAlert, color: "#f59e0b" },
    error: { icon: XCircle, color: "#ef4444" },
};

function AgentRow({ agent, selected, onSelect, onHover }: { agent: Agent; selected: boolean; onSelect: () => void; onHover: (on: boolean) => void }) {
    const meta = STATUS_META[agent.status];
    return (
        <button
            type="button"
            onClick={onSelect}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
            className={cx(
                "group flex w-full items-start gap-3 rounded-xl border px-2.5 py-2 text-left transition",
                selected ? "border-white/25 bg-white/10" : "border-transparent hover:border-white/10 hover:bg-white/5",
            )}
        >
            <AgentBadge agent={agent} size={34} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-white">{agent.name}</span>
                    {agent.rosterKind && <RosterKindBadge kind={agent.rosterKind} />}
                    <span className="shrink-0 text-[10px] font-medium" style={{ color: meta.color }}>
                        {meta.label}
                    </span>
                </div>
                <div className="truncate text-[11px] text-slate-400">{agent.role}</div>
                {agent.task && (
                    <div className="mt-1.5 space-y-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <ModuleChip moduleId={agent.task.moduleId} />
                            <span className="truncate text-[10px] text-slate-300">{agent.task.title}</span>
                        </div>
                        <ProgressBar value={agent.task.progress} color={meta.color} />
                    </div>
                )}
            </div>
        </button>
    );
}

export function ActivityList({ entries, compact }: { entries: ActivityEntry[]; compact?: boolean }) {
    const now = useNow(5000);
    const select = useOfficeStore((s) => s.select);
    if (!entries.length) return <div className="px-3 py-8 text-center text-xs text-slate-500">No activity yet.</div>;
    return (
        <ol className="space-y-1">
            {entries.map((e) => {
                const { icon: Icon, color } = LEVEL_ICON[e.level];
                return (
                    <li key={e.id}>
                        <button
                            type="button"
                            disabled={!e.agentId}
                            onClick={() => e.agentId && select(e.agentId)}
                            className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition enabled:hover:bg-white/5"
                        >
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className={cx("text-[12px] leading-snug text-slate-200", compact && "line-clamp-2")}>{e.message}</span>
                                {e.moduleId && <ModuleChip moduleId={e.moduleId} className="self-start" />}
                            </span>
                            <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{relativeTime(e.ts, now)}</span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

export function AgentRoster() {
    const { agents, activity, selectedId, select, hover, focusOnZone } = useOfficeStore(
        useShallow((s) => ({
            agents: s.agents,
            activity: s.activity,
            selectedId: s.selectedId,
            select: s.select,
            hover: s.hover,
            focusOnZone: s.focusOnZone,
        })),
    );
    const [open, setOpen] = useState(true);
    const [tab, setTab] = useState<"agents" | "activity">("agents");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const grouped = useMemo(() => {
        const q = query.trim().toLowerCase();
        const match = FILTERS.find((f) => f.id === filter)!.match;
        const visible = agents.filter(
            (a) => match(a.status) && (!q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.task?.title.toLowerCase().includes(q)),
        );
        return ZONES.map((z) => ({ zone: z, agents: visible.filter((a) => a.zone === z.id) })).filter((g) => g.agents.length);
    }, [agents, query, filter]);

    const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, agents.filter((a) => f.match(a.status)).length])), [agents]);

    if (!open) {
        return (
            <div className="pointer-events-auto absolute left-4 top-24">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cx(GLASS, "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-slate-900/80")}
                >
                    <Users className="h-4 w-4 text-cyan-300" />
                    Agents
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
            </div>
        );
    }

    return (
        <aside className={cx(GLASS, "pointer-events-auto absolute bottom-4 left-4 top-24 flex w-[300px] flex-col overflow-hidden rounded-2xl")}>
            <div className="flex items-center gap-1 border-b border-white/10 p-2">
                {(
                    [
                        { id: "agents", label: "Agents", icon: Users },
                        { id: "activity", label: "Activity", icon: Activity },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={cx(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition",
                            tab === t.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
                        )}
                    >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                    </button>
                ))}
                <button
                    type="button"
                    title="Collapse"
                    onClick={() => setOpen(false)}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            </div>

            {tab === "agents" ? (
                <>
                    <div className="space-y-2 p-3 pb-2">
                        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-cyan-400/50">
                            <Search className="h-3.5 w-3.5 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search agents, roles, tasks…"
                                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                            />
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFilter(f.id)}
                                    className={cx(
                                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                        filter === f.id
                                            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                                            : "border-white/10 text-slate-400 hover:text-white",
                                    )}
                                >
                                    {f.label} <span className="opacity-60">{counts[f.id]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto px-2 pb-3">
                        {grouped.map(({ zone, agents: list }) => (
                            <section key={zone.id}>
                                <button
                                    type="button"
                                    onClick={() => focusOnZone(zone.id)}
                                    className="mb-1 flex w-full items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] hover:opacity-80"
                                    style={{ color: zone.color }}
                                    title={`Fly to ${zone.name}`}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: zone.color }} />
                                    {zone.name}
                                    <span className="ml-auto text-slate-500">{list.length}</span>
                                </button>
                                <div className="space-y-0.5">
                                    {list.map((a) => (
                                        <AgentRow
                                            key={a.id}
                                            agent={a}
                                            selected={a.id === selectedId}
                                            onSelect={() => select(a.id)}
                                            onHover={(on) => hover(on ? a.id : null)}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                        {!grouped.length && <div className="py-10 text-center text-xs text-slate-500">No agents match.</div>}
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto p-2">
                    <ActivityList entries={activity} />
                </div>
            )}
        </aside>
    );
}
