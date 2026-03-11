"use client";

import React from "react";
import {
    DashboardOutlined,
    FileTextOutlined,
    PictureOutlined,
    TeamOutlined,
    SettingOutlined,
    AppstoreOutlined,
    BuildOutlined,
    BlockOutlined,
    UnorderedListOutlined,
    LayoutOutlined,
    UserOutlined,
    SafetyOutlined,
    ToolOutlined,
    GlobalOutlined,
    MenuOutlined,
    CloudServerOutlined,
    GatewayOutlined,
    SafetyCertificateOutlined,
    WifiOutlined,
    DatabaseOutlined,
    TableOutlined,
    CodeOutlined,
    RobotOutlined,
    ApartmentOutlined,
    KeyOutlined,
    ShareAltOutlined,
    UsergroupAddOutlined,
    IdcardOutlined,
    SolutionOutlined,
    ContactsOutlined,
    BankOutlined,
    CalendarOutlined,
    RocketOutlined,
    BugOutlined,
    ShoppingOutlined,
    ThunderboltOutlined,
    ProjectOutlined,
} from "@ant-design/icons";

// CMS Menu Configuration
const menuConfig = {
    route: {
        path: "/admin",
        routes: [
            {
                path: "/admin/dashboard",
                name: "Dashboard",
                icon: <DashboardOutlined />,
                isLeaf: true,
                isTopLevel: true,
            },
            {
                path: "/admin/pages",
                name: "Pages",
                icon: <FileTextOutlined />,
                routes: [
                    {
                        path: "/admin/pages/list",
                        name: "All Pages",
                        icon: <UnorderedListOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/pages/builder",
                        name: "Page Builder",
                        icon: <BuildOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/blocks",
                name: "Blocks Library",
                icon: <BlockOutlined />,
                routes: [
                    {
                        path: "/admin/blocks/templates",
                        name: "Template Blocks",
                        icon: <LayoutOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/blocks/content",
                        name: "Content Blocks",
                        icon: <FileTextOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/blocks/widgets",
                        name: "Widgets",
                        icon: <AppstoreOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/media",
                name: "Media Library",
                icon: <PictureOutlined />,
                isLeaf: true,
                isTopLevel: true,
            },
            {
                path: "/admin/bigdata",
                name: "Big Data",
                icon: <DatabaseOutlined />,
                routes: [
                    {
                        path: "/admin/datasets",
                        name: "Datasets",
                        icon: <TableOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/sql-runner",
                        name: "SQL Runner",
                        icon: <CodeOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/ai-studio",
                name: "AI Studio",
                icon: <RobotOutlined />,
                isLeaf: true,
                isTopLevel: true,
            },
            {
                path: "/admin/crm",
                name: "CRM",
                icon: <SolutionOutlined />,
                routes: [
                    {
                        path: "/admin/crm/dashboard",
                        name: "Dashboard",
                        icon: <DashboardOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/individuals",
                        name: "Individuals",
                        icon: <UserOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/contacts",
                        name: "Contacts",
                        icon: <ContactsOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/accounts",
                        name: "Accounts",
                        icon: <BankOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/activities",
                        name: "Activities",
                        icon: <CalendarOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/deals",
                        name: "Deals",
                        icon: <BankOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/campaigns",
                        name: "Campaigns",
                        icon: <RocketOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/cases",
                        name: "Cases",
                        icon: <BugOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/products",
                        name: "Products",
                        icon: <ShoppingOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/quotes",
                        name: "Quotes",
                        icon: <FileTextOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/crm/intelligence",
                        name: "AI Intelligence",
                        icon: <ThunderboltOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/pm",
                name: "Project Management",
                icon: <ProjectOutlined />,
                routes: [
                    {
                        path: "/admin/pm/dashboard",
                        name: "Dashboard",
                        icon: <DashboardOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/pm/projects",
                        name: "Projects",
                        icon: <ProjectOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/users",
                name: "Users & Access",
                icon: <TeamOutlined />,
                routes: [
                    {
                        path: "/admin/users/list",
                        name: "User Management",
                        icon: <UserOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/permissions/profiles",
                        name: "Profiles",
                        icon: <IdcardOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/permissions/roles",
                        name: "Roles & Hierarchy",
                        icon: <ApartmentOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/permissions/permission-sets",
                        name: "Permission Sets",
                        icon: <KeyOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/permissions/sharing",
                        name: "Sharing & Security",
                        icon: <ShareAltOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/permissions/groups",
                        name: "Groups & Teams",
                        icon: <UsergroupAddOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/infrastructure",
                name: "Infrastructure",
                icon: <CloudServerOutlined />,
                routes: [
                    {
                        path: "/admin/infrastructure/traefik",
                        name: "Traefik Proxy",
                        icon: <GatewayOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/infrastructure/npm",
                        name: "Nginx Proxy Mgr",
                        icon: <SafetyCertificateOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/infrastructure/pihole",
                        name: "Pi-hole DNS",
                        icon: <WifiOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/infrastructure/bind9",
                        name: "BIND9 DNS",
                        icon: <GlobalOutlined />,
                        isLeaf: true,
                    },
                ],
            },
            {
                path: "/admin/settings",
                name: "Settings",
                icon: <SettingOutlined />,
                routes: [
                    {
                        path: "/admin/settings/general",
                        name: "General",
                        icon: <ToolOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/settings/seo",
                        name: "SEO",
                        icon: <GlobalOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/settings/navigation",
                        name: "Navigation",
                        icon: <MenuOutlined />,
                        isLeaf: true,
                    },
                ],
            },
        ],
    },
    location: {
        pathname: "/admin/dashboard",
    },
};

export default menuConfig;
