"use client";

import React from "react";
import { Breadcrumb, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Breadcrumb
const BasicBreadcrumbDemo = () => (
    <Breadcrumb
        items={[
            { title: "Home" },
            { title: "Application Center" },
            { title: "Application List" },
            { title: "An Application" },
        ]}
    />
);

// Demo 2: Breadcrumb with Links
const LinkBreadcrumbDemo = () => (
    <Breadcrumb
        items={[
            { title: <a href="#">Home</a> },
            { title: <a href="#">Category</a> },
            { title: <a href="#">Subcategory</a> },
            { title: "Current Page" },
        ]}
    />
);

// Demo 3: Breadcrumb with Icons
const IconBreadcrumbDemo = () => (
    <Breadcrumb
        items={[
            { title: <span>🏠 Home</span> },
            { title: <span>📁 Folder</span> },
            { title: <span>📄 File</span> },
        ]}
    />
);

// Demo 4: Breadcrumb with Separator
const SeparatorBreadcrumbDemo = () => (
    <Space direction="vertical">
        <Breadcrumb
            separator=">"
            items={[
                { title: "Home" },
                { title: "Category" },
                { title: "Page" },
            ]}
        />
        <Breadcrumb
            separator="-"
            items={[
                { title: "Level 1" },
                { title: "Level 2" },
                { title: "Level 3" },
            ]}
        />
    </Space>
);

// Demo 5: Breadcrumb with Dropdown
const DropdownBreadcrumbDemo = () => (
    <Breadcrumb
        items={[
            { title: "Home" },
            {
                title: "Category",
                menu: {
                    items: [
                        { key: "1", label: "Sub Category 1" },
                        { key: "2", label: "Sub Category 2" },
                        { key: "3", label: "Sub Category 3" },
                    ],
                },
            },
            { title: "Current Page" },
        ]}
    />
);

// Demo 6: Breadcrumb from Path
const PathBreadcrumbDemo = () => (
    <Space direction="vertical">
        <Breadcrumb
            items={[
                { path: "/", title: "Home" },
                { path: "/products", title: "Products" },
                { path: "/products/electronics", title: "Electronics" },
                { path: "/products/electronics/phones", title: "Phones" },
            ]}
        />
    </Space>
);

export const breadcrumbData: AntdComponentData = {
    id: "antd-breadcrumb",
    name: "Breadcrumb",
    description: "Breadcrumb displays the current page's location within a navigational hierarchy. It helps users understand where they are and how to navigate back.",
    whenToUse: "Use Breadcrumb to show the page hierarchy and allow users to navigate back to parent pages easily.",
    docUrl: "https://ant.design/components/breadcrumb",
    demos: [
        {
            id: "basic",
            title: "Basic Breadcrumb",
            description: "Simple breadcrumb trail",
            demo: <BasicBreadcrumbDemo />,
            code: `<Breadcrumb
  items={[
    { title: "Home" },
    { title: "Category" },
    { title: "Page" },
  ]}
/>`,
        },
        {
            id: "links",
            title: "With Links",
            description: "Clickable breadcrumb items",
            demo: <LinkBreadcrumbDemo />,
            code: `<Breadcrumb items={[
  { title: <a href="#">Home</a> },
  { title: <a href="#">Category</a> },
  { title: "Current" },
]} />`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Icons in breadcrumb items",
            demo: <IconBreadcrumbDemo />,
            code: `<Breadcrumb items={[
  { title: <><HomeIcon /> Home</> },
  { title: <><FolderIcon /> Folder</> },
]} />`,
        },
        {
            id: "separator",
            title: "Custom Separator",
            description: "Different separator styles",
            demo: <SeparatorBreadcrumbDemo />,
            code: `<Breadcrumb separator=">" items={[...]} />
<Breadcrumb separator="-" items={[...]} />`,
        },
        {
            id: "dropdown",
            title: "With Dropdown",
            description: "Menu in breadcrumb item",
            demo: <DropdownBreadcrumbDemo />,
            code: `<Breadcrumb items={[
  { title: "Home" },
  {
    title: "Category",
    menu: { items: [...] },
  },
]} />`,
        },
        {
            id: "path",
            title: "With Paths",
            description: "Path-based navigation",
            demo: <PathBreadcrumbDemo />,
            code: `<Breadcrumb items={[
  { path: "/", title: "Home" },
  { path: "/products", title: "Products" },
]} />`,
        },
    ],
    apiProps: [
        { name: "items", type: "BreadcrumbItem[]", description: "Breadcrumb items" },
        { name: "separator", type: "ReactNode", description: "Separator between items", default: "/" },
        { name: "itemRender", type: "(route, params, routes, paths) => ReactNode", description: "Custom item render" },
        { name: "params", type: "object", description: "Route params" },
    ],
};
