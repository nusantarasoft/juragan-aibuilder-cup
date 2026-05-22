'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { MailOutlined, UserOutlined, HddOutlined, LinkOutlined, ReloadOutlined, CheckCircleOutlined, StopOutlined, PlusOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ACCOUNTS = [
    { email: 'admin@nusantarasoft.local', name: 'Administrator', quota: 2048, used: 920, aliases: ['postmaster@nusantarasoft.local'], status: 'active', color: '#3b82f6' },
    { email: 'info@nusantarasoft.local', name: 'Info Desk', quota: 2048, used: 450, aliases: ['contact@nusantarasoft.local', 'hello@nusantarasoft.local'], status: 'active', color: '#10b981' },
    { email: 'support@nusantarasoft.local', name: 'Support Team', quota: 2048, used: 640, aliases: ['helpdesk@nusantarasoft.local'], status: 'active', color: '#8b5cf6' },
    { email: 'noreply@nusantarasoft.local', name: 'No Reply', quota: 1024, used: 10, aliases: [], status: 'active', color: '#f59e0b' },
    { email: 'dev@nusantarasoft.local', name: 'Dev Team', quota: 2048, used: 370, aliases: ['developer@nusantarasoft.local', 'engineering@nusantarasoft.local', 'ops@nusantarasoft.local'], status: 'active', color: '#06b6d4' },
];

export default function EmailAccountsPage() {
    const { themeColor } = usePreferencesStore();
    const totalQuota = ACCOUNTS.reduce((s, a) => s + a.quota, 0);
    const totalUsed = ACCOUNTS.reduce((s, a) => s + a.used, 0);
    const totalAliases = ACCOUNTS.reduce((s, a) => s + a.aliases.length, 0);
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Email Accounts</AuroraText>} subTitle={<DecryptedText text="User mailboxes, aliases & quota management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="a" icon={<PlusOutlined />} type="primary">Add Account</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Accounts', v: ACCOUNTS.length, c: '#3b82f6', i: <UserOutlined /> }, { t: 'Aliases', v: totalAliases, c: '#10b981', i: <MailOutlined /> }, { t: 'Total Quota', v: `${(totalQuota / 1024).toFixed(0)} GB`, c: '#8b5cf6', i: <HddOutlined /> }, { t: 'Used', v: `${(totalUsed / 1024).toFixed(1)} GB`, c: '#f59e0b', i: <HddOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><UserOutlined style={{ color: '#3b82f6' }} /><Text strong>Quota Overview</Text></Space>}>
                    {ACCOUNTS.map((a, i) => (
                        <motion.div key={a.email} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.04 }} style={{ marginBottom: 8 }}>
                            <Row align="middle"><Col span={8}><Text strong style={{ fontSize: 11 }}>{a.email}</Text></Col><Col span={12}><Progress percent={Math.round((a.used / a.quota) * 100)} size="small" strokeColor={a.color} /></Col><Col span={4} style={{ textAlign: 'right' }}><Text type="secondary" style={{ fontSize: 10 }}>{a.used} / {a.quota} MB</Text></Col></Row>
                        </motion.div>
                    ))}
                </Card>
                <Card size="small" style={glass} title={<Space><MailOutlined style={{ color: '#10b981' }} /><Text strong>Account Details</Text><Badge count={ACCOUNTS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={ACCOUNTS} rowKey="email" size="small" pagination={false} columns={[
                        { title: 'Email', dataIndex: 'email', render: (v: string, r: any) => <Space><div style={{ width: 8, height: 8, borderRadius: 4, background: r.color }} /><Text strong style={{ fontSize: 12 }}>{v}</Text></Space> },
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Quota', dataIndex: 'quota', width: 80, render: (v: number) => <Text>{v} MB</Text> },
                        { title: 'Used', dataIndex: 'used', width: 80, render: (v: number) => <Text style={{ color: '#8b5cf6' }}>{v} MB</Text> },
                        { title: 'Aliases', dataIndex: 'aliases', render: (v: string[]) => v.length > 0 ? v.map((a: string) => <Tag key={a} style={{ fontSize: 9, borderRadius: 8 }}>{a}</Tag>) : <Text type="secondary" style={{ fontSize: 10 }}>—</Text> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
