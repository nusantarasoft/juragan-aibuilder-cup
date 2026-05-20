'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Tabs } from 'antd';
import { SafetyCertificateOutlined, UserOutlined, TeamOutlined, KeyOutlined, GlobalOutlined, ReloadOutlined, LinkOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const REALMS = [{ name: 'nusantarasoft', users: 156, sessions: 42, clients: 8, idps: 3, status: 'active' }, { name: 'internal', users: 24, sessions: 12, clients: 3, idps: 1, status: 'active' }];
const CLIENTS = [
    { id: 'admin-cms', name: 'Admin CMS', protocol: 'openid-connect', enabled: true, redirectUri: 'http://localhost:3003/*' },
    { id: 'landing-page', name: 'Landing Page', protocol: 'openid-connect', enabled: true, redirectUri: 'http://localhost:3000/*' },
    { id: 'middleware-api', name: 'Middleware API', protocol: 'openid-connect', enabled: true, redirectUri: 'http://localhost:4001/*' },
    { id: 'mobile-app', name: 'Mobile App', protocol: 'openid-connect', enabled: false, redirectUri: 'nusantarasoft://*' },
];
const SESSIONS = [
    { user: 'admin@nusantarasoft.com', client: 'Admin CMS', ip: '192.168.1.10', started: '2h ago', lastAccess: '5m ago' },
    { user: 'hr.manager@nusantarasoft.com', client: 'Admin CMS', ip: '192.168.1.25', started: '1h ago', lastAccess: '10m ago' },
    { user: 'dev@nusantarasoft.com', client: 'Middleware API', ip: '192.168.1.30', started: '30m ago', lastAccess: '2m ago' },
];

export default function KeycloakPage() {
    const { themeColor } = usePreferencesStore();
    const totalUsers = REALMS.reduce((s, r) => s + r.users, 0);
    const totalSessions = REALMS.reduce((s, r) => s + r.sessions, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ef4444', '#8b5cf6']}>Keycloak SSO</AuroraText>} subTitle={<DecryptedText text="Identity management, SSO sessions & client applications" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8180', '_blank')}>Open Keycloak</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Users', v: totalUsers, c: '#3b82f6', i: <UserOutlined /> }, { t: 'Active Sessions', v: totalSessions, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Client Apps', v: CLIENTS.length, c: '#8b5cf6', i: <SettingOutlined /> }, { t: 'Realms', v: REALMS.length, c: '#f59e0b', i: <GlobalOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    {REALMS.map((r, i) => (
                        <Col key={r.name} xs={24} md={12}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                <Card size="small" style={{ ...glass, borderLeft: `3px solid ${['#3b82f6', '#8b5cf6'][i]}` }} title={<Space><SafetyCertificateOutlined style={{ color: ['#3b82f6', '#8b5cf6'][i] }} /><Text strong>Realm: {r.name}</Text><Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{r.status}</Tag></Space>}>
                                    <Row gutter={12}><Col span={6}><Statistic title="Users" value={r.users} valueStyle={{ fontSize: 16 }} /></Col><Col span={6}><Statistic title="Sessions" value={r.sessions} valueStyle={{ fontSize: 16, color: '#10b981' }} /></Col><Col span={6}><Statistic title="Clients" value={r.clients} valueStyle={{ fontSize: 16 }} /></Col><Col span={6}><Statistic title="IDPs" value={r.idps} valueStyle={{ fontSize: 16 }} /></Col></Row>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Tabs items={[
                    { key: 'clients', label: <Space><SettingOutlined />Client Apps</Space>, children: (
                        <Card size="small" style={glass}>
                            <Table dataSource={CLIENTS} rowKey="id" size="small" pagination={false} columns={[
                                { title: 'Client ID', dataIndex: 'id', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Name', dataIndex: 'name' },
                                { title: 'Protocol', dataIndex: 'protocol', render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Status', dataIndex: 'enabled', render: (v: boolean) => <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v ? 'Enabled' : 'Disabled'}</Tag> },
                                { title: 'Redirect URI', dataIndex: 'redirectUri', render: (v: string) => <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                            ]} />
                        </Card>
                    )},
                    { key: 'sessions', label: <Space><TeamOutlined />Active Sessions</Space>, children: (
                        <Card size="small" style={glass}>
                            <Table dataSource={SESSIONS} rowKey="user" size="small" pagination={false} columns={[
                                { title: 'User', dataIndex: 'user', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Client', dataIndex: 'client', render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                                { title: 'IP', dataIndex: 'ip', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Started', dataIndex: 'started' },
                                { title: 'Last Access', dataIndex: 'lastAccess' },
                            ]} />
                        </Card>
                    )},
                ]} />
            </motion.div>
        </CMSLayout>
    );
}
