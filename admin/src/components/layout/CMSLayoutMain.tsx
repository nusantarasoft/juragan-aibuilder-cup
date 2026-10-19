"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
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
import { useRouter, usePathname } from "next/navigation";
import menuConfig from "@/config/menuConfig";
import { usePreferencesStore, hexToRgb } from "@/store/usePreferencesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/context/AuthContext";
import { usePermissionCache } from "@/store/usePermissionCache";
import { filterMenuTreeForAppRole } from "@/lib/tenantOwnerMenu";
import NotificationBell from "@/components/common/NotificationBell";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useDockStore } from "@/store/useDockStore";
import OnlineUsersAvatars, { SIDER_FOOTER_ROW_HEIGHT } from "./OnlineUsersAvatars";
import { getVOTheme, type VOTheme } from "./voTheme";
import { CMSLayoutGlobalStyles } from "./CMSLayoutGlobalStyles";


import { readInitialDarkMode, useAdminLayout } from "./useAdminLayoutStore";
import {
    cx,
    SCROLL_Y,
    ORANGE,
    SKY,
    OUTER_COLLAPSED_WIDTH,
    INNER_COLLAPSED_WIDTH,
} from "./adminLayoutConstants";
import { AdminSidePanel } from "./AdminSidePanel";
import {
    ALL_DOCK_META,
    AppListContent,
    BOTTOM_DOCK_WIDGETS,
    BREADCRUMB_LABELS,
    LEFT_DOCK_WIDGETS,
    buildAntMenuItems,
    findMenuItemByPath,
    generateBreadcrumb,
    getInnerMenuRoutes,
    type CMSLayoutProps,
} from "./cmsLayoutDockMenu";

const ModuleIllustrationCards = dynamic(() => import("./ModuleIllustrationCards"), {
    ssr: false,
    loading: () => null,
});
const TamagotchiGlobal = dynamic(
    () => import("../helper/TamagotchiGlobal").then((m) => ({ default: m.TamagotchiGlobal })),
    { ssr: false },
);
const AthanWidget = dynamic(() => import("@/components/dock/widgets/AthanWidget"), { ssr: false });
const CalculatorWidget = dynamic(() => import("@/components/dock/widgets/CalculatorWidget"), { ssr: false });
const NotesWidget = dynamic(() => import("@/components/dock/widgets/NotesWidget"), { ssr: false });
const CalendarWidget = dynamic(() => import("@/components/dock/widgets/CalendarWidget"), { ssr: false });
const SnakeWidget = dynamic(() => import("@/components/dock/widgets/SnakeWidget"), { ssr: false });
const PongWidget = dynamic(() => import("@/components/dock/widgets/PongWidget"), { ssr: false });
const AIStudioDrawer = dynamic(() => import("./AIStudioDrawer"), { ssr: false });
const AgentSessionOverlay = dynamic(
    () => import("@/components/agent-session/AgentSessionOverlay"),
    { ssr: false },
);
const CommandPalette = dynamic(() => import("../common/CommandPalette"), { ssr: false });
const ThemeDrawer = dynamic(() => import("./ThemeDrawer"), { ssr: false });
const MacWaveDock = dynamic(() => import("../dock/MacWaveDock").then((m) => ({ default: m.MacWaveDock })), {
    ssr: false,
});
const FloatingOrbMenu = dynamic(() => import("../dock/FloatingOrbMenu"), { ssr: false });
const LiveCursors = dynamic(() => import("@/components/common/LiveCursors"), { ssr: false });
const DockWindow = dynamic(() => import("@/components/dock/DockWindow"), { ssr: false });

export default function CMSLayoutMain({
    children,
    title,
    subTitle,
    extra,
    breadcrumb,
}: CMSLayoutProps) {
    const router = useRouter();
    const currentPath = usePathname();
    const appRole = useAuthStore((s) => s.user?.role);
    const [pathname, setPathname] = useState(currentPath || "/admin/ai-studio");
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
        const path = currentPath || "/admin/ai-studio";
        const keys: string[] = ["/admin/ai-studio-menu"];
        if (menuConfig?.route?.routes) {
            for (const route of menuConfig.route.routes) {
                if (route.routes && route.routes.some((r: any) => path.startsWith(r.path))) {
                    const key = route.key ?? route.path;
                    if (!keys.includes(key)) keys.push(key);
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
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker
                .getRegistrations()
                .then((regs) => {
                    for (const reg of regs) {
                        void reg.unregister();
                    }
                })
                .catch(() => {});
        }
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
        window.dispatchEvent(new CustomEvent("cms-reset-layout"));
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

    const breadcrumbItems = breadcrumb || generateBreadcrumb(currentPath || "/admin/ai-studio");
    const innerRoutes = getInnerMenuRoutes(selectedSegment, pinnedItems, starredItems);

    const segmentedOptions = [
        { value: "new", icon: <PlusOutlined /> },
        { value: "recent", icon: <ClockCircleOutlined /> },
        { value: "pinned", icon: <PushpinOutlined /> },
        { value: "starred", icon: <StarOutlined /> },
        { value: "history", icon: <HistoryOutlined /> },
    ];

    const logoSrc = darkMode ? "/logo-white.png" : "/logo-black.png";

    const activeModuleName = useMemo(() => {
        const segs = pathname.split("/").filter(Boolean);
        const mod = segs[1] || "ai-studio";
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

    const { signOut, user: authUser } = useAuth();

    const handleSignOut = useCallback(async () => {
        try {
            await signOut();
        } finally {
            usePermissionCache.getState().clearCache();
            message.success("Signed out successfully");
            router.replace("/login");
        }
    }, [signOut, router]);

    const accountMenuProps = {
        items: [
            ...(authUser?.email
                ? [
                      {
                          key: "user-email",
                          disabled: true,
                          label: (
                              <span className="font-mono text-[10.5px] opacity-80">
                                  {authUser.email}
                              </span>
                          ),
                      },
                      {
                          type: "divider" as const,
                      },
                  ]
                : []),
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
            if (key === "logout" || key === "switch") {
                void handleSignOut();
            } else if (key === "settings") {
                router.push("/admin/ai-studio/settings");
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
                                onClick={() => navigateTo("/admin/ai-studio")}
                                className="flex cursor-pointer items-center gap-1.5"
                            >
                                <img
                                    src="/logo.png"
                                    alt="Nusantarasoft"
                                    className="h-5 w-5 shrink-0 object-contain"
                                />
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
                                onClick={() => navigateTo("/admin/virtual-office")}
                                className="flex h-[22px] items-center gap-1 border border-orange-400/40 bg-orange-500/10 px-2 text-[9.5px] tracking-normal text-orange-100 transition hover:border-orange-300/70 hover:text-white"
                            >
                                <Box className="h-3 w-3" />
                                <span className="hidden sm:inline">virtual office</span>
                            </button>

                            <Dropdown menu={accountMenuProps} trigger={["click"]} placement="bottomRight">
                                <button
                                    type="button"
                                    data-testid="admin-account-menu"
                                    title={authUser?.email ? `Account (${authUser.email})` : "Account & Sign Out"}
                                    className="flex h-[22px] items-center gap-1 border border-white/15 px-2 text-[9.5px] tracking-normal text-slate-300 transition hover:border-red-400/60 hover:text-red-200"
                                >
                                    <UserOutlined style={{ fontSize: 10 }} />
                                    <span className="hidden lg:inline">account</span>
                                </button>
                            </Dropdown>

                            <button
                                type="button"
                                data-testid="admin-sign-out"
                                title="Sign Out"
                                onClick={() => void handleSignOut()}
                                className="flex h-[22px] items-center gap-1 border border-red-500/35 bg-red-500/10 px-2 text-[9.5px] tracking-normal text-red-300 transition hover:border-red-400 hover:bg-red-500/20 hover:text-white"
                            >
                                <LogoutOutlined style={{ fontSize: 10 }} />
                                <span className="hidden md:inline">sign out</span>
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

                                {/* Scrollable Contextual Items */}
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

                                {/* Fixed Gate Review & Tamagotchi Companion Footer */}
                                <div className="shrink-0 border-t border-white/[0.07]">
                                    <ModuleIllustrationCards collapsed={isInnerRail} darkMode={darkMode} />
                                </div>

                                {/* Online Presence Footer */}
                                <div className="shrink-0 border-t border-white/[0.07]">
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

            {/* Floating Ring & 3D Orbit Navigator - Bottom Right */}
            <div
                style={{
                    position: "fixed",
                    bottom: 12,
                    right: 16,
                    zIndex: 9998,
                    pointerEvents: "none",
                }}
            >
                <FloatingOrbMenu darkMode={darkMode} />
            </div>

            {/* Agentic OS Styling for Menus, PageContainer, ProCard, Tables, and Controls */}
            <CMSLayoutGlobalStyles darkMode={darkMode} vo={vo} />
        </div>
    );
}
