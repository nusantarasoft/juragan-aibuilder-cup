"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Box, Command, Maximize2, Minimize2, Minus, Power, Search, ShieldAlert, X } from "lucide-react";
import { startAosPolling, useAosStore } from "./lib/store";
import { APPS, APP_BY_ID, useOsUi, type AppId, type AppParams } from "./registry";
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

const MENU_H = 36;
const DOCK_H = 74;

function useClock() {
    const [t, setT] = useState(() => new Date());
    useEffect(() => {
        const i = setInterval(() => setT(new Date()), 15000);
        return () => clearInterval(i);
    }, []);
    return t;
}

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

function OsWindow({ win, focused, onFocus, onChange, onClose, open }: { win: Win; focused: boolean; onFocus: () => void; onChange: (p: Partial<Win>) => void; onClose: () => void; open: (app: AppId, params?: AppParams) => void }) {
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
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (d.mode === "move") onChange({ x: Math.max(-d.ow + 120, Math.min(window.innerWidth - 120, d.ox + dx)), y: Math.max(MENU_H, Math.min(window.innerHeight - 80, d.oy + dy)) });
        else onChange({ w: Math.max(560, d.ow + dx), h: Math.max(360, d.oh + dy) });
    };
    const onPointerUp = () => {
        drag.current = null;
    };

    const style: React.CSSProperties = win.max
        ? { left: 8, top: MENU_H + 8, width: "calc(100% - 16px)", height: `calc(100% - ${MENU_H + DOCK_H + 16}px)`, zIndex: win.z }
        : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

    return (
        <div
            onPointerDown={onFocus}
            className={cx(
                "absolute flex flex-col overflow-hidden rounded-2xl border bg-slate-950/[0.93] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-[box-shadow,border-color] animate-in fade-in zoom-in-95 duration-200",
                focused ? "border-white/20" : "border-white/10",
                win.min && "hidden",
            )}
            style={style}
        >
            <div
                onPointerDown={onPointerDown("move")}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onDoubleClick={() => onChange({ max: !win.max })}
                className={cx("flex h-10 shrink-0 cursor-grab select-none items-center gap-2 border-b border-white/10 px-3 active:cursor-grabbing", focused ? "bg-white/[0.04]" : "")}
            >
                <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" onClick={onClose} className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57]" aria-label="Close">
                        <X className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
                    </button>
                    <button type="button" onClick={() => onChange({ min: true })} className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#febc2e]" aria-label="Minimize">
                        <Minus className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
                    </button>
                    <button type="button" onClick={() => onChange({ max: !win.max })} className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#28c840]" aria-label="Maximize">
                        {win.max ? <Minimize2 className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" /> : <Maximize2 className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />}
                    </button>
                </div>
                <def.icon className="ml-2 h-3.5 w-3.5" style={{ color: def.color }} />
                <span className="text-[12px] font-semibold text-white">{def.name}</span>
                {def.layer && <span className="rounded bg-indigo-500/20 px-1 text-[9px] font-black text-indigo-200">{def.layer}</span>}
                <span className="truncate text-[11px] text-slate-500">— {def.description}</span>
            </div>
            <div className="min-h-0 flex-1" key={win.nonce}>
                {def.render(win.params, open)}
            </div>
            {!win.max && (
                <div
                    onPointerDown={onPointerDown("resize")}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
                    style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.18) 50%)" }}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Launcher (⌘K)                                                       */
/* ------------------------------------------------------------------ */

function Launcher({ onClose, open }: { onClose: () => void; open: (app: AppId, params?: AppParams) => void }) {
    const agents = useAosStore((s) => s.agents);
    const [q, setQ] = useState("");
    const [idx, setIdx] = useState(0);
    const items = useMemo(() => {
        const s = q.trim().toLowerCase();
        const apps = APPS.filter((a) => !s || a.name.toLowerCase().includes(s) || a.description.toLowerCase().includes(s)).map((a) => ({
            key: `app:${a.id}`,
            label: a.name,
            hint: a.description,
            icon: <a.icon className="h-4 w-4" style={{ color: a.color }} />,
            run: () => open(a.id),
        }));
        const ags = agents
            .filter((a) => !a.archivedAt && s && (a.name.toLowerCase().includes(s) || a.role.toLowerCase().includes(s)))
            .flatMap((a) => [
                { key: `agent:${a.id}`, label: `Customize ${a.name}`, hint: a.role, icon: <AgentDot color={a.color} name={a.name} size={18} />, run: () => open("studio", { agentId: a.id }) },
                { key: `tasks:${a.id}`, label: `${a.name}'s tasks`, hint: "Task Manager", icon: <AgentDot color={a.color} name={a.name} size={18} />, run: () => open("tasks", { agentId: a.id }) },
            ]);
        return [...apps, ...ags].slice(0, 12);
    }, [q, agents, open]);

    const go = (i: number) => {
        items[i]?.run();
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[3000] flex items-start justify-center bg-black/40 pt-[14vh] backdrop-blur-sm" onPointerDown={onClose}>
            <div className="w-[560px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
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
                            else if (e.key === "ArrowDown") setIdx((i) => Math.min(items.length - 1, i + 1));
                            else if (e.key === "ArrowUp") setIdx((i) => Math.max(0, i - 1));
                            else if (e.key === "Enter") go(idx);
                        }}
                        placeholder="Open an app or find an agent…"
                        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <kbd className="rounded border border-white/15 px-1.5 text-[10px] text-slate-400">esc</kbd>
                </div>
                <div className="max-h-[360px] overflow-y-auto p-1.5">
                    {items.map((it, i) => (
                        <button key={it.key} type="button" onMouseEnter={() => setIdx(i)} onClick={() => go(i)} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", i === idx ? "bg-white/10" : "")}>
                            {it.icon}
                            <span className="flex-1 text-[13px] text-white">{it.label}</span>
                            <span className="truncate text-[11px] text-slate-500">{it.hint}</span>
                        </button>
                    ))}
                    {!items.length && <div className="px-3 py-6 text-center text-[12px] text-slate-500">No results</div>}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

/** Full-screen desktop overlay. Mount once; open via `useOsUi().launch()`. */
export function AgenticOsOverlay({ exitLabel = "Back to office" }: { exitLabel?: string }) {
    const { isOpen, request, close } = useOsUi(useShallow((s) => ({ isOpen: s.open, request: s.request, close: s.close })));
    const { stats, settings, status, error } = useAosStore(useShallow((s) => ({ stats: s.stats, settings: s.settings, status: s.status, error: s.error })));
    const [wins, setWins] = useState<Win[]>([]);
    const [launcher, setLauncher] = useState(false);
    const zTop = useRef(10);
    const clock = useClock();

    useEffect(() => (isOpen ? startAosPolling(4000) : undefined), [isOpen]);

    const open = useCallback((app: AppId, params: AppParams = {}) => {
        setWins((ws) => {
            const z = ++zTop.current;
            const existing = ws.find((w) => w.app === app);
            if (existing) {
                const sameParams = JSON.stringify(existing.params) === JSON.stringify(params) || !Object.keys(params).length;
                return ws.map((w) => (w.app === app ? { ...w, z, min: false, ...(sameParams ? {} : { params, nonce: Date.now() }) } : w));
            }
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const w = Math.min(app === "tasks" || app === "pulse" || app === "governance" ? 1320 : 1120, vw - 120);
            const h = Math.min(740, vh - MENU_H - DOCK_H - 40);
            const n = ws.length;
            return [...ws, { app, params, nonce: Date.now(), x: Math.max(16, (vw - w) / 2 - 80 + n * 32), y: Math.max(MENU_H + 12, (vh - h - DOCK_H) / 2 - 20 + n * 26), w, h, z, min: false, max: false }];
        });
    }, []);

    // Handle launch requests from outside (Virtual Office buttons).
    const lastNonce = useRef(0);
    useEffect(() => {
        if (request && request.nonce !== lastNonce.current) {
            lastNonce.current = request.nonce;
            open(request.app, request.params);
        }
    }, [request, open]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k" || e.code === "Space")) {
                e.preventDefault();
                setLauncher((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [isOpen]);

    if (!isOpen) return null;
    const top = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0];

    return (
        <div
            className="fixed inset-0 z-[1500] overflow-hidden text-slate-100 animate-in fade-in duration-300"
            onKeyDown={(e) => e.stopPropagation()}
            style={{
                background:
                    "radial-gradient(1200px 700px at 15% 10%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(900px 600px at 85% 90%, rgba(34,211,238,0.22), transparent 60%), radial-gradient(700px 500px at 70% 20%, rgba(168,85,247,0.18), transparent 60%), #05070f",
            }}
        >
            <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

            {/* Menu bar */}
            <div className="absolute inset-x-0 top-0 z-[2000] flex items-center gap-3 border-b border-white/10 bg-black/40 px-3 backdrop-blur-xl" style={{ height: MENU_H }}>
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-white">
                    <Box className="h-4 w-4 text-indigo-300" /> Agentic OS
                    <span className="rounded bg-white/10 px-1 text-[9px] font-semibold tracking-wider text-slate-300">MAPS</span>
                </span>
                <span className="text-[12px] text-slate-400">{top ? APP_BY_ID[top.app].name : "Desktop"}</span>
                <button type="button" onClick={() => setLauncher(true)} className="ml-3 flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400 hover:text-white">
                    <Command className="h-3 w-3" /> Search <kbd className="text-[10px] text-slate-500">Ctrl K</kbd>
                </button>
                <div className="ml-auto flex items-center gap-2 text-[11px]">
                    {status === "error" && <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-red-200" title={error ?? ""}>Backend offline</span>}
                    {settings?.killSwitch && (
                        <span className="flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 font-semibold text-red-200">
                            <Power className="h-3 w-3" /> Frozen
                        </span>
                    )}
                    {!!stats?.pendingApprovals && (
                        <button type="button" onClick={() => open("governance")} className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-200">
                            <ShieldAlert className="h-3 w-3" /> {stats.pendingApprovals} approval{stats.pendingApprovals > 1 ? "s" : ""}
                        </button>
                    )}
                    {stats && (
                        <span className="text-slate-400">
                            <span className="text-cyan-300">{stats.runningTasks}</span> running · <span className="text-purple-300">{stats.reviewTasks}</span> review
                        </span>
                    )}
                    <span className="tabular-nums text-slate-300">{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <button type="button" onClick={close} className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white hover:bg-white/20">
                        <X className="h-3 w-3" /> {exitLabel}
                    </button>
                </div>
            </div>

            {/* Desktop icons */}
            <div className="absolute bottom-[96px] left-4 top-[52px] z-[5] flex flex-col flex-wrap content-start gap-1">
                {APPS.map((a) => (
                    <button key={a.id} type="button" onClick={() => open(a.id)} className="group flex w-20 flex-col items-center gap-1 rounded-xl p-2 text-center hover:bg-white/10" title={a.description}>
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 shadow-lg" style={{ background: `linear-gradient(145deg, ${a.color}55, ${a.color}18)` }}>
                            <a.icon className="h-5 w-5 text-white" />
                            {a.soon && <span className="absolute -right-1 -top-1 rounded bg-slate-800 px-1 text-[8px] font-bold text-slate-300">soon</span>}
                        </span>
                        <span className="text-[11px] font-medium leading-tight text-slate-200 drop-shadow">{a.name}</span>
                    </button>
                ))}
            </div>

            {/* Empty desktop hint */}
            {!wins.some((w) => !w.min) && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                    <Box className="h-12 w-12 text-indigo-300/50" />
                    <div className="text-xl font-semibold text-white/80">Agentic OS</div>
                    <div className="text-[13px] text-slate-400">Memory · Agent · Pulse · Screen — customize every agent in your office</div>
                    <div className="text-[11px] text-slate-500">Open an app from the dock, or press Ctrl K</div>
                </div>
            )}

            {/* Windows */}
            {wins.map((w) => (
                <OsWindow
                    key={w.app}
                    win={w}
                    focused={top?.app === w.app}
                    open={open}
                    onFocus={() => {
                        if (top?.app !== w.app) setWins((ws) => ws.map((x) => (x.app === w.app ? { ...x, z: ++zTop.current } : x)));
                    }}
                    onChange={(p) => setWins((ws) => ws.map((x) => (x.app === w.app ? { ...x, ...p } : x)))}
                    onClose={() => setWins((ws) => ws.filter((x) => x.app !== w.app))}
                />
            ))}

            {/* Dock */}
            <div className="absolute bottom-3 left-1/2 z-[2000] flex -translate-x-1/2 items-end gap-1.5 rounded-2xl border border-white/15 bg-white/[0.07] px-2.5 py-2 shadow-2xl backdrop-blur-2xl">
                {APPS.map((a) => {
                    const w = wins.find((x) => x.app === a.id);
                    const badge = a.id === "governance" ? stats?.pendingApprovals : a.id === "tasks" ? stats?.reviewTasks : 0;
                    return (
                        <button
                            key={a.id}
                            type="button"
                            title={a.name}
                            onClick={() => (w && !w.min && top?.app === a.id ? setWins((ws) => ws.map((x) => (x.app === a.id ? { ...x, min: true } : x))) : open(a.id))}
                            className="group relative flex flex-col items-center"
                        >
                            <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[11px] text-white opacity-0 transition group-hover:opacity-100">{a.name}</span>
                            <span
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 transition-all duration-200 group-hover:-translate-y-1.5 group-hover:scale-110"
                                style={{ background: `linear-gradient(145deg, ${a.color}66, ${a.color}1a)`, opacity: a.soon ? 0.6 : 1 }}
                            >
                                <a.icon className="h-5 w-5 text-white" />
                            </span>
                            {!!badge && <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[9px] font-bold text-white">{badge}</span>}
                            <span className={cx("mt-1 h-1 w-1 rounded-full", w ? "bg-white/80" : "bg-transparent")} />
                        </button>
                    );
                })}
            </div>

            {launcher && <Launcher onClose={() => setLauncher(false)} open={open} />}
            <Toasts />
        </div>
    );
}
