"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Switch,
    message, Typography, Row, Col, Statistic,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    NodeIndexOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const MODULE_OPTIONS = ['crm','hr','ops','itsm','inventory','ecommerce','accounting','pm'].map(m => ({ label: m.toUpperCase(), value: m }));
const EVENT_OPTIONS = ['create','update','delete','assign','complete','overdue','status_change'].map(e => ({ label: e.replace('_', ' '), value: e }));
const RECIPIENT_OPTIONS = ['assignee','creator','role','email','webhook'].map(r => ({ label: r, value: r }));

const RULE_FIELDS: FieldDef[] = [
    { name: "name", label: "Rule Name", required: true },
    { name: "module", label: "Module", required: true },
    { name: "event", label: "Event", required: true },
];

export default function RulesPage() {
    const { themeColor } = usePreferencesStore();
    const [rules, setRules] = useState<any[]>([]);
    const [channels, setChannels] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [rulesData, chData, tplData] = await Promise.all([
                gql(`query($t: String!) { notificationRules(tenantId: $t) {
                    id name module event channelId templateId recipientType recipientValue isActive channelName templateName createdAt
                } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { notificationChannels(tenantId: $t) { id name channelType } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { notificationTemplates(tenantId: $t) { id name channelType } }`, { t: DEFAULT_TENANT_ID }),
            ]);
            setRules(rulesData.notificationRules || []);
            setChannels(chData.notificationChannels || []);
            setTemplates(tplData.notificationTemplates || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(`mutation($id: String!, $name: String, $module: String, $event: String, $isActive: Boolean) {
                    updateNotificationRule(id: $id, name: $name, module: $module, event: $event, isActive: $isActive) { id }
                }`, { id: editing.id, ...values });
                message.success("Updated");
            } else {
                await gql(`mutation($t: String!, $name: String!, $module: String!, $event: String!, $channelId: String, $templateId: String, $recipientType: String, $recipientValue: String) {
                    createNotificationRule(tenantId: $t, name: $name, module: $module, event: $event, channelId: $channelId, templateId: $templateId, recipientType: $recipientType, recipientValue: $recipientValue) { id }
                }`, { t: DEFAULT_TENANT_ID, ...values });
                message.success("Created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); load();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($t: String!, $name: String!, $module: String!, $event: String!) {
                    createNotificationRule(tenantId: $t, name: $name, module: $module, event: $event) { id }
                }`, { t: DEFAULT_TENANT_ID, name: r.name, module: r.module, event: r.event });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        load(); return { success, failed, errors };
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        try {
            await gql(`mutation($id: String!, $isActive: Boolean) { updateNotificationRule(id: $id, isActive: $isActive) { id } }`, { id, isActive });
            load();
        } catch (err: any) { message.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteNotificationRule(id: $id) }`, { id });
            message.success("Deleted"); load();
        } catch (err: any) { message.error(err.message); }
    };

    const columns: ColumnsType<any> = [
        {
            title: "Rule", key: "name",
            render: (_, r) => (<div><Text strong>{r.name}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>When {r.module}.{r.event}</Text></div>),
        },
        { title: "Module", dataIndex: "module", width: 100, render: (v: string) => <Tag>{v.toUpperCase()}</Tag> },
        { title: "Event", dataIndex: "event", width: 120, render: (v: string) => <Tag color="geekblue">{v.replace('_', ' ')}</Tag> },
        { title: "Channel", key: "channel", width: 130, render: (_, r) => r.channelName ? <Tag>{r.channelName}</Tag> : '—' },
        { title: "Recipient", dataIndex: "recipientType", width: 100, render: (v: string) => <Tag>{v}</Tag> },
        { title: "Active", key: "active", width: 70, render: (_, r) => <Switch size="small" checked={r.isActive} onChange={(v) => handleToggle(r.id, v)} /> },
        {
            title: "Actions", key: "actions", width: 100,
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setIsModalOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} />
                </Space>
            ),
        },
    ];

    const formSteps = [{
        title: "Rule Info", icon: <NodeIndexOutlined />, fields: ["name", "module", "event", "channelId", "templateId", "recipientType", "recipientValue"],
        content: (
            <>
                <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}><Input placeholder="e.g., Notify assignee on ticket create" /></Form.Item>
                <Row gutter={12}>
                    <Col span={12}><Form.Item name="module" label="Module" rules={[{ required: true }]}><Select options={MODULE_OPTIONS} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="event" label="Event" rules={[{ required: true }]}><Select options={EVENT_OPTIONS} /></Form.Item></Col>
                </Row>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="channelId" label="Channel">
                            <Select allowClear placeholder="Select channel" options={channels.map(c => ({ label: `${c.name} (${c.channelType})`, value: c.id }))} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="templateId" label="Template">
                            <Select allowClear placeholder="Select template" options={templates.map(t => ({ label: `${t.name} (${t.channelType})`, value: t.id }))} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={12}>
                    <Col span={12}><Form.Item name="recipientType" label="Recipient Type" initialValue="assignee"><Select options={RECIPIENT_OPTIONS} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="recipientValue" label="Recipient Value"><Input placeholder="email or role name" /></Form.Item></Col>
                </Row>
            </>
        ),
    }];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Rules</AuroraText>}
            subTitle={<DecryptedText text="Trigger rules — define when notifications fire and who receives them" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>Create Rule</Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Rules', value: rules.length, icon: <NodeIndexOutlined />, color: '#8b5cf6' },
                    { title: 'Active', value: rules.filter(r => r.isActive).length, icon: <ThunderboltOutlined />, color: '#22c55e' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}><Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} /></Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <Card><Table columns={columns} dataSource={rules.map(r => ({ ...r, key: r.id }))} loading={loading} pagination={false} size="middle" /></Card>
            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave} form={form} title={editing ? "Edit Rule" : "Create Rule"}
                entityName="rule" steps={formSteps} fields={RULE_FIELDS} width={600}
                onBatchCreate={handleBatchCreate} gradient={["#f59e0b", themeColor]} editMode={!!editing} />
        </CMSLayout>
    );
}
