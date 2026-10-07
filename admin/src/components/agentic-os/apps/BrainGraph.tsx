"use client";

/**
 * Agentic OS — Brain (MAPS "S" · Screen). Read-only views over the whole
 * system: who knows what, who works where, what runs when, and how healthy it
 * is. Screens never change anything — they only link to the app that can.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Activity, CalendarClock, Clock, Grid3x3, HeartPulse, Network, TriangleAlert, type LucideIcon } from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import type { AppId, AppParams } from "../lib/osUi";
import { startPhase3Polling, usePhase3Store } from "../lib/phase3Store";
import { startPulsePolling, usePulseStore } from "../lib/pulseStore";
import { useAosStore } from "../lib/store";
import { asGraph } from "../lib/workflowGraph";
import type { MemoryHealth, WfAgentData } from "../lib/types";
import { AgentDot, Chip, Tabs, cx, timeAgo } from "../ui/kit";
import { HEALTH_META } from "./MemoryMap";

type View = "constellation" | "matrix" | "schedule" | "timeline" | "health";

/* ------------------------------------------------------------------ */
/* Freshness                                                           */
/* ------------------------------------------------------------------ */

function useNow(ms: number) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(t);
    }, [ms]);
    return now;
}

/** Per-panel "data as of" stamp with a stale badge (no update for > maxAgeMs). */
function Freshness({ at, maxAgeMs, now, error }: { at: number | null; maxAgeMs: number; now: number; error?: string | null }) {
    const stale = !at || now - at > maxAgeMs;
    return (
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock className="h-3 w-3" />
            {at ? new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
            {stale && (
                <span title={error ?? "No fresh data"} className="rounded bg-amber-500/20 px-1 py-px font-bold uppercase text-amber-300">
                    stale
                </span>
            )}
        </span>
    );
}

function Panel({ title, icon: Icon, stamp, children, className }: { title: string; icon: LucideIcon; stamp: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cx("flex min-h-0 flex-col rounded-xl border border-white/10 bg-white/[0.02]", className)}>
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                <Icon className="h-3.5 w-3.5 text-slate-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{title}</h3>
                <span className="ml-auto">{stamp}</span>
            </div>
            <div className="min-h-0 flex-1 p-3">{children}</div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export function BrainGraph({ initialView, onOpen }: { initialView?: string; onOpen: (app: AppId, params?: AppParams) => void }) {
    const [view, setView] = useState<View>((["constellation", "matrix", "schedule", "timeline", "health"] as View[]).includes(initialView as View) ? (initialView as View) : "constellation");
    const now = useNow(5_000);
    const core = useAosStore(useShallow((s) => ({ lastSync: s.lastSync, error: s.error })));
    const pulse = usePulseStore(useShallow((s) => ({ lastSync: s.lastSync, error: s.error })));
    const p3 = usePhase3Store(useShallow((s) => ({ lastSync: s.lastSync, error: s.error })));

    useEffect(() => startPulsePolling(15_000), []);
    useEffect(() => startPhase3Polling(15_000), []);

    const stampCore = <Freshness at={core.lastSync} maxAgeMs={30_000} now={now} error={core.error} />;
    const stampPulse = <Freshness at={pulse.lastSync} maxAgeMs={45_000} now={now} error={pulse.error} />;
    const stampP3 = <Freshness at={p3.lastSync} maxAgeMs={45_000} now={now} error={p3.error} />;
    const oldest = Math.min(core.lastSync ?? 0, pulse.lastSync ?? 0, p3.lastSync ?? 0);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <Tabs<View>
                    value={view}
                    onChange={setView}
                    tabs={[
                        { id: "constellation", label: "Constellation", icon: Network },
                        { id: "matrix", label: "Agents × Modules", icon: Grid3x3 },
                        { id: "schedule", label: "Schedule", icon: CalendarClock },
                        { id: "timeline", label: "Timeline", icon: Activity },
                        { id: "health", label: "Health", icon: HeartPulse },
                    ]}
                />
                <span className="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
                    read-only screen · oldest data {oldest ? timeAgo(new Date(oldest).toISOString(), now) : "—"}
                </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
                {view === "constellation" && <Constellation stamp={stampP3} onOpen={onOpen} />}
                {view === "matrix" && <Matrix stamp={stampCore} onOpen={onOpen} />}
                {view === "schedule" && <Schedule stamp={stampPulse} now={now} onOpen={onOpen} />}
                {view === "timeline" && <Timeline stampPulse={stampPulse} stampP3={stampP3} now={now} />}
                {view === "health" && <Health stampCore={stampCore} stampPulse={stampPulse} stampP3={stampP3} />}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Constellation: agents ↔ memory areas ↔ routines / workflows         */
/* ------------------------------------------------------------------ */

interface GNode {
    id: string;
    kind: "agent" | "area" | "routine" | "workflow";
    label: string;
    color: string;
    x: number;
    y: number;
    r: number;
    meta: string;
    open: [AppId, AppParams];
}

function Constellation({ stamp, onOpen }: { stamp: React.ReactNode; onOpen: (app: AppId, params?: AppParams) => void }) {
    const agents = useAosStore((s) => s.agents);
    const routines = usePulseStore((s) => s.routines);
    const { areas, items, workflows } = usePhase3Store(useShallow((s) => ({ areas: s.areas, items: s.items, workflows: s.workflows })));
    const [hover, setHover] = useState<string | null>(null);
    const [show, setShow] = useState({ memory: true, routines: true, workflows: true });

    const { nodes, links } = useMemo(() => {
        const W = 960, H = 640, cx0 = W / 2, cy0 = H / 2;
        const ring = <T,>(list: T[], r: number, offset = 0) => list.map((x, i) => ({ x, px: cx0 + r * Math.cos((i / Math.max(1, list.length)) * Math.PI * 2 + offset - Math.PI / 2), py: cy0 + r * Math.sin((i / Math.max(1, list.length)) * Math.PI * 2 + offset - Math.PI / 2) }));
        const ag = agents.filter((a) => !a.archivedAt);
        const ar = areas.filter((a) => !a.archivedAt);
        const rt = routines.filter((r) => !r.archivedAt);
        const wf = workflows.filter((w) => !w.archivedAt);
        const nodes: GNode[] = [
            ...ring(ag, 140).map(({ x, px, py }) => ({ id: `a:${x.id}`, kind: "agent" as const, label: x.name, color: x.color, x: px, y: py, r: 15, meta: `${x.role} · ${x.status}`, open: ["studio", { agentId: x.id }] as [AppId, AppParams] })),
            ...ring(ar, 245, 0.3).map(({ x, px, py }) => ({
                id: `m:${x.slug}`, kind: "area" as const, label: x.name, color: x.color, x: px, y: py, r: 11 + Math.min(10, items.filter((i) => i.areaId === x.id && !i.archivedAt).length),
                meta: `${items.filter((i) => i.areaId === x.id && !i.archivedAt).length} memory items`, open: ["memory", { areaId: x.id }] as [AppId, AppParams],
            })),
            ...ring([...rt.map((r) => ({ t: "r" as const, r })), ...wf.map((w) => ({ t: "w" as const, w }))], 300, 0.12).map(({ x, px, py }) =>
                x.t === "r"
                    ? { id: `r:${x.r.id}`, kind: "routine" as const, label: x.r.name, color: x.r.enabled ? "#fb923c" : "#64748b", x: px, y: py, r: 8, meta: `${x.r.kind} · ${x.r.enabled ? x.r.cron : "paused"}`, open: ["pulse", { routineId: x.r.id }] as [AppId, AppParams] }
                    : { id: `w:${x.w.id}`, kind: "workflow" as const, label: x.w.name, color: "#a855f7", x: px, y: py, r: 10, meta: `workflow · ${x.w.lastStatus ?? "never run"}`, open: ["workflows", { workflowId: x.w.id }] as [AppId, AppParams] },
            ),
        ];
        const links: { s: string; t: string; kind: "memory" | "routines" | "workflows" }[] = [];
        for (const a of ag) for (const slug of a.memoryScope) if (ar.some((x) => x.slug === slug)) links.push({ s: `a:${a.id}`, t: `m:${slug}`, kind: "memory" });
        for (const r of rt) {
            const a = ag.find((x) => x.id === r.agentId);
            if (a) links.push({ s: `r:${r.id}`, t: `a:${a.id}`, kind: "routines" });
            if (r.kind === "workflow" && r.workflowId) links.push({ s: `r:${r.id}`, t: `w:${r.workflowId}`, kind: "routines" });
        }
        for (const w of wf)
            for (const n of asGraph(w.graph).nodes)
                if (n.type === "agent") {
                    const a = ag.find((x) => x.id === (n.data as WfAgentData).agentId || x.slug === (n.data as WfAgentData).agentId);
                    if (a && !links.some((l) => l.s === `w:${w.id}` && l.t === `a:${a.id}`)) links.push({ s: `w:${w.id}`, t: `a:${a.id}`, kind: "workflows" });
                }
        return { nodes, links };
    }, [agents, areas, items, routines, workflows]);

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const visible = links.filter((l) => show[l.kind]);
    const near = hover ? new Set([hover, ...visible.filter((l) => l.s === hover || l.t === hover).flatMap((l) => [l.s, l.t])]) : null;
    const hovered = hover ? byId.get(hover) : undefined;
    const LINK_COLOR = { memory: "#e879f9", routines: "#fb923c", workflows: "#a855f7" };

    return (
        <Panel title="Constellation — who knows, runs and chains what" icon={Network} stamp={stamp} className="h-full min-h-[560px]">
            <div className="flex h-full min-h-0 gap-3">
                <div className="relative min-w-0 flex-1">
                    <svg viewBox="0 0 960 640" className="h-full w-full">
                        {[140, 245, 300].map((r) => (
                            <circle key={r} cx={480} cy={320} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 6" />
                        ))}
                        <circle cx={480} cy={320} r={34} fill="rgba(129,140,248,0.12)" stroke="#818cf8" strokeOpacity={0.5} />
                        <text x={480} y={316} textAnchor="middle" className="fill-indigo-200 text-[11px] font-bold">
                            Agentic
                        </text>
                        <text x={480} y={330} textAnchor="middle" className="fill-indigo-200 text-[11px] font-bold">
                            OS
                        </text>
                        {visible.map((l, i) => {
                            const a = byId.get(l.s);
                            const b = byId.get(l.t);
                            if (!a || !b) return null;
                            const on = !near || (near.has(l.s) && near.has(l.t) && (l.s === hover || l.t === hover));
                            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINK_COLOR[l.kind]} strokeOpacity={on ? (near ? 0.85 : 0.28) : 0.04} strokeWidth={on && near ? 1.8 : 1} />;
                        })}
                        {nodes.map((n) => {
                            const dim = near && !near.has(n.id);
                            return (
                                <g
                                    key={n.id}
                                    transform={`translate(${n.x},${n.y})`}
                                    opacity={dim ? 0.18 : 1}
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHover(n.id)}
                                    onMouseLeave={() => setHover(null)}
                                    onClick={() => onOpen(n.open[0], n.open[1])}
                                >
                                    {n.kind === "agent" ? (
                                        <circle r={n.r} fill={`${n.color}33`} stroke={n.color} strokeWidth={2} />
                                    ) : n.kind === "area" ? (
                                        <rect x={-n.r} y={-n.r} width={n.r * 2} height={n.r * 2} rx={4} fill={`${n.color}26`} stroke={n.color} strokeWidth={1.5} />
                                    ) : n.kind === "workflow" ? (
                                        <polygon points={`0,${-n.r} ${n.r},0 0,${n.r} ${-n.r},0`} fill={`${n.color}33`} stroke={n.color} strokeWidth={1.5} />
                                    ) : (
                                        <circle r={n.r} fill="none" stroke={n.color} strokeWidth={2} strokeDasharray="2 2" />
                                    )}
                                    <text y={n.r + 11} textAnchor="middle" className="pointer-events-none fill-slate-300 text-[9px]">
                                        {n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                    {hovered && (
                        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-[11px] shadow-xl">
                            <div className="font-semibold" style={{ color: hovered.color }}>
                                {hovered.label}
                            </div>
                            <div className="text-slate-400">{hovered.meta}</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">{visible.filter((l) => l.s === hovered.id || l.t === hovered.id).length} links · click to open</div>
                        </div>
                    )}
                </div>
                <div className="w-[170px] shrink-0 space-y-3 text-[11px]">
                    <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Legend</div>
                        <div className="space-y-1 text-slate-400">
                            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-sky-400" /> Agent (inner ring)</div>
                            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-fuchsia-400" /> Memory area (size = items)</div>
                            <div className="flex items-center gap-2"><span className="h-3 w-3 rotate-45 border border-purple-400" /> Workflow</div>
                            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-dashed border-orange-400" /> Routine</div>
                        </div>
                    </div>
                    <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Links</div>
                        {(Object.keys(LINK_COLOR) as (keyof typeof LINK_COLOR)[]).map((k) => (
                            <label key={k} className="flex cursor-pointer items-center gap-2 py-0.5 text-slate-300">
                                <input type="checkbox" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} />
                                <span className="h-0.5 w-4" style={{ background: LINK_COLOR[k] }} />
                                {k === "memory" ? "memory scope" : k === "routines" ? "routine → agent" : "workflow → agent"} ({links.filter((l) => l.kind === k).length})
                            </label>
                        ))}
                    </div>
                    <div className="rounded-lg border border-white/10 p-2 text-[10px] text-slate-500">
                        Agents with no memory link get no memory context in prompt routines. Fix it in Memory Map → Agent access.
                    </div>
                </div>
            </div>
        </Panel>
    );
}

/* ------------------------------------------------------------------ */
/* Agents × Modules                                                    */
/* ------------------------------------------------------------------ */

function Matrix({ stamp, onOpen }: { stamp: React.ReactNode; onOpen: (app: AppId, params?: AppParams) => void }) {
    const { agents, tasks } = useAosStore(useShallow((s) => ({ agents: s.agents, tasks: s.tasks })));
    const live = agents.filter((a) => !a.archivedAt);
    const mods = Object.values(MODULES).filter((m) => live.some((a) => a.modules.includes(m.id)) || tasks.some((t) => t.moduleId === m.id));
    const count = (agentId: string, mod: string) => tasks.filter((t) => t.agentId === agentId && t.moduleId === mod && !t.archivedAt).length;
    const max = Math.max(1, ...live.flatMap((a) => mods.map((m) => count(a.id, m.id))));

    return (
        <Panel title="Agents × Modules — access and workload" icon={Grid3x3} stamp={stamp}>
            <div className="overflow-auto">
                <table className="border-separate border-spacing-1 text-[10px]">
                    <thead>
                        <tr>
                            <th />
                            {mods.map((m) => (
                                <th key={m.id} className="h-20 align-bottom">
                                    <div className="w-6 origin-bottom-left translate-x-3 -rotate-45 whitespace-nowrap text-left font-semibold" style={{ color: m.color }}>
                                        {m.name}
                                    </div>
                                </th>
                            ))}
                            <th className="pl-2 text-left text-slate-500">tasks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {live.map((a) => (
                            <tr key={a.id}>
                                <td className="pr-2">
                                    <button type="button" onClick={() => onOpen("tasks", { agentId: a.id })} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-200 hover:text-white">
                                        <AgentDot color={a.color} name={a.name} size={18} /> {a.name}
                                    </button>
                                </td>
                                {mods.map((m) => {
                                    const n = count(a.id, m.id);
                                    const has = a.modules.includes(m.id);
                                    return (
                                        <td key={m.id}>
                                            <div
                                                title={`${a.name} · ${m.name}: ${has ? "has access" : "no access"} · ${n} task(s)`}
                                                className={cx("flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold", !has && n > 0 && "ring-1 ring-red-400")}
                                                style={{
                                                    background: n ? `${m.color}${Math.round(25 + (n / max) * 200).toString(16).padStart(2, "0")}` : has ? "rgba(255,255,255,0.06)" : "transparent",
                                                    border: has ? `1px solid ${m.color}55` : "1px dashed rgba(255,255,255,0.06)",
                                                    color: n / max > 0.5 ? "#0f172a" : "#e2e8f0",
                                                }}
                                            >
                                                {n || ""}
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="pl-2 text-slate-400">{tasks.filter((t) => t.agentId === a.id && !t.archivedAt).length}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">Bordered cell = the agent has the module. Number/colour = tasks there. Red ring = tasks in a module the agent has no access to.</div>
        </Panel>
    );
}

/* ------------------------------------------------------------------ */
/* Schedule: next 24h                                                  */
/* ------------------------------------------------------------------ */

function Schedule({ stamp, now, onOpen }: { stamp: React.ReactNode; now: number; onOpen: (app: AppId, params?: AppParams) => void }) {
    const { routines, status } = usePulseStore(useShallow((s) => ({ routines: s.routines, status: s.status })));
    const agents = useAosStore((s) => s.agents);
    const live = routines.filter((r) => !r.archivedAt).sort((a, b) => (a.nextRunAt ?? "~").localeCompare(b.nextRunAt ?? "~"));
    const span = 24 * 3600_000;
    const pos = (iso: string | null) => (iso ? Math.max(0, Math.min(1, (new Date(iso).getTime() - now) / span)) : null);

    return (
        <Panel title="Routine schedule — next 24 hours" icon={CalendarClock} stamp={stamp}>
            {status && (
                <div className="mb-3 flex flex-wrap gap-2 text-[10px]">
                    <Chip color={status.pulseEnabled && !status.killSwitch ? "#22c55e" : "#ef4444"}>{status.killSwitch ? "kill switch ON" : status.pulseEnabled ? "pulse on" : "pulse paused"}</Chip>
                    <Chip color="#38bdf8">{status.llmMode === "dry_run" ? "dry run" : "live LLM"}</Chip>
                    <Chip color="#94a3b8">queue {status.queueDepth}</Chip>
                    <Chip color="#94a3b8">last tick {timeAgo(status.lastTickAt, now)}</Chip>
                </div>
            )}
            <div className="relative ml-[180px] mb-1 h-4 text-[9px] text-slate-500">
                {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                    <span key={h} className="absolute -translate-x-1/2" style={{ left: `${(h / 24) * 100}%` }}>
                        {new Date(now + h * 3600_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                ))}
            </div>
            <div className="space-y-1">
                {live.map((r) => {
                    const p = pos(r.enabled ? r.nextRunAt : null);
                    const a = agents.find((x) => x.id === r.agentId);
                    return (
                        <div key={r.id} className="flex items-center gap-2">
                            <button type="button" onClick={() => onOpen("pulse", { routineId: r.id })} className="flex w-[172px] shrink-0 items-center gap-1.5 truncate text-left text-[11px] text-slate-200 hover:text-white">
                                {a ? <AgentDot color={a.color} name={a.name} size={16} /> : <span className="h-4 w-4" />}
                                <span className="truncate">{r.name}</span>
                            </button>
                            <div className="relative h-5 flex-1 rounded bg-white/[0.03]">
                                {[0.25, 0.5, 0.75].map((x) => (
                                    <span key={x} className="absolute top-0 h-full w-px bg-white/5" style={{ left: `${x * 100}%` }} />
                                ))}
                                {p !== null ? (
                                    <span
                                        title={`${r.name} · next ${new Date(r.nextRunAt!).toLocaleString()}`}
                                        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                        style={{ left: `${p * 100}%`, background: r.kind === "workflow" ? "#a855f7" : "#fb923c", boxShadow: "0 0 8px #fb923c88" }}
                                    />
                                ) : (
                                    <span className="absolute inset-0 flex items-center pl-2 text-[9px] text-slate-600">{r.enabled ? "not in the next 24h" : "paused"}</span>
                                )}
                            </div>
                            <span className="w-16 shrink-0 text-right">
                                <Chip color={r.lastStatus === "success" ? "#22c55e" : r.lastStatus ? "#ef4444" : "#64748b"}>{r.lastStatus ?? "never"}</Chip>
                            </span>
                        </div>
                    );
                })}
                {!live.length && <div className="text-[11px] text-slate-500">No routines.</div>}
            </div>
        </Panel>
    );
}

/* ------------------------------------------------------------------ */
/* Timeline: last 24h of runs and workflow runs                        */
/* ------------------------------------------------------------------ */

function Timeline({ stampPulse, stampP3, now }: { stampPulse: React.ReactNode; stampP3: React.ReactNode; now: number }) {
    const runs = usePulseStore((s) => s.runs);
    const workflowRuns = usePhase3Store((s) => s.workflowRuns);
    const agents = useAosStore((s) => s.agents);
    const span = 24 * 3600_000;
    const x = (iso: string) => Math.max(0, Math.min(1, 1 - (now - new Date(iso).getTime()) / span));
    const recent = runs.filter((r) => now - new Date(r.startedAt).getTime() < span);
    const lanes = [...new Set(recent.map((r) => r.agentId ?? "system"))];
    const color = (s: string) => (s === "success" ? "#22c55e" : s === "blocked" ? "#f59e0b" : s === "running" ? "#38bdf8" : "#ef4444");

    const axis = (
        <div className="relative ml-[140px] mb-1 h-4 text-[9px] text-slate-500">
            {[24, 18, 12, 6, 0].map((h) => (
                <span key={h} className="absolute -translate-x-1/2" style={{ left: `${(1 - h / 24) * 100}%` }}>
                    {h ? `-${h}h` : "now"}
                </span>
            ))}
        </div>
    );

    return (
        <div className="grid gap-3">
            <Panel title={`Pulse runs — last 24h (${recent.length})`} icon={Activity} stamp={stampPulse}>
                {axis}
                <div className="space-y-1">
                    {lanes.map((lane) => {
                        const a = agents.find((g) => g.id === lane);
                        return (
                            <div key={lane} className="flex items-center gap-2">
                                <span className="flex w-[132px] shrink-0 items-center gap-1.5 truncate text-[11px] text-slate-300">
                                    {a ? <AgentDot color={a.color} name={a.name} size={16} /> : <span className="h-4 w-4 rounded bg-white/10" />}
                                    {a?.name ?? "System"}
                                </span>
                                <div className="relative h-5 flex-1 rounded bg-white/[0.03]">
                                    {recent
                                        .filter((r) => (r.agentId ?? "system") === lane)
                                        .map((r) => (
                                            <span
                                                key={r.id}
                                                title={`${r.routineName ?? r.kind ?? "run"} · ${r.status} · ${new Date(r.startedAt).toLocaleTimeString()}`}
                                                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                                style={{ left: `${x(r.startedAt) * 100}%`, background: color(r.status) }}
                                            />
                                        ))}
                                </div>
                            </div>
                        );
                    })}
                    {!lanes.length && <div className="text-[11px] text-slate-500">No Pulse runs in the last 24 hours.</div>}
                </div>
            </Panel>
            <Panel title="Workflow runs — last 24h" icon={Network} stamp={stampP3}>
                {axis}
                <div className="space-y-1">
                    {workflowRuns
                        .filter((r) => now - new Date(r.startedAt).getTime() < span)
                        .map((r) => {
                            const a = x(r.startedAt);
                            const b = r.finishedAt ? x(r.finishedAt) : 1;
                            const c = r.status === "success" ? "#22c55e" : r.status === "failed" ? "#ef4444" : r.status === "cancelled" ? "#94a3b8" : r.status === "waiting_approval" ? "#f59e0b" : "#38bdf8";
                            return (
                                <div key={r.id} className="flex items-center gap-2">
                                    <span className="w-[132px] shrink-0 truncate text-[11px] text-slate-300">{r.workflowName}</span>
                                    <div className="relative h-5 flex-1 rounded bg-white/[0.03]">
                                        <span title={`${r.status} · ${new Date(r.startedAt).toLocaleTimeString()}`} className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ left: `${a * 100}%`, width: `max(6px, ${(b - a) * 100}%)`, background: c }} />
                                    </div>
                                </div>
                            );
                        })}
                    {!workflowRuns.some((r) => now - new Date(r.startedAt).getTime() < span) && <div className="text-[11px] text-slate-500">No workflow runs in the last 24 hours.</div>}
                </div>
            </Panel>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

function Health({ stampCore, stampPulse, stampP3 }: { stampCore: React.ReactNode; stampPulse: React.ReactNode; stampP3: React.ReactNode }) {
    const { areas, items } = usePhase3Store(useShallow((s) => ({ areas: s.areas, items: s.items })));
    const { status, runs } = usePulseStore(useShallow((s) => ({ status: s.status, runs: s.runs })));
    const { stats, tasks } = useAosStore(useShallow((s) => ({ stats: s.stats, tasks: s.tasks })));
    const H: MemoryHealth[] = ["ok", "stale", "broken", "unknown"];
    const last50 = runs.slice(0, 50);
    const okRate = last50.length ? Math.round((last50.filter((r) => r.status === "success").length / last50.length) * 100) : null;
    const failedTasks = tasks.filter((t) => t.status === "failed" && !t.archivedAt).length;

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Memory health by area" icon={HeartPulse} stamp={stampP3}>
                <div className="space-y-2">
                    {areas
                        .filter((a) => !a.archivedAt)
                        .map((a) => {
                            const its = items.filter((i) => i.areaId === a.id && !i.archivedAt);
                            return (
                                <div key={a.id}>
                                    <div className="mb-0.5 flex items-center justify-between text-[11px]">
                                        <span style={{ color: a.color }}>{a.name}</span>
                                        <span className="text-slate-500">{its.length}</span>
                                    </div>
                                    <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
                                        {H.map((h) => {
                                            const n = its.filter((i) => i.health === h).length;
                                            return n ? <span key={h} title={`${HEALTH_META[h].label}: ${n}`} style={{ width: `${(n / its.length) * 100}%`, background: HEALTH_META[h].color }} /> : null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </Panel>
            <Panel title="Pulse caps" icon={TriangleAlert} stamp={stampPulse}>
                {status ? (
                    <div className="space-y-2.5">
                        {([
                            ["Daily runs", status.dailyRuns],
                            ["Rolling window", status.rollingRuns],
                            ["Monthly tokens", status.monthlyTokens],
                            ["Daily cost", status.dailyCost],
                        ] as const).map(([label, c]) => (
                            <div key={label}>
                                <div className="mb-0.5 flex justify-between text-[11px] text-slate-400">
                                    <span>{label}</span>
                                    <span>{Math.round(c.pct)}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, c.pct)}%`, background: c.pct > 90 ? "#ef4444" : c.pct > 70 ? "#f59e0b" : "#22c55e" }} />
                                </div>
                            </div>
                        ))}
                        <div className="text-[10px] text-slate-500">
                            Provider {status.providerReady ? `${status.provider ?? "?"} · ${status.model ?? "default"}` : "not configured in AI Studio"} · success rate (last 50 runs) {okRate ?? "—"}%
                        </div>
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-500">Pulse status unavailable.</div>
                )}
            </Panel>
            <Panel title="Work" icon={Activity} stamp={stampCore} className="lg:col-span-2">
                {stats ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {([
                            ["Active agents", `${stats.activeAgents}/${stats.totalAgents}`, "#38bdf8"],
                            ["Running", stats.runningTasks, "#22d3ee"],
                            ["Review", stats.reviewTasks, "#a855f7"],
                            ["Approvals", stats.pendingApprovals, "#f59e0b"],
                            ["Done today", stats.doneToday, "#22c55e"],
                            ["Failed", failedTasks, "#ef4444"],
                        ] as const).map(([l, v, c]) => (
                            <div key={l} className="rounded-lg border border-white/10 px-2.5 py-2">
                                <div className="text-[10px] text-slate-500">{l}</div>
                                <div className="text-[18px] font-bold" style={{ color: c }}>
                                    {v}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-500">No stats.</div>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                    {Object.values(MODULES)
                        .filter((m) => tasks.some((t) => t.moduleId === m.id && (t.status === "running" || t.status === "queued")))
                        .map((m) => (
                            <Chip key={m.id} color={m.color}>
                                {m.name} · {tasks.filter((t) => t.moduleId === (m.id as ModuleId) && (t.status === "running" || t.status === "queued")).length} active
                            </Chip>
                        ))}
                </div>
            </Panel>
        </div>
    );
}
