"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Tabs, Table, Button, Space, Modal, Form, Input, Select, Tag,
    message, Typography, Spin, Row, Col, Statistic,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, DeleteOutlined, ReloadOutlined,
    LockOutlined, ShareAltOutlined, EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface OrgWideDefault {
    id: string;
    objectName: string;
    internalAccess: string;
    externalAccess: string;
}

interface SharingRule {
    id: string;
    name: string;
    objectName: string;
    ruleType: string;
    accessLevel: string;
    isActive: boolean;
}

interface FieldPerm {
    id: string;
    objectName: string;
    fieldName: string;
    isVisible: boolean;
    isEditable: boolean;
}

const SYSTEM_OBJECTS = [
    "pages", "media", "blocks", "users", "settings", "datasets",
    "individuals", "accounts", "contacts", "leads", "opportunities",
    "cases", "activities", "projects", "tasks", "teams",
];

const ACCESS_OPTIONS = [
    { value: "private", label: "Private" },
    { value: "public_read", label: "Public Read Only" },
    { value: "public_rw", label: "Public Read/Write" },
];

const RULE_FIELDS: FieldDef[] = [
    { name: "name", label: "Rule Name", required: true },
    { name: "objectName", label: "Object", required: true },
    { name: "ruleType", label: "Rule Type", required: true },
    { name: "accessLevel", label: "Access Level" },
];

export default function SharingPage() {
    const { themeColor } = usePreferencesStore();
    const [owds, setOwds] = useState<OrgWideDefault[]>([]);
    const [owdLoading, setOwdLoading] = useState(true);

    const [rules, setRules] = useState<SharingRule[]>([]);
    const [rulesLoading, setRulesLoading] = useState(true);
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [ruleForm] = Form.useForm();

    const [flsProfile, setFlsProfile] = useState<string>("");
    const [flsObject, setFlsObject] = useState<string>("");
    const [fieldPerms, setFieldPerms] = useState<FieldPerm[]>([]);
    const [flsLoading, setFlsLoading] = useState(false);
    const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);

    const loadOwds = useCallback(async () => {
        setOwdLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    orgWideDefaults(tenantId: $tenantId) {
                        id objectName internalAccess externalAccess
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setOwds(data.orgWideDefaults || []);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setOwdLoading(false);
        }
    }, []);

    const loadRules = useCallback(async () => {
        setRulesLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    sharingRules(tenantId: $tenantId) {
                        id name objectName ruleType accessLevel isActive
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setRules(data.sharingRules || []);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setRulesLoading(false);
        }
    }, []);

    const loadProfiles = useCallback(async () => {
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    profiles(tenantId: $tenantId) { id name }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setProfiles(data.profiles || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadOwds(); loadRules(); loadProfiles(); }, [loadOwds, loadRules, loadProfiles]);

    const handleOwdChange = async (objectName: string, field: string, value: string) => {
        const existing = owds.find(o => o.objectName === objectName);
        try {
            await gql(`
                mutation($tenantId: String!, $objectName: String!, $internalAccess: String!, $externalAccess: String) {
                    upsertOrgWideDefault(tenantId: $tenantId, objectName: $objectName, internalAccess: $internalAccess, externalAccess: $externalAccess) { id }
                }
            `, {
                tenantId: DEFAULT_TENANT_ID,
                objectName,
                internalAccess: field === 'internalAccess' ? value : (existing?.internalAccess || 'private'),
                externalAccess: field === 'externalAccess' ? value : (existing?.externalAccess || 'private'),
            });
            loadOwds();
            message.success(`Updated ${objectName} access`);
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleCreateRule = async (values: any) => {
        try {
            await gql(`
                mutation($tenantId: String!, $name: String!, $objectName: String!, $ruleType: String!, $accessLevel: String) {
                    createSharingRule(tenantId: $tenantId, name: $name, objectName: $objectName, ruleType: $ruleType, accessLevel: $accessLevel) { id }
                }
            `, { tenantId: DEFAULT_TENANT_ID, ...values });
            message.success("Sharing rule created");
            setRuleModalOpen(false);
            ruleForm.resetFields();
            loadRules();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreateRules = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($tenantId: String!, $name: String!, $objectName: String!, $ruleType: String!, $accessLevel: String) {
                    createSharingRule(tenantId: $tenantId, name: $name, objectName: $objectName, ruleType: $ruleType, accessLevel: $accessLevel) { id }
                }`, { tenantId: DEFAULT_TENANT_ID, name: r.name, objectName: r.objectName, ruleType: r.ruleType, accessLevel: r.accessLevel || 'read' });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadRules(); return { success, failed, errors };
    };

    const handleDeleteRule = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteSharingRule(id: $id) }`, { id });
            message.success("Rule deleted");
            loadRules();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const loadFLS = async (profileId: string, objectName: string) => {
        if (!profileId || !objectName) return;
        setFlsLoading(true);
        try {
            const data = await gql(`
                query($profileId: String!, $objectName: String) {
                    fieldPermissions(profileId: $profileId, objectName: $objectName) {
                        id objectName fieldName isVisible isEditable
                    }
                }
            `, { profileId, objectName });
            setFieldPerms(data.fieldPermissions || []);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setFlsLoading(false);
        }
    };

    const owdColumns: ColumnsType<{ object: string }> = [
        {
            title: "Object", dataIndex: "object", key: "object", width: 180,
            render: (v) => <Text strong style={{ textTransform: 'capitalize' }}>{v}</Text>
        },
        {
            title: "Internal Access", key: "internal",
            render: (_, record) => {
                const owd = owds.find(o => o.objectName === record.object);
                return (
                    <Select
                        value={owd?.internalAccess || "private"}
                        options={ACCESS_OPTIONS}
                        style={{ width: 200 }}
                        onChange={v => handleOwdChange(record.object, 'internalAccess', v)}
                    />
                );
            }
        },
        {
            title: "External Access", key: "external",
            render: (_, record) => {
                const owd = owds.find(o => o.objectName === record.object);
                return (
                    <Select
                        value={owd?.externalAccess || "private"}
                        options={ACCESS_OPTIONS}
                        style={{ width: 200 }}
                        onChange={v => handleOwdChange(record.object, 'externalAccess', v)}
                    />
                );
            }
        },
    ];

    const rulesColumns: ColumnsType<SharingRule> = [
        { title: "Name", dataIndex: "name", key: "name", render: (v) => <Text strong>{v}</Text> },
        { title: "Object", dataIndex: "objectName", key: "objectName", render: (v) => <Tag>{v}</Tag> },
        { title: "Type", dataIndex: "ruleType", key: "ruleType", render: (v) => <Tag color="blue">{v}</Tag> },
        {
            title: "Access", dataIndex: "accessLevel", key: "accessLevel",
            render: (v) => <Tag color={v === 'read_write' ? 'green' : 'default'}>{v}</Tag>
        },
        {
            title: "Active", dataIndex: "isActive", key: "isActive",
            render: (v) => v ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>
        },
        {
            title: "Actions", key: "actions", width: 80,
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />}
                    onClick={() => Modal.confirm({ title: `Delete "${record.name}"?`, onOk: () => handleDeleteRule(record.id) })}
                />
            ),
        },
    ];

    const flsColumns: ColumnsType<FieldPerm> = [
        { title: "Field", dataIndex: "fieldName", key: "fieldName", render: (v) => <Text code>{v}</Text> },
        {
            title: "Visible", dataIndex: "isVisible", key: "isVisible", width: 100, align: "center",
            render: (v) => v ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>
        },
        {
            title: "Editable", dataIndex: "isEditable", key: "isEditable", width: 100, align: "center",
            render: (v) => v ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>
        },
    ];

    const ruleFormSteps = [
        {
            title: "Rule Setup",
            icon: <ShareAltOutlined />,
            fields: ["name", "objectName", "ruleType", "accessLevel"],
            content: (
                <>
                    <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Share Leads with Marketing" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="objectName" label="Object" rules={[{ required: true }]}>
                                <Select options={SYSTEM_OBJECTS.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="ruleType" label="Rule Type" rules={[{ required: true }]}>
                                <Select options={[
                                    { value: "owner_based", label: "Owner-Based" },
                                    { value: "criteria_based", label: "Criteria-Based" },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="accessLevel" label="Access Level" initialValue="read">
                        <Select options={[
                            { value: "read", label: "Read Only" },
                            { value: "read_write", label: "Read/Write" },
                        ]} />
                    </Form.Item>
                </>
            ),
        },
    ];

    const tabItems = [
        {
            key: "owd",
            label: <Space><LockOutlined /> Org-Wide Defaults</Space>,
            children: (
                <Spin spinning={owdLoading}>
                    <Table columns={owdColumns} dataSource={SYSTEM_OBJECTS.map(obj => ({ key: obj, object: obj }))} pagination={false} size="small" bordered />
                </Spin>
            ),
        },
        {
            key: "sharing",
            label: <Space><ShareAltOutlined /> Sharing Rules</Space>,
            children: (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { ruleForm.resetFields(); setRuleModalOpen(true); }}>
                            Create Sharing Rule
                        </Button>
                    </div>
                    <Table columns={rulesColumns} dataSource={rules.map(r => ({ ...r, key: r.id }))} loading={rulesLoading}
                        pagination={false} size="middle" locale={{ emptyText: "No sharing rules yet" }} />
                </>
            ),
        },
        {
            key: "fls",
            label: <Space><EyeOutlined /> Field-Level Security</Space>,
            children: (
                <>
                    <Space style={{ marginBottom: 16 }}>
                        <Select placeholder="Select Profile" style={{ width: 200 }}
                            options={profiles.map(p => ({ value: p.id, label: p.name }))}
                            onChange={v => { setFlsProfile(v); if (flsObject) loadFLS(v, flsObject); }}
                        />
                        <Select placeholder="Select Object" style={{ width: 200 }}
                            options={SYSTEM_OBJECTS.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                            onChange={v => { setFlsObject(v); if (flsProfile) loadFLS(flsProfile, v); }}
                        />
                    </Space>
                    <Spin spinning={flsLoading}>
                        <Table columns={flsColumns} dataSource={fieldPerms.map(f => ({ ...f, key: f.id }))} pagination={false}
                            size="small" bordered locale={{ emptyText: "Select a profile and object to view field-level security" }} />
                    </Spin>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Sharing & Security</AuroraText>}
            subTitle={<DecryptedText text="Configure organization-wide defaults, sharing rules, and field-level security" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={() => { loadOwds(); loadRules(); }} />]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'OWD Settings', value: owds.length, icon: <LockOutlined />, color: '#3b82f6' },
                    { title: 'Sharing Rules', value: rules.length, icon: <ShareAltOutlined />, color: '#10b981' },
                    { title: 'Active Rules', value: rules.filter(r => r.isActive).length, icon: <ShareAltOutlined />, color: '#8b5cf6' },
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
            <Card><Tabs items={tabItems} /></Card>

            <SteppedFormModal
                open={ruleModalOpen}
                onCancel={() => { setRuleModalOpen(false); ruleForm.resetFields(); }}
                onSubmit={handleCreateRule}
                form={ruleForm}
                title="Create Sharing Rule"
                entityName="sharing-rule"
                steps={ruleFormSteps}
                fields={RULE_FIELDS}
                width={580}
                onBatchCreate={handleBatchCreateRules}
                gradient={["#ec4899", "var(--theme-accent, #a855f7)"]}
            />
        </CMSLayout>
    );
}
