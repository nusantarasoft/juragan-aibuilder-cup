"use client";

/**
 * Command Deck — TIMELINE view. Swim-lanes per agent over the last 24 h / 7 d:
 * task bars, Pulse run ticks and workflow runs, with a live "now" line.
 * Read-only; clicking opens the owning app.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { AppId, AppParams } from "../../lib/osUi";
import { usePhase3Store } from "../../lib/phase3Store";
import { usePulseStore } from "../../lib/pulseStore";
import { useAosStore } from "../../lib/store";
import { RUN_COLOR } from "../../lib/deckGraph";
import { cx } from "../../ui/kit";

const TASK_COLOR: Record<string, string> = { queued: "#64748b", running: "#38bdf8", awaiting_approval: "#f59e0b", review: "#a855f7", done: "#22c55e", failed: "#ef4444", cancelled: "#475569" };
const WF_COLOR: Record<string, string> = { running: "#38bdf8", waiting_approval: "#f59e0b", success: "#22c55e", failed: "#ef4444", cancelled: "#475569" };

function useWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [w, setW] = useState(800);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.floor(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, w] as const;
}

export function DeckTimeline({ onOpen, motion }: { onOpen: (app: AppId, params?: AppParams) => void; motion: boolean }) {
    const [span, setSpan] = useState<"24h" | "7d">("24h");
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), motion ? 5_000 : 30_000);
        return () => clearInterval(t);
    }, [motion]);
    const { agents, tasks } = useAosStore(useShallow((s) => ({ agents: s.agents, tasks: s.tasks })));
    const runs = usePulseStore((s) => s.runs);
    const wfRuns = usePhase3Store((s) => s.workflowRuns);
    const [ref, width] = useWidth<HTMLDivElement>();

    const windowMs = span === "24h" ? 24 * 3600_000 : 7 * 24 * 3600_000;
    const t0 = now - windowMs;
    const LEFT = 120;
    const ROW = 26;
    const plotW = width - LEFT - 12;
    const x = (t: number) => LEFT + ((Math.max(t0, Math.min(now, t)) - t0) / windowMs) * plotW;

    const rows = useMemo(() => {
        const inWin = (s: string | null, e: string | null) => !!s && new Date(e ?? new Date(now).toISOString()).getTime() >= t0;
        const list = agents
            .filter((a) => !a.archivedAt)
            .map((a) => ({
                id: a.id,
                name: a.name,
                color: a.color,
                tasks: tasks.filter((t) => t.agentId === a.id && inWin(t.startedAt, t.finishedAt)),
                runs: runs.filter((r) => r.agentId === a.id && new Date(r.startedAt).getTime() >= t0),
            }));
        list.sort((a, b) => b.tasks.length + b.runs.length - (a.tasks.length + a.runs.length) || a.name.localeCompare(b.name));
        const system = runs.filter((r) => !r.agentId && new Date(r.startedAt).getTime() >= t0);
        return { agents: list, system };
    }, [agents, tasks, runs, t0, now]);

    const wf = wfRuns.filter((r) => new Date(r.finishedAt ?? new Date(now).toISOString()).getTime() >= t0);
    const lanes = 1 + rows.agents.length + (rows.system.length ? 1 : 0);
    const H = 28 + lanes * ROW + 8;

    const ticks = useMemo(() => {
        const out: { t: number; label: string }[] = [];
        if (span === "24h") {
            const d = new Date(t0);
            d.setMinutes(0, 0, 0);
            for (let t = d.getTime() + 3600_000; t <= now; t += 3600_000) {
                const h = new Date(t).getHours();
                if (h % 3 === 0) out.push({ t, label: `${String(h).padStart(2, "0")}:00` });
            }
        } else {
            const d = new Date(t0);
            d.setHours(0, 0, 0, 0);
            for (let t = d.getTime() + 86_400_000; t <= now; t += 86_400_000) out.push({ t, label: new Date(t).toLocaleDateString([], { weekday: "short", day: "2-digit" }) });
        }
        return out;
    }, [span, t0, now]);

    let lane = 0;
    const laneY = () => 28 + lane++ * ROW;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 px-3 pt-2 text-[10px] text-slate-400">
                {(["24h", "7d"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setSpan(s)} className={cx("rounded-md px-2 py-0.5 font-semibold", span === s ? "bg-white/10 text-white" : "hover:bg-white/5")}>
                        last {s}
                    </button>
                ))}
                <span className="ml-auto flex items-center gap-2">
                    <Legend color="#38bdf8" label="running" />
                    <Legend color="#a855f7" label="review" />
                    <Legend color="#22c55e" label="done / ok" />
                    <Legend color="#ef4444" label="failed" />
                    <Legend color="#f59e0b" label="blocked / gate" />
                </span>
            </div>
            <div ref={ref} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1">
                <svg width={width} height={H} className="block">
                    {ticks.map((tk) => (
                        <g key={tk.t}>
                            <line x1={x(tk.t)} x2={x(tk.t)} y1={22} y2={H} stroke="rgba(148,163,184,0.1)" />
                            <text x={x(tk.t)} y={14} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="ui-monospace, monospace">
                                {tk.label}
                            </text>
                        </g>
                    ))}

                    {/* Workflows lane */}
                    {(() => {
                        const y = laneY();
                        return (
                            <g>
                                <text x={8} y={y + 16} fontSize={10} fontWeight={700} fill="#c084fc">
                                    Workflows
                                </text>
                                <line x1={LEFT} x2={width - 12} y1={y + ROW - 1} y2={y + ROW - 1} stroke="rgba(255,255,255,0.04)" />
                                {wf.map((r) => {
                                    const s = new Date(r.startedAt).getTime();
                                    const e = r.finishedAt ? new Date(r.finishedAt).getTime() : now;
                                    return (
                                        <rect key={r.id} x={x(s)} y={y + 7} width={Math.max(4, x(e) - x(s))} height={11} rx={3} fill={WF_COLOR[r.status] ?? "#a855f7"} fillOpacity={0.75} className="cursor-pointer" onClick={() => onOpen("workflows", { workflowId: r.workflowId, runId: r.id, tab: "runs" })}>
                                            <title>{`${r.workflowName} · ${r.status}`}</title>
                                        </rect>
                                    );
                                })}
                            </g>
                        );
                    })()}

                    {rows.agents.map((a) => {
                        const y = laneY();
                        return (
                            <g key={a.id}>
                                <circle cx={12} cy={y + 12} r={4} fill={a.color} />
                                <text x={22} y={y + 16} fontSize={10} fontWeight={600} fill="#e2e8f0" className="cursor-pointer" onClick={() => onOpen("tasks", { agentId: a.id })}>
                                    {a.name.length > 14 ? `${a.name.slice(0, 13)}…` : a.name}
                                </text>
                                <line x1={LEFT} x2={width - 12} y1={y + ROW - 1} y2={y + ROW - 1} stroke="rgba(255,255,255,0.04)" />
                                {a.tasks.map((t) => {
                                    const s = new Date(t.startedAt!).getTime();
                                    const e = t.finishedAt ? new Date(t.finishedAt).getTime() : now;
                                    return (
                                        <rect key={t.id} x={x(s)} y={y + 5} width={Math.max(3, x(e) - x(s))} height={8} rx={2} fill={TASK_COLOR[t.status] ?? "#64748b"} fillOpacity={0.8} className="cursor-pointer" onClick={() => onOpen("tasks", { agentId: a.id })}>
                                            <title>{`${t.title} · ${t.status} · ${Math.round(t.progress * 100)}%`}</title>
                                        </rect>
                                    );
                                })}
                                {a.runs.map((r) => (
                                    <RunTick key={r.id} r={r} x={x} y={y + 16} now={now} onClick={() => onOpen("pulse", { tab: "runs" })} />
                                ))}
                            </g>
                        );
                    })}

                    {rows.system.length > 0 &&
                        (() => {
                            const y = laneY();
                            return (
                                <g>
                                    <text x={8} y={y + 16} fontSize={10} fontWeight={700} fill="#fb923c">
                                        Pulse (system)
                                    </text>
                                    {rows.system.map((r) => (
                                        <RunTick key={r.id} r={r} x={x} y={y + 10} now={now} onClick={() => onOpen("pulse", { tab: "runs" })} />
                                    ))}
                                </g>
                            );
                        })()}

                    {/* Now line */}
                    <line x1={x(now)} x2={x(now)} y1={20} y2={H} stroke="#f97316" strokeWidth={1.2} strokeDasharray="3 3" />
                    <text x={x(now) - 3} y={14} textAnchor="end" fontSize={9} fontWeight={700} fill="#f97316">
                        now
                    </text>
                </svg>
                {!rows.agents.length && <div className="py-10 text-center text-[12px] text-slate-500">No agents yet.</div>}
            </div>
        </div>
    );
}

function RunTick({ r, x, y, now, onClick }: { r: { id: string; startedAt: string; finishedAt: string | null; status: string; routineName: string | null; durationMs: number | null }; x: (t: number) => number; y: number; now: number; onClick: () => void }) {
    const s = new Date(r.startedAt).getTime();
    const e = r.finishedAt ? new Date(r.finishedAt).getTime() : r.status === "running" ? now : s + (r.durationMs ?? 0);
    return (
        <rect x={x(s) - 1} y={y} width={Math.max(3, x(e) - x(s))} height={6} rx={1.5} fill={RUN_COLOR[r.status] ?? "#94a3b8"} className="cursor-pointer" onClick={onClick}>
            <title>{`${r.routineName ?? "run"} · ${r.status}`}</title>
        </rect>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            {label}
        </span>
    );
}
