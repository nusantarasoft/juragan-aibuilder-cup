"use client";

import React, { useState } from "react";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import {
    LogoutOutlined,
    SearchOutlined,
    InfoCircleFilled,
    QuestionCircleFilled,
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
    RobotOutlined,
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
    Segmented,
    Tooltip,
    Popover,
    Avatar,
    Typography,
} from "antd";
import { useRouter, usePathname } from "next/navigation";
import menuConfig from "@/config/menuConfig";
import GlitchText from "@/components/react-bits/GlitchText";
import MetaBalls from "@/components/react-bits/MetaBalls";
import AnimatedTooltip from "@/components/mvpblocks/AnimatedTooltip";

const { Text } = Typography;

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
        key: "landing",
        icon: "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
        title: "Landing Page",
        desc: "Public website",
        url: "/",
    },
];

// Dummy inner menu routes based on selected segment
const getInnerMenuRoutes = (segment: string) => {
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
            return [
                { path: "/admin/dashboard", name: "Dashboard", icon: <PushpinOutlined /> },
                { path: "/admin/settings/general", name: "Settings", icon: <PushpinOutlined /> },
            ];
        case "starred":
            return [
                { path: "/admin/media", name: "Media Library", icon: <StarOutlined /> },
                { path: "/admin/ai-studio", name: "AI Studio (NotebookLM)", icon: <RobotOutlined /> },
                { path: "/admin/users/list", name: "User Management", icon: <StarOutlined /> },
            ];
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

export default function CMSLayout({
    children,
    title,
    subTitle,
    extra,
    breadcrumb,
}: CMSLayoutProps) {
    const router = useRouter();
    const currentPath = usePathname();
    const [pathname, setPathname] = useState(currentPath || "/admin/dashboard");
    const [innerCollapsed, setInnerCollapsed] = useState(true); // Default collapsed
    const [outerCollapsed, setOuterCollapsed] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<string>("recent");
    const [darkMode, setDarkMode] = useState(false);
    const [appListOpen, setAppListOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [showBackground, setShowBackground] = useState(true);

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

        setIsHydrated(true);
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

    // Sync dark class on initial hydration
    React.useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [darkMode]);

    // Force sticky sidebar for inner layout
    React.useEffect(() => {
        // Function to apply sticky styles with !important
        const applySticky = () => {
            const sider = document.querySelector(".cms-inner-sider");
            if (sider instanceof HTMLElement) {
                sider.style.setProperty("position", "sticky", "important");
                sider.style.setProperty("top", "0", "important");
                sider.style.setProperty("height", "100vh", "important");
                sider.style.setProperty("overflow", "visible", "important");
                sider.style.setProperty("z-index", "10", "important");
            }
        };

        // Apply immediately
        console.log("Run Stick Fix - Attempting to apply sticky styles...");
        applySticky();

        // Re-apply periodically to fight against AntD re-renders
        const intervalId = setInterval(applySticky, 500);

        // And observe for changes
        const observer = new MutationObserver(applySticky);
        const container = document.querySelector(".cms-inner-layout");
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        }

        return () => {
            clearInterval(intervalId);
            observer.disconnect();
        };
    }, [pathname, innerCollapsed]);

    // Auto-generate breadcrumb if not provided
    const breadcrumbItems = breadcrumb || generateBreadcrumb(currentPath || "/admin/dashboard");

    // Get inner menu based on selected segment
    const innerRoutes = getInnerMenuRoutes(selectedSegment);

    // Dynamic logo based on theme
    const logoSrc = darkMode ? "/logo-white.png" : "/logo-black.png";

    // Segmented options
    const segmentedOptions = [
        { value: "new", icon: <PlusOutlined /> },
        { value: "recent", icon: <ClockCircleOutlined /> },
        { value: "newfile", icon: <FileAddOutlined /> },
        { value: "pinned", icon: <PushpinOutlined /> },
        { value: "starred", icon: <StarOutlined /> },
        { value: "history", icon: <HistoryOutlined /> },
    ];

    if (typeof document === "undefined") {
        return <div />;
    }

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
                        onCollapse={handleOuterCollapse}
                        headerRender={false}
                        siderWidth={260}
                        navTheme={darkMode ? "realDark" : "light"}
                        layout="side"
                        contentStyle={{
                            padding: 0,
                            margin: 0,
                        }}
                        menuHeaderRender={false}
                        menuExtraRender={() => (
                            <div style={{
                                display: "flex",
                                flexDirection: outerCollapsed ? "column" : "row",
                                alignItems: "center",
                                justifyContent: outerCollapsed ? "center" : "space-between",
                                minHeight: HEADER_HEIGHT,
                                padding: outerCollapsed ? "12px 0" : "0 16px",
                                gap: outerCollapsed ? 12 : 0,
                                borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0",
                                boxSizing: "border-box",
                            }}>
                                {outerCollapsed ? (
                                    // Collapsed: Vertical layout - Logo, AppList, Toggle
                                    <>
                                        {/* Logo */}
                                        <img
                                            src={logoSrc}
                                            alt="Logo"
                                            style={{
                                                width: 28,
                                                height: 28,
                                                objectFit: "contain",
                                                cursor: "pointer",
                                            }}
                                            onClick={() => router.push("/admin/dashboard")}
                                        />
                                        {/* NS GlitchText under logo in collapsed state */}
                                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '1px', lineHeight: '14px', marginTop: 2 }}>
                                            <GlitchText
                                                speed={0.5}
                                                enableShadows={true}
                                                color={darkMode ? '#ffffff' : '#333333'}
                                                glitchColor1="#00ffff"
                                                glitchColor2="#ff00ff"
                                            >
                                                NS
                                            </GlitchText>
                                        </div>
                                        {/* App List Popover */}
                                        <Popover
                                            content={<AppListContent darkMode={darkMode} />}
                                            trigger="click"
                                            placement="rightTop"
                                            open={appListOpen}
                                            onOpenChange={setAppListOpen}
                                        >
                                            <div style={{
                                                cursor: "pointer",
                                                padding: 6,
                                                borderRadius: 6,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                            }}>
                                                <AppstoreOutlined style={{ fontSize: 16 }} />
                                            </div>
                                        </Popover>
                                        {/* Dark/Light Toggle */}
                                        <AnimatedThemeToggler
                                            isDark={darkMode}
                                            onThemeChange={handleDarkModeChange}
                                            size={16}
                                            style={{
                                                color: darkMode ? "#fff" : "#000",
                                                padding: 4,
                                            }}
                                        />
                                    </>
                                ) : (
                                    // Expanded: Horizontal layout
                                    <>
                                        {/* Left: AppList + Logo + Title */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                            {/* App List Popover */}
                                            <Popover
                                                content={<AppListContent darkMode={darkMode} />}
                                                trigger="click"
                                                placement="bottomLeft"
                                                open={appListOpen}
                                                onOpenChange={setAppListOpen}
                                            >
                                                <div style={{
                                                    cursor: "pointer",
                                                    padding: 6,
                                                    borderRadius: 6,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                                                    flexShrink: 0,
                                                }}>
                                                    <AppstoreOutlined style={{ fontSize: 16 }} />
                                                </div>
                                            </Popover>
                                            {/* Logo */}
                                            <img
                                                src={logoSrc}
                                                alt="Logo"
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    objectFit: "contain",
                                                    cursor: "pointer",
                                                    flexShrink: 0,
                                                }}
                                                onClick={() => router.push("/admin/dashboard")}
                                            />
                                            {/* Title with GlitchText - vertically centered with logo */}
                                            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '2px', lineHeight: '24px', display: 'flex', alignItems: 'center' }}>
                                                <GlitchText
                                                    speed={0.5}
                                                    enableShadows={true}
                                                    color={darkMode ? '#ffffff' : '#333333'}
                                                    glitchColor1="#00ffff"
                                                    glitchColor2="#ff00ff"
                                                >
                                                    NS
                                                </GlitchText>
                                            </div>
                                        </div>
                                        {/* Right: Dark/Light Toggle */}
                                        <div style={{ marginLeft: 16, flexShrink: 0 }}>
                                            <AnimatedThemeToggler
                                                isDark={darkMode}
                                                onThemeChange={handleDarkModeChange}
                                                size={18}
                                                style={{
                                                    color: darkMode ? "#fff" : "#000",
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        menuItemRender={(item, dom) => (
                            <div
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const targetPath = item.path || "/admin/dashboard";
                                    setPathname(targetPath);
                                    router.push(targetPath);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                {dom}
                            </div>
                        )}
                        menuFooterRender={(props) => {
                            if (props?.collapsed) return null;
                            return (
                                <div style={{
                                    textAlign: "center",
                                    padding: 16,
                                    borderTop: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #f0f0f0",
                                    fontSize: 12,
                                    color: darkMode ? "rgba(255,255,255,0.45)" : "#999"
                                }}>
                                    © 2024 Nusantarasoft
                                </div>
                            );
                        }}
                    >
                        {/* INNER PROLAYOUT - Sub-navigation with segmented header */}
                        <ProLayout
                            prefixCls="cms-inner"
                            title=""
                            logo={false}
                            location={{
                                pathname,
                            }}
                            route={{
                                path: "/admin/inner",
                                routes: innerRoutes,
                            }}
                            collapsed={innerCollapsed}
                            onCollapse={handleInnerCollapse}
                            siderWidth={280}
                            navTheme={darkMode ? "realDark" : "light"}
                            layout="side"
                            contentStyle={{
                                padding: 0,
                                margin: 0,
                            }}
                            menuHeaderRender={false}
                            menuExtraRender={() => (
                                <div style={{
                                    marginBlockStart: 8,
                                    minHeight: HEADER_HEIGHT,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: innerCollapsed ? "12px 8px" : "0 16px",
                                    borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0",
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
                                            background: darkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
                                            border: darkMode ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
                                        }}
                                    />
                                </div>
                            )}
                            avatarProps={{
                                src: "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
                                size: "small",
                                title: "Admin User",
                                render: (props, dom) => {
                                    return (
                                        <Dropdown
                                            menu={{
                                                items: [
                                                    {
                                                        key: "settings",
                                                        icon: <SettingOutlined />,
                                                        label: "Account Settings",
                                                    },
                                                    {
                                                        key: "logout",
                                                        icon: <LogoutOutlined />,
                                                        label: "Logout",
                                                    },
                                                ],
                                                onClick: ({ key }) => {
                                                    if (key === "logout") {
                                                        router.push("/login");
                                                    } else if (key === "settings") {
                                                        router.push("/admin/settings/account");
                                                    }
                                                },
                                            }}
                                        >
                                            {dom}
                                        </Dropdown>
                                    );
                                },
                            }}
                            actionsRender={(props) => {
                                if (props.isMobile) return [];
                                if (typeof window === "undefined") return [];
                                return [
                                    document.body.clientWidth > 1400 ? (
                                        <SearchInput key="search" />
                                    ) : undefined,
                                    <InfoCircleFilled key="InfoCircleFilled" />,
                                    <QuestionCircleFilled key="QuestionCircleFilled" />,
                                ];
                            }}
                            menuItemRender={(item, dom) => (
                                <a
                                    onClick={() => {
                                        setPathname(item.path || "/admin/dashboard");
                                        if (item.path) {
                                            router.push(item.path);
                                        }
                                    }}
                                    style={{ cursor: "pointer" }}
                                >
                                    {dom}
                                </a>
                            )}
                            menuFooterRender={(props) => {
                                if (props?.collapsed) return undefined;
                                return (
                                    <div style={{
                                        textAlign: "center",
                                        paddingBlockStart: 12,
                                        fontSize: 12,
                                        color: darkMode ? "rgba(255,255,255,0.45)" : "#999",
                                    }}>
                                        CMS v1.0.0
                                    </div>
                                );
                            }}
                        >
                            <PageContainer
                                title={title}
                                subTitle={subTitle}
                                extra={extra}
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

            {/* MetaBalls Background Toggle - Fixed at bottom-right corner */}
            <AnimatedTooltip
                content={showBackground ? "Disable Background" : "Enable Background"}
                position="left"
                usePortal={true}
            >
                <div
                    className="fixed bottom-0 right-0 z-50 w-48 h-48 cursor-pointer hover:scale-105 transition-transform duration-300 hidden md:block"
                    onClick={() => {
                        const newValue = !showBackground;
                        setShowBackground(newValue);
                        localStorage.setItem("cms-show-background", String(newValue));
                    }}
                >
                    <MetaBalls
                        color={darkMode ? "#ffffff" : "#8b5cf6"}
                        cursorBallColor={darkMode ? "#e0e7ff" : "#6366f1"}
                        enableTransparency={true}
                        ballCount={12}
                        cursorBallSize={4}
                        animationSize={28}
                        speed={0.3}
                    />
                    {/* 3-dot icon inside main ball area (center) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-black/20 dark:bg-white/10 flex items-center justify-center">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedTooltip>

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
                
                /* Remove gap between outer and inner sidebars */
                .cms-inner-layout {
                    margin-left: 0 !important;
                    padding-left: 0 !important;
                }
                
                /* Hide the placeholder div that ProLayout creates */
                /* This div is the first child inside .ant-layout-has-sider, before the aside */
                .cms-inner-layout .ant-layout-has-sider > div:first-child:not(.cms-inner-sider):not(.ant-layout-content):not(.cms-inner-layout-container) {
                    display: none !important;
                    width: 0 !important;
                    min-width: 0 !important;
                    max-width: 0 !important;
                    flex: 0 0 0 !important;
                }
                
                /* Fix inner sidebar - use clip for children only, not the sidebar itself */
                /* This allows the collapse button to extend beyond the sidebar */
                .cms-inner-sider {
                    overflow: visible !important;
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
                
                .cms-inner-sider .ant-menu-item,
                .cms-inner-sider .ant-menu-submenu-title {
                    padding-inline: 12px !important;
                }
                
                /* Fix segmented control to fit within sidebar */
                .cms-inner-sider .ant-segmented {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                /* Ensure collapse button is fully visible and above other elements */
                .cms-inner-sider-collapsed-button {
                    z-index: 200 !important;
                }
            `}</style>
        </div>
    );
}
