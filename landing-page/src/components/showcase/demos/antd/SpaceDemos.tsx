"use client";

import React from "react";
import { Space, Button, Card, Divider, Typography, Upload } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Space
const BasicSpaceDemo = () => (
    <Space>
        <Button type="primary">Button 1</Button>
        <Button>Button 2</Button>
        <Button type="dashed">Button 3</Button>
    </Space>
);

// Demo 2: Space Sizes
const SizesSpaceDemo = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Space size="small">
            <Button>Small</Button><Button>Small</Button>
        </Space>
        <Space size="middle">
            <Button>Middle</Button><Button>Middle</Button>
        </Space>
        <Space size="large">
            <Button>Large</Button><Button>Large</Button>
        </Space>
        <Space size={32}>
            <Button>32px</Button><Button>32px</Button>
        </Space>
    </div>
);

// Demo 3: Vertical Space
const VerticalSpaceDemo = () => (
    <Space direction="vertical" size="middle">
        <Card title="Card 1" style={{ width: 200 }}>Content 1</Card>
        <Card title="Card 2" style={{ width: 200 }}>Content 2</Card>
        <Card title="Card 3" style={{ width: 200 }}>Content 3</Card>
    </Space>
);

// Demo 4: Space with Wrap
const WrapSpaceDemo = () => (
    <Space size={[8, 16]} wrap style={{ width: 250 }}>
        {Array.from({ length: 10 }).map((_, i) => (
            <Button key={i}>Button {i + 1}</Button>
        ))}
    </Space>
);

// Demo 5: Space with Split
const SplitSpaceDemo = () => (
    <Space split={<Divider orientation="vertical" />}>
        <Text>Link 1</Text>
        <Text>Link 2</Text>
        <Text>Link 3</Text>
    </Space>
);

// Demo 6: Align
const AlignSpaceDemo = () => (
    <Space align="center" size="middle">
        <Button style={{ height: 60 }}>Tall</Button>
        <Button>Normal</Button>
        <span style={{ padding: "8px 12px", background: "#1890ff", color: "white" }}>Box</span>
    </Space>
);

// Demo 7: Compact
const CompactSpaceDemo = () => (
    <Space.Compact>
        <Button>Left</Button>
        <Button>Center</Button>
        <Button>Right</Button>
    </Space.Compact>
);

export const spaceData: AntdComponentData = {
    id: "antd-space",
    name: "Space",
    description: "Space sets consistent spacing between inline elements. Supports horizontal and vertical layouts with various gap sizes.",
    whenToUse: "Use Space to add consistent gaps between elements. Better than manual margin/padding for maintaining design consistency.",
    docUrl: "https://ant.design/components/space",
    demos: [
        {
            id: "basic",
            title: "Basic Space",
            description: "Default horizontal spacing",
            demo: <BasicSpaceDemo />,
            code: `<Space>
  <Button type="primary">Button</Button>
  <Button>Button</Button>
</Space>`,
        },
        {
            id: "sizes",
            title: "Space Sizes",
            description: "Different gap sizes",
            demo: <SizesSpaceDemo />,
            code: `<Space size="small">...</Space>
<Space size="middle">...</Space>
<Space size="large">...</Space>
<Space size={32}>...</Space>`,
        },
        {
            id: "vertical",
            title: "Vertical Space",
            description: "Column layout",
            demo: <VerticalSpaceDemo />,
            code: `<Space direction="vertical" size="middle">
  <Card>Content 1</Card>
  <Card>Content 2</Card>
</Space>`,
        },
        {
            id: "wrap",
            title: "Space with Wrap",
            description: "Wrapping elements",
            demo: <WrapSpaceDemo />,
            code: `<Space size={[8, 16]} wrap>
  {items.map(i => <Button key={i}>Button</Button>)}
</Space>`,
        },
        {
            id: "split",
            title: "Space with Split",
            description: "Separator between items",
            demo: <SplitSpaceDemo />,
            code: `<Space split={<Divider orientation="vertical" />}>
  <Text>Link 1</Text>
  <Text>Link 2</Text>
</Space>`,
        },
        {
            id: "align",
            title: "Align Items",
            description: "Vertical alignment",
            demo: <AlignSpaceDemo />,
            code: `<Space align="center">
  <Button style={{ height: 60 }}>Tall</Button>
  <Button>Normal</Button>
</Space>`,
        },
        {
            id: "compact",
            title: "Space.Compact",
            description: "Compact button group",
            demo: <CompactSpaceDemo />,
            code: `<Space.Compact>
  <Button>Left</Button>
  <Button>Center</Button>
  <Button>Right</Button>
</Space.Compact>`,
        },
    ],
    apiProps: [
        { name: "size", type: "'small' | 'middle' | 'large' | number | [number, number]", description: "Space size", default: "small" },
        { name: "direction", type: "'horizontal' | 'vertical'", description: "Layout direction", default: "horizontal" },
        { name: "align", type: "'start' | 'end' | 'center' | 'baseline'", description: "Alignment" },
        { name: "wrap", type: "boolean", description: "Auto wrap" },
        { name: "split", type: "ReactNode", description: "Separator between items" },
    ],
};
