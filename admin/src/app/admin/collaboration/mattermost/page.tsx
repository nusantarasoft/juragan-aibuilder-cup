'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { TeamOutlined, MessageOutlined, LinkOutlined, ReloadOutlined, SettingOutlined, BarChartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TEAMS = [
    { name: 'Engineering', members: 12, channels: 8, posts: 4523, color: '#3b82f6' },
    { name: 'Operations', members: 6, channels: 5, posts: 2134, color: '#8b5cf6' },
    { name: 'Management', members: 4, channels: 3, posts: 987, color: '#10b981' },
];
const CHANNELS = [
    { name: 'town-square', team: 'Engineering', type: 'public', members: 12, lastPost: '2m ago' },
    { name: 'deployments', team: 'Engineering', type: 'public', members: 8, lastPost: '15m ago' },
    { name: 'incidents', team: 'Operations', type: 'private', members: 6, lastPost: '1h ago' },
    { name: 'general', team: 'Management', type: 'public', members: 4, lastPost: '30m ago' },
    { name: 'devops-alerts', team: 'Engineering', type: 'public', members: 10, lastPost: '5m ago' },
];

export default function MattermostPage() {
    const { themeColor } = usePreferencesStore();
    const totalMembers = TEAMS.reduce((s, t) => s + t.members, 0);
    const totalPosts = TEAMS.reduce((s, t) => s + t.posts, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#0058cc', '#10b981']}>Mattermost</AuroraText>} subTitle={<DecryptedText text="Team messaging, channel management & collaboration analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8065', '_blank')}>Open Mattermost</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Teams', v: TEAMS.length, c: '#3b82f6', i: <TeamOutlined /> }, { t: 'Total Members', v: totalMembers, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Channels', v: CHANNELS.length, c: '#8b5cf6', i: <MessageOutlined /> }, { t: 'Posts (30d)', v: totalPosts.toLocaleString(), c: '#f59e0b', i: <BarChartOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    {TEAMS.map((t, i) => (
                        <Col key={t.name} xs={24} md={8}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                <Card size="small" hoverable style={{ ...glass, borderTop: `3px solid ${t.color}` }}>
                                    <Text strong style={{ fontSize: 14 }}>{t.name}</Text>
                                    <Row gutter={8} style={{ marginTop: 8 }}><Col span={8}><Statistic title="Members" value={t.members} valueStyle={{ fontSize: 16 }} /></Col><Col span={8}><Statistic title="Channels" value={t.channels} valueStyle={{ fontSize: 16 }} /></Col><Col span={8}><Statistic title="Posts" value={t.posts} valueStyle={{ fontSize: 16, color: t.color }} /></Col></Row>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><MessageOutlined style={{ color: themeColor }} /><Text strong>Channels</Text><Badge count={CHANNELS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={CHANNELS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Channel', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>#{v}</Text> },
                        { title: 'Team', dataIndex: 'team', render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Type', dataIndex: 'type', width: 80, render: (v: string) => <Tag color={v === 'public' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Members', dataIndex: 'members', width: 80 },
                        { title: 'Last Post', dataIndex: 'lastPost', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
