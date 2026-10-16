'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { MailOutlined, UserOutlined, AppstoreOutlined, CloudServerOutlined, ReloadOutlined, LinkOutlined, ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const MAILBOXES = [
    { email: 'admin@nusantarasoft.local', inbox: 24, storage: '450 MB', lastLogin: '5m ago', color: '#3b82f6' },
    { email: 'info@nusantarasoft.local', inbox: 12, storage: '220 MB', lastLogin: '1h ago', color: '#10b981' },
    { email: 'support@nusantarasoft.local', inbox: 38, storage: '310 MB', lastLogin: '15m ago', color: '#8b5cf6' },
    { email: 'noreply@nusantarasoft.local', inbox: 0, storage: '5 MB', lastLogin: '7d ago', color: '#f59e0b' },
    { email: 'dev@nusantarasoft.local', inbox: 7, storage: '180 MB', lastLogin: '3h ago', color: '#06b6d4' },
];
const SESSIONS = [
    { user: 'admin@nusantarasoft.local', ip: '192.168.1.10', login: '13:09:45', browser: 'Chrome 125', idle: '2m' },
    { user: 'support@nusantarasoft.local', ip: '192.168.1.22', login: '12:55:10', browser: 'Firefox 128', idle: '14m' },
    { user: 'dev@nusantarasoft.local', ip: '10.0.0.5', login: '10:00:00', browser: 'Safari 18', idle: '3h' },
];

export default function RoundcubePage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#00acff', '#10b981']}>Roundcube Webmail</AuroraText>} subTitle={<DecryptedText text="Webmail client — mailboxes, sessions & plugin management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8082', '_blank')}>Open Roundcube</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Mailboxes', v: MAILBOXES.length, c: '#3b82f6', i: <MailOutlined /> }, { t: 'Active Sessions', v: SESSIONS.length, c: '#10b981', i: <UserOutlined /> }, { t: 'Plugins', v: 12, c: '#8b5cf6', i: <AppstoreOutlined /> }, { t: 'Storage Used', v: '1.2 GB', c: '#f59e0b', i: <CloudServerOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><MailOutlined style={{ color: '#3b82f6' }} /><Text strong>Mailboxes</Text><Badge count={MAILBOXES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    {MAILBOXES.map((m, i) => (
                        <motion.div key={m.email} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: `3px solid ${m.color}` }}>
                            <div><Text strong style={{ fontSize: 12 }}>{m.email}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{m.storage} · last login {m.lastLogin}</Text></div>
                            <Badge count={m.inbox} showZero style={{ backgroundColor: m.inbox > 0 ? m.color : '#d9d9d9' }} />
                        </motion.div>
                    ))}
                </Card>
                <Card size="small" style={glass} title={<Space><GlobalOutlined style={{ color: '#10b981' }} /><Text strong>Active Sessions</Text><Badge count={SESSIONS.length} style={{ backgroundColor: '#10b981' }} /></Space>}>
                    <Table dataSource={SESSIONS} rowKey={(_, i) => `s${i}`} size="small" pagination={false} columns={[
                        { title: 'User', dataIndex: 'user', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'IP', dataIndex: 'ip', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Login', dataIndex: 'login', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Browser', dataIndex: 'browser', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Idle', dataIndex: 'idle', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
