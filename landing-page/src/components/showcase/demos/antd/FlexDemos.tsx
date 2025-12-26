"use client";

import React from "react";
import { Flex, Button, Tag, Radio, Slider, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Flex
const BasicFlexDemo = () => (
    <Flex gap="small" wrap>
        <Button type="primary">Button 1</Button>
        <Button>Button 2</Button>
        <Button type="dashed">Button 3</Button>
    </Flex>
);

// Demo 2: Justify Content
const JustifyFlexDemo = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Flex justify="flex-start" style={{ background: "#f0f0f0", padding: 8 }}>
            <Button>Start</Button><Button>Start</Button>
        </Flex>
        <Flex justify="center" style={{ background: "#f0f0f0", padding: 8 }}>
            <Button>Center</Button><Button>Center</Button>
        </Flex>
        <Flex justify="flex-end" style={{ background: "#f0f0f0", padding: 8 }}>
            <Button>End</Button><Button>End</Button>
        </Flex>
        <Flex justify="space-between" style={{ background: "#f0f0f0", padding: 8 }}>
            <Button>Between</Button><Button>Between</Button>
        </Flex>
    </div>
);

// Demo 3: Align Items
const AlignFlexDemo = () => (
    <Flex align="center" style={{ height: 80, background: "#f0f0f0", padding: 8 }}>
        <Button>Aligned</Button>
        <div style={{ height: 60, background: "#1890ff", width: 40 }} />
        <Button>Center</Button>
    </Flex>
);

// Demo 4: Vertical Flex
const VerticalFlexDemo = () => (
    <Flex vertical gap="small">
        <Button type="primary">First</Button>
        <Button>Second</Button>
        <Button type="dashed">Third</Button>
    </Flex>
);

// Demo 5: Gap Sizes
const GapFlexDemo = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Flex gap="small">
            <Tag>Small</Tag><Tag>Gap</Tag><Tag>Items</Tag>
        </Flex>
        <Flex gap="middle">
            <Tag>Middle</Tag><Tag>Gap</Tag><Tag>Items</Tag>
        </Flex>
        <Flex gap="large">
            <Tag>Large</Tag><Tag>Gap</Tag><Tag>Items</Tag>
        </Flex>
        <Flex gap={32}>
            <Tag>32px</Tag><Tag>Gap</Tag><Tag>Items</Tag>
        </Flex>
    </div>
);

// Demo 6: Flex Wrap
const WrapFlexDemo = () => (
    <Flex wrap gap="small" style={{ width: 200 }}>
        {Array.from({ length: 8 }).map((_, i) => (
            <Button key={i}>Item {i + 1}</Button>
        ))}
    </Flex>
);

export const flexData: AntdComponentData = {
    id: "antd-flex",
    name: "Flex",
    description: "Flex is a wrapper component that simplifies flexbox layouts with alignment, justification, and gap controls.",
    whenToUse: "Use Flex for quick flexbox layouts without writing custom CSS. Perfect for button groups, toolbars, and simple layouts.",
    docUrl: "https://ant.design/components/flex",
    demos: [
        {
            id: "basic",
            title: "Basic Flex",
            description: "Simple flex container",
            demo: <BasicFlexDemo />,
            code: `<Flex gap="small" wrap>
  <Button type="primary">Button 1</Button>
  <Button>Button 2</Button>
</Flex>`,
        },
        {
            id: "justify",
            title: "Justify Content",
            description: "Horizontal alignment options",
            demo: <JustifyFlexDemo />,
            code: `<Flex justify="flex-start">...</Flex>
<Flex justify="center">...</Flex>
<Flex justify="flex-end">...</Flex>
<Flex justify="space-between">...</Flex>`,
        },
        {
            id: "align",
            title: "Align Items",
            description: "Vertical alignment",
            demo: <AlignFlexDemo />,
            code: `<Flex align="center" style={{ height: 80 }}>
  <Button>Aligned Center</Button>
</Flex>`,
        },
        {
            id: "vertical",
            title: "Vertical Flex",
            description: "Column direction",
            demo: <VerticalFlexDemo />,
            code: `<Flex vertical gap="small">
  <Button>First</Button>
  <Button>Second</Button>
</Flex>`,
        },
        {
            id: "gap",
            title: "Gap Sizes",
            description: "Different gap options",
            demo: <GapFlexDemo />,
            code: `<Flex gap="small">...</Flex>
<Flex gap="middle">...</Flex>
<Flex gap="large">...</Flex>
<Flex gap={32}>...</Flex>`,
        },
        {
            id: "wrap",
            title: "Flex Wrap",
            description: "Wrapping content",
            demo: <WrapFlexDemo />,
            code: `<Flex wrap gap="small">
  {items.map(i => <Button key={i}>Item</Button>)}
</Flex>`,
        },
    ],
    apiProps: [
        { name: "vertical", type: "boolean", description: "Column direction" },
        { name: "wrap", type: "boolean", description: "Enable wrap" },
        { name: "justify", type: "'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'", description: "Main axis alignment" },
        { name: "align", type: "'flex-start' | 'center' | 'flex-end' | 'stretch'", description: "Cross axis alignment" },
        { name: "gap", type: "'small' | 'middle' | 'large' | number", description: "Gap between items" },
        { name: "flex", type: "string", description: "CSS flex property" },
    ],
};
