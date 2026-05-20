'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { RobotOutlined, ApiOutlined, CheckCircleOutlined, ThunderboltOutlined, ReloadOutlined, LinkOutlined, CloudServerOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const AGENTS = [
    { name: 'customer-support', model: 'gemini-2.0-flash', channels: ['web', 'whatsapp'], status: 'active', requests: 1234, avgLatency: '450ms', color: '#3b82f6' },
    { name: 'data-analyst', model: 'gemini-2.5-pro', channels: ['api'], status: 'active', requests: 567, avgLatency: '1.2s', color: '#8b5cf6' },
    { name: 'content-writer', model: 'gemini-2.0-flash', channels: ['web'], status: 'inactive', requests: 89, avgLatency: '800ms', color: '#6b7280' },
];
const ROUTES = [
    { path: '/chat', agent: 'customer-support', method: 'POST', rateLimit: '100/min', auth: 'JWT' },
    { path: '/analyze', agent: 'data-analyst', method: 'POST', rateLimit: '50/min', auth: 'API Key' },
    { path: '/generate', agent: 'content-writer', method: 'POST', rateLimit: '30/min', auth: 'JWT' },
];

export default function OpenClawPage() {
    const { themeColor } = usePreferencesStore();
    const activeAgents = AGENTS.filter(a => a.status === 'active').length;
    const totalRequests = AGENTS.reduce((s, a) => s + a.requests, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#06b6d4', '#8b5cf6']}>OpenClaw AI Gateway</AuroraText>} subTitle={<DecryptedText text="AI agent orchestration, routing & health monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:18789', '_blank')}>Open Gateway</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Agents', v: activeAgents, c: '#10b981', i: <RobotOutlined /> }, { t: 'Total Requests', v: totalRequests.toLocaleString(), c: '#3b82f6', i: <ThunderboltOutlined /> }, { t: 'Routes', v: ROUTES.length, c: '#8b5cf6', i: <NodeIndexOutlined /> }, { t: 'Gateway Status', v: 'Healthy', c: '#10b981', i: <CheckCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><RobotOutlined style={{ color: '#3b82f6' }} /><Text strong>AI Agents</Text><Badge count={AGENTS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {AGENTS.map((a, i) => (
                            <Col key={a.name} xs={24} md={8}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${a.color}`, borderRadius: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><Text strong style={{ fontSize: 13 }}>{a.name}</Text><Tag color={a.status === 'active' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{a.status}</Tag></div>
                                        <Tag style={{ fontSize: 9, borderRadius: 8 }}>{a.model}</Tag>
                                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>{a.channels.map(c => <Tag key={c} color="blue" style={{ fontSize: 9, borderRadius: 8 }}>{c}</Tag>)}</div>
                                        <Row gutter={4} style={{ marginTop: 8 }}><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Requests</Text><br /><Text strong style={{ color: a.color }}>{a.requests}</Text></Col><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Latency</Text><br /><Text strong>{a.avgLatency}</Text></Col></Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><NodeIndexOutlined style={{ color: '#8b5cf6' }} /><Text strong>API Routes</Text></Space>}>
                    <Table dataSource={ROUTES} rowKey="path" size="small" pagination={false} columns={[
                        { title: 'Path', dataIndex: 'path', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Agent', dataIndex: 'agent', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Method', dataIndex: 'method', width: 60, render: (v: string) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Rate Limit', dataIndex: 'rateLimit' },
                        { title: 'Auth', dataIndex: 'auth', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
