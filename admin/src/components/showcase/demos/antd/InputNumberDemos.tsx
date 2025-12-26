"use client";

import React, { useState } from "react";
import { InputNumber, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic InputNumber
const BasicInputNumberDemo = () => (
    <InputNumber min={1} max={10} defaultValue={3} />
);

// Demo 2: Sizes
const SizesInputNumberDemo = () => (
    <Space>
        <InputNumber size="large" min={1} max={100} defaultValue={10} />
        <InputNumber min={1} max={100} defaultValue={10} />
        <InputNumber size="small" min={1} max={100} defaultValue={10} />
    </Space>
);

// Demo 3: Formatter
const FormatterInputNumberDemo = () => (
    <Space orientation="vertical">
        <InputNumber
            defaultValue={1000}
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, "") as any}
        />
        <InputNumber
            defaultValue={100}
            min={0}
            max={100}
            formatter={(value) => `${value}%`}
            parser={(value) => value!.replace("%", "") as any}
        />
    </Space>
);

// Demo 4: Disabled
const DisabledInputNumberDemo = () => (
    <InputNumber min={1} max={10} disabled defaultValue={3} />
);

// Demo 5: Step
const StepInputNumberDemo = () => (
    <Space orientation="vertical">
        <InputNumber min={0} max={10} step={0.1} defaultValue={1} />
        <InputNumber min={0} max={100} step={10} defaultValue={50} />
    </Space>
);

// Demo 6: Keyboard Controls
const KeyboardInputNumberDemo = () => (
    <InputNumber keyboard={false} min={1} max={10} defaultValue={3} />
);

// Demo 7: Borderless
const BorderlessInputNumberDemo = () => (
    <InputNumber min={1} max={10} defaultValue={3} variant="borderless" />
);

// Demo 8: Status
const StatusInputNumberDemo = () => (
    <Space orientation="vertical">
        <InputNumber status="error" defaultValue={3} />
        <InputNumber status="warning" defaultValue={3} />
    </Space>
);

// Demo 9: Prefix/Suffix
const AddonInputNumberDemo = () => (
    <Space orientation="vertical">
        <InputNumber addonBefore="+" addonAfter="$" defaultValue={100} />
        <InputNumber prefix="¥" suffix="RMB" defaultValue={100} />
    </Space>
);

export const inputNumberData: AntdComponentData = {
    id: "antd-input-number",
    name: "InputNumber",
    description: "InputNumber provides numeric input with increment/decrement controls, formatting, and validation.",
    whenToUse: "Use InputNumber when you need controlled numeric input with optional min/max, step, and formatting.",
    docUrl: "https://ant.design/components/input-number",
    demos: [
        {
            id: "basic",
            title: "Basic InputNumber",
            description: "Simple numeric input",
            demo: <BasicInputNumberDemo />,
            code: `<InputNumber min={1} max={10} defaultValue={3} />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different input sizes",
            demo: <SizesInputNumberDemo />,
            code: `<InputNumber size="large" />
<InputNumber />
<InputNumber size="small" />`,
        },
        {
            id: "formatter",
            title: "Formatter",
            description: "Currency and percentage formats",
            demo: <FormatterInputNumberDemo />,
            code: `<InputNumber
  formatter={(v) => \`$ \${v}\`.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")}
  parser={(v) => v.replace(/\\$\\s?|(,*)/g, "")}
/>`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive input",
            demo: <DisabledInputNumberDemo />,
            code: `<InputNumber disabled defaultValue={3} />`,
        },
        {
            id: "step",
            title: "Custom Step",
            description: "Increment/decrement step",
            demo: <StepInputNumberDemo />,
            code: `<InputNumber step={0.1} />
<InputNumber step={10} />`,
        },
        {
            id: "keyboard",
            title: "Keyboard Control",
            description: "Disable keyboard input",
            demo: <KeyboardInputNumberDemo />,
            code: `<InputNumber keyboard={false} />`,
        },
        {
            id: "borderless",
            title: "Borderless",
            description: "Without border",
            demo: <BorderlessInputNumberDemo />,
            code: `<InputNumber variant="borderless" />`,
        },
        {
            id: "status",
            title: "Validation Status",
            description: "Error and warning states",
            demo: <StatusInputNumberDemo />,
            code: `<InputNumber status="error" />
<InputNumber status="warning" />`,
        },
        {
            id: "addon",
            title: "Prefix/Suffix",
            description: "Extra elements",
            demo: <AddonInputNumberDemo />,
            code: `<InputNumber addonBefore="+" addonAfter="$" />
<InputNumber prefix="¥" suffix="RMB" />`,
        },
    ],
    apiProps: [
        { name: "value", type: "number", description: "Controlled value" },
        { name: "defaultValue", type: "number", description: "Initial value" },
        { name: "min", type: "number", description: "Minimum value" },
        { name: "max", type: "number", description: "Maximum value" },
        { name: "step", type: "number | string", description: "Step increment", default: "1" },
        { name: "formatter", type: "(value) => string", description: "Format display" },
        { name: "parser", type: "(string) => number", description: "Parse input" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Input size" },
        { name: "disabled", type: "boolean", description: "Disable input" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(value) => void", description: "Change callback" },
    ],
};
