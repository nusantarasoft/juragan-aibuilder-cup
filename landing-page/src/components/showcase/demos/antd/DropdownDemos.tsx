"use client";

import React from "react";
import { Dropdown, Button, Space, Divider, message } from "antd";
import type { MenuProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Dropdown
const BasicDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "1st menu item" },
        { key: "2", label: "2nd menu item" },
        { key: "3", label: "3rd menu item" },
    ];
    return (
        <Dropdown menu={{ items }}>
            <a onClick={(e) => e.preventDefault()}>Hover me</a>
        </Dropdown>
    );
};

// Demo 2: Dropdown Button
const DropdownButtonDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "Action 1" },
        { key: "2", label: "Action 2" },
    ];
    return (
        <Dropdown.Button menu={{ items }} onClick={() => message.info("Button clicked!")}>
            Actions
        </Dropdown.Button>
    );
};

// Demo 3: Click Trigger
const ClickDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "Click item 1" },
        { key: "2", label: "Click item 2" },
    ];
    return (
        <Dropdown menu={{ items }} trigger={["click"]}>
            <Button>Click me</Button>
        </Dropdown>
    );
};

// Demo 4: With Icons
const IconDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", icon: <span>✏️</span>, label: "Edit" },
        { key: "2", icon: <span>📋</span>, label: "Copy" },
        { key: "3", icon: <span>🗑️</span>, label: "Delete", danger: true },
    ];
    return (
        <Dropdown menu={{ items }}>
            <Button>Actions ▼</Button>
        </Dropdown>
    );
};

// Demo 5: Disabled Items
const DisabledDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "Active item" },
        { key: "2", label: "Disabled item", disabled: true },
        { key: "3", label: "Another active" },
    ];
    return (
        <Dropdown menu={{ items }}>
            <a>Hover me</a>
        </Dropdown>
    );
};

// Demo 6: Submenu
const SubmenuDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "Item 1" },
        {
            key: "2",
            label: "Submenu",
            children: [
                { key: "2-1", label: "Sub item 1" },
                { key: "2-2", label: "Sub item 2" },
            ],
        },
        { key: "3", label: "Item 3" },
    ];
    return (
        <Dropdown menu={{ items }}>
            <a>With Submenu ▼</a>
        </Dropdown>
    );
};

// Demo 7: Placement
const PlacementDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "Item 1" },
        { key: "2", label: "Item 2" },
    ];
    return (
        <Space wrap>
            <Dropdown menu={{ items }} placement="bottomLeft"><Button>Bottom Left</Button></Dropdown>
            <Dropdown menu={{ items }} placement="bottomRight"><Button>Bottom Right</Button></Dropdown>
            <Dropdown menu={{ items }} placement="topLeft"><Button>Top Left</Button></Dropdown>
            <Dropdown menu={{ items }} placement="topRight"><Button>Top Right</Button></Dropdown>
        </Space>
    );
};

// Demo 8: With Arrow
const ArrowDropdownDemo = () => {
    const items: MenuProps["items"] = [
        { key: "1", label: "Item 1" },
        { key: "2", label: "Item 2" },
    ];
    return (
        <Space>
            <Dropdown menu={{ items }} arrow><Button>With Arrow</Button></Dropdown>
            <Dropdown menu={{ items }} arrow={{ pointAtCenter: true }}><Button>Point at Center</Button></Dropdown>
        </Space>
    );
};

export const dropdownData: AntdComponentData = {
    id: "antd-dropdown",
    name: "Dropdown",
    description: "Dropdown shows a list of actions or options when users hover or click on a trigger element.",
    whenToUse: "Use Dropdown for action lists, context menus, or when there are multiple options for a single action.",
    docUrl: "https://ant.design/components/dropdown",
    demos: [
        {
            id: "basic",
            title: "Basic Dropdown",
            description: "Hover to show menu",
            demo: <BasicDropdownDemo />,
            code: `<Dropdown menu={{ items }}>
  <a>Hover me</a>
</Dropdown>`,
        },
        {
            id: "button",
            title: "Dropdown Button",
            description: "Button with dropdown",
            demo: <DropdownButtonDemo />,
            code: `<Dropdown.Button menu={{ items }} onClick={handleClick}>
  Actions
</Dropdown.Button>`,
        },
        {
            id: "click",
            title: "Click Trigger",
            description: "Click to show menu",
            demo: <ClickDropdownDemo />,
            code: `<Dropdown menu={{ items }} trigger={["click"]}>
  <Button>Click me</Button>
</Dropdown>`,
        },
        {
            id: "icon",
            title: "With Icons",
            description: "Icons in menu items",
            demo: <IconDropdownDemo />,
            code: `{ key: "1", icon: <EditIcon />, label: "Edit" }`,
        },
        {
            id: "disabled",
            title: "Disabled Items",
            description: "Non-clickable items",
            demo: <DisabledDropdownDemo />,
            code: `{ key: "2", label: "Disabled", disabled: true }`,
        },
        {
            id: "submenu",
            title: "Submenu",
            description: "Nested dropdown menu",
            demo: <SubmenuDropdownDemo />,
            code: `{
  key: "2",
  label: "Submenu",
  children: [{ key: "2-1", label: "Sub item" }]
}`,
        },
        {
            id: "placement",
            title: "Placement",
            description: "Different positions",
            demo: <PlacementDropdownDemo />,
            code: `<Dropdown placement="bottomLeft">...</Dropdown>
<Dropdown placement="topRight">...</Dropdown>`,
        },
        {
            id: "arrow",
            title: "With Arrow",
            description: "Arrow pointing to trigger",
            demo: <ArrowDropdownDemo />,
            code: `<Dropdown arrow>...</Dropdown>
<Dropdown arrow={{ pointAtCenter: true }}>...</Dropdown>`,
        },
    ],
    apiProps: [
        { name: "menu", type: "{ items: MenuItem[] }", description: "Menu configuration", required: true },
        { name: "trigger", type: "('hover' | 'click' | 'contextMenu')[]", description: "Trigger mode", default: "['hover']" },
        { name: "placement", type: "'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'", description: "Dropdown position" },
        { name: "arrow", type: "boolean | { pointAtCenter: true }", description: "Show arrow" },
        { name: "disabled", type: "boolean", description: "Disable dropdown" },
        { name: "open", type: "boolean", description: "Controlled open state" },
        { name: "onOpenChange", type: "(open) => void", description: "Open state callback" },
    ],
};
