'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined, ReloadOutlined, LinkOutlined, PlayCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const WORKFLOWS = [
    { name: 'CRM Lead Sync', trigger: 'Webhook', status: 'active', lastRun: '5m ago', executions: 1234, color: '#3b82f6' },
    { name: 'Invoice Generator', trigger: 'Cron (daily)', status: 'active', lastRun: '2h ago', executions: 567, color: '#10b981' },
    { name: 'Slack Notifier', trigger: 'Webhook', status: 'active', lastRun: '1m ago', executions: 4520, color: '#8b5cf6' },
    { name: 'Report Builder', trigger: 'Cron (weekly)', status: 'active', lastRun: '3d ago', executions: 89, color: '#f59e0b' },
    { name: 'Data Backup', trigger: 'Cron (nightly)', status: 'inactive', lastRun: '7d ago', executions: 45, color: '#6b7280' },
];
const EXECUTIONS = [
    { workflow: 'Slack Notifier', status: 'success', started: '13:09:12', duration: '0.4s', mode: 'webhook' },
    { workflow: 'CRM Lead Sync', status: 'success', started: '13:05:00', duration: '2.1s', mode: 'webhook' },
    { workflow: 'Invoice Generator', status: 'error', started: '11:00:00', duration: '5.3s', mode: 'cron' },
    { workflow: 'Report Builder', status: 'success', started: '00:00:01', duration: '12.4s', mode: 'cron' },
];

export default function N8nPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ff6d5a', '#10b981']}>n8n Workflows</AuroraText>} subTitle={<DecryptedText text="Visual workflow automation — triggers, executions & credentials" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:5678', '_blank')}>Open n8n</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Workflows', v: 12, c: '#3b82f6', i: <RobotOutlined /> }, { t: 'Executions Today', v: 234, c: '#10b981', i: <ThunderboltOutlined /> }, { t: 'Success Rate', v: '97.2%', c: '#8b5cf6', i: <CheckCircleOutlined /> }, { t: 'Credentials', v: 8, c: '#f59e0b', i: <SafetyCertificateOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><RobotOutlined style={{ color: '#3b82f6' }} /><Text strong>Workflows</Text><Badge count={WORKFLOWS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    {WORKFLOWS.map((w, i) => (
                        <motion.div key={w.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: `3px solid ${w.color}` }}>
                            <div><Text strong style={{ fontSize: 12 }}>{w.name}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{w.trigger} · {w.executions} runs · last {w.lastRun}</Text></div>
                            <Tag color={w.status === 'active' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{w.status}</Tag>
                        </motion.div>
                    ))}
                </Card>
                <Card size="small" style={glass} title={<Space><PlayCircleOutlined style={{ color: '#10b981' }} /><Text strong>Recent Executions</Text></Space>}>
                    <Table dataSource={EXECUTIONS} rowKey={(_, i) => `e${i}`} size="small" pagination={false} columns={[
                        { title: 'Workflow', dataIndex: 'workflow', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Started', dataIndex: 'started', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Duration', dataIndex: 'duration', width: 70 },
                        { title: 'Mode', dataIndex: 'mode', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
