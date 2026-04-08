"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Tag, Space, Modal, Form, Input,
    Card, Checkbox, message, Tooltip, Typography, Spin,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined,
    ReloadOutlined, IdcardOutlined, SettingOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

interface Profile {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    isCustom: boolean;
    tenantId: string;
}

interface ObjectPermission {
    id: string;
    objectName: string;
    canCreate: boolean;
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewAll: boolean;
    canModifyAll: boolean;
}

const SYSTEM_OBJECTS = [
    "pages", "media", "blocks", "users", "settings", "datasets",
    "individuals", "accounts", "contacts", "leads", "opportunities",
    "cases", "activities", "projects", "tasks", "teams",
];

const PROFILE_FIELDS: FieldDef[] = [
    { name: "name", label: "Profile Name", required: true },
    { name: "description", label: "Description" },
];

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [form] = Form.useForm();

    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [objectPerms, setObjectPerms] = useState<ObjectPermission[]>([]);
    const [permsLoading, setPermsLoading] = useState(false);
    const [permsDrawerOpen, setPermsDrawerOpen] = useState(false);

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    profiles(tenantId: $tenantId) {
                        id name description isSystem isCustom tenantId
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setProfiles(data.profiles || []);
        } catch (err: any) {
            message.error("Failed to load profiles: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadProfiles(); }, [loadProfiles]);

    const loadObjectPermissions = async (profileId: string) => {
        setPermsLoading(true);
        try {
            const data = await gql(`
                query($profileId: String!) {
                    profileObjectPermissions(profileId: $profileId) {
                        id objectName canCreate canRead canEdit canDelete canViewAll canModifyAll
                    }
                }
            `, { profileId });
            setObjectPerms(data.profileObjectPermissions || []);
        } catch (err: any) {
            message.error("Failed to load permissions: " + err.message);
        } finally {
            setPermsLoading(false);
        }
    };

    const handleSave = async (values: any) => {
        try {
            if (editingProfile) {
                await gql(`
                    mutation($id: String!, $name: String, $description: String) {
                        updateProfile(id: $id, name: $name, description: $description) { id }
                    }
                `, { id: editingProfile.id, name: values.name, description: values.description });
                message.success("Profile updated");
            } else {
                await gql(`
                    mutation($tenantId: String!, $name: String!, $description: String) {
                        createProfile(tenantId: $tenantId, name: $name, description: $description) { id }
                    }
                `, { tenantId: DEFAULT_TENANT_ID, name: values.name, description: values.description });
                message.success("Profile created");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingProfile(null);
            loadProfiles();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($tenantId: String!, $name: String!, $description: String) {
                    createProfile(tenantId: $tenantId, name: $name, description: $description) { id }
                }`, { tenantId: DEFAULT_TENANT_ID, name: r.name, description: r.description || null });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadProfiles(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteProfile(id: $id) }`, { id });
            message.success("Profile deleted");
            loadProfiles();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handlePermissionChange = async (
        profileId: string, objectName: string, field: string, value: boolean
    ) => {
        const existing = objectPerms.find(p => p.objectName === objectName);
        const input = {
            objectName,
            canCreate: existing?.canCreate ?? false,
            canRead: existing?.canRead ?? false,
            canEdit: existing?.canEdit ?? false,
            canDelete: existing?.canDelete ?? false,
            canViewAll: existing?.canViewAll ?? false,
            canModifyAll: existing?.canModifyAll ?? false,
            [field]: value,
        };
        try {
            await gql(`
                mutation($profileId: String!, $objectName: String!, $canCreate: Boolean, $canRead: Boolean, $canEdit: Boolean, $canDelete: Boolean, $canViewAll: Boolean, $canModifyAll: Boolean) {
                    upsertProfileObjectPermission(
                        profileId: $profileId, objectName: $objectName,
                        canCreate: $canCreate, canRead: $canRead, canEdit: $canEdit,
                        canDelete: $canDelete, canViewAll: $canViewAll, canModifyAll: $canModifyAll
                    ) { id }
                }
            `, { profileId, ...input });
            setObjectPerms(prev => {
                const idx = prev.findIndex(p => p.objectName === objectName);
                const updated = { ...existing, id: existing?.id || '', ...input } as ObjectPermission;
                if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
                return [...prev, updated];
            });
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const columns: ColumnsType<Profile> = [
        {
            title: "Profile",
            key: "profile",
            render: (_, record) => (
                <Space>
                    <IdcardOutlined style={{ fontSize: 20, color: record.isSystem ? '#faad14' : '#1677ff' }} />
                    <div>
                        <Text strong>{record.name}</Text>
                        {record.isSystem && <Tag color="gold" style={{ marginLeft: 8 }}>System</Tag>}
                        {record.isCustom && <Tag color="blue" style={{ marginLeft: 8 }}>Custom</Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 200,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Object Permissions">
                        <Button
                            type="text"
                            icon={<SettingOutlined />}
                            onClick={() => {
                                setSelectedProfile(record);
                                setPermsDrawerOpen(true);
                                loadObjectPermissions(record.id);
                            }}
                        />
                    </Tooltip>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingProfile(record);
                            form.setFieldsValue({ name: record.name, description: record.description });
                            setIsModalOpen(true);
                        }}
                        disabled={record.isSystem}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={record.isSystem}
                        onClick={() => Modal.confirm({
                            title: `Delete "${record.name}"?`,
                            onOk: () => handleDelete(record.id),
                        })}
                    />
                </Space>
            ),
        },
    ];

    const permColumns: ColumnsType<{ object: string }> = [
        { title: "Object", dataIndex: "object", key: "object", width: 150, render: (v) => <Text strong style={{ textTransform: 'capitalize' }}>{v}</Text> },
        ...["canCreate", "canRead", "canEdit", "canDelete", "canViewAll", "canModifyAll"].map(field => ({
            title: field.replace("can", "").replace("All", " All"),
            key: field,
            width: 90,
            align: "center" as const,
            render: (_: any, record: { object: string }) => {
                const perm = objectPerms.find(p => p.objectName === record.object);
                const checked = perm ? (perm as any)[field] : false;
                return (
                    <Checkbox
                        checked={checked}
                        onChange={e => handlePermissionChange(selectedProfile!.id, record.object, field, e.target.checked)}
                    />
                );
            },
        })),
    ];

    const permData = SYSTEM_OBJECTS.map(obj => ({ key: obj, object: obj }));

    const formSteps = [
        {
            title: "Profile Info",
            icon: <IdcardOutlined />,
            fields: ["name", "description"],
            content: (
                <>
                    <Form.Item name="name" label="Profile Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Sales Manager" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="Description of this profile's purpose" rows={3} />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title="Profiles"
            subTitle="Manage permission profiles — base template for user access"
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadProfiles} />,
                <Button
                    key="add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingProfile(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                >
                    Create Profile
                </Button>,
            ]}
        >
            <Card>
                <Table
                    columns={columns}
                    dataSource={profiles.map(p => ({ ...p, key: p.id }))}
                    loading={loading}
                    pagination={false}
                    size="middle"
                />
            </Card>

            <SteppedFormModal
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingProfile(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editingProfile ? "Edit Profile" : "Create Profile"}
                entityName="profile"
                steps={formSteps}
                fields={PROFILE_FIELDS}
                width={520}
                onBatchCreate={handleBatchCreate}
                gradient={["#6366f1", "#8b5cf6"]}
                editMode={!!editingProfile}
            />

            {/* Object Permissions Modal — kept as separate specialized workflow */}
            <Modal
                title={<Space><SafetyOutlined /><span>Object Permissions — {selectedProfile?.name}</span></Space>}
                open={permsDrawerOpen}
                onCancel={() => setPermsDrawerOpen(false)}
                footer={null}
                width={900}
            >
                <Spin spinning={permsLoading}>
                    <Table columns={permColumns} dataSource={permData} pagination={false} size="small" bordered scroll={{ y: 400 }} />
                </Spin>
            </Modal>
        </CMSLayout>
    );
}
