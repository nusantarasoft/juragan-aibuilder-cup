"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Button, Space, Modal, Form, Input, Select, Tree, Tag,
    message, Typography, Empty, Descriptions, Row, Col, Statistic,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    ApartmentOutlined, CrownOutlined, FileTextOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Role {
    id: string;
    name: string;
    description: string;
    level: number;
    parentRoleId: string | null;
    tenantId: string;
}

const ROLE_FIELDS: FieldDef[] = [
    { name: "name", label: "Role Name", required: true },
    { name: "description", label: "Description" },
    { name: "parentRoleId", label: "Parent Role" },
];

export default function RolesPage() {
    const { themeColor } = usePreferencesStore();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [form] = Form.useForm();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    roles(tenantId: $tenantId) {
                        id name description level parentRoleId tenantId
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setRoles(data.roles || []);
        } catch (err: any) {
            message.error("Failed to load roles: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRoles(); }, [loadRoles]);

    const handleSave = async (values: any) => {
        try {
            if (editingRole) {
                await gql(`
                    mutation($id: String!, $name: String, $description: String, $parentRoleId: String) {
                        updateRole(id: $id, name: $name, description: $description, parentRoleId: $parentRoleId) { id }
                    }
                `, { id: editingRole.id, name: values.name, description: values.description, parentRoleId: values.parentRoleId || null });
                message.success("Role updated");
            } else {
                await gql(`
                    mutation($tenantId: String!, $name: String!, $description: String, $parentRoleId: String) {
                        createRole(tenantId: $tenantId, name: $name, description: $description, parentRoleId: $parentRoleId) { id }
                    }
                `, { tenantId: DEFAULT_TENANT_ID, name: values.name, description: values.description, parentRoleId: values.parentRoleId || null });
                message.success("Role created");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingRole(null);
            loadRoles();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($tenantId: String!, $name: String!, $description: String, $parentRoleId: String) {
                    createRole(tenantId: $tenantId, name: $name, description: $description, parentRoleId: $parentRoleId) { id }
                }`, { tenantId: DEFAULT_TENANT_ID, name: r.name, description: r.description || null, parentRoleId: r.parentRoleId || null });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadRoles(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        const children = roles.filter(r => r.parentRoleId === id);
        if (children.length > 0) {
            message.error("Cannot delete role with child roles. Remove children first.");
            return;
        }
        try {
            await gql(`mutation($id: String!) { deleteRole(id: $id) }`, { id });
            message.success("Role deleted");
            setSelectedRole(null);
            setSelectedKeys([]);
            loadRoles();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const buildTree = (parentId: string | null = null): DataNode[] => {
        return roles
            .filter(r => r.parentRoleId === parentId)
            .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
            .map(r => ({
                key: r.id,
                title: (
                    <Space>
                        {r.level === 0 && <CrownOutlined style={{ color: '#faad14' }} />}
                        <Text strong>{r.name}</Text>
                        <Tag color={r.level === 0 ? 'gold' : r.level === 1 ? 'blue' : 'default'}>
                            L{r.level}
                        </Tag>
                    </Space>
                ),
                children: buildTree(r.id),
            }));
    };

    const rootRoles = roles.filter(r => !r.parentRoleId);
    const treeData = rootRoles.length > 0 ? buildTree(null) : [];

    const handleSelect = (keys: React.Key[]) => {
        setSelectedKeys(keys as string[]);
        if (keys.length > 0) {
            const role = roles.find(r => r.id === keys[0]);
            setSelectedRole(role || null);
        } else {
            setSelectedRole(null);
        }
    };

    const formSteps = [
        {
            title: "Role Info",
            icon: <ApartmentOutlined />,
            fields: ["name", "description", "parentRoleId"],
            content: (
                <>
                    <Form.Item name="name" label="Role Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., VP Sales" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="Description of this role" rows={2} />
                    </Form.Item>
                    <Form.Item name="parentRoleId" label="Parent Role">
                        <Select
                            allowClear
                            placeholder="Select parent role (leave empty for top-level)"
                            options={roles
                                .filter(r => editingRole ? r.id !== editingRole.id : true)
                                .map(r => ({ value: r.id, label: `${r.name} (L${r.level})` }))}
                        />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Roles & Hierarchy</AuroraText>}
            subTitle={<DecryptedText text="Define organizational hierarchy for vertical data access" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadRoles} />,
                <Button
                    key="add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingRole(null);
                        form.resetFields();
                        if (selectedRole) form.setFieldsValue({ parentRoleId: selectedRole.id });
                        setIsModalOpen(true);
                    }}
                >
                    Add Role
                </Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Roles', value: roles.length, icon: <ApartmentOutlined />, color: '#3b82f6' },
                    { title: 'Root Roles', value: roles.filter(r => !r.parentRoleId).length, icon: <CrownOutlined />, color: '#f59e0b' },
                    { title: 'Max Depth', value: roles.length > 0 ? Math.max(...roles.map(r => r.level)) + 1 : 0, icon: <ApartmentOutlined />, color: '#8b5cf6' },
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
            <div style={{ display: 'flex', gap: 16 }}>
                <Card
                    title={<Space><ApartmentOutlined /> Role Hierarchy</Space>}
                    style={{ flex: 1, minWidth: 350 }}
                    loading={loading}
                >
                    {treeData.length > 0 ? (
                        <Tree
                            treeData={treeData}
                            selectedKeys={selectedKeys}
                            onSelect={handleSelect}
                            defaultExpandAll
                            showLine={{ showLeafIcon: false }}
                            blockNode
                            style={{ fontSize: 14 }}
                        />
                    ) : (
                        <Empty description="No roles defined yet" />
                    )}
                </Card>

                <Card
                    title="Role Details"
                    style={{ flex: 1, minWidth: 350 }}
                    extra={
                        selectedRole && (
                            <Space>
                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setEditingRole(selectedRole);
                                        form.setFieldsValue({
                                            name: selectedRole.name,
                                            description: selectedRole.description,
                                            parentRoleId: selectedRole.parentRoleId,
                                        });
                                        setIsModalOpen(true);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => Modal.confirm({
                                        title: `Delete "${selectedRole.name}"?`,
                                        content: "This will also remove hierarchy paths.",
                                        onOk: () => handleDelete(selectedRole.id),
                                    })}
                                >
                                    Delete
                                </Button>
                            </Space>
                        )
                    }
                >
                    {selectedRole ? (
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Name">{selectedRole.name}</Descriptions.Item>
                            <Descriptions.Item label="Description">{selectedRole.description || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Level">
                                <Tag color={selectedRole.level === 0 ? 'gold' : 'blue'}>Level {selectedRole.level}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Parent Role">
                                {selectedRole.parentRoleId
                                    ? roles.find(r => r.id === selectedRole.parentRoleId)?.name || '—'
                                    : <Tag>Root (No Parent)</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Direct Reports">
                                {roles.filter(r => r.parentRoleId === selectedRole.id).length} roles
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <Empty description="Select a role from the hierarchy tree" />
                    )}
                </Card>
            </div>

            <SteppedFormModal
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingRole(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editingRole ? "Edit Role" : "Create Role"}
                entityName="role"
                steps={formSteps}
                fields={ROLE_FIELDS}
                width={550}
                onBatchCreate={handleBatchCreate}
                gradient={["#f59e0b", "#d97706"]}
                editMode={!!editingRole}
            />
        </CMSLayout>
    );
}
