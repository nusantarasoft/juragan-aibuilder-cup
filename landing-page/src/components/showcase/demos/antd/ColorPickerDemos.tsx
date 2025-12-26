"use client";

import React, { useState } from "react";
import { ColorPicker, Space, Typography, Divider } from "antd";
import type { ColorPickerProps, Color } from "antd/es/color-picker";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic ColorPicker
const BasicColorPickerDemo = () => (
    <ColorPicker defaultValue="#1677ff" />
);

// Demo 2: With Alpha
const AlphaColorPickerDemo = () => (
    <ColorPicker defaultValue="#1677ffff" showText />
);

// Demo 3: Different Sizes
const SizesColorPickerDemo = () => (
    <Space>
        <ColorPicker size="small" />
        <ColorPicker />
        <ColorPicker size="large" />
    </Space>
);

// Demo 4: Controlled
const ControlledColorPickerDemo = () => {
    const [color, setColor] = useState<Color | string>("#1677ff");
    return (
        <Space>
            <ColorPicker value={color} onChange={setColor} />
            <Text>Selected: {typeof color === "string" ? color : color.toHexString()}</Text>
        </Space>
    );
};

// Demo 5: Presets
const PresetsColorPickerDemo = () => (
    <ColorPicker
        presets={[
            {
                label: "Primary",
                colors: ["#1677ff", "#52c41a", "#faad14", "#f5222d", "#722ed1"],
            },
            {
                label: "Neutral",
                colors: ["#000000", "#434343", "#8c8c8c", "#bfbfbf", "#ffffff"],
            },
        ]}
    />
);

// Demo 6: Different Formats
const FormatsColorPickerDemo = () => (
    <Space direction="vertical">
        <ColorPicker format="hex" showText />
        <ColorPicker format="rgb" showText />
        <ColorPicker format="hsb" showText />
    </Space>
);

// Demo 7: Disabled
const DisabledColorPickerDemo = () => (
    <ColorPicker disabled defaultValue="#1677ff" />
);

// Demo 8: Trigger
const TriggerColorPickerDemo = () => (
    <Space>
        <ColorPicker>
            <span style={{ padding: "4px 12px", background: "#1677ff", color: "white", borderRadius: 4, cursor: "pointer" }}>
                Custom Trigger
            </span>
        </ColorPicker>
    </Space>
);

export const colorPickerData: AntdComponentData = {
    id: "antd-color-picker",
    name: "ColorPicker",
    description: "ColorPicker provides a color selection interface with support for various color formats, presets, and alpha channel.",
    whenToUse: "Use ColorPicker when users need to select colors, such as in theme customization or design tools.",
    docUrl: "https://ant.design/components/color-picker",
    demos: [
        {
            id: "basic",
            title: "Basic ColorPicker",
            description: "Simple color selection",
            demo: <BasicColorPickerDemo />,
            code: `<ColorPicker defaultValue="#1677ff" />`,
        },
        {
            id: "alpha",
            title: "With Alpha",
            description: "Include opacity selector",
            demo: <AlphaColorPickerDemo />,
            code: `<ColorPicker defaultValue="#1677ffff" showText />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different trigger sizes",
            demo: <SizesColorPickerDemo />,
            code: `<ColorPicker size="small" />
<ColorPicker />
<ColorPicker size="large" />`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Control selected color",
            demo: <ControlledColorPickerDemo />,
            code: `<ColorPicker value={color} onChange={setColor} />`,
        },
        {
            id: "presets",
            title: "Presets",
            description: "Predefined color options",
            demo: <PresetsColorPickerDemo />,
            code: `<ColorPicker presets={[
  { label: "Primary", colors: ["#1677ff", "#52c41a"] }
]} />`,
        },
        {
            id: "formats",
            title: "Color Formats",
            description: "HEX, RGB, HSB output",
            demo: <FormatsColorPickerDemo />,
            code: `<ColorPicker format="hex" showText />
<ColorPicker format="rgb" showText />
<ColorPicker format="hsb" showText />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive picker",
            demo: <DisabledColorPickerDemo />,
            code: `<ColorPicker disabled />`,
        },
        {
            id: "trigger",
            title: "Custom Trigger",
            description: "Custom trigger element",
            demo: <TriggerColorPickerDemo />,
            code: `<ColorPicker>
  <span>Custom Trigger</span>
</ColorPicker>`,
        },
    ],
    apiProps: [
        { name: "value", type: "Color | string", description: "Controlled value" },
        { name: "defaultValue", type: "Color | string", description: "Initial value" },
        { name: "format", type: "'hex' | 'rgb' | 'hsb'", description: "Color format" },
        { name: "showText", type: "boolean", description: "Show color value" },
        { name: "presets", type: "{ label, colors }[]", description: "Preset colors" },
        { name: "size", type: "'small' | 'middle' | 'large'", description: "Trigger size" },
        { name: "disabled", type: "boolean", description: "Disable picker" },
        { name: "onChange", type: "(color) => void", description: "Change callback" },
    ],
};
