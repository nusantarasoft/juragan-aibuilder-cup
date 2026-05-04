"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Space, Modal, Form, Input, Card, Tag,
    message, Typography, Checkbox, Spin,
} from "antd";
import {
    PlusOutlined, DeleteOutlined, ReloadOutlined,
    KeyOutlined, SettingOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

interface PermissionSet {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    tenantId: string;
}

interface ObjPerm {
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

const PS_FIELDS: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description" },
];

export default function PermissionSetsPage() {
    const { themeColor } = usePreferencesStore();
    const [sets, setSets] = useState<PermissionSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const [selectedPS, setSelectedPS] = useState<PermissionSet | null>(null);
    const [permsOpen, setPermsOpen] = useState(false);
    const [objPerms, setObjPerms] = useState<ObjPerm[]>([]);
    const [permsLoading, setPermsLoading] = useState(false);

    const loadSets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    permissionSets(tenantId: $tenantId) {
                        id name description isSystem tenantId
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setSets(data.permissionSets || []);
        } catch (err: any) {
            message.error("Failed to load: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSets(); }, [loadSets]);

    const loadObjPerms = async (psId: string) => {
        setPermsLoading(true);
        try {
            const data = await gql(`
                query($permissionSetId: String!) {
                    permissionSetObjectPermissions(permissionSetId: $permissionSetId) {
                        id objectName canCreate canRead canEdit canDelete canViewAll canModifyAll
                    }
                }
            `, { permissionSetId: psId });
            setObjPerms(data.permissionSetObjectPermissions || []);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setPermsLoading(false);
        }
    };

    const handleSave = async (values: any) => {
        try {
            await gql(`
                mutation($tenantId: String!, $name: String!, $description: String) {
                    createPermissionSet(tenantId: $tenantId, name: $name, description: $description) { id }
                }
            `, { tenantId: DEFAULT_TENANT_ID, name: values.name, description: values.description });
            message.success("Permission set created");
            setIsModalOpen(false);
            form.resetFields();
            loadSets();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($tenantId: String!, $name: String!, $description: String) {
                    createPermissionSet(tenantId: $tenantId, name: $name, description: $description) { id }
                }`, { tenantId: DEFAULT_TENANT_ID, name: r.name, description: r.description || null });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadSets(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deletePermissionSet(id: $id) }`, { id });
            message.success("Permission set deleted");
            loadSets();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handlePermChange = async (objectName: string, field: string, value: boolean) => {
        if (!selectedPS) return;
        const existing = objPerms.find(p => p.objectName === objectName);
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
                mutation($permissionSetId: String!, $objectName: String!, $canCreate: Boolean, $canRead: Boolean, $canEdit: Boolean, $canDelete: Boolean, $canViewAll: Boolean, $canModifyAll: Boolean) {
                    upsertPermissionSetObjectPermission(
                        permissionSetId: $permissionSetId, objectName: $objectName,
                        canCreate: $canCreate, canRead: $canRead, canEdit: $canEdit,
                        canDelete: $canDelete, canViewAll: $canViewAll, canModifyAll: $canModifyAll
                    ) { id }
                }
            `, { permissionSetId: selectedPS.id, ...input });
            setObjPerms(prev => {
                const idx = prev.findIndex(p => p.objectName === objectName);
                const updated = { ...existing, id: existing?.id || '', ...input } as ObjPerm;
                if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
                return [...prev, updated];
            });
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const columns: ColumnsType<PermissionSet> = [
        {
            title: "Permission Set", key: "ps",
            render: (_, record) => (
                <Space>
                    <KeyOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                    <div>
                        <Text strong>{record.name}</Text>
                        {record.isSystem && <Tag color="gold" style={{ marginLeft: 8 }}>System</Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Actions", key: "actions", width: 160,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<SettingOutlined />} onClick={() => { setSelectedPS(record); setPermsOpen(true); loadObjPerms(record.id); }}>
                        Configure
                    </Button>
                    <Button type="text" danger icon={<DeleteOutlined />} disabled={record.isSystem}
                        onClick={() => Modal.confirm({ title: `Delete "${record.name}"?`, onOk: () => handleDelete(record.id) })}
                    />
                </Space>
            ),
        },
    ];

    const permColumns: ColumnsType<{ object: string }> = [
        { title: "Object", dataIndex: "object", key: "object", width: 150, render: (v) => <Text strong style={{ textTransform: 'capitalize' }}>{v}</Text> },
        ...["canCreate", "canRead", "canEdit", "canDelete", "canViewAll", "canModifyAll"].map(field => ({
            title: field.replace("can", "").replace("All", " All"),
            key: field, width: 90, align: "center" as const,
            render: (_: any, record: { object: string }) => {
                const perm = objPerms.find(p => p.objectName === record.object);
                const checked = perm ? (perm as any)[field] : false;
                return <Checkbox checked={checked} onChange={e => handlePermChange(record.object, field, e.target.checked)} />;
            },
        })),
    ];

    const formSteps = [
        {
            title: "Permission Set",
            icon: <KeyOutlined />,
            fields: ["name", "description"],
            content: (
                <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Marketing Tools Access" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="What does this permission set grant?" rows={2} />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Permission Sets</AuroraText>}
            subTitle={<DecryptedText text="Additive permissions assigned to individual users" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadSets} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalOpen(true); }}>
                    Create Permission Set
                </Button>,
            ]}
        >
            <Card>
                <Table columns={columns} dataSource={sets.map(s => ({ ...s, key: s.id }))} loading={loading} pagination={false} size="middle" />
            </Card>

            <SteppedFormModal
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title="Create Permission Set"
                entityName="permission-set"
                steps={formSteps}
                fields={PS_FIELDS}
                width={520}
                onBatchCreate={handleBatchCreate}
                gradient={["#0ea5e9", "#6366f1"]}
            />

            {/* Permissions Configuration Modal — kept as separate specialized workflow */}
            <Modal title={<Space><KeyOutlined /> Permissions — {selectedPS?.name}</Space>}
                open={permsOpen} onCancel={() => setPermsOpen(false)} footer={null} width={900}>
                <Spin spinning={permsLoading}>
                    <Table columns={permColumns} dataSource={SYSTEM_OBJECTS.map(obj => ({ key: obj, object: obj }))}
                        pagination={false} size="small" bordered scroll={{ y: 400 }} />
                </Spin>
            </Modal>
        </CMSLayout>
    );
}
