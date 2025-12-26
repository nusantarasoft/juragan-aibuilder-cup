"use client";

import React from "react";
import { ProCard, StatisticCard } from "@ant-design/pro-components";
import { Button, Space, Divider, Typography } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

const { Statistic } = StatisticCard;

// Demo 1: Basic Card
const BasicCardDemo = () => (
    <ProCard title="Basic Card" extra={<a href="#">More</a>} style={{ maxWidth: 400 }}>
        This is the content of the card. You can put any content here.
    </ProCard>
);

// Demo 2: Bordered Card
const BorderedCardDemo = () => (
    <ProCard title="Bordered Card" bordered style={{ maxWidth: 400 }}>
        A card with visible border styling.
    </ProCard>
);

// Demo 3: Hoverable Card
const HoverableCardDemo = () => (
    <ProCard title="Hoverable Card" hoverable style={{ maxWidth: 400 }}>
        Hover over this card to see the effect.
    </ProCard>
);

// Demo 4: Split Cards
const SplitCardDemo = () => (
    <ProCard split="vertical" bordered style={{ maxWidth: 600 }}>
        <ProCard title="Left Panel" colSpan="50%">
            Left content area
        </ProCard>
        <ProCard title="Right Panel">
            Right content area
        </ProCard>
    </ProCard>
);

// Demo 5: Tabs Card
const TabsCardDemo = () => (
    <ProCard
        tabs={{
            items: [
                { label: "Tab 1", key: "tab1", children: "Content of Tab 1" },
                { label: "Tab 2", key: "tab2", children: "Content of Tab 2" },
                { label: "Tab 3", key: "tab3", children: "Content of Tab 3" },
            ],
        }}
        style={{ maxWidth: 500 }}
    />
);

// Demo 6: Collapsible Card
const CollapsibleCardDemo = () => (
    <ProCard
        title="Collapsible Card"
        collapsible
        defaultCollapsed={false}
        style={{ maxWidth: 400 }}
    >
        This card can be collapsed by clicking the header.
    </ProCard>
);

// Demo 7: Grid Layout
const GridLayoutDemo = () => (
    <ProCard gutter={[16, 16]} wrap style={{ maxWidth: 600 }}>
        <ProCard colSpan={12} bordered title="Card 1">Content 1</ProCard>
        <ProCard colSpan={12} bordered title="Card 2">Content 2</ProCard>
        <ProCard colSpan={8} bordered title="Card 3">Content 3</ProCard>
        <ProCard colSpan={8} bordered title="Card 4">Content 4</ProCard>
        <ProCard colSpan={8} bordered title="Card 5">Content 5</ProCard>
    </ProCard>
);

// Demo 8: Statistic Card
const StatisticCardDemo = () => (
    <ProCard gutter={16} wrap style={{ maxWidth: 600 }}>
        <StatisticCard
            colSpan={12}
            statistic={{
                title: "Total Sales",
                value: 126560,
                precision: 2,
                prefix: "$",
            }}
        />
        <StatisticCard
            colSpan={12}
            statistic={{
                title: "Active Users",
                value: 8932,
                suffix: "/ 10000",
            }}
        />
    </ProCard>
);

// Demo 9: Loading Card
const LoadingCardDemo = () => (
    <ProCard title="Loading Card" loading style={{ maxWidth: 400 }}>
        This content is loading...
    </ProCard>
);

// Demo 10: Ghost Card
const GhostCardDemo = () => (
    <div style={{ background: "#f0f2f5", padding: 24 }}>
        <ProCard title="Ghost Card" ghost>
            A ghost card has no background or border.
        </ProCard>
    </div>
);

export const proCardData: AntdComponentData = {
    id: "pro-card",
    name: "ProCard",
    description: "ProCard is an enhanced card component that supports splitting, tabs, collapsing, grid layout, and statistic display.",
    whenToUse: "Use ProCard when you need flexible card layouts with features like split panels, tabs, collapsible sections, or statistic displays. It's ideal for dashboards and data presentation.",
    docUrl: "https://procomponents.ant.design/en-US/components/card",
    demos: [
        {
            id: "basic",
            title: "Basic Card",
            description: "Simple card with title and content",
            demo: <BasicCardDemo />,
            code: `<ProCard title="Basic Card" extra={<a>More</a>}>
  Card content here
</ProCard>`,
        },
        {
            id: "bordered",
            title: "Bordered Card",
            description: "Card with visible border",
            demo: <BorderedCardDemo />,
            code: `<ProCard title="Bordered Card" bordered>
  Content with border
</ProCard>`,
        },
        {
            id: "hoverable",
            title: "Hoverable Card",
            description: "Card with hover effect",
            demo: <HoverableCardDemo />,
            code: `<ProCard title="Hoverable" hoverable>
  Hover me
</ProCard>`,
        },
        {
            id: "split",
            title: "Split Cards",
            description: "Card split into multiple panels",
            demo: <SplitCardDemo />,
            code: `<ProCard split="vertical" bordered>
  <ProCard title="Left" colSpan="50%">Left</ProCard>
  <ProCard title="Right">Right</ProCard>
</ProCard>`,
        },
        {
            id: "tabs",
            title: "Tabs Card",
            description: "Card with tab navigation",
            demo: <TabsCardDemo />,
            code: `<ProCard tabs={{
  items: [
    { label: "Tab 1", key: "1", children: "Content 1" },
    { label: "Tab 2", key: "2", children: "Content 2" },
  ]
}} />`,
        },
        {
            id: "collapsible",
            title: "Collapsible Card",
            description: "Card that can be collapsed",
            demo: <CollapsibleCardDemo />,
            code: `<ProCard title="Collapsible" collapsible defaultCollapsed={false}>
  Collapsible content
</ProCard>`,
        },
        {
            id: "grid",
            title: "Grid Layout",
            description: "Cards arranged in grid",
            demo: <GridLayoutDemo />,
            code: `<ProCard gutter={[16, 16]} wrap>
  <ProCard colSpan={12} bordered>Card 1</ProCard>
  <ProCard colSpan={12} bordered>Card 2</ProCard>
</ProCard>`,
        },
        {
            id: "statistic",
            title: "Statistic Card",
            description: "Card displaying statistics",
            demo: <StatisticCardDemo />,
            code: `<StatisticCard
  statistic={{ title: "Sales", value: 126560, prefix: "$" }}
/>`,
        },
        {
            id: "loading",
            title: "Loading Card",
            description: "Card in loading state",
            demo: <LoadingCardDemo />,
            code: `<ProCard title="Loading" loading>
  Loading content...
</ProCard>`,
        },
        {
            id: "ghost",
            title: "Ghost Card",
            description: "Card without background",
            demo: <GhostCardDemo />,
            code: `<ProCard title="Ghost" ghost>
  No background or border
</ProCard>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Card title" },
        { name: "extra", type: "ReactNode", description: "Extra content in header" },
        { name: "bordered", type: "boolean", description: "Show border", default: "false" },
        { name: "hoverable", type: "boolean", description: "Hover effect", default: "false" },
        { name: "split", type: "'vertical' | 'horizontal'", description: "Split direction" },
        { name: "tabs", type: "TabsConfig", description: "Tabs configuration" },
        { name: "collapsible", type: "boolean", description: "Allow collapse", default: "false" },
        { name: "defaultCollapsed", type: "boolean", description: "Initial collapsed state" },
        { name: "colSpan", type: "number | string", description: "Grid column span (out of 24)" },
        { name: "gutter", type: "number | [number, number]", description: "Grid gap" },
        { name: "loading", type: "boolean", description: "Show loading state" },
        { name: "ghost", type: "boolean", description: "Ghost style (no bg)" },
    ],
};
