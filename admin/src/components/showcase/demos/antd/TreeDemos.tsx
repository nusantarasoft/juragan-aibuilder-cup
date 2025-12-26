"use client";

import React, { useState } from "react";
import { Tree, Space, Switch, Typography } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

const treeData: TreeDataNode[] = [
    {
        title: "parent 1",
        key: "0-0",
        children: [
            { title: "leaf 1-0", key: "0-0-0", isLeaf: true },
            { title: "leaf 1-1", key: "0-0-1", isLeaf: true },
        ],
    },
    {
        title: "parent 2",
        key: "0-1",
        children: [
            { title: "leaf 2-0", key: "0-1-0", isLeaf: true },
            { title: "leaf 2-1", key: "0-1-1", isLeaf: true },
        ],
    },
];

// Demo 1: Basic Tree
const BasicTreeDemo = () => (
    <Tree defaultExpandAll treeData={treeData} />
);

// Demo 2: Checkable
const CheckableTreeDemo = () => {
    const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(["0-0-0"]);
    return (
        <Tree
            checkable
            defaultExpandAll
            checkedKeys={checkedKeys}
            onCheck={(keys) => setCheckedKeys(keys as React.Key[])}
            treeData={treeData}
        />
    );
};

// Demo 3: Selectable
const SelectableTreeDemo = () => (
    <Tree
        defaultExpandAll
        defaultSelectedKeys={["0-0-0"]}
        treeData={treeData}
    />
);

// Demo 4: With Lines
const LineTreeDemo = () => (
    <Tree showLine defaultExpandAll treeData={treeData} />
);

// Demo 5: With Icons
const IconTreeDemo = () => (
    <Tree
        showIcon
        defaultExpandAll
        treeData={[
            {
                title: "parent",
                key: "0-0",
                icon: <span>📁</span>,
                children: [
                    { title: "leaf 1", key: "0-0-0", icon: <span>📄</span>, isLeaf: true },
                    { title: "leaf 2", key: "0-0-1", icon: <span>📄</span>, isLeaf: true },
                ],
            },
        ]}
    />
);

// Demo 6: Draggable
const DraggableTreeDemo = () => {
    const [data, setData] = useState(treeData);
    return (
        <Tree
            draggable
            defaultExpandAll
            treeData={data}
            onDrop={({ dragNode, node, dropPosition }) => {
                console.log("dropped", dragNode, node, dropPosition);
            }}
        />
    );
};

// Demo 7: Directory Tree
const DirectoryTreeDemo = () => (
    <Tree.DirectoryTree
        defaultExpandAll
        treeData={[
            {
                title: "Documents",
                key: "0-0",
                children: [
                    { title: "file1.doc", key: "0-0-0", isLeaf: true },
                    { title: "file2.doc", key: "0-0-1", isLeaf: true },
                ],
            },
            {
                title: "Downloads",
                key: "0-1",
                children: [
                    { title: "image.png", key: "0-1-0", isLeaf: true },
                ],
            },
        ]}
    />
);

export const treeData_component: AntdComponentData = {
    id: "antd-tree",
    name: "Tree",
    description: "Tree displays hierarchical data in a tree structure. Supports checkable, selectable, draggable, and directory modes.",
    whenToUse: "Use Tree for file explorers, organizational charts, category navigation, or any hierarchical data.",
    docUrl: "https://ant.design/components/tree",
    demos: [
        {
            id: "basic",
            title: "Basic Tree",
            description: "Simple tree structure",
            demo: <BasicTreeDemo />,
            code: `<Tree
  treeData={[
    { title: "parent", key: "0", children: [...] }
  ]}
/>`,
        },
        {
            id: "checkable",
            title: "Checkable",
            description: "Checkbox selection",
            demo: <CheckableTreeDemo />,
            code: `<Tree
  checkable
  checkedKeys={checkedKeys}
  onCheck={setCheckedKeys}
/>`,
        },
        {
            id: "selectable",
            title: "Selectable",
            description: "Click to select",
            demo: <SelectableTreeDemo />,
            code: `<Tree defaultSelectedKeys={["0-0-0"]} />`,
        },
        {
            id: "line",
            title: "With Lines",
            description: "Show connection lines",
            demo: <LineTreeDemo />,
            code: `<Tree showLine treeData={data} />`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Custom node icons",
            demo: <IconTreeDemo />,
            code: `{ title: "folder", icon: <FolderIcon /> }`,
        },
        {
            id: "draggable",
            title: "Draggable",
            description: "Drag and drop nodes",
            demo: <DraggableTreeDemo />,
            code: `<Tree draggable onDrop={handleDrop} />`,
        },
        {
            id: "directory",
            title: "Directory Tree",
            description: "File explorer style",
            demo: <DirectoryTreeDemo />,
            code: `<Tree.DirectoryTree treeData={data} />`,
        },
    ],
    apiProps: [
        { name: "treeData", type: "TreeNode[]", description: "Tree data" },
        { name: "checkable", type: "boolean", description: "Enable checkboxes" },
        { name: "selectable", type: "boolean", description: "Enable selection", default: "true" },
        { name: "draggable", type: "boolean", description: "Enable drag-drop" },
        { name: "showLine", type: "boolean | { showLeafIcon }", description: "Show lines" },
        { name: "showIcon", type: "boolean", description: "Show icons" },
        { name: "defaultExpandAll", type: "boolean", description: "Expand all" },
        { name: "checkedKeys", type: "Key[]", description: "Checked keys" },
        { name: "selectedKeys", type: "Key[]", description: "Selected keys" },
        { name: "onCheck", type: "(checkedKeys, info) => void", description: "Check callback" },
        { name: "onSelect", type: "(selectedKeys, info) => void", description: "Select callback" },
        { name: "onDrop", type: "(info) => void", description: "Drop callback" },
    ],
};
