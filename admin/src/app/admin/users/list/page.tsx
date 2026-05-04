"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table,
    Button,
    Tag,
    Space,
    Input,
    Avatar,
    Dropdown,
    Modal,
    Form,
    Select,
    message,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    SearchOutlined,
    UserOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface UserData {
    key: string;
    id: string;
    name: string;
    email: string;
    role: string;
    status: "active" | "inactive";
    lastLogin: string;
    createdAt: string;
}

const sampleUsers: UserData[] = [
    {
        key: "1",
        id: "1",
        name: "Super Admin",
        email: "admin@nusantarasoft.local",
        role: "super_admin",
        status: "active",
        lastLogin: "2024-12-23 10:30",
        createdAt: "2024-01-01",
    },
    {
        key: "2",
        id: "2",
        name: "John Editor",
        email: "john@nusantarasoft.local",
        role: "editor",
        status: "active",
        lastLogin: "2024-12-22 15:45",
        createdAt: "2024-06-15",
    },
    {
        key: "3",
        id: "3",
        name: "Jane Viewer",
        email: "jane@nusantarasoft.local",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-12-01 09:00",
        createdAt: "2024-09-20",
    },
];

const roleColors: Record<string, string> = {
    super_admin: "gold",
    admin: "blue",
    editor: "green",
    viewer: "default",
};

export default function UsersListPage() {
    const { themeColor } = usePreferencesStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const columns: ColumnsType<UserData> = [
        {
            title: "User",
            key: "user",
            render: (_, record) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 500 }}>{record.name}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>{record.email}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (role) => (
                <Tag color={roleColors[role]}>
                    {role.replace("_", " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={status === "active" ? "green" : "default"}>
                    {status.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Last Login",
            dataIndex: "lastLogin",
            key: "lastLogin",
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} title="Edit" />
                    <Dropdown
                        menu={{
                            items: [
                                { key: "resetPassword", label: "Reset Password" },
                                { key: "toggle2FA", label: "Enable/Disable 2FA" },
                                {
                                    key: "deactivate",
                                    label: record.status === "active" ? "Deactivate" : "Activate"
                                },
                                { key: "delete", label: "Delete", danger: true },
                            ],
                        }}
                    >
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    const handleAddUser = () => {
        form.validateFields().then((values) => {
            message.success(`User ${values.email} created`);
            setIsModalOpen(false);
            form.resetFields();
        });
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>User Management</AuroraText>}
            subTitle={<DecryptedText text="Manage users and their access" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button
                    key="add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalOpen(true)}
                >
                    Add User
                </Button>,
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <Input
                    placeholder="Search users..."
                    prefix={<SearchOutlined />}
                    style={{ maxWidth: 300 }}
                />
            </div>

            <Table
                columns={columns}
                dataSource={sampleUsers}
                pagination={{
                    pageSize: 10,
                    showTotal: (total) => `Total ${total} users`,
                }}
            />

            <Modal
                title="Add New User"
                open={isModalOpen}
                onOk={handleAddUser}
                onCancel={() => setIsModalOpen(false)}
                okText="Create User"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Full Name"
                        rules={[{ required: true, message: "Please enter name" }]}
                    >
                        <Input placeholder="John Doe" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: "Please enter email" },
                            { type: "email", message: "Please enter a valid email" },
                        ]}
                    >
                        <Input placeholder="user@nusantarasoft.local" />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: "Please select a role" }]}
                    >
                        <Select
                            options={[
                                { value: "admin", label: "Admin" },
                                { value: "editor", label: "Editor" },
                                { value: "viewer", label: "Viewer" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="enable2FA" valuePropName="checked">
                        <label>
                            <input type="checkbox" style={{ marginRight: 8 }} />
                            Require 2FA
                        </label>
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
