"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Card, Button, Space, Modal, Form, Input, Select, Tree, Tag,
    message, Typography, Empty, Descriptions,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    ApartmentOutlined, CrownOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text } = Typography;

interface Role {
    id: string;
    name: string;
    description: string;
    level: number;
    parentRoleId: string | null;
    tenantId: string;
}

export default function RolesPage() {
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

    const handleCreateOrUpdate = async () => {
        try {
            const values = await form.validateFields();
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

    return (
        <CMSLayout
            title="Roles & Hierarchy"
            subTitle="Define organizational hierarchy for vertical data access"
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

            <Modal
                title={editingRole ? "Edit Role" : "Create Role"}
                open={isModalOpen}
                onOk={handleCreateOrUpdate}
                onCancel={() => { setIsModalOpen(false); setEditingRole(null); form.resetFields(); }}
                okText={editingRole ? "Update" : "Create"}
            >
                <Form form={form} layout="vertical">
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
                </Form>
            </Modal>
        </CMSLayout>
    );
}
