"use client";

import React, { useState } from "react";
import { Radio, Space, Button } from "antd";
import type { RadioChangeEvent } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Radio
const BasicRadioDemo = () => (
    <Radio.Group defaultValue={1}>
        <Radio value={1}>Option A</Radio>
        <Radio value={2}>Option B</Radio>
        <Radio value={3}>Option C</Radio>
    </Radio.Group>
);

// Demo 2: Vertical Radio
const VerticalRadioDemo = () => (
    <Radio.Group defaultValue={1} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Radio value={1}>Option A</Radio>
        <Radio value={2}>Option B</Radio>
        <Radio value={3}>Option C</Radio>
    </Radio.Group>
);

// Demo 3: Radio Button
const ButtonRadioDemo = () => (
    <Radio.Group defaultValue="a" buttonStyle="solid">
        <Radio.Button value="a">Hangzhou</Radio.Button>
        <Radio.Button value="b">Shanghai</Radio.Button>
        <Radio.Button value="c">Beijing</Radio.Button>
    </Radio.Group>
);

// Demo 4: Radio Button Outline
const OutlineRadioDemo = () => (
    <Radio.Group defaultValue="a" buttonStyle="outline">
        <Radio.Button value="a">Hangzhou</Radio.Button>
        <Radio.Button value="b">Shanghai</Radio.Button>
        <Radio.Button value="c">Beijing</Radio.Button>
    </Radio.Group>
);

// Demo 5: Disabled
const DisabledRadioDemo = () => (
    <Space orientation="vertical">
        <Radio disabled>Disabled</Radio>
        <Radio disabled checked>Disabled Checked</Radio>
        <Radio.Group disabled defaultValue="a">
            <Radio value="a">A</Radio>
            <Radio value="b">B</Radio>
        </Radio.Group>
    </Space>
);

// Demo 6: Sizes
const SizesRadioDemo = () => (
    <Space orientation="vertical">
        <Radio.Group defaultValue="a" size="large">
            <Radio.Button value="a">Large</Radio.Button>
            <Radio.Button value="b">Large</Radio.Button>
        </Radio.Group>
        <Radio.Group defaultValue="a">
            <Radio.Button value="a">Default</Radio.Button>
            <Radio.Button value="b">Default</Radio.Button>
        </Radio.Group>
        <Radio.Group defaultValue="a" size="small">
            <Radio.Button value="a">Small</Radio.Button>
            <Radio.Button value="b">Small</Radio.Button>
        </Radio.Group>
    </Space>
);

// Demo 7: Controlled
const ControlledRadioDemo = () => {
    const [value, setValue] = useState(1);
    return (
        <Radio.Group onChange={(e) => setValue(e.target.value)} value={value}>
            <Radio value={1}>A</Radio>
            <Radio value={2}>B</Radio>
            <Radio value={3}>C</Radio>
            <Radio value={4}>D</Radio>
        </Radio.Group>
    );
};

// Demo 8: Options Array
const OptionsRadioDemo = () => (
    <Radio.Group
        options={[
            { label: "Apple", value: "apple" },
            { label: "Pear", value: "pear" },
            { label: "Orange", value: "orange", disabled: true },
        ]}
        defaultValue="apple"
        optionType="button"
    />
);

export const radioData: AntdComponentData = {
    id: "antd-radio",
    name: "Radio",
    description: "Radio allows users to select one option from a set. Supports both radio circles and button styles.",
    whenToUse: "Use Radio when users need to select exactly one option from a small set of mutually exclusive choices.",
    docUrl: "https://ant.design/components/radio",
    demos: [
        {
            id: "basic",
            title: "Basic Radio",
            description: "Simple radio group",
            demo: <BasicRadioDemo />,
            code: `<Radio.Group defaultValue={1}>
  <Radio value={1}>Option A</Radio>
  <Radio value={2}>Option B</Radio>
</Radio.Group>`,
        },
        {
            id: "vertical",
            title: "Vertical Layout",
            description: "Stacked radio options",
            demo: <VerticalRadioDemo />,
            code: `<Radio.Group style={{ flexDirection: "column" }}>
  <Radio value={1}>Option A</Radio>
  <Radio value={2}>Option B</Radio>
</Radio.Group>`,
        },
        {
            id: "button",
            title: "Radio Button",
            description: "Button style (solid)",
            demo: <ButtonRadioDemo />,
            code: `<Radio.Group buttonStyle="solid">
  <Radio.Button value="a">A</Radio.Button>
  <Radio.Button value="b">B</Radio.Button>
</Radio.Group>`,
        },
        {
            id: "outline",
            title: "Outline Button",
            description: "Button style (outline)",
            demo: <OutlineRadioDemo />,
            code: `<Radio.Group buttonStyle="outline">
  <Radio.Button value="a">A</Radio.Button>
</Radio.Group>`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive options",
            demo: <DisabledRadioDemo />,
            code: `<Radio disabled>Disabled</Radio>
<Radio.Group disabled>...</Radio.Group>`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different button sizes",
            demo: <SizesRadioDemo />,
            code: `<Radio.Group size="large">...</Radio.Group>
<Radio.Group size="small">...</Radio.Group>`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Controlled selection",
            demo: <ControlledRadioDemo />,
            code: `<Radio.Group
  value={value}
  onChange={(e) => setValue(e.target.value)}
>
  <Radio value={1}>A</Radio>
</Radio.Group>`,
        },
        {
            id: "options",
            title: "Options Array",
            description: "Options via array prop",
            demo: <OptionsRadioDemo />,
            code: `<Radio.Group
  options={[
    { label: "Apple", value: "apple" },
    { label: "Pear", value: "pear", disabled: true },
  ]}
  optionType="button"
/>`,
        },
    ],
    apiProps: [
        { name: "value", type: "any", description: "Controlled value" },
        { name: "defaultValue", type: "any", description: "Initial value" },
        { name: "options", type: "Option[]", description: "Options array" },
        { name: "optionType", type: "'default' | 'button'", description: "Option style" },
        { name: "buttonStyle", type: "'outline' | 'solid'", description: "Button style" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Button size" },
        { name: "disabled", type: "boolean", description: "Disable all" },
        { name: "onChange", type: "(e) => void", description: "Change callback" },
    ],
};
