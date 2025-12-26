"use client";

import React from "react";
import { Spin, Space, Alert, Card } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Spin
const BasicSpinDemo = () => (
    <Spin />
);

// Demo 2: Sizes
const SizesSpinDemo = () => (
    <Space size="large">
        <Spin size="small" />
        <Spin />
        <Spin size="large" />
    </Space>
);

// Demo 3: Inside Container
const ContainerSpinDemo = () => (
    <Spin tip="Loading...">
        <Alert
            message="Alert message"
            description="More description here with some content."
            type="info"
        />
    </Spin>
);

// Demo 4: Custom Indicator
const CustomSpinDemo = () => (
    <Spin indicator={<span style={{ fontSize: 24, animation: "spin 1s linear infinite" }}>⚙️</span>} />
);

// Demo 5: Delay
const DelaySpinDemo = () => (
    <Spin delay={500}>
        <div style={{ padding: 20, background: "#f0f0f0", borderRadius: 8 }}>
            Content with delayed spinner
        </div>
    </Spin>
);

// Demo 6: Nested
const NestedSpinDemo = () => (
    <Card style={{ width: 300 }}>
        <Spin spinning={true}>
            <div style={{ minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                Card content is loading...
            </div>
        </Spin>
    </Card>
);

// Demo 7: With Tip
const TipSpinDemo = () => (
    <Space size="large" orientation="vertical">
        <Spin tip="Loading..." size="small">
            <div style={{ padding: 50, background: "rgba(0,0,0,0.05)", borderRadius: 4 }} />
        </Spin>
        <Spin tip="Processing...">
            <div style={{ padding: 50, background: "rgba(0,0,0,0.05)", borderRadius: 4 }} />
        </Spin>
    </Space>
);

export const spinData: AntdComponentData = {
    id: "antd-spin",
    name: "Spin",
    description: "Spin is a loading indicator for async operations. Supports sizes, custom indicators, tips, and wrapping content.",
    whenToUse: "Use Spin when content is loading, data is being fetched, or any async operation is in progress.",
    docUrl: "https://ant.design/components/spin",
    demos: [
        {
            id: "basic",
            title: "Basic Spin",
            description: "Simple spinner",
            demo: <BasicSpinDemo />,
            code: `<Spin />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Three sizes",
            demo: <SizesSpinDemo />,
            code: `<Spin size="small" />
<Spin />
<Spin size="large" />`,
        },
        {
            id: "container",
            title: "Inside Container",
            description: "Overlay on content",
            demo: <ContainerSpinDemo />,
            code: `<Spin tip="Loading...">
  <Alert message="Content" />
</Spin>`,
        },
        {
            id: "custom",
            title: "Custom Indicator",
            description: "Custom spinner icon",
            demo: <CustomSpinDemo />,
            code: `<Spin indicator={<LoadingOutlined />} />`,
        },
        {
            id: "delay",
            title: "Delay",
            description: "Delayed appearance",
            demo: <DelaySpinDemo />,
            code: `<Spin delay={500}>...</Spin>`,
        },
        {
            id: "nested",
            title: "Nested Loading",
            description: "Card with spinner",
            demo: <NestedSpinDemo />,
            code: `<Spin spinning={isLoading}>
  <Card>Content</Card>
</Spin>`,
        },
        {
            id: "tip",
            title: "With Tip",
            description: "Loading message",
            demo: <TipSpinDemo />,
            code: `<Spin tip="Loading...">
  <div>Content</div>
</Spin>`,
        },
    ],
    apiProps: [
        { name: "spinning", type: "boolean", description: "Show spinner", default: "true" },
        { name: "size", type: "'small' | 'default' | 'large'", description: "Spinner size", default: "default" },
        { name: "tip", type: "ReactNode", description: "Loading text" },
        { name: "delay", type: "number", description: "Delay (ms) before showing" },
        { name: "indicator", type: "ReactNode", description: "Custom spinner" },
        { name: "wrapperClassName", type: "string", description: "Wrapper class" },
        { name: "fullscreen", type: "boolean", description: "Fullscreen overlay" },
    ],
};
