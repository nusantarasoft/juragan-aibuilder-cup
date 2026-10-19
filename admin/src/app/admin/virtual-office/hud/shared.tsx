"use client";

import React, { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { AppWindow, Bot, Check, GripHorizontal, Maximize2, Minus, PanelLeft, PanelRight, X } from "lucide-react";
import { STATUS_META } from "../lib/floorplan";
import { getModuleInfo, MODULES, stepIndex, type ModuleId } from "../lib/modules";
import type { Agent, AgentStatus, AgentTask } from "../lib/types";

export const ORANGE = "#fb923c";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const GLASS =
    "border border-white/15 bg-[#0b0e13]/95 text-slate-100 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.92)] backdrop-blur-md";

export const SCROLL_Y =
    "overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb:hover]:bg-white/25";

export function Section({
    title,
    right,
    children,
    className,
}: {
    title: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cx("border-b border-white/[0.07] px-3.5 pb-3 pt-2 font-mono", className)}>
            <div className="sticky top-0 z-[1] -mx-3.5 mb-1.5 flex items-center justify-between gap-2 bg-[#0b0e13]/95 px-3.5 py-1 backdrop-blur-sm">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h3>
                {right}
            </div>
            {children}
        </section>
    );
}

export function ModuleChip({ moduleId, onClick, className }: { moduleId: ModuleId; onClick?: () => void; className?: string }) {
    const m = getModuleInfo(moduleId);
    const Tag = onClick ? "button" : "span";
    return (
        <Tag
            {...(onClick ? { type: "button" as const, onClick } : {})}
            className={cx(
                "inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                onClick && "cursor-pointer transition hover:brightness-125",
                className,
            )}
            style={{ background: `${m.color}18`, color: m.color, borderColor: `${m.color}4d` }}
            title={onClick ? `Open ${m.name}` : m.route}
        >
            <span className="h-1.5 w-1.5" style={{ background: m.color }} />
            {m.name}
        </Tag>
    );
}

/** Checklist of the scripted steps an agent performs inside a module. */
export function StepList({ task, status, dense }: { task: AgentTask; status: AgentStatus; dense?: boolean }) {
    const current = stepIndex(task.progress, task.steps.length);
    const color = getModuleInfo(task.moduleId).color;
    const running = status === "working" || status === "thinking";
    return (
        <ol className={cx("space-y-1 font-mono", dense && "space-y-0.5")}>
            {task.steps.map((step, i) => {
                const done = i < current;
                const now = i === current;
                return (
                    <li key={step} className="flex items-center gap-2">
                        <span
                            className={cx(
                                "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[8px]",
                                done ? "border-transparent" : now ? "border-transparent" : "border-white/20",
                            )}
                            style={done ? { background: `${color}40` } : now ? { background: color } : undefined}
                        >
                            {done && <Check className="h-2.5 w-2.5" style={{ color }} />}
                            {now && running && <span className="absolute inset-0 animate-ping opacity-50" style={{ background: color }} />}
                        </span>
                        <span
                            className={cx(
                                "text-[11px] leading-snug",
                                done ? "text-slate-500 line-through decoration-slate-600" : now ? "font-semibold text-white" : "text-slate-400",
                            )}
                        >
                            {step}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

export function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

export function formatTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
}

export function relativeTime(ts: number, now: number) {
    const s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.round(m / 60)}h ago`;
}

export function elapsed(ts: number, now: number) {
    const s = Math.max(0, Math.round((now - ts) / 1000));
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function AgentBadge({ agent, size = 34 }: { agent: Agent; size?: number }) {
    const color = STATUS_META[agent.status].color;
    return (
        <div className="relative shrink-0 font-mono" style={{ width: size, height: size }}>
            <div
                className="flex h-full w-full items-center justify-center border"
                style={{
                    background: `${agent.color}1e`,
                    borderColor: `${agent.color}77`,
                }}
            >
                <Bot style={{ color: agent.status === "offline" ? "#64748b" : agent.color, width: size * 0.5, height: size * 0.5 }} />
            </div>
            <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0b0e13]"
                style={{ background: color }}
            />
        </div>
    );
}

export function StatusPill({ status, className }: { status: AgentStatus; className?: string }) {
    const meta = STATUS_META[status];
    return (
        <span
            className={cx("inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider", className)}
            style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}4d` }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
        </span>
    );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="h-1 w-full overflow-hidden bg-white/10">
            <div
                className="h-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(value * 100)}%`, background: color }}
            />
        </div>
    );
}

export function IconButton({
    onClick,
    active,
    title,
    children,
    disabled,
    className,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            className={cx(
                "flex h-[22px] w-[22px] items-center justify-center border transition",
                active
                    ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                    : "border-white/15 text-slate-300 hover:border-white/35 hover:text-white",
                disabled && "cursor-not-allowed opacity-35 hover:border-white/15",
                className,
            )}
        >
            {children}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Dockable / Windowed / Minimized Side Panel for Virtual Office       */
/* ------------------------------------------------------------------ */

export type OfficePanelId = "left" | "right";
export type OfficePanelMode = "pinned-left" | "pinned-right" | "windowed" | "minimized";

export interface OfficePanelState {
    mode: OfficePanelMode;
    lastPin: "pinned-left" | "pinned-right";
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
}

const MIN_PILL_W = 284;
const MIN_PILL_H = 34;
const SNAP_EDGE_PX = 56;

export const DEFAULT_VO_PANELS: Record<OfficePanelId, OfficePanelState> = {
    left: { mode: "pinned-left", lastPin: "pinned-left", x: 16, y: 12, w: 300, h: 560, z: 30 },
    right: { mode: "pinned-right", lastPin: "pinned-right", x: -1, y: 12, w: 320, h: 560, z: 31 },
};

interface VoLayoutState {
    panels: Record<OfficePanelId, OfficePanelState>;
    dropEdge: "left" | "right" | null;
    focus: boolean;
    patchPanel: (id: OfficePanelId, p: Partial<OfficePanelState>) => void;
    bringFront: (id: OfficePanelId) => void;
    setDropEdge: (edge: "left" | "right" | null) => void;
    toggleFocus: () => void;
    resetLayout: () => void;
}

export const useVoLayout = create<VoLayoutState>((set, get) => ({
    panels: {
        left: { ...DEFAULT_VO_PANELS.left },
        right: { ...DEFAULT_VO_PANELS.right },
    },
    dropEdge: null,
    focus: false,
    patchPanel: (id, p) => {
        set((s) => {
            const cur = s.panels[id];
            const nextMode = p.mode ?? cur.mode;
            const lastPin = nextMode === "pinned-left" || nextMode === "pinned-right" ? nextMode : p.lastPin ?? cur.lastPin;
            return {
                panels: {
                    ...s.panels,
                    [id]: { ...cur, ...p, lastPin },
                },
            };
        });
    },
    bringFront: (id) => {
        const s = get();
        const topZ = Math.max(s.panels.left.z, s.panels.right.z);
        if (s.panels[id].z <= topZ) {
            set({
                panels: {
                    ...s.panels,
                    [id]: { ...s.panels[id], z: topZ + 1 },
                },
            });
        }
    },
    setDropEdge: (dropEdge) => set({ dropEdge }),
    toggleFocus: () => set((s) => ({ focus: !s.focus })),
    resetLayout: () =>
        set({
            panels: {
                left: { ...DEFAULT_VO_PANELS.left },
                right: { ...DEFAULT_VO_PANELS.right },
            },
            dropEdge: null,
            focus: false,
        }),
}));

export function OfficeSidePanel({
    id,
    title,
    summary,
    accent,
    defaultSide,
    defaultW = 300,
    onClose,
    children,
}: {
    id: OfficePanelId;
    title: string;
    summary: string;
    accent: string;
    defaultSide: "pinned-left" | "pinned-right";
    defaultW?: number;
    onClose?: () => void;
    children: React.ReactNode;
}) {
    const panel = useVoLayout((s) => s.panels[id]);
    const patchPanel = useVoLayout((s) => s.patchPanel);
    const bringFront = useVoLayout((s) => s.bringFront);
    const setDropEdge = useVoLayout((s) => s.setDropEdge);
    const asideRef = useRef<HTMLElement | null>(null);

    const dragRef = useRef<{
        kind: "move" | "resize";
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origW: number;
        origH: number;
        startedPinned: boolean;
        currentEdge: "left" | "right" | null;
    } | null>(null);

    const getBodyBounds = () => {
        const bodyEl = asideRef.current?.closest("[data-vo-body]") as HTMLElement | null;
        const r = bodyEl?.getBoundingClientRect();
        return {
            left: r?.left ?? 0,
            top: r?.top ?? 36,
            width: r?.width ?? (typeof window !== "undefined" ? window.innerWidth : 1600),
            height: r?.height ?? (typeof window !== "undefined" ? window.innerHeight - 36 : 900),
        };
    };

    const resolveX = (w: number, bw?: number) => {
        const width = bw ?? getBodyBounds().width;
        if (panel.x >= 0) return Math.max(8, Math.min(Math.max(8, width - w - 8), panel.x));
        return defaultSide === "pinned-right" ? Math.max(8, width - w - 16) : 16;
    };

    const currentPinnedOffset = (targetW: number) => {
        const b = getBodyBounds();
        const ar = asideRef.current?.getBoundingClientRect();
        if (ar) {
            return Math.max(12, Math.min(Math.max(12, b.width - targetW - 12), Math.round(ar.left - b.left + 8)));
        }
        return panel.mode === "pinned-right" ? Math.max(12, b.width - targetW - 16) : 16;
    };

    const patch = (p: Partial<OfficePanelState>) => patchPanel(id, p);

    const switchToWindowed = () => {
        bringFront(id);
        if (panel.mode === "windowed") {
            patch({ mode: panel.lastPin });
            return;
        }
        const b = getBodyBounds();
        const isPinned = panel.mode === "pinned-left" || panel.mode === "pinned-right";
        const w = Math.max(260, panel.w || defaultW);
        const x = isPinned ? currentPinnedOffset(w) : resolveX(w, b.width);
        const y = Math.max(8, Math.min(b.height - 260, panel.y || 12));
        patch({ mode: "windowed", x, y, w });
    };

    const switchToMinimized = () => {
        bringFront(id);
        if (panel.mode === "minimized") {
            patch({ mode: "windowed" });
            return;
        }
        const b = getBodyBounds();
        const isPinned = panel.mode === "pinned-left" || panel.mode === "pinned-right";
        const x = isPinned ? currentPinnedOffset(MIN_PILL_W) : resolveX(MIN_PILL_W, b.width);
        const y = isPinned ? 10 : Math.max(8, Math.min(b.height - MIN_PILL_H - 12, panel.y));
        patch({ mode: "minimized", x, y });
    };

    const onHeaderPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        bringFront(id);
        const b = getBodyBounds();
        const isPinned = panel.mode === "pinned-left" || panel.mode === "pinned-right";
        const effW = panel.mode === "minimized" ? MIN_PILL_W : panel.w;
        const startX = isPinned ? currentPinnedOffset(effW) : resolveX(effW, b.width);
        const startY = isPinned ? 10 : panel.y;
        dragRef.current = {
            kind: "move",
            startX: e.clientX,
            startY: e.clientY,
            origX: startX,
            origY: startY,
            origW: panel.w || defaultW,
            origH: panel.h,
            startedPinned: isPinned,
            currentEdge: null,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onHeaderPointerMove = (e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d || d.kind !== "move") return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const b = getBodyBounds();

        if (d.startedPinned) {
            if (Math.hypot(dx, dy) < 8) return;
            d.startedPinned = false;
            const newOrigX = Math.max(8, Math.min(b.width - d.origW - 8, Math.round(e.clientX - b.left - d.origW / 2)));
            d.origX = newOrigX;
            d.origY = 10;
            d.startX = e.clientX;
            d.startY = e.clientY;
            patch({ mode: "windowed", x: newOrigX, y: 10 });
            return;
        }

        const effW = panel.mode === "minimized" ? MIN_PILL_W : panel.w;
        const nx = Math.max(6, Math.min(Math.max(6, b.width - effW - 6), Math.round(d.origX + dx)));
        const ny = Math.max(6, Math.min(b.height - 48, Math.round(d.origY + dy)));

        const relX = e.clientX - b.left;
        const edge: "left" | "right" | null = relX <= SNAP_EDGE_PX ? "left" : relX >= b.width - SNAP_EDGE_PX ? "right" : null;
        if (edge !== d.currentEdge) {
            d.currentEdge = edge;
            setDropEdge(edge);
        }
        patch({ x: nx, y: ny });
    };

    const onHeaderPointerUp = () => {
        const d = dragRef.current;
        if (!d) return;
        dragRef.current = null;
        setDropEdge(null);
        if (d.currentEdge === "left") {
            patch({ mode: "pinned-left", lastPin: "pinned-left" });
        } else if (d.currentEdge === "right") {
            patch({ mode: "pinned-right", lastPin: "pinned-right" });
        }
    };

    const onResizePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        bringFront(id);
        dragRef.current = {
            kind: "resize",
            startX: e.clientX,
            startY: e.clientY,
            origX: panel.x,
            origY: panel.y,
            origW: panel.w,
            origH: panel.h,
            startedPinned: false,
            currentEdge: null,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onResizePointerMove = (e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d || d.kind !== "resize") return;
        const b = getBodyBounds();
        const nw = Math.max(250, Math.min(520, Math.round(d.origW + (e.clientX - d.startX))));
        const nh = Math.max(240, Math.min(b.height - panel.y - 16, Math.round(d.origH + (e.clientY - d.startY))));
        patch({ w: nw, h: nh });
    };

    const onResizePointerUp = () => {
        dragRef.current = null;
    };

    const btnCls = (active: boolean) =>
        cx(
            "flex h-[18px] w-[18px] items-center justify-center border transition",
            active
                ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                : "border-white/15 text-slate-400 hover:border-white/40 hover:text-white",
        );

    const headerControls = (
        <div className="ml-auto flex shrink-0 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            <button
                type="button"
                data-testid={`vo-panel-${id}-pin-left`}
                title="Pin to left side"
                onClick={() => patch({ mode: "pinned-left", lastPin: "pinned-left" })}
                className={btnCls(panel.mode === "pinned-left")}
            >
                <PanelLeft className="h-2.5 w-2.5" />
            </button>
            <button
                type="button"
                data-testid={`vo-panel-${id}-pin-right`}
                title="Pin to right side"
                onClick={() => patch({ mode: "pinned-right", lastPin: "pinned-right" })}
                className={btnCls(panel.mode === "pinned-right")}
            >
                <PanelRight className="h-2.5 w-2.5" />
            </button>
            <button
                type="button"
                data-testid={`vo-panel-${id}-window`}
                title={panel.mode === "windowed" ? "Dock back to side" : "Float as draggable window"}
                onClick={switchToWindowed}
                className={btnCls(panel.mode === "windowed")}
            >
                <AppWindow className="h-2.5 w-2.5" />
            </button>
            <button
                type="button"
                data-testid={`vo-panel-${id}-minimize`}
                title={panel.mode === "minimized" ? "Restore window" : "Minimize to draggable bar"}
                onClick={switchToMinimized}
                className={btnCls(panel.mode === "minimized")}
            >
                {panel.mode === "minimized" ? <Maximize2 className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
            </button>
            {onClose && (
                <button type="button" title="Close" onClick={onClose} className={cx(btnCls(false), "hover:border-red-400/60 hover:text-red-300")}>
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    );

    if (panel.mode === "minimized") {
        const b = getBodyBounds();
        return (
            <aside
                ref={asideRef}
                data-testid={`vo-panel-${id}`}
                data-mode="minimized"
                onPointerDown={() => bringFront(id)}
                className="pointer-events-auto absolute flex items-center overflow-hidden border border-white/25 bg-[#0b0e13]/95 font-mono shadow-[0_20px_50px_-10px_rgba(0,0,0,0.92)] backdrop-blur-md"
                style={{
                    left: resolveX(MIN_PILL_W, b.width),
                    top: panel.y,
                    width: MIN_PILL_W,
                    height: MIN_PILL_H,
                    zIndex: panel.z,
                    borderLeftColor: accent,
                    borderLeftWidth: 2,
                }}
            >
                <div
                    onPointerDown={onHeaderPointerDown}
                    onPointerMove={onHeaderPointerMove}
                    onPointerUp={onHeaderPointerUp}
                    onDoubleClick={() => patch({ mode: "windowed" })}
                    title="Drag to move or drop on left/right edge to pin · Double-click to expand"
                    className="flex h-full w-full cursor-grab select-none items-center gap-1.5 px-2.5 active:cursor-grabbing"
                >
                    <GripHorizontal className="h-3 w-3 shrink-0 text-slate-500" />
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white">{title}</span>
                    <span className="min-w-0 flex-1 truncate text-[9px] text-slate-400">· {summary}</span>
                    {headerControls}
                </div>
            </aside>
        );
    }

    if (panel.mode === "windowed") {
        const b = getBodyBounds();
        const maxH = Math.max(240, b.height - panel.y - 12);
        return (
            <aside
                ref={asideRef}
                data-testid={`vo-panel-${id}`}
                data-mode="windowed"
                onPointerDown={() => bringFront(id)}
                className="pointer-events-auto absolute flex flex-col overflow-hidden border border-white/20 bg-[#0b0e13]/95 font-mono shadow-[0_28px_70px_-15px_rgba(0,0,0,0.95)] backdrop-blur-md"
                style={{
                    left: resolveX(panel.w, b.width),
                    top: panel.y,
                    width: panel.w,
                    height: Math.min(panel.h, maxH),
                    zIndex: panel.z,
                    borderTopColor: accent,
                    borderTopWidth: 2,
                }}
            >
                <div
                    onPointerDown={onHeaderPointerDown}
                    onPointerMove={onHeaderPointerMove}
                    onPointerUp={onHeaderPointerUp}
                    onDoubleClick={() => patch({ mode: panel.lastPin })}
                    title="Drag to move · Drop on left/right edge to pin · Double-click to dock"
                    className="flex h-7 shrink-0 cursor-grab select-none items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-3 active:cursor-grabbing"
                >
                    <GripHorizontal className="h-3 w-3 shrink-0 text-slate-500" />
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <span className="truncate text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white">{title}</span>
                    {headerControls}
                </div>
                <div className={cx("flex min-h-0 flex-1 flex-col [scrollbar-gutter:stable]", SCROLL_Y)}>{children}</div>
                <div
                    data-testid={`vo-panel-${id}-resize`}
                    onPointerDown={onResizePointerDown}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                    title="Drag to resize window"
                    className="absolute bottom-0 right-0 z-[5] h-3.5 w-3.5 cursor-se-resize"
                    style={{ background: `linear-gradient(135deg, transparent 50%, ${accent}88 50%)` }}
                />
            </aside>
        );
    }

    const pinnedLeft = panel.mode === "pinned-left";
    return (
        <aside
            ref={asideRef}
            data-testid={`vo-panel-${id}`}
            data-mode={panel.mode}
            className={cx(
                "pointer-events-auto relative z-20 flex h-full shrink-0 flex-col border-white/[0.08] bg-[#0b0e13]/95 font-mono backdrop-blur-md",
                pinnedLeft ? "order-1 border-r" : "order-3 border-l",
            )}
            style={{ width: defaultW }}
        >
            <div
                onPointerDown={onHeaderPointerDown}
                onPointerMove={onHeaderPointerMove}
                onPointerUp={onHeaderPointerUp}
                onDoubleClick={switchToWindowed}
                title="Drag to undock into floating window · Double-click to float"
                className="flex h-7 shrink-0 cursor-grab select-none items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.015] px-3 active:cursor-grabbing"
            >
                <GripHorizontal className="h-3 w-3 shrink-0 text-slate-600" />
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                <span className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</span>
                {headerControls}
            </div>
            <div className={cx("flex min-h-0 flex-1 flex-col [scrollbar-gutter:stable]", SCROLL_Y)}>{children}</div>
        </aside>
    );
}
