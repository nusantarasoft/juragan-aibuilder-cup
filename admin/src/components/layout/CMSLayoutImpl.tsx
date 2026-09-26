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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 12 }}>
            <Divider orientation="vertical" style={{ height: 16, background: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', margin: 0 }} />
            <LanguageSwitcher isDark={darkMode} />
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
                    borderRadius: '50%',
                    transition: 'all 0.2s',
                    color: darkMode ? '#fff' : '#000',
                }}
                className="hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                    <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: themePalette.primary, width: 24, height: 24, lineHeight: "24px" }} />
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
                        token={{ sider: { colorMenuBackground: darkMode ? '#1f1f1f' : '#f4f0fa', colorTextMenu: darkMode ? 'rgba(255,255,255,0.75)' : '#4a5568', colorTextMenuSelected: darkMode ? '#fff' : '#1a202c', colorBgMenuItemSelected: darkMode ? 'rgba(255,255,255,0.15)' : '#ffffff', colorTextMenuItemHover: darkMode ? '#fff' : '#2d3748', colorBgMenuItemHover: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)' } }}
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
                                borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0",
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
                                        <div style={{
                                            cursor: "pointer",
                                            padding: 5,
                                            borderRadius: 6,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"; }}
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
                                    <Tooltip title="Sarah J." placement={outerCollapsed ? "right" : "bottom"}>
                                        <Avatar size={22} src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" style={{ backgroundColor: "#86efac", cursor: "pointer", fontSize: 10 }}>S</Avatar>
                                    </Tooltip>
                                    {!outerCollapsed && (
                                        <>
                                            <Tooltip title="Sync" placement="bottom">
                                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fca5a5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                                    <SwapOutlined style={{ fontSize: 10, color: "#fff" }} />
                                                </div>
                                            </Tooltip>
                                            <Tooltip title="Recent" placement="bottom">
                                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                                    <ClockCircleOutlined style={{ fontSize: 10 }} />
                                                </div>
                                            </Tooltip>
                                            <Tooltip title="Settings" placement="bottom">
                                                <div onClick={() => setThemeDrawerVisible(true)} style={{ width: 22, height: 22, borderRadius: "50%", background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                                    <SettingOutlined style={{ fontSize: 10 }} />
                                                </div>
                                            </Tooltip>
                                            <AnimatedThemeToggler isDark={darkMode} onThemeChange={handleDarkModeChange} size={14} style={{ color: darkMode ? "#fff" : "#000" }} />
                                        </>
                                    )}
                                    {outerCollapsed && (
                                        <AnimatedThemeToggler isDark={darkMode} onThemeChange={handleDarkModeChange} size={14} style={{ color: darkMode ? "#fff" : "#000" }} />
                                    )}
                                </div>
                            </div>
                            {/* Dashboard & Activity Feed Card */}
                            <div style={{
                                background: darkMode ? "rgba(255,255,255,0.08)" : "#ffffff",
                                borderRadius: 16,
                                padding: "8px",
                                border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)",
                                boxShadow: darkMode
                                    ? "0 2px 8px rgba(0,0,0,0.3)"
                                    : "0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
                                margin: outerCollapsed ? "8px 4px" : "12px 8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4
                            }}>
                                {/* Dashboard Item */}
                                <div 
                                    onClick={() => { setPathname("/admin/dashboard"); router.push("/admin/dashboard"); }}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        background: isDashboard ? (darkMode ? "rgba(255,255,255,0.15)" : "#ffffff") : "transparent",
                                        boxShadow: isDashboard && !darkMode ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
                                        color: isDashboard ? (darkMode ? "#fff" : "#1a202c") : (darkMode ? "rgba(255,255,255,0.75)" : "#4a5568"),
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { if (!isDashboard) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)"; }}
                                    onMouseLeave={(e) => { if (!isDashboard) e.currentTarget.style.background = "transparent"; }}
                                >
                                    <DashboardOutlined style={{ fontSize: 16, color: isDashboard ? "var(--theme-color)" : "inherit" }} />
                                    {!outerCollapsed && (
                                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 14, fontWeight: isDashboard ? 500 : 400 }}>Dashboard</span>
                                            <div style={{ width: 24, height: 24, background: "rgba(124, 58, 237, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <SafetyCertificateOutlined style={{ fontSize: 12, color: "#7c3aed" }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Activity Feed Item */}
                                <div 
                                    onClick={() => { setPathname("/admin/activity"); router.push("/admin/activity"); }}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        background: isActivity ? (darkMode ? "rgba(255,255,255,0.15)" : "#ffffff") : "transparent",
                                        boxShadow: isActivity && !darkMode ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
                                        color: isActivity ? (darkMode ? "#fff" : "#1a202c") : (darkMode ? "rgba(255,255,255,0.75)" : "#4a5568"),
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { if (!isActivity) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)"; }}
                                    onMouseLeave={(e) => { if (!isActivity) e.currentTarget.style.background = "transparent"; }}
                                >
                                    <ClockCircleOutlined style={{ fontSize: 16, color: isActivity ? "var(--theme-color)" : "inherit" }} />
                                    {!outerCollapsed && (
                                        <span style={{ fontSize: 14, fontWeight: isActivity ? 500 : 400 }}>Activity Feed</span>
                                    )}
                                </div>
                            </div>
                            </>
                            );
                        }}
                        actionsRender={(props) => {
                            if (props.isMobile) return [];
                            return [<SidebarActions key="sidebar-actions" />];
                        }}
                        menuRender={(props, defaultDom) => {
                            return (
                            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                                    {defaultDom}
                                </div>
                                {/* Bottom Profile Section */}
                                <div style={{ 
                                    padding: "16px 12px", 
                                    borderTop: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: outerCollapsed ? "center" : "space-between"
                                }}>
                                    <Badge count={29} size="small" offset={[-2, 2]} color="var(--theme-color, #7c3aed)">
                                        <div style={{
                                            width: 36, height: 36, borderRadius: "50%",
                                            background: darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            cursor: "pointer"
                                        }}>
                                            <BellOutlined style={{ fontSize: 16, color: darkMode ? "#fff" : "#4a5568" }} />
                                        </div>
                                    </Badge>
                                    {!outerCollapsed && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(124, 58, 237, 0.1)", padding: "4px 12px 4px 4px", borderRadius: 20 }}>
                                            <Avatar size="small" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" style={{ backgroundColor: "#86efac" }}>S</Avatar>
                                            <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#fff" : "#1a202c" }}>Sarah J.</span>
                                        </div>
                                    )}
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
                            token={{ sider: { colorMenuBackground: darkMode ? '#141414' : '#fff', colorTextMenuSelected: themePalette.primary, colorBgMenuItemSelected: `${themePalette.primary}15`, colorTextMenuItemHover: themePalette.primary, colorBgMenuItemHover: `${themePalette.primary}08` } }}
                            layout="side"
                            contentStyle={{
                                padding: 0,
                                margin: 0,
                            }}
                            menuDataRender={() => innerRoutes.length > 0 ? innerRoutes : [{ path: '/dummy', name: 'No items' }]}
                            menuHeaderRender={false}
                            menuFooterRender={(props) => (
                                <ModuleIllustrationCards collapsed={innerCollapsed} darkMode={darkMode} />
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
                                            background: darkMode ? `rgba(var(--theme-color-rgb, 139, 92, 246), 0.15)` : `rgba(var(--theme-color-rgb, 139, 92, 246), 0.08)`,
                                            border: darkMode ? `1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.3)` : `1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.2)`,
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
                                extra={[...(extra || []), <PinStarShareActions key="pin-star-actions" />]}
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
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)',
                padding: '12px 8px',
                borderRadius: '24px',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            }}>
                {LEFT_DOCK_WIDGETS.map((item) => {
                    const isOpen = dockWindows.some(w => w.widgetType === item.id);
                    return (
                        <Tooltip title={item.label} key={item.id} placement="right">
                            <div
                                onClick={() => openDockWindow(item.id as any, item.label, item.width, item.height)}
                                style={{
                                    position: 'relative',
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'transparent',
                                    borderRadius: 12,
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.2) translateX(4px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1) translateX(0)';
                                }}
                            >
                                <span style={{
                                    fontSize: '1.6rem',
                                    lineHeight: 1,
                                    filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.2))',
                                    userSelect: 'none',
                                }}>
                                    {item.icon}
                                </span>
                                {isOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        right: -6,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 5,
                                        height: 5,
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.4)',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.2)',
                                    }} />
                                )}
                            </div>
                        </Tooltip>
                    );
                })}
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
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: darkMode ? 'rgba(30,30,40,0.72)' : 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                padding: '8px 16px',
                borderRadius: 30,
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
                boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
            }}>
                {BOTTOM_DOCK_WIDGETS.map((item) => {
                    const isOpen = dockWindows.some(w => w.widgetType === item.id);
                    return (
                        <Tooltip title={item.label} key={item.id}>
                            <div
                                onClick={() => openDockWindow(item.id as any, item.label, item.width, item.height)}
                                style={{
                                    position: 'relative',
                                    width: '2.8rem',
                                    height: '2.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'transparent',
                                    borderRadius: 12,
                                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25) translateY(-6px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                            >
                                <span style={{
                                    fontSize: '2.2rem',
                                    lineHeight: 1,
                                    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))',
                                    userSelect: 'none',
                                }}>
                                    {item.icon}
                                </span>
                                {isOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: -8,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 5,
                                        height: 5,
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.4)',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.2)',
                                    }} />
                                )}
                            </div>
                        </Tooltip>
                    );
                })}
                {/* Add Widget button */}
                <Tooltip title="Add Widget">
                    <div
                        style={{
                            position: 'relative',
                            width: '2.8rem',
                            height: '2.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25) translateY(-6px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                    >
                        <span style={{
                            fontSize: '2.2rem',
                            lineHeight: 1,
                            filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))',
                            userSelect: 'none',
                        }}>
                            ➕
                        </span>
                    </div>
                </Tooltip>
            </div>

            {/* AI Studio Drawer */}
            <AIStudioDrawer visible={aiStudioVisible} onClose={() => setAIStudioVisible(false)} />

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
                <FloatingOrbMenu />
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
                
                

                
                /* --- SUBTLE UI REFINEMENT --- */
                
                /* Outer Menu (Primary Sidebar) — Light theme with pale purple tint */
                .cms-outer-sider {
                    border-right: none !important;
                    z-index: 100 !important;
                    background: ${darkMode ? '#1a1a2e' : '#f4f0fa'} !important;
                }
                .cms-outer-sider .ant-layout-sider-children {
                    background: ${darkMode ? '#1a1a2e' : '#f4f0fa'} !important;
                }
                .cms-outer-sider .ant-menu {
                    background: transparent !important;
                    color: ${darkMode ? 'rgba(255,255,255,0.75)' : '#4a5568'} !important;
                }
                .cms-outer-sider .ant-menu-item,
                .cms-outer-sider .ant-menu-submenu-title {
                    color: ${darkMode ? 'rgba(255,255,255,0.75)' : '#4a5568'} !important;
                }
                .cms-outer-sider .ant-menu-item .anticon,
                .cms-outer-sider .ant-menu-submenu-title .anticon {
                    color: ${darkMode ? 'rgba(255,255,255,0.5)' : '#718096'} !important;
                }
                .cms-outer-sider .ant-menu-item-group-title {
                    color: ${darkMode ? 'rgba(255,255,255,0.35)' : '#a0aec0'} !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.8px !important;
                }
                
                /* Inner Menu (Contextual Sidebar) */
                .cms-inner-sider {
                    border-right: none !important;
                    overflow: visible !important;
                    left: ${outerCollapsed ? OUTER_COLLAPSED_WIDTH : 260}px !important;
                    z-index: 99 !important;
                    background: ${darkMode ? '#141414' : '#ffffff'} !important;
                }
                .cms-inner-sider .ant-layout-sider-children {
                    background: ${darkMode ? '#141414' : '#ffffff'} !important;
                }
                
                /* Clean Menu Item Hover & Active States */
                .cms-outer-sider .ant-menu-item,
                .cms-inner-sider .ant-menu-item {
                    transition: all 0.2s ease !important;
                    border-radius: 12px !important;
                }
                
                .cms-outer-sider .ant-menu-item:hover {
                    background: ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.5)'} !important;
                    box-shadow: none !important;
                }
                .cms-inner-sider .ant-menu-item:hover {
                    background: ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'} !important;
                    box-shadow: none !important;
                }
                
                .cms-outer-sider .ant-menu-item-selected {
                    background: ${darkMode ? 'rgba(139, 92, 246, 0.2)' : '#ffffff'} !important;
                    box-shadow: ${darkMode ? '0 2px 10px rgba(139,92,246,0.15)' : '0 2px 10px rgba(0,0,0,0.05)'} !important;
                    border-radius: 12px !important;
                    color: ${darkMode ? '#e2e8f0' : '#1a202c'} !important;
                }
                .cms-outer-sider .ant-menu-item-selected .anticon {
                    color: ${darkMode ? '#a78bfa' : 'var(--theme-color, #7c3aed)'} !important;
                }
                
                .cms-inner-sider .ant-menu-item-selected {
                    background: ${darkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(var(--theme-color-rgb), 0.08)'} !important;
                    box-shadow: inset 4px 0 0 ${darkMode ? '#a78bfa' : 'var(--theme-color)'} !important;
                }
                .cms-inner-sider .ant-menu-item-selected .anticon {
                    color: ${darkMode ? '#a78bfa' : 'var(--theme-color, #7c3aed)'} !important;
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
                    background: transparent !important;
                }
                
                .cms-inner-sider .cms-inner-sider-extra {
                    overflow-x: hidden !important;
                }
                
                .cms-inner-sider .ant-menu-item,
                .cms-inner-sider .ant-menu-submenu-title {
                    padding-inline: 12px !important;
                    color: ${darkMode ? 'rgba(255,255,255,0.75)' : '#4a5568'} !important;
                }
                .cms-inner-sider .ant-menu-item .anticon,
                .cms-inner-sider .ant-menu-submenu-title .anticon {
                    color: ${darkMode ? 'rgba(255,255,255,0.5)' : '#718096'} !important;
                }
                
                /* Fix segmented control to fit within sidebar */
                .cms-inner-sider .ant-segmented {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
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

