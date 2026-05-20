'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { TeamOutlined, UserOutlined, ApartmentOutlined, SafetyCertificateOutlined, ReloadOutlined, LinkOutlined, FolderOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const OUS = [
    { name: 'People', dn: 'ou=People,dc=nusantarasoft,dc=local', entries: 12, color: '#3b82f6' },
    { name: 'Groups', dn: 'ou=Groups,dc=nusantarasoft,dc=local', entries: 5, color: '#8b5cf6' },
    { name: 'Services', dn: 'ou=Services,dc=nusantarasoft,dc=local', entries: 8, color: '#10b981' },
];
const USERS = [
    { uid: 'admin', cn: 'Administrator', email: 'admin@nusantarasoft.local', ou: 'People', status: 'active' },
    { uid: 'hr.manager', cn: 'HR Manager', email: 'hr@nusantarasoft.local', ou: 'People', status: 'active' },
    { uid: 'dev.lead', cn: 'Dev Lead', email: 'dev@nusantarasoft.local', ou: 'People', status: 'active' },
    { uid: 'svc.middleware', cn: 'Middleware Service', email: 'middleware@nusantarasoft.local', ou: 'Services', status: 'active' },
    { uid: 'svc.kong', cn: 'Kong Gateway', email: 'kong@nusantarasoft.local', ou: 'Services', status: 'active' },
];
const GROUPS = [
    { cn: 'admins', members: 2, gidNumber: 5000 },
    { cn: 'developers', members: 5, gidNumber: 5001 },
    { cn: 'operators', members: 3, gidNumber: 5002 },
    { cn: 'readonly', members: 8, gidNumber: 5003 },
];

export default function OpenLDAPPage() {
    const { themeColor } = usePreferencesStore();
    const totalEntries = OUS.reduce((s, o) => s + o.entries, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#333', '#8b5cf6']}>OpenLDAP</AuroraText>} subTitle={<DecryptedText text="Directory service — users, groups & organizational units" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8089', '_blank')}>phpLDAPadmin</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'OUs', v: OUS.length, c: '#3b82f6', i: <ApartmentOutlined /> }, { t: 'Total Entries', v: totalEntries, c: '#10b981', i: <FolderOutlined /> }, { t: 'Users', v: USERS.length, c: '#8b5cf6', i: <UserOutlined /> }, { t: 'Groups', v: GROUPS.length, c: '#f59e0b', i: <TeamOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><ApartmentOutlined style={{ color: '#3b82f6' }} /><Text strong>Organizational Units</Text></Space>}>
                    <Row gutter={[10, 10]}>
                        {OUS.map((o, i) => (
                            <Col key={o.name} xs={24} md={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}><Card size="small" hoverable style={{ borderTop: `3px solid ${o.color}`, borderRadius: 10, textAlign: 'center' }}><Text strong style={{ fontSize: 14 }}>{o.name}</Text><br /><Text type="secondary" style={{ fontSize: 9, fontFamily: 'monospace' }}>{o.dn}</Text><br /><Text strong style={{ fontSize: 20, color: o.color, display: 'block', marginTop: 4 }}>{o.entries}</Text><Text type="secondary" style={{ fontSize: 10 }}>entries</Text></Card></motion.div></Col>
                        ))}
                    </Row>
                </Card>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><UserOutlined style={{ color: '#8b5cf6' }} /><Text strong>Directory Entries</Text><Badge count={USERS.length} style={{ backgroundColor: '#8b5cf6' }} /></Space>}>
                            <Table dataSource={USERS} rowKey="uid" size="small" pagination={false} columns={[
                                { title: 'UID', dataIndex: 'uid', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Common Name', dataIndex: 'cn' },
                                { title: 'Email', dataIndex: 'email', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'OU', dataIndex: 'ou', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Status', dataIndex: 'status', width: 70, render: (v: string) => <Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                            ]} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><TeamOutlined style={{ color: '#f59e0b' }} /><Text strong>Groups</Text></Space>}>
                            {GROUPS.map((g, i) => (
                                <motion.div key={g.cn} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6 }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{g.cn}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>GID: {g.gidNumber}</Text></div>
                                    <Badge count={g.members} style={{ backgroundColor: '#f59e0b' }} />
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
