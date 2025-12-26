"use client";

import React, { useState } from "react";
import { ProTable } from "@ant-design/pro-components";
import { Button, Space, Tag, Badge, Dropdown, Popconfirm, message } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Sample data for demos
const tableListDataSource: any[] = [];
for (let i = 0; i < 5; i++) {
    tableListDataSource.push({
        key: i,
        name: `Product ${i}`,
        status: i % 3 === 0 ? "error" : i % 2 === 0 ? "success" : "processing",
        createdAt: Date.now() - Math.floor(Math.random() * 2000000000),
        progress: Math.ceil(Math.random() * 100),
        money: Math.ceil(Math.random() * 10000),
    });
}

// Demo 1: Basic Table
const BasicDemo = () => (
    <ProTable
        columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            {
                title: "Status",
                dataIndex: "status",
                key: "status",
                valueEnum: {
                    success: { text: "Success", status: "Success" },
                    error: { text: "Error", status: "Error" },
                    processing: { text: "Processing", status: "Processing" },
                },
            },
            { title: "Progress", dataIndex: "progress", valueType: "progress" },
            { title: "Money", dataIndex: "money", valueType: "money" },
        ]}
        dataSource={tableListDataSource}
        rowKey="key"
        pagination={{ pageSize: 3 }}
        search={false}
        dateFormatter="string"
        headerTitle="Basic Table"
        toolBarRender={() => [
            <Button key="add" type="primary">New</Button>,
        ]}
    />
);

// Demo 2: Query Filter Table
const QueryFilterDemo = () => (
    <ProTable
        columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            {
                title: "Status",
                dataIndex: "status",
                valueEnum: {
                    success: { text: "Success", status: "Success" },
                    error: { text: "Error", status: "Error" },
                    processing: { text: "Processing", status: "Processing" },
                },
            },
            { title: "Progress", dataIndex: "progress", valueType: "progress", hideInSearch: true },
        ]}
        dataSource={tableListDataSource}
        rowKey="key"
        pagination={{ pageSize: 3 }}
        search={{ labelWidth: "auto" }}
        headerTitle="With Search Filters"
    />
);

// Demo 3: Editable Table
const EditableDemo = () => {
    const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);
    const [dataSource, setDataSource] = useState(tableListDataSource);

    return (
        <ProTable
            columns={[
                { title: "Name", dataIndex: "name", key: "name" },
                {
                    title: "Status",
                    dataIndex: "status",
                    valueEnum: {
                        success: { text: "Success" },
                        error: { text: "Error" },
                        processing: { text: "Processing" },
                    },
                },
                {
                    title: "Actions",
                    valueType: "option",
                    render: (_, record, __, action) => [
                        <a key="edit" onClick={() => action?.startEditable?.(record.key)}>Edit</a>,
                    ],
                },
            ]}
            dataSource={dataSource}
            rowKey="key"
            search={false}
            pagination={{ pageSize: 3 }}
            editable={{
                type: "multiple",
                editableKeys,
                onChange: setEditableKeys,
            }}
            headerTitle="Editable Table"
        />
    );
};

// Demo 4: Batch Actions
const BatchActionsDemo = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    return (
        <ProTable
            columns={[
                { title: "Name", dataIndex: "name", key: "name" },
                { title: "Status", dataIndex: "status" },
                { title: "Money", dataIndex: "money", valueType: "money" },
            ]}
            dataSource={tableListDataSource}
            rowKey="key"
            search={false}
            pagination={{ pageSize: 3 }}
            rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
            }}
            tableAlertRender={({ selectedRowKeys }) => (
                <span>Selected {selectedRowKeys.length} items</span>
            )}
            tableAlertOptionRender={() => (
                <Space>
                    <a>Batch Delete</a>
                    <a>Export</a>
                </Space>
            )}
            headerTitle="With Row Selection"
        />
    );
};

// Demo 5: Nested Table
const NestedTableDemo = () => (
    <ProTable
        columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            { title: "Status", dataIndex: "status" },
            { title: "Money", dataIndex: "money", valueType: "money" },
        ]}
        dataSource={tableListDataSource}
        rowKey="key"
        search={false}
        pagination={{ pageSize: 3 }}
        expandable={{
            expandedRowRender: (record) => (
                <p style={{ margin: 0 }}>Details for {record.name}</p>
            ),
        }}
        headerTitle="Expandable Rows"
    />
);

// Demo 6: Toolbar Actions
const ToolbarDemo = () => (
    <ProTable
        columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            { title: "Status", dataIndex: "status" },
        ]}
        dataSource={tableListDataSource}
        rowKey="key"
        search={false}
        pagination={{ pageSize: 3 }}
        headerTitle="Toolbar Actions"
        toolBarRender={() => [
            <Button key="export">Export</Button>,
            <Button key="add" type="primary">New</Button>,
        ]}
        options={{
            density: true,
            fullScreen: true,
            reload: true,
            setting: true,
        }}
    />
);

export const proTableData: AntdComponentData = {
    id: "pro-table",
    name: "ProTable",
    description: "ProTable is designed for displaying and managing data in tables. It provides built-in support for query forms, toolbars, batch actions, and more.",
    whenToUse: "Use ProTable when you need to display tabular data with features like searching, filtering, pagination, row selection, inline editing, or nested tables. It's ideal for admin panels and data management interfaces.",
    docUrl: "https://procomponents.ant.design/en-US/components/table",
    demos: [
        {
            id: "basic",
            title: "Basic Table",
            description: "A simple table with columns and toolbar",
            demo: <BasicDemo />,
            code: `import { ProTable } from "@ant-design/pro-components";

<ProTable
  columns={[
    { title: "Name", dataIndex: "name" },
    { title: "Status", dataIndex: "status", valueEnum: { success: "Success", error: "Error" } },
    { title: "Progress", dataIndex: "progress", valueType: "progress" },
    { title: "Money", dataIndex: "money", valueType: "money" },
  ]}
  dataSource={data}
  rowKey="key"
  headerTitle="Basic Table"
  toolBarRender={() => [<Button type="primary">New</Button>]}
/>`,
        },
        {
            id: "query-filter",
            title: "Query Filter",
            description: "Table with built-in search form",
            demo: <QueryFilterDemo />,
            code: `<ProTable
  columns={[
    { title: "Name", dataIndex: "name" },
    { title: "Status", dataIndex: "status", valueEnum: { success: "Success" } },
  ]}
  dataSource={data}
  search={{ labelWidth: "auto" }}
  headerTitle="With Search"
/>`,
        },
        {
            id: "editable",
            title: "Editable Table",
            description: "Table with inline editing capabilities",
            demo: <EditableDemo />,
            code: `<ProTable
  columns={[
    { title: "Name", dataIndex: "name" },
    { title: "Actions", valueType: "option", render: (_, record, __, action) => [
      <a onClick={() => action?.startEditable?.(record.key)}>Edit</a>
    ]}
  ]}
  editable={{ type: "multiple", editableKeys, onChange: setEditableKeys }}
/>`,
        },
        {
            id: "batch-actions",
            title: "Batch Actions",
            description: "Table with row selection and batch operations",
            demo: <BatchActionsDemo />,
            code: `<ProTable
  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
  tableAlertRender={({ selectedRowKeys }) => <span>Selected {selectedRowKeys.length}</span>}
  tableAlertOptionRender={() => <Space><a>Delete</a><a>Export</a></Space>}
/>`,
        },
        {
            id: "nested",
            title: "Expandable Rows",
            description: "Table with expandable row details",
            demo: <NestedTableDemo />,
            code: `<ProTable
  expandable={{
    expandedRowRender: (record) => <p>Details for {record.name}</p>
  }}
/>`,
        },
        {
            id: "toolbar",
            title: "Toolbar Options",
            description: "Table with density, fullscreen, reload, and settings",
            demo: <ToolbarDemo />,
            code: `<ProTable
  toolBarRender={() => [<Button>Export</Button>, <Button type="primary">New</Button>]}
  options={{ density: true, fullScreen: true, reload: true, setting: true }}
/>`,
        },
    ],
    apiProps: [
        { name: "columns", type: "ProColumns[]", description: "Table columns configuration", required: true },
        { name: "dataSource", type: "T[]", description: "Data array for the table" },
        { name: "request", type: "(params) => Promise", description: "Function to fetch data from server" },
        { name: "rowKey", type: "string | (record) => string", description: "Unique key for each row", default: "id" },
        { name: "search", type: "SearchConfig | false", description: "Search form configuration" },
        { name: "toolBarRender", type: "() => ReactNode[]", description: "Toolbar buttons renderer" },
        { name: "headerTitle", type: "ReactNode", description: "Table header title" },
        { name: "editable", type: "EditableConfig", description: "Editable table configuration" },
        { name: "rowSelection", type: "TableRowSelection", description: "Row selection configuration" },
        { name: "options", type: "OptionConfig", description: "Toolbar option buttons" },
        { name: "pagination", type: "PaginationConfig", description: "Pagination settings" },
    ],
};
