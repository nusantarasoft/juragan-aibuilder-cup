"use client";

import React from "react";
// Note: ProField has JSX type issues, so we'll show text-based demos with code examples
import { Space, Card, Typography, Tag } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

const { Text } = Typography;

// Demo components showing what ProField would display
// (ProField has type compatibility issues, so we show visual representations)

// Demo 1: Text Value Type
const TextDemo = () => (
    <Card size="small" title="Text Mode">
        <Space orientation="vertical">
            <div><Text type="secondary">Name:</Text> <Text>John Doe</Text></div>
            <div><Text type="secondary">Status:</Text> <Tag color="green">Active</Tag></div>
        </Space>
    </Card>
);

// Demo 2: Date Value Type
const DateDemo = () => (
    <Card size="small" title="Date Mode">
        <Space orientation="vertical">
            <div><Text type="secondary">Created:</Text> <Text>2024-01-15</Text></div>
            <div><Text type="secondary">Time:</Text> <Text>14:30:00</Text></div>
            <div><Text type="secondary">DateTime:</Text> <Text>2024-01-15 14:30</Text></div>
        </Space>
    </Card>
);

// Demo 3: Number Value Type
const NumberDemo = () => (
    <Card size="small" title="Number Mode">
        <Space orientation="vertical">
            <div><Text type="secondary">Progress:</Text> <Text>75%</Text></div>
            <div><Text type="secondary">Money:</Text> <Text>$1,234.56</Text></div>
            <div><Text type="secondary">Digit:</Text> <Text>1,000</Text></div>
        </Space>
    </Card>
);

// Demo 4: Select Value Type
const SelectDemo = () => (
    <Card size="small" title="Select Mode">
        <Space orientation="vertical">
            <div><Text type="secondary">Status:</Text> <Tag color="blue">Processing</Tag></div>
            <div><Text type="secondary">Priority:</Text> <Tag color="red">High</Tag></div>
        </Space>
    </Card>
);

// Demo 5: Code Value Type
const CodeDemo = () => (
    <Card size="small" title="Code Mode">
        <Space orientation="vertical">
            <div><Text type="secondary">ID:</Text> <Text code>abc123xyz</Text></div>
            <div><Text type="secondary">JSON:</Text> <Text code>{`{"key": "value"}`}</Text></div>
        </Space>
    </Card>
);

// Demo 6: Image Value Type
const ImageDemo = () => (
    <Card size="small" title="Image Mode">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text type="secondary">Avatar:</Text>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1890ff", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>U</div>
        </div>
    </Card>
);

export const proFieldData: AntdComponentData = {
    id: "pro-field",
    name: "ProField",
    description: "ProField is an atomic component that renders different value types (text, date, money, progress, etc.) in read or edit mode. It powers valueType in ProTable and ProDescriptions.",
    whenToUse: "Use ProField when you need to render a single value with a specific format (date, money, progress, etc.). It's the building block for ProTable columns and ProDescriptions items.",
    docUrl: "https://procomponents.ant.design/en-US/components/field",
    demos: [
        {
            id: "text",
            title: "Text Value Type",
            description: "Display text and status values",
            demo: <TextDemo />,
            code: `<ProField text="John Doe" mode="read" valueType="text" />
<ProField text="active" mode="read" valueType="select" valueEnum={{
  active: { text: "Active", status: "Success" }
}} />`,
        },
        {
            id: "date",
            title: "Date Value Type",
            description: "Display date, time, and datetime",
            demo: <DateDemo />,
            code: `<ProField text="2024-01-15" mode="read" valueType="date" />
<ProField text="14:30:00" mode="read" valueType="time" />
<ProField text="2024-01-15 14:30" mode="read" valueType="dateTime" />`,
        },
        {
            id: "number",
            title: "Number Value Type",
            description: "Display progress, money, and digits",
            demo: <NumberDemo />,
            code: `<ProField text={75} mode="read" valueType="progress" />
<ProField text={1234.56} mode="read" valueType="money" />
<ProField text={1000} mode="read" valueType="digit" />`,
        },
        {
            id: "select",
            title: "Select Value Type",
            description: "Display enum values as tags",
            demo: <SelectDemo />,
            code: `<ProField
  text="processing"
  mode="read"
  valueType="select"
  valueEnum={{
    processing: { text: "Processing", status: "Processing" },
    success: { text: "Success", status: "Success" },
  }}
/>`,
        },
        {
            id: "code",
            title: "Code Value Type",
            description: "Display code and JSON values",
            demo: <CodeDemo />,
            code: `<ProField text="abc123" mode="read" valueType="code" />
<ProField text='{"key":"value"}' mode="read" valueType="jsonCode" />`,
        },
        {
            id: "image",
            title: "Image Value Type",
            description: "Display images and avatars",
            demo: <ImageDemo />,
            code: `<ProField text="https://example.com/avatar.jpg" mode="read" valueType="image" />
<ProField text="https://example.com/avatar.jpg" mode="read" valueType="avatar" />`,
        },
    ],
    apiProps: [
        { name: "text", type: "any", description: "The value to display", required: true },
        { name: "mode", type: "'read' | 'edit'", description: "Display or edit mode", default: "read" },
        { name: "valueType", type: "string", description: "Value type (text, date, money, progress, etc.)", default: "text" },
        { name: "valueEnum", type: "Record<string, { text, status }>", description: "Enum mapping for select types" },
        { name: "render", type: "(text, props) => ReactNode", description: "Custom render function" },
        { name: "renderFormItem", type: "(text, props) => ReactNode", description: "Custom form item render" },
        { name: "fieldProps", type: "object", description: "Props passed to underlying input" },
    ],
};
