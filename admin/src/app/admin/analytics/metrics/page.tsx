'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Progress, Badge } from 'antd';
import { DashboardOutlined, ThunderboltOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, BarChartOutlined, AlertOutlined, RocketOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const SLOS = [
    { name: 'API Availability', target: 99.9, current: 99.95, budget: 98.2, status: 'healthy' },
    { name: 'GraphQL P95 Latency', target: 500, current: 342, budget: 85.5, status: 'healthy', unit: 'ms' },
    { name: 'Error Rate', target: 1.0, current: 0.47, budget: 72.0, status: 'healthy', unit: '%' },
    { name: 'Auth Success Rate', target: 99.5, current: 99.8, budget: 91.3, status: 'healthy' },
];

const ENDPOINTS = [
    { path: '/graphql', rpm: 1240, p50: '45ms', p95: '180ms', p99: '420ms', errors: '0.3%', apdex: 0.96 },
    { path: '/auth/v1/token', rpm: 890, p50: '32ms', p95: '95ms', p99: '210ms', errors: '0.1%', apdex: 0.98 },
    { path: '/rest/v1/*', rpm: 2100, p50: '18ms', p95: '52ms', p99: '120ms', errors: '0.2%', apdex: 0.99 },
    { path: '/storage/v1/object', rpm: 340, p50: '120ms', p95: '450ms', p99: '980ms', errors: '0.8%', apdex: 0.88 },
    { path: '/realtime/v1', rpm: 56, p50: '8ms', p95: '25ms', p99: '60ms', errors: '0.0%', apdex: 0.99 },
];

export default function PlatformMetricsPage() {
    const { themeColor } = usePreferencesStore();
    const totalRPM = ENDPOINTS.reduce((s, e) => s + e.rpm, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Platform Metrics</AuroraText>} subTitle={<DecryptedText text="Request throughput, latency percentiles, SLO compliance & Apdex scores" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Requests/min', v: totalRPM.toLocaleString(), c: '#3b82f6', i: <ThunderboltOutlined /> }, { t: 'P95 Latency', v: '180ms', c: '#10b981', i: <ClockCircleOutlined /> }, { t: 'Error Rate', v: '0.47%', c: '#f59e0b', i: <AlertOutlined /> }, { t: 'Apdex Score', v: '0.96', c: '#8b5cf6', i: <CheckCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><DashboardOutlined style={{ color: '#10b981' }} /><Text strong>SLO Compliance</Text></Space>}>
                    <Row gutter={[12, 12]}>
                        {SLOS.map((slo, i) => (
                            <Col key={slo.name} xs={12} md={6}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                                    <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
                                        <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{slo.name}</Text>
                                        <Progress type="dashboard" percent={slo.budget} size={80} strokeColor={slo.budget > 80 ? '#10b981' : slo.budget > 50 ? '#f59e0b' : '#ef4444'} format={() => <><Text strong style={{ fontSize: 14 }}>{slo.current}{slo.unit === 'ms' ? 'ms' : slo.unit === '%' ? '%' : '%'}</Text><br /><Text type="secondary" style={{ fontSize: 8 }}>target: {slo.target}{slo.unit || '%'}</Text></>} />
                                        <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 9 }}>Error budget: {slo.budget}% remaining</Text></div>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><RocketOutlined style={{ color: '#3b82f6' }} /><Text strong>Endpoint Performance</Text></Space>}>
                    <Row gutter={[10, 10]}>
                        {ENDPOINTS.map((ep, i) => (
                            <Col key={ep.path} xs={24}>
                                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'monospace', width: 160, fontWeight: 600 }}>{ep.path}</Text>
                                    <Tag style={{ fontSize: 9, borderRadius: 6 }}>{ep.rpm} RPM</Tag>
                                    <Space size={4} style={{ flex: 1 }}>
                                        <Tag color="green" style={{ fontSize: 9, borderRadius: 6 }}>P50: {ep.p50}</Tag>
                                        <Tag color="blue" style={{ fontSize: 9, borderRadius: 6 }}>P95: {ep.p95}</Tag>
                                        <Tag color="orange" style={{ fontSize: 9, borderRadius: 6 }}>P99: {ep.p99}</Tag>
                                    </Space>
                                    <Tag color={parseFloat(ep.errors) > 0.5 ? 'red' : 'green'} style={{ fontSize: 9, borderRadius: 6 }}>err: {ep.errors}</Tag>
                                    <div style={{ textAlign: 'right', width: 60 }}>
                                        <Text strong style={{ fontSize: 12, color: ep.apdex > 0.95 ? '#10b981' : ep.apdex > 0.85 ? '#f59e0b' : '#ef4444' }}>{ep.apdex}</Text><br />
                                        <Text type="secondary" style={{ fontSize: 8 }}>Apdex</Text>
                                    </div>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
