'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Tabs } from 'antd';
import { LockOutlined, KeyOutlined, SafetyCertificateOutlined, FileSearchOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ENGINES = [
    { path: 'secret/', type: 'kv-v2', desc: 'Key-Value Secrets', entries: 24, color: '#3b82f6' },
    { path: 'database/', type: 'database', desc: 'Dynamic DB Credentials', entries: 3, color: '#8b5cf6' },
    { path: 'transit/', type: 'transit', desc: 'Encryption as a Service', entries: 5, color: '#10b981' },
    { path: 'pki/', type: 'pki', desc: 'PKI Certificates', entries: 2, color: '#f59e0b' },
];
const SECRETS = [
    { key: 'database/postgres', version: 4, updated: '2h ago', entries: 3 },
    { key: 'api/gemini-key', version: 2, updated: '5d ago', entries: 1 },
    { key: 'smtp/credentials', version: 3, updated: '1d ago', entries: 4 },
    { key: 'jwt/signing-key', version: 1, updated: '30d ago', entries: 2 },
    { key: 'minio/access-keys', version: 2, updated: '7d ago', entries: 2 },
    { key: 'oauth/keycloak', version: 1, updated: '14d ago', entries: 3 },
];
const POLICIES = ['default', 'admin-policy', 'readonly-policy', 'db-creds-policy', 'transit-policy'];

export default function VaultPage() {
    const { themeColor } = usePreferencesStore();
    const totalSecrets = SECRETS.length;
    const totalEngines = ENGINES.length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981']}>HashiCorp Vault</AuroraText>} subTitle={<DecryptedText text="Secret engines, key-value store & access policies" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8200', '_blank')}>Open Vault</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Seal Status', v: 'Unsealed', c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Secret Engines', v: totalEngines, c: '#3b82f6', i: <KeyOutlined /> }, { t: 'Stored Secrets', v: totalSecrets, c: '#8b5cf6', i: <LockOutlined /> }, { t: 'Policies', v: POLICIES.length, c: '#f59e0b', i: <SafetyCertificateOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><KeyOutlined style={{ color: '#3b82f6' }} /><Text strong>Secret Engines</Text></Space>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {ENGINES.map((e, i) => (
                                    <motion.div key={e.path} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', borderLeft: `3px solid ${e.color}` }}>
                                        <div><Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.path}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{e.desc}</Text></div>
                                        <Space><Tag style={{ fontSize: 9, borderRadius: 8 }}>{e.type}</Tag><Badge count={e.entries} style={{ backgroundColor: e.color }} /></Space>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><LockOutlined style={{ color: '#8b5cf6' }} /><Text strong>Stored Secrets</Text><Badge count={totalSecrets} style={{ backgroundColor: '#8b5cf6' }} /></Space>}>
                            <Table dataSource={SECRETS} rowKey="key" size="small" pagination={false} columns={[
                                { title: 'Key', dataIndex: 'key', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Version', dataIndex: 'version', width: 70, render: (v: number) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>v{v}</Tag> },
                                { title: 'Fields', dataIndex: 'entries', width: 60, render: (v: number) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Updated', dataIndex: 'updated', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><SafetyCertificateOutlined style={{ color: '#f59e0b' }} /><Text strong>Access Policies</Text></Space>}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {POLICIES.map((p, i) => (
                            <motion.div key={p} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                                <Tag style={{ padding: '4px 12px', fontSize: 12, borderRadius: 10, background: `${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'][i % 5]}15`, border: `1px solid ${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'][i % 5]}40` }}>{p}</Tag>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
