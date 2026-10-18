"use client";

import React from "react";
import {
    BarChart3,
    Bot,
    Calculator,
    CheckSquare,
    FileText,
    FolderOpen,
    MessageSquare,
    Terminal,
    Trophy,
    Music,
    Gamepad2,
    Compass,
    Cpu,
    Hexagon,
    Box,
    CloudSun,
    Search,
    Settings,
    ExternalLink,
    Plus,
} from "lucide-react";
import {
    FileAddOutlined,
    FileTextOutlined,
    HistoryOutlined,
    PlusOutlined,
    StarOutlined,
    AppstoreOutlined,
    DashboardOutlined,
    SafetyCertificateOutlined,
    CodeSandboxOutlined,
    HomeOutlined,
    PushpinOutlined,
} from "@ant-design/icons";
import { Avatar, Typography } from "antd";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";
import menuConfig from "@/config/menuConfig";
import { ORANGE } from "./adminLayoutConstants";
import type { VOTheme } from "./voTheme";

const { Text } = Typography;

export interface CMSLayoutProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    subTitle?: React.ReactNode;
    extra?: React.ReactNode[];
    breadcrumb?: { title: string; path?: string }[];
}


export const LEFT_DOCK_WIDGETS = [
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

export const BOTTOM_DOCK_WIDGETS = [
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

export const ALL_DOCK_META: Record<string, { color: string; code: string; route?: string; desc: string }> = {
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

export const findMenuItemByPath = (routes: any[], path: string): any => {
    for (const route of routes) {
        if (route.path === path) return route;
        if (route.routes) {
            const found = findMenuItemByPath(route.routes, path);
            if (found) return found;
        }
    }
    return null;
};

export const getInnerMenuRoutes = (segment: string, pinned: any[], starred: any[]) => {
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

export const BREADCRUMB_LABELS: Record<string, string> = {
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

export function generateBreadcrumb(pathname: string): { title: string; path?: string }[] {
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

export const AppListContent = ({ darkMode }: { darkMode: boolean }) => {
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
export function buildAntMenuItems(
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

