"use client";

import React from "react";
import { TreeSelect, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const treeData = [
    {
        value: "parent 1",
        title: "Parent 1",
        children: [
            { value: "child 1-1", title: "Child 1-1" },
            { value: "child 1-2", title: "Child 1-2" },
        ],
    },
    {
        value: "parent 2",
        title: "Parent 2",
        children: [
            { value: "child 2-1", title: "Child 2-1" },
            { value: "child 2-2", title: "Child 2-2" },
        ],
    },
];

// Demo 1: Basic TreeSelect
const BasicTreeSelectDemo = () => (
    <TreeSelect
        style={{ width: 250 }}
        treeData={treeData}
        placeholder="Select an item"
        treeDefaultExpandAll
    />
);

// Demo 2: Multiple Select
const MultipleTreeSelectDemo = () => (
    <TreeSelect
        style={{ width: 300 }}
        treeData={treeData}
        placeholder="Select multiple"
        treeDefaultExpandAll
        multiple
        maxTagCount="responsive"
    />
);

// Demo 3: Checkable
const CheckableTreeSelectDemo = () => (
    <TreeSelect
        style={{ width: 300 }}
        treeData={treeData}
        placeholder="Check items"
        treeDefaultExpandAll
        treeCheckable
        showCheckedStrategy={TreeSelect.SHOW_PARENT}
    />
);

// Demo 4: Searchable
const SearchTreeSelectDemo = () => (
    <TreeSelect
        style={{ width: 250 }}
        treeData={treeData}
        placeholder="Search items"
        showSearch
        treeDefaultExpandAll
        filterTreeNode={(input, node) =>
            node.title?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
        }
    />
);

// Demo 5: Sizes
const SizesTreeSelectDemo = () => (
    <Space direction="vertical" style={{ width: 250 }}>
        <TreeSelect size="large" treeData={treeData} placeholder="Large" treeDefaultExpandAll />
        <TreeSelect treeData={treeData} placeholder="Default" treeDefaultExpandAll />
        <TreeSelect size="small" treeData={treeData} placeholder="Small" treeDefaultExpandAll />
    </Space>
);

// Demo 6: Disabled
const DisabledTreeSelectDemo = () => (
    <TreeSelect
        style={{ width: 250 }}
        treeData={treeData}
        placeholder="Disabled"
        disabled
    />
);

// Demo 7: Status
const StatusTreeSelectDemo = () => (
    <Space direction="vertical" style={{ width: 250 }}>
        <TreeSelect treeData={treeData} status="error" placeholder="Error" />
        <TreeSelect treeData={treeData} status="warning" placeholder="Warning" />
    </Space>
);

export const treeSelectData: AntdComponentData = {
    id: "antd-tree-select",
    name: "TreeSelect",
    description: "TreeSelect is a dropdown with tree-structured data. Supports multiple selection, checkboxes, and search.",
    whenToUse: "Use TreeSelect when users need to select from hierarchical data like categories, organizational structures, or file trees.",
    docUrl: "https://ant.design/components/tree-select",
    demos: [
        {
            id: "basic",
            title: "Basic TreeSelect",
            description: "Simple tree dropdown",
            demo: <BasicTreeSelectDemo />,
            code: `<TreeSelect
  treeData={[
    { value: "parent", title: "Parent", children: [...] }
  ]}
  placeholder="Select"
/>`,
        },
        {
            id: "multiple",
            title: "Multiple Select",
            description: "Select multiple items",
            demo: <MultipleTreeSelectDemo />,
            code: `<TreeSelect multiple treeData={treeData} />`,
        },
        {
            id: "checkable",
            title: "Checkable",
            description: "Checkbox selection",
            demo: <CheckableTreeSelectDemo />,
            code: `<TreeSelect treeCheckable treeData={treeData} />`,
        },
        {
            id: "search",
            title: "Searchable",
            description: "Filter tree items",
            demo: <SearchTreeSelectDemo />,
            code: `<TreeSelect
  showSearch
  filterTreeNode={(input, node) =>
    node.title.includes(input)
  }
/>`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different sizes",
            demo: <SizesTreeSelectDemo />,
            code: `<TreeSelect size="large" />
<TreeSelect />
<TreeSelect size="small" />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive select",
            demo: <DisabledTreeSelectDemo />,
            code: `<TreeSelect disabled />`,
        },
        {
            id: "status",
            title: "Validation Status",
            description: "Error and warning",
            demo: <StatusTreeSelectDemo />,
            code: `<TreeSelect status="error" />
<TreeSelect status="warning" />`,
        },
    ],
    apiProps: [
        { name: "treeData", type: "TreeNode[]", description: "Tree data" },
        { name: "value", type: "string | string[]", description: "Controlled value" },
        { name: "defaultValue", type: "string | string[]", description: "Initial value" },
        { name: "multiple", type: "boolean", description: "Enable multiple" },
        { name: "treeCheckable", type: "boolean", description: "Enable checkboxes" },
        { name: "showSearch", type: "boolean", description: "Enable search" },
        { name: "filterTreeNode", type: "(input, node) => boolean", description: "Filter function" },
        { name: "treeDefaultExpandAll", type: "boolean", description: "Expand all nodes" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Input size" },
        { name: "disabled", type: "boolean", description: "Disable select" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(value) => void", description: "Change callback" },
    ],
};
