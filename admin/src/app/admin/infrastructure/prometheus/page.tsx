'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, AlertOutlined, ReloadOutlined, LinkOutlined, DatabaseOutlined, CloudServerOutlined, AimOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TARGETS = [
    { job: 'node-exporter', endpoint: 'localhost:9100', state: 'up', interval: '15s', last: '3s ago', samples: 1247, color: '#10b981' },
    { job: 'cadvisor', endpoint: 'cadvisor:8080', state: 'up', interval: '30s', last: '12s ago', samples: 892, color: '#3b82f6' },
    { job: 'postgres-exporter', endpoint: 'pg-exporter:9187', state: 'up', interval: '15s', last: '6s ago', samples: 456, color: '#8b5cf6' },
    { job: 'kong', endpoint: 'kong:8001', state: 'up', interval: '15s', last: '2s ago', samples: 234, color: '#06b6d4' },
    { job: 'middleware', endpoint: 'middleware:4001', state: 'up', interval: '30s', last: '18s ago', samples: 178, color: '#f59e0b' },
    { job: 'traefik', endpoint: 'traefik:8082', state: 'down', interval: '15s', last: '5m ago', samples: 0, color: '#ef4444' },
];

const RULES = [
    { name: 'HighCpuUsage', group: 'node', state: 'firing', severity: 'critical', dur: '5m', desc: 'CPU > 90%' },
    { name: 'DiskSpaceLow', group: 'node', state: 'pending', severity: 'warning', dur: '15m', desc: 'Disk < 10%' },
    { name: 'ContainerOOM', group: 'container', state: 'inactive', severity: 'critical', dur: '0s', desc: 'OOM events' },
    { name: 'HighErrorRate', group: 'http', state: 'firing', severity: 'warning', dur: '3m', desc: '5xx > 5%' },
];

export default function PrometheusPage() {
    const { themeColor } = usePreferencesStore();
    const up = TARGETS.filter(t => t.state === 'up').length;
    const down = TARGETS.filter(t => t.state === 'down').length;
    const firing = RULES.filter(r => r.state === 'firing').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#e6522c', '#f59e0b']}>Prometheus</AuroraText>} subTitle={<DecryptedText text="Metrics collection, target health & alerting rules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:9091', '_blank')}>Open Prometheus</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Targets Up', v: up, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Targets Down', v: down, c: down > 0 ? '#ef4444' : '#10b981', i: <CloseCircleOutlined /> }, { t: 'Firing Rules', v: firing, c: firing > 0 ? '#ef4444' : '#10b981', i: <AlertOutlined /> }, { t: 'Active Series', v: '18,432', c: '#8b5cf6', i: <ThunderboltOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><AimOutlined style={{ color: '#10b981' }} /><Text strong>Scrape Targets</Text><Badge count={TARGETS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {TARGETS.map((t, i) => (
                            <Col key={t.job} xs={24} sm={12} md={8}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                                    <Card size="small" hoverable style={{ borderLeft: `3px solid ${t.color}`, borderRadius: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text strong style={{ fontSize: 12 }}>{t.job}</Text>
                                            <Tag color={t.state === 'up' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{t.state}</Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>{t.endpoint}</Text>
                                        <Row><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Interval</Text><br /><Text style={{ fontSize: 11 }}>{t.interval}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Last</Text><br /><Text style={{ fontSize: 11 }}>{t.last}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Samples</Text><br /><Text strong style={{ fontSize: 11, color: t.color }}>{t.samples}</Text></Col></Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><AlertOutlined style={{ color: '#ef4444' }} /><Text strong>Alert Rules</Text><Badge count={firing} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                    <Table dataSource={RULES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Rule', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Group', dataIndex: 'group', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'State', dataIndex: 'state', width: 80, render: (v: string) => <Tag color={v === 'firing' ? 'red' : v === 'pending' ? 'orange' : 'green'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Severity', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={v === 'critical' ? '#ef4444' : '#f59e0b'} style={{ borderRadius: 10, fontSize: 10, color: '#fff' }}>{v}</Tag> },
                        { title: 'Duration', dataIndex: 'dur', width: 60 },
                        { title: 'Description', dataIndex: 'desc' },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
