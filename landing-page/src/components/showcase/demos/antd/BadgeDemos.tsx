"use client";

import React from "react";
import { Badge, Avatar, Space, Button, Switch } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Badge
const BasicBadgeDemo = () => (
    <Space size={24}>
        <Badge count={5}>
            <Avatar shape="square" size="large" />
        </Badge>
        <Badge count={0} showZero>
            <Avatar shape="square" size="large" />
        </Badge>
    </Space>
);

// Demo 2: Overflow Count
const OverflowBadgeDemo = () => (
    <Space size={24}>
        <Badge count={99}>
            <Avatar shape="square" size="large" />
        </Badge>
        <Badge count={100}>
            <Avatar shape="square" size="large" />
        </Badge>
        <Badge count={1000} overflowCount={999}>
            <Avatar shape="square" size="large" />
        </Badge>
    </Space>
);

// Demo 3: Dot Badge
const DotBadgeDemo = () => (
    <Space size={24}>
        <Badge dot>
            <Avatar shape="square" size="large" />
        </Badge>
        <Badge dot>
            <span style={{ fontSize: 20 }}>🔔</span>
        </Badge>
    </Space>
);

// Demo 4: Status Badge
const StatusBadgeDemo = () => (
    <Space direction="vertical">
        <Badge status="success" text="Success" />
        <Badge status="error" text="Error" />
        <Badge status="default" text="Default" />
        <Badge status="processing" text="Processing" />
        <Badge status="warning" text="Warning" />
    </Space>
);

// Demo 5: Colors
const ColorsBadgeDemo = () => (
    <Space wrap>
        <Badge color="pink" text="pink" />
        <Badge color="red" text="red" />
        <Badge color="yellow" text="yellow" />
        <Badge color="orange" text="orange" />
        <Badge color="cyan" text="cyan" />
        <Badge color="green" text="green" />
        <Badge color="blue" text="blue" />
        <Badge color="purple" text="purple" />
    </Space>
);

// Demo 6: Ribbon
const RibbonBadgeDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Badge.Ribbon text="Featured">
            <div style={{ background: "#f0f0f0", padding: 24, borderRadius: 8 }}>
                Content with ribbon
            </div>
        </Badge.Ribbon>
        <Badge.Ribbon text="Sale" color="red">
            <div style={{ background: "#f0f0f0", padding: 24, borderRadius: 8 }}>
                Content with red ribbon
            </div>
        </Badge.Ribbon>
    </Space>
);

// Demo 7: Sizes
const SizesBadgeDemo = () => (
    <Space size={24}>
        <Badge size="default" count={5}>
            <Avatar shape="square" size="large" />
        </Badge>
        <Badge size="small" count={5}>
            <Avatar shape="square" size="large" />
        </Badge>
    </Space>
);

// Demo 8: Offset
const OffsetBadgeDemo = () => (
    <Badge count={5} offset={[10, 10]}>
        <Avatar shape="square" size="large" />
    </Badge>
);

export const badgeData: AntdComponentData = {
    id: "antd-badge",
    name: "Badge",
    description: "Badge generates a small badge to the corner of its children. Supports counts, dots, status indicators, and ribbons.",
    whenToUse: "Use Badge for notification counts, status indicators, or to highlight new/updated items.",
    docUrl: "https://ant.design/components/badge",
    demos: [
        {
            id: "basic",
            title: "Basic Badge",
            description: "Count badge",
            demo: <BasicBadgeDemo />,
            code: `<Badge count={5}>
  <Avatar shape="square" />
</Badge>`,
        },
        {
            id: "overflow",
            title: "Overflow Count",
            description: "Maximum count display",
            demo: <OverflowBadgeDemo />,
            code: `<Badge count={100}>...</Badge>
<Badge count={1000} overflowCount={999}>...</Badge>`,
        },
        {
            id: "dot",
            title: "Dot Badge",
            description: "Simple dot indicator",
            demo: <DotBadgeDemo />,
            code: `<Badge dot>
  <Avatar />
</Badge>`,
        },
        {
            id: "status",
            title: "Status Badge",
            description: "Status indicators",
            demo: <StatusBadgeDemo />,
            code: `<Badge status="success" text="Success" />
<Badge status="error" text="Error" />
<Badge status="processing" text="Processing" />`,
        },
        {
            id: "colors",
            title: "Custom Colors",
            description: "Various badge colors",
            demo: <ColorsBadgeDemo />,
            code: `<Badge color="pink" text="pink" />
<Badge color="green" text="green" />`,
        },
        {
            id: "ribbon",
            title: "Ribbon Badge",
            description: "Corner ribbon style",
            demo: <RibbonBadgeDemo />,
            code: `<Badge.Ribbon text="Featured">
  <Card>Content</Card>
</Badge.Ribbon>`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Default and small",
            demo: <SizesBadgeDemo />,
            code: `<Badge size="default" count={5}>...</Badge>
<Badge size="small" count={5}>...</Badge>`,
        },
        {
            id: "offset",
            title: "Offset Position",
            description: "Custom badge position",
            demo: <OffsetBadgeDemo />,
            code: `<Badge count={5} offset={[10, 10]}>
  <Avatar />
</Badge>`,
        },
    ],
    apiProps: [
        { name: "count", type: "ReactNode | number", description: "Badge content" },
        { name: "dot", type: "boolean", description: "Show dot only" },
        { name: "overflowCount", type: "number", description: "Max count", default: "99" },
        { name: "showZero", type: "boolean", description: "Show zero count" },
        { name: "status", type: "'success' | 'processing' | 'default' | 'error' | 'warning'", description: "Status type" },
        { name: "color", type: "string", description: "Custom color" },
        { name: "size", type: "'default' | 'small'", description: "Badge size" },
        { name: "offset", type: "[number, number]", description: "Position offset" },
        { name: "Ribbon.text", type: "ReactNode", description: "Ribbon text" },
        { name: "Ribbon.color", type: "string", description: "Ribbon color" },
    ],
};
