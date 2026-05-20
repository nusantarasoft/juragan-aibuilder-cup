'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { ThunderboltOutlined, DatabaseOutlined, TeamOutlined, ReloadOutlined, LinkOutlined, BarChartOutlined, AlertOutlined, CloudServerOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TOPICS = [
    { name: 'user-events', partitions: 6, replicas: 1, messages: 45230, rate: '120/s', retention: '7d', color: '#3b82f6' },
    { name: 'order-events', partitions: 3, replicas: 1, messages: 12450, rate: '45/s', retention: '30d', color: '#8b5cf6' },
    { name: 'audit-logs', partitions: 3, replicas: 1, messages: 89120, rate: '200/s', retention: '90d', color: '#10b981' },
    { name: 'notifications', partitions: 2, replicas: 1, messages: 5670, rate: '15/s', retention: '3d', color: '#f59e0b' },
    { name: 'analytics-stream', partitions: 6, replicas: 1, messages: 234500, rate: '450/s', retention: '14d', color: '#06b6d4' },
];
const CONSUMERS = [
    { group: 'admin-consumer', topic: 'user-events', members: 3, lag: 12, state: 'Stable' },
    { group: 'notification-service', topic: 'notifications', members: 2, lag: 0, state: 'Stable' },
    { group: 'analytics-processor', topic: 'analytics-stream', members: 4, lag: 234, state: 'Rebalancing' },
    { group: 'audit-archiver', topic: 'audit-logs', members: 1, lag: 0, state: 'Stable' },
];

export default function KafkaPage() {
    const { themeColor } = usePreferencesStore();
    const totalMessages = TOPICS.reduce((s, t) => s + t.messages, 0);
    const totalLag = CONSUMERS.reduce((s, c) => s + c.lag, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#231f20', '#06b6d4']}>Apache Kafka</AuroraText>} subTitle={<DecryptedText text="Topic browser, consumer groups & partition lag monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8093', '_blank')}>Open Kafka UI</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Topics', v: TOPICS.length, c: '#3b82f6', i: <DatabaseOutlined /> }, { t: 'Total Messages', v: (totalMessages / 1000).toFixed(0) + 'k', c: '#10b981', i: <ThunderboltOutlined /> }, { t: 'Consumer Groups', v: CONSUMERS.length, c: '#8b5cf6', i: <TeamOutlined /> }, { t: 'Total Lag', v: totalLag, c: totalLag > 100 ? '#f59e0b' : '#10b981', i: <AlertOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><DatabaseOutlined style={{ color: '#3b82f6' }} /><Text strong>Topics</Text><Badge count={TOPICS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={TOPICS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Topic', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Partitions', dataIndex: 'partitions', width: 80 },
                        { title: 'Messages', dataIndex: 'messages', render: (v: number) => <Text strong style={{ color: '#10b981' }}>{v.toLocaleString()}</Text> },
                        { title: 'Rate', dataIndex: 'rate', render: (v: string) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Retention', dataIndex: 'retention', render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                    ]} />
                </Card>

                <Card size="small" style={glass} title={<Space><TeamOutlined style={{ color: '#8b5cf6' }} /><Text strong>Consumer Groups</Text></Space>}>
                    <Table dataSource={CONSUMERS} rowKey="group" size="small" pagination={false} columns={[
                        { title: 'Group', dataIndex: 'group', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Topic', dataIndex: 'topic', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Members', dataIndex: 'members', width: 70 },
                        { title: 'Lag', dataIndex: 'lag', width: 70, render: (v: number) => <Text strong style={{ color: v > 100 ? '#ef4444' : v > 0 ? '#f59e0b' : '#10b981' }}>{v}</Text> },
                        { title: 'State', dataIndex: 'state', render: (v: string) => <Tag color={v === 'Stable' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
