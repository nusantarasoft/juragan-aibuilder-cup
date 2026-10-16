"use client";

/**
 * Agentic OS — desktop shell. The Command Deck ("AI OS" overview) is the home
 * screen and is always underneath; every other app opens as a window on top
 * of it. The deck's status bar is the menu bar, a slim dock sits at the
 * bottom and Ctrl K opens the launcher. Used by both the Virtual Office
 * overlay (full screen) and the /admin/agentic-os page (embedded).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Command, LayoutDashboard, Maximize2, Minimize2, Minus, Play, Power, Search, ShieldAlert, X, type LucideIcon } from "lucide-react";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { useAosStore } from "./lib/store";
import { usePulseStore } from "./lib/pulseStore";
import { usePhase3Store } from "./lib/phase3Store";
import { useAosTheme, useDeckUi, type DeckView } from "./lib/deckStore";
import { pulseApi } from "./lib/api";
import { APPS, APP_BY_ID, useOsUi, type AppId, type AppParams } from "./registry";
import { CommandDeck } from "./apps/deck/CommandDeck";
import { AgentDot, Toasts, cx } from "./ui/kit";

interface Win {
    app: AppId;
    params: AppParams;
    nonce: number;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    min: boolean;
    max: boolean;
}

/** Height of the deck status bar (the menu bar). */
const BAR_H = 36;
/** Space reserved for the dock. */
const DOCK_H = 62;
const ORANGE = "#fb923c";
const WINDOW_APPS = APPS.filter((a) => a.id !== "overview");

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

function OsWindow({ win, focused, bounds, onFocus, onChange, onClose, open }: {
    win: Win;
    focused: boolean;
    bounds: () => DOMRect | null;
    onFocus: () => void;
    onChange: (p: Partial<Win>) => void;
    onClose: () => void;
    open: (app: AppId, params?: AppParams) => void;
}) {
    const def = APP_BY_ID[win.app];
    const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

    const onPointerDown = (mode: "move" | "resize") => (e: React.PointerEvent) => {
        if (win.max && mode === "move") return;
        e.preventDefault();
        onFocus();
        drag.current = { mode, sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y, ow: win.w, oh: win.h };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        const b = bounds();
        const W = b?.width ?? window.innerWidth;
        const H = b?.height ?? window.innerHeight;
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (d.mode === "move") onChange({ x: Math.max(-d.ow + 120, Math.min(W - 120, d.ox + dx)), y: Math.max(BAR_H, Math.min(H - DOCK_H - 40, d.oy + dy)) });
        else onChange({ w: Math.max(520, d.ow + dx), h: Math.max(340, d.oh + dy) });
    };
    const onPointerUp = () => {
        drag.current = null;
    };

    const style: React.CSSProperties = win.max
        ? { left: 8, top: BAR_H + 8, width: "calc(100% - 16px)", height: `calc(100% - ${BAR_H + DOCK_H + 16}px)`, zIndex: win.z }
        : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

    const btn = "flex h-[18px] w-[18px] items-center justify-center border border-white/15 text-slate-400 transition hover:border-white/40 hover:text-white";

    return (
        <div
            onPointerDown={onFocus}
            className={cx(
                "absolute flex flex-col overflow-hidden border bg-[#0b0e13] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-150",
                focused ? "border-white/25" : "border-white/10",
                win.min && "hidden",
            )}
            style={{ ...style, borderTopColor: focused ? def.color : undefined }}
        >
            <div
                onPointerDown={onPointerDown("move")}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onDoubleClick={() => onChange({ max: !win.max })}
                className={cx("flex h-8 shrink-0 cursor-grab select-none items-center gap-2 border-b border-white/[0.08] px-3 font-mono active:cursor-grabbing", focused ? "bg-white/[0.03]" : "")}
            >
                <def.icon className="h-3.5 w-3.5 shrink-0" style={{ color: def.color }} />
                <span className={cx("text-[10px] font-semibold uppercase tracking-[0.2em]", focused ? "text-white" : "text-slate-400")}>{def.name}</span>
                {def.layer && <span className="border border-white/15 px-1 text-[8px] text-slate-400">{def.layer}</span>}
                <span className="truncate text-[10px] text-slate-500">· {def.description}</span>
                <div className="ml-auto flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => onChange({ min: true })} className={btn} aria-label="Minimize" title="Minimize">
                        <Minus className="h-2.5 w-2.5" />
                    </button>
                    <button type="button" onClick={() => onChange({ max: !win.max })} className={btn} aria-label="Maximize" title={win.max ? "Restore" : "Maximize"}>
                        {win.max ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
                    </button>
                    <button type="button" onClick={onClose} className={cx(btn, "hover:border-red-400/70 hover:bg-red-500/20 hover:text-red-200")} aria-label="Close" title="Close">
                        <X className="h-2.5 w-2.5" />
                    </button>
                </div>
            </div>
            <div className="min-h-0 flex-1" key={win.nonce}>
                {def.render(win.params, open)}
            </div>
            {!win.max && (
                <div
                    onPointerDown={onPointerDown("resize")}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-se-resize"
                    style={{ background: "linear-gradient(135deg, transparent 50%, rgba(251,146,60,0.45) 50%)" }}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Launcher (Ctrl K)                                                   */
/* ------------------------------------------------------------------ */

interface LaunchItem {
    key: string;
    group: string;
    label: string;
    hint: string;
    icon: React.ReactNode;
    run: () => void;
}

const VIEW_LABEL: Record<DeckView, string> = { rings: "Rings", circle: "Circle", areas: "Areas", links: "Links", timeline: "Timeline", orbit: "3D Orbit" };

function Launcher({ onClose, open, showDeck }: { onClose: () => void; open: (app: AppId, params?: AppParams) => void; showDeck: () => void }) {
    const agents = useAosStore((s) => s.agents);
    const routines = usePulseStore((s) => s.routines);
    const { areas, workflows } = usePhase3Store(useShallow((s) => ({ areas: s.areas, workflows: s.workflows })));
    const [q, setQ] = useState("");
    const [idx, setIdx] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const items = useMemo<LaunchItem[]>(() => {
        const s = q.trim().toLowerCase();
        const has = (...t: (string | null | undefined)[]) => !s || t.some((x) => x?.toLowerCase().includes(s));
        const ico = (Icon: LucideIcon, color: string) => <Icon className="h-3.5 w-3.5" style={{ color }} />;
        const out: LaunchItem[] = [];
        for (const a of APPS) if (has(a.name, a.description)) out.push({ key: `app:${a.id}`, group: "apps", label: a.id === "overview" ? "Overview (home)" : a.name, hint: a.description, icon: ico(a.icon, a.color), run: () => (a.id === "overview" ? showDeck() : open(a.id)) });
        for (const v of Object.keys(VIEW_LABEL) as DeckView[])
            if (has(`view ${VIEW_LABEL[v]}`, "graph"))
                out.push({ key: `view:${v}`, group: "overview views", label: `View · ${VIEW_LABEL[v]}`, hint: "Switch the overview graph", icon: ico(LayoutDashboard, ORANGE), run: () => (useDeckUi.getState().patch({ view: v }), showDeck()) });
        if (has("focus mode", "toggle")) out.push({ key: "act:focus", group: "actions", label: "Toggle focus mode", hint: "Hide the overview side columns", icon: ico(LayoutDashboard, "#94a3b8"), run: () => (useDeckUi.getState().patch({ focus: !useDeckUi.getState().focus }), showDeck()) });
        if (has("motion", "animation", "toggle")) out.push({ key: "act:motion", group: "actions", label: "Toggle motion", hint: "Animate the overview graph", icon: ico(LayoutDashboard, "#94a3b8"), run: () => useDeckUi.getState().patch({ motion: !useDeckUi.getState().motion }) });
        if (s) {
            for (const a of agents.filter((x) => !x.archivedAt && has(x.name, x.role, x.slug))) {
                out.push({ key: `agent:${a.id}`, group: "agents", label: `Customize ${a.name}`, hint: a.role, icon: <AgentDot color={a.color} name={a.name} size={16} />, run: () => open("studio", { agentId: a.id }) });
                out.push({ key: `tasks:${a.id}`, group: "agents", label: `${a.name}'s tasks`, hint: "Tasks", icon: <AgentDot color={a.color} name={a.name} size={16} />, run: () => open("tasks", { agentId: a.id }) });
            }
            for (const r of routines.filter((x) => !x.archivedAt && has(x.name, x.description))) {
                out.push({
                    key: `run:${r.id}`,
                    group: "routines",
                    label: `Run ${r.name} now`,
                    hint: r.enabled ? r.cron : "disabled",
                    icon: ico(Play, ORANGE),
                    run: () => void useAosStore.getState().run(`Started ${r.name}`, () => pulseApi.runRoutineNow(r.id)).then(() => usePulseStore.getState().refresh()),
                });
                out.push({ key: `routine:${r.id}`, group: "routines", label: `Open ${r.name}`, hint: "Pulse", icon: ico(APP_BY_ID.pulse.icon, APP_BY_ID.pulse.color), run: () => open("pulse", { routineId: r.id }) });
            }
            for (const ar of areas.filter((x) => !x.archivedAt && has(x.name, x.slug, x.description)))
                out.push({ key: `area:${ar.id}`, group: "memory areas", label: ar.name, hint: `${ar.itemCount ?? 0} items`, icon: <span className="h-2.5 w-2.5 rounded-full" style={{ background: ar.color }} />, run: () => open("memory", { areaId: ar.id }) });
            for (const w of workflows.filter((x) => !x.archivedAt && has(x.name, x.description)))
                out.push({ key: `wf:${w.id}`, group: "workflows", label: w.name, hint: w.lastStatus ?? "never run", icon: ico(APP_BY_ID.workflows.icon, APP_BY_ID.workflows.color), run: () => open("workflows", { workflowId: w.id }) });
        }
        return out.slice(0, 40);
    }, [q, agents, routines, areas, workflows, open, showDeck]);

    useEffect(() => {
        listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: "nearest" });
    }, [idx]);

    const go = (i: number) => {
        items[i]?.run();
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[3000] flex items-start justify-center bg-black/55 pt-[12vh] font-mono" onPointerDown={onClose}>
            <div className="w-[600px] max-w-[92%] overflow-hidden border border-white/20 bg-[#0b0e13] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.95)]" style={{ borderTopColor: ORANGE }} onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setIdx(0);
                        }}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") onClose();
                            else if (e.key === "ArrowDown") (e.preventDefault(), setIdx((i) => Math.min(items.length - 1, i + 1)));
                            else if (e.key === "ArrowUp") (e.preventDefault(), setIdx((i) => Math.max(0, i - 1)));
                            else if (e.key === "Enter") go(idx);
                        }}
                        placeholder="Open an app, agent, routine, memory area or view…"
                        className="flex-1 bg-transparent text-[13px] text-white placeholder:text-slate-600 focus:outline-none"
                    />
                    <kbd className="border border-white/15 px-1.5 text-[9px] text-slate-400">ESC</kbd>
                </div>
                <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1 [scrollbar-width:thin]">
                    {items.map((it, i) => (
                        <React.Fragment key={it.key}>
                            {(i === 0 || items[i - 1].group !== it.group) && <div className="px-4 pb-1 pt-2 text-[9px] uppercase tracking-[0.2em] text-slate-500">{it.group}</div>}
                            <button
                                type="button"
                                data-idx={i}
                                onMouseEnter={() => setIdx(i)}
                                onClick={() => go(i)}
                                className={cx("flex w-full items-center gap-3 border-l-2 px-4 py-1.5 text-left", i === idx ? "border-orange-400 bg-white/[0.06]" : "border-transparent")}
                            >
                                <span className="flex w-4 justify-center">{it.icon}</span>
                                <span className="flex-1 truncate text-[12px] text-slate-100">{it.label}</span>
                                <span className="max-w-[45%] truncate text-[10px] text-slate-500">{it.hint}</span>
                            </button>
                        </React.Fragment>
                    ))}
                    {!items.length && <div className="px-4 py-6 text-center text-[11px] text-slate-500">No results</div>}
                </div>
                <div className="flex gap-4 border-t border-white/10 px-4 py-1.5 text-[9px] uppercase tracking-wider text-slate-500">
                    <span>↑↓ navigate</span>
                    <span>↵ open</span>
                    <span>esc close</span>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Dock                                                                */
/* ------------------------------------------------------------------ */

function DockTile({ label, icon: Icon, color, active, open, badge, layer, onClick }: {
    label: string;
    icon: LucideIcon;
    color: string;
    active: boolean;
    open: boolean;
    badge?: number;
    layer?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={cx("group relative flex h-9 w-9 items-center justify-center border transition hover:-translate-y-0.5", !active && "border-white/10")}
            style={{ borderColor: active ? `${color}aa` : undefined, background: active ? `${color}1f` : "transparent" }}
        >
            <span className="pointer-events-none absolute -top-8 whitespace-nowrap border border-white/15 bg-[#0b0e13] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-200 opacity-0 transition group-hover:opacity-100">{label}</span>
            <Icon className="h-4 w-4" style={{ color }} />
            {layer && <span className="absolute bottom-0 right-0.5 text-[7px] leading-none text-slate-500">{layer}</span>}
            {!!badge && <span className="absolute -right-1.5 -top-1.5 min-w-[15px] bg-red-500 px-0.5 text-center text-[8px] font-bold leading-[15px] text-white">{badge}</span>}
            <span className="absolute -bottom-[5px] left-1/2 h-[2px] w-4 -translate-x-1/2 transition" style={{ background: open ? color : "transparent" }} />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Desktop                                                             */
/* ------------------------------------------------------------------ */

export function AgenticOsDesktop({ exit, initialApp = "overview", initialParams = {}, onRouteChange, consumePendingRequest = true, className }: {
    exit?: { label: string; onClick: () => void };
    initialApp?: AppId;
    initialParams?: AppParams;
    /** Called whenever the front-most app changes (the page uses it to keep the URL in sync). */
    onRouteChange?: (app: AppId, params: AppParams) => void;
    /** Open the launch request that is pending at mount (true for the overlay, which is opened by it). */
    consumePendingRequest?: boolean;
    className?: string;
}) {
    const { isDark, setTheme } = useAosTheme();
    const request = useOsUi((s) => s.request);
    const { stats, settings, status, error } = useAosStore(useShallow((s) => ({ stats: s.stats, settings: s.settings, status: s.status, error: s.error })));
    const [wins, setWins] = useState<Win[]>([]);
    const [launcher, setLauncher] = useState(false);
    const zTop = useRef(10);
    const rootRef = useRef<HTMLDivElement>(null);
    const bounds = useCallback(() => rootRef.current?.getBoundingClientRect() ?? null, []);

    const showDeck = useCallback(() => setWins((ws) => ws.map((w) => ({ ...w, min: true }))), []);

    const open = useCallback(
        (app: AppId, params: AppParams = {}) => {
            if (app === "overview") return showDeck();
            setWins((ws) => {
                const z = ++zTop.current;
                const existing = ws.find((w) => w.app === app);
                if (existing) {
                    const sameParams = JSON.stringify(existing.params) === JSON.stringify(params) || !Object.keys(params).length;
                    return ws.map((w) => (w.app === app ? { ...w, z, min: false, ...(sameParams ? {} : { params, nonce: Date.now() }) } : w));
                }
                const b = bounds();
                const vw = b?.width ?? window.innerWidth;
                const vh = b?.height ?? window.innerHeight;
                const w = Math.min(app === "tasks" || app === "pulse" || app === "governance" || app === "memory" || app === "workflows" ? 1320 : 1120, vw - 48);
                const h = Math.min(760, vh - BAR_H - DOCK_H - 24);
                const n = ws.filter((x) => !x.min).length;
                return [...ws, { app, params, nonce: Date.now(), x: Math.max(12, (vw - w) / 2 + n * 28), y: Math.max(BAR_H + 10, (vh - h - DOCK_H) / 2 + n * 24), w, h, z, min: false, max: false }];
            });
        },
        [bounds, showDeck],
    );

    // Initial app (page deep links) and launch requests from elsewhere (Virtual Office, apps).
    useEffect(() => {
        if (initialApp !== "overview") open(initialApp, initialParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const lastNonce = useRef(consumePendingRequest ? 0 : useOsUi.getState().request?.nonce ?? 0);
    useEffect(() => {
        if (request && request.nonce !== lastNonce.current) {
            lastNonce.current = request.nonce;
            open(request.app, request.params);
        }
    }, [request, open]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k" || e.code === "Space")) {
                e.preventDefault();
                setLauncher((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, []);

    const top = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0];

    useEffect(() => {
        onRouteChange?.(top?.app ?? "overview", top?.params ?? {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [top?.app, top?.nonce]);

    const toolbar = (
        <>
            {status === "error" && (
                <span className="border border-red-400/40 bg-red-500/15 px-2 py-0.5 tracking-normal text-red-200" title={error ?? ""}>
                    backend offline
                </span>
            )}
            {settings?.killSwitch && (
                <button type="button" onClick={() => open("settings")} className="flex items-center gap-1 border border-red-400/50 bg-red-500/15 px-2 py-0.5 tracking-normal text-red-200">
                    <Power className="h-3 w-3" /> frozen
                </button>
            )}
            {!!stats?.pendingApprovals && (
                <button type="button" onClick={() => open("governance")} className="flex items-center gap-1 border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 tracking-normal text-amber-200 hover:border-amber-300/70">
                    <ShieldAlert className="h-3 w-3" /> {stats.pendingApprovals} approval{stats.pendingApprovals > 1 ? "s" : ""}
                </button>
            )}
            <button type="button" onClick={() => setLauncher(true)} className="flex items-center gap-1.5 border border-white/15 px-2 py-0.5 tracking-normal text-slate-300 hover:border-white/30 hover:text-white">
                <Search className="h-3 w-3" /> search <kbd className="text-[9px] text-slate-500">Ctrl K</kbd>
            </button>
            <span data-testid="aos-theme-toggle" title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"} className="inline-flex">
                <AnimatedThemeToggler
                    isDark={isDark}
                    onThemeChange={setTheme}
                    size={13}
                    className="!p-0 flex h-[22px] w-[22px] items-center justify-center !rounded-none border border-white/15 text-slate-300 transition hover:border-white/30 hover:text-white"
                />
            </span>
        </>
    );

    return (
        <div
            ref={rootRef}
            data-theme={isDark ? "dark" : "light"}
            className={cx("aos-root relative h-full w-full overflow-hidden bg-[#0b0e13] text-slate-100", !isDark && "aos-light", className)}
            onKeyDown={(e) => e.stopPropagation()}
        >
            {/* The CMS layout's bottom widget dock (and the MacDock) would sit on top of the OS dock; hide them while the desktop is mounted. */}
            <style>{'div.md\\:flex[style*="translateX(-50%)"]{display:none!important}div:has(> .mac-dock-container){display:none!important}'}</style>
            {/* Home screen: the overview deck */}
            <div className="absolute inset-0">
                <CommandDeck onOpen={open} exit={exit} toolbar={toolbar} bottomInset={DOCK_H} />
            </div>

            {/* App windows */}
            {wins.map((w) => (
                <OsWindow
                    key={w.app}
                    win={w}
                    focused={top?.app === w.app}
                    bounds={bounds}
                    open={open}
                    onFocus={() => {
                        if (top?.app !== w.app) setWins((ws) => ws.map((x) => (x.app === w.app ? { ...x, z: ++zTop.current } : x)));
                    }}
                    onChange={(p) => setWins((ws) => ws.map((x) => (x.app === w.app ? { ...x, ...p } : x)))}
                    onClose={() => setWins((ws) => ws.filter((x) => x.app !== w.app))}
                />
            ))}

            {/* Dock */}
            <div className="aos-dock absolute bottom-2.5 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-1.5 border border-white/15 bg-[#0b0e13]/90 px-2 py-1.5 font-mono shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-xl">
                <DockTile label="Overview" icon={LayoutDashboard} color={ORANGE} active={!top} open onClick={showDeck} layer="S" />
                <span className="mx-0.5 h-6 w-px bg-white/10" />
                {WINDOW_APPS.map((a) => {
                    const w = wins.find((x) => x.app === a.id);
                    const badge = a.id === "governance" ? stats?.pendingApprovals : a.id === "tasks" ? stats?.reviewTasks : 0;
                    return (
                        <DockTile
                            key={a.id}
                            label={a.name}
                            icon={a.icon}
                            color={a.color}
                            layer={a.layer}
                            active={top?.app === a.id}
                            open={!!w}
                            badge={badge}
                            onClick={() => (w && !w.min && top?.app === a.id ? setWins((ws) => ws.map((x) => (x.app === a.id ? { ...x, min: true } : x))) : open(a.id))}
                        />
                    );
                })}
                <span className="mx-0.5 h-6 w-px bg-white/10" />
                <DockTile label="Search · Ctrl K" icon={Command} color="#cbd5e1" active={launcher} open={false} onClick={() => setLauncher(true)} />
            </div>

            {launcher && <Launcher onClose={() => setLauncher(false)} open={open} showDeck={showDeck} />}
            <Toasts className="bottom-[84px]" />
        </div>
    );
}
