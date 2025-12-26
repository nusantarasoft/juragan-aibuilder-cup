"use client";

import React from "react";
import { Descriptions, Badge, Typography } from "antd";
import type { DescriptionsProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const items: DescriptionsProps["items"] = [
    { key: "1", label: "Product", children: "Cloud Database" },
    { key: "2", label: "Billing Mode", children: "Prepaid" },
    { key: "3", label: "Automatic Renewal", children: "YES" },
    { key: "4", label: "Order time", children: "2023-04-24 18:00:00" },
    { key: "5", label: "Usage Time", children: "2023-04-24 18:00:00 - 2024-04-24 18:00:00" },
];

// Demo 1: Basic Descriptions
const BasicDescriptionsDemo = () => (
    <Descriptions title="User Info" items={items} />
);

// Demo 2: Bordered
const BorderedDescriptionsDemo = () => (
    <Descriptions title="User Info" bordered items={items} />
);

// Demo 3: Sizes
const SizesDescriptionsDemo = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Descriptions title="Small" size="small" items={items.slice(0, 3)} />
        <Descriptions title="Default" items={items.slice(0, 3)} />
    </div>
);

// Demo 4: Vertical Layout
const VerticalDescriptionsDemo = () => (
    <Descriptions title="User Info" layout="vertical" items={items.slice(0, 3)} />
);

// Demo 5: Columns
const ColumnsDescriptionsDemo = () => (
    <Descriptions title="User Info" column={2} items={items} />
);

// Demo 6: With Status
const StatusDescriptionsDemo = () => (
    <Descriptions title="Order Info" bordered items={[
        { key: "1", label: "Product", children: "Cloud Database" },
        { key: "2", label: "Status", children: <Badge status="processing" text="Running" /> },
        { key: "3", label: "Billing", children: "Prepaid" },
        { key: "4", label: "Amount", children: "$80.00" },
    ]} />
);

// Demo 7: Responsive
const ResponsiveDescriptionsDemo = () => (
    <Descriptions
        title="Responsive"
        column={{ xs: 1, sm: 2, md: 3 }}
        items={items.slice(0, 3)}
    />
);

export const descriptionsData: AntdComponentData = {
    id: "antd-descriptions",
    name: "Descriptions",
    description: "Descriptions displays multiple read-only fields in groups. Ideal for detail pages or summary views with labeled values.",
    whenToUse: "Use Descriptions for detail pages, order summaries, profile views, or any structured data display.",
    docUrl: "https://ant.design/components/descriptions",
    demos: [
        {
            id: "basic",
            title: "Basic Descriptions",
            description: "Simple key-value pairs",
            demo: <BasicDescriptionsDemo />,
            code: `<Descriptions title="User Info" items={[
  { label: "Product", children: "Cloud Database" },
  { label: "Billing", children: "Prepaid" },
]} />`,
        },
        {
            id: "bordered",
            title: "Bordered",
            description: "With borders",
            demo: <BorderedDescriptionsDemo />,
            code: `<Descriptions bordered items={items} />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different sizes",
            demo: <SizesDescriptionsDemo />,
            code: `<Descriptions size="small" items={items} />
<Descriptions size="default" items={items} />`,
        },
        {
            id: "vertical",
            title: "Vertical Layout",
            description: "Labels above values",
            demo: <VerticalDescriptionsDemo />,
            code: `<Descriptions layout="vertical" items={items} />`,
        },
        {
            id: "columns",
            title: "Custom Columns",
            description: "Two columns",
            demo: <ColumnsDescriptionsDemo />,
            code: `<Descriptions column={2} items={items} />`,
        },
        {
            id: "status",
            title: "With Status",
            description: "Include badges",
            demo: <StatusDescriptionsDemo />,
            code: `{ label: "Status", children: <Badge status="processing" text="Running" /> }`,
        },
        {
            id: "responsive",
            title: "Responsive",
            description: "Columns per breakpoint",
            demo: <ResponsiveDescriptionsDemo />,
            code: `<Descriptions column={{ xs: 1, sm: 2, md: 3 }} items={items} />`,
        },
    ],
    apiProps: [
        { name: "items", type: "DescriptionItem[]", description: "Item definitions" },
        { name: "title", type: "ReactNode", description: "Title content" },
        { name: "bordered", type: "boolean", description: "Show borders" },
        { name: "layout", type: "'horizontal' | 'vertical'", description: "Layout direction", default: "horizontal" },
        { name: "column", type: "number | object", description: "Columns count", default: "3" },
        { name: "size", type: "'default' | 'middle' | 'small'", description: "Size variant" },
        { name: "colon", type: "boolean", description: "Show colon", default: "true" },
        { name: "extra", type: "ReactNode", description: "Extra content" },
    ],
};
