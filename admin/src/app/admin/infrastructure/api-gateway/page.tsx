'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Row, Col, Statistic, Tabs, Badge, Progress, Tooltip } from 'antd';
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, CloudServerOutlined, ThunderboltOutlined, ReloadOutlined, SafetyOutlined, ClockCircleOutlined, GlobalOutlined, LockOutlined, BarChartOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ROUTES = [
    { id: 'r-1', name: 'Admin API', path: '/api/admin/*', service: 'admin-service', methods: ['GET', 'POST', 'PUT', 'DELETE'], status: 'active', avgLatency: 45, rps: 120, plugins: ['rate-limiting', 'cors', 'jwt-auth'] },
    { id: 'r-2', name: 'Auth API', path: '/api/auth/*', service: 'auth-service', methods: ['POST'], status: 'active', avgLatency: 82, rps: 350, plugins: ['rate-limiting', 'cors'] },
    { id: 'r-3', name: 'GraphQL', path: '/graphql', service: 'middleware', methods: ['POST'], status: 'active', avgLatency: 120, rps: 890, plugins: ['cors', 'jwt-auth', 'request-size-limiting'] },
    { id: 'r-4', name: 'Storage', path: '/storage/*', service: 'storage-api', methods: ['GET', 'POST', 'DELETE'], status: 'active', avgLatency: 35, rps: 210, plugins: ['cors', 'jwt-auth'] },
    { id: 'r-5', name: 'Realtime', path: '/realtime/*', service: 'realtime-service', methods: ['GET'], status: 'active', avgLatency: 15, rps: 450, plugins: ['cors'] },
    { id: 'r-6', name: 'Dremio Proxy', path: '/api/dremio/*', service: 'dremio-service', methods: ['GET', 'POST'], status: 'active', avgLatency: 200, rps: 45, plugins: ['rate-limiting', 'jwt-auth', 'cors'] },
    { id: 'r-7', name: 'AI Studio', path: '/graphql', service: 'middleware', methods: ['POST'], status: 'active', avgLatency: 420, rps: 48, plugins: ['rate-limiting', 'jwt-auth', 'request-size-limiting'] },
];

const SERVICES = [
    { id: 's-1', name: 'admin-service', host: 'admin', port: 3000, protocol: 'http', status: 'healthy', uptime: 99.9 },
    { id: 's-2', name: 'auth-service', host: 'supabase-auth', port: 9999, protocol: 'http', status: 'healthy', uptime: 99.95 },
    { id: 's-3', name: 'middleware', host: 'middleware', port: 4000, protocol: 'http', status: 'healthy', uptime: 99.8 },
    { id: 's-4', name: 'storage-api', host: 'supabase-storage', port: 5000, protocol: 'http', status: 'healthy', uptime: 99.99 },
    { id: 's-5', name: 'realtime-service', host: 'supabase-realtime', port: 4000, protocol: 'http', status: 'healthy', uptime: 99.7 },
    { id: 's-6', name: 'dremio-service', host: 'dremio', port: 9047, protocol: 'http', status: 'healthy', uptime: 98.5 },
    { id: 's-7', name: 'studio-rag', host: 'middleware', port: 4001, protocol: 'http', status: 'healthy', uptime: 99.5 },
];

const PLUGINS = [
    { name: 'rate-limiting', instances: 4, description: 'Request rate limiting', color: '#f59e0b' },
    { name: 'cors', instances: 7, description: 'Cross-Origin Resource Sharing', color: '#3b82f6' },
    { name: 'jwt-auth', instances: 5, description: 'JWT Authentication', color: '#10b981' },
    { name: 'request-size-limiting', instances: 2, description: 'Request body size limits', color: '#8b5cf6' },
];

export default function ApiGatewayPage() {
    const { themeColor } = usePreferencesStore();
    const totalRps = ROUTES.reduce((s, r) => s + r.rps, 0);
    const avgLatency = Math.round(ROUTES.reduce((s, r) => s + r.avgLatency, 0) / ROUTES.length);
    const healthyServices = SERVICES.filter(s => s.status === 'healthy').length;

    const items = [
        { key: 'routes', label: `Routes (${ROUTES.length})`, children: (
            <Table dataSource={ROUTES} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }} columns={[
                { title: 'Route', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Path', dataIndex: 'path', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#3b82f6' }}>{v}</Text> },
                { title: 'Service', dataIndex: 'service', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                { title: 'Methods', dataIndex: 'methods', width: 180, render: (v: string[]) => <Space wrap size={2}>{v.map(m => <Tag key={m} color={m === 'DELETE' ? 'red' : m === 'POST' ? 'green' : m === 'PUT' ? 'orange' : 'blue'} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{m}</Tag>)}</Space> },
                { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                { title: 'Latency', dataIndex: 'avgLatency', width: 80, align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 11, color: v > 500 ? '#ef4444' : v > 100 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{v}ms</Text> },
                { title: 'RPS', dataIndex: 'rps', width: 70, align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 11, fontWeight: 600 }}>{v}</Text> },
                { title: 'Plugins', dataIndex: 'plugins', width: 200, render: (v: string[]) => <Space wrap size={2}>{v.map(p => <Tag key={p} style={{ fontSize: 9, borderRadius: 6 }}>{p}</Tag>)}</Space> },
            ]} />
        ) },
        { key: 'services', label: `Services (${SERVICES.length})`, children: (
            <Row gutter={[12, 12]}>
                {SERVICES.map((s, i) => (
                    <Col key={s.id} xs={24} sm={12} md={8} lg={6}>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" hoverable style={{ borderLeft: `3px solid ${s.status === 'healthy' ? '#10b981' : '#f59e0b'}`, borderRadius: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'healthy' ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${s.status === 'healthy' ? '#10b98160' : '#f59e0b60'}` }} />
                                    <Text strong style={{ fontSize: 12 }}>{s.name}</Text>
                                </div>
                                <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', display: 'block' }}>{s.protocol}://{s.host}:{s.port}</Text>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                    <Tag color={s.status === 'healthy' ? 'green' : 'orange'} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{s.status}</Tag>
                                    <Text style={{ fontSize: 10, color: s.uptime >= 99 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>↑ {s.uptime}%</Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
        ) },
        { key: 'plugins', label: `Plugins (${PLUGINS.length})`, children: (
            <Row gutter={[12, 12]}>
                {PLUGINS.map((p, i) => (
                    <Col key={p.name} xs={24} sm={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${p.color}` }}>
                                <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>{p.description}</Text>
                                <Tag color={p.color} style={{ borderRadius: 10, fontSize: 11 }}>{p.instances} instances</Tag>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
        ) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#06b6d4', '#3b82f6']}>API Gateway</AuroraText>} subTitle={<DecryptedText text="Kong gateway routes, services, plugins & health monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Routes', v: ROUTES.length, c: '#3b82f6', i: <GlobalOutlined /> }, { t: 'Services', v: SERVICES.length, c: '#8b5cf6', i: <CloudServerOutlined /> }, { t: 'Healthy', v: healthyServices, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Total RPS', v: `${(totalRps / 1000).toFixed(1)}K`, c: '#f59e0b', i: <ThunderboltOutlined /> }, { t: 'Avg Latency', v: `${avgLatency}ms`, c: '#06b6d4', i: <ClockCircleOutlined /> }, { t: 'Plugins', v: PLUGINS.length, c: '#ec4899', i: <SafetyOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card style={glass}><Tabs items={items} /></Card>
            </motion.div>
        </CMSLayout>
    );
}
