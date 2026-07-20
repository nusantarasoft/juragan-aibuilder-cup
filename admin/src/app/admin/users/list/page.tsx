"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    Card, Row, Col, Statistic, Tooltip, Spin,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined,
    EditOutlined,
    MoreOutlined,
    SearchOutlined,
    UserOutlined,
    FileExcelOutlined, FilePdfOutlined, ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { graphql, mutations, queries } from "@/lib/graphqlClient";
import { useAuthStore } from "@/store/useAuthStore";

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ManagedUser {
    id: string;
    email: string;
    fullName?: string | null;
    role: string;
    status: string;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface UserRow {
    key: string;
    id: string;
    name: string;
    email: string;
    role: string;
    status: "active" | "inactive";
    createdAt: string;
}

const roleColors: Record<string, string> = {
    super_admin: "gold",
    admin: "blue",
};

function toRow(user: ManagedUser): UserRow {
    return {
        key: user.id,
        id: user.id,
        name: user.fullName || user.email.split("@")[0],
        email: user.email,
        role: user.role,
        status: user.status === "inactive" ? "inactive" : "active",
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString() : "—",
    };
}

export default function UsersListPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const currentUser = useAuthStore((s) => s.user);
    const isSuperAdmin = useAuthStore((s) => s.hasRole("super_admin"));

    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await graphql<{ users: ManagedUser[] }>(queries.users);
            setUsers((data.users || []).map(toRow));
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.name.toLowerCase().includes(q)
                || u.email.toLowerCase().includes(q)
                || u.role.toLowerCase().includes(q),
        );
    }, [users, search]);

    const roleOptions = useMemo(() => {
        const options = [{ value: "admin", label: "Admin (Pengguna)" }];
        if (isSuperAdmin) {
            options.unshift({ value: "super_admin", label: "Super Admin" });
        }
        return options;
    }, [isSuperAdmin]);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ role: "admin" });
        setIsModalOpen(true);
    };

    const openEdit = (record: UserRow) => {
        setEditing(record);
        form.setFieldsValue({
            name: record.name,
            email: record.email,
            role: record.role,
            password: undefined,
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            if (editing) {
                await graphql(mutations.updateUser, {
                    variables: {
                        id: editing.id,
                        input: {
                            fullName: values.name,
                            role: values.role,
                            ...(values.password ? { password: values.password } : {}),
                        },
                    },
                });
                message.success("User updated");
            } else {
                await graphql(mutations.createUser, {
                    variables: {
                        input: {
                            email: values.email,
                            password: values.password,
                            fullName: values.name,
                            role: values.role,
                        },
                    },
                });
                message.success(`User ${values.email} created`);
            }

            setIsModalOpen(false);
            form.resetFields();
            await loadUsers();
        } catch (err) {
            if (err && typeof err === "object" && "errorFields" in err) return;
            message.error(err instanceof Error ? err.message : "Failed to save user");
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = (record: UserRow) => {
        const next = record.status === "active" ? "inactive" : "active";
        Modal.confirm({
            title: next === "inactive" ? "Deactivate user?" : "Activate user?",
            content: `${record.email} will be marked ${next}.`,
            onOk: async () => {
                try {
                    await graphql(mutations.setUserStatus, {
                        variables: { id: record.id, status: next },
                    });
                    message.success(`User ${next}`);
                    await loadUsers();
                } catch (err) {
                    message.error(err instanceof Error ? err.message : "Failed to update status");
                }
            },
        });
    };

    const removeUser = (record: UserRow) => {
        Modal.confirm({
            title: "Delete user?",
            content: `This permanently removes ${record.email} from login access.`,
            okType: "danger",
            onOk: async () => {
                try {
                    await graphql(mutations.deleteUser, {
                        variables: { id: record.id },
                    });
                    message.success("User deleted");
                    await loadUsers();
                } catch (err) {
                    message.error(err instanceof Error ? err.message : "Failed to delete user");
                }
            },
        });
    };

    const columns: ColumnsType<UserRow> = [
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
            render: (role: string) => (
                <Tag color={roleColors[role] || "default"}>
                    {role.replace("_", " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
                <Tag color={status === "active" ? "green" : "default"}>
                    {status.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => {
                const isSelf = currentUser?.id === record.id;
                return (
                    <Space>
                        <Button type="text" icon={<EditOutlined />} title="Edit" onClick={() => openEdit(record)} />
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: "deactivate",
                                        label: record.status === "active" ? "Deactivate" : "Activate",
                                        disabled: isSelf,
                                        onClick: () => toggleStatus(record),
                                    },
                                    {
                                        key: "delete",
                                        label: "Delete",
                                        danger: true,
                                        disabled: isSelf,
                                        onClick: () => removeUser(record),
                                    },
                                ],
                            }}
                        >
                            <Button type="text" icon={<MoreOutlined />} />
                        </Dropdown>
                    </Space>
                );
            },
        },
    ];

    const exportData = filtered.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
    }));

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>User Management</AuroraText>}
            subTitle={<DecryptedText text="Manage who can log in (super admin & admin)" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <RbacGuard key="exports" requiredRole="admin">
                    <Tooltip title="Export to Excel">
                        <Button
                            icon={<FileExcelOutlined />}
                            size="small"
                            onClick={() => exportToExcel({
                                fileName: 'users',
                                title: 'User Management',
                                dateRange: { start: startDate, end: endDate },
                                columns: [
                                    { header: 'Name', key: 'name' },
                                    { header: 'Email', key: 'email' },
                                    { header: 'Role', key: 'role' },
                                    { header: 'Status', key: 'status' },
                                    { header: 'Created', key: 'createdAt' },
                                ],
                                data: exportData,
                            })}
                        />
                    </Tooltip>
                    {" "}
                    <Tooltip title="Export to PDF">
                        <Button
                            icon={<FilePdfOutlined />}
                            size="small"
                            onClick={() => exportToPdf({
                                fileName: 'users',
                                title: 'User Management',
                                dateRange: { start: startDate, end: endDate },
                                columns: [
                                    { header: 'Name', key: 'name' },
                                    { header: 'Email', key: 'email' },
                                    { header: 'Role', key: 'role' },
                                    { header: 'Status', key: 'status' },
                                    { header: 'Created', key: 'createdAt' },
                                ],
                                data: exportData,
                            })}
                        />
                    </Tooltip>
                </RbacGuard>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={() => void loadUsers()}>
                    Refresh
                </Button>,
                <Button
                    key="add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                >
                    Add User
                </Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Users', value: users.length, icon: <UserOutlined />, color: '#3b82f6' },
                    { title: 'Active', value: users.filter(u => u.status === 'active').length, icon: <UserOutlined />, color: '#10b981' },
                    { title: 'Super Admins', value: users.filter(u => u.role === 'super_admin').length, icon: <UserOutlined />, color: '#f59e0b' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <div style={{ marginBottom: 16 }}>
                <Input
                    placeholder="Search users..."
                    prefix={<SearchOutlined />}
                    style={{ maxWidth: 300 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                />
            </div>

            <Spin spinning={loading}>
                <Table
                    scroll={{ x: 900 }}
                    columns={columns}
                    dataSource={filtered}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Total ${total} users`,
                    }}
                />
            </Spin>

            <Modal
                title={editing ? "Edit User" : "Add New User"}
                open={isModalOpen}
                onOk={() => void handleSave()}
                onCancel={() => setIsModalOpen(false)}
                okText={editing ? "Save" : "Create User"}
                confirmLoading={saving}
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
                        <Input placeholder="user@nusantarasoft.local" disabled={!!editing} />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: "Please select a role" }]}
                    >
                        <Select options={roleOptions} />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label={editing ? "New Password (optional)" : "Password"}
                        rules={editing
                            ? [{ min: 8, message: "Password must be at least 8 characters" }]
                            : [
                                { required: true, message: "Please enter password" },
                                { min: 8, message: "Password must be at least 8 characters" },
                            ]}
                    >
                        <Input.Password placeholder="Min. 8 characters" />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
