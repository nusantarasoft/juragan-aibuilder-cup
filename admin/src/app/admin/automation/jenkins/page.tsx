'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { BuildOutlined, CheckCircleOutlined, CloseCircleOutlined, CloudServerOutlined, ReloadOutlined, LinkOutlined, PlayCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const JOBS = [
    { name: 'admin-build', lastBuild: '#42', result: 'SUCCESS', health: 95, duration: '2m 34s', color: '#10b981' },
    { name: 'middleware-build', lastBuild: '#38', result: 'SUCCESS', health: 90, duration: '3m 12s', color: '#10b981' },
    { name: 'landing-page-build', lastBuild: '#27', result: 'FAILURE', health: 60, duration: '1m 45s', color: '#ef4444' },
    { name: 'integration-tests', lastBuild: '#15', result: 'SUCCESS', health: 85, duration: '5m 20s', color: '#10b981' },
];
const BUILDS = [
    { job: 'admin-build', build: '#42', status: 'SUCCESS', commit: 'edf7cc3', duration: '2m 34s', time: '10m ago' },
    { job: 'middleware-build', build: '#38', status: 'SUCCESS', commit: 'a1b2c3d', duration: '3m 12s', time: '25m ago' },
    { job: 'landing-page-build', build: '#27', status: 'FAILURE', commit: 'f4e5d6c', duration: '1m 45s', time: '1h ago' },
    { job: 'admin-build', build: '#41', status: 'SUCCESS', commit: 'bcc7c96', duration: '2m 28s', time: '2h ago' },
];

export default function JenkinsPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#d33833', '#f59e0b']}>Jenkins CI/CD</AuroraText>} subTitle={<DecryptedText text="Build pipelines, job history & agent management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8084', '_blank')}>Open Jenkins</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Jobs', v: JOBS.length, c: '#3b82f6', i: <BuildOutlined /> }, { t: 'Builds Today', v: 15, c: '#10b981', i: <PlayCircleOutlined /> }, { t: 'Agents', v: 2, c: '#8b5cf6', i: <CloudServerOutlined /> }, { t: 'Queue', v: 1, c: '#f59e0b', i: <ClockCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><BuildOutlined style={{ color: '#3b82f6' }} /><Text strong>Pipelines</Text></Space>}>
                    {JOBS.map((j, i) => (
                        <motion.div key={j.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: `3px solid ${j.color}` }}>
                            <div style={{ flex: 1 }}><Text strong style={{ fontSize: 12 }}>{j.name}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>Last: {j.lastBuild} · {j.duration}</Text></div>
                            <Space><Progress type="circle" percent={j.health} size={28} strokeColor={j.health > 80 ? '#10b981' : j.health > 50 ? '#f59e0b' : '#ef4444'} /><Tag color={j.result === 'SUCCESS' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{j.result}</Tag></Space>
                        </motion.div>
                    ))}
                </Card>
                <Card size="small" style={glass} title={<Space><PlayCircleOutlined style={{ color: '#10b981' }} /><Text strong>Recent Builds</Text></Space>}>
                    <Table dataSource={BUILDS} rowKey={(_, i) => `b${i}`} size="small" pagination={false} columns={[
                        { title: 'Job', dataIndex: 'job', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Build', dataIndex: 'build', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8, fontFamily: 'monospace' }}>{v}</Tag> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'SUCCESS' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Commit', dataIndex: 'commit', render: (v: string) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Duration', dataIndex: 'duration', width: 70 },
                        { title: 'Time', dataIndex: 'time', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
