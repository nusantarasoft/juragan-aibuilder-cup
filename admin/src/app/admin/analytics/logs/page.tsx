'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { FileSearchOutlined, WarningOutlined, AlertOutlined, BarChartOutlined, ReloadOutlined, ClockCircleOutlined, BugOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const LOG_LEVELS = [
    { level: 'INFO', count: 124500, color: '#3b82f6', pct: 72 },
    { level: 'WARN', count: 34200, color: '#f59e0b', pct: 20 },
    { level: 'ERROR', count: 8900, color: '#ef4444', pct: 5 },
    { level: 'DEBUG', count: 5200, color: '#94a3b8', pct: 3 },
];

const TOP_ERRORS = [
    { error: 'Connection timeout to Dremio', service: 'middleware', count: 245, trend: 'down', severity: 'high' },
    { error: 'JWT token expired', service: 'supabase-auth', count: 189, trend: 'stable', severity: 'medium' },
    { error: 'S3 bucket access denied', service: 'supabase-storage', count: 67, trend: 'up', severity: 'high' },
    { error: 'GraphQL query complexity exceeded', service: 'middleware', count: 45, trend: 'down', severity: 'low' },
    { error: 'Rate limit exceeded', service: 'supabase-kong', count: 34, trend: 'stable', severity: 'medium' },
    { error: 'Database connection pool exhausted', service: 'supabase-rest', count: 12, trend: 'down', severity: 'critical' },
];

const SERVICES_HEATMAP = [
    { service: 'middleware', info: 42000, warn: 8500, error: 1200 },
    { service: 'supabase-kong', info: 38000, warn: 6200, error: 890 },
    { service: 'supabase-auth', info: 18000, warn: 4500, error: 2100 },
    { service: 'supabase-storage', info: 15000, warn: 3200, error: 1500 },
    { service: 'supabase-rest', info: 12000, warn: 2800, error: 780 },
    { service: 'admin', info: 8500, warn: 1200, error: 340 },
];

export default function LogAnalyticsPage() {
    const { themeColor } = usePreferencesStore();
    const totalLogs = LOG_LEVELS.reduce((s, l) => s + l.count, 0);
    const errorRate = ((LOG_LEVELS.find(l => l.level === 'ERROR')?.count || 0) / totalLogs * 100).toFixed(2);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b']}>Log Analytics</AuroraText>} subTitle={<DecryptedText text="Centralized log intelligence — error trends, service heatmap & top issues" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Logs (24h)', v: `${(totalLogs / 1000).toFixed(0)}K`, c: '#3b82f6', i: <FileSearchOutlined /> }, { t: 'Error Rate', v: `${errorRate}%`, c: '#ef4444', i: <WarningOutlined /> }, { t: 'Warnings', v: `${(34200 / 1000).toFixed(1)}K`, c: '#f59e0b', i: <AlertOutlined /> }, { t: 'Avg Response', v: '142ms', c: '#10b981', i: <ClockCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><BarChartOutlined style={{ color: '#3b82f6' }} /><Text strong>Log Levels</Text></Space>}>
                            {LOG_LEVELS.map((l, i) => (
                                <motion.div key={l.level} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Space size={4}><div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} /><Text style={{ fontSize: 11 }}>{l.level}</Text></Space>
                                        <Text type="secondary" style={{ fontSize: 10 }}>{l.count.toLocaleString()} ({l.pct}%)</Text>
                                    </div>
                                    <Progress percent={l.pct} showInfo={false} strokeColor={l.color} size="small" />
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><BugOutlined style={{ color: '#ef4444' }} /><Text strong>Top Errors</Text><Badge count={TOP_ERRORS.length} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                            <Table dataSource={TOP_ERRORS} rowKey="error" size="small" pagination={false} columns={[
                                { title: 'Error', dataIndex: 'error', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Service', dataIndex: 'service', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Count', dataIndex: 'count', width: 70, render: (v: number) => <Text strong style={{ fontSize: 12, color: v > 100 ? '#ef4444' : '#f59e0b' }}>{v}</Text> },
                                { title: 'Severity', dataIndex: 'severity', width: 70, render: (v: string) => <Tag color={v === 'critical' ? 'red' : v === 'high' ? 'orange' : v === 'medium' ? 'blue' : 'default'} style={{ fontSize: 9, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Trend', dataIndex: 'trend', width: 60, render: (v: string) => <Tag color={v === 'up' ? 'red' : v === 'down' ? 'green' : 'default'} style={{ fontSize: 9, borderRadius: 8 }}>{v === 'up' ? '↑' : v === 'down' ? '↓' : '→'} {v}</Tag> },
                            ]} />
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><ThunderboltOutlined style={{ color: '#8b5cf6' }} /><Text strong>Service Log Heatmap</Text></Space>}>
                    <Row gutter={[8, 8]}>
                        {SERVICES_HEATMAP.map((s, i) => (
                            <Col key={s.service} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}><Card size="small" style={{ textAlign: 'center', borderRadius: 10 }}><Text strong style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{s.service}</Text><Space size={4}><Tag color="blue" style={{ fontSize: 8 }}>{(s.info / 1000).toFixed(0)}K</Tag><Tag color="orange" style={{ fontSize: 8 }}>{(s.warn / 1000).toFixed(1)}K</Tag><Tag color="red" style={{ fontSize: 8 }}>{s.error}</Tag></Space></Card></motion.div></Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
