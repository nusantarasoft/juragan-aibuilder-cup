'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { ApiOutlined, SendOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const EVENTS = [
    { id: 'EVT-001', direction: 'inbound', source: 'Midtrans', event: 'payment.success', status: 'delivered', time: '2 min ago', latency: '120ms', payload: '1.2 KB', retries: 0 },
    { id: 'EVT-002', direction: 'outbound', source: 'Label Studio', event: 'annotation.created', status: 'delivered', time: '5 min ago', latency: '85ms', payload: '3.4 KB', retries: 0 },
    { id: 'EVT-003', direction: 'inbound', source: 'Xendit', event: 'invoice.paid', status: 'delivered', time: '12 min ago', latency: '200ms', payload: '2.1 KB', retries: 0 },
    { id: 'EVT-004', direction: 'outbound', source: 'Google Gemini', event: 'embedding.complete', status: 'delivered', time: '18 min ago', latency: '340ms', payload: '8.5 KB', retries: 0 },
    { id: 'EVT-005', direction: 'inbound', source: 'Midtrans', event: 'payment.failed', status: 'failed', time: '25 min ago', latency: '—', payload: '0.8 KB', retries: 3 },
    { id: 'EVT-006', direction: 'outbound', source: 'Dremio', event: 'job.completed', status: 'delivered', time: '30 min ago', latency: '95ms', payload: '1.5 KB', retries: 0 },
    { id: 'EVT-007', direction: 'inbound', source: 'Label Studio', event: 'project.updated', status: 'delivered', time: '45 min ago', latency: '110ms', payload: '2.8 KB', retries: 0 },
    { id: 'EVT-008', direction: 'outbound', source: 'Midtrans', event: 'refund.processed', status: 'pending', time: '1 hour ago', latency: '—', payload: '1.1 KB', retries: 1 },
];

export default function WebhooksLogPage() {
    const { themeColor } = usePreferencesStore();
    const delivered = EVENTS.filter(e => e.status === 'delivered').length;
    const failed = EVENTS.filter(e => e.status === 'failed').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f59e0b', '#ef4444']}>Webhook Event Log</AuroraText>} subTitle={<DecryptedText text="Inbound & outbound webhook events — delivery status & payload viewer" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Events', v: EVENTS.length, c: '#3b82f6', i: <ApiOutlined /> }, { t: 'Delivered', v: delivered, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Failed', v: failed, c: '#ef4444', i: <CloseCircleOutlined /> }, { t: 'Inbound', v: EVENTS.filter(e => e.direction === 'inbound').length, c: '#8b5cf6', i: <InboxOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><ApiOutlined style={{ color: '#3b82f6' }} /><Text strong>Event Log</Text><Badge count={EVENTS.length} style={{ backgroundColor: '#3b82f6' }} /></Space>}>
                    <Table dataSource={EVENTS} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'ID', dataIndex: 'id', width: 80, render: (v: string) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: '', dataIndex: 'direction', width: 30, render: (v: string) => v === 'inbound' ? <InboxOutlined style={{ color: '#3b82f6', fontSize: 12 }} /> : <SendOutlined style={{ color: '#10b981', fontSize: 12 }} /> },
                        { title: 'Source', dataIndex: 'source', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Event', dataIndex: 'event', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'delivered' ? 'green' : v === 'failed' ? 'red' : 'orange'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                        { title: 'Latency', dataIndex: 'latency', width: 70, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Size', dataIndex: 'payload', width: 60, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Time', dataIndex: 'time', width: 90, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Retries', dataIndex: 'retries', width: 50, render: (v: number) => v > 0 ? <Badge count={v} style={{ backgroundColor: '#f59e0b' }} /> : <Text type="secondary" style={{ fontSize: 10 }}>—</Text> },
                        { title: '', width: 30, render: () => <Button type="text" size="small" icon={<EyeOutlined style={{ fontSize: 11 }} />} /> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
