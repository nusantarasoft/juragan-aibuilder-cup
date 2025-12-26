"use client";

import React, { useState } from "react";
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
    SunOutlined,
    MoonOutlined,
    PlusOutlined,
    FileAddOutlined,
    AppstoreOutlined,
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
    Switch,
    Tooltip,
    Popover,
    Avatar,
    Typography,
} from "antd";
import { useRouter, usePathname } from "next/navigation";
import menuConfig from "@/config/menuConfig";

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
    subTitle?: string;
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
    const [innerCollapsed, setInnerCollapsed] = useState(false);
    const [outerCollapsed, setOuterCollapsed] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<string>("recent");
    const [darkMode, setDarkMode] = useState(false);
    const [appListOpen, setAppListOpen] = useState(false);

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
                        title="Nusantarasoft"
                        logo={logoSrc}
                        {...menuConfig}
                        location={{
                            pathname,
                        }}
                        fixSiderbar
                        collapsed={outerCollapsed}
                        onCollapse={setOuterCollapsed}
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
                                        <Tooltip title={darkMode ? "Light" : "Dark"} placement="right">
                                            <Switch
                                                checked={darkMode}
                                                onChange={setDarkMode}
                                                checkedChildren={<MoonOutlined />}
                                                unCheckedChildren={<SunOutlined />}
                                                size="small"
                                            />
                                        </Tooltip>
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
                                            {/* Title */}
                                            <span style={{
                                                fontWeight: 600,
                                                fontSize: 15,
                                                color: darkMode ? "#fff" : "#000",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
                                                Nusantarasoft
                                            </span>
                                        </div>
                                        {/* Right: Dark/Light Toggle */}
                                        <div style={{ marginLeft: 16, flexShrink: 0 }}>
                                            <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
                                                <Switch
                                                    checked={darkMode}
                                                    onChange={setDarkMode}
                                                    checkedChildren={<MoonOutlined />}
                                                    unCheckedChildren={<SunOutlined />}
                                                    size="small"
                                                />
                                            </Tooltip>
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
                            fixSiderbar={false}
                            collapsed={innerCollapsed}
                            onCollapse={setInnerCollapsed}
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
            `}</style>
        </div>
    );
}
