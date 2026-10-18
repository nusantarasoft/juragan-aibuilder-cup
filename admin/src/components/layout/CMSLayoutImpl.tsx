"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { create } from "zustand";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
    AppWindow,
    BarChart3,
    Bot,
    Box,
    Calculator,
    CheckSquare,
    CloudSun,
    Compass,
    Cpu,
    ExternalLink,
    FileText,
    FolderOpen,
    Gamepad2,
    GripHorizontal,
    Hexagon,
    Maximize2,
    MessageSquare,
    Minus,
    Music,
    PanelLeft,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRight,
    PanelRightClose,
    PanelRightOpen,
    Plus,
    Search,
    Settings,
    Terminal,
    Trophy,
    X,
} from "lucide-react";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import FloatingOrbMenu from "../dock/FloatingOrbMenu";
import {
    LogoutOutlined,
    SearchOutlined,
    SettingOutlined,
    HomeOutlined,
    FileTextOutlined,
    PushpinOutlined,
    StarOutlined,
    HistoryOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    FileAddOutlined,
    AppstoreOutlined,
    DeleteOutlined,
    ShareAltOutlined,
    CopyOutlined,
    SwapOutlined,
    UserOutlined,
    DashboardOutlined,
    SafetyCertificateOutlined,
    CodeSandboxOutlined,
} from "@ant-design/icons";
import {
    PageContainer,
    ProCard,
    ProConfigProvider,
} from "@ant-design/pro-components";
import {
    ConfigProvider,
    Dropdown,
    Input,
    Menu,
    theme,
    Popover,
    Avatar,
    Typography,
    Button,
    Tooltip,
    message,
    Popconfirm,
    Divider,
    Segmented,
} from "antd";
import type { MenuProps } from "antd";
import AIStudioDrawer from "./AIStudioDrawer";
import AgentSessionOverlay from "@/components/agent-session/AgentSessionOverlay";
import CommandPalette from "../common/CommandPalette";
import ThemeDrawer from "./ThemeDrawer";
import { useRouter, usePathname } from "next/navigation";
import menuConfig from "@/config/menuConfig";
import { usePreferencesStore, hexToRgb } from "@/store/usePreferencesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { filterMenuTreeForAppRole } from "@/lib/tenantOwnerMenu";
import NotificationBell from "@/components/common/NotificationBell";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import LiveCursors from "@/components/common/LiveCursors";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useDockStore } from "@/store/useDockStore";
import ModuleIllustrationCards from "./ModuleIllustrationCards";
import OnlineUsersAvatars, { SIDER_FOOTER_ROW_HEIGHT } from "./OnlineUsersAvatars";
import { MacWaveDock } from "../dock/MacWaveDock";
import { getVOTheme, type VOTheme } from "./voTheme";
import { TamagotchiGlobal } from "../helper/TamagotchiGlobal";
import DockWindow from "@/components/dock/DockWindow";
import AthanWidget from "@/components/dock/widgets/AthanWidget";
import CalculatorWidget from "@/components/dock/widgets/CalculatorWidget";
import NotesWidget from "@/components/dock/widgets/NotesWidget";
import CalendarWidget from "@/components/dock/widgets/CalendarWidget";
import SnakeWidget from "@/components/dock/widgets/SnakeWidget";
import PongWidget from "@/components/dock/widgets/PongWidget";

const { Text } = Typography;

const ORANGE = "#fb923c";
const SKY = "#38bdf8";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const SCROLL_Y =
    "overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb:hover]:bg-white/25";

/* ------------------------------------------------------------------ */
/* Agentic OS Dockable / Windowed / Minimized Side Panels for Admin    */
/* ------------------------------------------------------------------ */

export type AdminPanelId = "left" | "right";
export type AdminPanelMode = "pinned-left" | "pinned-right" | "windowed" | "minimized";

export interface AdminPanelState {
    mode: AdminPanelMode;
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
const OUTER_COLLAPSED_WIDTH = 64;
const INNER_COLLAPSED_WIDTH = 68;

export const DEFAULT_ADMIN_PANELS: Record<AdminPanelId, AdminPanelState> = {
    left: { mode: "pinned-left", lastPin: "pinned-left", x: 16, y: 12, w: 260, h: 600, z: 40 },
    right: { mode: "pinned-left", lastPin: "pinned-left", x: 288, y: 12, w: 248, h: 600, z: 41 },
};

function readInitialDarkMode(): boolean {
    if (typeof window === "undefined") return true;
    try {
        if (!localStorage.getItem("ns.admin.aosDarkInit.v1")) {
            localStorage.setItem("ns.admin.aosDarkInit.v1", "1");
            localStorage.setItem("cms-dark-mode", "true");
            document.documentElement.classList.add("dark");
            return true;
        }
        const saved = localStorage.getItem("cms-dark-mode");
        const isDark = saved === null ? true : saved === "true";
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        return isDark;
    } catch {
        return true;
    }
}

interface AdminLayoutState {
    panels: Record<AdminPanelId, AdminPanelState>;
    dropEdge: "left" | "right" | null;
    focus: boolean;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
    patchPanel: (id: AdminPanelId, p: Partial<AdminPanelState>) => void;
    bringFront: (id: AdminPanelId) => void;
    setDropEdge: (edge: "left" | "right" | null) => void;
    toggleFocus: () => void;
    resetLayout: () => void;
}

export const useAdminLayout = create<AdminLayoutState>((set, get) => ({
    panels: {
        left: { ...DEFAULT_ADMIN_PANELS.left },
        right: { ...DEFAULT_ADMIN_PANELS.right },
    },
    dropEdge: null,
    focus: false,
    darkMode: readInitialDarkMode(),
    setDarkMode: (darkMode) => set({ darkMode }),
    patchPanel: (id, p) =>
        set((s) => {
            const cur = s.panels[id];
            const nextMode = p.mode ?? cur.mode;
            const lastPin =
                nextMode === "pinned-left" || nextMode === "pinned-right"
                    ? nextMode
                    : p.lastPin ?? cur.lastPin;
            return {
                panels: {
                    ...s.panels,
                    [id]: { ...cur, ...p, lastPin },
                },
            };
        }),
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
                left: { ...DEFAULT_ADMIN_PANELS.left },
                right: { ...DEFAULT_ADMIN_PANELS.right },
            },
            dropEdge: null,
            focus: false,
        }),
}));

function AdminSidePanel({
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

/* ------------------------------------------------------------------ */
/* Docks & Menu Helpers                                                */
/* ------------------------------------------------------------------ */

const LEFT_DOCK_WIDGETS = [
    {
        id: "notes",
        label: "Notes",
        code: "NT",
        group: "capture",
        color: "#fb923c",
        icon: <FileText className="h-4 w-4" />,
        width: 400,
        height: 480,
    },
    {
        id: "tasks",
        label: "Tasks",
        code: "TK",
        group: "capture",
        color: "#10b981",
        icon: <CheckSquare className="h-4 w-4" />,
        width: 380,
        height: 460,
    },
    {
        id: "files",
        label: "Files",
        code: "FL",
        group: "workspace",
        color: "#38bdf8",
        icon: <FolderOpen className="h-4 w-4" />,
        width: 480,
        height: 420,
    },
    {
        id: "messages",
        label: "Messages",
        code: "MG",
        group: "workspace",
        color: "#a855f7",
        icon: <MessageSquare className="h-4 w-4" />,
        width: 420,
        height: 500,
    },
] as const;

const BOTTOM_DOCK_WIDGETS = [
    {
        id: "analytics",
        label: "Analytics",
        code: "AN",
        group: "telemetry",
        color: "#38bdf8",
        icon: <BarChart3 className="h-4 w-4" />,
        width: 560,
        height: 400,
    },
    {
        id: "calculator",
        label: "Calculator",
        code: "CL",
        group: "telemetry",
        color: "#fb923c",
        icon: <Calculator className="h-4 w-4" />,
        width: 320,
        height: 480,
    },
    {
        id: "terminal",
        label: "Terminal",
        code: "TM",
        group: "ops",
        color: "#10b981",
        icon: <Terminal className="h-4 w-4" />,
        width: 580,
        height: 400,
    },
    {
        id: "robot",
        label: "AI Assistant",
        code: "AI",
        group: "ops",
        color: "#a855f7",
        icon: <Bot className="h-4 w-4" />,
        width: 420,
        height: 540,
    },
    {
        id: "snake",
        label: "Snake",
        code: "SN",
        group: "arcade",
        color: "#22c55e",
        icon: <Gamepad2 className="h-4 w-4" />,
        width: 450,
        height: 600,
    },
    {
        id: "pong",
        label: "Pong",
        code: "PG",
        group: "arcade",
        color: "#ec4899",
        icon: <Trophy className="h-4 w-4" />,
        width: 450,
        height: 500,
    },
    {
        id: "athan",
        label: "Athan",
        code: "AT",
        group: "utilities",
        color: "#f59e0b",
        icon: <Compass className="h-4 w-4" />,
        width: 350,
        height: 450,
    },
    {
        id: "weather",
        label: "Weather",
        code: "WX",
        group: "utilities",
        color: "#38bdf8",
        icon: <CloudSun className="h-4 w-4" />,
        width: 360,
        height: 360,
    },
    {
        id: "music",
        label: "Music",
        code: "MU",
        group: "utilities",
        color: "#ec4899",
        icon: <Music className="h-4 w-4" />,
        width: 360,
        height: 420,
    },
    {
        id: "settings",
        label: "Settings",
        code: "CF",
        group: "sys",
        color: "#94a3b8",
        icon: <Settings className="h-4 w-4" />,
        width: 480,
        height: 460,
    },
    {
        id: "add-widget",
        label: "Launcher",
        code: "OS",
        group: "sys",
        color: "#fb923c",
        icon: <Plus className="h-4 w-4" />,
        width: 420,
        height: 360,
    },
] as const;

const ALL_DOCK_META: Record<string, { color: string; code: string; route?: string; desc: string }> = {
    notes: { color: "#fb923c", code: "NT", route: "/admin/pm/knowledge-base", desc: "Persistent scratchpad & operator notes" },
    tasks: { color: "#10b981", code: "TK", route: "/admin/pm/my-work", desc: "Tactical task queue & sprint checklist" },
    files: { color: "#38bdf8", code: "FL", route: "/admin/media", desc: "Media vault & workspace asset browser" },
    messages: { color: "#a855f7", code: "MG", route: "/admin/messaging", desc: "Realtime channels & operator dispatch" },
    analytics: { color: "#38bdf8", code: "AN", route: "/admin/analytics", desc: "Live telemetry & KPI stream" },
    calculator: { color: "#fb923c", code: "CL", desc: "Precision numeric evaluator" },
    terminal: { color: "#10b981", code: "TM", route: "/admin/sql-runner", desc: "Command shell & SQL runner" },
    robot: { color: "#a855f7", code: "AI", route: "/admin/agentic-os", desc: "Autonomous agent assistant" },
    snake: { color: "#22c55e", code: "SN", desc: "Grid arcade simulation" },
    pong: { color: "#ec4899", code: "PG", desc: "Vector paddle simulation" },
    athan: { color: "#f59e0b", code: "AT", desc: "Prayer schedule & Qibla telemetry" },
    weather: { color: "#38bdf8", code: "WX", desc: "Atmospheric & region conditions" },
    music: { color: "#ec4899", code: "MU", desc: "Ambient focus synthesizer" },
    settings: { color: "#94a3b8", code: "CF", route: "/admin/settings/general", desc: "System configuration & preferences" },
    "add-widget": { color: "#fb923c", code: "OS", route: "/admin/virtual-office", desc: "Quick module & surface launcher" },
};

const appList = [
    {
        key: "cms",
        icon: "https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg",
        title: "Nusantarasoft CMS",
        desc: "Content Management System",
        url: "/admin/dashboard",
    },
    {
        key: "aos",
        icon: "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
        title: "Agentic OS",
        desc: "Mission-Control AI OS",
        url: "/admin/agentic-os",
    },
    {
        key: "vo",
        icon: "https://gw.alipayobjects.com/zos/bmw-prod/d3e3eb39-1cd7-4aa5-827c-877deced6b7e/kvx8snxc_w283_h280.png",
        title: "Virtual Office",
        desc: "3D AI Agent HQ",
        url: "/admin/virtual-office",
    },
    {
        key: "landing",
        icon: "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
        title: "Landing Page",
        desc: "Public Website",
        url: "/",
    },
    {
        key: "brochure-gallery",
        icon: "https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg",
        title: "Brochure Vault",
        desc: "Tenant Brochure Gallery (:3004)",
        url: "http://localhost:3004",
    },
];

const findMenuItemByPath = (routes: any[], path: string): any => {
    for (const route of routes) {
        if (route.path === path) return route;
        if (route.routes) {
            const found = findMenuItemByPath(route.routes, path);
            if (found) return found;
        }
    }
    return null;
};

const getInnerMenuRoutes = (segment: string, pinned: any[], starred: any[]) => {
    const normalizePath = (p: string) => p.replace(/\/$/, "");

    const resolveIcon = (path: string, fallback: React.ReactNode) => {
        if (!menuConfig?.route?.routes) return fallback;
        const normalizedTarget = normalizePath(path);

        const findIconByNormalizedPath = (routes: any[], target: string): React.ReactNode | null => {
            for (const route of routes) {
                if (normalizePath(route.path) === target) return route.icon;
                if (route.routes) {
                    const icon = findIconByNormalizedPath(route.routes, target);
                    if (icon) return icon;
                }
            }
            return null;
        };

        return findIconByNormalizedPath(menuConfig.route.routes, normalizedTarget) || fallback;
    };

    switch (segment) {
        case "new":
            return [{ path: "/admin/pages/builder", name: "Create New Page", icon: <PlusOutlined /> }];
        case "recent":
            return [
                { path: "/admin/pages/list", name: "Homepage", icon: <FileTextOutlined /> },
                { path: "/admin/pages/builder", name: "About Us", icon: <FileTextOutlined /> },
                { path: "/admin/blocks/templates", name: "Contact Page", icon: <FileTextOutlined /> },
            ];
        case "newfile":
            return [
                { path: "/admin/pages/builder", name: "New Page", icon: <FileAddOutlined /> },
                { path: "/admin/blocks/content", name: "New Block", icon: <FileAddOutlined /> },
            ];
        case "pinned":
            return pinned.map((item) => ({
                path: item.path,
                name: typeof item.name === "string" ? item.name : "Untitled Item",
                icon: resolveIcon(item.path, <PushpinOutlined />),
            }));
        case "starred":
            return starred.map((item) => ({
                path: item.path,
                name: typeof item.name === "string" ? item.name : "Untitled Item",
                icon: resolveIcon(item.path, <StarOutlined />),
            }));
        case "history":
            return [
                { path: "/admin/pages/list", name: "Edited Homepage", icon: <HistoryOutlined /> },
                { path: "/admin/blocks/content", name: "Updated Banner", icon: <HistoryOutlined /> },
                { path: "/admin/media", name: "Uploaded Image", icon: <HistoryOutlined /> },
            ];
        default:
            return [];
    }
};

interface CMSLayoutProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    subTitle?: React.ReactNode;
    extra?: React.ReactNode[];
    breadcrumb?: { title: string; path?: string }[];
}

const BREADCRUMB_LABELS: Record<string, string> = {
    "ai-studio": "AI Studio",
    "agentic-os": "Agentic OS",
    "virtual-office": "Virtual Office",
    umkm: "UMKM",
    "ai-gateway": "WhatsApp Gateway",
    "whatsapp-setup": "Setup WhatsApp",
    "web-crawler": "Web Crawler",
    "agent-builder": "Agent Builder",
    "knowledge-graph": "Knowledge Graph",
    "label-studio": "Label Studio",
    "riset-knowledge": "Riset Knowledge",
    "konten-marketing": "Konten Marketing",
    "connect-wa": "Hubungkan WhatsApp",
    "my-agents": "Karyawan AI saya",
    usage: "Pemakaian",
    recruit: "Rekrut karyawan",
    "guide-flows": "Guide Flows",
    settings: "Settings",
    playground: "Playground",
    advanced: "Advanced",
};

function generateBreadcrumb(pathname: string): { title: string; path?: string }[] {
    const segments = pathname.split("/").filter(Boolean);
    const items: { title: string; path?: string }[] = [{ title: "Home", path: "/admin/dashboard" }];

    let currentPath = "";
    segments.forEach((segment) => {
        if (segment === "admin") return;
        currentPath += `/${segment}`;
        const title =
            BREADCRUMB_LABELS[segment] ??
            segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        items.push({ title, path: `/admin${currentPath}` });
    });

    return items;
}

const AppListContent = ({ darkMode }: { darkMode: boolean }) => {
    const router = useRouter();
    return (
        <div className="font-mono" style={{ width: 280, padding: 6 }}>
            <div className="mb-2 border-b pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)", color: ORANGE }}>
                Nusantarasoft · Surfaces
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                }}
            >
                {appList.map((app) => (
                    <div
                        key={app.key}
                        onClick={() => {
                            if (app.url.startsWith("/admin")) {
                                router.push(app.url);
                            } else {
                                window.open(app.url, "_blank");
                            }
                        }}
                        style={{
                            cursor: "pointer",
                            padding: 10,
                            borderRadius: 0,
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)"}`,
                            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
                            transition: "all 0.15s",
                            textAlign: "left",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(251,146,60,0.6)";
                            e.currentTarget.style.background = "rgba(251,146,60,0.08)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)";
                            e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)";
                        }}
                    >
                        <Avatar src={app.icon} size={28} style={{ marginBottom: 6 }} />
                        <div>
                            <Text
                                strong
                                className="font-mono"
                                style={{
                                    display: "block",
                                    fontSize: 11,
                                    color: darkMode ? "#f1f5f9" : "#0f172a",
                                }}
                            >
                                {app.title}
                            </Text>
                            <Text type="secondary" className="font-mono" style={{ fontSize: 9.5 }}>
                                {app.desc}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/** Recursively convert menuConfig routes into Ant Design Menu items with Agentic OS styling. */
function buildAntMenuItems(
    routes: any[],
    collapsed: boolean,
    query: string,
    vo: VOTheme,
    onNavigate: (path: string) => void,
): NonNullable<MenuProps["items"]> {
    const q = query.trim().toLowerCase();

    const routeMatches = (r: any): boolean => {
        if (!q) return true;
        if (r.path?.includes("divider") && !r.icon) return false;
        const selfMatch =
            String(r.name ?? "").toLowerCase().includes(q) ||
            String(r.path ?? "").toLowerCase().includes(q);
        if (selfMatch) return true;
        const sub = r.routes || r.children;
        return Array.isArray(sub) && sub.some(routeMatches);
    };

    const out: NonNullable<MenuProps["items"]> = [];

    for (const item of routes) {
        if (item.path === "/admin/dashboard" || item.path === "/admin/activity") continue;

        if (item.path?.includes("divider") && !item.icon) {
            if (collapsed || q) continue;
            out.push({
                key: item.path,
                disabled: true,
                className: "aos-menu-divider-item",
                label: (
                    <div
                        className="vo-divider-header flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: vo.accent }}
                    >
                        <span className="inline-block h-1.5 w-1.5 shrink-0" style={{ background: vo.accent }} />
                        <span>{item.name}</span>
                    </div>
                ),
            });
            continue;
        }

        if (!routeMatches(item)) continue;

        const subRoutes = item.routes || item.children;
        if (Array.isArray(subRoutes) && subRoutes.length > 0 && !item.isLeaf) {
            const children = buildAntMenuItems(subRoutes, collapsed, query, vo, onNavigate);
            if (q && children.length === 0 && !String(item.name ?? "").toLowerCase().includes(q)) continue;
            out.push({
                key: item.path,
                icon: item.icon ? (
                    <span className="anticon submenu-icon-el" style={{ display: "inline-flex", fontSize: 15, flexShrink: 0 }}>
                        {item.icon}
                    </span>
                ) : undefined,
                label: <span className="submenu-text-el font-mono text-[12px]">{item.name}</span>,
                children,
            });
        } else {
            out.push({
                key: item.path,
                icon: item.icon ? (
                    <span className="anticon menuitem-icon-el" style={{ display: "inline-flex", fontSize: 15, flexShrink: 0 }}>
                        {item.icon}
                    </span>
                ) : undefined,
                label: <span className="menuitem-text-el font-mono text-[12px]">{item.name}</span>,
                onClick: () => onNavigate(item.path || "/admin/dashboard"),
            });
        }
    }

    return out;
}

export default function CMSLayoutImpl({
    children,
    title,
    subTitle,
    extra,
    breadcrumb,
}: CMSLayoutProps) {
    const router = useRouter();
    const currentPath = usePathname();
    const appRole = useAuthStore((s) => s.user?.role);
    const [pathname, setPathname] = useState(currentPath || "/admin/dashboard");
    const bodyRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (currentPath) {
            setPathname(currentPath);
        }
    }, [currentPath]);

    const [innerCollapsed, setInnerCollapsed] = useState(false);
    const [outerCollapsed, setOuterCollapsed] = useState(false);
    const [menuQuery, setMenuQuery] = useState("");

    const {
        pinnedItems,
        togglePinned,
        isPinned,
        setStarred,
        starredItems,
        isStarred,
        toggleStarred,
        selectedSegment,
        setSelectedSegment,
    } = usePreferencesStore();

    const { windows: dockWindows, openWindow: openDockWindow, minimizeAll: minimizeAllDockWindows } = useDockStore();

    const panels = useAdminLayout((s) => s.panels);
    const dropEdge = useAdminLayout((s) => s.dropEdge);
    const focus = useAdminLayout((s) => s.focus);
    const toggleFocus = useAdminLayout((s) => s.toggleFocus);
    const resetLayout = useAdminLayout((s) => s.resetLayout);
    const darkMode = useAdminLayout((s) => s.darkMode);
    const setDarkMode = useAdminLayout((s) => s.setDarkMode);

    const [appListOpen, setAppListOpen] = useState(false);
    const [aiStudioVisible, setAIStudioVisible] = useState(false);
    const [themeDrawerVisible, setThemeDrawerVisible] = useState(false);
    const { themePalette } = usePreferencesStore();
    const themeColor = themePalette.primary;
    const vo = getVOTheme(darkMode);
    useWebSocketStore();

    // Controlled openKeys to prevent submenu collapse on navigation
    const [openKeys, setOpenKeys] = useState<string[]>(() => {
        const path = currentPath || "/admin/dashboard";
        const keys: string[] = [];
        if (menuConfig?.route?.routes) {
            for (const route of menuConfig.route.routes) {
                if (route.routes && route.routes.some((r: any) => path.startsWith(r.path))) {
                    keys.push(route.key ?? route.path);
                }
            }
        }
        return keys;
    });

    const authUserId = useAuthStore((s) => s.user?.id);

    const fetchStars = React.useCallback(async () => {
        if (!authUserId) return;
        try {
            const { gql } = await import("@/lib/graphql");
            const result = await gql<{ userStars: { id: string; path: string; name: string; icon?: string }[] }>(
                `query GetUserStars($userId: String!) {
                    userStars(userId: $userId) { id path name icon }
                }`,
                { userId: authUserId },
            );
            if (result.userStars) setStarred(result.userStars);
        } catch {
            /* stars are optional chrome */
        }
    }, [authUserId, setStarred]);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            fetchStars();
        }
    }, [pathname, fetchStars]);

    const handleToggleStar = async () => {
        const menuItem = findMenuItemByPath(menuConfig.route.routes, pathname);
        const name = (typeof title === "string" ? title : menuItem?.name) || "Untitled Page";

        if (!authUserId) {
            message.warning("Sign in to save favorites");
            return;
        }
        try {
            const isStarredNow = starredItems.some((i) => i.path === pathname);
            const { gql } = await import("@/lib/graphql");
            await gql(
                `mutation ToggleStar($userId: String!, $input: ToggleStarInput!) {
                    toggleStar(userId: $userId, input: $input) { id path name icon }
                }`,
                {
                    userId: authUserId,
                    input: { path: pathname, name },
                },
            );
            await fetchStars();
            message.success(isStarredNow ? "Removed from favorites" : "Added to favorites");
        } catch {
            message.error("Failed to update favorite");
        }
    };

    const handleTogglePin = () => {
        const menuItem = findMenuItemByPath(menuConfig.route.routes, pathname);
        const name = (typeof title === "string" ? title : menuItem?.name) || "Untitled Page";
        togglePinned({ path: pathname, name });
        message.success(isPinned(pathname) ? "Unpinned from sidebar" : "Pinned to sidebar");
    };

    React.useEffect(() => {
        usePreferencesStore.persist.rehydrate();
    }, []);

    React.useEffect(() => {
        const savedInnerCollapsed = localStorage.getItem("cms-inner-collapsed");
        const savedOuterCollapsed = localStorage.getItem("cms-outer-collapsed");

        if (savedInnerCollapsed !== null) {
            setInnerCollapsed(savedInnerCollapsed === "true");
        }
        if (savedOuterCollapsed !== null) {
            setOuterCollapsed(savedOuterCollapsed === "true");
        }
        setDarkMode(readInitialDarkMode());
    }, [setDarkMode]);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            const savedDarkMode = localStorage.getItem("cms-dark-mode");
            if (savedDarkMode === null) {
                setDarkMode(e.matches);
            }
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [setDarkMode]);

    const handleDarkModeChange = useCallback((dark: boolean) => {
        setDarkMode(dark);
        localStorage.setItem("cms-dark-mode", String(dark));
        if (dark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        window.dispatchEvent(new CustomEvent("cms-theme-sync", { detail: dark }));
    }, [setDarkMode]);

    React.useEffect(() => {
        const handleToggleTheme = () => handleDarkModeChange(!darkMode);
        const handleSetTheme = (e: Event) => {
            const nextDark = (e as CustomEvent<boolean>).detail;
            if (typeof nextDark === "boolean") handleDarkModeChange(nextDark);
        };
        const handleOpenAI = () => setAIStudioVisible(true);
        document.addEventListener("toggle-dark-mode", handleToggleTheme);
        document.addEventListener("cms-set-dark-mode", handleSetTheme);
        document.addEventListener("open-ai-studio", handleOpenAI);
        return () => {
            document.removeEventListener("toggle-dark-mode", handleToggleTheme);
            document.removeEventListener("cms-set-dark-mode", handleSetTheme);
            document.removeEventListener("open-ai-studio", handleOpenAI);
        };
    }, [darkMode, handleDarkModeChange]);

    React.useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [darkMode]);

    React.useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--theme-color", themePalette.primary);
        root.style.setProperty("--theme-secondary", themePalette.secondary);
        root.style.setProperty("--theme-accent", themePalette.accent);
        root.style.setProperty("--theme-sidebar-bg", themePalette.sidebarBg);
        root.style.setProperty("--theme-header-bg", themePalette.headerBg);
        const pRgb = hexToRgb(themePalette.primary);
        root.style.setProperty("--theme-color-rgb", `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`);
        const sRgb = hexToRgb(themePalette.secondary);
        root.style.setProperty("--theme-secondary-rgb", `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`);
        const aRgb = hexToRgb(themePalette.accent);
        root.style.setProperty("--theme-accent-rgb", `${aRgb.r}, ${aRgb.g}, ${aRgb.b}`);
    }, [themePalette]);

    const toggleOuterCollapsed = useCallback(() => {
        setOuterCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("cms-outer-collapsed", String(next));
            return next;
        });
    }, []);

    const toggleInnerCollapsed = useCallback(() => {
        setInnerCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("cms-inner-collapsed", String(next));
            return next;
        });
    }, []);

    const handleResetAllLayouts = useCallback(() => {
        resetLayout();
        setOuterCollapsed(false);
        setInnerCollapsed(false);
        localStorage.setItem("cms-outer-collapsed", "false");
        localStorage.setItem("cms-inner-collapsed", "false");
    }, [resetLayout]);

    const openCommandPalette = () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    };

    const navigateTo = useCallback(
        (targetPath: string) => {
            setPathname(targetPath);
            router.push(targetPath);
        },
        [router],
    );

    const isLeftPinned = panels.left.mode === "pinned-left" || panels.left.mode === "pinned-right";
    const isRightPinned = panels.right.mode === "pinned-left" || panels.right.mode === "pinned-right";
    const isOuterRail = isLeftPinned && outerCollapsed;
    const isInnerRail = isRightPinned && innerCollapsed;

    const filteredTree = useMemo(
        () => filterMenuTreeForAppRole(menuConfig?.route?.routes ?? [], appRole),
        [appRole],
    );

    const antMenuItems = useMemo(
        () => buildAntMenuItems(filteredTree, isOuterRail, menuQuery, vo, navigateTo),
        [filteredTree, isOuterRail, menuQuery, vo, navigateTo],
    );

    const breadcrumbItems = breadcrumb || generateBreadcrumb(currentPath || "/admin/dashboard");
    const innerRoutes = getInnerMenuRoutes(selectedSegment, pinnedItems, starredItems);

    const segmentedOptions = [
        { value: "new", icon: <PlusOutlined /> },
        { value: "recent", icon: <ClockCircleOutlined /> },
        { value: "pinned", icon: <PushpinOutlined /> },
        { value: "starred", icon: <StarOutlined /> },
        { value: "history", icon: <HistoryOutlined /> },
    ];

    const logoSrc = darkMode ? "/logo-white.png" : "/logo-black.png";
    const isDashboard = pathname === "/admin/dashboard";
    const isActivity = pathname === "/admin/activity";

    const activeModuleName = useMemo(() => {
        const segs = pathname.split("/").filter(Boolean);
        const mod = segs[1] || "dashboard";
        return BREADCRUMB_LABELS[mod] ?? mod.replace(/-/g, " ");
    }, [pathname]);

    // Calculate left offset for the floating vertical widget dock so it never overlaps left-pinned panels
    const leftPinnedWidth = useMemo(() => {
        if (focus) return 0;
        let w = 0;
        if (panels.left.mode === "pinned-left") w += outerCollapsed ? OUTER_COLLAPSED_WIDTH : panels.left.w;
        if (panels.right.mode === "pinned-left") w += innerCollapsed ? INNER_COLLAPSED_WIDTH : panels.right.w;
        return w;
    }, [focus, panels.left.mode, panels.left.w, panels.right.mode, panels.right.w, outerCollapsed, innerCollapsed]);

    const accountMenuProps = {
        items: [
            {
                key: "settings",
                icon: <SettingOutlined />,
                label: "Account Settings",
            },
            {
                key: "switch",
                icon: <SwapOutlined />,
                label: "Sign in another account",
            },
            {
                type: "divider" as const,
            },
            {
                key: "logout",
                icon: <LogoutOutlined />,
                label: "Sign Out",
                danger: true,
            },
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === "logout") {
                message.success("Signed out successfully");
            } else if (key === "settings") {
                router.push("/admin/settings/general");
            } else if (key === "switch") {
                message.info("Switching account...");
            }
        },
    };

    const SidebarActions = () => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isOuterRail ? "center" : "space-evenly",
                flexDirection: isOuterRail ? "column" : "row",
                gap: isOuterRail ? 8 : 0,
                width: "100%",
                padding: isOuterRail ? "8px 0" : "0 8px",
                minHeight: isOuterRail ? undefined : SIDER_FOOTER_ROW_HEIGHT,
                borderTop: `1px solid ${vo.border}`,
            }}
        >
            <LanguageSwitcher isDark={darkMode} />
            <div
                onClick={() => setThemeDrawerVisible(true)}
                title="Theme Customizer"
                style={{
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: vo.textMuted,
                    border: `1px solid ${vo.border}`,
                }}
                className="vo-icon-btn"
            >
                <SettingOutlined style={{ fontSize: 13 }} />
            </div>
            <NotificationBell />
            <Dropdown key="account-menu" menu={accountMenuProps} trigger={["click"]} placement="bottomRight">
                <div
                    style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        border: `1px solid ${vo.border}`,
                        color: vo.textMuted,
                    }}
                    className="vo-icon-btn"
                >
                    <Avatar
                        icon={<UserOutlined />}
                        size="small"
                        style={{
                            background: vo.accentGradient,
                            width: 18,
                            height: 18,
                            lineHeight: "18px",
                            borderRadius: 0,
                        }}
                    />
                </div>
            </Dropdown>
        </div>
    );

    const PinStarShareActions = () => (
        <div className="flex items-center gap-1 font-mono" style={{ marginLeft: 8 }}>
            <Tooltip title={isPinned(pathname) ? "Unpin from workspace" : "Pin to workspace"}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin();
                    }}
                    className={cx(
                        "flex h-[24px] w-[24px] items-center justify-center border transition",
                        isPinned(pathname)
                            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-300"
                            : "border-white/15 text-slate-400 hover:border-white/35 hover:text-white",
                    )}
                >
                    <PushpinOutlined style={{ fontSize: 12 }} />
                </button>
            </Tooltip>
            <Tooltip title={isStarred(pathname) ? "Remove from favorites" : "Add to favorites"}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleStar();
                    }}
                    className={cx(
                        "flex h-[24px] w-[24px] items-center justify-center border transition",
                        isStarred(pathname)
                            ? "border-amber-400/70 bg-amber-500/15 text-amber-300"
                            : "border-white/15 text-slate-400 hover:border-white/35 hover:text-white",
                    )}
                >
                    <StarOutlined style={{ fontSize: 12 }} />
                </button>
            </Tooltip>
            <Popover
                content={
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                        <Input
                            value={typeof window !== "undefined" ? window.location.href : pathname}
                            readOnly
                            style={{ width: 240, borderRadius: 0 }}
                        />
                        <Button
                            icon={<CopyOutlined />}
                            style={{ borderRadius: 0 }}
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    await navigator.clipboard.writeText(
                                        typeof window !== "undefined" ? window.location.href : "",
                                    );
                                    message.success("Link copied to clipboard!");
                                } catch {
                                    message.error("Failed to copy link");
                                }
                            }}
                        >
                            Copy
                        </Button>
                    </div>
                }
                title={<span className="font-mono text-[10px] uppercase tracking-wider">Share this page</span>}
                trigger="click"
                placement="bottomRight"
            >
                <Tooltip title="Share">
                    <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-[24px] w-[24px] items-center justify-center border border-white/15 text-slate-400 transition hover:border-orange-400/60 hover:text-orange-200"
                    >
                        <ShareAltOutlined style={{ fontSize: 12 }} />
                    </button>
                </Tooltip>
            </Popover>
        </div>
    );

    return (
        <div
            id="cms-pro-layout"
            data-theme={darkMode ? "dark" : "light"}
            className={cx(
                "aos-root flex h-screen w-screen flex-col overflow-hidden bg-[#0b0e13] font-mono text-slate-100 selection:bg-orange-500/30",
                !darkMode && "aos-light",
            )}
        >
            <NextThemesProvider
                attribute="class"
                defaultTheme="dark"
                forcedTheme={darkMode ? "dark" : "light"}
                enableSystem={false}
                disableTransitionOnChange
            >
            <ProConfigProvider hashed={false} dark={darkMode}>
                <ConfigProvider
                    getTargetContainer={() => document.getElementById("cms-pro-layout") || document.body}
                    theme={{
                        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                        cssVar: { prefix: "cms" },
                        hashed: false,
                        token: {
                            colorPrimary: themePalette.primary,
                            colorLink: themePalette.accent,
                            colorInfo: themePalette.secondary,
                            borderRadius: 0,
                            borderRadiusSM: 0,
                            borderRadiusLG: 0,
                            borderRadiusXS: 0,
                            colorBgBase: darkMode ? "#081414" : "#f8fafc",
                            colorBgContainer: darkMode ? "#141414" : "#ffffff",
                            colorBgElevated: darkMode ? "#141414" : "#ffffff",
                            colorBgLayout: darkMode ? "#080a0f" : "#f1f5f9",
                            colorBorder: darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.12)",
                            colorBorderSecondary: darkMode ? "rgba(255, 255, 255, 0.07)" : "rgba(15, 23, 42, 0.08)",
                            fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        },
                    }}
                >
                    {/* ========================================================= */}
                    {/* AGENTIC OS TOP STATUS BAR (36px / h-9)                    */}
                    {/* ========================================================= */}
                    <header
                        data-testid="admin-topbar"
                        className="pointer-events-auto relative z-30 flex h-9 shrink-0 items-center justify-between gap-3 whitespace-nowrap border-b border-white/[0.08] bg-[#0b0e13]/95 px-3 font-mono text-[10px] tracking-[0.14em] backdrop-blur-md"
                    >
                        {/* Left: App Switcher + Brand Identity + Live Status Telemetry */}
                        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                            <Popover
                                content={<AppListContent darkMode={darkMode} />}
                                trigger="click"
                                placement="bottomLeft"
                                open={appListOpen}
                                onOpenChange={setAppListOpen}
                            >
                                <button
                                    type="button"
                                    title="Switch NusantaraSoft Surface"
                                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center border border-orange-400/60 bg-orange-500/15 text-orange-200 transition hover:border-orange-300 hover:text-white"
                                >
                                    <AppstoreOutlined style={{ fontSize: 12 }} />
                                </button>
                            </Popover>

                            <div
                                onClick={() => navigateTo("/admin/dashboard")}
                                className="flex cursor-pointer items-center gap-1.5"
                            >
                                <Hexagon className="h-3.5 w-3.5 shrink-0" color={ORANGE} strokeWidth={2.2} />
                                <span className="font-semibold tracking-[0.22em] text-white">NUSANTARASOFT</span>
                                <span className="hidden text-[9.5px] tracking-normal sm:inline" style={{ color: ORANGE }}>
                                    · ADMIN OS
                                </span>
                            </div>

                            <span className="h-3.5 w-px bg-white/10" />

                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                <span className="text-slate-500">CORE</span>·
                                <span className="text-slate-100">ONLINE</span>
                            </span>

                            <span className="hidden items-center gap-1.5 md:flex">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
                                <span className="text-slate-500">MODULE</span>·
                                <span className="truncate uppercase text-slate-100">{activeModuleName}</span>
                            </span>

                            <span className="hidden items-center gap-1.5 lg:flex">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                                <span className="text-slate-500">ROLE</span>·
                                <span className="uppercase text-slate-100">{appRole || "ADMIN"}</span>
                            </span>

                            <span className="hidden items-center gap-1.5 xl:flex">
                                <span className="text-slate-500">PINNED</span>·
                                <span className="tabular-nums text-slate-100">{pinnedItems.length}</span>
                                <span className="text-slate-500">· STARRED</span>·
                                <span className="tabular-nums text-slate-100">{starredItems.length}</span>
                            </span>
                        </div>

                        {/* Right: Search + Theme Toggle + Layout Controls + Agentic OS & Virtual Office Launch */}
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button
                                type="button"
                                onClick={openCommandPalette}
                                title="Open Command Palette (Ctrl+K)"
                                className="flex h-[22px] items-center gap-1.5 border border-white/15 px-2 text-[9.5px] tracking-normal text-slate-300 transition hover:border-white/35 hover:text-white"
                            >
                                <Search className="h-3 w-3" />
                                <span className="hidden sm:inline">search</span>
                                <kbd className="hidden text-[8.5px] text-slate-500 md:inline">Ctrl K</kbd>
                            </button>

                            <span
                                data-testid="admin-theme-toggle"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                className="inline-flex"
                            >
                                <AnimatedThemeToggler
                                    isDark={darkMode}
                                    onThemeChange={handleDarkModeChange}
                                    size={13}
                                    className="!p-0 flex h-[22px] w-[22px] items-center justify-center !rounded-none border border-white/15 text-slate-300 transition hover:border-white/35 hover:text-white"
                                />
                            </span>

                            <button
                                type="button"
                                data-testid="admin-reset-layout"
                                title="Reset panel positions and layout"
                                onClick={handleResetAllLayouts}
                                className="hidden h-[22px] items-center border border-white/15 px-2 text-[9.5px] tracking-normal text-slate-300 transition hover:border-white/35 hover:text-white md:flex"
                            >
                                reset layout
                            </button>

                            <button
                                type="button"
                                data-testid="admin-focus"
                                title="Hide or show side panels"
                                onClick={toggleFocus}
                                className={cx(
                                    "flex h-[22px] items-center border px-2 text-[9.5px] tracking-normal transition",
                                    focus
                                        ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                                        : "border-white/15 text-slate-300 hover:border-white/35 hover:text-white",
                                )}
                            >
                                focus
                            </button>

                            <button
                                type="button"
                                onClick={() => navigateTo("/admin/agentic-os")}
                                className="hidden h-[22px] items-center gap-1 border border-sky-400/40 bg-sky-500/10 px-2 text-[9.5px] tracking-normal text-sky-200 transition hover:border-sky-300/70 hover:text-white sm:flex"
                            >
                                <Cpu className="h-3 w-3" />
                                <span>agentic os</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigateTo("/admin/virtual-office")}
                                className="flex h-[22px] items-center gap-1 border border-orange-400/40 bg-orange-500/10 px-2 text-[9.5px] tracking-normal text-orange-100 transition hover:border-orange-300/70 hover:text-white"
                            >
                                <Box className="h-3 w-3" />
                                <span className="hidden sm:inline">virtual office</span>
                            </button>
                        </div>
                    </header>

                    {/* ========================================================= */}
                    {/* AGENTIC OS BODY: LEFT PANEL + MAIN + RIGHT PANEL          */}
                    {/* ========================================================= */}
                    <div
                        ref={bodyRef}
                        data-admin-body
                        className="relative flex min-h-0 flex-1 overflow-hidden"
                    >
                        {/* 1. LEFT PANEL: Primary Module Navigation (cms-outer-sider) */}
                        {!focus && (
                            <AdminSidePanel
                                id="left"
                                title="Navigation · Modules"
                                summary={activeModuleName}
                                accent={ORANGE}
                                collapsed={outerCollapsed}
                                onToggleCollapsed={toggleOuterCollapsed}
                                bodyRef={bodyRef}
                                className="cms-outer-sider"
                            >
                                {/* Brand & Quick Filter Row */}
                                {!isOuterRail && (
                                    <div className="shrink-0 border-b border-white/[0.07] px-2.5 py-2">
                                        <div className="relative flex items-center border border-white/15 bg-white/[0.02] px-2 py-1">
                                            <SearchOutlined className="mr-1.5 text-[11px] text-slate-500" />
                                            <input
                                                value={menuQuery}
                                                onChange={(e) => setMenuQuery(e.target.value)}
                                                placeholder="FILTER MODULES…"
                                                className="w-full bg-transparent font-mono text-[10px] tracking-wider text-slate-100 placeholder:text-slate-500 focus:outline-none"
                                            />
                                            {menuQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setMenuQuery("")}
                                                    className="text-slate-500 hover:text-white"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Dashboard & Activity Feed Quick Card */}
                                <div
                                    className={cx(
                                        "shrink-0 border-b border-white/[0.07]",
                                        isOuterRail ? "p-1.5" : "p-2",
                                    )}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div
                                            onClick={() => navigateTo("/admin/dashboard")}
                                            title="Dashboard"
                                            className={cx(
                                                "flex cursor-pointer items-center gap-2.5 border px-2.5 py-1.5 transition",
                                                isOuterRail && "justify-center px-1",
                                                isDashboard
                                                    ? "border-orange-400/60 bg-orange-500/15 text-white"
                                                    : "border-transparent text-slate-400 hover:border-white/15 hover:bg-white/[0.03] hover:text-slate-100",
                                            )}
                                        >
                                            <DashboardOutlined
                                                style={{ fontSize: 14, color: isDashboard ? ORANGE : "inherit" }}
                                            />
                                            {!isOuterRail && (
                                                <div className="flex flex-1 items-center justify-between">
                                                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                                                        Dashboard
                                                    </span>
                                                    <span className="flex h-4 w-4 items-center justify-center border border-orange-400/40 bg-orange-500/15">
                                                        <SafetyCertificateOutlined
                                                            style={{ fontSize: 10, color: ORANGE }}
                                                        />
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            onClick={() => navigateTo("/admin/activity")}
                                            title="Activity Feed"
                                            className={cx(
                                                "flex cursor-pointer items-center gap-2.5 border px-2.5 py-1.5 transition",
                                                isOuterRail && "justify-center px-1",
                                                isActivity
                                                    ? "border-orange-400/60 bg-orange-500/15 text-white"
                                                    : "border-transparent text-slate-400 hover:border-white/15 hover:bg-white/[0.03] hover:text-slate-100",
                                            )}
                                        >
                                            <ClockCircleOutlined
                                                style={{ fontSize: 14, color: isActivity ? ORANGE : "inherit" }}
                                            />
                                            {!isOuterRail && (
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                                                    Activity Feed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Module Navigation Tree */}
                                <div className={cx("min-h-0 flex-1", SCROLL_Y)}>
                                    <Menu
                                        mode="inline"
                                        theme={darkMode ? "dark" : "light"}
                                        inlineCollapsed={isOuterRail}
                                        selectedKeys={[pathname]}
                                        openKeys={isOuterRail ? undefined : openKeys}
                                        onOpenChange={(keys) => {
                                            if (!isOuterRail) setOpenKeys(keys as string[]);
                                        }}
                                        items={antMenuItems}
                                        style={{
                                            background: "transparent",
                                            borderInlineEnd: "none",
                                        }}
                                    />
                                </div>

                                {/* Footer Actions Row */}
                                <div className="shrink-0">
                                    <SidebarActions />
                                </div>
                            </AdminSidePanel>
                        )}

                        {/* 2. MAIN WORKSPACE CONTENT AREA (order-2 flex-1 min-w-0) */}
                        <main
                            data-testid="admin-main"
                            className={cx(
                                "cms-outer-layout relative order-2 flex min-w-0 flex-1 flex-col overflow-x-hidden",
                                SCROLL_Y,
                            )}
                            style={{ background: vo.canvas }}
                        >
                            <PageContainer
                                title={title}
                                subTitle={subTitle}
                                extra={[...(extra || []), <PinStarShareActions key="pin-star-actions" />]}
                                breadcrumb={{
                                    items: breadcrumbItems.map((item, index) => ({
                                        key: index,
                                        title: index === 0 ? <HomeOutlined /> : item.title,
                                        onClick: item.path ? () => navigateTo(item.path!) : undefined,
                                        className: item.path ? "cursor-pointer" : "",
                                    })),
                                }}
                            >
                                <ProCard>{children}</ProCard>
                            </PageContainer>
                        </main>

                        {/* 3. RIGHT PANEL: Contextual Workspace / Shortcuts / Tamagotchi (cms-inner-sider) */}
                        {!focus && (
                            <AdminSidePanel
                                id="right"
                                title="Workspace · Context"
                                summary={`${selectedSegment} · ${innerRoutes.length} items`}
                                accent={SKY}
                                collapsed={innerCollapsed}
                                onToggleCollapsed={toggleInnerCollapsed}
                                bodyRef={bodyRef}
                                className="cms-inner-sider"
                            >
                                {/* Segmented Workspace Switcher */}
                                <div
                                    className="shrink-0 border-b border-white/[0.07]"
                                    style={{
                                        padding: isInnerRail ? "8px 6px" : "8px 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Segmented
                                        value={selectedSegment}
                                        onChange={(value) => setSelectedSegment(value as string)}
                                        block={!isInnerRail}
                                        size={isInnerRail ? "middle" : "small"}
                                        vertical={isInnerRail}
                                        options={segmentedOptions}
                                        style={{
                                            background: vo.hoverBg,
                                            border: `1px solid ${vo.border}`,
                                            borderRadius: 0,
                                            padding: 2,
                                        }}
                                    />
                                </div>

                                {/* Contextual Items List */}
                                <div className={cx("min-h-0 flex-1 px-2 py-2", SCROLL_Y)}>
                                    {!isInnerRail && (
                                        <div className="mb-1.5 flex items-center justify-between px-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5" style={{ background: SKY }} />
                                                {selectedSegment}
                                            </span>
                                            <span className="tabular-nums text-slate-500">{innerRoutes.length}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1">
                                        {innerRoutes.length === 0 ? (
                                            <div className="px-2 py-4 text-center text-[10px] text-slate-500">
                                                {isInnerRail ? "—" : `No ${selectedSegment} items`}
                                            </div>
                                        ) : (
                                            innerRoutes.map((item) => {
                                                const active = pathname === item.path;
                                                const isPinnedOrStarred =
                                                    selectedSegment === "pinned" || selectedSegment === "starred";
                                                return (
                                                    <div
                                                        key={item.path}
                                                        onClick={() => item.path && navigateTo(item.path)}
                                                        title={item.name}
                                                        className={cx(
                                                            "group flex cursor-pointer items-center justify-between border px-2.5 py-1.5 transition",
                                                            isInnerRail && "justify-center px-1",
                                                            active
                                                                ? "border-sky-400/60 bg-sky-500/15 text-white"
                                                                : "border-transparent text-slate-300 hover:border-white/15 hover:bg-white/[0.03] hover:text-white",
                                                        )}
                                                    >
                                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                                            <span
                                                                className="anticon shrink-0"
                                                                style={{
                                                                    fontSize: 14,
                                                                    color: active ? SKY : vo.textDim,
                                                                }}
                                                            >
                                                                {item.icon}
                                                            </span>
                                                            {!isInnerRail && (
                                                                <span className="truncate text-[11.5px]">
                                                                    {item.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isPinnedOrStarred && !isInnerRail && (
                                                            <Popconfirm
                                                                title={`Remove from ${selectedSegment}?`}
                                                                onConfirm={(e) => {
                                                                    e?.stopPropagation();
                                                                    if (selectedSegment === "pinned") {
                                                                        togglePinned({
                                                                            path: item.path!,
                                                                            name: (item.name as string) || "",
                                                                        });
                                                                        message.success("Removed from pinned");
                                                                    } else {
                                                                        toggleStarred({
                                                                            path: item.path!,
                                                                            name: (item.name as string) || "",
                                                                        });
                                                                        message.success("Removed from favorites");
                                                                    }
                                                                }}
                                                                onCancel={(e) => e?.stopPropagation()}
                                                                okText="Yes"
                                                                cancelText="No"
                                                            >
                                                                <Button
                                                                    type="text"
                                                                    size="small"
                                                                    danger
                                                                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ marginLeft: 4 }}
                                                                />
                                                            </Popconfirm>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Telemetry Cards & Tamagotchi + Online Presence Footer */}
                                <div className="shrink-0 border-t border-white/[0.07]">
                                    <ModuleIllustrationCards collapsed={isInnerRail} darkMode={darkMode} />
                                    <OnlineUsersAvatars collapsed={isInnerRail} darkMode={darkMode} />
                                </div>
                            </AdminSidePanel>
                        )}

                        {/* Drop-zone edge indicator when dragging a panel */}
                        {dropEdge && (
                            <div
                                data-testid={`admin-drop-${dropEdge}`}
                                className={cx(
                                    "pointer-events-none absolute inset-y-0 z-[60] flex w-14 items-center justify-center border-orange-400/80 bg-orange-500/15 font-mono backdrop-blur-[1px] transition-opacity",
                                    dropEdge === "left" ? "left-0 border-r-2" : "right-0 border-l-2",
                                )}
                            >
                                <span className="-rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-200">
                                    {dropEdge === "left" ? "Drop to pin left" : "Drop to pin right"}
                                </span>
                            </div>
                        )}
                    </div>
                </ConfigProvider>
            </ProConfigProvider>
            </NextThemesProvider>

            {/* Left Productivity Dock (automatically offsets past left-pinned panels) */}
            <div
                className="hidden md:flex"
                style={{
                    position: "fixed",
                    top: "50%",
                    transform: "translateY(-50%)",
                    left: leftPinnedWidth + 12,
                    zIndex: 50,
                    transition: "left 0.15s ease",
                }}
            >
                <MacWaveDock
                    items={LEFT_DOCK_WIDGETS as any}
                    direction="vertical"
                    darkMode={darkMode}
                    title="QUICK"
                    accentColor={ORANGE}
                    onItemClick={openDockWindow as any}
                    onMinimizeAll={minimizeAllDockWindows}
                    dockWindows={dockWindows}
                />
            </div>

            {/* Dock Widget Windows */}
            {dockWindows.map((win) => {
                if (win.minimized) return null;
                const meta = ALL_DOCK_META[win.widgetType] || {
                    color: ORANGE,
                    code: "OS",
                    desc: "Agentic OS Dock Module",
                };
                const hasDedicatedWidget =
                    win.widgetType === "athan" ||
                    win.widgetType === "calculator" ||
                    win.widgetType === "notes" ||
                    win.widgetType === "calendar" ||
                    win.widgetType === "snake" ||
                    win.widgetType === "pong";

                return (
                    <DockWindow
                        key={win.id}
                        id={win.id}
                        title={win.title}
                        width={win.width}
                        height={win.height}
                        zIndex={win.zIndex}
                        accentColor={meta.color}
                        code={meta.code}
                    >
                        {win.widgetType === "athan" && <AthanWidget />}
                        {win.widgetType === "calculator" && <CalculatorWidget />}
                        {win.widgetType === "notes" && <NotesWidget />}
                        {win.widgetType === "calendar" && <CalendarWidget />}
                        {win.widgetType === "snake" && <SnakeWidget />}
                        {win.widgetType === "pong" && <PongWidget />}
                        {!hasDedicatedWidget && (
                            <div
                                className="font-mono"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    height: "100%",
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "8px 10px",
                                            border: `1px solid ${vo.border}`,
                                            borderLeft: `2px solid ${meta.color}`,
                                            background: vo.hoverBg,
                                            marginBottom: 10,
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    letterSpacing: "0.14em",
                                                    textTransform: "uppercase",
                                                    color: meta.color,
                                                }}
                                            >
                                                {win.title} · [{meta.code}]
                                            </div>
                                            <div style={{ fontSize: 11, color: vo.textMuted, marginTop: 2 }}>
                                                {meta.desc}
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                padding: "2px 6px",
                                                border: `1px solid ${meta.color}66`,
                                                color: meta.color,
                                            }}
                                        >
                                            ONLINE
                                        </span>
                                    </div>

                                    <NotesWidget storageKey={`dock-${win.widgetType}`} />
                                </div>

                                {meta.route && (
                                    <button
                                        type="button"
                                        onClick={() => navigateTo(meta.route!)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 6,
                                            width: "100%",
                                            padding: "8px 12px",
                                            background: `${meta.color}1f`,
                                            border: `1px solid ${meta.color}88`,
                                            color: vo.text,
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: "0.16em",
                                            textTransform: "uppercase",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span>Open Full {win.title} Surface</span>
                                        <ExternalLink className="h-3.5 w-3.5" style={{ color: meta.color }} />
                                    </button>
                                )}
                            </div>
                        )}
                    </DockWindow>
                );
            })}

            {/* Bottom Dock Footer */}
            <div
                className="hidden md:flex"
                style={{
                    position: "fixed",
                    bottom: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 9999,
                }}
            >
                <MacWaveDock
                    items={BOTTOM_DOCK_WIDGETS as any}
                    direction="horizontal"
                    darkMode={darkMode}
                    title="DOCK"
                    accentColor={ORANGE}
                    onItemClick={openDockWindow as any}
                    onMinimizeAll={minimizeAllDockWindows}
                    dockWindows={dockWindows}
                />
            </div>

            {/* AI Studio Drawer */}
            <AIStudioDrawer visible={aiStudioVisible} onClose={() => setAIStudioVisible(false)} />

            {/* AI agent session (Virtual Office → module page, ?agentSession=<id>) */}
            <AgentSessionOverlay />

            {/* Global Command Palette (Ctrl+K / Cmd+K) */}
            <CommandPalette isDark={darkMode} themeColor={themeColor} />
            <TamagotchiGlobal />
            <LiveCursors />

            {/* Theme Customizer Drawer */}
            <ThemeDrawer
                visible={themeDrawerVisible}
                onClose={() => setThemeDrawerVisible(false)}
                darkMode={darkMode}
            />

            {/* Floating Action Button Cluster - Bottom Right */}
            <div
                className="hidden md:block"
                style={{
                    position: "fixed",
                    bottom: 32,
                    right: 32,
                    zIndex: 50,
                }}
            >
                <FloatingOrbMenu darkMode={darkMode} />
            </div>

            {/* Agentic OS Styling for Menus, PageContainer, ProCard, Tables, and Controls */}
            <style jsx global>{`
                .cms-outer-layout {
                    background: ${vo.canvas} !important;
                }
                .cms-outer-sider,
                .cms-inner-sider {
                    background: ${darkMode ? "rgba(11, 14, 19, 0.96)" : "rgba(255, 255, 255, 0.97)"} !important;
                    border-color: ${vo.border} !important;
                    box-shadow: none !important;
                }

                /* ---- Menus (Agentic OS square rows, monospace, orange active border) ---- */
                .cms-outer-sider .ant-menu,
                .cms-inner-sider .ant-menu {
                    background: transparent !important;
                    color: ${vo.textMuted} !important;
                    border-inline-end: none !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                .cms-outer-sider .ant-menu-sub,
                .cms-inner-sider .ant-menu-sub {
                    background: rgba(255, 255, 255, 0.015) !important;
                }
                .cms-outer-sider .ant-menu-item,
                .cms-outer-sider .ant-menu-submenu-title {
                    color: ${vo.text} !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    border: 1px solid transparent !important;
                    border-radius: 0px !important;
                    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
                    margin-inline: 6px !important;
                    margin-top: 1px !important;
                    margin-bottom: 1px !important;
                    width: calc(100% - 12px) !important;
                    height: 32px !important;
                    line-height: 32px !important;
                    padding-inline: 10px !important;
                }
                .cms-outer-sider .ant-menu-sub .ant-menu-item {
                    height: 29px !important;
                    line-height: 29px !important;
                    font-size: 11.5px !important;
                    padding-left: 28px !important;
                }
                /* Non-clickable domain group header items */
                .cms-outer-sider .ant-menu-item.aos-menu-divider-item,
                .cms-outer-sider .ant-menu-item:has(.vo-divider-header) {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 12px 10px 4px 10px !important;
                    margin: 0 !important;
                    height: auto !important;
                    line-height: 1.2 !important;
                    pointer-events: none !important;
                    cursor: default !important;
                    opacity: 1 !important;
                }
                .cms-outer-sider .ant-menu-item .anticon,
                .cms-outer-sider .ant-menu-submenu-title .anticon {
                    color: ${vo.textDim} !important;
                    transition: color 0.15s ease !important;
                }
                .cms-outer-sider .ant-menu-submenu-arrow {
                    color: ${vo.textDim} !important;
                }
                .cms-outer-sider .ant-menu-item:hover,
                .cms-outer-sider .ant-menu-submenu-title:hover {
                    background: ${vo.hoverBg} !important;
                    border-color: ${vo.border} !important;
                    color: ${vo.text} !important;
                }
                .cms-outer-sider .ant-menu-item:hover .anticon,
                .cms-outer-sider .ant-menu-submenu-title:hover .anticon {
                    color: ${vo.accent} !important;
                }
                .cms-outer-sider .ant-menu-item.ant-menu-item-selected {
                    background: ${vo.selectedBg} !important;
                    border-color: ${vo.selectedBorder} !important;
                    border-left: 2px solid ${vo.accent} !important;
                    color: ${vo.text} !important;
                    font-weight: 600 !important;
                }
                .cms-outer-sider .ant-menu-item.ant-menu-item-selected .anticon,
                .cms-outer-sider .ant-menu-submenu-selected > .ant-menu-submenu-title,
                .cms-outer-sider .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon {
                    color: ${vo.accent} !important;
                }

                /* ---- Segmented Control (Workspace · Context) ---- */
                .cms-inner-sider .ant-segmented {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                    border-radius: 0px !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item {
                    color: ${vo.textMuted} !important;
                    border-radius: 0px !important;
                    transition: color 0.15s ease !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
                    color: ${vo.text} !important;
                    background: transparent !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item-selected,
                .cms-inner-sider .ant-segmented .ant-segmented-thumb {
                    background: ${vo.selectedBg} !important;
                    color: ${vo.text} !important;
                    box-shadow: inset 0 0 0 1px ${vo.selectedBorder} !important;
                    border-radius: 0px !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item-selected .anticon {
                    color: ${vo.accent} !important;
                }

                /* ---- Agentic OS PageContainer, ProCard, Ant Cards, Tables, Inputs ---- */
                #cms-pro-layout .ant-pro-page-container {
                    background: transparent !important;
                }
                #cms-pro-layout .ant-page-header {
                    background: ${darkMode ? "rgba(11, 14, 19, 0.92)" : "rgba(255, 255, 255, 0.92)"} !important;
                    border-bottom: 1px solid ${vo.border} !important;
                    padding: 12px 20px !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                #cms-pro-layout .ant-page-header-heading-title {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 16px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                    color: ${vo.text} !important;
                }
                #cms-pro-layout .ant-page-header-heading-sub-title {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 11px !important;
                    color: ${vo.textMuted} !important;
                }
                #cms-pro-layout .ant-breadcrumb {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10px !important;
                    letter-spacing: 0.12em !important;
                    text-transform: uppercase !important;
                }
                #cms-pro-layout .ant-pro-page-container-children-container,
                #cms-pro-layout .ant-pro-page-container-warp-page-header {
                    padding-inline: 16px !important;
                    padding-block: 14px !important;
                }
                #cms-pro-layout .ant-pro-card,
                #cms-pro-layout .ant-card {
                    background: ${darkMode ? "#0b0e13" : "#ffffff"} !important;
                    border: 1px solid ${vo.border} !important;
                    border-radius: 0px !important;
                    box-shadow: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    transform: none !important;
                }
                #cms-pro-layout .ant-card-head,
                #cms-pro-layout .ant-pro-card-header {
                    border-bottom: 1px solid ${vo.border} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                #cms-pro-layout .ant-card-head-title,
                #cms-pro-layout .ant-pro-card-title {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    letter-spacing: 0.16em !important;
                    text-transform: uppercase !important;
                }
                #cms-pro-layout .ant-table-wrapper .ant-table {
                    background: transparent !important;
                    border-radius: 0px !important;
                }
                #cms-pro-layout .ant-table-thead > tr > th {
                    background: ${darkMode ? "rgba(255, 255, 255, 0.025)" : "rgba(15, 23, 42, 0.03)"} !important;
                    color: ${vo.textMuted} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    letter-spacing: 0.16em !important;
                    text-transform: uppercase !important;
                    border-bottom: 1px solid ${vo.borderStrong} !important;
                    border-radius: 0px !important;
                }
                #cms-pro-layout .ant-table-tbody > tr > td {
                    border-bottom: 1px solid ${vo.border} !important;
                    font-size: 12px !important;
                }
                #cms-pro-layout .ant-table-tbody > tr:hover > td {
                    background: ${vo.hoverBg} !important;
                }
                #cms-pro-layout .ant-btn,
                #cms-pro-layout .ant-input,
                #cms-pro-layout .ant-input-affix-wrapper,
                #cms-pro-layout .ant-select-selector,
                #cms-pro-layout .ant-tag,
                #cms-pro-layout .ant-modal-content {
                    border-radius: 0px !important;
                }
                #cms-pro-layout .ant-tag {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10px !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                }

                /* VO IconButton (footer actions) */
                .vo-icon-btn {
                    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
                }
                .vo-icon-btn:hover {
                    background: ${vo.selectedBg} !important;
                    border-color: ${vo.selectedBorder} !important;
                    color: ${vo.text} !important;
                }

                /* Align PageContainer title and subtitle by baseline */
                .ant-page-header-heading-left {
                    align-items: baseline !important;
                }
            `}</style>
        </div>
    );
}
