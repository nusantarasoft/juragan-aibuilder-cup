'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress, Tooltip, Switch } from 'antd';
import { BarChartOutlined, DashboardOutlined, CheckCircleOutlined, CloseCircleOutlined, AlertOutlined, DatabaseOutlined, ReloadOutlined, LinkOutlined, ThunderboltOutlined, EyeOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const DATASOURCES = [
    { id: 1, name: 'PostgreSQL', type: 'postgres', status: 'connected', url: 'postgres:5432', database: 'nusantarasoft', color: '#336791' },
    { id: 2, name: 'Prometheus', type: 'prometheus', status: 'connected', url: 'prometheus:9090', database: '-', color: '#e6522c' },
    { id: 3, name: 'Loki', type: 'loki', status: 'connected', url: 'loki:3100', database: '-', color: '#f3b61f' },
    { id: 4, name: 'Tempo', type: 'tempo', status: 'disconnected', url: 'tempo:3200', database: '-', color: '#6b7280' },
];

const DASHBOARDS = [
    { id: 1, title: 'Node Exporter Full', folder: 'Infrastructure', panels: 32, views: 1204, starred: true, updated: '2h ago' },
    { id: 2, title: 'Docker Containers', folder: 'Infrastructure', panels: 18, views: 876, starred: true, updated: '5h ago' },
    { id: 3, title: 'PostgreSQL Overview', folder: 'Databases', panels: 24, views: 654, starred: false, updated: '1d ago' },
    { id: 4, title: 'Kong API Gateway', folder: 'API', panels: 12, views: 432, starred: false, updated: '2d ago' },
    { id: 5, title: 'Supabase Auth Metrics', folder: 'Supabase', panels: 15, views: 321, starred: true, updated: '3h ago' },
    { id: 6, title: 'Application Performance', folder: 'APM', panels: 20, views: 567, starred: false, updated: '12h ago' },
];

const ALERTS = [
    { id: 1, name: 'High CPU Usage', state: 'firing', severity: 'critical', target: 'middleware', value: '92%', since: '15m ago' },
    { id: 2, name: 'Disk Space Low', state: 'pending', severity: 'warning', target: 'postgres', value: '85%', since: '2h ago' },
    { id: 3, name: 'Memory Pressure', state: 'normal', severity: 'info', target: 'dremio', value: '67%', since: '-' },
    { id: 4, name: 'Container Restarts', state: 'normal', severity: 'info', target: 'supabase-realtime', value: '0', since: '-' },
    { id: 5, name: 'HTTP 5xx Rate', state: 'firing', severity: 'warning', target: 'kong', value: '2.3%', since: '8m ago' },
];

export default function GrafanaPage() {
    const { themeColor } = usePreferencesStore();
    const connected = DATASOURCES.filter(d => d.status === 'connected').length;
    const firingAlerts = ALERTS.filter(a => a.state === 'firing').length;
    const totalPanels = DASHBOARDS.reduce((s, d) => s + d.panels, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f3b61f', '#e6522c']}>Grafana Monitoring</AuroraText>} subTitle={<DecryptedText text="Dashboard management, datasource health & alert rules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="open" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:3004', '_blank')}>Open Grafana</Button>,
            <Button key="r" icon={<ReloadOutlined />} />
        ]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Dashboards', v: DASHBOARDS.length, c: '#3b82f6', i: <DashboardOutlined /> }, { t: 'Total Panels', v: totalPanels, c: '#8b5cf6', i: <BarChartOutlined /> }, { t: 'Datasources', v: `${connected}/${DATASOURCES.length}`, c: '#10b981', i: <DatabaseOutlined /> }, { t: 'Firing Alerts', v: firingAlerts, c: firingAlerts > 0 ? '#ef4444' : '#10b981', i: <AlertOutlined /> }, { t: 'Total Views', v: DASHBOARDS.reduce((s, d) => s + d.views, 0).toLocaleString(), c: '#06b6d4', i: <EyeOutlined /> }, { t: 'Starred', v: DASHBOARDS.filter(d => d.starred).length, c: '#f59e0b', i: <ThunderboltOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><DatabaseOutlined style={{ color: '#10b981' }} /><Text strong>Datasources</Text></Space>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {DATASOURCES.map((ds, i) => (
                                    <motion.div key={ds.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', borderLeft: `3px solid ${ds.color}` }}>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>{ds.name}</Text>
                                            <br /><Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{ds.url}</Text>
                                        </div>
                                        <Tag color={ds.status === 'connected' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{ds.status === 'connected' ? '● Connected' : '● Disconnected'}</Tag>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><AlertOutlined style={{ color: '#ef4444' }} /><Text strong>Alert Rules</Text><Badge count={firingAlerts} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                            <Table dataSource={ALERTS} rowKey="id" size="small" pagination={false} columns={[
                                { title: 'Alert', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'State', dataIndex: 'state', width: 90, render: (v: string) => <Tag color={v === 'firing' ? 'red' : v === 'pending' ? 'orange' : 'green'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Severity', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={v === 'critical' ? '#ef4444' : v === 'warning' ? '#f59e0b' : '#3b82f6'} style={{ borderRadius: 10, fontSize: 10, color: '#fff' }}>{v}</Tag> },
                                { title: 'Target', dataIndex: 'target', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Value', dataIndex: 'value', width: 70, render: (v: string) => <Text strong style={{ fontSize: 12, color: '#ef4444' }}>{v}</Text> },
                                { title: 'Since', dataIndex: 'since', width: 80, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><DashboardOutlined style={{ color: themeColor }} /><Text strong>Dashboards</Text><Badge count={DASHBOARDS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {DASHBOARDS.map((d, i) => (
                            <Col key={d.id} xs={24} sm={12} md={8} lg={6}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                                    <Card size="small" hoverable style={{ borderRadius: 10, borderTop: `3px solid ${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'][i % 6]}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                                            <Text strong style={{ fontSize: 12 }}>{d.title}</Text>
                                            {d.starred && <span style={{ color: '#f59e0b' }}>★</span>}
                                        </div>
                                        <Tag style={{ fontSize: 9, borderRadius: 8 }}>{d.folder}</Tag>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{d.panels} panels</Text>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{d.views} views</Text>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{d.updated}</Text>
                                        </div>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
