"use client";

import React from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import { Button, Tag, Badge } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Sample data
const userData = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 234 567 890",
    status: "active",
    role: "Administrator",
    department: "Engineering",
    joinDate: "2023-01-15",
    salary: 75000,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
};

// Demo 1: Basic Descriptions
const BasicDemo = () => (
    <ProDescriptions
        title="User Profile"
        dataSource={userData}
        columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Email", dataIndex: "email" },
            { title: "Phone", dataIndex: "phone" },
        ]}
    />
);

// Demo 2: Columns Layout
const ColumnsDemo = () => (
    <ProDescriptions
        title="User Details"
        dataSource={userData}
        column={2}
        columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Email", dataIndex: "email" },
            { title: "Phone", dataIndex: "phone" },
            { title: "Role", dataIndex: "role" },
        ]}
    />
);

// Demo 3: Bordered Style
const BorderedDemo = () => (
    <ProDescriptions
        title="Bordered Layout"
        dataSource={userData}
        bordered
        column={2}
        columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Email", dataIndex: "email" },
            { title: "Department", dataIndex: "department" },
            { title: "Role", dataIndex: "role" },
        ]}
    />
);

// Demo 4: Value Types
const ValueTypesDemo = () => (
    <ProDescriptions
        title="Value Types"
        dataSource={userData}
        column={2}
        columns={[
            { title: "Name", dataIndex: "name", valueType: "text" },
            { title: "Email", dataIndex: "email", valueType: "text", copyable: true },
            { title: "Join Date", dataIndex: "joinDate", valueType: "date" },
            { title: "Salary", dataIndex: "salary", valueType: "money" },
        ]}
    />
);

// Demo 5: Custom Render
const CustomRenderDemo = () => (
    <ProDescriptions
        title="Custom Rendering"
        dataSource={userData}
        column={2}
        columns={[
            { title: "Name", dataIndex: "name" },
            {
                title: "Status",
                dataIndex: "status",
                render: (_, record: any) => (
                    <Badge status={record.status === "active" ? "success" : "default"} text={record.status} />
                ),
            },
            {
                title: "Role",
                dataIndex: "role",
                render: (_, record: any) => <Tag color="blue">{record.role}</Tag>,
            },
            { title: "Email", dataIndex: "email" },
        ]}
    />
);

// Demo 6: Editable Descriptions
const EditableDemo = () => {
    const [editing, setEditing] = React.useState(false);

    return (
        <ProDescriptions
            title="Editable Mode"
            dataSource={userData}
            editable={{
                onSave: async () => {
                    return true;
                },
            }}
            columns={[
                { title: "Name", dataIndex: "name" },
                { title: "Email", dataIndex: "email" },
                { title: "Phone", dataIndex: "phone" },
            ]}
        />
    );
};

// Demo 7: With Request
const RequestDemo = () => (
    <ProDescriptions
        title="From Request"
        request={async () => ({
            data: userData,
            success: true,
        })}
        columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Email", dataIndex: "email" },
            { title: "Role", dataIndex: "role" },
        ]}
    />
);

// Demo 8: Extra Actions
const ExtraActionsDemo = () => (
    <ProDescriptions
        title="With Actions"
        dataSource={userData}
        extra={<Button type="primary">Edit</Button>}
        columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Email", dataIndex: "email" },
            { title: "Department", dataIndex: "department" },
        ]}
    />
);

export const proDescriptionsData: AntdComponentData = {
    id: "pro-descriptions",
    name: "ProDescriptions",
    description: "ProDescriptions is used to display multiple read-only fields in a structured layout, with support for editable mode, value types, and custom rendering.",
    whenToUse: "Use ProDescriptions when you need to display detailed information about an entity, such as user profiles, order details, or configuration settings.",
    docUrl: "https://procomponents.ant.design/en-US/components/descriptions",
    demos: [
        {
            id: "basic",
            title: "Basic Descriptions",
            description: "Simple key-value display",
            demo: <BasicDemo />,
            code: `<ProDescriptions
  title="User Profile"
  dataSource={data}
  columns={[
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
  ]}
/>`,
        },
        {
            id: "columns",
            title: "Multi-column Layout",
            description: "Display in multiple columns",
            demo: <ColumnsDemo />,
            code: `<ProDescriptions
  title="Details"
  dataSource={data}
  column={2}
  columns={[...]}
/>`,
        },
        {
            id: "bordered",
            title: "Bordered Style",
            description: "With border styling",
            demo: <BorderedDemo />,
            code: `<ProDescriptions
  title="Bordered"
  dataSource={data}
  bordered
  column={2}
/>`,
        },
        {
            id: "valuetypes",
            title: "Value Types",
            description: "Different value type formatting",
            demo: <ValueTypesDemo />,
            code: `<ProDescriptions
  columns={[
    { title: "Date", dataIndex: "date", valueType: "date" },
    { title: "Money", dataIndex: "money", valueType: "money" },
    { title: "Email", dataIndex: "email", copyable: true },
  ]}
/>`,
        },
        {
            id: "custom",
            title: "Custom Rendering",
            description: "Custom render for cells",
            demo: <CustomRenderDemo />,
            code: `<ProDescriptions
  columns={[
    { title: "Status", dataIndex: "status",
      render: (_, r) => <Badge status={r.status === "active" ? "success" : "default"} />
    },
  ]}
/>`,
        },
        {
            id: "editable",
            title: "Editable Mode",
            description: "Inline editing support",
            demo: <EditableDemo />,
            code: `<ProDescriptions
  editable={{ onSave: async () => true }}
  columns={[{ title: "Name", dataIndex: "name" }]}
/>`,
        },
        {
            id: "request",
            title: "From Request",
            description: "Load data from async request",
            demo: <RequestDemo />,
            code: `<ProDescriptions
  request={async () => ({ data: userData, success: true })}
  columns={[...]}
/>`,
        },
        {
            id: "extra",
            title: "With Actions",
            description: "Extra buttons in header",
            demo: <ExtraActionsDemo />,
            code: `<ProDescriptions
  title="With Actions"
  extra={<Button type="primary">Edit</Button>}
/>`,
        },
    ],
    apiProps: [
        { name: "dataSource", type: "object", description: "Data object to display" },
        { name: "columns", type: "ProDescriptionsItemProps[]", description: "Column definitions", required: true },
        { name: "request", type: "() => Promise<{ data, success }>", description: "Async data fetcher" },
        { name: "title", type: "ReactNode", description: "Title text" },
        { name: "column", type: "number", description: "Number of columns", default: "3" },
        { name: "bordered", type: "boolean", description: "Show borders", default: "false" },
        { name: "editable", type: "EditableConfig", description: "Editable mode configuration" },
        { name: "extra", type: "ReactNode", description: "Extra content in header" },
    ],
};
