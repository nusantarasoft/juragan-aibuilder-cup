"use client";

import React, { useState } from "react";
import { Select, Space, Divider, Tag } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Option } = Select;

// Demo 1: Basic Select
const BasicSelectDemo = () => (
    <Space wrap>
        <Select defaultValue="option1" style={{ width: 200 }} options={[
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2" },
            { value: "option3", label: "Option 3" },
        ]} />
    </Space>
);

// Demo 2: Select Sizes
const SelectSizesDemo = () => (
    <Space wrap>
        <Select size="large" defaultValue="large" style={{ width: 150 }} options={[{ value: "large", label: "Large" }]} />
        <Select defaultValue="default" style={{ width: 150 }} options={[{ value: "default", label: "Default" }]} />
        <Select size="small" defaultValue="small" style={{ width: 150 }} options={[{ value: "small", label: "Small" }]} />
    </Space>
);

// Demo 3: Multiple Select
const MultipleSelectDemo = () => (
    <Select
        mode="multiple"
        style={{ width: 300 }}
        placeholder="Select items"
        defaultValue={["a", "b"]}
        options={[
            { value: "a", label: "Item A" },
            { value: "b", label: "Item B" },
            { value: "c", label: "Item C" },
            { value: "d", label: "Item D" },
        ]}
    />
);

// Demo 4: Tags Mode
const TagsSelectDemo = () => (
    <Select
        mode="tags"
        style={{ width: 300 }}
        placeholder="Add tags"
        options={[
            { value: "react", label: "React" },
            { value: "vue", label: "Vue" },
            { value: "angular", label: "Angular" },
        ]}
    />
);

// Demo 5: Searchable Select
const SearchableSelectDemo = () => (
    <Select
        showSearch
        style={{ width: 250 }}
        placeholder="Search to Select"
        optionFilterProp="label"
        options={[
            { value: "1", label: "Apple" },
            { value: "2", label: "Banana" },
            { value: "3", label: "Cherry" },
            { value: "4", label: "Dragon Fruit" },
            { value: "5", label: "Elderberry" },
        ]}
    />
);

// Demo 6: Grouped Options
const GroupedSelectDemo = () => (
    <Select
        style={{ width: 250 }}
        placeholder="Select a fruit"
        options={[
            {
                label: "Citrus",
                options: [
                    { value: "orange", label: "Orange" },
                    { value: "lemon", label: "Lemon" },
                ],
            },
            {
                label: "Berries",
                options: [
                    { value: "strawberry", label: "Strawberry" },
                    { value: "blueberry", label: "Blueberry" },
                ],
            },
        ]}
    />
);

// Demo 7: Loading and Disabled
const LoadingDisabledDemo = () => (
    <Space wrap>
        <Select style={{ width: 150 }} loading placeholder="Loading..." />
        <Select style={{ width: 150 }} disabled defaultValue="disabled" options={[{ value: "disabled", label: "Disabled" }]} />
    </Space>
);

// Demo 8: Custom Tag Render
const CustomTagDemo = () => (
    <Select
        mode="multiple"
        style={{ width: 300 }}
        placeholder="Select colors"
        tagRender={(props) => (
            <Tag color={props.value} closable={props.closable} onClose={props.onClose} style={{ marginInlineEnd: 4 }}>
                {props.label}
            </Tag>
        )}
        options={[
            { value: "gold", label: "Gold" },
            { value: "lime", label: "Lime" },
            { value: "green", label: "Green" },
            { value: "cyan", label: "Cyan" },
        ]}
    />
);

// Demo 9: Clear and Status
const ClearStatusDemo = () => (
    <Space wrap>
        <Select style={{ width: 150 }} allowClear placeholder="Clearable" options={[{ value: "1", label: "Clear me" }]} />
        <Select style={{ width: 150 }} status="error" placeholder="Error" />
        <Select style={{ width: 150 }} status="warning" placeholder="Warning" />
    </Space>
);

export const selectData: AntdComponentData = {
    id: "antd-select",
    name: "Select",
    description: "Select is used to choose one or more items from a list of options. It supports single, multiple, tags mode, search, and grouping.",
    whenToUse: "Use Select when users need to choose from a predefined list. Supports single selection, multi-selection, searchable options, and custom rendering.",
    docUrl: "https://ant.design/components/select",
    demos: [
        {
            id: "basic",
            title: "Basic Select",
            description: "Simple dropdown select",
            demo: <BasicSelectDemo />,
            code: `<Select
  defaultValue="option1"
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
  ]}
/>`,
        },
        {
            id: "sizes",
            title: "Select Sizes",
            description: "Large, default, and small",
            demo: <SelectSizesDemo />,
            code: `<Select size="large" options={[...]} />
<Select options={[...]} />
<Select size="small" options={[...]} />`,
        },
        {
            id: "multiple",
            title: "Multiple Select",
            description: "Select multiple items",
            demo: <MultipleSelectDemo />,
            code: `<Select
  mode="multiple"
  placeholder="Select items"
  options={[...]}
/>`,
        },
        {
            id: "tags",
            title: "Tags Mode",
            description: "Allow creating new tags",
            demo: <TagsSelectDemo />,
            code: `<Select mode="tags" placeholder="Add tags" options={[...]} />`,
        },
        {
            id: "search",
            title: "Searchable Select",
            description: "Filter options by search",
            demo: <SearchableSelectDemo />,
            code: `<Select
  showSearch
  optionFilterProp="label"
  placeholder="Search..."
  options={[...]}
/>`,
        },
        {
            id: "grouped",
            title: "Grouped Options",
            description: "Options in groups",
            demo: <GroupedSelectDemo />,
            code: `<Select options={[
  { label: "Group 1", options: [{ value: "1", label: "Item 1" }] },
  { label: "Group 2", options: [{ value: "2", label: "Item 2" }] },
]} />`,
        },
        {
            id: "loading",
            title: "Loading & Disabled",
            description: "Loading and disabled states",
            demo: <LoadingDisabledDemo />,
            code: `<Select loading placeholder="Loading..." />
<Select disabled defaultValue="disabled" />`,
        },
        {
            id: "custom-tag",
            title: "Custom Tag Render",
            description: "Custom tag appearance",
            demo: <CustomTagDemo />,
            code: `<Select
  mode="multiple"
  tagRender={(props) => <Tag color={props.value}>{props.label}</Tag>}
  options={[...]}
/>`,
        },
        {
            id: "status",
            title: "Clear & Status",
            description: "Clearable and validation status",
            demo: <ClearStatusDemo />,
            code: `<Select allowClear placeholder="Clearable" />
<Select status="error" />
<Select status="warning" />`,
        },
    ],
    apiProps: [
        { name: "options", type: "{ value, label }[]", description: "Options array" },
        { name: "mode", type: "'multiple' | 'tags'", description: "Selection mode" },
        { name: "value", type: "string | string[]", description: "Controlled value" },
        { name: "defaultValue", type: "string | string[]", description: "Initial value" },
        { name: "placeholder", type: "string", description: "Placeholder text" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Select size" },
        { name: "showSearch", type: "boolean", description: "Enable search" },
        { name: "allowClear", type: "boolean", description: "Show clear button" },
        { name: "disabled", type: "boolean", description: "Disable select" },
        { name: "loading", type: "boolean", description: "Loading state" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(value) => void", description: "Change handler" },
    ],
};
