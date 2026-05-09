"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Form, Input, Switch,
    Card, Checkbox, message, Tooltip, Typography, Spin, Row, Col, Statistic, Divider,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined,
    ReloadOutlined, IdcardOutlined, SettingOutlined,
    FileExcelOutlined, FilePdfOutlined, CloudDownloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

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

const EXPORT_PERMISSION_KEYS = [
    { key: 'export.pdf', label: 'PDF Export', description: 'Allow exporting data as PDF reports', icon: <FilePdfOutlined style={{ color: '#ef4444' }} /> },
    { key: 'export.excel', label: 'Excel Export', description: 'Allow exporting data as Excel spreadsheets', icon: <FileExcelOutlined style={{ color: '#22c55e' }} /> },
    { key: 'export.bulk', label: 'Bulk Export', description: 'Allow exporting all records (no row limit)', icon: <CloudDownloadOutlined style={{ color: '#3b82f6' }} /> },
];

const PROFILE_FIELDS: FieldDef[] = [
    { name: "name", label: "Profile Name", required: true },
    { name: "description", label: "Description" },
];

export default function ProfilesPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [form] = Form.useForm();

    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [objectPerms, setObjectPerms] = useState<ObjectPermission[]>([]);
    const [permsLoading, setPermsLoading] = useState(false);
    const [permsDrawerOpen, setPermsDrawerOpen] = useState(false);
    const [exportPerms, setExportPerms] = useState<Record<string, boolean>>({});

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

    const loadSystemPermissions = async (profileId: string) => {
        try {
            const data = await gql(`
                query($profileId: String!) {
                    profileSystemPermissions(profileId: $profileId) {
                        id permissionKey isEnabled
                    }
                }
            `, { profileId });
            const perms: Record<string, boolean> = {};
            (data.profileSystemPermissions || []).forEach((p: any) => {
                perms[p.permissionKey] = p.isEnabled;
            });
            setExportPerms(perms);
        } catch { /* ignore */ }
    };

    const handleExportPermChange = async (profileId: string, permissionKey: string, isEnabled: boolean) => {
        try {
            await gql(`
                mutation($profileId: String!, $permissionKey: String!, $isEnabled: Boolean!) {
                    upsertProfileSystemPermission(profileId: $profileId, permissionKey: $permissionKey, isEnabled: $isEnabled) {
                        id permissionKey isEnabled
                    }
                }
            `, { profileId, permissionKey, isEnabled });
            setExportPerms(prev => ({ ...prev, [permissionKey]: isEnabled }));
            message.success(`${permissionKey} ${isEnabled ? 'enabled' : 'disabled'}`);
        } catch (err: any) {
            message.error(err.message);
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
                                loadSystemPermissions(record.id);
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
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Profiles</AuroraText>}
            subTitle={<DecryptedText text="Manage permission profiles — base template for user access" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <RbacGuard key="exports" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'profiles', title: 'Permission Profiles', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Description', key: 'description' }, { header: 'System', key: 'isSystem', format: (v: boolean) => v ? 'Yes' : 'No' }, { header: 'Custom', key: 'isCustom', format: (v: boolean) => v ? 'Yes' : 'No' }], data: profiles })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'profiles', title: 'Permission Profiles', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Description', key: 'description' }, { header: 'System', key: 'isSystem', format: (v: boolean) => v ? 'Yes' : 'No' }, { header: 'Custom', key: 'isCustom', format: (v: boolean) => v ? 'Yes' : 'No' }], data: profiles })} /></Tooltip></RbacGuard>,
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
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Profiles', value: profiles.length, icon: <IdcardOutlined />, color: '#3b82f6' },
                    { title: 'System', value: profiles.filter(p => p.isSystem).length, icon: <SafetyOutlined />, color: '#f59e0b' },
                    { title: 'Custom', value: profiles.filter(p => p.isCustom).length, icon: <IdcardOutlined />, color: '#10b981' },
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
                gradient={["#6366f1", "var(--theme-color, #8b5cf6)"]}
                editMode={!!editingProfile}
            />

            {/* Object Permissions Modal — kept as separate specialized workflow */}
            <Modal
                title={<Space><SafetyOutlined /><span>Permissions — {selectedProfile?.name}</span></Space>}
                open={permsDrawerOpen}
                onCancel={() => setPermsDrawerOpen(false)}
                footer={null}
                width={900}
            >
                <Spin spinning={permsLoading}>
                    {/* Export Permissions */}
                    <Card
                        size="small"
                        title={<Space><CloudDownloadOutlined /> Export Permissions</Space>}
                        style={{ marginBottom: 16, borderLeft: '3px solid #3b82f6' }}
                    >
                        <Row gutter={[16, 12]}>
                            {EXPORT_PERMISSION_KEYS.map(ep => (
                                <Col key={ep.key} xs={24} sm={8}>
                                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                        <Space>
                                            {ep.icon}
                                            <Text strong>{ep.label}</Text>
                                        </Space>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{ep.description}</Text>
                                        <Switch
                                            checked={exportPerms[ep.key] ?? true}
                                            onChange={(checked) => selectedProfile && handleExportPermChange(selectedProfile.id, ep.key, checked)}
                                            checkedChildren="On"
                                            unCheckedChildren="Off"
                                            style={{ marginTop: 4 }}
                                        />
                                    </Space>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    <Divider style={{ margin: '8px 0 12px' }} />

                    {/* Object Permissions */}
                    <Table columns={permColumns} dataSource={permData} pagination={false} size="small" bordered scroll={{ y: 400 }} />
                </Spin>
            </Modal>
        </CMSLayout>
    );
}
