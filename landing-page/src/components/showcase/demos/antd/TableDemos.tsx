"use client";

import React, { useState } from "react";
import { Table, Tag, Space, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AntdComponentData } from "../../AntdStyleContent";

interface DataType {
    key: string;
    name: string;
    age: number;
    address: string;
    tags?: string[];
}

const basicData: DataType[] = [
    { key: "1", name: "John Brown", age: 32, address: "New York" },
    { key: "2", name: "Jim Green", age: 42, address: "London" },
    { key: "3", name: "Joe Black", age: 32, address: "Sydney" },
];

// Demo 1: Basic Table
const BasicTableDemo = () => {
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name", key: "name" },
        { title: "Age", dataIndex: "age", key: "age" },
        { title: "Address", dataIndex: "address", key: "address" },
    ];
    return <Table columns={columns} dataSource={basicData} pagination={false} size="small" />;
};

// Demo 2: Table with Selection
const SelectionTableDemo = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name" },
        { title: "Age", dataIndex: "age" },
    ];
    return (
        <Table
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            columns={columns}
            dataSource={basicData}
            pagination={false}
            size="small"
        />
    );
};

// Demo 3: Sortable Table
const SortableTableDemo = () => {
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: "Age", dataIndex: "age", sorter: (a, b) => a.age - b.age },
        { title: "Address", dataIndex: "address" },
    ];
    return <Table columns={columns} dataSource={basicData} pagination={false} size="small" />;
};

// Demo 4: Filterable Table
const FilterableTableDemo = () => {
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name" },
        { title: "Age", dataIndex: "age" },
        {
            title: "Address",
            dataIndex: "address",
            filters: [
                { text: "New York", value: "New York" },
                { text: "London", value: "London" },
            ],
            onFilter: (value, record) => record.address.includes(value as string),
        },
    ];
    return <Table columns={columns} dataSource={basicData} pagination={false} size="small" />;
};

// Demo 5: Table with Tags
const TagsTableDemo = () => {
    const data = [
        { key: "1", name: "John", tags: ["developer", "admin"] },
        { key: "2", name: "Jane", tags: ["designer"] },
    ];
    const columns = [
        { title: "Name", dataIndex: "name" },
        {
            title: "Tags",
            dataIndex: "tags",
            render: (tags: string[]) => tags.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>),
        },
    ];
    return <Table columns={columns} dataSource={data} pagination={false} size="small" />;
};

// Demo 6: Table with Actions
const ActionsTableDemo = () => {
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name" },
        { title: "Age", dataIndex: "age" },
        {
            title: "Action",
            render: (_, record) => (
                <Space>
                    <a>Edit</a>
                    <a>Delete</a>
                </Space>
            ),
        },
    ];
    return <Table columns={columns} dataSource={basicData} pagination={false} size="small" />;
};

// Demo 7: Bordered Table
const BorderedTableDemo = () => {
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name" },
        { title: "Age", dataIndex: "age" },
        { title: "Address", dataIndex: "address" },
    ];
    return <Table columns={columns} dataSource={basicData} bordered pagination={false} size="small" />;
};

// Demo 8: Loading Table
const LoadingTableDemo = () => {
    const columns: ColumnsType<DataType> = [
        { title: "Name", dataIndex: "name" },
        { title: "Age", dataIndex: "age" },
    ];
    return <Table columns={columns} dataSource={[]} loading pagination={false} size="small" />;
};

export const tableData: AntdComponentData = {
    id: "antd-table",
    name: "Table",
    description: "Table displays rows of data with columns. Supports sorting, filtering, pagination, row selection, and custom rendering.",
    whenToUse: "Use Table to display structured data in rows and columns. Ideal for data lists, reports, and admin panels.",
    docUrl: "https://ant.design/components/table",
    demos: [
        {
            id: "basic",
            title: "Basic Table",
            description: "Simple data table",
            demo: <BasicTableDemo />,
            code: `<Table
  columns={[
    { title: "Name", dataIndex: "name" },
    { title: "Age", dataIndex: "age" },
  ]}
  dataSource={data}
/>`,
        },
        {
            id: "selection",
            title: "Row Selection",
            description: "Selectable rows",
            demo: <SelectionTableDemo />,
            code: `<Table
  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
  columns={columns}
  dataSource={data}
/>`,
        },
        {
            id: "sortable",
            title: "Sortable Columns",
            description: "Click to sort",
            demo: <SortableTableDemo />,
            code: `{ title: "Age", dataIndex: "age", sorter: (a, b) => a.age - b.age }`,
        },
        {
            id: "filterable",
            title: "Filterable Columns",
            description: "Filter by column values",
            demo: <FilterableTableDemo />,
            code: `{
  title: "Address",
  filters: [{ text: "NY", value: "NY" }],
  onFilter: (value, record) => record.address.includes(value),
}`,
        },
        {
            id: "tags",
            title: "With Tags",
            description: "Custom tag rendering",
            demo: <TagsTableDemo />,
            code: `{ title: "Tags", render: (tags) => tags.map(t => <Tag>{t}</Tag>) }`,
        },
        {
            id: "actions",
            title: "With Actions",
            description: "Action buttons column",
            demo: <ActionsTableDemo />,
            code: `{
  title: "Action",
  render: (_, record) => <Space><a>Edit</a><a>Delete</a></Space>
}`,
        },
        {
            id: "bordered",
            title: "Bordered Table",
            description: "Table with borders",
            demo: <BorderedTableDemo />,
            code: `<Table bordered columns={columns} dataSource={data} />`,
        },
        {
            id: "loading",
            title: "Loading State",
            description: "Table with loading indicator",
            demo: <LoadingTableDemo />,
            code: `<Table loading columns={columns} dataSource={[]} />`,
        },
    ],
    apiProps: [
        { name: "columns", type: "ColumnsType[]", description: "Column definitions", required: true },
        { name: "dataSource", type: "object[]", description: "Data array", required: true },
        { name: "rowKey", type: "string | (record) => string", description: "Unique key field" },
        { name: "rowSelection", type: "object", description: "Selection configuration" },
        { name: "pagination", type: "PaginationConfig | false", description: "Pagination settings" },
        { name: "loading", type: "boolean", description: "Loading state" },
        { name: "bordered", type: "boolean", description: "Show borders" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Table size" },
        { name: "scroll", type: "{ x, y }", description: "Scroll configuration" },
    ],
};
