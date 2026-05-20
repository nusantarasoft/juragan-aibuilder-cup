'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { CloudOutlined, FolderOutlined, LockOutlined, HddOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const BUCKETS = [
    { name: 'supabase', objects: 2340, size: '2.1 GB', versioning: true, access: 'public', created: '2024-01-15', color: '#3b82f6' },
    { name: 'backups', objects: 45, size: '8.5 GB', versioning: true, access: 'private', created: '2024-01-15', color: '#8b5cf6' },
    { name: 'dremio-lakehouse', objects: 890, size: '4.2 GB', versioning: true, access: 'private', created: '2024-02-01', color: '#10b981' },
    { name: 'media-uploads', objects: 567, size: '1.8 GB', versioning: false, access: 'public', created: '2024-03-10', color: '#f59e0b' },
];
const POLICIES = [
    { name: 'ReadOnly', type: 'canned', users: 3, groups: 1 },
    { name: 'ReadWrite', type: 'canned', users: 2, groups: 1 },
    { name: 'ConsoleAdmin', type: 'built-in', users: 1, groups: 0 },
];
const SERVER_INFO = [
    { key: 'Version', value: 'RELEASE.2024-11-07' },
    { key: 'Uptime', value: '42d 5h 23m' },
    { key: 'Region', value: 'us-east-1' },
    { key: 'Disks', value: '4 (striped)' },
    { key: 'Erasure Coding', value: 'EC:2' },
    { key: 'Total Capacity', value: '500 GB' },
];

export default function MinIOPage() {
    const { themeColor } = usePreferencesStore();
    const totalObjects = BUCKETS.reduce((s, b) => s + b.objects, 0);
    const totalSize = BUCKETS.reduce((s, b) => s + parseFloat(b.size), 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#c72c48', '#10b981']}>MinIO Storage</AuroraText>} subTitle={<DecryptedText text="Object storage — buckets, usage, versioning & policies" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:9001', '_blank')}>Open Console</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Buckets', v: BUCKETS.length, c: '#3b82f6', i: <FolderOutlined /> }, { t: 'Objects', v: totalObjects.toLocaleString(), c: '#10b981', i: <CloudOutlined /> }, { t: 'Total Size', v: `${totalSize.toFixed(1)} GB`, c: '#8b5cf6', i: <HddOutlined /> }, { t: 'Policies', v: POLICIES.length, c: '#f59e0b', i: <SafetyCertificateOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><FolderOutlined style={{ color: '#3b82f6' }} /><Text strong>Buckets</Text><Badge count={BUCKETS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {BUCKETS.map((b, i) => (
                            <Col key={b.name} xs={24} sm={12} md={6}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${b.color}`, borderRadius: 10 }}>
                                        <Text strong style={{ fontSize: 13, fontFamily: 'monospace' }}>{b.name}</Text>
                                        <div style={{ marginTop: 4 }}>
                                            <Tag color={b.access === 'public' ? 'blue' : 'orange'} style={{ fontSize: 9, borderRadius: 8 }}>{b.access}</Tag>
                                            {b.versioning && <Tag color="green" style={{ fontSize: 9, borderRadius: 8 }}>versioned</Tag>}
                                        </div>
                                        <Row gutter={4} style={{ marginTop: 8 }}>
                                            <Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Objects</Text><br /><Text strong style={{ fontSize: 14, color: b.color }}>{b.objects.toLocaleString()}</Text></Col>
                                            <Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Size</Text><br /><Text strong style={{ fontSize: 14 }}>{b.size}</Text></Col>
                                        </Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><SafetyCertificateOutlined style={{ color: '#f59e0b' }} /><Text strong>Policies</Text></Space>}>
                            {POLICIES.map((p, i) => (
                                <motion.div key={p.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6 }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{p.name}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{p.type} · {p.users} users · {p.groups} groups</Text></div>
                                    <Tag style={{ fontSize: 10, borderRadius: 8 }}>{p.type}</Tag>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><CloudOutlined style={{ color: '#3b82f6' }} /><Text strong>Server Info</Text></Space>}>
                            {SERVER_INFO.map((item, i) => (
                                <motion.div key={item.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                    <Text style={{ fontSize: 12 }}>{item.key}</Text>
                                    <Text strong style={{ fontSize: 12, color: '#3b82f6' }}>{item.value}</Text>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
