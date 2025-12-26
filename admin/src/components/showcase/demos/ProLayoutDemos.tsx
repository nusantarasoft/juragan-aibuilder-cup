"use client";

import React from "react";
import { Card, Space } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// ProLayout demos use visual mockups because ProLayout is designed for full-page use
// and would break out of the demo container

// Demo 1: Basic Layout Mockup
const BasicLayoutDemo = () => (
    <div style={{ height: 250, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", background: "#f5f5f5" }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: "#001529", color: "white", padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                <span>🏢</span> Admin Panel
            </div>
            <div style={{ padding: "8px 0", opacity: 0.7, cursor: "pointer" }}>📊 Dashboard</div>
            <div style={{ padding: "8px 0", opacity: 0.7, cursor: "pointer" }}>👥 Users</div>
            <div style={{ padding: "8px 0", opacity: 0.7, cursor: "pointer" }}>⚙️ Settings</div>
        </div>
        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "white", padding: "12px 24px", borderBottom: "1px solid #f0f0f0" }}>
                <strong>Dashboard</strong>
            </div>
            <div style={{ flex: 1, padding: 24 }}>
                <div style={{ background: "white", padding: 16, borderRadius: 4 }}>Content Area</div>
            </div>
        </div>
    </div>
);

// Demo 2: Top Navigation Layout Mockup
const TopNavLayoutDemo = () => (
    <div style={{ height: 200, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header with Nav */}
        <div style={{ background: "#001529", color: "white", padding: "12px 24px", display: "flex", alignItems: "center", gap: 32 }}>
            <span style={{ fontWeight: "bold" }}>Top Nav</span>
            <Space size="large">
                <span style={{ opacity: 0.7, cursor: "pointer" }}>Home</span>
                <span style={{ opacity: 0.7, cursor: "pointer" }}>Products</span>
                <span style={{ opacity: 0.7, cursor: "pointer" }}>About</span>
            </Space>
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: 24, background: "#f5f5f5" }}>
            <div style={{ background: "white", padding: 16, borderRadius: 4 }}>Top navigation content</div>
        </div>
    </div>
);

// Demo 3: Mix Layout Mockup
const MixLayoutDemo = () => (
    <div style={{ height: 250, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Top Header */}
        <div style={{ background: "#001529", color: "white", padding: "12px 24px", display: "flex", alignItems: "center", gap: 32 }}>
            <span style={{ fontWeight: "bold" }}>Mix Layout</span>
            <Space size="large">
                <span style={{ opacity: 0.7, cursor: "pointer" }}>Dashboard</span>
                <span style={{ color: "#1890ff", cursor: "pointer" }}>Admin</span>
            </Space>
        </div>
        {/* Body with Sidebar */}
        <div style={{ flex: 1, display: "flex" }}>
            <div style={{ width: 180, background: "white", borderRight: "1px solid #f0f0f0", padding: 16 }}>
                <div style={{ padding: "8px 0", color: "#1890ff" }}>Users</div>
                <div style={{ padding: "8px 0", opacity: 0.6 }}>Roles</div>
            </div>
            <div style={{ flex: 1, padding: 24, background: "#f5f5f5" }}>
                <div style={{ background: "white", padding: 16, borderRadius: 4 }}>Mix layout content</div>
            </div>
        </div>
    </div>
);

// Demo 4: Collapsed Sidebar Mockup
const CollapsedLayoutDemo = () => (
    <div style={{ height: 200, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", background: "#f5f5f5" }}>
        {/* Collapsed Sidebar */}
        <div style={{ width: 60, background: "#001529", color: "white", padding: "16px 8px", textAlign: "center" }}>
            <div style={{ marginBottom: 16 }}>🏢</div>
            <div style={{ padding: "12px 0", opacity: 0.7 }}>🏠</div>
            <div style={{ padding: "12px 0", opacity: 0.7 }}>⚙️</div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: 24 }}>
            <div style={{ background: "white", padding: 16, borderRadius: 4 }}>Collapsed sidebar content</div>
        </div>
    </div>
);

// Demo 5: With Footer Mockup
const FooterLayoutDemo = () => (
    <div style={{ height: 250, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ background: "#001529", color: "white", padding: "12px 24px" }}>
            <span style={{ fontWeight: "bold" }}>With Footer</span>
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: 24, background: "#f5f5f5" }}>
            <div style={{ background: "white", padding: 16, borderRadius: 4 }}>Content with footer</div>
        </div>
        {/* Footer */}
        <div style={{ background: "white", padding: 12, textAlign: "center", borderTop: "1px solid #f0f0f0", color: "#666" }}>
            © 2024 Your Company
        </div>
    </div>
);

// Demo 6: With Right Content Mockup
const RightContentDemo = () => (
    <div style={{ height: 180, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header with Right Content */}
        <div style={{ background: "#001529", color: "white", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space size="large">
                <span style={{ fontWeight: "bold" }}>Right Content</span>
                <span style={{ opacity: 0.7 }}>Home</span>
            </Space>
            <Space>
                <span>🔔</span>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1890ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>U</div>
            </Space>
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: 24, background: "#f5f5f5" }}>
            <div style={{ background: "white", padding: 16, borderRadius: 4 }}>Layout with right content</div>
        </div>
    </div>
);

export const proLayoutData: AntdComponentData = {
    id: "pro-layout",
    name: "ProLayout",
    description: "ProLayout is a standard admin panel layout component with sidebar navigation, header, footer, and content area. Note: ProLayout is designed for full-page use - these demos show visual mockups of the layouts.",
    whenToUse: "Use ProLayout as the main layout wrapper for admin panels and dashboard applications. It provides a consistent navigation structure with sidebar or top navigation.",
    docUrl: "https://procomponents.ant.design/en-US/components/layout",
    demos: [
        {
            id: "basic",
            title: "Basic Layout",
            description: "Standard sidebar layout with navigation",
            demo: <BasicLayoutDemo />,
            code: `<ProLayout
  title="Admin Panel"
  logo={<Logo />}
  route={{ routes: [{ path: "/dashboard", name: "Dashboard" }] }}
  menuItemRender={(item, dom) => <a>{dom}</a>}
>
  <PageContainer title="Dashboard">Content</PageContainer>
</ProLayout>`,
        },
        {
            id: "top",
            title: "Top Navigation",
            description: "Navigation in the header",
            demo: <TopNavLayoutDemo />,
            code: `<ProLayout
  title="Top Nav"
  layout="top"
  route={{ routes: [...] }}
>
  Content
</ProLayout>`,
        },
        {
            id: "mix",
            title: "Mix Layout",
            description: "Combined top and side navigation",
            demo: <MixLayoutDemo />,
            code: `<ProLayout
  title="Mix Layout"
  layout="mix"
  route={{ routes: [...] }}
>
  Content
</ProLayout>`,
        },
        {
            id: "collapsed",
            title: "Collapsed Sidebar",
            description: "Sidebar in collapsed state",
            demo: <CollapsedLayoutDemo />,
            code: `<ProLayout
  title="Collapsed"
  collapsed
  route={{ routes: [...] }}
>
  Content
</ProLayout>`,
        },
        {
            id: "footer",
            title: "With Footer",
            description: "Layout with footer content",
            demo: <FooterLayoutDemo />,
            code: `<ProLayout
  footerRender={() => <Footer>© 2024</Footer>}
>
  Content
</ProLayout>`,
        },
        {
            id: "right",
            title: "Right Content",
            description: "Header with right-side content",
            demo: <RightContentDemo />,
            code: `<ProLayout
  rightContentRender={() => <Space><Bell /><Avatar /></Space>}
>
  Content
</ProLayout>`,
        },
    ],
    apiProps: [
        { name: "title", type: "string", description: "Site title" },
        { name: "logo", type: "ReactNode", description: "Logo element" },
        { name: "layout", type: "'side' | 'top' | 'mix'", description: "Layout mode", default: "side" },
        { name: "route", type: "{ routes: Route[] }", description: "Route configuration" },
        { name: "collapsed", type: "boolean", description: "Sidebar collapsed state" },
        { name: "menuItemRender", type: "(item, dom) => ReactNode", description: "Custom menu item render" },
        { name: "rightContentRender", type: "() => ReactNode", description: "Header right content" },
        { name: "footerRender", type: "() => ReactNode", description: "Footer render function" },
    ],
};
