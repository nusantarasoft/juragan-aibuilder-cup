"use client";

import React from "react";
import { Layout, Menu, Breadcrumb, theme } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Header, Content, Footer, Sider } = Layout;

// Demo 1: Basic Layout
const BasicLayoutDemo = () => (
    <Layout style={{ height: 200 }}>
        <Header style={{ background: "#001529", color: "white", textAlign: "center", lineHeight: "64px" }}>Header</Header>
        <Content style={{ background: "#f0f2f5", padding: 24, textAlign: "center" }}>Content</Content>
        <Footer style={{ background: "#e8e8e8", textAlign: "center" }}>Footer</Footer>
    </Layout>
);

// Demo 2: Header-Sider Layout
const HeaderSiderLayoutDemo = () => (
    <Layout style={{ height: 200 }}>
        <Header style={{ background: "#001529", color: "white", textAlign: "center", lineHeight: "64px" }}>Header</Header>
        <Layout>
            <Sider width={120} style={{ background: "#001529", color: "white", textAlign: "center", paddingTop: 24 }}>Sider</Sider>
            <Content style={{ background: "#f0f2f5", padding: 24, textAlign: "center" }}>Content</Content>
        </Layout>
    </Layout>
);

// Demo 3: Sider Layout
const SiderLayoutDemo = () => (
    <Layout style={{ height: 200 }}>
        <Sider width={100} style={{ background: "#001529", color: "white", textAlign: "center", paddingTop: 40 }}>Sider</Sider>
        <Layout>
            <Header style={{ background: "#1890ff", color: "white", textAlign: "center", lineHeight: "50px", height: 50 }}>Header</Header>
            <Content style={{ background: "#f0f2f5", padding: 16, textAlign: "center" }}>Content</Content>
            <Footer style={{ background: "#e8e8e8", textAlign: "center", padding: 8 }}>Footer</Footer>
        </Layout>
    </Layout>
);

// Demo 4: Fixed Header
const FixedHeaderLayoutDemo = () => (
    <Layout style={{ height: 200 }}>
        <Header style={{ position: "sticky", top: 0, zIndex: 1, background: "#001529", color: "white", textAlign: "center", lineHeight: "64px" }}>
            Fixed Header
        </Header>
        <Content style={{ background: "#f0f2f5", padding: 24, overflow: "auto" }}>
            <p>Scrollable content area</p>
            <p>Content</p>
            <p>Content</p>
        </Content>
    </Layout>
);

// Demo 5: Collapsible Sider Mockup
const CollapsibleSiderDemo = () => (
    <Layout style={{ height: 200 }}>
        <Sider collapsible collapsed={false} style={{ background: "#001529" }}>
            <div style={{ height: 32, margin: 16, background: "rgba(255,255,255,0.2)" }} />
            <Menu theme="dark" mode="inline" defaultSelectedKeys={["1"]} items={[
                { key: "1", label: "Nav 1" },
                { key: "2", label: "Nav 2" },
            ]} />
        </Sider>
        <Layout>
            <Header style={{ background: "white", padding: 0 }} />
            <Content style={{ margin: 16, background: "white", padding: 16 }}>Content</Content>
        </Layout>
    </Layout>
);

// Demo 6: Right Sider
const RightSiderLayoutDemo = () => (
    <Layout style={{ height: 200 }}>
        <Sider width={100} style={{ background: "#001529", color: "white", textAlign: "center", paddingTop: 40 }}>Left</Sider>
        <Content style={{ background: "#f0f2f5", padding: 16, textAlign: "center" }}>Content</Content>
        <Sider width={100} style={{ background: "#1890ff", color: "white", textAlign: "center", paddingTop: 40 }}>Right</Sider>
    </Layout>
);

export const layoutData: AntdComponentData = {
    id: "antd-layout",
    name: "Layout",
    description: "Layout provides Header, Content, Footer, and Sider components for creating standard page layouts with flexible arrangements.",
    whenToUse: "Use Layout for the overall structure of a page. Combine Header, Sider, Content, and Footer for standard admin layouts.",
    docUrl: "https://ant.design/components/layout",
    demos: [
        {
            id: "basic",
            title: "Basic Layout",
            description: "Header-Content-Footer",
            demo: <BasicLayoutDemo />,
            code: `<Layout>
  <Header>Header</Header>
  <Content>Content</Content>
  <Footer>Footer</Footer>
</Layout>`,
        },
        {
            id: "header-sider",
            title: "Header-Sider Layout",
            description: "Top header with sidebar",
            demo: <HeaderSiderLayoutDemo />,
            code: `<Layout>
  <Header>Header</Header>
  <Layout>
    <Sider>Sider</Sider>
    <Content>Content</Content>
  </Layout>
</Layout>`,
        },
        {
            id: "sider",
            title: "Sider Layout",
            description: "Sidebar-first layout",
            demo: <SiderLayoutDemo />,
            code: `<Layout>
  <Sider>Sider</Sider>
  <Layout>
    <Header>Header</Header>
    <Content>Content</Content>
    <Footer>Footer</Footer>
  </Layout>
</Layout>`,
        },
        {
            id: "fixed-header",
            title: "Fixed Header",
            description: "Sticky header on scroll",
            demo: <FixedHeaderLayoutDemo />,
            code: `<Header style={{ position: "sticky", top: 0 }}>
  Fixed Header
</Header>`,
        },
        {
            id: "collapsible",
            title: "Collapsible Sider",
            description: "Sider with collapse trigger",
            demo: <CollapsibleSiderDemo />,
            code: `<Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
  <Menu theme="dark" items={menuItems} />
</Sider>`,
        },
        {
            id: "right-sider",
            title: "Dual Sider",
            description: "Left and right sidebars",
            demo: <RightSiderLayoutDemo />,
            code: `<Layout>
  <Sider>Left</Sider>
  <Content>Content</Content>
  <Sider>Right</Sider>
</Layout>`,
        },
    ],
    apiProps: [
        { name: "Layout.hasSider", type: "boolean", description: "Whether contains Sider" },
        { name: "Sider.width", type: "number | string", description: "Sider width", default: "200" },
        { name: "Sider.collapsible", type: "boolean", description: "Show collapse trigger" },
        { name: "Sider.collapsed", type: "boolean", description: "Collapsed state" },
        { name: "Sider.onCollapse", type: "(collapsed) => void", description: "Collapse callback" },
        { name: "Sider.breakpoint", type: "'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'", description: "Responsive breakpoint" },
    ],
};
