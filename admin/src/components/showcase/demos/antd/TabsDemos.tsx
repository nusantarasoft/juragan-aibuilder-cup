"use client";

import React, { useState } from "react";
import { Tabs, Badge } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Tabs
const BasicTabsDemo = () => (
    <Tabs
        defaultActiveKey="1"
        items={[
            { key: "1", label: "Tab 1", children: "Content of Tab 1" },
            { key: "2", label: "Tab 2", children: "Content of Tab 2" },
            { key: "3", label: "Tab 3", children: "Content of Tab 3" },
        ]}
    />
);

// Demo 2: Card Style Tabs
const CardTabsDemo = () => (
    <Tabs
        type="card"
        items={[
            { key: "1", label: "Card Tab 1", children: "Card content 1" },
            { key: "2", label: "Card Tab 2", children: "Card content 2" },
        ]}
    />
);

// Demo 3: Tab Positions
const PositionTabsDemo = () => {
    const [position, setPosition] = useState<"top" | "left" | "right" | "bottom">("top");

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                {["top", "left", "right", "bottom"].map((pos) => (
                    <button
                        key={pos}
                        onClick={() => setPosition(pos as any)}
                        style={{ marginRight: 8, padding: "4px 8px", background: position === pos ? "#1890ff" : "#f0f0f0", border: "none", borderRadius: 4, cursor: "pointer", color: position === pos ? "white" : "black" }}
                    >
                        {pos}
                    </button>
                ))}
            </div>
            <Tabs
                tabPosition={position}
                items={[
                    { key: "1", label: "Tab 1", children: "Content of Tab 1" },
                    { key: "2", label: "Tab 2", children: "Content of Tab 2" },
                ]}
                style={{ height: position === "left" || position === "right" ? 150 : "auto" }}
            />
        </div>
    );
};

// Demo 4: Disabled Tab
const DisabledTabDemo = () => (
    <Tabs
        items={[
            { key: "1", label: "Tab 1", children: "Content 1" },
            { key: "2", label: "Tab 2 (Disabled)", children: "Content 2", disabled: true },
            { key: "3", label: "Tab 3", children: "Content 3" },
        ]}
    />
);

// Demo 5: Tab with Icon
const IconTabsDemo = () => (
    <Tabs
        items={[
            { key: "1", label: <span>🏠 Home</span>, children: "Home content" },
            { key: "2", label: <span>👤 Profile</span>, children: "Profile content" },
            { key: "3", label: <span>⚙️ Settings</span>, children: "Settings content" },
        ]}
    />
);

// Demo 6: Tab with Badge
const BadgeTabsDemo = () => (
    <Tabs
        items={[
            { key: "1", label: "Messages", children: "Messages content" },
            { key: "2", label: <Badge count={5} offset={[10, 0]}>Notifications</Badge>, children: "Notifications content" },
            { key: "3", label: <Badge dot><span>Updates</span></Badge>, children: "Updates content" },
        ]}
    />
);

// Demo 7: Centered Tabs
const CenteredTabsDemo = () => (
    <Tabs
        centered
        items={[
            { key: "1", label: "Centered 1", children: "Content 1" },
            { key: "2", label: "Centered 2", children: "Content 2" },
            { key: "3", label: "Centered 3", children: "Content 3" },
        ]}
    />
);

// Demo 8: Size Variants
const SizeTabsDemo = () => (
    <div>
        <Tabs
            size="small"
            items={[
                { key: "1", label: "Small 1", children: "Small content" },
                { key: "2", label: "Small 2", children: "Small content" },
            ]}
        />
        <Tabs
            size="large"
            items={[
                { key: "1", label: "Large 1", children: "Large content" },
                { key: "2", label: "Large 2", children: "Large content" },
            ]}
        />
    </div>
);

export const tabsData: AntdComponentData = {
    id: "antd-tabs",
    name: "Tabs",
    description: "Tabs organize content into separate views where only one view is visible at a time. Users can switch between tabs.",
    whenToUse: "Use Tabs to organize content into multiple panels, allowing users to switch between them without leaving the page.",
    docUrl: "https://ant.design/components/tabs",
    demos: [
        {
            id: "basic",
            title: "Basic Tabs",
            description: "Simple tab navigation",
            demo: <BasicTabsDemo />,
            code: `<Tabs
  items={[
    { key: "1", label: "Tab 1", children: "Content 1" },
    { key: "2", label: "Tab 2", children: "Content 2" },
  ]}
/>`,
        },
        {
            id: "card",
            title: "Card Style",
            description: "Tabs with card styling",
            demo: <CardTabsDemo />,
            code: `<Tabs type="card" items={[...]} />`,
        },
        {
            id: "position",
            title: "Tab Positions",
            description: "Top, left, right, bottom positions",
            demo: <PositionTabsDemo />,
            code: `<Tabs tabPosition="left" items={[...]} />`,
        },
        {
            id: "disabled",
            title: "Disabled Tab",
            description: "Individual tab disabled",
            demo: <DisabledTabDemo />,
            code: `{ key: "2", label: "Disabled", disabled: true }`,
        },
        {
            id: "icon",
            title: "Tab with Icon",
            description: "Icons in tab labels",
            demo: <IconTabsDemo />,
            code: `{ key: "1", label: <span>🏠 Home</span>, children: "Content" }`,
        },
        {
            id: "badge",
            title: "Tab with Badge",
            description: "Badge on tab labels",
            demo: <BadgeTabsDemo />,
            code: `{ key: "1", label: <Badge count={5}>Tab</Badge> }`,
        },
        {
            id: "centered",
            title: "Centered Tabs",
            description: "Center-aligned tabs",
            demo: <CenteredTabsDemo />,
            code: `<Tabs centered items={[...]} />`,
        },
        {
            id: "size",
            title: "Size Variants",
            description: "Small and large sizes",
            demo: <SizeTabsDemo />,
            code: `<Tabs size="small" items={[...]} />
<Tabs size="large" items={[...]} />`,
        },
    ],
    apiProps: [
        { name: "items", type: "TabItem[]", description: "Tab items array", required: true },
        { name: "activeKey", type: "string", description: "Controlled active tab" },
        { name: "defaultActiveKey", type: "string", description: "Initial active tab" },
        { name: "type", type: "'line' | 'card' | 'editable-card'", description: "Tab style", default: "line" },
        { name: "tabPosition", type: "'top' | 'left' | 'right' | 'bottom'", description: "Tab position", default: "top" },
        { name: "size", type: "'small' | 'middle' | 'large'", description: "Tab size" },
        { name: "centered", type: "boolean", description: "Center tabs" },
        { name: "onChange", type: "(activeKey) => void", description: "Tab change callback" },
    ],
};
