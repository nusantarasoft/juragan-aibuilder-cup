'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { MailOutlined, UserOutlined, CheckCircleOutlined, WarningOutlined, ReloadOutlined, SafetyCertificateOutlined, CloudServerOutlined, InboxOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const DOMAINS = [{ name: 'nusantarasoft.local', users: 8, status: 'active', dkim: 'pass', spf: 'pass', dmarc: 'pass' }];
const ACCOUNTS = [
    { email: 'admin@nusantarasoft.local', quota: '2 GB', used: 0.8, total: 2, status: 'active', lastLogin: '1h ago' },
    { email: 'info@nusantarasoft.local', quota: '1 GB', used: 0.3, total: 1, status: 'active', lastLogin: '3h ago' },
    { email: 'noreply@nusantarasoft.local', quota: '500 MB', used: 0.1, total: 0.5, status: 'active', lastLogin: 'never' },
    { email: 'hr@nusantarasoft.local', quota: '1 GB', used: 0.5, total: 1, status: 'active', lastLogin: '2h ago' },
    { email: 'support@nusantarasoft.local', quota: '1 GB', used: 0.2, total: 1, status: 'active', lastLogin: '5h ago' },
];
const QUEUE = [
    { id: 1, from: 'noreply@nusantarasoft.local', to: 'client@example.com', subject: 'Invoice #INV-2024-045', status: 'queued', size: '45 KB' },
    { id: 2, from: 'hr@nusantarasoft.local', to: 'team@nusantarasoft.local', subject: 'Leave Approval', status: 'sent', size: '12 KB' },
];

export default function EmailDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const totalUsed = ACCOUNTS.reduce((s, a) => s + a.used, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#06b6d4', '#10b981']}>Email Server</AuroraText>} subTitle={<DecryptedText text="Domain management, accounts, mail queue & security" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Domains', v: DOMAINS.length, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Accounts', v: ACCOUNTS.length, c: '#10b981', i: <UserOutlined /> }, { t: 'Mail Queue', v: QUEUE.filter(q => q.status === 'queued').length, c: '#f59e0b', i: <InboxOutlined /> }, { t: 'Storage', v: `${totalUsed.toFixed(1)} GB`, c: '#8b5cf6', i: <MailOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><SafetyCertificateOutlined style={{ color: '#10b981' }} /><Text strong>Domain Security</Text></Space>}>
                            {DOMAINS.map(d => (
                                <div key={d.name}>
                                    <Text strong style={{ fontSize: 14 }}>{d.name}</Text>
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {[{ k: 'DKIM', v: d.dkim }, { k: 'SPF', v: d.spf }, { k: 'DMARC', v: d.dmarc }].map(item => (
                                            <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.02)' }}>
                                                <Text style={{ fontSize: 12 }}>{item.k}</Text>
                                                <Tag color={item.v === 'pass' ? 'green' : 'red'} style={{ borderRadius: 8, fontSize: 10, margin: 0 }}>{item.v === 'pass' ? '✓ Pass' : '✗ Fail'}</Tag>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><UserOutlined style={{ color: '#3b82f6' }} /><Text strong>Accounts</Text><Badge count={ACCOUNTS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                            <Table dataSource={ACCOUNTS} rowKey="email" size="small" pagination={false} columns={[
                                { title: 'Email', dataIndex: 'email', render: (v: string) => <Text strong style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Storage', key: 'storage', width: 160, render: (_: any, r: any) => <div><Progress percent={Math.round((r.used / r.total) * 100)} size="small" strokeColor={r.used / r.total > 0.8 ? '#ef4444' : '#10b981'} /><Text type="secondary" style={{ fontSize: 9 }}>{r.used} / {r.total} GB</Text></div> },
                                { title: 'Status', dataIndex: 'status', width: 70, render: (v: string) => <Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Last Login', dataIndex: 'lastLogin', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><InboxOutlined style={{ color: '#f59e0b' }} /><Text strong>Mail Queue</Text></Space>}>
                    <Table dataSource={QUEUE} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'From', dataIndex: 'from', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'To', dataIndex: 'to', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Subject', dataIndex: 'subject', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={v === 'sent' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Size', dataIndex: 'size', width: 60 },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
