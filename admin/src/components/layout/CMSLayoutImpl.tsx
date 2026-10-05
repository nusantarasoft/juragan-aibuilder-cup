"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import FloatingOrbMenu from "../dock/FloatingOrbMenu";
import {
    LogoutOutlined,
    SearchOutlined,
    InfoCircleFilled,
    QuestionCircleFilled,
    SettingOutlined,
    HomeOutlined,
    FileTextOutlined,
    PushpinOutlined,
    PushpinFilled,
    StarOutlined,
    StarFilled,
    HistoryOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    FileAddOutlined,
    AppstoreOutlined,
    RobotOutlined,
    DeleteOutlined,
    ShareAltOutlined,
    CopyOutlined,
    SwapOutlined,
    UserOutlined,
    DownOutlined,
    MenuOutlined,
    CloseOutlined,
    TeamOutlined,
    GlobalOutlined,
    CodeOutlined,
    DashboardOutlined,
    SafetyCertificateOutlined,
    BellOutlined,
    CodeSandboxOutlined,
} from "@ant-design/icons";
import {
    PageContainer,
    ProCard,
    ProConfigProvider,
    ProLayout,
} from "@ant-design/pro-components";
import {
    ConfigProvider,
    Dropdown,
    Input,
    theme,
    Popover,
    Avatar,
    Typography,
    Button,
    Tooltip,
    message,
    Popconfirm,
    Divider,
    Badge,
    Segmented,
} from "antd";
import AIStudioDrawer from "./AIStudioDrawer";
import AgentSessionOverlay from "@/components/agent-session/AgentSessionOverlay";
import CommandPalette from "../common/CommandPalette";
import ThemeDrawer from "./ThemeDrawer";
import { useRouter, usePathname } from "next/navigation";
import menuConfig from "@/config/menuConfig";
import GlitchText from "@/components/react-bits/GlitchText";
import { usePreferencesStore, hexToRgb } from "@/store/usePreferencesStore";
import NotificationBell from "@/components/common/NotificationBell";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import LiveCursors from "@/components/common/LiveCursors";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useDockStore } from "@/store/useDockStore";
import ModuleIllustrationCards from "./ModuleIllustrationCards";
import OnlineUsersAvatars, { SIDER_FOOTER_ROW_HEIGHT } from "./OnlineUsersAvatars";
import { MacWaveDock } from "../dock/MacWaveDock";
import { getVOTheme } from "./voTheme";
import { TamagotchiGlobal } from "../helper/TamagotchiGlobal";
import LeftDockToolbar from "./LeftDockToolbar";
// Dynamic import for MetaBalls to prevent SSR crash (ogl WebGL library requires browser)
const MetaBalls = dynamic(
    () => import("@/components/react-bits/MetaBalls"),
    { ssr: false }
);
import { SpeedDial } from 'primereact/speeddial';
import DockWindow from "@/components/dock/DockWindow";
import AthanWidget from "@/components/dock/widgets/AthanWidget";
import CalculatorWidget from "@/components/dock/widgets/CalculatorWidget";
import NotesWidget from "@/components/dock/widgets/NotesWidget";
import CalendarWidget from "@/components/dock/widgets/CalendarWidget";
import SnakeWidget from "@/components/dock/widgets/SnakeWidget";
import PongWidget from "@/components/dock/widgets/PongWidget";

const { Text } = Typography;

// MacDock widget data for the left dock items (Productivity)
const LEFT_DOCK_WIDGETS = [
    { id: 'notes', label: 'Notes', icon: '📝', width: 400, height: 500 },
    { id: 'tasks', label: 'Tasks', icon: '✅', width: 350, height: 450 },
    { id: 'calendar', label: 'Calendar', icon: '📅', width: 350, height: 400 },
    { id: 'clock', label: 'Clock', icon: '⏱️', width: 300, height: 350 },
    { id: 'contacts', label: 'Contacts', icon: '👤', width: 350, height: 500 },
    { id: 'email', label: 'Mail', icon: '📧', width: 450, height: 600 },
    { id: 'files', label: 'Files', icon: '📁', width: 500, height: 400 },
    { id: 'messages', label: 'Messages', icon: '💬', width: 400, height: 550 },
] as const;

// MacDock widget data for the bottom dock items
const BOTTOM_DOCK_WIDGETS = [
    { id: 'analytics', label: 'Analytics', icon: '📊', width: 600, height: 400 },
    { id: 'calculator', label: 'Calculator', icon: '🧮', width: 320, height: 480 },
    { id: 'terminal', label: 'Terminal', icon: '💻', width: 600, height: 400 },
    { id: 'snake', label: 'Snake', icon: '🐍', width: 450, height: 600 },
    { id: 'pong', label: 'Pong', icon: '🏓', width: 450, height: 500 },
    { id: 'athan', label: 'Athan', icon: '🧭', width: 350, height: 450 },
    { id: 'robot', label: 'AI Assistant', icon: '🤖', width: 400, height: 600 },
    { id: 'weather', label: 'Weather', icon: '⛅', width: 350, height: 350 },
    { id: 'music', label: 'Music', icon: '🎵', width: 350, height: 450 },
    { id: 'settings', label: 'Settings', icon: '⚙️', width: 500, height: 500 },
    { id: 'add-widget', label: 'Add Widget', icon: '➕', width: 400, height: 300 },
] as const;

// Search Input Component for Header
const SearchInput = () => {
    const { token } = theme.useToken();
    return (
        <div
            key="SearchOutlined"
            aria-hidden
            style={{
                display: "flex",
                alignItems: "center",
                marginInlineEnd: 24,
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
        >
            <Input
                style={{
                    borderRadius: 4,
                    marginInlineEnd: 12,
                    backgroundColor: token.colorBgTextHover,
                }}
                prefix={
                    <SearchOutlined
                        style={{
                            color: token.colorTextLightSolid,
                        }}
                    />
                }
                placeholder="Search..."
                variant="borderless"
            />
        </div>
    );
};

// AppList data
const appList = [
    {
        key: "cms",
        icon: "https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg",
        title: "Nusantarasoft CMS",
        desc: "Content Management System",
        url: "/admin",
    },
    {
        key: "pm",
        icon: "https://gw.alipayobjects.com/zos/bmw-prod/d3e3eb39-1cd7-4aa5-827c-877deced6b7e/kvx8snxc_w283_h280.png",
        title: "Project Management",
        desc: "PMBOK & Agile Tracker",
        url: "/admin/pm/dashboard",
    },
    {
        key: "crm",
        icon: "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
        title: "CRM Suite",
        desc: "Sales & Client Tracking",
        url: "/admin/crm/dashboard",
    },
    {
        key: "landing",
        icon: "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
        title: "Landing Page",
        desc: "Public website",
        url: "/",
    },
];

// Helper to find menu item by path
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

// Dummy inner menu routes based on selected segment
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
            return [
                { path: "/admin/pages/builder", name: "Create New Page", icon: <PlusOutlined /> },
            ];
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
            return pinned.map(item => ({
                path: item.path,
                name: typeof item.name === 'string' ? item.name : 'Untitled Item',
                icon: resolveIcon(item.path, <PushpinOutlined />)
            }));
        case "starred":
            return starred.map(item => ({
                path: item.path,
                name: typeof item.name === 'string' ? item.name : 'Untitled Item',
                icon: resolveIcon(item.path, <StarOutlined />)
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

// Get active parent module based on current pathname
const getActiveParentModule = (pathname: string): { name: string; path: string; icon: React.ReactNode; routes: any[] } | null => {
    if (!menuConfig?.route?.routes) return null;
    for (const route of menuConfig.route.routes) {
        if (route.routes && route.routes.length > 0 && pathname.startsWith(route.path)) {
            return {
                name: route.name,
                path: route.path,
                icon: route.icon,
                routes: route.routes.map((r: any) => ({
                    path: r.path,
                    name: r.name,
                    icon: r.icon,
                    isLeaf: r.isLeaf,
                })),
            };
        }
    }
    return null;
};

interface CMSLayoutProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    subTitle?: React.ReactNode;
    extra?: React.ReactNode[];
    breadcrumb?: { title: string; path?: string }[];
}

// Generate breadcrumb items from pathname
function generateBreadcrumb(pathname: string): { title: string; path?: string }[] {
    const segments = pathname.split("/").filter(Boolean);
    const items: { title: string; path?: string }[] = [
        { title: "Home", path: "/admin/dashboard" },
    ];

    let currentPath = "";
    segments.forEach((segment) => {
        if (segment === "admin") return;
        currentPath += `/${segment}`;
        const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        items.push({ title, path: `/admin${currentPath}` });
    });

    return items;
}

// App List Popover Content
const AppListContent = ({ darkMode }: { darkMode: boolean }) => {
    const router = useRouter();
    return (
        <div style={{ width: 280, padding: 8 }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
            }}>
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
                            padding: 12,
                            borderRadius: 8,
                            background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                            transition: "all 0.2s",
                            textAlign: "center",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = darkMode
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.06)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = darkMode
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.02)";
                        }}
                    >
                        <Avatar
                            src={app.icon}
                            size={36}
                            style={{ marginBottom: 8 }}
                        />
                        <div>
                            <Text strong style={{
                                display: "block",
                                fontSize: 12,
                                color: darkMode ? "#fff" : "#000",
                            }}>
                                {app.title}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                {app.desc}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Shared header height for alignment
const HEADER_HEIGHT = 56;
// Collapsed widths
const OUTER_COLLAPSED_WIDTH = 64;
const INNER_COLLAPSED_WIDTH = 80;

export default function CMSLayoutImpl({
    children,
    title,
    subTitle,
    extra,
    breadcrumb,
}: CMSLayoutProps) {
    const router = useRouter();
    const currentPath = usePathname();
    const [pathname, setPathname] = useState(currentPath || "/admin/dashboard");

    React.useEffect(() => {
        if (currentPath) {
            setPathname(currentPath);
        }
    }, [currentPath]);
    const [innerCollapsed, setInnerCollapsed] = useState(false); // Default expanded
    const [outerCollapsed, setOuterCollapsed] = useState(false);
    
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

    const { dockMode, setDockMode, windows: dockWindows, openWindow: openDockWindow } = useDockStore();

    const [darkMode, setDarkMode] = useState(false);
    const [appListOpen, setAppListOpen] = useState(false);
    const [showBackground, setShowBackground] = useState(true);
    const [aiStudioVisible, setAIStudioVisible] = useState(false);
    const [themeDrawerVisible, setThemeDrawerVisible] = useState(false);
    const { themePalette } = usePreferencesStore();
    const themeColor = themePalette.primary;
    // Virtual Office HUD look for sidemenus / docks / orb menu
    const vo = getVOTheme(darkMode);
    const { cursors } = useWebSocketStore();

    // Controlled openKeys to prevent submenu collapse on navigation
    const [openKeys, setOpenKeys] = useState<string[]>(() => {
        // Compute initial open keys from current path
        const path = currentPath || '/admin/dashboard';
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

    // Starrring logic
    const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://127.0.0.1:4001/graphql";

    const fetchStars = React.useCallback(async () => {
        try {
            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query GetUserStars($userId: String!) {
                            userStars(userId: $userId) {
                                id
                                path
                                name
                                icon
                            }
                        }
                    `,
                    variables: { userId: "current-user-id" },
                }),
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.data?.userStars) {
                setStarred(result.data.userStars);
            }
        } catch (e) {
            console.error("Failed to fetch stars", e);
        }
    }, [setStarred]);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            fetchStars();
        }
    }, [pathname, fetchStars]);

    const handleToggleStar = async () => {
        const menuItem = findMenuItemByPath(menuConfig.route.routes, pathname);
        const name = (typeof title === 'string' ? title : menuItem?.name) || "Untitled Page";
        
        try {
            const isStarredNow = starredItems.some(i => i.path === pathname);
            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation ToggleStar($userId: String!, $input: ToggleStarInput!) {
                            toggleStar(userId: $userId, input: $input) {
                                id
                                path
                                name
                                icon
                            }
                        }
                    `,
                    variables: {
                        userId: "current-user-id",
                        input: {
                            path: pathname,
                            name: name,
                        }
                    }
                }),
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            await fetchStars();
            message.success(isStarredNow ? "Removed from favorites" : "Added to favorites");
        } catch (e) {
            message.error("Failed to update favorite");
        }
    };

    const handleTogglePin = () => {
        const menuItem = findMenuItemByPath(menuConfig.route.routes, pathname);
        const name = (typeof title === 'string' ? title : menuItem?.name) || "Untitled Page";
        togglePinned({ path: pathname, name });
        message.success(isPinned(pathname) ? "Unpinned from sidebar" : "Pinned to sidebar");
    };

    // Sidebar Actions Component (Language, Notification, Theme) - for outer ProLayout actionsRender
    const SidebarActions = () => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: outerCollapsed ? "center" : "space-evenly", flexDirection: outerCollapsed ? "column" : "row", gap: outerCollapsed ? 12 : 0, width: "100%" }}>
            <LanguageSwitcher isDark={darkMode} />
            <div onClick={() => setThemeDrawerVisible(true)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: vo.textMuted, borderRadius: 10 }} className="vo-icon-btn">
                <SettingOutlined style={{ fontSize: 16 }} />
            </div>
            <NotificationBell />
            <Dropdown
                key="account-menu"
                menu={{
                    items: [
                        {
                            key: 'settings',
                            icon: <SettingOutlined />,
                            label: 'Account Settings',
                        },
                        {
                            key: 'switch',
                            icon: <SwapOutlined />,
                            label: 'Sign in another account',
                        },
                        {
                            type: 'divider',
                        },
                        {
                            key: 'logout',
                            icon: <LogoutOutlined />,
                            label: 'Sign Out',
                            danger: true,
                        },
                    ],
                    onClick: ({ key }) => {
                        if (key === 'logout') {
                            message.success('Signed out successfully');
                        } else if (key === 'settings') {
                            message.info('Navigating to settings...');
                        } else if (key === 'switch') {
                            message.info('Switching account...');
                        }
                    }
                }}
                trigger={['click']}
                placement="bottomRight"
            >
                <div style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    transition: 'all 0.2s',
                    color: vo.textMuted,
                }}
                className="vo-icon-btn"
                >
                    <Avatar icon={<UserOutlined />} size="small" style={{ background: vo.accentGradient, width: 24, height: 24, lineHeight: "24px", border: `1px solid ${vo.border}` }} />
                </div>
            </Dropdown>
        </div>
    );

    // Pin/Star/Share Actions Component - for PageContainer extra
    const PinStarShareActions = () => (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 16 }}>
            <Tooltip title={isPinned(pathname) ? "Unpin from sidebar" : "Pin to sidebar"}>
                <Button
                    type="text"
                    className="flex items-center justify-center"
                    style={{ width: 32, height: 32 }}
                    icon={
                        <PushpinOutlined 
                            style={{ 
                                color: isPinned(pathname) ? "#52c41a" : undefined, 
                                fontSize: 18 
                            }} 
                        />
                    }
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin();
                    }}
                />
            </Tooltip>
            <Divider orientation="vertical" style={{ height: 16, margin: '0 2px', background: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
            <Tooltip title={isStarred(pathname) ? "Remove from favorites" : "Add to favorites"}>
                <Button
                    type="text"
                    className="flex items-center justify-center"
                    style={{ width: 32, height: 32 }}
                    icon={
                        <StarOutlined 
                            style={{ 
                                color: isStarred(pathname) ? "#fadb14" : undefined, 
                                fontSize: 18 
                            }} 
                        />
                    }
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar();
                    }}
                />
            </Tooltip>
            <Divider orientation="vertical" style={{ height: 16, margin: '0 2px', background: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
            <Popover
                content={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <Input 
                            value={typeof window !== "undefined" ? window.location.href : pathname} 
                            readOnly 
                            style={{ width: 250 }} 
                        />
                        <Button 
                            icon={<CopyOutlined />} 
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    await navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
                                    message.success("Link copied to clipboard!");
                                } catch (err) {
                                    message.error("Failed to copy link");
                                }
                            }}
                        >
                            Copy
                        </Button>
                    </div>
                }
                title="Share this page"
                trigger="click"
                placement="bottomRight"
            >
                <Tooltip title="Share">
                    <Button
                        type="text"
                        className="flex items-center justify-center"
                        style={{ width: 32, height: 32 }}
                        icon={
                            <ShareAltOutlined 
                                style={{ 
                                    color: themeColor,
                                    fontSize: 18 
                                }} 
                            />
                        }
                        onClick={(e) => e.stopPropagation()}
                    />
                </Tooltip>
            </Popover>
        </div>
    );

    // Entry point to the 3D Virtual Office (AI Agents) — rendered at the far right of the page header
    const virtualOfficeButton = (
        <Tooltip key="virtual-office" title="Enter the 3D Virtual Office (AI Agents)" placement="bottomRight">
            <Button
                type="primary"
                icon={<CodeSandboxOutlined />}
                onClick={(e) => {
                    e.stopPropagation();
                    router.push("/admin/virtual-office");
                }}
                style={{
                    marginLeft: 8,
                    height: 32,
                    borderRadius: 10,
                    fontWeight: 600,
                    border: "none",
                    background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
                    boxShadow: "0 6px 18px -6px rgba(99, 102, 241, 0.6)",
                }}
            >
                Virtual Office
            </Button>
        </Tooltip>
    );

    React.useEffect(() => {
        usePreferencesStore.persist.rehydrate();
    }, []);

    // Initialize preferences from localStorage and system preferences
    React.useEffect(() => {
        // Get saved preferences from localStorage
        const savedInnerCollapsed = localStorage.getItem("cms-inner-collapsed");
        const savedOuterCollapsed = localStorage.getItem("cms-outer-collapsed");
        const savedDarkMode = localStorage.getItem("cms-dark-mode");
        const savedShowBackground = localStorage.getItem("cms-show-background");

        // Inner sidebar: use saved preference, default to collapsed (true)
        if (savedInnerCollapsed !== null) {
            setInnerCollapsed(savedInnerCollapsed === "true");
        }
        // If no saved preference, keep the default (true = collapsed)

        // Outer sidebar: use saved preference, default to expanded (false)
        if (savedOuterCollapsed !== null) {
            setOuterCollapsed(savedOuterCollapsed === "true");
        }

        // Dark mode: use saved preference, or fall back to system preference
        if (savedDarkMode !== null) {
            setDarkMode(savedDarkMode === "true");
        } else {
            // Check system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setDarkMode(prefersDark);
        }

        // Background toggle: use saved preference, default to true
        if (savedShowBackground !== null) {
            setShowBackground(savedShowBackground === "true");
        }
    }, []);

    // Listen for system theme changes
    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            // Only auto-switch if user hasn't set a preference
            const savedDarkMode = localStorage.getItem("cms-dark-mode");
            if (savedDarkMode === null) {
                setDarkMode(e.matches);
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    // Listen for custom events from CommandPalette quick actions
    React.useEffect(() => {
        const handleToggleTheme = () => handleDarkModeChange(!darkMode);
        const handleOpenAI = () => setAIStudioVisible(true);
        document.addEventListener("toggle-dark-mode", handleToggleTheme);
        document.addEventListener("open-ai-studio", handleOpenAI);
        return () => {
            document.removeEventListener("toggle-dark-mode", handleToggleTheme);
            document.removeEventListener("open-ai-studio", handleOpenAI);
        };
    }, [darkMode]);

    // Ref to track if initial ProLayout setup has completed
    // ProLayout calls onCollapse during mount, so we delay allowing saves
    const hasInitialized = React.useRef(false);

    // Set hasInitialized after a delay to let ProLayout finish its initial render
    React.useEffect(() => {
        const timer = setTimeout(() => {
            hasInitialized.current = true;
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Ref to track theme transitions (blocks onCollapse during dark mode change)
    const isTransitioning = React.useRef(false);

    // Handler for inner sidebar collapse - ignores calls during initialization and theme transitions
    const handleInnerCollapse = React.useCallback((collapsed: boolean) => {
        if (!hasInitialized.current || isTransitioning.current) {
            // Ignore ProLayout's initialization and theme transition calls
            return;
        }
        setInnerCollapsed(collapsed);
        localStorage.setItem("cms-inner-collapsed", String(collapsed));
    }, []);

    // Handler for outer sidebar collapse - ignores calls during initialization and theme transitions
    const handleOuterCollapse = React.useCallback((collapsed: boolean) => {
        if (!hasInitialized.current || isTransitioning.current) {
            // Ignore ProLayout's initialization and theme transition calls
            return;
        }
        setOuterCollapsed(collapsed);
        localStorage.setItem("cms-outer-collapsed", String(collapsed));
    }, []);

    // Handler for dark mode toggle - saves to localStorage and updates document class
    // Uses isTransitioning ref to block ProLayout's onCollapse calls during theme change
    const handleDarkModeChange = (dark: boolean) => {
        // Block onCollapse calls during theme transition  
        isTransitioning.current = true;

        setDarkMode(dark);
        localStorage.setItem("cms-dark-mode", String(dark));
        // Toggle dark class on documentElement for Tailwind CSS
        if (dark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Re-enable onCollapse after ProLayout re-renders
        setTimeout(() => {
            isTransitioning.current = false;
        }, 500);
    };

    // Sync dark class and theme color CSS variable on initial hydration
    React.useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [darkMode]);

    // Sync full theme palette as CSS variables on documentElement
    React.useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--theme-color', themePalette.primary);
        root.style.setProperty('--theme-secondary', themePalette.secondary);
        root.style.setProperty('--theme-accent', themePalette.accent);
        root.style.setProperty('--theme-sidebar-bg', themePalette.sidebarBg);
        root.style.setProperty('--theme-header-bg', themePalette.headerBg);
        // RGB variants for rgba() usage
        const pRgb = hexToRgb(themePalette.primary);
        root.style.setProperty('--theme-color-rgb', `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`);
        const sRgb = hexToRgb(themePalette.secondary);
        root.style.setProperty('--theme-secondary-rgb', `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`);
        const aRgb = hexToRgb(themePalette.accent);
        root.style.setProperty('--theme-accent-rgb', `${aRgb.r}, ${aRgb.g}, ${aRgb.b}`);
    }, [themePalette]);

    // Force sticky sidebar for inner layout (Removed custom hack, using fixSiderbar)
    React.useEffect(() => {
        // We let ProLayout handle its own fixed layout
    }, [pathname, innerCollapsed]);
    // Force menu icons visible in collapsed mode for OUTER sidebar.
    // Ant's CSS-in-JS hides .ant-menu-title-content (opacity:0, max-width:0px, overflow:hidden)
    // for collapsed menus. We override with element.style.setProperty which beats all CSS.
    const collapsedFixProps = ['overflow', 'display', 'align-items', 'justify-content', 'padding-inline', 'opacity', 'max-width', 'gap'];
    React.useEffect(() => {
        if (!outerCollapsed) {
            // Clean up only the properties we added, not React inline styles
            document.querySelectorAll('[data-collapsed-fix]').forEach(el => {
                const s = (el as HTMLElement).style;
                collapsedFixProps.forEach(p => s.removeProperty(p));
                (el as HTMLElement).removeAttribute('data-collapsed-fix');
            });
            // Also clean up child elements
            document.querySelectorAll('[data-collapsed-child-fix]').forEach(el => {
                const s = (el as HTMLElement).style;
                collapsedFixProps.forEach(p => s.removeProperty(p));
                s.removeProperty('width');
                (el as HTMLElement).removeAttribute('data-collapsed-child-fix');
            });
            return;
        }

        const fixTitleContent = (tc: HTMLElement) => {
            tc.style.setProperty('opacity', '1', 'important');
            tc.style.setProperty('max-width', 'none', 'important');
            tc.style.setProperty('overflow', 'visible', 'important');
            tc.style.setProperty('display', 'inline-flex', 'important');
            tc.style.setProperty('align-items', 'center', 'important');
            tc.style.setProperty('justify-content', 'center', 'important');
            tc.dataset.collapsedChildFix = '1';
        };

        const fix = () => {
            const root = document.getElementById('cms-pro-layout');
            if (!root) return;

            // Fix SUBMENU items (parents with children)
            root.querySelectorAll('.ant-menu-submenu > .ant-menu-submenu-title').forEach(title => {
                const t = title as HTMLElement;
                if (t.closest('.cms-inner-sider')) return;
                t.style.setProperty('overflow', 'visible', 'important');
                t.style.setProperty('display', 'flex', 'important');
                t.style.setProperty('align-items', 'center', 'important');
                t.style.setProperty('justify-content', 'center', 'important');
                t.style.setProperty('padding-inline', 'calc(50% - 8px)', 'important');
                t.dataset.collapsedFix = '1';

                t.querySelectorAll('.ant-menu-title-content').forEach(tc => fixTitleContent(tc as HTMLElement));
                t.querySelectorAll('.submenu-text-el').forEach(txt => {
                    (txt as HTMLElement).style.setProperty('display', 'none', 'important');
                    (txt as HTMLElement).dataset.collapsedChildFix = '1';
                });
                t.querySelectorAll('.submenu-item-wrapper').forEach(w => {
                    const s = (w as HTMLElement).style;
                    s.setProperty('justify-content', 'center', 'important');
                    s.setProperty('gap', '0', 'important');
                    (w as HTMLElement).dataset.collapsedChildFix = '1';
                });
                t.querySelectorAll('.ant-menu-submenu-arrow').forEach(a => {
                    (a as HTMLElement).style.setProperty('display', 'none', 'important');
                    (a as HTMLElement).dataset.collapsedChildFix = '1';
                });
            });

            // Fix LEAF menu items (no children, e.g. Dashboard, Media Library, AI Studio)
            root.querySelectorAll('.cms-outer-sider .ant-menu-item').forEach(menuItem => {
                const mi = menuItem as HTMLElement;
                if (mi.closest('.cms-inner-sider')) return;
                mi.style.setProperty('overflow', 'visible', 'important');
                mi.style.setProperty('display', 'flex', 'important');
                mi.style.setProperty('align-items', 'center', 'important');
                mi.style.setProperty('justify-content', 'center', 'important');
                mi.style.setProperty('padding-inline', 'calc(50% - 8px)', 'important');
                mi.dataset.collapsedFix = '1';

                mi.querySelectorAll('.ant-menu-title-content').forEach(tc => fixTitleContent(tc as HTMLElement));
                mi.querySelectorAll('.menuitem-text-el').forEach(txt => {
                    (txt as HTMLElement).style.setProperty('display', 'none', 'important');
                    (txt as HTMLElement).dataset.collapsedChildFix = '1';
                });
                mi.querySelectorAll('.menuitem-wrapper').forEach(w => {
                    const s = (w as HTMLElement).style;
                    s.setProperty('justify-content', 'center', 'important');
                    s.setProperty('gap', '0', 'important');
                    (w as HTMLElement).dataset.collapsedChildFix = '1';
                });
            });
        };

        const id = setInterval(fix, 300);
        fix();
        return () => clearInterval(id);
    }, [outerCollapsed]);

    // Force inner sidebar icons visible in collapsed mode
    React.useEffect(() => {
        if (!innerCollapsed) {
            document.querySelectorAll('[data-inner-collapsed-fix]').forEach(el => {
                const s = (el as HTMLElement).style;
                collapsedFixProps.forEach(p => s.removeProperty(p));
                (el as HTMLElement).removeAttribute('data-inner-collapsed-fix');
            });
            return;
        }

        const fixInner = () => {
            const innerSider = document.querySelector('.cms-inner-sider');
            if (!innerSider) return;
            innerSider.querySelectorAll('.ant-menu-item').forEach(menuItem => {
                const mi = menuItem as HTMLElement;
                mi.style.setProperty('overflow', 'visible', 'important');
                mi.style.setProperty('display', 'flex', 'important');
                mi.style.setProperty('align-items', 'center', 'important');
                mi.style.setProperty('justify-content', 'center', 'important');
                mi.dataset.innerCollapsedFix = '1';
                mi.querySelectorAll('.ant-menu-title-content').forEach(tc => {
                    const s = (tc as HTMLElement).style;
                    s.setProperty('opacity', '1', 'important');
                    s.setProperty('max-width', 'none', 'important');
                    s.setProperty('overflow', 'visible', 'important');
                    s.setProperty('display', 'inline-flex', 'important');
                    s.setProperty('align-items', 'center', 'important');
                    s.setProperty('justify-content', 'center', 'important');
                    (tc as HTMLElement).dataset.innerCollapsedFix = '1';
                });
            });
        };

        const id = setInterval(fixInner, 300);
        fixInner();
        return () => clearInterval(id);
    }, [innerCollapsed]);

    // Auto-generate breadcrumb if not provided
    const breadcrumbItems = breadcrumb || generateBreadcrumb(currentPath || "/admin/dashboard");

    // Get inner menu based on selected segment
    const innerRoutes = getInnerMenuRoutes(selectedSegment, pinnedItems, starredItems);

    // Segmented options
    const segmentedOptions = [
        { value: "new", icon: <PlusOutlined /> },
        { value: "recent", icon: <ClockCircleOutlined /> },
        { value: "pinned", icon: <PushpinOutlined /> },
        { value: "starred", icon: <StarOutlined /> },
        { value: "history", icon: <HistoryOutlined /> },
    ];

    // Dynamic logo based on theme
    const logoSrc = darkMode ? "/logo-white.png" : "/logo-black.png";

    return (
        <div
            id="cms-pro-layout"
            style={{
                height: "100vh",
            }}
        >
            <ProConfigProvider hashed={false} dark={darkMode}>
                <ConfigProvider
                    getTargetContainer={() => {
                        return document.getElementById("cms-pro-layout") || document.body;
                    }}
                    theme={{
                        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                        cssVar: { prefix: 'cms' },
                        hashed: false,
                        token: {
                            colorPrimary: themePalette.primary,
                            colorLink: themePalette.accent,
                            colorInfo: themePalette.secondary,
                        },
                    }}
                >
                    {/* OUTER PROLAYOUT - Main section navigation */}
                    <ProLayout
                        prefixCls="cms-outer"
                        title=""
                        logo={logoSrc}
                        {...menuConfig}
                        location={{
                            pathname,
                        }}
                        fixSiderbar
                        collapsed={outerCollapsed}
                        breakpoint={false}
                        onCollapse={handleOuterCollapse}
                        headerRender={false}
                        siderWidth={260}
                        navTheme={darkMode ? "realDark" : "light"}
                        token={{ sider: { colorMenuBackground: vo.surfaceStrong, colorTextMenu: vo.textMuted, colorTextMenuSelected: vo.text, colorBgMenuItemSelected: vo.selectedBg, colorTextMenuItemHover: vo.text, colorBgMenuItemHover: vo.hoverBg, colorTextMenuSecondary: vo.textDim, colorTextMenuTitle: vo.text } }}
                        layout="side"
                        contentStyle={{
                            padding: 0,
                            margin: 0,
                        }}
                        menuHeaderRender={false}

                        menuDataRender={(menuData) => {
                            // Ensure icons from menuConfig are preserved on all items
                            // ProLayout may strip icons from submenu parents during transformation
                            const attachIcons = (items: any[]): any[] => {
                                return items.map(item => {
                                    const route = findMenuItemByPath(menuConfig.route.routes, item.path || '');
                                    const result = { ...item };
                                    if (route?.icon && !result.icon) {
                                        result.icon = route.icon;
                                    }
                                    if (result.children) {
                                        result.children = attachIcons(result.children);
                                    }
                                    if (result.routes) {
                                        result.routes = attachIcons(result.routes);
                                    }
                                    return result;
                                });
                            };
                            return attachIcons(menuData).filter(item => 
                                item.path !== "/admin/dashboard" && item.path !== "/admin/activity"
                            );
                        }}
                        menuProps={{
                            openKeys,
                            onOpenChange: (keys) => setOpenKeys(keys as string[]),
                        }}
                        menuExtraRender={() => {
                            const isDashboard = pathname === "/admin/dashboard";
                            const isActivity = pathname === "/admin/activity";
                            return (
                            <>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: outerCollapsed ? "center" : "space-between",
                                minHeight: 52,
                                padding: outerCollapsed ? "8px 4px" : "0 12px",
                                gap: outerCollapsed ? 6 : 0,
                                borderBottom: `1px solid ${vo.border}`,
                                boxSizing: "border-box",
                                flexDirection: outerCollapsed ? "column" : "row",
                            }}>
                                {/* Left: App Switcher + Logo + NS */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: outerCollapsed ? "column" : "row" }}>
                                    <Popover
                                        content={<AppListContent darkMode={darkMode} />}
                                        trigger="click"
                                        placement={outerCollapsed ? "rightTop" : "bottomLeft"}
                                        open={appListOpen}
                                        onOpenChange={setAppListOpen}
                                    >
                                        {/* VO identity tile (same as the Virtual Office TopBar logo tile) */}
                                        <div style={{
                                            cursor: "pointer",
                                            width: 28,
                                            height: 28,
                                            borderRadius: 10,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: vo.accentGradient,
                                            color: "#ffffff",
                                            boxShadow: vo.accentGlow,
                                            transition: "transform 0.2s, filter 0.2s",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
                                        >
                                            <AppstoreOutlined style={{ fontSize: 14 }} />
                                        </div>
                                    </Popover>
                                    <Image
                                        src={logoSrc}
                                        alt="Logo"
                                        width={22}
                                        height={22}
                                        style={{ objectFit: "contain", cursor: "pointer" }}
                                        onClick={() => router.push("/admin/dashboard")}
                                    />
                                    {!outerCollapsed && (
                                        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '1.5px', lineHeight: '20px', display: 'flex', alignItems: 'center' }}>
                                            <GlitchText speed={0.5} enableShadows={true} color={darkMode ? '#ffffff' : '#333333'} glitchColor1={themePalette.accent} glitchColor2={themePalette.secondary}>
                                                NS
                                            </GlitchText>
                                        </div>
                                    )}
                                    {outerCollapsed && (
                                        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.5px', lineHeight: '14px' }}>
                                            <GlitchText speed={0.5} enableShadows={true} color={darkMode ? '#ffffff' : '#333333'} glitchColor1={themePalette.accent} glitchColor2={themePalette.secondary}>
                                                NS
                                            </GlitchText>
                                        </div>
                                    )}
                                </div>
                                {/* Right: Quick-action icon circles */}
                                <div style={{ display: "flex", alignItems: "center", gap: 4, flexDirection: outerCollapsed ? "column" : "row", marginTop: outerCollapsed ? 4 : 0 }}>
                                    <AnimatedThemeToggler isDark={darkMode} onThemeChange={handleDarkModeChange} size={14} style={{ color: vo.textMuted }} />
                                </div>
                            </div>
                            {/* Dashboard & Activity Feed Card (VO glass card) */}
                            <div style={{
                                background: vo.hoverBg,
                                borderRadius: 16,
                                padding: "6px",
                                border: `1px solid ${vo.border}`,
                                boxShadow: "none",
                                margin: outerCollapsed ? "8px 4px" : "12px 8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 2
                            }}>
                                {/* Dashboard Item */}
                                <div 
                                    onClick={() => { setPathname("/admin/dashboard"); router.push("/admin/dashboard"); }}
                                    style={{
                                        padding: "9px 11px",
                                        borderRadius: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        background: isDashboard ? vo.selectedBg : "transparent",
                                        border: `1px solid ${isDashboard ? vo.selectedBorder : "transparent"}`,
                                        color: isDashboard ? vo.text : vo.textMuted,
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { if (!isDashboard) { e.currentTarget.style.background = vo.hoverBg; e.currentTarget.style.borderColor = vo.border; e.currentTarget.style.color = vo.text; } }}
                                    onMouseLeave={(e) => { if (!isDashboard) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = vo.textMuted; } }}
                                >
                                    <DashboardOutlined style={{ fontSize: 16, color: isDashboard ? vo.accent : "inherit" }} />
                                    {!outerCollapsed && (
                                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 13, fontWeight: isDashboard ? 600 : 500 }}>Dashboard</span>
                                            <div style={{ width: 22, height: 22, background: vo.accentSoft, border: `1px solid ${vo.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <SafetyCertificateOutlined style={{ fontSize: 11, color: vo.accent }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Activity Feed Item */}
                                <div 
                                    onClick={() => { setPathname("/admin/activity"); router.push("/admin/activity"); }}
                                    style={{
                                        padding: "9px 11px",
                                        borderRadius: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        background: isActivity ? vo.selectedBg : "transparent",
                                        border: `1px solid ${isActivity ? vo.selectedBorder : "transparent"}`,
                                        color: isActivity ? vo.text : vo.textMuted,
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { if (!isActivity) { e.currentTarget.style.background = vo.hoverBg; e.currentTarget.style.borderColor = vo.border; e.currentTarget.style.color = vo.text; } }}
                                    onMouseLeave={(e) => { if (!isActivity) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = vo.textMuted; } }}
                                >
                                    <ClockCircleOutlined style={{ fontSize: 16, color: isActivity ? vo.accent : "inherit" }} />
                                    {!outerCollapsed && (
                                        <span style={{ fontSize: 13, fontWeight: isActivity ? 600 : 500 }}>Activity Feed</span>
                                    )}
                                </div>
                            </div>
                            </>
                            );
                        }}
                        actionsRender={(props) => {
                            return [
                                <div key="sidebar-actions-wrap" style={{ boxSizing: 'border-box', width: '100%', display: 'flex' }}>
                                    <SidebarActions />
                                </div>
                            ];
                        }}
                        menuRender={(props, defaultDom) => {
                            return (
                            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                                    {defaultDom}
                                </div>
                            </div>
                        )}}
                        menuItemRender={(item, dom) => {
                            // Unified rendering for both collapsed and expanded modes.
                            // Uses classes so the useEffect can target elements precisely.
                            const route = findMenuItemByPath(menuConfig.route.routes, item.path || '');
                            const icon = route?.icon;

                            if (icon) {
                                return (
                                    <div
                                        className="menuitem-wrapper"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const targetPath = item.path || "/admin/dashboard";
                                            setPathname(targetPath);
                                            router.push(targetPath);
                                        }}
                                        onClickCapture={(e) => {
                                            const target = e.target as HTMLElement;
                                            if (target.tagName === 'A' || target.closest('a')) {
                                                e.preventDefault();
                                            }
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                                    >
                                        <span className="anticon menuitem-icon-el" style={{ display: 'inline-flex', fontSize: 16, flexShrink: 0 }}>{icon}</span>
                                        <span className="menuitem-text-el">{item.name}</span>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const targetPath = item.path || "/admin/dashboard";
                                        setPathname(targetPath);
                                        router.push(targetPath);
                                    }}
                                    onClickCapture={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.tagName === 'A' || target.closest('a')) {
                                            e.preventDefault();
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {dom}
                                </div>
                            );
                        }}
                        subMenuItemRender={(item, dom) => {
                            const route = findMenuItemByPath(menuConfig.route.routes, item.path || '');
                            const icon = route?.icon;

                            // Render a consistent structure for both collapsed and expanded modes.
                            // The useEffect handles hiding text in collapsed mode via inline styles.
                            if (icon) {
                                return (
                                    <div
                                        className="submenu-item-wrapper"
                                        onClickCapture={(e) => {
                                            const target = e.target as HTMLElement;
                                            if (target.tagName === 'A' || target.closest('a')) {
                                                e.preventDefault();
                                            }
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        <span className="anticon submenu-icon-el" style={{ display: 'inline-flex', fontSize: 16, flexShrink: 0 }}>{icon}</span>
                                        <span className="submenu-text-el">{item.name}</span>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    onClickCapture={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.tagName === 'A' || target.closest('a')) {
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    {dom}
                                </div>
                            );
                        }}


                    >
                        {/* INNER PROLAYOUT - Sub-navigation with segmented header */}
                        <ProLayout
                            prefixCls="cms-inner"
                            title=""
                            logo={false}
                            style={{ minHeight: '100vh', width: '100%' }}
                            location={{
                                pathname,
                            }}
                            route={{
                                path: "/",
                                routes: innerRoutes,
                            }}
                            hasSiderMenu={true}
                            fixSiderbar={true}
                            collapsed={innerCollapsed}
                            breakpoint={false}
                            onCollapse={handleInnerCollapse}
                            siderWidth={240}
                            navTheme={darkMode ? "realDark" : "light"}
                            token={{ sider: { colorMenuBackground: vo.surface, colorTextMenu: vo.textMuted, colorTextMenuSelected: vo.text, colorBgMenuItemSelected: vo.selectedBg, colorTextMenuItemHover: vo.text, colorBgMenuItemHover: vo.hoverBg, colorTextMenuSecondary: vo.textDim, colorTextMenuTitle: vo.text } }}
                            layout="side"
                            contentStyle={{
                                padding: 0,
                                margin: 0,
                            }}
                            menuDataRender={() => innerRoutes.length > 0 ? innerRoutes : [{ path: '/dummy', name: 'No items' }]}
                            menuHeaderRender={false}
                            menuFooterRender={(props) => (
                                <>
                                    <ModuleIllustrationCards collapsed={innerCollapsed} darkMode={darkMode} />
                                    <OnlineUsersAvatars collapsed={innerCollapsed} darkMode={darkMode} />
                                </>
                            )}
                            menuExtraRender={() => (
                                <div style={{
                                    minHeight: 48,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: innerCollapsed ? "12px 8px" : "0 16px",
                                    borderBottom: "none",
                                    boxSizing: "border-box",
                                }}>
                                    <Segmented
                                        value={selectedSegment}
                                        onChange={(value) => setSelectedSegment(value as string)}
                                        block={!innerCollapsed}
                                        size={innerCollapsed ? "large" : "middle"}
                                        vertical={innerCollapsed}
                                        options={segmentedOptions}
                                        style={{
                                            background: vo.hoverBg,
                                            border: `1px solid ${vo.border}`,
                                            borderRadius: 12,
                                            padding: 2,
                                        }}
                                    />
                                </div>
                            )}
                            actionsRender={(props) => {
                                return [];
                            }}
                            menuItemRender={(item, dom) => {
                                const isPinnedOrStarred = selectedSegment === "pinned" || selectedSegment === "starred";
                                
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                        <div
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPathname(item.path || "/admin/dashboard");
                                                if (item.path) {
                                                    router.push(item.path);
                                                }
                                            }}
                                            onClickCapture={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (target.tagName === 'A' || target.closest('a')) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            style={{ cursor: "pointer", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        >
                                            {dom}
                                        </div>
                                        {isPinnedOrStarred && !innerCollapsed && (
                                            <Popconfirm
                                                title={`Remove from ${selectedSegment}?`}
                                                onConfirm={(e) => {
                                                    e?.stopPropagation();
                                                    if (selectedSegment === "pinned") {
                                                        togglePinned({ path: item.path!, name: (item.name as string) || "" });
                                                        message.success("Removed from pinned");
                                                    } else {
                                                        toggleStarred({ path: item.path!, name: (item.name as string) || "" });
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
                                                    icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ marginLeft: 4 }}
                                                />
                                            </Popconfirm>
                                        )}
                                    </div>
                                );
                            }}
                        >
                            <PageContainer
                                title={title}
                                subTitle={subTitle}
                                extra={[...(extra || []), <PinStarShareActions key="pin-star-actions" />, virtualOfficeButton]}
                                breadcrumb={{
                                    items: breadcrumbItems.map((item, index) => ({
                                        key: index,
                                        title: index === 0 ? <HomeOutlined /> : item.title,
                                        onClick: item.path ? () => router.push(item.path!) : undefined,
                                        className: item.path ? "cursor-pointer" : "",
                                    })),
                                }}
                            >
                                <ProCard>
                                    {children}
                                </ProCard>
                            </PageContainer>
                        </ProLayout>
                    </ProLayout>
                </ConfigProvider>
            </ProConfigProvider>

            <div className="hidden md:flex" style={{
                position: 'fixed',
                top: '50%',
                transform: 'translateY(-50%)',
                left: (outerCollapsed ? OUTER_COLLAPSED_WIDTH : 260) + (innerCollapsed ? 48 : 240) + 16,
                zIndex: 50,
            }}>
                <MacWaveDock 
                    items={LEFT_DOCK_WIDGETS as any} 
                    direction="vertical" 
                    darkMode={darkMode} 
                    onItemClick={openDockWindow as any} 
                    dockWindows={dockWindows} 
                />
            </div>

            {/* Dock Widget Windows */}
            {dockWindows.map(win => !win.minimized && (
                <DockWindow
                    key={win.id}
                    id={win.id}
                    title={win.title}
                    width={win.width}
                    height={win.height}
                    zIndex={win.zIndex}
                >
                    {win.widgetType === 'athan' && <AthanWidget />}
                    {win.widgetType === 'calculator' && <CalculatorWidget />}
                    {win.widgetType === 'notes' && <NotesWidget />}
                    {win.widgetType === 'calendar' && <CalendarWidget />}
                    {win.widgetType === 'snake' && <SnakeWidget />}
                    {win.widgetType === 'pong' && <PongWidget />}
                </DockWindow>
            ))}

            {/* Bottom Dock Footer — Floating Icons */}
            <div className="hidden md:flex" style={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
            }}>
                <MacWaveDock 
                    items={BOTTOM_DOCK_WIDGETS as any} 
                    direction="horizontal" 
                    darkMode={darkMode} 
                    onItemClick={openDockWindow as any} 
                    dockWindows={dockWindows} 
                />
            </div>

            {/* AI Studio Drawer */}
            <AIStudioDrawer visible={aiStudioVisible} onClose={() => setAIStudioVisible(false)} />

            {/* AI agent session (Virtual Office → module page, ?agentSession=<id>) */}
            <AgentSessionOverlay />

            {/* Global Command Palette (Ctrl+K / Cmd+K) */}
            <CommandPalette isDark={darkMode} themeColor={themeColor} />
            <TamagotchiGlobal darkMode={darkMode} />
            <LiveCursors />

            {/* Theme Customizer Drawer */}
            <ThemeDrawer visible={themeDrawerVisible} onClose={() => setThemeDrawerVisible(false)} darkMode={darkMode} />

            {/* Floating Action Button Cluster - Bottom Right */}
            <div className="hidden md:block" style={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                zIndex: 50,
            }}>
                {/* MetaBalls animation behind cluster */}
                {/* Main Glassmorphic SpeedDial - Replaced with FloatingOrbMenu */}
                <FloatingOrbMenu darkMode={darkMode} />
            </div>

            {/* CSS for sidebar alignment */}
            <style jsx global>{`
                /* Fix margin-inline for sider-extra */
                .cms-outer-sider-extra.cms-outer-sider-extra-no-logo,
                .cms-inner-sider-extra {
                    margin-inline: 0 !important;
                }
                
                /* Adjust collapsed widths */
                .cms-outer-layout .cms-outer-sider.ant-layout-sider-collapsed {
                    width: ${OUTER_COLLAPSED_WIDTH}px !important;
                    min-width: ${OUTER_COLLAPSED_WIDTH}px !important;
                    max-width: ${OUTER_COLLAPSED_WIDTH}px !important;
                }
                
                .cms-inner-layout .cms-inner-sider.ant-layout-sider-collapsed {
                    width: ${INNER_COLLAPSED_WIDTH}px !important;
                    min-width: ${INNER_COLLAPSED_WIDTH}px !important;
                    max-width: ${INNER_COLLAPSED_WIDTH}px !important;
                }
                
                

                
                /* --- VIRTUAL OFFICE THEME (see components/layout/voTheme.ts) --- */
                
                /* Outer Menu (Primary Sidebar) — VO glass, strongest surface */
                .cms-outer-sider {
                    border-right: 1px solid ${vo.border} !important;
                    z-index: 100 !important;
                    background: ${vo.surfaceStrong} !important;
                    backdrop-filter: ${vo.blur} !important;
                    -webkit-backdrop-filter: ${vo.blur} !important;
                    box-shadow: ${vo.shadow} !important;
                }
                .cms-outer-sider .ant-layout-sider-children {
                    background: transparent !important;
                }
                /* Footer hairline, like the VO panel dividers */
                .cms-outer-sider .cms-outer-sider-actions {
                    border-top: 1px solid ${vo.border} !important;
                }
                /* Outer sider footer actions (actionsRender).
                   DOM: .cms-outer-sider-actions > .ant-space.cms-outer-sider-actions-list
                        > .ant-space-item > .cms-outer-sider-actions-list-item > SidebarActions
                   Stretch every level to the full outer sider width so space-evenly works. */
                .cms-outer-sider .cms-outer-sider-actions {
                    display: flex !important;
                    align-items: center !important;
                    width: 100% !important;
                    height: ${SIDER_FOOTER_ROW_HEIGHT}px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                }
                .cms-outer-sider .cms-outer-sider-actions-collapsed {
                    height: auto !important;
                    padding: 8px 0 !important;
                }
                /* Inner footer: drop ProLayout's 16px bottom padding so the online-users
                   row sits on the same baseline as the outer footer buttons. */
                .cms-inner-sider .cms-inner-sider-footer {
                    padding-block-end: 0 !important;
                    margin-block-end: 0 !important;
                }
                .cms-outer-sider .cms-outer-sider-actions-list,
                .cms-outer-sider .cms-outer-sider-actions-list > .ant-space-item,
                .cms-outer-sider .cms-outer-sider-actions-list-item {
                    display: flex !important;
                    flex: 1 1 100% !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .cms-outer-sider .cms-outer-sider-actions-list-item,
                .cms-outer-sider .cms-outer-sider-actions-list-item:hover {
                    background: transparent !important;
                    cursor: default !important;
                }
                /* ---- Menus (both siders): base ---- */
                .cms-outer-sider .ant-menu,
                .cms-inner-sider .ant-menu {
                    background: transparent !important;
                    color: ${vo.textMuted} !important;
                    border-inline-end: none !important;
                }
                .cms-outer-sider .ant-menu-sub,
                .cms-inner-sider .ant-menu-sub {
                    background: transparent !important;
                }
                .cms-outer-sider .ant-menu-item,
                .cms-outer-sider .ant-menu-submenu-title,
                .cms-inner-sider .ant-menu-item,
                .cms-inner-sider .ant-menu-submenu-title {
                    color: ${vo.textMuted} !important;
                    font-weight: 500 !important;
                    border: 1px solid transparent !important;
                    border-radius: 12px !important;
                    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
                }
                .cms-inner-sider .ant-menu-item,
                .cms-inner-sider .ant-menu-submenu-title {
                    padding-inline: 12px !important;
                }
                .cms-outer-sider .ant-menu-item .anticon,
                .cms-outer-sider .ant-menu-submenu-title .anticon,
                .cms-inner-sider .ant-menu-item .anticon,
                .cms-inner-sider .ant-menu-submenu-title .anticon {
                    color: ${vo.textDim} !important;
                    transition: color 0.2s ease !important;
                }
                .cms-outer-sider .ant-menu-submenu-arrow,
                .cms-inner-sider .ant-menu-submenu-arrow {
                    color: ${vo.textDim} !important;
                }
                /* VO section labels: 10px bold uppercase, wide tracking */
                .cms-outer-sider .ant-menu-item-group-title,
                .cms-inner-sider .ant-menu-item-group-title {
                    color: ${vo.textDim} !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.14em !important;
                }
                
                /* Inner Menu (Contextual Sidebar) — VO glass, secondary surface */
                .cms-inner-sider {
                    border-right: 1px solid ${vo.border} !important;
                    overflow: visible !important;
                    left: ${outerCollapsed ? OUTER_COLLAPSED_WIDTH : 260}px !important;
                    z-index: 99 !important;
                    background: ${vo.surface} !important;
                    backdrop-filter: ${vo.blur} !important;
                    -webkit-backdrop-filter: ${vo.blur} !important;
                }
                .cms-inner-sider .ant-layout-sider-children {
                    background: transparent !important;
                }
                
                /* ---- Hover (VO AgentRow: white/5 fill + white/10 hairline) ---- */
                .cms-outer-sider .ant-menu-item:hover,
                .cms-outer-sider .ant-menu-submenu-title:hover,
                .cms-inner-sider .ant-menu-item:hover,
                .cms-inner-sider .ant-menu-submenu-title:hover {
                    background: ${vo.hoverBg} !important;
                    border-color: ${vo.border} !important;
                    color: ${vo.text} !important;
                    box-shadow: none !important;
                }
                .cms-outer-sider .ant-menu-item:hover .anticon,
                .cms-outer-sider .ant-menu-submenu-title:hover .anticon,
                .cms-inner-sider .ant-menu-item:hover .anticon,
                .cms-inner-sider .ant-menu-submenu-title:hover .anticon {
                    color: ${vo.text} !important;
                }
                
                /* ---- Selected (VO AgentRow selected: white/10 fill + white/25 border) ---- */
                .cms-outer-sider .ant-menu-item.ant-menu-item-selected,
                .cms-inner-sider .ant-menu-item.ant-menu-item-selected {
                    background: ${vo.selectedBg} !important;
                    border-color: ${vo.selectedBorder} !important;
                    color: ${vo.text} !important;
                    font-weight: 600 !important;
                    box-shadow: none !important;
                }
                .cms-outer-sider .ant-menu-item.ant-menu-item-selected .anticon,
                .cms-inner-sider .ant-menu-item.ant-menu-item-selected .anticon {
                    color: ${vo.accent} !important;
                }
                .cms-outer-sider .ant-menu-submenu-selected > .ant-menu-submenu-title,
                .cms-inner-sider .ant-menu-submenu-selected > .ant-menu-submenu-title {
                    color: ${vo.text} !important;
                }
                .cms-outer-sider .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon,
                .cms-inner-sider .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon {
                    color: ${vo.accent} !important;
                }
                
                /* The sider-children contains the collapse button, so we can't clip it */
                /* Instead, use clip-path or keep overflow visible */
                .cms-inner-sider .ant-layout-sider-children {
                    overflow: visible !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                
                /* Apply overflow hidden only to the menu and extra containers */
                .cms-inner-sider .ant-menu {
                    overflow-x: hidden !important;
                    overflow-y: auto !important;
                }
                
                .cms-inner-sider .cms-inner-sider-extra {
                    overflow-x: hidden !important;
                }
                
                /* Fix segmented control to fit within sidebar */
                .cms-inner-sider .ant-segmented {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                /* VO tab look: muted items, white/10 selected pill */
                .cms-inner-sider .ant-segmented .ant-segmented-item {
                    color: ${vo.textMuted} !important;
                    border-radius: 9px !important;
                    transition: color 0.2s ease !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
                    color: ${vo.text} !important;
                    background: transparent !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item-selected,
                .cms-inner-sider .ant-segmented .ant-segmented-thumb {
                    background: ${vo.selectedBg} !important;
                    color: ${vo.text} !important;
                    box-shadow: inset 0 0 0 1px ${vo.border} !important;
                    border-radius: 9px !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item-selected .anticon {
                    color: ${vo.accent} !important;
                }
                
                /* VO IconButton (footer actions) */
                .vo-icon-btn {
                    transition: background 0.2s ease, color 0.2s ease !important;
                }
                .vo-icon-btn:hover {
                    background: ${vo.selectedBg} !important;
                    color: ${vo.text} !important;
                }
                
                /* Slim VO scrollbars inside the siders */
                .cms-outer-sider ::-webkit-scrollbar,
                .cms-inner-sider ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .cms-outer-sider ::-webkit-scrollbar-thumb,
                .cms-inner-sider ::-webkit-scrollbar-thumb {
                    background: ${vo.border};
                    border-radius: 999px;
                }
                .cms-outer-sider ::-webkit-scrollbar-track,
                .cms-inner-sider ::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                /* Collapse buttons: VO glass chip */
                .cms-outer-sider-collapsed-button,
                .cms-inner-sider-collapsed-button {
                    background: ${vo.glass} !important;
                    backdrop-filter: ${vo.blur} !important;
                    -webkit-backdrop-filter: ${vo.blur} !important;
                    border: 1px solid ${vo.border} !important;
                    color: ${vo.textMuted} !important;
                    box-shadow: ${vo.shadow} !important;
                }
                .cms-outer-sider-collapsed-button:hover,
                .cms-inner-sider-collapsed-button:hover {
                    color: ${vo.text} !important;
                }
                
                /* Ensure collapse buttons are fully visible and above other elements */
                .cms-outer-sider-collapsed-button,
                .cms-outer-layout .ant-layout-sider-trigger,
                .cms-outer-layout .ant-pro-sider-collapsed-button,
                .ant-layout-sider-trigger,
                .ant-pro-sider-collapsed-button {
                    z-index: 250 !important;
                }

                .cms-inner-sider-collapsed-button {
                    z-index: 200 !important;
                }
                
                /* SpeedDial button styling - glassmorphic matching docks */
                .speeddial-glass-btn {
                    width: 3.5rem !important;
                    height: 3.5rem !important;
                    background: ${darkMode ? 'rgba(30,30,40,0.72)' : 'rgba(255, 255, 255, 0.72)'} !important;
                    backdrop-filter: blur(20px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                    border: ${darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)'} !important;
                    box-shadow: ${darkMode ? '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'} !important;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                    border-radius: 18px !important;
                }
                
                .speeddial-glass-btn:hover {
                    transform: scale(1.15) translateY(-4px) !important;
                }
                
                .speeddial-glass-btn .pi {
                    font-size: 1.5rem !important;
                    color: ${darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)'} !important;
                    filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.1)) !important;
                }
                
                /* SpeedDial action buttons - pastel gradient circles */
                .p-speeddial-action {
                    width: 2.5rem !important;
                    height: 2.5rem !important;
                    background: linear-gradient(135deg, rgba(var(--theme-color-rgb), 0.12), rgba(var(--theme-color-rgb), 0.06)) !important;
                    border: 1px solid rgba(var(--theme-color-rgb), 0.15) !important;
                    box-shadow: 0 3px 12px rgba(var(--theme-color-rgb), 0.15) !important;
                    color: ${themeColor} !important;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                    backdrop-filter: blur(8px) !important;
                }
                
                .p-speeddial-action:hover {
                    transform: scale(1.15) !important;
                    background: linear-gradient(135deg, rgba(var(--theme-color-rgb), 0.22), rgba(var(--theme-color-rgb), 0.12)) !important;
                    box-shadow: 0 6px 20px rgba(var(--theme-color-rgb), 0.25) !important;
                }
                
                .p-speeddial-action .pi {
                    font-size: 1rem !important;
                    color: ${themeColor} !important;
                }
                /* Align PageContainer title and subtitle by baseline */
                .ant-page-header-heading-left {
                    align-items: baseline !important;
                }

                /* Left Dock Toolbar */
                .left-dock-toolbar {
                    scrollbar-width: none;
                }
                .left-dock-toolbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}

