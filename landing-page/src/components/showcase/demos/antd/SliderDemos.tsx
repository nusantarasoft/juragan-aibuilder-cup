"use client";

import React, { useState } from "react";
import { Slider, Space, Typography, Switch, InputNumber } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Slider
const BasicSliderDemo = () => (
    <Slider defaultValue={30} />
);

// Demo 2: Range Slider
const RangeSliderDemo = () => (
    <Slider range defaultValue={[20, 50]} />
);

// Demo 3: With Input
const InputSliderDemo = () => {
    const [value, setValue] = useState(1);
    return (
        <Space style={{ width: "100%" }}>
            <Slider min={1} max={20} onChange={setValue} value={value} style={{ flex: 1 }} />
            <InputNumber min={1} max={20} value={value} onChange={(v) => setValue(v || 0)} />
        </Space>
    );
};

// Demo 4: Disabled
const DisabledSliderDemo = () => (
    <Slider defaultValue={30} disabled />
);

// Demo 5: With Marks
const MarksSliderDemo = () => (
    <Slider
        marks={{
            0: "0°C",
            26: "26°C",
            37: "37°C",
            100: {
                style: { color: "#f50" },
                label: <strong>100°C</strong>,
            },
        }}
        defaultValue={37}
    />
);

// Demo 6: Steps
const StepsSliderDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Slider step={10} defaultValue={20} />
        <Slider step={null} marks={{ 0: "0", 20: "20", 40: "40", 60: "60", 80: "80", 100: "100" }} defaultValue={20} />
    </Space>
);

// Demo 7: Vertical
const VerticalSliderDemo = () => (
    <div style={{ height: 150, display: "flex", gap: 24 }}>
        <Slider vertical defaultValue={30} />
        <Slider vertical range defaultValue={[20, 50]} />
        <Slider vertical marks={{ 0: "0", 50: "50", 100: "100" }} defaultValue={30} />
    </div>
);

// Demo 8: Tooltip
const TooltipSliderDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Slider defaultValue={30} tooltip={{ open: true }} />
        <Slider defaultValue={30} tooltip={{ formatter: (v) => `${v}%` }} />
    </Space>
);

// Demo 9: Reversed
const ReversedSliderDemo = () => (
    <Slider defaultValue={30} reverse />
);

export const sliderData: AntdComponentData = {
    id: "antd-slider",
    name: "Slider",
    description: "Slider is used to select a value or range from a given range. Supports marks, steps, and vertical orientation.",
    whenToUse: "Use Slider when users need to select a value from a continuous range, such as volume control or price filters.",
    docUrl: "https://ant.design/components/slider",
    demos: [
        {
            id: "basic",
            title: "Basic Slider",
            description: "Simple slider",
            demo: <BasicSliderDemo />,
            code: `<Slider defaultValue={30} />`,
        },
        {
            id: "range",
            title: "Range Slider",
            description: "Select a range",
            demo: <RangeSliderDemo />,
            code: `<Slider range defaultValue={[20, 50]} />`,
        },
        {
            id: "input",
            title: "With Input",
            description: "Slider with InputNumber",
            demo: <InputSliderDemo />,
            code: `<Slider value={value} onChange={setValue} />
<InputNumber value={value} onChange={setValue} />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive slider",
            demo: <DisabledSliderDemo />,
            code: `<Slider disabled defaultValue={30} />`,
        },
        {
            id: "marks",
            title: "With Marks",
            description: "Labeled positions",
            demo: <MarksSliderDemo />,
            code: `<Slider marks={{ 0: "0°C", 100: "100°C" }} />`,
        },
        {
            id: "steps",
            title: "Custom Steps",
            description: "Different step values",
            demo: <StepsSliderDemo />,
            code: `<Slider step={10} />
<Slider step={null} marks={marks} />`,
        },
        {
            id: "vertical",
            title: "Vertical",
            description: "Vertical orientation",
            demo: <VerticalSliderDemo />,
            code: `<Slider vertical defaultValue={30} />`,
        },
        {
            id: "tooltip",
            title: "Tooltip",
            description: "Custom tooltip display",
            demo: <TooltipSliderDemo />,
            code: `<Slider tooltip={{ open: true }} />
<Slider tooltip={{ formatter: (v) => \`\${v}%\` }} />`,
        },
        {
            id: "reversed",
            title: "Reversed",
            description: "Reversed direction",
            demo: <ReversedSliderDemo />,
            code: `<Slider reverse />`,
        },
    ],
    apiProps: [
        { name: "value", type: "number | [number, number]", description: "Controlled value" },
        { name: "defaultValue", type: "number | [number, number]", description: "Initial value" },
        { name: "min", type: "number", description: "Minimum value", default: "0" },
        { name: "max", type: "number", description: "Maximum value", default: "100" },
        { name: "step", type: "number | null", description: "Step increment", default: "1" },
        { name: "range", type: "boolean", description: "Enable range mode" },
        { name: "marks", type: "object", description: "Mark labels" },
        { name: "vertical", type: "boolean", description: "Vertical orientation" },
        { name: "reverse", type: "boolean", description: "Reverse direction" },
        { name: "disabled", type: "boolean", description: "Disable slider" },
        { name: "tooltip", type: "{ open, formatter }", description: "Tooltip config" },
        { name: "onChange", type: "(value) => void", description: "Change callback" },
    ],
};
