'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined, SyncOutlined, DatabaseOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, CloseCircleOutlined, ApiOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const JOB_STATS = [
    { label: 'Completed', count: 1847, pct: 92, color: '#10b981' },
    { label: 'Failed', count: 48, pct: 2, color: '#ef4444' },
    { label: 'Cancelled', count: 23, pct: 1, color: '#f59e0b' },
    { label: 'Running', count: 12, pct: 5, color: '#3b82f6' },
];
const SOURCES = [
    { name: 'MinIO Lakehouse', type: 'S3', status: 'healthy', datasets: 24 },
    { name: 'Nessie Catalog', type: 'Nessie', status: 'healthy', datasets: 18 },
    { name: 'PostgreSQL (Supabase)', type: 'PostgreSQL', status: 'healthy', datasets: 42 },
    { name: 'MongoDB Analytics', type: 'MongoDB', status: 'degraded', datasets: 8 },
];
const JOBS = [
    { id: 'job-29a1f', user: 'adityo', query: 'SELECT * FROM warehouse.sales.orders WHERE...', status: 'COMPLETED', rows: 15240, duration: '2.3s' },
    { id: 'job-28b3e', user: 'admin', query: 'CREATE TABLE warehouse.inventory.movements AS...', status: 'COMPLETED', rows: 0, duration: '8.1s' },
    { id: 'job-27c5d', user: 'data-eng', query: 'SELECT customer_id, SUM(amount) FROM...', status: 'COMPLETED', rows: 892, duration: '1.5s' },
    { id: 'job-26d7f', user: 'adityo', query: 'ALTER TABLE warehouse.hr.employees ADD...', status: 'FAILED', rows: 0, duration: '0.4s' },
    { id: 'job-25e9g', user: 'admin', query: 'REFRESH REFLECTION "revenue_summary_agg"', status: 'COMPLETED', rows: 0, duration: '12.4s' },
    { id: 'job-24f1h', user: 'data-eng', query: 'SELECT COUNT(*) FROM warehouse.sales...', status: 'CANCELLED', rows: 0, duration: '0.8s' },
];

export default function DremioAdminPage() {
    const { themeColor } = usePreferencesStore();

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#47b881', '#1070ca']}>Dremio Lakehouse</AuroraText>} subTitle={<DecryptedText text="Query engine health, job analytics & reflection management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:9047', '_blank')}>Open Dremio</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Jobs', v: 12, c: '#3b82f6', i: <ThunderboltOutlined /> }, { t: 'Avg Query Time', v: '1.8s', c: '#10b981', i: <ClockCircleOutlined /> }, { t: 'Reflections', v: 7, c: '#8b5cf6', i: <SyncOutlined /> }, { t: 'Sources', v: SOURCES.length, c: '#f59e0b', i: <DatabaseOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><ThunderboltOutlined style={{ color: '#3b82f6' }} /><Text strong>Job Distribution</Text></Space>}>
                            {JOB_STATS.map((j, i) => (
                                <motion.div key={j.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><Text style={{ fontSize: 12 }}>{j.label}</Text><Text strong style={{ fontSize: 12, color: j.color }}>{j.count}</Text></div>
                                    <Progress percent={j.pct} strokeColor={j.color} size="small" showInfo={false} />
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><ApiOutlined style={{ color: '#10b981' }} /><Text strong>Source Connections</Text></Space>}>
                            {SOURCES.map((s, i) => (
                                <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6 }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{s.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{s.type} · {s.datasets} datasets</Text></div>
                                    <Tag color={s.status === 'healthy' ? 'green' : 'orange'} icon={s.status === 'healthy' ? <CheckCircleOutlined /> : <CloseCircleOutlined />} style={{ borderRadius: 10, fontSize: 10 }}>{s.status}</Tag>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><ClockCircleOutlined style={{ color: '#8b5cf6' }} /><Text strong>Recent Jobs</Text><Badge count={JOBS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={JOBS} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Job ID', dataIndex: 'id', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace', color: '#3b82f6' }}>{v}</Text> },
                        { title: 'User', dataIndex: 'user', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Query', dataIndex: 'query', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'COMPLETED' ? 'green' : v === 'FAILED' ? 'red' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Rows', dataIndex: 'rows', width: 70, render: (v: number) => <Text style={{ fontSize: 11 }}>{v.toLocaleString()}</Text> },
                        { title: 'Duration', dataIndex: 'duration', width: 80 },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
