"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Row, Col, Statistic, Tag, Space, Typography, Spin, List,
    Progress, Empty, Button, Tooltip, Badge, Divider, Alert,
} from "antd";
import { motion } from "framer-motion";
import {
    CloudServerOutlined, DatabaseOutlined, ApiOutlined, CheckCircleOutlined,
    CloseCircleOutlined, WarningOutlined, ReloadOutlined, ClockCircleOutlined,
    ThunderboltOutlined, RocketOutlined, MailOutlined, BellOutlined,
    SafetyCertificateOutlined, HeartOutlined, SyncOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ServiceStatus {
    name: string;
    endpoint: string;
    status: 'healthy' | 'degraded' | 'down' | 'checking';
    latency?: number;
    lastChecked?: string;
    icon: React.ReactNode;
    category: string;
}

const STATUS_COLORS = {
    healthy: '#22c55e',
    degraded: '#f59e0b',
    down: '#ef4444',
    checking: '#94a3b8',
};

const STATUS_ICONS = {
    healthy: <CheckCircleOutlined style={{ color: '#22c55e' }} />,
    degraded: <WarningOutlined style={{ color: '#f59e0b' }} />,
    down: <CloseCircleOutlined style={{ color: '#ef4444' }} />,
    checking: <SyncOutlined spin style={{ color: '#94a3b8' }} />,
};

const SERVICES_CONFIG: Omit<ServiceStatus, 'status' | 'latency' | 'lastChecked'>[] = [
    { name: 'GraphQL Middleware', endpoint: '/graphql', icon: <ApiOutlined style={{ color: '#8b5cf6' }} />, category: 'Core' },
    { name: 'Supabase REST', endpoint: '/rest/v1/', icon: <DatabaseOutlined style={{ color: '#3b82f6' }} />, category: 'Core' },
    { name: 'Admin Frontend', endpoint: '/', icon: <CloudServerOutlined style={{ color: '#22c55e' }} />, category: 'Core' },
    { name: 'Supabase Auth', endpoint: '/auth/v1/settings', icon: <SafetyCertificateOutlined style={{ color: '#f59e0b' }} />, category: 'Auth' },
    { name: 'Supabase Storage', endpoint: '/storage/v1/bucket', icon: <CloudServerOutlined style={{ color: '#06b6d4' }} />, category: 'Storage' },
    { name: 'Analytics', endpoint: '/analytics', icon: <ThunderboltOutlined style={{ color: '#ec4899' }} />, category: 'Monitoring' },
];

export default function SystemHealthPage() {
    const { themeColor } = usePreferencesStore();
    const [services, setServices] = useState<ServiceStatus[]>(
        SERVICES_CONFIG.map(s => ({ ...s, status: 'checking' as const }))
    );
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<string | null>(null);
    const [dbStats, setDbStats] = useState<any>(null);
    const [opsStats, setOpsStats] = useState<any>(null);
    const [notifStats, setNotifStats] = useState<any>(null);

    const checkService = async (service: typeof SERVICES_CONFIG[0]): Promise<ServiceStatus> => {
        const start = performance.now();
        try {
            let url: string;
            if (service.endpoint === '/graphql') {
                url = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001/graphql';
            } else if (service.endpoint === '/') {
                url = 'http://localhost:3003/';
            } else {
                url = `http://localhost:8000${service.endpoint}`;
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const method = service.endpoint === '/graphql' ? 'POST' : 'GET';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            if (service.endpoint !== '/' && service.endpoint !== '/graphql') {
                headers['apikey'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MjE1MjE4LCJleHAiOjIxNDU5MTY4MDB9.6q7QrCyLzEJ-m2Mw8Y29BNR_tF3fKAfbXhdcc4HKxhE';
            }

            const fetchOpts: RequestInit = {
                method,
                headers,
                signal: controller.signal,
            };

            if (method === 'POST') {
                fetchOpts.body = JSON.stringify({ query: '{ __typename }' });
            }

            const res = await fetch(url, fetchOpts);
            clearTimeout(timeout);

            const latency = Math.round(performance.now() - start);

            return {
                ...service,
                status: res.ok ? 'healthy' : 'degraded',
                latency,
                lastChecked: new Date().toISOString(),
            };
        } catch (err: any) {
            const latency = Math.round(performance.now() - start);
            return {
                ...service,
                status: err.name === 'AbortError' ? 'degraded' : 'down',
                latency,
                lastChecked: new Date().toISOString(),
            };
        }
    };

    const runHealthCheck = useCallback(async () => {
        setLoading(true);
        const results = await Promise.all(
            SERVICES_CONFIG.map(s => checkService(s))
        );
        setServices(results);
        setLastRefresh(new Date().toISOString());
        setLoading(false);
    }, []);

    const loadModuleStats = useCallback(async () => {
        try {
            const [opsData, notifData] = await Promise.all([
                gql(`query($t: String!) {
                    opsPlaybooks(tenantId: $t) { id }
                    opsRuns(tenantId: $t) { id status }
                    opsSchedules(tenantId: $t) { id isActive }
                }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) {
                    notificationChannels(tenantId: $t) { id isActive }
                    notificationTemplates(tenantId: $t) { id }
                    notificationLogs(tenantId: $t) { id status }
                }`, { t: DEFAULT_TENANT_ID }),
            ]);

            setOpsStats({
                playbooks: opsData.opsPlaybooks?.length || 0,
                runs: opsData.opsRuns?.length || 0,
                activeRuns: opsData.opsRuns?.filter((r: any) => r.status === 'in_progress').length || 0,
                schedules: opsData.opsSchedules?.filter((s: any) => s.isActive).length || 0,
            });

            const logs = notifData.notificationLogs || [];
            setNotifStats({
                channels: notifData.notificationChannels?.filter((c: any) => c.isActive).length || 0,
                templates: notifData.notificationTemplates?.length || 0,
                totalSent: logs.length,
                failedRate: logs.length > 0
                    ? Math.round((logs.filter((l: any) => l.status === 'failed').length / logs.length) * 100)
                    : 0,
            });
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        runHealthCheck();
        loadModuleStats();

        const interval = setInterval(runHealthCheck, 60_000);
        return () => clearInterval(interval);
    }, [runHealthCheck, loadModuleStats]);

    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const downCount = services.filter(s => s.status === 'down').length;
    const overallStatus = downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'healthy';
    const avgLatency = services.filter(s => s.latency).reduce((sum, s) => sum + (s.latency || 0), 0) / (services.filter(s => s.latency).length || 1);

    const categories = [...new Set(SERVICES_CONFIG.map(s => s.category))];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>System Health</AuroraText>}
            subTitle={<DecryptedText text="Real-time service monitoring and infrastructure status" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { runHealthCheck(); loadModuleStats(); }} loading={loading}>
                    Refresh
                </Button>,
            ]}
        >
            <Spin spinning={loading && services.every(s => s.status === 'checking')}>
                {/* Overall Status Banner */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Alert
                        type={overallStatus === 'healthy' ? 'success' : overallStatus === 'degraded' ? 'warning' : 'error'}
                        message={
                            <Space>
                                {STATUS_ICONS[overallStatus]}
                                <Text strong style={{ fontSize: 15 }}>
                                    {overallStatus === 'healthy' ? 'All Systems Operational' :
                                     overallStatus === 'degraded' ? 'Partial System Degradation' :
                                     'System Outage Detected'}
                                </Text>
                                {lastRefresh && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Last checked: {dayjs(lastRefresh).fromNow()}
                                    </Text>
                                )}
                            </Space>
                        }
                        showIcon={false}
                        style={{ marginBottom: 16, borderRadius: 12, borderLeft: `4px solid ${STATUS_COLORS[overallStatus]}` }}
                    />
                </motion.div>

                {/* Summary Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    {[
                        { title: 'Services', value: services.length, icon: <CloudServerOutlined />, color: '#8b5cf6' },
                        { title: 'Healthy', value: healthyCount, icon: <CheckCircleOutlined />, color: '#22c55e' },
                        { title: 'Degraded', value: degradedCount, icon: <WarningOutlined />, color: '#f59e0b' },
                        { title: 'Down', value: downCount, icon: <CloseCircleOutlined />, color: '#ef4444' },
                        { title: 'Avg Latency', value: `${Math.round(avgLatency)}ms`, icon: <ClockCircleOutlined />, color: '#3b82f6' },
                        { title: 'Uptime', value: `${services.length > 0 ? Math.round((healthyCount / services.length) * 100) : 0}%`, icon: <HeartOutlined />, color: '#ec4899' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 20 }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Service Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    {categories.map((cat, ci) => (
                        <Col key={cat} xs={24} md={cat === 'Core' ? 24 : 8}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + ci * 0.1 }}>
                                <Card
                                    title={<Space><CloudServerOutlined /> {cat} Services</Space>}
                                    size="small"
                                    style={glass}
                                >
                                    <Row gutter={[12, 12]}>
                                        {services.filter(s => s.category === cat).map((svc, si) => (
                                            <Col key={svc.name} xs={24} sm={cat === 'Core' ? 8 : 24}>
                                                <Card
                                                    size="small"
                                                    style={{
                                                        borderRadius: 10,
                                                        borderLeft: `3px solid ${STATUS_COLORS[svc.status]}`,
                                                        background: svc.status === 'down' ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.5)',
                                                    }}
                                                >
                                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Space>
                                                                {svc.icon}
                                                                <Text strong style={{ fontSize: 13 }}>{svc.name}</Text>
                                                            </Space>
                                                            <Badge
                                                                status={svc.status === 'healthy' ? 'success' : svc.status === 'degraded' ? 'warning' : svc.status === 'down' ? 'error' : 'default'}
                                                                text={<Text style={{ fontSize: 11, color: STATUS_COLORS[svc.status], textTransform: 'uppercase', fontWeight: 600 }}>{svc.status}</Text>}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>{svc.endpoint}</Text>
                                                            {svc.latency !== undefined && (
                                                                <Tag color={svc.latency < 200 ? 'green' : svc.latency < 1000 ? 'orange' : 'red'} style={{ fontSize: 10 }}>
                                                                    {svc.latency}ms
                                                                </Tag>
                                                            )}
                                                        </div>
                                                    </Space>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Module Health */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                            <Card title={<Space><RocketOutlined style={{ color: '#8b5cf6' }} /> Operations Module</Space>} size="small" style={glass}>
                                {opsStats ? (
                                    <Row gutter={[8, 8]}>
                                        {[
                                            { label: 'Playbooks', value: opsStats.playbooks, color: '#8b5cf6' },
                                            { label: 'Total Runs', value: opsStats.runs, color: '#3b82f6' },
                                            { label: 'Active Runs', value: opsStats.activeRuns, color: '#22c55e' },
                                            { label: 'Schedules', value: opsStats.schedules, color: '#06b6d4' },
                                        ].map((stat, i) => (
                                            <Col key={i} span={6}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <Text style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{stat.label}</Text>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loading..." />
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                            <Card title={<Space><BellOutlined style={{ color: '#3b82f6' }} /> Notifications Module</Space>} size="small" style={glass}>
                                {notifStats ? (
                                    <Row gutter={[8, 8]}>
                                        {[
                                            { label: 'Active Channels', value: notifStats.channels, color: '#22c55e' },
                                            { label: 'Templates', value: notifStats.templates, color: '#8b5cf6' },
                                            { label: 'Total Sent', value: notifStats.totalSent, color: '#3b82f6' },
                                            { label: 'Failure Rate', value: `${notifStats.failedRate}%`, color: notifStats.failedRate > 10 ? '#ef4444' : '#22c55e' },
                                        ].map((stat, i) => (
                                            <Col key={i} span={6}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <Text style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{stat.label}</Text>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loading..." />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </Spin>
        </CMSLayout>
    );
}
