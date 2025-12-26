"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table,
    Button,
    Tag,
    Space,
    Card,
    Modal,
    Form,
    Input,
    Transfer,
    message,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface RoleData {
    key: string;
    id: string;
    name: string;
    description: string;
    usersCount: number;
    permissions: string[];
}

const allPermissions = [
    { key: "pages.read", title: "View Pages" },
    { key: "pages.create", title: "Create Pages" },
    { key: "pages.edit", title: "Edit Pages" },
    { key: "pages.delete", title: "Delete Pages" },
    { key: "pages.publish", title: "Publish Pages" },
    { key: "media.read", title: "View Media" },
    { key: "media.upload", title: "Upload Media" },
    { key: "media.delete", title: "Delete Media" },
    { key: "users.read", title: "View Users" },
    { key: "users.create", title: "Create Users" },
    { key: "users.edit", title: "Edit Users" },
    { key: "users.delete", title: "Delete Users" },
    { key: "settings.read", title: "View Settings" },
    { key: "settings.edit", title: "Edit Settings" },
];

const sampleRoles: RoleData[] = [
    {
        key: "1",
        id: "1",
        name: "Super Admin",
        description: "Full access to all features",
        usersCount: 1,
        permissions: allPermissions.map(p => p.key),
    },
    {
        key: "2",
        id: "2",
        name: "Admin",
        description: "Access to most features",
        usersCount: 2,
        permissions: ["pages.read", "pages.create", "pages.edit", "pages.publish", "media.read", "media.upload", "users.read"],
    },
    {
        key: "3",
        id: "3",
        name: "Editor",
        description: "Can create and edit content",
        usersCount: 5,
        permissions: ["pages.read", "pages.create", "pages.edit", "media.read", "media.upload"],
    },
    {
        key: "4",
        id: "4",
        name: "Viewer",
        description: "Can only view content",
        usersCount: 10,
        permissions: ["pages.read", "media.read"],
    },
];

export default function RolesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [form] = Form.useForm();

    const columns: ColumnsType<RoleData> = [
        {
            title: "Role",
            key: "role",
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{record.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{record.description}</div>
                </div>
            ),
        },
        {
            title: "Users",
            dataIndex: "usersCount",
            key: "usersCount",
            render: (count) => <Tag>{count} users</Tag>,
        },
        {
            title: "Permissions",
            dataIndex: "permissions",
            key: "permissions",
            render: (permissions: string[]) => (
                <span>
                    {permissions.length === allPermissions.length ? (
                        <Tag color="gold">All Permissions</Tag>
                    ) : (
                        <Tag>{permissions.length} permissions</Tag>
                    )}
                </span>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            form.setFieldsValue(record);
                            setSelectedPermissions(record.permissions);
                            setIsModalOpen(true);
                        }}
                    />
                    {record.name !== "Super Admin" && (
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    )}
                </Space>
            ),
        },
    ];

    const handleSave = () => {
        form.validateFields().then((values) => {
            console.log("Role:", { ...values, permissions: selectedPermissions });
            message.success("Role saved successfully");
            setIsModalOpen(false);
            form.resetFields();
            setSelectedPermissions([]);
        });
    };

    return (
        <CMSLayout
            title="Roles & Permissions"
            subTitle="Manage access control"
            extra={[
                <Button
                    key="add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        form.resetFields();
                        setSelectedPermissions([]);
                        setIsModalOpen(true);
                    }}
                >
                    Create Role
                </Button>,
            ]}
        >
            <Table
                columns={columns}
                dataSource={sampleRoles}
                pagination={false}
            />

            <Modal
                title="Edit Role"
                open={isModalOpen}
                onOk={handleSave}
                onCancel={() => setIsModalOpen(false)}
                okText="Save Role"
                width={700}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Role Name"
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="e.g., Content Manager" />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input placeholder="Brief description of the role" />
                    </Form.Item>
                </Form>

                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>Permissions</div>
                    <Transfer
                        dataSource={allPermissions}
                        targetKeys={selectedPermissions}
                        onChange={(keys) => setSelectedPermissions(keys as string[])}
                        render={(item) => item.title}
                        listStyle={{ width: 280, height: 300 }}
                        titles={["Available", "Assigned"]}
                    />
                </div>
            </Modal>
        </CMSLayout>
    );
}
