"use client";

import React, { useState } from "react";
import { Segmented, Space, Avatar } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Segmented
const BasicSegmentedDemo = () => (
    <Segmented options={["Daily", "Weekly", "Monthly", "Yearly"]} />
);

// Demo 2: Block
const BlockSegmentedDemo = () => (
    <Segmented block options={["Option 1", "Option 2", "Option 3"]} />
);

// Demo 3: Disabled
const DisabledSegmentedDemo = () => (
    <Space orientation="vertical">
        <Segmented options={["A", "B", "C"]} disabled />
        <Segmented
            options={[
                { label: "A", value: "a" },
                { label: "B", value: "b", disabled: true },
                { label: "C", value: "c" },
            ]}
        />
    </Space>
);

// Demo 4: Sizes
const SizesSegmentedDemo = () => (
    <Space orientation="vertical">
        <Segmented size="large" options={["Large", "Option"]} />
        <Segmented options={["Default", "Option"]} />
        <Segmented size="small" options={["Small", "Option"]} />
    </Space>
);

// Demo 5: With Icons
const IconSegmentedDemo = () => (
    <Segmented
        options={[
            { label: "List", value: "list", icon: <span>📋</span> },
            { label: "Kanban", value: "kanban", icon: <span>📊</span> },
            { label: "Calendar", value: "calendar", icon: <span>📅</span> },
        ]}
    />
);

// Demo 6: Icon Only
const IconOnlySegmentedDemo = () => (
    <Segmented
        options={[
            { value: "list", icon: <span>📋</span> },
            { value: "kanban", icon: <span>📊</span> },
            { value: "table", icon: <span>📑</span> },
        ]}
    />
);

// Demo 7: Controlled
const ControlledSegmentedDemo = () => {
    const [value, setValue] = useState("weekly");
    return (
        <Space orientation="vertical">
            <Segmented
                options={["daily", "weekly", "monthly"]}
                value={value}
                onChange={(val) => setValue(val as string)}
            />
            <div>Selected: {value}</div>
        </Space>
    );
};

export const segmentedData: AntdComponentData = {
    id: "antd-segmented",
    name: "Segmented",
    description: "Segmented is a toggle control for switching between options. Similar to tabs but more compact, commonly used for view switching.",
    whenToUse: "Use Segmented for switching between views (list/grid), time periods, or any mutually exclusive options.",
    docUrl: "https://ant.design/components/segmented",
    demos: [
        {
            id: "basic",
            title: "Basic Segmented",
            description: "Simple options",
            demo: <BasicSegmentedDemo />,
            code: `<Segmented options={["Daily", "Weekly", "Monthly"]} />`,
        },
        {
            id: "block",
            title: "Block Mode",
            description: "Full width",
            demo: <BlockSegmentedDemo />,
            code: `<Segmented block options={["A", "B", "C"]} />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Disabled states",
            demo: <DisabledSegmentedDemo />,
            code: `<Segmented disabled options={[...]} />
{ label: "B", value: "b", disabled: true }`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different sizes",
            demo: <SizesSegmentedDemo />,
            code: `<Segmented size="large" />
<Segmented size="small" />`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Label with icons",
            demo: <IconSegmentedDemo />,
            code: `{ label: "List", value: "list", icon: <ListIcon /> }`,
        },
        {
            id: "icon-only",
            title: "Icon Only",
            description: "Icons without labels",
            demo: <IconOnlySegmentedDemo />,
            code: `{ value: "list", icon: <ListIcon /> }`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Controlled selection",
            demo: <ControlledSegmentedDemo />,
            code: `<Segmented value={value} onChange={setValue} />`,
        },
    ],
    apiProps: [
        { name: "options", type: "string[] | SegmentedOption[]", description: "Options array" },
        { name: "value", type: "string | number", description: "Controlled value" },
        { name: "defaultValue", type: "string | number", description: "Initial value" },
        { name: "block", type: "boolean", description: "Full width" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Control size" },
        { name: "disabled", type: "boolean", description: "Disable all" },
        { name: "onChange", type: "(value) => void", description: "Change callback" },
    ],
};
