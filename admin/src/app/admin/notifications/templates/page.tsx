"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Tooltip,
    message, Typography, Row, Col, Statistic,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    FileTextOutlined, CodeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const CHANNEL_COLORS: Record<string, string> = { email: 'blue', whatsapp: 'green', webhook: 'orange', in_app: 'purple' };

const TEMPLATE_FIELDS: FieldDef[] = [
    { name: "name", label: "Template Name", required: true },
    { name: "channelType", label: "Channel Type", required: true },
    { name: "body", label: "Body", required: true },
];

export default function TemplatesPage() {
    const { themeColor } = usePreferencesStore();
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!) { notificationTemplates(tenantId: $t) {
                id name channelType subject body variables isActive createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            setTemplates(data.notificationTemplates || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(`mutation($id: String!, $name: String, $subject: String, $body: String) {
                    updateNotificationTemplate(id: $id, name: $name, subject: $subject, body: $body) { id }
                }`, { id: editing.id, ...values });
                message.success("Updated");
            } else {
                await gql(`mutation($t: String!, $name: String!, $type: String!, $body: String!, $subject: String) {
                    createNotificationTemplate(tenantId: $t, name: $name, channelType: $type, body: $body, subject: $subject) { id }
                }`, { t: DEFAULT_TENANT_ID, ...values, type: values.channelType });
                message.success("Created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); load();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($t: String!, $name: String!, $type: String!, $body: String!) {
                    createNotificationTemplate(tenantId: $t, name: $name, channelType: $type, body: $body) { id }
                }`, { t: DEFAULT_TENANT_ID, name: r.name, type: r.channelType || 'email', body: r.body || '' });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        load(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteNotificationTemplate(id: $id) }`, { id });
            message.success("Deleted"); load();
        } catch (err: any) { message.error(err.message); }
    };

    const columns: ColumnsType<any> = [
        {
            title: "Template", key: "name",
            render: (_, r) => (<div><Text strong>{r.name}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.subject || '(no subject)'}</Text></div>),
        },
        { title: "Channel", dataIndex: "channelType", width: 100, render: (v: string) => <Tag color={CHANNEL_COLORS[v]}>{v}</Tag> },
        {
            title: "Variables", key: "vars", width: 200,
            render: (_, r) => (r.variables || []).map((v: string) => <Tag key={v} color="geekblue" style={{ fontSize: 10 }}>{`{{${v}}}`}</Tag>),
        },
        { title: "Active", key: "active", width: 70, render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Tag> },
        {
            title: "Actions", key: "actions", width: 120,
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setIsModalOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} />
                </Space>
            ),
        },
    ];

    const formSteps = [{
        title: "Template Info", icon: <FileTextOutlined />, fields: ["name", "channelType", "subject", "body"],
        content: (
            <>
                <Form.Item name="name" label="Template Name" rules={[{ required: true }]}><Input placeholder="e.g., Ticket Assigned" /></Form.Item>
                {!editing && (
                    <Form.Item name="channelType" label="Channel" rules={[{ required: true }]}>
                        <Select options={['email','whatsapp','webhook','in_app'].map(t => ({ label: t.replace('_', '-'), value: t }))} />
                    </Form.Item>
                )}
                <Form.Item name="subject" label="Subject (email only)"><Input placeholder="e.g., You have been assigned to {{ticket_id}}" /></Form.Item>
                <Form.Item name="body" label="Body" rules={[{ required: true }]} extra="Use {{variable_name}} for dynamic content">
                    <Input.TextArea rows={5} placeholder="Hello {{user_name}}, a new task has been assigned to you." />
                </Form.Item>
            </>
        ),
    }];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Templates</AuroraText>}
            subTitle={<DecryptedText text="Message templates with dynamic variable placeholders" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>Create Template</Button>,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'notification_templates', title: 'Notification Templates', columns: [{ header: 'Name', key: 'name' }, { header: 'Channel', key: 'channelType' }, { header: 'Subject', key: 'subject' }, { header: 'Active', key: 'isActive' }], data: templates })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'notification_templates', title: 'Notification Templates', columns: [{ header: 'Name', key: 'name' }, { header: 'Channel', key: 'channelType' }, { header: 'Subject', key: 'subject' }], data: templates })} /></Tooltip></RbacGuard>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total', value: templates.length, icon: <FileTextOutlined />, color: '#8b5cf6' },
                    { title: 'Active', value: templates.filter(t => t.isActive).length, icon: <CodeOutlined />, color: '#22c55e' },
                    { title: 'Email', value: templates.filter(t => t.channelType === 'email').length, icon: <FileTextOutlined />, color: '#3b82f6' },
                    { title: 'WhatsApp', value: templates.filter(t => t.channelType === 'whatsapp').length, icon: <FileTextOutlined />, color: '#25d366' },
                    { title: 'Webhook', value: templates.filter(t => t.channelType === 'webhook').length, icon: <FileTextOutlined />, color: '#f59e0b' },
                    { title: 'Variables', value: [...new Set(templates.flatMap(t => t.variables || []))].length, icon: <CodeOutlined />, color: '#ec4899' },
                ].map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}><Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 20 }} /></Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <Card><Table columns={columns} dataSource={templates.map(t => ({ ...t, key: t.id }))} loading={loading} pagination={false} size="middle" scroll={{ x: 700 }} /></Card>
            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave} form={form} title={editing ? "Edit Template" : "Create Template"}
                entityName="template" steps={formSteps} fields={TEMPLATE_FIELDS} width={560}
                onBatchCreate={handleBatchCreate} gradient={["#8b5cf6", themeColor]} editMode={!!editing} />
        </CMSLayout>
    );
}
