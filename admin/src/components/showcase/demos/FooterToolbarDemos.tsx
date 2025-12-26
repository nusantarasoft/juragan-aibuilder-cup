"use client";

import React from "react";
import { FooterToolbar } from "@ant-design/pro-components";
import { Button, Space, Card, message } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Footer Toolbar
const BasicFooterToolbarDemo = () => (
    <div style={{ position: "relative", minHeight: 150, border: "1px solid #f0f0f0", borderRadius: 8 }}>
        <Card size="small">Form content goes here</Card>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "12px 24px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button>Cancel</Button>
            <Button type="primary">Submit</Button>
        </div>
    </div>
);

// Demo 2: With Extra Content
const ExtraContentDemo = () => (
    <div style={{ position: "relative", minHeight: 150, border: "1px solid #f0f0f0", borderRadius: 8 }}>
        <Card size="small">Page content</Card>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#666" }}>Selected: 3 items</span>
            <Space>
                <Button>Reset</Button>
                <Button type="primary">Save All</Button>
            </Space>
        </div>
    </div>
);

// Demo 3: Multiple Actions
const MultipleActionsDemo = () => (
    <div style={{ position: "relative", minHeight: 150, border: "1px solid #f0f0f0", borderRadius: 8 }}>
        <Card size="small">Document editor content</Card>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "12px 24px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button>Save Draft</Button>
            <Button>Preview</Button>
            <Button type="primary">Publish</Button>
        </div>
    </div>
);

// Demo 4: With Status Info
const StatusInfoDemo = () => (
    <div style={{ position: "relative", minHeight: 150, border: "1px solid #f0f0f0", borderRadius: 8 }}>
        <Card size="small">Batch operation interface</Card>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
                <span style={{ marginRight: 16 }}>Total: <strong>156</strong></span>
                <span style={{ marginRight: 16 }}>Selected: <strong style={{ color: "#1890ff" }}>12</strong></span>
                <span>Amount: <strong style={{ color: "#52c41a" }}>$2,450.00</strong></span>
            </div>
            <Space>
                <Button>Clear</Button>
                <Button type="primary" danger>Delete Selected</Button>
                <Button type="primary">Process</Button>
            </Space>
        </div>
    </div>
);

export const footerToolbarData: AntdComponentData = {
    id: "pro-footer-toolbar",
    name: "FooterToolbar",
    description: "FooterToolbar provides a sticky footer bar for forms and pages with action buttons, typically used for save/submit operations.",
    whenToUse: "Use FooterToolbar when you need persistent action buttons at the bottom of a page or form, especially for long pages where buttons would otherwise scroll out of view.",
    docUrl: "https://procomponents.ant.design/en-US/components/footer-toolbar",
    demos: [
        {
            id: "basic",
            title: "Basic Footer Toolbar",
            description: "Simple footer with buttons",
            demo: <BasicFooterToolbarDemo />,
            code: `<FooterToolbar>
  <Button>Cancel</Button>
  <Button type="primary">Submit</Button>
</FooterToolbar>`,
        },
        {
            id: "extra",
            title: "With Extra Content",
            description: "Footer with left-side info",
            demo: <ExtraContentDemo />,
            code: `<FooterToolbar extra={<span>Selected: 3 items</span>}>
  <Button>Reset</Button>
  <Button type="primary">Save All</Button>
</FooterToolbar>`,
        },
        {
            id: "multiple",
            title: "Multiple Actions",
            description: "Footer with several action buttons",
            demo: <MultipleActionsDemo />,
            code: `<FooterToolbar>
  <Button>Save Draft</Button>
  <Button>Preview</Button>
  <Button type="primary">Publish</Button>
</FooterToolbar>`,
        },
        {
            id: "status",
            title: "With Status Info",
            description: "Footer showing selection/total info",
            demo: <StatusInfoDemo />,
            code: `<FooterToolbar
  extra={
    <div>
      <span>Total: 156</span>
      <span>Selected: 12</span>
    </div>
  }
>
  <Button type="primary">Process</Button>
</FooterToolbar>`,
        },
    ],
    apiProps: [
        { name: "children", type: "ReactNode", description: "Action buttons to render" },
        { name: "extra", type: "ReactNode", description: "Extra content on the left" },
        { name: "style", type: "CSSProperties", description: "Custom styles" },
        { name: "className", type: "string", description: "Custom class name" },
        { name: "portalDom", type: "boolean", description: "Render with portal", default: "true" },
    ],
};
