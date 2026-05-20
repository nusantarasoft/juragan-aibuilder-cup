'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Modal, Form, Input, Select, message, Row, Col, Statistic, Tooltip, Drawer, Badge } from 'antd';
import { ApiOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ThunderboltOutlined, LinkOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const MOCK_WH = [
    { id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/T00/B00/xxxx', events: ['order.created', 'order.cancelled'], isActive: true, lastTriggered: new Date(Date.now() - 3600000).toISOString(), successCount: 142, failureCount: 3, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'wh-2', name: 'CRM Sync', url: 'https://api.crm.example.com/webhooks', events: ['contact.created', 'deal.won'], isActive: true, lastTriggered: new Date(Date.now() - 7200000).toISOString(), successCount: 89, failureCount: 1, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'wh-3', name: 'Analytics Pipeline', url: 'https://analytics.internal/ingest', events: ['page.viewed', 'user.signup'], isActive: false, successCount: 1200, failureCount: 15, createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'wh-4', name: 'Inventory Alert', url: 'https://warehouse.api/stock-alert', events: ['inventory.low_stock'], isActive: true, lastTriggered: new Date(Date.now() - 1800000).toISOString(), successCount: 56, failureCount: 0, createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
];

const MOCK_LOGS = [
    { id: 'dl-1', webhookId: 'wh-1', webhookName: 'Slack Notifications', event: 'order.created', status: 'success', statusCode: 200, responseTime: 145, payload: '{"event":"order.created"}', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'dl-2', webhookId: 'wh-2', webhookName: 'CRM Sync', event: 'contact.created', status: 'success', statusCode: 201, responseTime: 230, payload: '{"event":"contact.created"}', createdAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'dl-3', webhookId: 'wh-1', webhookName: 'Slack Notifications', event: 'order.cancelled', status: 'failed', statusCode: 500, responseTime: 5000, payload: '{"event":"order.cancelled"}', createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'dl-4', webhookId: 'wh-4', webhookName: 'Inventory Alert', event: 'inventory.low_stock', status: 'success', statusCode: 200, responseTime: 98, payload: '{"event":"inventory.low_stock"}', createdAt: new Date(Date.now() - 1200000).toISOString() },
];

const EVENT_OPTIONS = [
    { label: '📦 order.created', value: 'order.created' }, { label: '❌ order.cancelled', value: 'order.cancelled' },
    { label: '👤 contact.created', value: 'contact.created' }, { label: '🎯 deal.won', value: 'deal.won' },
    { label: '📊 page.viewed', value: 'page.viewed' }, { label: '🆕 user.signup', value: 'user.signup' },
    { label: '⚠️ inventory.low_stock', value: 'inventory.low_stock' },
];

export default function WebhooksPage() {
    const { themeColor } = usePreferencesStore();
    const [webhooks, setWebhooks] = useState<any[]>(MOCK_WH);
    const [logs] = useState<any[]>(MOCK_LOGS);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [logDrawer, setLogDrawer] = useState(false);
    const [selectedWh, setSelectedWh] = useState<any>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [form] = Form.useForm();

    const handleSave = () => {
        form.validateFields().then(values => {
            if (editingId) { setWebhooks(prev => prev.map(w => w.id === editingId ? { ...w, ...values } : w)); message.success('Updated'); }
            else { setWebhooks(prev => [...prev, { id: `wh-${Date.now()}`, ...values, isActive: true, successCount: 0, failureCount: 0, createdAt: new Date().toISOString() }]); message.success('Created'); }
            setModalOpen(false); setEditingId(null); form.resetFields();
        });
    };

    const handleTest = async (wh: any) => {
        setTestingId(wh.id); await new Promise(r => setTimeout(r, 1200));
        setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, lastTriggered: new Date().toISOString(), successCount: w.successCount + 1 } : w));
        message.success(`Test ping sent to ${wh.name} — 200 OK`); setTestingId(null);
    };

    const totalDel = webhooks.reduce((s, w) => s + w.successCount + w.failureCount, 0);
    const totalOk = webhooks.reduce((s, w) => s + w.successCount, 0);
    const totalFail = webhooks.reduce((s, w) => s + w.failureCount, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f59e0b', '#3b82f6']}>Webhooks</AuroraText>} subTitle={<DecryptedText text="Manage webhook endpoints and delivery logs" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="r" icon={<ReloadOutlined />} />, <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }} style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)`, border: 'none', borderRadius: 8 }}>New Webhook</Button>]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ title: 'Endpoints', value: webhooks.length, color: '#3b82f6', icon: <ApiOutlined /> }, { title: 'Active', value: webhooks.filter(w => w.isActive).length, color: '#10b981', icon: <CheckCircleOutlined /> }, { title: 'Deliveries', value: totalDel, color: '#8b5cf6', icon: <SendOutlined /> }, { title: 'Success Rate', value: `${totalDel > 0 ? Math.round((totalOk / totalDel) * 100) : 0}%`, color: '#06b6d4', icon: <ThunderboltOutlined /> }, { title: 'Successful', value: totalOk, color: '#10b981', icon: <CheckCircleOutlined /> }, { title: 'Failed', value: totalFail, color: totalFail > 0 ? '#ef4444' : '#94a3b8', icon: <CloseCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}><Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card style={glass} title={<Space><ApiOutlined style={{ color: themeColor }} /><Text strong>Webhook Endpoints</Text><Badge count={webhooks.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={webhooks} rowKey="id" size="middle" pagination={false} scroll={{ x: 900 }} columns={[
                        { title: 'Name', dataIndex: 'name', render: (v: string, r: any) => <Space><div style={{ width: 8, height: 8, borderRadius: '50%', background: r.isActive ? '#10b981' : '#94a3b8', boxShadow: r.isActive ? '0 0 6px #10b98160' : 'none' }} /><Text strong style={{ fontSize: 13 }}>{v}</Text></Space> },
                        { title: 'URL', dataIndex: 'url', ellipsis: true, width: 240, render: (v: string) => <Text copyable style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Events', dataIndex: 'events', width: 180, render: (v: string[]) => <Space wrap size={2}>{v.slice(0, 2).map(e => <Tag key={e} style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>{e}</Tag>)}{v.length > 2 && <Tag style={{ fontSize: 10 }}>+{v.length - 2}</Tag>}</Space> },
                        { title: 'OK', dataIndex: 'successCount', width: 60, align: 'center' as const, render: (v: number) => <Text style={{ color: '#10b981', fontWeight: 600 }}>{v}</Text> },
                        { title: 'Fail', dataIndex: 'failureCount', width: 60, align: 'center' as const, render: (v: number) => <Text style={{ color: v > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>{v}</Text> },
                        { title: 'Last', dataIndex: 'lastTriggered', width: 110, render: (v: string) => v ? <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text> : '—' },
                        { title: '', key: 'act', width: 180, render: (_: any, r: any) => <Space size={4}><Tooltip title="Test"><Button size="small" icon={<ThunderboltOutlined />} loading={testingId === r.id} onClick={() => handleTest(r)} /></Tooltip><Tooltip title="Logs"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedWh(r); setLogDrawer(true); }} /></Tooltip><Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); form.setFieldsValue(r); setModalOpen(true); }} /></Tooltip><Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => { setWebhooks(prev => prev.filter(w => w.id !== r.id)); message.success('Deleted'); }} /></Tooltip></Space> },
                    ]} />
                </Card>
                <Card style={glass} title={<Space><ClockCircleOutlined style={{ color: '#8b5cf6' }} /><Text strong>Recent Deliveries</Text></Space>}>
                    <Table dataSource={logs} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Webhook', dataIndex: 'webhookName', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Event', dataIndex: 'event', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'success' ? 'green' : v === 'failed' ? 'red' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Code', dataIndex: 'statusCode', width: 60, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v || '—'}</Text> },
                        { title: 'Time', dataIndex: 'responseTime', width: 70, render: (v: number) => <Text style={{ fontSize: 11 }}>{v ? `${v}ms` : '—'}</Text> },
                        { title: 'When', dataIndex: 'createdAt', width: 120, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text> },
                    ]} />
                </Card>
            </motion.div>
            <Modal title={editingId ? 'Edit Webhook' : 'New Webhook'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }} onOk={handleSave} okText={editingId ? 'Update' : 'Create'} width={520}>
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="e.g. Slack Notifications" /></Form.Item>
                    <Form.Item name="url" label="URL" rules={[{ required: true, type: 'url' }]}><Input placeholder="https://example.com/webhook" prefix={<LinkOutlined />} /></Form.Item>
                    <Form.Item name="events" label="Events" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select events" options={EVENT_OPTIONS} /></Form.Item>
                </Form>
            </Modal>
            <Drawer title={`Logs — ${selectedWh?.name || ''}`} open={logDrawer} onClose={() => setLogDrawer(false)} width={500}>
                <Table dataSource={selectedWh ? logs.filter(l => l.webhookId === selectedWh.id) : []} rowKey="id" size="small" pagination={{ pageSize: 20 }} columns={[
                    { title: 'Event', dataIndex: 'event', render: (v: string) => <Tag style={{ fontSize: 10 }}>{v}</Tag> },
                    { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                    { title: 'Code', dataIndex: 'statusCode', width: 50 },
                    { title: 'When', dataIndex: 'createdAt', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(v).fromNow()}</Text> },
                ]} />
            </Drawer>
        </CMSLayout>
    );
}
