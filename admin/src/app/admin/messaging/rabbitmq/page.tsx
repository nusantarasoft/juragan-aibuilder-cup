'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { SwapOutlined, DatabaseOutlined, LinkOutlined, ReloadOutlined, CheckCircleOutlined, ThunderboltOutlined, ShareAltOutlined, InboxOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const QUEUES = [
    { name: 'email.send', messages: 23, consumers: 2, rate: '12/s', state: 'running', color: '#3b82f6' },
    { name: 'notifications.push', messages: 5, consumers: 1, rate: '8/s', state: 'running', color: '#8b5cf6' },
    { name: 'reports.generate', messages: 0, consumers: 1, rate: '2/s', state: 'idle', color: '#10b981' },
    { name: 'webhooks.dispatch', messages: 12, consumers: 2, rate: '15/s', state: 'running', color: '#f59e0b' },
    { name: 'audit.process', messages: 0, consumers: 1, rate: '5/s', state: 'idle', color: '#06b6d4' },
];
const EXCHANGES = [
    { name: 'events.topic', type: 'topic', bindings: 5, durable: true },
    { name: 'notifications.fanout', type: 'fanout', bindings: 3, durable: true },
    { name: 'dlx.exchange', type: 'direct', bindings: 2, durable: true },
    { name: 'amq.default', type: 'direct', bindings: 0, durable: true },
];

export default function RabbitMQPage() {
    const { themeColor } = usePreferencesStore();
    const totalMessages = QUEUES.reduce((s, q) => s + q.messages, 0);
    const totalConsumers = QUEUES.reduce((s, q) => s + q.consumers, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ff6600', '#10b981']}>RabbitMQ</AuroraText>} subTitle={<DecryptedText text="Queue browser, exchange topology & message rates" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:15672', '_blank')}>Open RabbitMQ</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Queues', v: QUEUES.length, c: '#3b82f6', i: <InboxOutlined /> }, { t: 'Messages Ready', v: totalMessages, c: totalMessages > 50 ? '#f59e0b' : '#10b981', i: <DatabaseOutlined /> }, { t: 'Consumers', v: totalConsumers, c: '#8b5cf6', i: <CheckCircleOutlined /> }, { t: 'Exchanges', v: EXCHANGES.length, c: '#f59e0b', i: <ShareAltOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><InboxOutlined style={{ color: '#3b82f6' }} /><Text strong>Queues</Text><Badge count={QUEUES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={QUEUES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Queue', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Messages', dataIndex: 'messages', width: 80, render: (v: number) => <Text strong style={{ color: v > 20 ? '#f59e0b' : '#10b981' }}>{v}</Text> },
                        { title: 'Consumers', dataIndex: 'consumers', width: 80 },
                        { title: 'Rate', dataIndex: 'rate', render: (v: string) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'State', dataIndex: 'state', render: (v: string) => <Tag color={v === 'running' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                    ]} />
                </Card>

                <Card size="small" style={glass} title={<Space><ShareAltOutlined style={{ color: '#f59e0b' }} /><Text strong>Exchanges</Text></Space>}>
                    <Table dataSource={EXCHANGES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Exchange', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color={v === 'topic' ? 'blue' : v === 'fanout' ? 'purple' : 'green'} style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Bindings', dataIndex: 'bindings', width: 80 },
                        { title: 'Durable', dataIndex: 'durable', render: (v: boolean) => <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v ? 'Yes' : 'No'}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
