'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { CloudOutlined, UserOutlined, AppstoreOutlined, ShareAltOutlined, ReloadOutlined, LinkOutlined, HddOutlined, FolderOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const USERS = [
    { name: 'admin', displayName: 'Administrator', quota: '10 GB', used: 4.2, total: 10, lastLogin: '1h ago', status: 'online' },
    { name: 'hr.manager', displayName: 'HR Manager', quota: '5 GB', used: 1.8, total: 5, lastLogin: '3h ago', status: 'away' },
    { name: 'finance', displayName: 'Finance Team', quota: '5 GB', used: 3.1, total: 5, lastLogin: '30m ago', status: 'online' },
    { name: 'dev', displayName: 'Developer', quota: '5 GB', used: 0.7, total: 5, lastLogin: '2d ago', status: 'offline' },
];
const APPS = [
    { name: 'Calendar', enabled: true, version: '4.7.0' },
    { name: 'Contacts', enabled: true, version: '5.5.3' },
    { name: 'Talk', enabled: true, version: '18.0.2' },
    { name: 'Deck', enabled: true, version: '1.12.0' },
    { name: 'Mail', enabled: false, version: '3.5.1' },
    { name: 'Forms', enabled: true, version: '4.0.0' },
];

export default function NextcloudPage() {
    const { themeColor } = usePreferencesStore();
    const totalUsed = USERS.reduce((s, u) => s + u.used, 0);
    const totalQuota = USERS.reduce((s, u) => s + u.total, 0);
    const activeApps = APPS.filter(a => a.enabled).length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#0082c9', '#10b981']}>Nextcloud</AuroraText>} subTitle={<DecryptedText text="File sharing, storage quotas & app management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8090', '_blank')}>Open Nextcloud</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Users', v: USERS.length, c: '#3b82f6', i: <UserOutlined /> }, { t: 'Storage Used', v: `${totalUsed.toFixed(1)} GB`, c: '#8b5cf6', i: <HddOutlined /> }, { t: 'Total Quota', v: `${totalQuota} GB`, c: '#10b981', i: <CloudOutlined /> }, { t: 'Active Apps', v: `${activeApps}/${APPS.length}`, c: '#f59e0b', i: <AppstoreOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><UserOutlined style={{ color: '#3b82f6' }} /><Text strong>Users & Storage</Text></Space>}>
                    <Table dataSource={USERS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'User', dataIndex: 'displayName', render: (v: string, r: any) => <Space><Text strong style={{ fontSize: 12 }}>{v}</Text><Tag color={r.status === 'online' ? 'green' : r.status === 'away' ? 'orange' : 'default'} style={{ fontSize: 9, borderRadius: 10 }}>{r.status}</Tag></Space> },
                        { title: 'Storage', key: 'storage', width: 200, render: (_: any, r: any) => <div><Progress percent={Math.round((r.used / r.total) * 100)} size="small" strokeColor={r.used / r.total > 0.8 ? '#ef4444' : '#10b981'} /><Text type="secondary" style={{ fontSize: 10 }}>{r.used} GB / {r.total} GB</Text></div> },
                        { title: 'Last Login', dataIndex: 'lastLogin', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                    ]} />
                </Card>

                <Card size="small" style={glass} title={<Space><AppstoreOutlined style={{ color: '#f59e0b' }} /><Text strong>Installed Apps</Text></Space>}>
                    <Row gutter={[10, 10]}>
                        {APPS.map((a, i) => (
                            <Col key={a.name} xs={12} sm={8} md={4}>
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                                    <Card size="small" hoverable style={{ textAlign: 'center', borderRadius: 10, borderTop: `3px solid ${a.enabled ? '#10b981' : '#d1d5db'}` }}>
                                        <Text strong style={{ fontSize: 12 }}>{a.name}</Text><br />
                                        <Tag color={a.enabled ? 'green' : 'default'} style={{ fontSize: 9, borderRadius: 8, margin: '4px 0' }}>{a.enabled ? 'Active' : 'Disabled'}</Tag><br />
                                        <Text type="secondary" style={{ fontSize: 9 }}>v{a.version}</Text>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
