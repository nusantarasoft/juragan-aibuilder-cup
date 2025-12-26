"use client";

import React, { useState } from "react";
import { EditableProTable } from "@ant-design/pro-components";
import { Button, message } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

type DataSourceType = {
    id: React.Key;
    name?: string;
    age?: number;
    state?: string;
};

// Demo 1: Basic Editable Table
const BasicEditableDemo = () => {
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const [dataSource, setDataSource] = useState<DataSourceType[]>([
        { id: 1, name: "John", age: 25, state: "active" },
        { id: 2, name: "Jane", age: 30, state: "inactive" },
    ]);

    return (
        <EditableProTable<DataSourceType>
            rowKey="id"
            headerTitle="Edit Rows"
            columns={[
                { title: "Name", dataIndex: "name", formItemProps: { rules: [{ required: true }] } },
                { title: "Age", dataIndex: "age", valueType: "digit" },
                { title: "Status", dataIndex: "state", valueType: "select", valueEnum: { active: "Active", inactive: "Inactive" } },
                { title: "Actions", valueType: "option" },
            ]}
            value={dataSource}
            onChange={(value) => setDataSource([...value])}
            editable={{
                type: "multiple",
                editableKeys,
                onChange: setEditableRowKeys,
            }}
            recordCreatorProps={{
                newRecordType: "dataSource",
                record: () => ({ id: Date.now() }),
            }}
        />
    );
};

// Demo 2: Single Row Edit
const SingleRowEditDemo = () => {
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const [dataSource, setDataSource] = useState<DataSourceType[]>([
        { id: 1, name: "Alice", age: 28, state: "active" },
        { id: 2, name: "Bob", age: 35, state: "active" },
    ]);

    return (
        <EditableProTable<DataSourceType>
            rowKey="id"
            headerTitle="Single Edit Mode"
            columns={[
                { title: "Name", dataIndex: "name" },
                { title: "Age", dataIndex: "age", valueType: "digit" },
                { title: "Actions", valueType: "option" },
            ]}
            value={dataSource}
            onChange={(value) => setDataSource([...value])}
            editable={{
                type: "single",
                editableKeys,
                onChange: setEditableRowKeys,
            }}
        />
    );
};

// Demo 3: Row with Actions
const RowActionsDemo = () => {
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const [dataSource, setDataSource] = useState<DataSourceType[]>([
        { id: 1, name: "Product A", age: 100, state: "active" },
    ]);

    return (
        <EditableProTable<DataSourceType>
            rowKey="id"
            headerTitle="With Row Actions"
            columns={[
                { title: "Product", dataIndex: "name" },
                { title: "Price", dataIndex: "age", valueType: "money" },
                {
                    title: "Actions",
                    valueType: "option",
                    render: (_, record, __, action) => [
                        <a key="edit" onClick={() => action?.startEditable?.(record.id)}>Edit</a>,
                        <a key="delete" onClick={() => setDataSource(dataSource.filter(r => r.id !== record.id))}>Delete</a>,
                    ],
                },
            ]}
            value={dataSource}
            onChange={(value) => setDataSource([...value])}
            editable={{
                editableKeys,
                onChange: setEditableRowKeys,
                onSave: async () => message.success("Saved!"),
            }}
        />
    );
};

// Demo 4: Controlled Edit
const ControlledEditDemo = () => {
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const [dataSource, setDataSource] = useState<DataSourceType[]>([
        { id: 1, name: "Item 1", age: 50 },
        { id: 2, name: "Item 2", age: 75 },
    ]);

    return (
        <div>
            <Button onClick={() => setEditableRowKeys([1, 2])} style={{ marginBottom: 16 }}>Edit All</Button>
            <Button onClick={() => setEditableRowKeys([])} style={{ marginBottom: 16, marginLeft: 8 }}>Save All</Button>
            <EditableProTable<DataSourceType>
                rowKey="id"
                columns={[
                    { title: "Name", dataIndex: "name" },
                    { title: "Value", dataIndex: "age", valueType: "digit" },
                ]}
                value={dataSource}
                onChange={(value) => setDataSource([...value])}
                editable={{
                    editableKeys,
                    onChange: setEditableRowKeys,
                }}
                recordCreatorProps={false}
            />
        </div>
    );
};

export const editableProTableData: AntdComponentData = {
    id: "pro-editable-table",
    name: "EditableProTable",
    description: "EditableProTable is an enhanced table component that supports inline editing of cells and rows with full CRUD operations.",
    whenToUse: "Use EditableProTable when you need users to edit data directly in a table format, such as managing inventory, editing user lists, or bulk data entry.",
    docUrl: "https://procomponents.ant.design/en-US/components/editable-table",
    demos: [
        {
            id: "basic",
            title: "Basic Editable Table",
            description: "Table with inline editing support",
            demo: <BasicEditableDemo />,
            code: `<EditableProTable
  rowKey="id"
  columns={[
    { title: "Name", dataIndex: "name" },
    { title: "Age", dataIndex: "age", valueType: "digit" },
    { title: "Actions", valueType: "option" },
  ]}
  value={dataSource}
  onChange={setDataSource}
  editable={{
    type: "multiple",
    editableKeys,
    onChange: setEditableRowKeys,
  }}
/>`,
        },
        {
            id: "single",
            title: "Single Row Edit",
            description: "Only one row editable at a time",
            demo: <SingleRowEditDemo />,
            code: `<EditableProTable
  editable={{
    type: "single",
    editableKeys,
    onChange: setEditableRowKeys,
  }}
/>`,
        },
        {
            id: "actions",
            title: "Row Actions",
            description: "Custom edit and delete actions",
            demo: <RowActionsDemo />,
            code: `<EditableProTable
  columns={[
    { title: "Actions", valueType: "option",
      render: (_, record, __, action) => [
        <a onClick={() => action?.startEditable?.(record.id)}>Edit</a>,
        <a onClick={() => handleDelete(record.id)}>Delete</a>,
      ],
    },
  ]}
/>`,
        },
        {
            id: "controlled",
            title: "Controlled Edit",
            description: "Programmatic control of editing",
            demo: <ControlledEditDemo />,
            code: `<Button onClick={() => setEditableRowKeys([1, 2])}>Edit All</Button>
<EditableProTable
  editable={{
    editableKeys,
    onChange: setEditableRowKeys,
  }}
/>`,
        },
    ],
    apiProps: [
        { name: "rowKey", type: "string", description: "Unique key field for rows", required: true },
        { name: "columns", type: "ProColumns[]", description: "Column definitions", required: true },
        { name: "value", type: "T[]", description: "Data source array" },
        { name: "onChange", type: "(data: T[]) => void", description: "Data change callback" },
        { name: "editable", type: "EditableConfig", description: "Editable configuration" },
        { name: "recordCreatorProps", type: "RecordCreatorProps | false", description: "New record button config" },
    ],
};
