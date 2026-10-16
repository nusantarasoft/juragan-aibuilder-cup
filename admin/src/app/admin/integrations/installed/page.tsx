'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Switch, Progress } from 'antd';
import { ApiOutlined, CheckCircleOutlined, SyncOutlined, WarningOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const INSTALLED = [
    { name: 'Midtrans', category: 'Payment', status: 'connected', lastSync: '2 min ago', requests: 12400, errors: 3, uptime: 99.97, enabled: true, color: '#3b82f6' },
    { name: 'Xendit', category: 'Payment', status: 'connected', lastSync: '5 min ago', requests: 8200, errors: 1, uptime: 99.99, enabled: true, color: '#8b5cf6' },
    { name: 'Google Gemini', category: 'AI', status: 'connected', lastSync: '1 min ago', requests: 34500, errors: 12, uptime: 99.92, enabled: true, color: '#ef4444' },
    { name: 'Dremio', category: 'Data', status: 'connected', lastSync: '30 sec ago', requests: 56000, errors: 5, uptime: 99.95, enabled: true, color: '#0ea5e9' },
    { name: 'Label Studio', category: 'AI', status: 'warning', lastSync: '1 hour ago', requests: 2100, errors: 45, uptime: 98.5, enabled: true, color: '#f59e0b' },
];

export default function InstalledIntegrationsPage() {
    const { themeColor } = usePreferencesStore();
    const totalRequests = INSTALLED.reduce((s, i) => s + i.requests, 0);
    const totalErrors = INSTALLED.reduce((s, i) => s + i.errors, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#10b981', '#8b5cf6']}>Installed Integrations</AuroraText>} subTitle={<DecryptedText text="Monitor active connections, sync status & error rates" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Installed', v: INSTALLED.length, c: '#3b82f6', i: <ApiOutlined /> }, { t: 'Connected', v: INSTALLED.filter(i => i.status === 'connected').length, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Total Requests', v: totalRequests.toLocaleString(), c: '#8b5cf6', i: <SyncOutlined /> }, { t: 'Errors', v: totalErrors, c: totalErrors > 50 ? '#ef4444' : '#f59e0b', i: <WarningOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><ApiOutlined style={{ color: '#3b82f6' }} /><Text strong>Active Connections</Text><Badge count={INSTALLED.length} style={{ backgroundColor: '#3b82f6' }} /></Space>}>
                    <Table dataSource={INSTALLED} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Integration', dataIndex: 'name', render: (v: string, r: any) => <Space><div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} /><Text strong style={{ fontSize: 12 }}>{v}</Text></Space> },
                        { title: 'Category', dataIndex: 'category', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'connected' ? 'green' : 'orange'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                        { title: 'Last Sync', dataIndex: 'lastSync', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Requests', dataIndex: 'requests', render: (v: number) => <Text style={{ fontSize: 11 }}>{v.toLocaleString()}</Text> },
                        { title: 'Errors', dataIndex: 'errors', render: (v: number) => <Text style={{ fontSize: 11, color: v > 10 ? '#ef4444' : '#10b981' }}>{v}</Text> },
                        { title: 'Uptime', dataIndex: 'uptime', width: 120, render: (v: number) => <Progress percent={v} size="small" strokeColor={v > 99.5 ? '#10b981' : '#f59e0b'} format={p => `${p}%`} /> },
                        { title: 'Enabled', dataIndex: 'enabled', width: 60, render: (v: boolean) => <Switch size="small" checked={v} /> },
                        { title: '', width: 40, render: () => <Button type="text" size="small" icon={<SettingOutlined style={{ fontSize: 12 }} />} /> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
