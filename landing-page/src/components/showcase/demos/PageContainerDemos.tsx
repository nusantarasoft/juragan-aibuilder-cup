"use client";

import React from "react";
import { PageContainer } from "@ant-design/pro-components";
import { Button, Card, Space, Tabs, Statistic, Alert, Breadcrumb } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Page Container
const BasicDemo = () => (
    <PageContainer
        title="Page Title"
        subTitle="This is a subtitle"
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>Page content goes here</Card>
    </PageContainer>
);

// Demo 2: With Breadcrumb
const BreadcrumbDemo = () => (
    <PageContainer
        title="Settings"
        breadcrumb={{
            items: [
                { title: "Home" },
                { title: "Admin" },
                { title: "Settings" },
            ],
        }}
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>Settings page content</Card>
    </PageContainer>
);

// Demo 3: With Extra Actions
const ExtraActionsDemo = () => (
    <PageContainer
        title="User Management"
        subTitle="Manage system users"
        extra={[
            <Button key="export">Export</Button>,
            <Button key="add" type="primary">Add User</Button>,
        ]}
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>User list content</Card>
    </PageContainer>
);

// Demo 4: With Tabs
const TabsDemo = () => (
    <PageContainer
        title="Dashboard"
        tabList={[
            { tab: "Overview", key: "overview" },
            { tab: "Analytics", key: "analytics" },
            { tab: "Reports", key: "reports" },
        ]}
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>Tab content here</Card>
    </PageContainer>
);

// Demo 5: With Content Header
const ContentHeaderDemo = () => (
    <PageContainer
        title="Project Details"
        content={
            <Space size="large">
                <Statistic title="Total Members" value={28} />
                <Statistic title="Active Tasks" value={156} />
                <Statistic title="Completed" value={89} suffix="%" />
            </Space>
        }
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>Project content</Card>
    </PageContainer>
);

// Demo 6: With Footer Toolbar
const FooterToolbarDemo = () => (
    <PageContainer
        title="Edit Form"
        footer={[
            <Button key="cancel">Cancel</Button>,
            <Button key="save" type="primary">Save</Button>,
        ]}
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>Form content here</Card>
    </PageContainer>
);

// Demo 7: Ghost Mode
const GhostDemo = () => (
    <div style={{ background: "#001529", padding: 24 }}>
        <PageContainer
            title="Ghost Mode"
            ghost
        >
            <Card>Content with ghost header</Card>
        </PageContainer>
    </div>
);

// Demo 8: Loading State
const LoadingDemo = () => (
    <PageContainer
        title="Loading Page"
        loading
        style={{ background: "#f5f5f5", minHeight: 200 }}
    >
        <Card>This content is loading...</Card>
    </PageContainer>
);

export const pageContainerData: AntdComponentData = {
    id: "pro-page-container",
    name: "PageContainer",
    description: "PageContainer wraps page content with a consistent header including title, breadcrumbs, tabs, and extra actions. It's the standard layout for ProLayout pages.",
    whenToUse: "Use PageContainer as the wrapper for page content in admin panels. It provides a consistent header structure with breadcrumbs, title, subtitle, tabs, and action buttons.",
    docUrl: "https://procomponents.ant.design/en-US/components/page-container",
    demos: [
        {
            id: "basic",
            title: "Basic Page Container",
            description: "Simple title and subtitle",
            demo: <BasicDemo />,
            code: `<PageContainer
  title="Page Title"
  subTitle="This is a subtitle"
>
  <Card>Page content</Card>
</PageContainer>`,
        },
        {
            id: "breadcrumb",
            title: "With Breadcrumb",
            description: "Navigation breadcrumbs",
            demo: <BreadcrumbDemo />,
            code: `<PageContainer
  title="Settings"
  breadcrumb={{
    items: [{ title: "Home" }, { title: "Settings" }]
  }}
>
  Content
</PageContainer>`,
        },
        {
            id: "extra",
            title: "With Extra Actions",
            description: "Action buttons in header",
            demo: <ExtraActionsDemo />,
            code: `<PageContainer
  title="Users"
  extra={[
    <Button>Export</Button>,
    <Button type="primary">Add</Button>
  ]}
>
  Content
</PageContainer>`,
        },
        {
            id: "tabs",
            title: "With Tabs",
            description: "Tab navigation in header",
            demo: <TabsDemo />,
            code: `<PageContainer
  title="Dashboard"
  tabList={[
    { tab: "Overview", key: "overview" },
    { tab: "Analytics", key: "analytics" },
  ]}
>
  Content
</PageContainer>`,
        },
        {
            id: "content",
            title: "With Content Header",
            description: "Additional content below title",
            demo: <ContentHeaderDemo />,
            code: `<PageContainer
  title="Project"
  content={
    <Space size="large">
      <Statistic title="Members" value={28} />
      <Statistic title="Tasks" value={156} />
    </Space>
  }
>
  Content
</PageContainer>`,
        },
        {
            id: "footer",
            title: "With Footer Toolbar",
            description: "Footer with action buttons",
            demo: <FooterToolbarDemo />,
            code: `<PageContainer
  title="Edit Form"
  footer={[
    <Button>Cancel</Button>,
    <Button type="primary">Save</Button>
  ]}
>
  Content
</PageContainer>`,
        },
        {
            id: "ghost",
            title: "Ghost Mode",
            description: "Transparent header style",
            demo: <GhostDemo />,
            code: `<PageContainer title="Ghost Mode" ghost>
  Content
</PageContainer>`,
        },
        {
            id: "loading",
            title: "Loading State",
            description: "Page in loading state",
            demo: <LoadingDemo />,
            code: `<PageContainer title="Loading" loading>
  Content
</PageContainer>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Page title" },
        { name: "subTitle", type: "ReactNode", description: "Page subtitle" },
        { name: "breadcrumb", type: "BreadcrumbProps", description: "Breadcrumb configuration" },
        { name: "extra", type: "ReactNode[]", description: "Extra action buttons" },
        { name: "tabList", type: "{ tab, key }[]", description: "Tab list configuration" },
        { name: "content", type: "ReactNode", description: "Content below title" },
        { name: "footer", type: "ReactNode[]", description: "Footer toolbar buttons" },
        { name: "ghost", type: "boolean", description: "Ghost mode (transparent)", default: "false" },
        { name: "loading", type: "boolean", description: "Loading state", default: "false" },
    ],
};
