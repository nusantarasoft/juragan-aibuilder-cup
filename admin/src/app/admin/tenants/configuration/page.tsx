'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { CloudServerOutlined, AppstoreOutlined, GlobalOutlined, KeyOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TENANTS = [
    { name: 'Nusantarasoft HQ', plan: 'Enterprise', color: '#3b82f6', domain: 'app.nusantarasoft.com', modules: 12, branding: '#3b82f6' },
    { name: 'PartnerCorp', plan: 'Business', color: '#10b981', domain: 'partner.nusantarasoft.com', modules: 8, branding: '#10b981' },
    { name: 'ClientOrg', plan: 'Starter', color: '#f59e0b', domain: null, modules: 5, branding: '#f59e0b' },
];
const MODULES = ['CRM', 'HR', 'Accounting', 'ITSM', 'Inventory', 'PM', 'E-Commerce', 'News', 'AI Studio', 'Reports', 'Automation', 'DevOps'];
const MATRIX: Record<string, boolean[]> = {
    'Nusantarasoft HQ': [true,true,true,true,true,true,true,true,true,true,true,true],
    'PartnerCorp': [true,true,true,true,true,true,true,true,false,false,false,false],
    'ClientOrg': [true,true,true,false,false,true,false,false,false,false,false,false],
};

export default function TenantConfigPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#8b5cf6', '#10b981']}>Tenant Configuration</AuroraText>} subTitle={<DecryptedText text="Tenant isolation settings, branding & feature provisioning" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Tenants', v: TENANTS.length, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Modules Licensed', v: 12, c: '#10b981', i: <AppstoreOutlined /> }, { t: 'Custom Domains', v: 2, c: '#8b5cf6', i: <GlobalOutlined /> }, { t: 'API Keys', v: 6, c: '#f59e0b', i: <KeyOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Row gutter={[12, 12]}>
                    {TENANTS.map((t, i) => (
                        <Col key={t.name} xs={24} md={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                            <Card size="small" hoverable style={{ ...glass, borderTop: `3px solid ${t.color}` }}>
                                <Row align="middle" justify="space-between"><Col><Text strong style={{ fontSize: 14 }}>{t.name}</Text></Col><Col><Tag color={t.plan === 'Enterprise' ? 'gold' : t.plan === 'Business' ? 'blue' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{t.plan}</Tag></Col></Row>
                                <div style={{ marginTop: 10 }}>
                                    <Row gutter={4}><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Domain</Text><br /><Text style={{ fontSize: 11 }}>{t.domain || '—'}</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 9 }}>Modules</Text><br /><Text strong style={{ color: t.color, fontSize: 14 }}>{t.modules}</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 9 }}>Branding</Text><br /><div style={{ width: 22, height: 22, borderRadius: 6, background: t.branding, border: '2px solid rgba(0,0,0,0.1)' }} /></Col></Row>
                                </div>
                            </Card>
                        </motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><SettingOutlined style={{ color: '#8b5cf6' }} /><Text strong>Module Provisioning Matrix</Text></Space>}>
                    <Table dataSource={MODULES.map((m, i) => ({ module: m, t1: MATRIX['Nusantarasoft HQ'][i], t2: MATRIX['PartnerCorp'][i], t3: MATRIX['ClientOrg'][i] }))} rowKey="module" size="small" pagination={false} columns={[
                        { title: 'Module', dataIndex: 'module', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Nusantarasoft HQ', dataIndex: 't1', width: 120, render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#10b981' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} /> },
                        { title: 'PartnerCorp', dataIndex: 't2', width: 120, render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#10b981' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} /> },
                        { title: 'ClientOrg', dataIndex: 't3', width: 120, render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#10b981' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} /> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
