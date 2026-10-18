"use client";

import React, { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Activity, CircleCheck, Info, Search, Sparkles, TriangleAlert, Users, XCircle, type LucideIcon } from "lucide-react";
import { STATUS_META, ZONES, ZONE_BY_ID } from "../lib/floorplan";
import { MASCOT_ID, MASCOT_MOODS, getMascotRankTitle, useMascotStore } from "../lib/mascotStore";
import { useOfficeStore } from "../lib/store";
import type { ActivityEntry, ActivityLevel, Agent, AgentStatus } from "../lib/types";
import { RosterKindBadge } from "@/components/agentic-os/ui/RosterKindBadge";
import { AgentBadge, ModuleChip, ORANGE, OfficeSidePanel, ProgressBar, Section, cx, relativeTime, useNow } from "./shared";

type Filter = "all" | "active" | "idle" | "meeting" | "attention";

const FILTERS: { id: Filter; label: string; match: (s: AgentStatus) => boolean }[] = [
    { id: "all", label: "all", match: () => true },
    { id: "active", label: "active", match: (s) => s === "working" || s === "thinking" },
    { id: "idle", label: "idle", match: (s) => s === "idle" },
    { id: "meeting", label: "meeting", match: (s) => s === "meeting" },
    { id: "attention", label: "alert", match: (s) => s === "error" || s === "paused" || s === "offline" },
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
                "group flex w-full items-start gap-2.5 border border-l-2 px-2.5 py-2 text-left font-mono transition",
                selected
                    ? "border-white/25 border-l-orange-400 bg-white/[0.06]"
                    : "border-transparent border-l-transparent hover:border-white/10 hover:bg-white/[0.03]",
            )}
        >
            <AgentBadge agent={agent} size={32} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-white">{agent.name}</span>
                    {agent.rosterKind && <RosterKindBadge kind={agent.rosterKind} />}
                    <span className="shrink-0 text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.label}
                    </span>
                </div>
                <div className="truncate text-[10px] text-slate-400">{agent.role}</div>
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
    if (!entries.length) return <div className="px-3 py-6 text-center font-mono text-[11px] text-slate-500">No activity yet.</div>;
    return (
        <ol className="divide-y divide-white/[0.05] font-mono">
            {entries.map((e) => {
                const { icon: Icon, color } = LEVEL_ICON[e.level];
                return (
                    <li key={e.id}>
                        <button
                            type="button"
                            disabled={!e.agentId}
                            onClick={() => e.agentId && select(e.agentId)}
                            className="flex w-full items-start gap-2 px-1 py-2 text-left transition enabled:hover:bg-white/[0.03]"
                        >
                            <Icon className="mt-0.5 h-3 w-3 shrink-0" style={{ color }} />
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className={cx("text-[11px] leading-snug text-slate-200", compact && "line-clamp-2")}>{e.message}</span>
                                {e.moduleId && <ModuleChip moduleId={e.moduleId} className="self-start" />}
                            </span>
                            <span className="shrink-0 text-[9.5px] tabular-nums text-slate-500">{relativeTime(e.ts, now)}</span>
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
    const mascot = useMascotStore(
        useShallow((s) => ({
            zone: s.zone,
            spotName: s.spotName,
            activityLabel: s.activityLabel,
            mood: s.mood,
            roaming: s.roaming,
            vitals: s.vitals,
        })),
    );
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
    const activeCount = counts.active ?? 0;
    const mascotRank = getMascotRankTitle(mascot.vitals.level);
    const mascotZone = ZONE_BY_ID[mascot.zone];
    const moodMeta = MASCOT_MOODS[mascot.mood] ?? MASCOT_MOODS.playful;

    return (
        <OfficeSidePanel
            id="left"
            title="Agents · Roster"
            summary={`${agents.length} agents · ${activeCount} active`}
            accent={ORANGE}
            defaultSide="pinned-left"
            defaultW={300}
        >
            {/* View tabs */}
            <div className="flex shrink-0 items-center border-b border-white/[0.07] px-3.5 text-[10px] tracking-[0.14em]">
                {(
                    [
                        { id: "agents", label: `AGENTS (${agents.length})`, icon: Users },
                        { id: "activity", label: `FEED (${activity.length})`, icon: Activity },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={cx(
                            "-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2 transition",
                            tab === t.id ? "border-orange-400 text-white" : "border-transparent text-slate-500 hover:text-slate-200",
                        )}
                    >
                        <t.icon className="h-3 w-3" />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "agents" ? (
                <>
                    <Section title="Filter & search">
                        <label className="mb-2 flex items-center gap-2 border border-white/15 bg-white/[0.02] px-2.5 py-1.5 focus-within:border-orange-400/60">
                            <Search className="h-3 w-3 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="search agents, roles, tasks…"
                                className="w-full bg-transparent text-[11px] text-white placeholder:text-slate-500 focus:outline-none"
                            />
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFilter(f.id)}
                                    className={cx(
                                        "border px-2 py-0.5 text-[9.5px] uppercase tracking-wider transition",
                                        filter === f.id
                                            ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                                            : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white",
                                    )}
                                >
                                    {f.label} <span className="text-slate-500">{counts[f.id]}</span>
                                </button>
                            ))}
                        </div>
                    </Section>

                    <Section
                        title={
                            <span className="flex items-center gap-1.5 text-orange-300">
                                <Sparkles className="h-3 w-3" color={ORANGE} />
                                Office Mascot
                            </span>
                        }
                        right={
                            <span className="text-[9.5px] uppercase tracking-wider" style={{ color: mascotRank.color }}>
                                LV.{mascot.vitals.level} · {mascotRank.title}
                            </span>
                        }
                    >
                        <button
                            type="button"
                            data-testid="vo-roster-mascot"
                            onClick={() => select(MASCOT_ID)}
                            onMouseEnter={() => hover(MASCOT_ID)}
                            onMouseLeave={() => hover(null)}
                            className={cx(
                                "group flex w-full items-start gap-2.5 border border-l-2 px-2.5 py-2 text-left font-mono transition",
                                selectedId === MASCOT_ID
                                    ? "border-orange-400/60 border-l-orange-400 bg-orange-500/10"
                                    : "border-white/10 border-l-orange-400/60 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
                            )}
                        >
                            <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center border border-orange-400/50 bg-orange-500/15 text-[14px]"
                                title="Cinder-Puff Mascot"
                            >
                                {moodMeta.emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[12px] font-semibold text-white">Cinder-Puff</span>
                                    <span
                                        className="shrink-0 text-[9px] font-bold uppercase tracking-wider"
                                        style={{ color: moodMeta.color }}
                                    >
                                        {moodMeta.emoji} {moodMeta.id}
                                    </span>
                                </div>
                                <div className="truncate text-[10px] text-slate-400">
                                    {mascotZone?.name ?? mascot.spotName} · {mascot.spotName}
                                </div>
                                <div className="mt-1 truncate text-[10px] text-orange-200">{mascot.activityLabel}</div>
                            </div>
                        </button>
                    </Section>

                    {grouped.map(({ zone, agents: list }) => (
                        <Section
                            key={zone.id}
                            title={
                                <button
                                    type="button"
                                    onClick={() => focusOnZone(zone.id)}
                                    className="flex items-center gap-1.5 text-left hover:opacity-80"
                                    style={{ color: zone.color }}
                                    title={`Fly camera to ${zone.name}`}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: zone.color }} />
                                    {zone.name}
                                </button>
                            }
                            right={<span className="text-[9.5px] text-slate-500">{list.length}</span>}
                        >
                            <div className="space-y-1">
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
                        </Section>
                    ))}

                    {!grouped.length && (
                        <div className="px-4 py-8 text-center text-[11px] text-slate-500">No agents match the current filter.</div>
                    )}
                </>
            ) : (
                <Section title="Live activity stream" className="flex-1 border-b-0">
                    <ActivityList entries={activity} />
                </Section>
            )}
        </OfficeSidePanel>
    );
}
