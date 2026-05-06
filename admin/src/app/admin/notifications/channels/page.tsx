"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Switch, Tooltip,
    message, Typography, Row, Col, Statistic,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    MailOutlined, MessageOutlined, ApiOutlined, BellOutlined, SendOutlined,
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

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    email: <MailOutlined style={{ color: '#3b82f6' }} />,
    whatsapp: <MessageOutlined style={{ color: '#25d366' }} />,
    webhook: <ApiOutlined style={{ color: '#f59e0b' }} />,
    in_app: <BellOutlined style={{ color: '#8b5cf6' }} />,
};
const CHANNEL_COLORS: Record<string, string> = { email: 'blue', whatsapp: 'green', webhook: 'orange', in_app: 'purple' };

const CHANNEL_FIELDS: FieldDef[] = [
    { name: "name", label: "Channel Name", required: true },
    { name: "channelType", label: "Channel Type", required: true },
];

export default function ChannelsPage() {
    const { themeColor } = usePreferencesStore();
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!) { notificationChannels(tenantId: $t) {
                id name channelType config isActive createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            setChannels(data.notificationChannels || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(`mutation($id: String!, $name: String, $isActive: Boolean) {
                    updateNotificationChannel(id: $id, name: $name, isActive: $isActive) { id }
                }`, { id: editing.id, name: values.name, isActive: values.isActive });
                message.success("Updated");
            } else {
                await gql(`mutation($t: String!, $name: String!, $type: String!) {
                    createNotificationChannel(tenantId: $t, name: $name, channelType: $type) { id }
                }`, { t: DEFAULT_TENANT_ID, name: values.name, type: values.channelType });
                message.success("Created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); load();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($t: String!, $name: String!, $type: String!) {
                    createNotificationChannel(tenantId: $t, name: $name, channelType: $type) { id }
                }`, { t: DEFAULT_TENANT_ID, name: r.name, type: r.channelType || 'email' });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        load(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteNotificationChannel(id: $id) }`, { id });
            message.success("Deleted"); load();
        } catch (err: any) { message.error(err.message); }
    };

    const columns: ColumnsType<any> = [
        {
            title: "Channel", key: "name",
            render: (_, r) => (
                <Space>{CHANNEL_ICONS[r.channelType] || <SendOutlined />}<div><Text strong>{r.name}</Text><br /><Tag color={CHANNEL_COLORS[r.channelType]}>{r.channelType}</Tag></div></Space>
            ),
        },
        { title: "Active", key: "active", width: 80, align: 'center', render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Tag> },
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
        title: "Channel Info", icon: <SendOutlined />, fields: ["name", "channelType"],
        content: (
            <>
                <Form.Item name="name" label="Channel Name" rules={[{ required: true }]}><Input placeholder="e.g., Primary Email" /></Form.Item>
                {!editing && (
                    <Form.Item name="channelType" label="Type" rules={[{ required: true }]}>
                        <Select options={['email','whatsapp','webhook','in_app'].map(t => ({ label: t.replace('_', '-'), value: t }))} />
                    </Form.Item>
                )}
            </>
        ),
    }];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Channels</AuroraText>}
            subTitle={<DecryptedText text="Configure notification delivery channels — email, WhatsApp, webhook, in-app" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>Add Channel</Button>,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'notification_channels', title: 'Notification Channels', columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'channelType' }, { header: 'Active', key: 'isActive' }], data: channels })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'notification_channels', title: 'Notification Channels', columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'channelType' }, { header: 'Active', key: 'isActive' }], data: channels })} /></Tooltip></RbacGuard>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total', value: channels.length, icon: <SendOutlined />, color: '#8b5cf6' },
                    { title: 'Active', value: channels.filter(c => c.isActive).length, icon: <BellOutlined />, color: '#22c55e' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <Card><Table columns={columns} dataSource={channels.map(c => ({ ...c, key: c.id }))} loading={loading} pagination={false} size="middle" /></Card>
            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave} form={form} title={editing ? "Edit Channel" : "Add Channel"}
                entityName="channel" steps={formSteps} fields={CHANNEL_FIELDS} width={480}
                onBatchCreate={handleBatchCreate} gradient={["#8b5cf6", themeColor]} editMode={!!editing} />
        </CMSLayout>
    );
}
