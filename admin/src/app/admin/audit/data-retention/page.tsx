'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Table, Switch, InputNumber, Select, message, Statistic, Modal, Progress } from 'antd';
import { DeleteOutlined, DatabaseOutlined, ClockCircleOutlined, SafetyOutlined, DownloadOutlined, UserOutlined, ReloadOutlined, WarningOutlined, ExportOutlined, LockOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const RETENTION_POLICIES = [
    { id: 'rp-1', module: 'Audit Logs', retentionDays: 365, autoDelete: true, records: 14200, sizeGB: 1.2, color: '#3b82f6' },
    { id: 'rp-2', module: 'User Sessions', retentionDays: 90, autoDelete: true, records: 8500, sizeGB: 0.3, color: '#8b5cf6' },
    { id: 'rp-3', module: 'Email Logs', retentionDays: 180, autoDelete: true, records: 5600, sizeGB: 0.8, color: '#10b981' },
    { id: 'rp-4', module: 'CRM Activities', retentionDays: 730, autoDelete: false, records: 23400, sizeGB: 2.1, color: '#f59e0b' },
    { id: 'rp-5', module: 'Transaction Logs', retentionDays: 2555, autoDelete: false, records: 45000, sizeGB: 4.5, color: '#ef4444' },
    { id: 'rp-6', module: 'File Uploads', retentionDays: 365, autoDelete: true, records: 3200, sizeGB: 15.7, color: '#06b6d4' },
    { id: 'rp-7', module: 'Notification History', retentionDays: 60, autoDelete: true, records: 12000, sizeGB: 0.2, color: '#ec4899' },
];

const GDPR_ACTIONS = [
    { id: 'gdpr-1', type: 'data_export', user: 'john@example.com', requestedAt: '2024-01-15T10:00:00Z', status: 'completed', completedAt: '2024-01-15T10:05:00Z' },
    { id: 'gdpr-2', type: 'anonymize', user: 'jane@example.com', requestedAt: '2024-01-14T08:30:00Z', status: 'completed', completedAt: '2024-01-14T08:32:00Z' },
    { id: 'gdpr-3', type: 'delete', user: 'bob@example.com', requestedAt: '2024-01-13T14:20:00Z', status: 'pending', completedAt: undefined },
    { id: 'gdpr-4', type: 'data_export', user: 'alice@example.com', requestedAt: '2024-01-12T09:15:00Z', status: 'completed', completedAt: '2024-01-12T09:20:00Z' },
];

const GDPR_TYPE_CFG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    data_export: { icon: <DownloadOutlined />, color: '#3b82f6', label: 'Data Export' },
    anonymize: { icon: <EyeInvisibleOutlined />, color: '#f59e0b', label: 'Anonymize' },
    delete: { icon: <DeleteOutlined />, color: '#ef4444', label: 'Delete' },
};

export default function DataRetentionPage() {
    const { themeColor } = usePreferencesStore();
    const [policies, setPolicies] = useState(RETENTION_POLICIES);
    const totalRecords = policies.reduce((s, p) => s + p.records, 0);
    const totalSize = policies.reduce((s, p) => s + p.sizeGB, 0);
    const maxSize = Math.max(...policies.map(p => p.sizeGB));

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ef4444', '#06b6d4']}>Data Retention</AuroraText>} subTitle={<DecryptedText text="Retention policies, GDPR compliance tools & data lifecycle" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Policies', v: policies.length, c: '#3b82f6', i: <SafetyOutlined /> }, { t: 'Total Records', v: `${(totalRecords / 1000).toFixed(1)}K`, c: '#8b5cf6', i: <DatabaseOutlined /> }, { t: 'Storage Used', v: `${totalSize.toFixed(1)} GB`, c: '#10b981', i: <DatabaseOutlined /> }, { t: 'GDPR Requests', v: GDPR_ACTIONS.length, c: '#f59e0b', i: <LockOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><ClockCircleOutlined style={{ color: themeColor }} /><Text strong>Retention Policies</Text></Space>}>
                            <Table dataSource={policies} rowKey="id" size="small" pagination={false} columns={[
                                { title: 'Module', dataIndex: 'module', render: (v: string, r: any) => <Space size={6}><div style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} /><Text strong style={{ fontSize: 12 }}>{v}</Text></Space> },
                                { title: 'Retention', dataIndex: 'retentionDays', width: 100, render: (v: number) => <Tag style={{ borderRadius: 10, fontSize: 11 }}>{v >= 365 ? `${Math.round(v / 365)}y` : `${v}d`}</Tag> },
                                { title: 'Auto-Delete', dataIndex: 'autoDelete', width: 90, render: (v: boolean, r: any) => <Switch checked={v} size="small" onChange={checked => setPolicies(prev => prev.map(p => p.id === r.id ? { ...p, autoDelete: checked } : p))} /> },
                                { title: 'Records', dataIndex: 'records', width: 80, align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 12 }}>{v.toLocaleString()}</Text> },
                                { title: 'Size', dataIndex: 'sizeGB', width: 80, align: 'right' as const, render: (v: number) => <Text strong style={{ fontSize: 12, color: v > 5 ? '#ef4444' : '#10b981' }}>{v} GB</Text> },
                            ]} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><DatabaseOutlined style={{ color: '#8b5cf6' }} /><Text strong>Storage Breakdown</Text></Space>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {policies.sort((a, b) => b.sizeGB - a.sizeGB).map((p, i) => (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Space size={6}><div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} /><Text style={{ fontSize: 11 }}>{p.module}</Text></Space>
                                            <Text style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.sizeGB} GB</Text>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${(p.sizeGB / maxSize) * 100}%` }} transition={{ delay: 0.4 + i * 0.06 }} style={{ height: '100%', borderRadius: 3, background: p.color }} /></div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card style={glass} title={<Space><LockOutlined style={{ color: '#ef4444' }} /><Text strong>GDPR / Privacy Requests</Text></Space>} extra={<Button size="small" type="primary" style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)`, border: 'none', borderRadius: 8 }}>New Request</Button>}>
                    <Table dataSource={GDPR_ACTIONS} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Type', dataIndex: 'type', render: (v: string) => { const c = GDPR_TYPE_CFG[v]; return <Space size={4}>{c?.icon}<Tag color={c?.color} style={{ borderRadius: 10, fontSize: 10 }}>{c?.label}</Tag></Space>; } },
                        { title: 'User', dataIndex: 'user', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Requested', dataIndex: 'requestedAt', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{new Date(v).toLocaleDateString()}</Text> },
                        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
