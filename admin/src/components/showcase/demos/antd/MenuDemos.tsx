"use client";

import React, { useState } from "react";
import { Menu, Switch, message } from "antd";
import type { MenuProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

type MenuItem = Required<MenuProps>["items"][number];

// Demo 1: Horizontal Menu
const HorizontalMenuDemo = () => {
    const items: MenuItem[] = [
        { key: "home", label: "Home" },
        { key: "products", label: "Products" },
        { key: "about", label: "About" },
        { key: "contact", label: "Contact" },
    ];
    return <Menu mode="horizontal" defaultSelectedKeys={["home"]} items={items} />;
};

// Demo 2: Vertical Menu
const VerticalMenuDemo = () => {
    const items: MenuItem[] = [
        { key: "1", label: "Option 1" },
        { key: "2", label: "Option 2" },
        { key: "3", label: "Option 3" },
    ];
    return <Menu mode="vertical" items={items} style={{ width: 200 }} />;
};

// Demo 3: Menu with Icons
const IconMenuDemo = () => {
    const items: MenuItem[] = [
        { key: "home", icon: <span>🏠</span>, label: "Home" },
        { key: "profile", icon: <span>👤</span>, label: "Profile" },
        { key: "settings", icon: <span>⚙️</span>, label: "Settings" },
    ];
    return <Menu mode="horizontal" items={items} />;
};

// Demo 4: Submenu
const SubmenuDemo = () => {
    const items: MenuItem[] = [
        { key: "home", label: "Home" },
        {
            key: "products",
            label: "Products",
            children: [
                { key: "prod1", label: "Product 1" },
                { key: "prod2", label: "Product 2" },
            ],
        },
        {
            key: "services",
            label: "Services",
            children: [
                { key: "srv1", label: "Service A" },
                { key: "srv2", label: "Service B" },
            ],
        },
    ];
    return <Menu mode="horizontal" items={items} />;
};

// Demo 5: Inline Menu (Collapsible)
const InlineMenuDemo = () => {
    const items: MenuItem[] = [
        {
            key: "sub1",
            icon: <span>📧</span>,
            label: "Navigation One",
            children: [
                { key: "1", label: "Option 1" },
                { key: "2", label: "Option 2" },
            ],
        },
        {
            key: "sub2",
            icon: <span>📱</span>,
            label: "Navigation Two",
            children: [
                { key: "3", label: "Option 3" },
                { key: "4", label: "Option 4" },
            ],
        },
    ];
    return <Menu mode="inline" items={items} style={{ width: 250 }} defaultOpenKeys={["sub1"]} />;
};

// Demo 6: Dark Theme
const DarkMenuDemo = () => {
    const items: MenuItem[] = [
        { key: "home", icon: <span>🏠</span>, label: "Home" },
        { key: "dashboard", icon: <span>📊</span>, label: "Dashboard" },
        { key: "settings", icon: <span>⚙️</span>, label: "Settings" },
    ];
    return <Menu theme="dark" mode="horizontal" items={items} />;
};

// Demo 7: Menu Groups
const GroupMenuDemo = () => {
    const items: MenuItem[] = [
        {
            key: "grp1",
            label: "Group 1",
            type: "group",
            children: [
                { key: "1", label: "Option 1" },
                { key: "2", label: "Option 2" },
            ],
        },
        {
            key: "grp2",
            label: "Group 2",
            type: "group",
            children: [
                { key: "3", label: "Option 3" },
                { key: "4", label: "Option 4" },
            ],
        },
    ];
    return <Menu mode="vertical" items={items} style={{ width: 200 }} />;
};

export const menuData: AntdComponentData = {
    id: "antd-menu",
    name: "Menu",
    description: "Menu provides navigation items. Supports horizontal, vertical, and inline modes with submenus, icons, and themes.",
    whenToUse: "Use Menu for site navigation. Horizontal for top nav, vertical for side nav, inline for collapsible sidebar.",
    docUrl: "https://ant.design/components/menu",
    demos: [
        {
            id: "horizontal",
            title: "Horizontal Menu",
            description: "Top navigation menu",
            demo: <HorizontalMenuDemo />,
            code: `<Menu
  mode="horizontal"
  items={[
    { key: "home", label: "Home" },
    { key: "about", label: "About" },
  ]}
/>`,
        },
        {
            id: "vertical",
            title: "Vertical Menu",
            description: "Side navigation menu",
            demo: <VerticalMenuDemo />,
            code: `<Menu mode="vertical" items={[...]} style={{ width: 200 }} />`,
        },
        {
            id: "icon",
            title: "Menu with Icons",
            description: "Icons in menu items",
            demo: <IconMenuDemo />,
            code: `{ key: "home", icon: <HomeIcon />, label: "Home" }`,
        },
        {
            id: "submenu",
            title: "Submenu",
            description: "Nested menu items",
            demo: <SubmenuDemo />,
            code: `{
  key: "products",
  label: "Products",
  children: [
    { key: "p1", label: "Product 1" },
    { key: "p2", label: "Product 2" },
  ]
}`,
        },
        {
            id: "inline",
            title: "Inline Menu",
            description: "Collapsible sidebar menu",
            demo: <InlineMenuDemo />,
            code: `<Menu
  mode="inline"
  defaultOpenKeys={["sub1"]}
  items={[
    { key: "sub1", label: "Nav One", children: [...] }
  ]}
/>`,
        },
        {
            id: "dark",
            title: "Dark Theme",
            description: "Dark theme menu",
            demo: <DarkMenuDemo />,
            code: `<Menu theme="dark" mode="horizontal" items={[...]} />`,
        },
        {
            id: "group",
            title: "Menu Groups",
            description: "Grouped menu items",
            demo: <GroupMenuDemo />,
            code: `{
  key: "grp1",
  label: "Group 1",
  type: "group",
  children: [...]
}`,
        },
    ],
    apiProps: [
        { name: "items", type: "MenuItem[]", description: "Menu items array", required: true },
        { name: "mode", type: "'horizontal' | 'vertical' | 'inline'", description: "Menu mode", default: "vertical" },
        { name: "theme", type: "'light' | 'dark'", description: "Menu theme", default: "light" },
        { name: "selectedKeys", type: "string[]", description: "Selected keys" },
        { name: "defaultSelectedKeys", type: "string[]", description: "Initial selected keys" },
        { name: "openKeys", type: "string[]", description: "Open submenu keys" },
        { name: "defaultOpenKeys", type: "string[]", description: "Initial open submenus" },
        { name: "onClick", type: "(info) => void", description: "Click handler" },
    ],
};
