"use client";

/**
 * Agentic OS — Command Deck ("AI OS"). A dark, monospace mission-control
 * screen: status bar on top; Today / gate review / agenda / activity /
 * backlog on the left; the live graph (rings · circle · areas · links ·
 * timeline · 3D orbit) in the centre; next session / waiting / skills deck /
 * routines on the right. Everything is live data from the OS stores.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Bot, Box, Circle, CircleDot, Crosshair, Diamond, Hexagon, Maximize, Play, Search, Target, X, Zap, type LucideIcon } from "lucide-react";
import { useAosStore, startAosPolling, agentById } from "../../lib/store";
import { usePhase3Store, startPhase3Polling } from "../../lib/phase3Store";
import { usePulseStore, startPulsePolling } from "../../lib/pulseStore";
import { useDeckStore, useDeckUi, startDeckPolling, type DeckView } from "../../lib/deckStore";
import { pulseApi } from "../../lib/api";
import { buildModel, layoutFor, visibleIds, RINGS, TYPE_KEYS, TYPE_META, type DeckNode, type TypeKey } from "../../lib/deckGraph";
import { addDays, ageLabel, cronOccurrences, daysBetween, ddmm, dowDdmm, DOW_SHORT, durationLabel, isoWeek, longDate, offsetLabel, relDays, tzOffsetMinutes, wallParts, ymd } from "../../lib/deckTime";
import type { AppId, AppParams } from "../../lib/osUi";
import type { OsGoal, OsRoutine } from "../../lib/types";
import { DeckGraphSvg } from "./DeckGraph";
import { GoalEditor, GoalReviewDialog } from "./DeckGoals";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pad = (n: number) => String(n).padStart(2, "0");
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const agentParams = (id: string | null | undefined): AppParams => (id ? { agentId: id } : {});
const ORANGE = "#fb923c";

const VIEWS: { id: DeckView; label: string }[] = [
    { id: "rings", label: "RINGS" },
    { id: "circle", label: "CIRCLE" },
    { id: "areas", label: "AREAS" },
    { id: "links", label: "LINKS" },
    { id: "timeline", label: "TIMELINE" },
    { id: "orbit", label: "3D ORBIT" },
];

const SECOND_TZS = ["Europe/London", "America/New_York", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC"];

const TYPE_ICON: Record<TypeKey, LucideIcon> = {
    skill: Diamond,
    file: Circle,
    goal: Target,
    agent: Bot,
    routine: CircleDot,
    workflow: Hexagon,
    app: Box,
    run: Zap,
};

const localTz = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
    } catch {
        return "Asia/Jakarta";
    }
};

function Section({ title, right, children, className }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("border-b border-white/[0.07] px-4 pb-3.5 pt-2", className)}>
            {/* Header sticks to the top of the scrolling column while its section is in view. */}
            <div className="sticky top-[var(--deck-sticky,0px)] z-[1] -mx-4 mb-1.5 flex items-center justify-between gap-2 bg-[#0b0e13]/95 px-4 py-1.5 backdrop-blur-sm">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h3>
                {right}
            </div>
            {children}
        </section>
    );
}

/** Thin, unobtrusive scrollbars for the deck's scrolling columns. */
const SCROLL_Y = "overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb:hover]:bg-white/25";

/** Width of an element, kept up to date with a ResizeObserver. */
function useWidth(ref: React.RefObject<HTMLElement | null>, initial = 1600) {
    const [w, setW] = useState(initial);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        setW(el.clientWidth);
        const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return w;
}

/**
 * A single-line row that scrolls sideways instead of wrapping. The mouse wheel
 * scrolls it horizontally and the edges fade out when there is more to see.
 */
function HScroll({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [edge, setEdge] = useState<{ l: boolean; r: boolean }>({ l: false, r: false });
    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const l = el.scrollLeft > 2;
        const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        setEdge((p) => (p.l === l && p.r === r ? p : { l, r }));
    }, []);
    useEffect(update);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(update);
        ro.observe(el);
        const onWheel = (e: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            ro.disconnect();
            el.removeEventListener("wheel", onWheel);
        };
    }, [update]);
    const fade = 28;
    const mask = edge.l || edge.r ? `linear-gradient(90deg, ${edge.l ? "transparent" : "#000"}, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edge.r ? "transparent" : "#000"})` : undefined;
    return (
        <div
            ref={ref}
            onScroll={update}
            className={cn("flex min-w-0 items-center overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0", className)}
            style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        >
            {children}
        </div>
    );
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
    return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", pulse && "animate-pulse")} style={{ background: color }} />;
}

function AnalogClock({ h, m, s, size = 36 }: { h: number; m: number; s: number; size?: number }) {
    const r = size / 2;
    const hand = (deg: number, len: number, w: number, color: string) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return <line x1={r} y1={r} x2={r + Math.cos(a) * len} y2={r + Math.sin(a) * len} stroke={color} strokeWidth={w} strokeLinecap="round" />;
    };
    return (
        <svg width={size} height={size} className="shrink-0">
            <circle cx={r} cy={r} r={r - 1} fill="none" stroke="#cbd5e1" strokeWidth={1.4} />
            {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return <line key={i} x1={r + Math.cos(a) * (r - 3.5)} y1={r + Math.sin(a) * (r - 3.5)} x2={r + Math.cos(a) * (r - 2)} y2={r + Math.sin(a) * (r - 2)} stroke="#64748b" strokeWidth={1} />;
            })}
            {hand((h % 12) * 30 + m * 0.5, r * 0.5, 1.8, "#f8fafc")}
            {hand(m * 6, r * 0.75, 1.3, "#f8fafc")}
            {hand(s * 6, r * 0.8, 0.8, ORANGE)}
            <circle cx={r} cy={r} r={1.4} fill="#f8fafc" />
        </svg>
    );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
    const pct = total > 0 ? Math.min(1, value / total) : 0;
    return (
        <div className="flex items-center gap-3 text-[12px]">
            <span className="w-16 text-slate-200">{label}</span>
            <div className="h-1 flex-1 bg-white/10">
                <div className="h-full bg-slate-300" style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="w-12 text-right tabular-nums text-slate-200">
                {value} / {total}
            </span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Command Deck                                                        */
/* ------------------------------------------------------------------ */

export interface DeckShellProps {
    onOpen: (app: AppId, params?: AppParams) => void;
    /** Right-most status-bar action (e.g. "Back to office"). Defaults to a link into the Virtual Office. */
    exit?: { label: string; onClick: () => void };
    /** Extra status-bar controls supplied by the OS shell (search, approvals, alerts). */
    toolbar?: React.ReactNode;
    /** Space kept free at the bottom for the shell's dock. */
    bottomInset?: number;
}

export function CommandDeck({ onOpen, exit, toolbar, bottomInset = 0 }: DeckShellProps) {
    const core = useAosStore(useShallow((s) => ({ agents: s.agents, playbooks: s.playbooks, tasks: s.tasks, approvals: s.approvals, settings: s.settings, stats: s.stats, lastSync: s.lastSync })));
    const p3 = usePhase3Store(useShallow((s) => ({ areas: s.areas, items: s.items, workflows: s.workflows, workflowRuns: s.workflowRuns })));
    const pulse = usePulseStore(useShallow((s) => ({ routines: s.routines, runs: s.runs, status: s.status, settings: s.settings, state: s.state })));
    const deck = useDeckStore(useShallow((s) => ({ goals: s.goals, deckStats: s.stats })));
    const ui = useDeckUi();

    useEffect(() => {
        ui.hydrate();
        const stops = [startAosPolling(5000), startPhase3Polling(15000), startPulsePolling(10000), startDeckPolling(30000)];
        return () => stops.forEach((s) => s());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clock
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const tz = useMemo(localTz, []);
    const now = new Date(nowMs);
    const today = ymd(now, tz);

    // Graph state
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [fitNonce, setFitNonce] = useState(0);
    const [types, setTypes] = useState<Set<TypeKey>>(() => new Set(TYPE_KEYS));
    const [areaSel, setAreaSel] = useState<Set<string>>(() => new Set());
    const [editingGoal, setEditingGoal] = useState<string | null>(null);
    const [reviewingGoal, setReviewingGoal] = useState<string | null>(null);
    const graphRef = useRef<HTMLDivElement>(null);

    const model = useMemo(
        () =>
            buildModel({
                agents: core.agents,
                playbooks: core.playbooks,
                tasks: core.tasks,
                areas: p3.areas,
                items: p3.items,
                routines: pulse.routines,
                workflows: p3.workflows,
                workflowRuns: p3.workflowRuns,
                runs: pulse.runs,
                goals: deck.goals,
                now: Date.now(),
            }),
        [core.agents, core.playbooks, core.tasks, p3.areas, p3.items, pulse.routines, p3.workflows, p3.workflowRuns, pulse.runs, deck.goals],
    );
    // Layouts only recompute when the graph's structure changes (not on every poll);
    // the timeline also once a minute so its time axis keeps up.
    const minute = ui.view === "timeline" ? Math.floor(nowMs / 60_000) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const layout = useMemo(() => layoutFor(ui.view, model), [ui.view, model.key, minute]);
    const visible = useMemo(() => visibleIds(model, types, areaSel.size ? areaSel : null), [model, types, areaSel]);
    const selected: DeckNode | undefined = selectedId ? model.byId.get(selectedId) : undefined;

    const toggleArea = useCallback((id: string) => {
        setAreaSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    const onIsolate = useCallback(
        (kind: "ring" | "group" | "area", ref: string) => {
            if (kind === "area") return toggleArea(ref);
            if (kind === "ring") {
                const ring = RINGS.find((r) => r.id === ref);
                if (!ring) return;
                setTypes((prev) => (prev.size === ring.types.length && ring.types.every((t) => prev.has(t)) ? new Set(TYPE_KEYS) : new Set(ring.types)));
                return;
            }
            if ((TYPE_KEYS as string[]).includes(ref)) setTypes(new Set([ref as TypeKey]));
            else toggleArea(ref);
        },
        [toggleArea],
    );

    /* ---------------- derived data ---------------- */

    const st = pulse.status;
    const killSwitch = !!(st?.killSwitch ?? core.settings?.killSwitch);
    const runningRuns = pulse.runs.filter((r) => r.status === "running").length;
    const coreState = killSwitch ? { t: "FROZEN", c: "#ef4444" } : runningRuns ? { t: "RUNNING", c: "#38bdf8" } : st && !st.pulseEnabled ? { t: "PAUSED", c: "#f59e0b" } : { t: "IDLE", c: "#22c55e" };
    const syncAge = core.lastSync ? Math.floor((nowMs - core.lastSync) / 1000) : null;

    const activeGoals = useMemo(
        () => deck.goals.filter((g) => !g.archivedAt && (g.status === "active" || g.status === "at_risk")).sort((a, b) => a.gateOn.localeCompare(b.gateOn)),
        [deck.goals],
    );
    const goal: OsGoal | undefined = deck.goals.find((g) => g.id === ui.goalId) ?? activeGoals[0] ?? deck.goals[0];

    const openTasks = core.tasks.filter((t) => !t.archivedAt && !["done", "cancelled", "failed"].includes(t.status));
    const overdue = openTasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < nowMs).sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
    const pendingApprovals = core.approvals.filter((a) => a.status === "pending");
    const reviewTasks = openTasks.filter((t) => t.status === "review" || t.status === "awaiting_approval");
    const gatedRuns = p3.workflowRuns.filter((r) => r.status === "waiting_approval");

    const routines = pulse.routines.filter((r) => !r.archivedAt);
    const firedToday = routines.filter((r) => r.lastRunAt && ymd(new Date(r.lastRunAt), tz) === today).length;
    const nextRun = st?.nextRuns?.[0];
    const lastRun = pulse.runs[0];

    const agenda = useMemo(() => {
        const from = new Date(nowMs);
        const to = new Date(nowMs + 14 * 86_400_000);
        const end = addDays(today, 14);
        const out: { day: string; time?: string; text: string; tag?: string; tagColor?: string; open: [AppId, AppParams] }[] = [];
        for (const t of core.tasks) {
            if (!t.dueAt || t.archivedAt || ["done", "cancelled", "failed"].includes(t.status)) continue;
            const d = ymd(new Date(t.dueAt), tz);
            if (d < today || d >= end) continue;
            const w = wallParts(new Date(t.dueAt), tz);
            out.push({ day: d, time: `${pad(w.h)}:${pad(w.mi)}`, text: t.title, tag: t.moduleId, open: ["tasks", agentParams(t.agentId)] });
        }
        for (const g of deck.goals) {
            if (g.archivedAt) continue;
            if (g.gateOn >= today && g.gateOn < end) out.push({ day: g.gateOn, text: `${g.windowDays}-day gate review · ${g.title}`, tag: "gate", tagColor: ORANGE, open: ["overview", {}] });
            if (g.nextActionDue && g.nextAction && g.nextActionDue >= today && g.nextActionDue < end) out.push({ day: g.nextActionDue, text: `▶ ${g.nextAction}`, tag: "next", tagColor: "#a5b4fc", open: ["overview", {}] });
        }
        for (const r of pulse.routines) {
            if (!r.enabled || r.archivedAt) continue;
            for (const at of cronOccurrences(r.cron, r.timezone || tz, from, to, 2)) {
                const w = wallParts(at, tz);
                out.push({ day: ymd(at, tz), time: `${pad(w.h)}:${pad(w.mi)}`, text: r.name, tag: "routine", tagColor: "#fdba74", open: ["pulse", { routineId: r.id }] });
            }
        }
        return out.sort((a, b) => a.day.localeCompare(b.day) || (a.time ?? "").localeCompare(b.time ?? "")).slice(0, 9);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [core.tasks, deck.goals, pulse.routines, today, tz, Math.floor(nowMs / 60000)]);

    const runRoutine = (r: OsRoutine) => {
        void useAosStore
            .getState()
            .run(`Started ${r.name}`, () => pulseApi.runRoutineNow(r.id))
            .then(() => usePulseStore.getState().refresh());
    };

    const toggleFull = () => {
        const el = graphRef.current;
        if (!el) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen?.();
    };

    // Responsive layout: side columns shrink, then merge into one tabbed column, then hide.
    const rootRef = useRef<HTMLDivElement>(null);
    const rootW = useWidth(rootRef);
    const [sideTab, setSideTab] = useState<"today" | "session">("today");
    const sideW = rootW >= 1720 ? 300 : rootW >= 1440 ? 268 : 240;
    const sideMode: "none" | "one" | "two" = ui.focus || rootW < 760 ? "none" : rootW < 1120 ? "one" : "two";
    const centreW = rootW - (sideMode === "two" ? 2 * sideW : sideMode === "one" ? sideW : 0);
    // The dock is centred on the deck (~540px wide); side columns only reserve room for it when it reaches them.
    const DOCK_HALF = 270;
    const sidePadL = sideMode === "two" && sideW > rootW / 2 - DOCK_HALF ? bottomInset : 0;
    const sidePadR = sideMode !== "none" && rootW - sideW < rootW / 2 + DOCK_HALF ? bottomInset : 0;

    /* ---------------- render pieces ---------------- */

    const w1 = wallParts(now, tz);
    const w2 = wallParts(now, ui.secondTz);
    const tzCity = (z: string) => (z.split("/").pop() ?? z).replace(/_/g, " ").toUpperCase();

    const gateGrid = (() => {
        if (!goal) return null;
        const year = Number(today.slice(0, 4));
        const wkOf = (s: string) => (Number(s.slice(0, 4)) < year ? 0 : Number(s.slice(0, 4)) > year ? 54 : isoWeek(s));
        const thisWk = isoWeek(today);
        const ws = wkOf(goal.startsOn);
        const wg = wkOf(goal.gateOn);
        return (
            <div className="space-y-[3px]">
                {[0, 1, 2, 3].map((q) => (
                    <div key={q} className="flex items-center gap-[3px]">
                        <span className="w-5 text-[9px] text-slate-500">Q{q + 1}</span>
                        {Array.from({ length: 13 }, (_, c) => {
                            const wk = q * 13 + c + 1;
                            const state = wk === thisWk ? "now" : wk === wg ? "gate" : wk < thisWk ? "past" : wk >= ws && wk <= wg ? "window" : "future";
                            return (
                                <span
                                    key={c}
                                    title={`Week ${wk}`}
                                    className="h-[7px] flex-1"
                                    style={{
                                        background: state === "now" ? "#ef4444" : state === "past" ? "#64748b" : state === "window" ? "#cbd5e1" : "transparent",
                                        border: state === "gate" ? `1px solid ${ORANGE}` : state === "future" ? "1px solid rgba(148,163,184,0.35)" : "none",
                                        opacity: state === "past" ? 0.7 : 1,
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
                <div className="pt-1 text-[9px] leading-relaxed text-slate-500">
                    <span className="text-red-400">■</span> this week · <span className="text-slate-300">■</span> {goal.windowDays}-day window {ddmm(goal.startsOn)}–{ddmm(goal.gateOn)} · <span style={{ color: ORANGE }}>□</span> review {ddmm(goal.gateOn)}
                </div>
            </div>
        );
    })();

    const leftSections = (
        <>
            <Section title="Today">
                <div className="mb-2 text-[10px] text-slate-500">
                    Wk{isoWeek(today)} · {longDate(today)}
                </div>
                <div className="flex items-center gap-3">
                    <AnalogClock h={w1.h} m={w1.mi} s={w1.s} />
                    <div>
                        <div className="flex items-baseline">
                            <span className="text-[30px] font-light leading-none tracking-tight text-white tabular-nums">
                                {pad(w1.h)}:{pad(w1.mi)}
                            </span>
                            <span className="ml-0.5 text-[13px] tabular-nums" style={{ color: ORANGE }}>
                                :{pad(w1.s)}
                            </span>
                        </div>
                        <div className="mt-1 text-[9px] tracking-widest text-slate-500">LOCAL · {offsetLabel(tzOffsetMinutes(tz, now))}</div>
                    </div>
                </div>
                <button
                    type="button"
                    title="Change the second time zone"
                    onClick={() => ui.patch({ secondTz: SECOND_TZS[(SECOND_TZS.indexOf(ui.secondTz) + 1) % SECOND_TZS.length] })}
                    className="mt-1.5 flex items-baseline gap-2 pl-[48px] text-left hover:opacity-80"
                >
                    <span className="text-[9px] tracking-widest text-slate-400">{tzCity(ui.secondTz)}</span>
                    <span className="text-[14px] tabular-nums text-slate-100">
                        {pad(w2.h)}:{pad(w2.mi)}
                    </span>
                    <span className="text-[9px] text-slate-500">{offsetLabel(tzOffsetMinutes(ui.secondTz, now))}</span>
                </button>
            </Section>

            <Section
                title="Gate review"
                right={
                    <div className="flex gap-2 text-[9px] uppercase tracking-wider">
                        {goal && (
                            <button type="button" onClick={() => setReviewingGoal(goal.id)} className="text-slate-400 hover:text-white">
                                review
                            </button>
                        )}
                        <button type="button" onClick={() => setEditingGoal(goal ? goal.id : "new")} className="text-slate-400 hover:text-white">
                            {goal ? "edit" : "+ goal"}
                        </button>
                    </div>
                }
            >
                {goal ? (
                    <>
                        <div className="mb-2 text-[13px] text-slate-100">
                            {dowDdmm(goal.gateOn)} · {relDays(daysBetween(today, goal.gateOn))}
                        </div>
                        {gateGrid}
                    </>
                ) : (
                    <div className="text-[11px] text-slate-500">No goal yet. Add one to track a 90-day gate.</div>
                )}
            </Section>

            <Section title="Next 14 days">
                {agenda.length === 0 ? (
                    <div className="text-[11px] text-slate-500">Nothing due in the next 14 days.</div>
                ) : (
                    <div className="space-y-2">
                        {agenda.map((a, i) => {
                            const first = i === 0 || agenda[i - 1].day !== a.day;
                            return (
                                <button key={i} type="button" onClick={() => onOpen(a.open[0], a.open[1])} className="flex w-full gap-3 text-left hover:bg-white/[0.03]">
                                    <span className="w-9 shrink-0 text-[10px] leading-tight text-slate-400">
                                        {first ? (
                                            <>
                                                {DOW_SHORT[new Date(`${a.day}T12:00:00Z`).getUTCDay()]}
                                                <br />
                                                {ddmm(a.day)}
                                            </>
                                        ) : null}
                                    </span>
                                    <span className="min-w-0 flex-1 text-[12px] leading-snug text-slate-200">
                                        <span className="line-clamp-2">
                                            {a.time && <span className="mr-1 text-slate-500">{a.time}</span>}
                                            {a.text}
                                        </span>
                                    </span>
                                    {a.tag && (
                                        <span className="shrink-0 self-start text-[10px]" style={{ color: a.tagColor ?? "#64748b" }}>
                                            {a.tag}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
                <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-2 text-[10px] text-slate-400">
                    <div>
                        brain · {st?.provider ?? core.settings?.defaultProvider ?? "-"} {st && !st.providerReady && <span className="text-amber-400">(not ready)</span>}
                    </div>
                    <div>
                        pulse · {st ? (st.pulseEnabled ? "on" : "off") : "-"} · {pulse.settings?.llmMode ?? "-"} · queue {st?.queueDepth ?? 0}
                    </div>
                </div>
            </Section>

            <Section title="Activity record">
                <div className="mb-2 text-[10px] text-slate-500">week {deck.deckStats ? ddmm(deck.deckStats.week.weekStart) : "-"}</div>
                <div className="space-y-1.5">
                    <Bar label="tasks" value={deck.deckStats?.week.tasksDone ?? 0} total={Math.max(deck.deckStats?.week.tasksCreated ?? 0, deck.deckStats?.week.tasksDone ?? 0)} />
                    <Bar label="reviews" value={deck.deckStats?.week.approvalsDecided ?? 0} total={deck.deckStats?.week.approvalsTotal ?? 0} />
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                    notes {deck.deckStats?.week.notesAdded ?? 0} · runs {deck.deckStats?.week.runs ?? 0}
                </div>
                {!!deck.deckStats?.weeks.length && (
                    <div className="mt-2 flex gap-[3px]" title="Activity score, last weeks">
                        {deck.deckStats.weeks.slice(-16).map((w) => (
                            <span key={w.weekStart} title={`${ddmm(w.weekStart)} · score ${w.score}`} className="h-2 flex-1 bg-slate-300" style={{ opacity: 0.12 + 0.88 * Math.min(1, w.score / Math.max(1, ...deck.deckStats!.weeks.map((x) => x.score))) }} />
                        ))}
                    </div>
                )}
                <div className="mt-3 border-l-2 border-white/15 pl-3">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Tracker · last run · {lastRun ? ddmm(ymd(new Date(lastRun.startedAt), tz)) : "-"}</div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-slate-200">
                        {lastRun ? `${lastRun.routineName ?? lastRun.kind ?? "run"} — ${lastRun.status}${lastRun.output ? ` · ${lastRun.output.split("\n")[0]}` : ""}` : "No runs yet."}
                    </div>
                </div>
                {goal && (
                    <button type="button" onClick={() => setEditingGoal(goal.id)} className="mt-3 flex w-full flex-wrap items-center gap-x-2 border border-white/15 px-2 py-1 text-left text-[10px] hover:border-white/30">
                        <span className="text-slate-500">target</span>
                        <span className="truncate text-slate-100">{goal.title}</span>
                        <span className="text-slate-400">{goal.windowDays}-day gate</span>
                        <span className="text-slate-300">{ddmm(goal.gateOn)}</span>
                    </button>
                )}
            </Section>

            <Section title="Pipeline backlog" className="flex-1 border-b-0">
                <div className="mb-2 text-[10px] text-slate-500">review separately</div>
                <div className="flex items-end gap-2">
                    <span className="text-[38px] font-light leading-none" style={{ color: overdue.length ? "#f87171" : "#e2e8f0" }}>
                        {overdue.length}
                    </span>
                    <span className="pb-1 text-[9px] uppercase leading-tight tracking-[0.15em] text-slate-400">
                        overdue
                        <br />
                        actions
                    </span>
                </div>
                <div className="mt-3 space-y-2">
                    {[...overdue.slice(0, 3).map((t) => ({ id: t.id, title: t.title, tag: t.moduleId, at: t.dueAt, open: ["tasks", agentParams(t.agentId)] as [AppId, AppParams] })),
                        ...pendingApprovals.slice(0, 2).map((a) => ({ id: a.id, title: a.summary, tag: "approval", at: a.requestedAt, open: ["governance", {}] as [AppId, AppParams] })),
                        ...reviewTasks.slice(0, 2).map((t) => ({ id: t.id, title: t.title, tag: "review", at: t.updatedAt, open: ["tasks", agentParams(t.agentId)] as [AppId, AppParams] })),
                    ]
                        .slice(0, 5)
                        .map((x) => (
                            <div key={x.id}>
                                <div className="flex items-baseline gap-2 text-[12px]">
                                    <span className="min-w-0 flex-1 truncate text-slate-100">{x.title}</span>
                                    <span className="shrink-0 text-[10px] text-slate-500">{x.tag}</span>
                                    <span className="shrink-0 text-[10px] text-slate-400">{ageLabel(x.at, nowMs)}</span>
                                </div>
                                <button type="button" onClick={() => onOpen(x.open[0], x.open[1])} className="text-[10px] text-slate-400 hover:text-white">
                                    ▶ View next action
                                </button>
                            </div>
                        ))}
                    {!overdue.length && !pendingApprovals.length && !reviewTasks.length && <div className="text-[11px] text-slate-500">Backlog is clear.</div>}
                </div>
            </Section>
        </>
    );

    const skillTiles = [
        ...routines.map((r) => ({ key: r.id, label: `/${slugify(r.name)}`, live: pulse.runs.some((x) => x.routineId === r.id && x.status === "running"), onClick: () => runRoutine(r), title: `Run "${r.name}" now` })),
        ...core.playbooks.filter((p) => p.enabled && !p.archivedAt).map((p) => ({ key: p.id, label: `/${slugify(p.title)}`, live: false, onClick: () => onOpen("playbooks"), title: `Open playbook "${p.title}"` })),
    ].slice(0, 6);

    const nextDueDays = goal?.nextActionDue ? daysBetween(today, goal.nextActionDue) : 0;

    const rightSections = (
        <>
            <Section title="Next session">
                {nextRun ? (
                    <button type="button" onClick={() => onOpen("pulse", { routineId: nextRun.routineId })} className="text-left">
                        <div className="text-[30px] font-light leading-none text-white">{durationLabel(new Date(nextRun.nextRunAt).getTime() - nowMs)}</div>
                        <div className="mt-2 text-[12px] text-slate-300">
                            {nextRun.name} · {nextRun.kind}
                        </div>
                    </button>
                ) : goal?.nextActionDue ? (
                    <button type="button" onClick={() => setEditingGoal(goal.id)} className="text-left" title="Edit the goal's next action">
                        <div className={cn("text-[30px] font-light leading-none", nextDueDays < 0 ? "text-red-400" : "text-white")}>
                            {nextDueDays < 0 ? (
                                <>
                                    {-nextDueDays} d <span className="text-[14px] uppercase tracking-[0.15em]">overdue</span>
                                </>
                            ) : (
                                relDays(nextDueDays)
                            )}
                        </div>
                        <div className="mt-2 text-[12px] text-slate-300">{goal.nextAction || goal.title}</div>
                    </button>
                ) : (
                    <>
                        <div className="text-[30px] font-light leading-none text-slate-500">—</div>
                        <button type="button" onClick={() => onOpen("pulse")} className="mt-2 text-[12px] text-slate-400 hover:text-white">
                            No routine scheduled. Enable one in Pulse ▶
                        </button>
                    </>
                )}
            </Section>

            <Section title="Waiting">
                <div className="space-y-2 text-[12px] text-slate-300">
                    {pendingApprovals.slice(0, 3).map((a) => (
                        <button key={a.id} type="button" onClick={() => onOpen("governance")} className="flex w-full items-baseline gap-2 text-left hover:text-white">
                            <span className="min-w-0 flex-1 truncate">{a.summary}</span>
                            <span className="shrink-0 text-[10px] text-amber-400">{ageLabel(a.requestedAt, nowMs)}</span>
                        </button>
                    ))}
                    {pendingApprovals.length > 3 && <div className="text-[10px] text-slate-500">+{pendingApprovals.length - 3} more approvals</div>}
                    {gatedRuns.map((r) => (
                        <button key={r.id} type="button" onClick={() => onOpen("workflows", { workflowId: r.workflowId, runId: r.id })} className="block w-full truncate text-left hover:text-white">
                            {r.workflowName ?? "Workflow"} is waiting at a gate.
                        </button>
                    ))}
                    {reviewTasks.length > 0 && (
                        <button type="button" onClick={() => onOpen("tasks")} className="block text-left hover:text-white">
                            {reviewTasks.length} task{reviewTasks.length === 1 ? "" : "s"} waiting for review.
                        </button>
                    )}
                    {!pendingApprovals.length && !gatedRuns.length && !reviewTasks.length && <div>Nothing is waiting on you.</div>}
                    {st && !st.providerReady && <div className="text-slate-400">No AI provider is connected.</div>}
                    {st && !st.pulseEnabled && <div className="text-slate-400">Pulse runner is paused.</div>}
                    {killSwitch && <div className="text-red-400">Kill switch is ON. All agents are frozen.</div>}
                    <div className="text-[11px] text-slate-400">{syncAge !== null && syncAge < 30 ? "✓ Live data synced" : "… Waiting for data"}</div>
                </div>
            </Section>

            <Section title="Skills deck">
                <div className="mb-3 text-[10px] text-slate-500">
                    {pulse.state === "unavailable" ? "No runner connected" : `${routines.filter((r) => r.enabled).length}/${routines.length} routines enabled`}
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                    {skillTiles.map((t) => (
                        <button key={t.key} type="button" title={t.title} onClick={t.onClick} className="group flex flex-col items-center gap-1.5">
                            <span className={cn("flex h-8 w-8 items-center justify-center border border-white/20 transition group-hover:border-orange-400/70 group-hover:bg-orange-500/10", t.live && "animate-pulse border-sky-400/70")}>
                                <Play className="h-3 w-3" fill={ORANGE} color={ORANGE} />
                            </span>
                            <span className="w-full truncate text-center text-[9px] text-slate-300">{t.label}</span>
                        </button>
                    ))}
                </div>
            </Section>

            <Section title="Routines" className="flex-1">
                <div className="mb-2 text-[10px] text-slate-500">
                    {firedToday}/{routines.length} fired today
                </div>
                <div className="grid grid-cols-[44px_1fr_auto] gap-x-2 text-[9px] uppercase tracking-wider text-slate-500">
                    <span>Time</span>
                    <span>Routine</span>
                    <span>Status</span>
                </div>
                <div className="mt-1 divide-y divide-white/[0.05]">
                    {routines.map((r) => {
                        const running = pulse.runs.some((x) => x.routineId === r.id && x.status === "running");
                        const status = running ? ["RUNNING", "#38bdf8"] : !r.enabled ? ["DISABLED", "#64748b"] : r.lastStatus === "failed" ? ["FAILED", "#ef4444"] : r.lastStatus === "blocked" ? ["BLOCKED", "#f59e0b"] : ["ENABLED", "#22c55e"];
                        const next = r.enabled && r.nextRunAt ? wallParts(new Date(r.nextRunAt), tz) : null;
                        return (
                            <div key={r.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-x-2 py-2">
                                {next ? (
                                    <span className="text-[11px] tabular-nums text-slate-300">
                                        {pad(next.h)}:{pad(next.mi)}
                                    </span>
                                ) : (
                                    <button type="button" title="Run now" onClick={() => runRoutine(r)} className="text-left text-[11px] text-slate-300 hover:text-orange-300">
                                        ▶
                                    </button>
                                )}
                                <button type="button" onClick={() => onOpen("pulse", { routineId: r.id })} className="truncate text-left text-[12px] text-slate-100 hover:text-white">
                                    {slugify(r.name)}
                                </button>
                                <span className="text-[9px] tracking-wider" style={{ color: status[1] }}>
                                    {status[0]}
                                </span>
                            </div>
                        );
                    })}
                    {!routines.length && <div className="py-2 text-[11px] text-slate-500">No routines yet.</div>}
                </div>
            </Section>

            <div className="space-y-1 border-t border-white/[0.07] px-4 py-3 text-[9px] uppercase tracking-wider text-slate-400">
                <div>
                    routines {routines.length} &nbsp; connected {(st?.providerReady ? 1 : 0) + (st?.pulseEnabled ? 1 : 0)}
                </div>
                <div>
                    today · {deck.deckStats?.today.failed ?? st?.failedToday ?? 0} error · {deck.deckStats?.today.success ?? st?.successToday ?? 0} ok · ${(deck.deckStats?.today.costUsd ?? 0).toFixed(2)}
                </div>
                <div>
                    yesterday · {deck.deckStats?.yesterday.failed ?? 0} error · {deck.deckStats?.yesterday.success ?? 0} ok · ${(deck.deckStats?.yesterday.costUsd ?? 0).toFixed(2)}
                </div>
            </div>
        </>
    );

    const sideCol = (side: "left" | "right", content: React.ReactNode, padBottom: number, tabs?: React.ReactNode) => (
        <aside
            className={cn("flex shrink-0 flex-col border-white/[0.07] [scrollbar-gutter:stable]", SCROLL_Y, side === "left" ? "border-r" : "border-l")}
            style={{ width: sideW, paddingBottom: padBottom || undefined, ...(tabs ? { "--deck-sticky": "33px" } : {}) } as React.CSSProperties}
        >
            {tabs}
            {content}
        </aside>
    );

    const sideTabs = (
        <div className="sticky top-0 z-[2] flex shrink-0 border-b border-white/[0.07] bg-[#0b0e13] text-[10px] uppercase tracking-[0.18em]">
            {(["today", "session"] as const).map((t) => (
                <button
                    key={t}
                    type="button"
                    onClick={() => setSideTab(t)}
                    className={cn("-mb-px flex-1 border-b-2 py-2", sideTab === t ? "border-slate-200 text-white" : "border-transparent text-slate-500 hover:text-slate-200")}
                >
                    {t}
                </button>
            ))}
        </div>
    );

    const allAreas = areaSel.size === 0;
    const showCounts = centreW >= 780;

    return (
        <div ref={rootRef} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0b0e13] font-mono text-slate-300 selection:bg-slate-700">
            {/* Status bar */}
            <div className="flex h-9 shrink-0 items-center justify-between gap-4 whitespace-nowrap border-b border-white/[0.07] px-4 text-[10px] tracking-[0.15em] [&_button]:shrink-0">
                <div className="flex min-w-0 items-center gap-4 overflow-hidden">
                    <span className="flex items-center gap-1.5">
                        <Dot color={coreState.c} pulse={coreState.t === "RUNNING"} />
                        <span className="text-slate-500">CORE</span>·<span className="text-slate-100">{coreState.t}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Dot color={core.stats?.runningTasks ? "#38bdf8" : "#64748b"} />
                        <span className="text-slate-500">RUNNER</span>·<span className="text-slate-100">{core.stats?.runningTasks ?? "-"}</span>
                    </span>
                    {rootW >= 900 && (
                        <span className="flex items-center gap-1.5">
                            <Dot color={syncAge !== null && syncAge < 15 ? "#22c55e" : "#f59e0b"} />
                            <span className="text-slate-500">SYNC</span>·<span className="text-slate-100">{syncAge === null ? "-" : `${syncAge}s`}</span>
                        </span>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                    {rootW >= 1440 && (
                        <span className="text-slate-500">
                            <span className="text-slate-100">LIVE</span> · DATA{" "}
                            <span className="text-slate-100">
                                {ddmm(today)} {pad(w1.h)}:{pad(w1.mi)}
                            </span>
                        </span>
                    )}
                    {rootW >= 1240 && (
                        <span className="text-slate-500">
                            · BRAIN <span className={st?.providerReady ? "text-slate-100" : "text-amber-400"}>{st?.provider ?? "-"}</span>
                        </span>
                    )}
                    {toolbar}
                    <button type="button" onClick={() => ui.reset()} title="Reset the deck layout" className="border border-white/15 px-2 py-0.5 tracking-normal text-slate-300 hover:border-white/30 hover:text-white">
                        {rootW >= 1100 ? "reset layout" : "reset"}
                    </button>
                    <button type="button" onClick={() => ui.patch({ focus: !ui.focus })} title="Hide or show the side columns" className={cn("border px-2 py-0.5 tracking-normal hover:text-white", ui.focus ? "border-orange-400/60 text-orange-200" : "border-white/15 text-slate-300 hover:border-white/30")}>
                        focus
                    </button>
                    <button
                        type="button"
                        onClick={exit ? exit.onClick : () => (window.location.href = "/admin/virtual-office")}
                        className="flex items-center gap-1 border border-orange-400/40 bg-orange-500/10 px-2 py-0.5 tracking-normal text-orange-100 hover:border-orange-300/70 hover:text-white"
                    >
                        {exit ? <X className="h-3 w-3" /> : null}
                        {exit?.label ?? "virtual office"}
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1">
                {sideMode === "two" && sideCol("left", leftSections, sidePadL)}

                {/* Centre: fixed-height column; only the graph flexes, nothing here scrolls vertically. */}
                <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="shrink-0 px-5 pb-2 pt-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Hexagon className="h-4 w-4" color={ORANGE} strokeWidth={2.2} />
                            <span className="text-[20px] font-medium leading-none tracking-[0.25em] text-white">AI OS</span>
                            <span className="text-[13px]" style={{ color: ORANGE }}>
                                Agentic OS
                            </span>
                        </div>
                        <div className="mt-1 text-[9px] tracking-[0.35em] text-slate-500">NUSANTARASOFT · LIVE DATA</div>
                    </div>

                    {/* Tabs + tools on one line (scrolls sideways when narrow), counts on the right */}
                    <div className="flex shrink-0 items-center gap-4 border-b border-white/[0.07] px-5 text-[10px] tracking-[0.12em]">
                        <HScroll className="flex-1 gap-4">
                        {VIEWS.map((v) => (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => ui.patch({ view: v.id })}
                                className={cn("-mb-px border-b-2 py-2", ui.view === v.id ? "border-slate-200 text-white" : "border-transparent text-slate-500 hover:text-slate-200")}
                            >
                                {v.label}
                            </button>
                        ))}
                        <span className="mx-1 h-3 w-px bg-white/10" />
                        <button type="button" onClick={() => ui.patch({ names: !ui.names })} className={cn("py-2 tracking-normal", ui.names ? "font-semibold text-white" : "text-slate-500")}>
                            names
                        </button>
                        <button type="button" onClick={() => ui.patch({ motion: !ui.motion })} className={cn("py-2 tracking-normal", ui.motion ? "font-semibold text-white" : "text-slate-500")}>
                            motion
                        </button>
                        <span className="flex items-center gap-1 py-2 tracking-normal text-slate-400">
                            <Search className="h-3 w-3" />
                            {searchOpen || search ? (
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onBlur={() => !search && setSearchOpen(false)}
                                    onKeyDown={(e) => e.key === "Escape" && (setSearch(""), setSearchOpen(false))}
                                    placeholder="search…"
                                    className="w-28 border-b border-white/20 bg-transparent text-[10px] text-slate-100 outline-none placeholder:text-slate-600"
                                />
                            ) : (
                                <button type="button" onClick={() => setSearchOpen(true)} className="hover:text-white">
                                    search
                                </button>
                            )}
                        </span>
                        <button type="button" onClick={() => setFitNonce((n) => n + 1)} className="flex items-center gap-1 py-2 tracking-normal text-slate-400 hover:text-white">
                            <Crosshair className="h-3 w-3" /> fit
                        </button>
                        <button type="button" onClick={toggleFull} className="flex items-center gap-1 py-2 tracking-normal text-slate-400 hover:text-white">
                            <Maximize className="h-3 w-3" /> full
                        </button>
                        </HScroll>
                        {showCounts && (
                            <div className="shrink-0 py-2 text-[10px] tracking-normal text-slate-500">
                                <span className="text-slate-200">{model.counts.items}</span> items · <span className="text-slate-200">{model.counts.links}</span> links · <span className="text-slate-200">{model.counts.runs}</span> runs
                            </div>
                        )}
                    </div>

                    {/* Area chips: one line, wheel scrolls sideways */}
                    <div className="shrink-0 space-y-1.5 px-5 pb-1 pt-2">
                    <HScroll className="gap-1.5">
                        <button type="button" onClick={() => setAreaSel(new Set())} className={cn("flex items-center gap-1.5 border px-2 py-[3px] text-[10px]", allAreas ? "border-white/40 text-white" : "border-white/10 text-slate-400 hover:text-white")}>
                            <span className={cn("h-2 w-2 border", allAreas ? "border-white bg-white" : "border-slate-500")} /> all areas
                        </button>
                        {model.areas.map((a) => {
                            const on = areaSel.has(a.id);
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => toggleArea(a.id)}
                                    className={cn("flex items-center gap-1.5 border px-2 py-[3px] text-[10px]", on ? "text-white" : "border-white/10 text-slate-300 hover:text-white")}
                                    style={on ? { borderColor: a.color, background: `${a.color}1a` } : undefined}
                                >
                                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                                    {a.name.toLowerCase()} <span className="text-slate-500">{a.count}</span>
                                </button>
                            );
                        })}
                    </HScroll>
                    <HScroll className="gap-1.5">
                        {TYPE_KEYS.map((t) => {
                            const Icon = TYPE_ICON[t];
                            const on = types.has(t);
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                        setTypes((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(t)) next.delete(t);
                                            else next.add(t);
                                            return next;
                                        })
                                    }
                                    className={cn("flex items-center gap-1.5 border px-2 py-[3px] text-[10px]", on ? "border-white/25 text-slate-100" : "border-white/[0.06] text-slate-600 line-through")}
                                >
                                    <Icon className="h-2.5 w-2.5" color={on ? TYPE_META[t].color : "#475569"} />
                                    {TYPE_META[t].label}
                                </button>
                            );
                        })}
                        {!showCounts && (
                            <span className="pl-2 text-[10px] text-slate-500">
                                <span className="text-slate-200">{model.counts.items}</span> items · <span className="text-slate-200">{model.counts.links}</span> links · <span className="text-slate-200">{model.counts.runs}</span> runs
                            </span>
                        )}
                    </HScroll>
                    </div>

                    {/* Graph: takes every remaining pixel; its content stays above the floating dock */}
                    <div ref={graphRef} className="relative min-h-[220px] flex-1 overflow-hidden bg-[#0b0e13]" style={bottomInset ? { paddingBottom: bottomInset } : undefined}>
                        <DeckGraphSvg
                            model={model}
                            layout={layout}
                            visible={visible}
                            names={ui.names}
                            motion={ui.motion}
                            search={search}
                            selected={selectedId}
                            onSelect={setSelectedId}
                            onIsolate={onIsolate}
                            fitNonce={fitNonce}
                        />

                        {selected && (
                            <div className={cn("absolute right-3 top-3 z-[3] max-h-[calc(100%-96px)] w-64 border border-white/15 bg-[#0b0e13]/95 p-3 text-[11px] shadow-2xl", SCROLL_Y)}>
                                <div className="flex items-start gap-2">
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: selected.color }} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{selected.kind}</div>
                                        <div className="break-words text-[13px] text-white">{selected.label}</div>
                                    </div>
                                    <button type="button" onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="mt-2 text-slate-400">{selected.sub}</div>
                                {selected.kind === "agent" && (
                                    <div className="mt-1 text-slate-500">{agentById(core.agents, selected.refId)?.description}</div>
                                )}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {selected.open && (
                                        <button type="button" onClick={() => onOpen(selected.open![0], selected.open![1])} className="border border-white/20 px-2 py-0.5 text-slate-200 hover:border-white/40 hover:text-white">
                                            open ▶
                                        </button>
                                    )}
                                    {selected.kind === "agent" && (
                                        <button type="button" onClick={() => onOpen("tasks", { agentId: selected.refId })} className="border border-white/20 px-2 py-0.5 text-slate-200 hover:border-white/40 hover:text-white">
                                            tasks
                                        </button>
                                    )}
                                    {selected.route && (
                                        <a href={selected.route} className="border border-white/20 px-2 py-0.5 text-slate-200 hover:border-white/40 hover:text-white">
                                            module page ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pointer-events-none absolute inset-x-0 text-center text-[8.5px] tracking-[0.2em] text-slate-600" style={{ bottom: bottomInset + 6 }}>
                            {ui.view === "orbit"
                                ? "DOT → ITEM · CLICK → CARD · DRAG ROTATES · SHIFT-DRAG PANS · WHEEL ZOOMS"
                                : ui.view === "timeline"
                                  ? "LANES → RUNS OVER 14 DAYS · FILES → BY LAST CHANGE · CLICK → CARD · WHEEL ZOOMS"
                                  : "DOT → ITEM · CLICK → CARD · AREA OR RING NAME ISOLATES · WHEEL ZOOMS · DRAG PANS"}
                        </div>
                    </div>
                </main>

                {sideMode === "two" && sideCol("right", rightSections, sidePadR)}
                {sideMode === "one" && sideCol("right", sideTab === "today" ? leftSections : rightSections, sidePadR, sideTabs)}
            </div>

            {editingGoal && (
                <GoalEditor
                    goal={editingGoal === "new" ? null : deck.goals.find((g) => g.id === editingGoal) ?? null}
                    onClose={() => setEditingGoal(null)}
                    onSaved={(g) => {
                        setEditingGoal(null);
                        ui.patch({ goalId: g.id });
                    }}
                />
            )}
            {reviewingGoal && deck.goals.find((g) => g.id === reviewingGoal) && <GoalReviewDialog goal={deck.goals.find((g) => g.id === reviewingGoal)!} onClose={() => setReviewingGoal(null)} />}
        </div>
    );
}
