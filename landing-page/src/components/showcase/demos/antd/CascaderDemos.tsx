"use client";

import React from "react";
import { Cascader, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const options = [
    {
        value: "zhejiang",
        label: "Zhejiang",
        children: [
            { value: "hangzhou", label: "Hangzhou", children: [{ value: "xihu", label: "West Lake" }] },
            { value: "ningbo", label: "Ningbo" },
        ],
    },
    {
        value: "jiangsu",
        label: "Jiangsu",
        children: [
            { value: "nanjing", label: "Nanjing", children: [{ value: "zhonghuamen", label: "Zhong Hua Men" }] },
        ],
    },
];

// Demo 1: Basic Cascader
const BasicCascaderDemo = () => (
    <Cascader options={options} placeholder="Select location" style={{ width: 250 }} />
);

// Demo 2: Default Value
const DefaultCascaderDemo = () => (
    <Cascader
        options={options}
        defaultValue={["zhejiang", "hangzhou", "xihu"]}
        style={{ width: 250 }}
    />
);

// Demo 3: Hover Expand
const HoverCascaderDemo = () => (
    <Cascader
        options={options}
        expandTrigger="hover"
        placeholder="Hover to expand"
        style={{ width: 250 }}
    />
);

// Demo 4: Multiple Selection
const MultipleCascaderDemo = () => (
    <Cascader
        options={options}
        multiple
        maxTagCount="responsive"
        placeholder="Select multiple"
        style={{ width: 300 }}
    />
);

// Demo 5: Searchable
const SearchCascaderDemo = () => (
    <Cascader
        options={options}
        showSearch
        placeholder="Search locations"
        style={{ width: 250 }}
    />
);

// Demo 6: Disabled Options
const DisabledCascaderDemo = () => (
    <Cascader
        options={[
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2 (disabled)", disabled: true },
            { value: "option3", label: "Option 3" },
        ]}
        placeholder="With disabled"
        style={{ width: 250 }}
    />
);

// Demo 7: Custom Display
const CustomDisplayCascaderDemo = () => (
    <Cascader
        options={options}
        displayRender={(labels) => labels.join(" > ")}
        placeholder="Custom display"
        style={{ width: 250 }}
    />
);

// Demo 8: Different Sizes
const SizesCascaderDemo = () => (
    <Space direction="vertical">
        <Cascader options={options} size="large" placeholder="Large" style={{ width: 200 }} />
        <Cascader options={options} placeholder="Default" style={{ width: 200 }} />
        <Cascader options={options} size="small" placeholder="Small" style={{ width: 200 }} />
    </Space>
);

export const cascaderData: AntdComponentData = {
    id: "antd-cascader",
    name: "Cascader",
    description: "Cascader selects from a hierarchical set of options. Each level shows related options that drill down.",
    whenToUse: "Use Cascader when you need to select from a hierarchical dataset like locations, categories, or organizational structures.",
    docUrl: "https://ant.design/components/cascader",
    demos: [
        {
            id: "basic",
            title: "Basic Cascader",
            description: "Simple hierarchical selection",
            demo: <BasicCascaderDemo />,
            code: `<Cascader
  options={[
    { value: "us", label: "USA", children: [...] }
  ]}
  placeholder="Select"
/>`,
        },
        {
            id: "default",
            title: "Default Value",
            description: "Pre-selected value",
            demo: <DefaultCascaderDemo />,
            code: `<Cascader
  options={options}
  defaultValue={["zhejiang", "hangzhou"]}
/>`,
        },
        {
            id: "hover",
            title: "Hover Expand",
            description: "Expand on hover",
            demo: <HoverCascaderDemo />,
            code: `<Cascader expandTrigger="hover" options={options} />`,
        },
        {
            id: "multiple",
            title: "Multiple Selection",
            description: "Select multiple items",
            demo: <MultipleCascaderDemo />,
            code: `<Cascader multiple options={options} />`,
        },
        {
            id: "search",
            title: "Searchable",
            description: "Search through options",
            demo: <SearchCascaderDemo />,
            code: `<Cascader showSearch options={options} />`,
        },
        {
            id: "disabled",
            title: "Disabled Options",
            description: "Some options disabled",
            demo: <DisabledCascaderDemo />,
            code: `{ value: "opt", label: "Option", disabled: true }`,
        },
        {
            id: "custom",
            title: "Custom Display",
            description: "Custom selected display",
            demo: <CustomDisplayCascaderDemo />,
            code: `<Cascader
  displayRender={(labels) => labels.join(" > ")}
/>`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different sizes",
            demo: <SizesCascaderDemo />,
            code: `<Cascader size="large" />
<Cascader size="small" />`,
        },
    ],
    apiProps: [
        { name: "options", type: "Option[]", description: "Hierarchical options" },
        { name: "value", type: "string[][]", description: "Controlled value" },
        { name: "defaultValue", type: "string[]", description: "Initial value path" },
        { name: "multiple", type: "boolean", description: "Enable multi-select" },
        { name: "showSearch", type: "boolean", description: "Enable search" },
        { name: "expandTrigger", type: "'click' | 'hover'", description: "Expand trigger", default: "click" },
        { name: "displayRender", type: "(labels, options) => ReactNode", description: "Custom display" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Input size" },
        { name: "onChange", type: "(value, selectedOptions) => void", description: "Change callback" },
    ],
};
