"use client";

import React, { useRef } from "react";
import {
    AppWindow,
    GripHorizontal,
    Maximize2,
    Minus,
    PanelLeft,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRight,
    PanelRightClose,
    PanelRightOpen,
} from "lucide-react";
import { type AdminPanelId, useAdminLayout } from "./useAdminLayoutStore";
import {
    MIN_PILL_H,
    MIN_PILL_W,
    OUTER_COLLAPSED_WIDTH,
    INNER_COLLAPSED_WIDTH,
    SNAP_EDGE_PX,
    cx,
} from "./adminLayoutConstants";

export function AdminSidePanel({
    id,
    title,
    summary,
    accent,
    collapsed,
    onToggleCollapsed,
    bodyRef,
    className,
    children,
}: {
    id: AdminPanelId;
    title: string;
    summary: string;
    accent: string;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    bodyRef: React.RefObject<HTMLDivElement | null>;
    className?: string;
    children: React.ReactNode;
}) {
    const panel = useAdminLayout((s) => s.panels[id]);
    const patchPanel = useAdminLayout((s) => s.patchPanel);
    const bringFront = useAdminLayout((s) => s.bringFront);
    const setDropEdge = useAdminLayout((s) => s.setDropEdge);

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

    const getBounds = () => {
        const el = bodyRef.current ?? (typeof document !== "undefined" ? (document.querySelector("[data-admin-body]") as HTMLElement | null) : null);
        const r = el?.getBoundingClientRect();
        return {
            left: r?.left ?? 0,
            top: r?.top ?? 36,
            width: r?.width ?? (typeof window !== "undefined" ? window.innerWidth : 1440),
            height: r?.height ?? (typeof window !== "undefined" ? window.innerHeight - 36 : 800),
        };
    };

    const resolveX = (w: number, bw: number) => {
        if (panel.x >= 0) return Math.max(8, Math.min(Math.max(8, bw - w - 8), panel.x));
        return id === "right" ? Math.min(Math.max(8, bw - w - 8), 288) : 16;
    };

    const switchToWindowed = () => {
        bringFront(id);
        if (panel.mode === "windowed") {
            patchPanel(id, { mode: panel.lastPin });
            return;
        }
        const b = getBounds();
        const w = Math.max(240, panel.w || 260);
        const x = panel.x >= 0 ? Math.max(12, Math.min(b.width - w - 12, panel.x)) : id === "right" ? Math.min(Math.max(12, b.width - w - 12), 288) : 20;
        const y = Math.max(10, Math.min(b.height - 260, panel.y || 14));
        patchPanel(id, { mode: "windowed", x, y, w });
    };

    const switchToMinimized = () => {
        bringFront(id);
        if (panel.mode === "minimized") {
            patchPanel(id, { mode: "windowed" });
            return;
        }
        const b = getBounds();
        const isPinned = panel.mode === "pinned-left" || panel.mode === "pinned-right";
        const x = isPinned
            ? panel.mode === "pinned-right"
                ? Math.max(12, b.width - MIN_PILL_W - 16)
                : id === "right"
                  ? Math.min(Math.max(12, b.width - MIN_PILL_W - 16), 16 + MIN_PILL_W + 8)
                  : 16
            : resolveX(MIN_PILL_W, b.width);
        const y = isPinned ? 12 : Math.max(8, Math.min(b.height - MIN_PILL_H - 16, panel.y));
        patchPanel(id, { mode: "minimized", x, y });
    };

    const onHeaderPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        bringFront(id);
        const b = getBounds();
        const isPinned = panel.mode === "pinned-left" || panel.mode === "pinned-right";
        const effW = panel.mode === "minimized" ? MIN_PILL_W : panel.w;
        const startX = isPinned
            ? panel.mode === "pinned-left"
                ? id === "right"
                    ? 272
                    : 12
                : Math.max(12, b.width - effW - 12)
            : resolveX(effW, b.width);
        const startY = isPinned ? 12 : panel.y;
        dragRef.current = {
            kind: "move",
            startX: e.clientX,
            startY: e.clientY,
            origX: startX,
            origY: startY,
            origW: panel.w,
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
        const b = getBounds();

        if (d.startedPinned) {
            if (Math.hypot(dx, dy) < 8) return;
            d.startedPinned = false;
            const newOrigX = Math.max(8, Math.min(b.width - d.origW - 8, Math.round(e.clientX - b.left - d.origW / 2)));
            d.origX = newOrigX;
            d.origY = 12;
            d.startX = e.clientX;
            d.startY = e.clientY;
            patchPanel(id, { mode: "windowed", x: newOrigX, y: 12 });
            return;
        }

        const effW = panel.mode === "minimized" ? MIN_PILL_W : panel.w;
        const nx = Math.max(6, Math.min(Math.max(6, b.width - effW - 6), Math.round(d.origX + dx)));
        const maxBottom = Math.max(MIN_PILL_H + 12, b.height - (panel.mode === "minimized" ? MIN_PILL_H + 16 : 56));
        const ny = Math.max(6, Math.min(maxBottom, Math.round(d.origY + dy)));

        const relX = e.clientX - b.left;
        const edge: "left" | "right" | null = relX <= SNAP_EDGE_PX ? "left" : relX >= b.width - SNAP_EDGE_PX ? "right" : null;
        if (edge !== d.currentEdge) {
            d.currentEdge = edge;
            setDropEdge(edge);
        }
        patchPanel(id, { x: nx, y: ny });
    };

    const onHeaderPointerUp = () => {
        const d = dragRef.current;
        if (!d) return;
        dragRef.current = null;
        setDropEdge(null);
        if (d.currentEdge === "left") {
            patchPanel(id, { mode: "pinned-left", lastPin: "pinned-left" });
        } else if (d.currentEdge === "right") {
            patchPanel(id, { mode: "pinned-right", lastPin: "pinned-right" });
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
        const b = getBounds();
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const nw = Math.max(220, Math.min(480, Math.round(d.origW + dx)));
        const nh = Math.max(240, Math.min(Math.max(260, b.height - panel.y - 16), Math.round(d.origH + dy)));
        patchPanel(id, { w: nw, h: nh });
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

    const isPinned = panel.mode === "pinned-left" || panel.mode === "pinned-right";
    const isCollapsedPinned = isPinned && collapsed;

    const headerControls = (
        <div className={cx("flex shrink-0 items-center gap-1", !isCollapsedPinned && "ml-auto")} onPointerDown={(e) => e.stopPropagation()}>
            {isPinned && (
                <button
                    type="button"
                    data-testid={`admin-panel-${id}-collapse`}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar to icon rail"}
                    onClick={onToggleCollapsed}
                    className={btnCls(collapsed)}
                >
                    {panel.mode === "pinned-left" ? (
                        collapsed ? <PanelLeftOpen className="h-2.5 w-2.5" /> : <PanelLeftClose className="h-2.5 w-2.5" />
                    ) : (
                        collapsed ? <PanelRightOpen className="h-2.5 w-2.5" /> : <PanelRightClose className="h-2.5 w-2.5" />
                    )}
                </button>
            )}
            {!isCollapsedPinned && (
                <>
                    <button
                        type="button"
                        data-testid={`admin-panel-${id}-pin-left`}
                        title="Pin to left side"
                        onClick={() => patchPanel(id, { mode: "pinned-left", lastPin: "pinned-left" })}
                        className={btnCls(panel.mode === "pinned-left")}
                    >
                        <PanelLeft className="h-2.5 w-2.5" />
                    </button>
                    <button
                        type="button"
                        data-testid={`admin-panel-${id}-pin-right`}
                        title="Pin to right side"
                        onClick={() => patchPanel(id, { mode: "pinned-right", lastPin: "pinned-right" })}
                        className={btnCls(panel.mode === "pinned-right")}
                    >
                        <PanelRight className="h-2.5 w-2.5" />
                    </button>
                    <button
                        type="button"
                        data-testid={`admin-panel-${id}-window`}
                        title={panel.mode === "windowed" ? "Dock back to side" : "Float as draggable window"}
                        onClick={switchToWindowed}
                        className={btnCls(panel.mode === "windowed")}
                    >
                        <AppWindow className="h-2.5 w-2.5" />
                    </button>
                    <button
                        type="button"
                        data-testid={`admin-panel-${id}-minimize`}
                        title={panel.mode === "minimized" ? "Restore window" : "Minimize to draggable bar"}
                        onClick={switchToMinimized}
                        className={btnCls(panel.mode === "minimized")}
                    >
                        {panel.mode === "minimized" ? <Maximize2 className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                    </button>
                </>
            )}
        </div>
    );

    if (panel.mode === "minimized") {
        const b = getBounds();
        const left = resolveX(MIN_PILL_W, b.width);
        return (
            <aside
                data-testid={`admin-panel-${id}`}
                data-mode="minimized"
                onPointerDown={() => bringFront(id)}
                className={cx(
                    "pointer-events-auto absolute flex items-center overflow-hidden border border-white/25 bg-[#0b0e13]/95 font-mono text-slate-100 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.92)] backdrop-blur-md",
                    className,
                )}
                style={{
                    left,
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
                    onDoubleClick={() => patchPanel(id, { mode: "windowed" })}
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
        const b = getBounds();
        const left = resolveX(panel.w, b.width);
        const maxH = Math.max(240, b.height - panel.y - 16);
        return (
            <aside
                data-testid={`admin-panel-${id}`}
                data-mode="windowed"
                onPointerDown={() => bringFront(id)}
                className={cx(
                    "pointer-events-auto absolute flex flex-col overflow-hidden border border-white/20 bg-[#0b0e13]/95 font-mono text-slate-100 shadow-[0_28px_70px_-15px_rgba(0,0,0,0.95)] backdrop-blur-md",
                    className,
                )}
                style={{
                    left,
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
                    onDoubleClick={() => patchPanel(id, { mode: panel.lastPin })}
                    title="Drag to move · Drop on left/right edge to pin · Double-click to dock"
                    className="flex h-8 shrink-0 cursor-grab select-none items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 active:cursor-grabbing"
                >
                    <GripHorizontal className="h-3 w-3 shrink-0 text-slate-500" />
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-white">{title}</span>
                    {headerControls}
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
                <div
                    data-testid={`admin-panel-${id}-resize`}
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

    const pinnedW = isCollapsedPinned ? (id === "left" ? OUTER_COLLAPSED_WIDTH : INNER_COLLAPSED_WIDTH) : panel.w;

    return (
        <aside
            data-testid={`admin-panel-${id}`}
            data-mode={panel.mode}
            className={cx(
                "pointer-events-auto relative z-20 flex h-full shrink-0 flex-col border-white/[0.08] bg-[#0b0e13]/95 font-mono text-slate-100 backdrop-blur-md transition-[width] duration-150",
                panel.mode === "pinned-left" ? "order-1 border-r" : "order-3 border-l",
                isCollapsedPinned && "ant-layout-sider-collapsed",
                className,
            )}
            style={{ width: pinnedW }}
        >
            <div
                onPointerDown={onHeaderPointerDown}
                onPointerMove={onHeaderPointerMove}
                onPointerUp={onHeaderPointerUp}
                onDoubleClick={switchToWindowed}
                title="Drag to undock into floating window · Double-click to float"
                className={cx(
                    "flex h-7 shrink-0 cursor-grab select-none items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.015] active:cursor-grabbing",
                    isCollapsedPinned ? "justify-center px-1" : "px-3",
                )}
            >
                {!isCollapsedPinned && (
                    <>
                        <GripHorizontal className="h-3 w-3 shrink-0 text-slate-600" />
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                        <span className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</span>
                    </>
                )}
                {headerControls}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </aside>
    );
}
