"use client";

import React from "react";
import { ProList } from "@ant-design/pro-components";
import { Button, Space, Tag, Avatar, Progress } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Sample data
const dataSource = [
    { id: 1, title: "Ant Design", avatar: "A", description: "An enterprise-class UI design language", status: "active", progress: 80 },
    { id: 2, title: "Pro Components", avatar: "P", description: "Out-of-box UI solution for enterprise", status: "processing", progress: 60 },
    { id: 3, title: "Umi", avatar: "U", description: "Extensible enterprise-level framework", status: "active", progress: 90 },
    { id: 4, title: "dumi", avatar: "D", description: "Doc tool for component developers", status: "inactive", progress: 40 },
];

// Demo 1: Basic List
const BasicListDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
        }}
        rowKey="id"
    />
);

// Demo 2: List with Avatar
const AvatarListDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            avatar: { dataIndex: "avatar", render: (_, record: any) => <Avatar style={{ backgroundColor: "#1890ff" }}>{record.avatar}</Avatar> },
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
        }}
        rowKey="id"
    />
);

// Demo 3: Card List
const CardListDemo = () => (
    <ProList
        grid={{ gutter: 16, column: 2 }}
        dataSource={dataSource.slice(0, 4)}
        metas={{
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
            content: { render: () => <div style={{ padding: "8px 0" }}>Card content area</div> },
        }}
        rowKey="id"
    />
);

// Demo 4: List with Actions
const ActionsListDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
            actions: {
                render: (_, record: any) => [
                    <a key="edit">Edit</a>,
                    <a key="view">View</a>,
                    <a key="delete" style={{ color: "red" }}>Delete</a>,
                ],
            },
        }}
        rowKey="id"
    />
);

// Demo 5: Selectable List
const SelectableListDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
        }}
        rowSelection={{}}
        rowKey="id"
    />
);

// Demo 6: List with Subhead
const SubheadListDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            title: { dataIndex: "title" },
            subTitle: {
                dataIndex: "status",
                render: (_, record: any) => (
                    <Tag color={record.status === "active" ? "green" : record.status === "processing" ? "blue" : "default"}>
                        {record.status}
                    </Tag>
                ),
            },
            description: { dataIndex: "description" },
        }}
        rowKey="id"
    />
);

// Demo 7: List with Extra Content
const ExtraContentDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
            extra: {
                dataIndex: "progress",
                render: (_, record: any) => <Progress type="circle" percent={record.progress} size={50} />,
            },
        }}
        rowKey="id"
    />
);

// Demo 8: List with Toolbar
const ToolbarListDemo = () => (
    <ProList
        dataSource={dataSource}
        metas={{
            title: { dataIndex: "title" },
            description: { dataIndex: "description" },
        }}
        rowKey="id"
        headerTitle="Project List"
        toolBarRender={() => [
            <Button key="add" type="primary">Add New</Button>,
        ]}
    />
);

export const proListData: AntdComponentData = {
    id: "pro-list",
    name: "ProList",
    description: "ProList is a list component that supports various layouts including card mode, actions, selection, and custom content rendering.",
    whenToUse: "Use ProList when displaying collections of items with consistent structure. It's ideal for project lists, user lists, article lists, and any repeated content patterns.",
    docUrl: "https://procomponents.ant.design/en-US/components/list",
    demos: [
        {
            id: "basic",
            title: "Basic List",
            description: "Simple list with title and description",
            demo: <BasicListDemo />,
            code: `<ProList
  dataSource={data}
  metas={{
    title: { dataIndex: "title" },
    description: { dataIndex: "description" },
  }}
/>`,
        },
        {
            id: "avatar",
            title: "List with Avatar",
            description: "List items with avatar icons",
            demo: <AvatarListDemo />,
            code: `<ProList
  metas={{
    avatar: { dataIndex: "avatar", render: (_, r) => <Avatar>{r.avatar}</Avatar> },
    title: { dataIndex: "title" },
    description: { dataIndex: "description" },
  }}
/>`,
        },
        {
            id: "card",
            title: "Card List",
            description: "Grid layout with card items",
            demo: <CardListDemo />,
            code: `<ProList
  grid={{ gutter: 16, column: 2 }}
  metas={{
    title: { dataIndex: "title" },
    content: { render: () => <div>Card content</div> },
  }}
/>`,
        },
        {
            id: "actions",
            title: "List with Actions",
            description: "List items with action buttons",
            demo: <ActionsListDemo />,
            code: `<ProList
  metas={{
    title: { dataIndex: "title" },
    actions: {
      render: () => [<a>Edit</a>, <a>View</a>, <a>Delete</a>]
    },
  }}
/>`,
        },
        {
            id: "selectable",
            title: "Selectable List",
            description: "List with row selection",
            demo: <SelectableListDemo />,
            code: `<ProList
  metas={{ title: { dataIndex: "title" } }}
  rowSelection={{}}
/>`,
        },
        {
            id: "subtitle",
            title: "List with Subtitle",
            description: "List items with status tags",
            demo: <SubheadListDemo />,
            code: `<ProList
  metas={{
    title: { dataIndex: "title" },
    subTitle: {
      dataIndex: "status",
      render: (_, r) => <Tag color={r.status === "active" ? "green" : "default"}>{r.status}</Tag>
    },
  }}
/>`,
        },
        {
            id: "extra",
            title: "List with Extra Content",
            description: "List items with extra area (e.g., progress)",
            demo: <ExtraContentDemo />,
            code: `<ProList
  metas={{
    title: { dataIndex: "title" },
    extra: {
      render: (_, r) => <Progress type="circle" percent={r.progress} size={50} />
    },
  }}
/>`,
        },
        {
            id: "toolbar",
            title: "List with Toolbar",
            description: "List with header title and toolbar buttons",
            demo: <ToolbarListDemo />,
            code: `<ProList
  headerTitle="Project List"
  toolBarRender={() => [<Button type="primary">Add</Button>]}
/>`,
        },
    ],
    apiProps: [
        { name: "dataSource", type: "T[]", description: "Data array for the list" },
        { name: "metas", type: "MetasConfig", description: "Configuration for list item parts", required: true },
        { name: "rowKey", type: "string | (record) => string", description: "Unique key for each row" },
        { name: "grid", type: "{ gutter, column }", description: "Grid configuration for card layout" },
        { name: "rowSelection", type: "TableRowSelection", description: "Row selection configuration" },
        { name: "headerTitle", type: "ReactNode", description: "List header title" },
        { name: "toolBarRender", type: "() => ReactNode[]", description: "Toolbar buttons renderer" },
        { name: "pagination", type: "PaginationConfig", description: "Pagination settings" },
    ],
};
