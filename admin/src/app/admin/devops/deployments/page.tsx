'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Collapse, Select, Tooltip } from 'antd';
import {
    RocketOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
    ReloadOutlined, ArrowRightOutlined, RollbackOutlined, HistoryOutlined,
    DeploymentUnitOutlined, BranchesOutlined, CaretRightOutlined, SwapOutlined,
    FieldTimeOutlined, DashboardOutlined,
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useTheme } from 'next-themes';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;

const GET_DEPLOYMENTS = `
  query($tenantId: String!) {
    devopsDeployments(tenantId: $tenantId)
  }
`;
const GET_PIPELINES = `
  query($tenantId: String!) {
    devopsPipelines(tenantId: $tenantId)
  }
`;

/* ── mock data ─────────────────────────────────────── */
const ENV_COLORS: Record<string, string> = { dev: '#3b82f6', staging: '#f59e0b', production: '#10b981' };
const STATUS_COLORS: Record<string, string> = { success: 'green', failed: 'red', pending: 'blue', rolling_back: 'orange' };
const HEALTH: Record<string, { color: string; label: string }> = {
    healthy: { color: '#10b981', label: 'Healthy' },
    degraded: { color: '#f59e0b', label: 'Degraded' },
    down: { color: '#ef4444', label: 'Down' },
};

const ENVS = [
    { name: 'Development', key: 'dev', version: 'v3.4.2', health: 'healthy', deployedBy: 'CI Bot', deployedAt: dayjs().subtract(2, 'hour').toISOString(), uptime: '14d 6h', replicas: '2/2', cpu: '35%', memory: '420 MB' },
    { name: 'Staging', key: 'staging', version: 'v3.4.1', health: 'healthy', deployedBy: 'Alice', deployedAt: dayjs().subtract(1, 'day').toISOString(), uptime: '7d 12h', replicas: '2/2', cpu: '28%', memory: '380 MB' },
    { name: 'Production', key: 'production', version: 'v3.3.8', health: 'healthy', deployedBy: 'Bob', deployedAt: dayjs().subtract(5, 'day').toISOString(), uptime: '30d 2h', replicas: '4/4', cpu: '52%', memory: '1.2 GB' },
];

const DEPLOYMENTS = [
    { id: '1', pipelineId: 'p-10', environment: 'dev', status: 'success', version: 'v3.4.2', deployedBy: 'CI Bot', deployedAt: dayjs().subtract(2, 'hour').toISOString(), duration: '3m 12s', changes: ['src/api/deploy.ts', 'src/lib/config.ts'], releaseNotes: 'Hotfix: API timeout handling', approvedBy: 'Alice' },
    { id: '2', pipelineId: 'p-9', environment: 'staging', status: 'success', version: 'v3.4.1', deployedBy: 'Alice', deployedAt: dayjs().subtract(1, 'day').toISOString(), duration: '5m 48s', changes: ['src/components/Dashboard.tsx', 'src/hooks/useAuth.ts', 'src/api/users.ts'], releaseNotes: 'Auth flow revamp and dashboard polish', approvedBy: 'Bob' },
    { id: '3', pipelineId: 'p-8', environment: 'production', status: 'success', version: 'v3.3.8', deployedBy: 'Bob', deployedAt: dayjs().subtract(5, 'day').toISOString(), duration: '8m 05s', changes: ['migrations/0042.sql', 'src/api/billing.ts'], releaseNotes: 'Billing migration & invoice generation', approvedBy: 'CTO' },
    { id: '4', pipelineId: 'p-7', environment: 'dev', status: 'failed', version: 'v3.4.1-rc2', deployedBy: 'CI Bot', deployedAt: dayjs().subtract(6, 'day').toISOString(), duration: '1m 22s', changes: ['src/workers/sync.ts'], releaseNotes: 'Sync worker refactor — build failed', approvedBy: '' },
    { id: '5', pipelineId: 'p-6', environment: 'staging', status: 'success', version: 'v3.3.8', deployedBy: 'Charlie', deployedAt: dayjs().subtract(8, 'day').toISOString(), duration: '4m 31s', changes: ['src/api/billing.ts', 'src/lib/stripe.ts'], releaseNotes: 'Stripe integration pre-prod validation', approvedBy: 'Alice' },
    { id: '6', pipelineId: 'p-5', environment: 'production', status: 'success', version: 'v3.3.5', deployedBy: 'Alice', deployedAt: dayjs().subtract(14, 'day').toISOString(), duration: '7m 55s', changes: ['src/middleware/auth.ts'], releaseNotes: 'Security patch — token rotation', approvedBy: 'CTO' },
    { id: '7', pipelineId: 'p-4', environment: 'dev', status: 'success', version: 'v3.4.0', deployedBy: 'CI Bot', deployedAt: dayjs().subtract(10, 'day').toISOString(), duration: '2m 58s', changes: ['src/pages/settings.tsx', 'src/api/settings.ts'], releaseNotes: 'Settings page overhaul', approvedBy: '' },
    { id: '8', pipelineId: 'p-3', environment: 'staging', status: 'failed', version: 'v3.3.7-rc1', deployedBy: 'David', deployedAt: dayjs().subtract(12, 'day').toISOString(), duration: '2m 10s', changes: ['src/api/reports.ts', 'src/lib/pdf.ts'], releaseNotes: 'PDF report gen — dependency conflict', approvedBy: '' },
    { id: '9', pipelineId: 'p-2', environment: 'production', status: 'success', version: 'v3.3.2', deployedBy: 'Alice', deployedAt: dayjs().subtract(21, 'day').toISOString(), duration: '9m 15s', changes: ['src/api/notifications.ts', 'src/workers/email.ts', 'src/templates/invoice.hbs'], releaseNotes: 'Email notification system v2', approvedBy: 'CTO' },
    { id: '10', pipelineId: 'p-1', environment: 'dev', status: 'success', version: 'v3.3.9', deployedBy: 'CI Bot', deployedAt: dayjs().subtract(3, 'day').toISOString(), duration: '2m 44s', changes: ['src/components/charts/LineChart.tsx'], releaseNotes: 'Chart rendering performance fix', approvedBy: '' },
];

const ROLLBACKS = [
    { from: 'v3.4.1-rc2', to: 'v3.4.0', env: 'dev', reason: 'Build failure in sync worker', by: 'CI Bot', at: dayjs().subtract(6, 'day').toISOString(), success: true },
    { from: 'v3.3.7-rc1', to: 'v3.3.6', env: 'staging', reason: 'PDF dependency conflict broke reports', by: 'Alice', at: dayjs().subtract(12, 'day').toISOString(), success: true },
    { from: 'v3.3.6', to: 'v3.3.5', env: 'production', reason: 'Memory leak in auth middleware', by: 'Bob', at: dayjs().subtract(20, 'day').toISOString(), success: true },
    { from: 'v3.2.9', to: 'v3.2.8', env: 'production', reason: 'Database connection pool exhaustion', by: 'CTO', at: dayjs().subtract(35, 'day').toISOString(), success: true },
];

const FREQ_DATA = [
    { week: 'W20', dev: 4, staging: 1, production: 0 },
    { week: 'W21', dev: 6, staging: 2, production: 1 },
    { week: 'W22', dev: 5, staging: 2, production: 1 },
    { week: 'W23', dev: 8, staging: 3, production: 1 },
    { week: 'W24', dev: 6, staging: 4, production: 2 },
    { week: 'W25', dev: 9, staging: 3, production: 1 },
    { week: 'W26', dev: 7, staging: 2, production: 0 },
];

const TREND_DATA = [
    { week: 'W20', dev: 3.5, staging: 5.2, production: 8.5 },
    { week: 'W21', dev: 3.0, staging: 4.8, production: 7.8 },
    { week: 'W22', dev: 2.8, staging: 4.5, production: 7.2 },
    { week: 'W23', dev: 3.1, staging: 5.1, production: 8.0 },
    { week: 'W24', dev: 2.5, staging: 4.2, production: 7.5 },
    { week: 'W25', dev: 2.3, staging: 3.9, production: 7.0 },
    { week: 'W26', dev: 3.2, staging: 5.8, production: 8.1 },
];

const ENV_CONFIGS: Record<string, { key: string; value: string }[]> = {
    dev: [{ key: 'NODE_ENV', value: 'development' }, { key: 'LOG_LEVEL', value: 'debug' }, { key: 'DB_POOL', value: '5' }],
    staging: [{ key: 'NODE_ENV', value: 'staging' }, { key: 'LOG_LEVEL', value: 'info' }, { key: 'DB_POOL', value: '10' }],
    production: [{ key: 'NODE_ENV', value: 'production' }, { key: 'LOG_LEVEL', value: 'warn' }, { key: 'DB_POOL', value: '25' }],
};

/* ── component ─────────────────────────────────────── */
export default function DeploymentsPage() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const glassCard = {
        background: isDark ? 'rgba(30,30,40,0.65)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.45)',
        borderRadius: 14,
    };

    const [loading, setLoading] = useState(false);
    const [envFilter, setEnvFilter] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([
                gql(GET_DEPLOYMENTS, { tenantId: DEFAULT_TENANT_ID }).catch(() => null),
                gql(GET_PIPELINES, { tenantId: DEFAULT_TENANT_ID }).catch(() => null),
            ]);
        } catch { /* fallback to mock */ }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    const filtered = useMemo(() => {
        let list = DEPLOYMENTS;
        if (envFilter) list = list.filter(d => d.environment === envFilter);
        if (statusFilter) list = list.filter(d => d.status === statusFilter);
        return list;
    }, [envFilter, statusFilter]);

    const totalDeploys = DEPLOYMENTS.length;
    const successRate = Math.round((DEPLOYMENTS.filter(d => d.status === 'success').length / totalDeploys) * 100);
    const avgDuration = '4m 32s';
    const rollbackCount = ROLLBACKS.length;

    /* ── version timeline ──────────────────────────── */
    const timeline = useMemo(() =>
        [...DEPLOYMENTS].sort((a, b) => dayjs(b.deployedAt).unix() - dayjs(a.deployedAt).unix()),
    []);

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Deployment Manager</AuroraText>}
            subTitle={<DecryptedText text="Environment management, deployment history & promotion workflows" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="r" icon={<ReloadOutlined spin={loading} />} onClick={loadData}>Refresh</Button>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ─── 1. Environment Cards ───────────────── */}
                <Row gutter={[14, 14]}>
                    {ENVS.map((env, i) => {
                        const h = HEALTH[env.health];
                        const isLast = i === ENVS.length - 1;
                        return (
                            <React.Fragment key={env.key}>
                                <Col xs={24} md={7}>
                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                                        <Card size="small" style={{ ...glassCard, overflow: 'hidden' }}>
                                            <div style={{ background: `linear-gradient(135deg, ${ENV_COLORS[env.key]}, ${ENV_COLORS[env.key]}88)`, margin: '-12px -12px 12px', padding: '10px 14px', borderRadius: '14px 14px 0 0' }}>
                                                <Text strong style={{ color: '#fff', fontSize: 13 }}>{env.name}</Text>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.color, display: 'inline-block', boxShadow: `0 0 6px ${h.color}` }} />
                                                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{h.label}</Text>
                                                </div>
                                            </div>
                                            <Text strong style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>{env.version}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Deployed by <Text strong style={{ fontSize: 11 }}>{env.deployedBy}</Text> · {dayjs(env.deployedAt).fromNow()}</Text>
                                            <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 10 }}>⏱ Uptime: {env.uptime}</Text></div>
                                            <Row gutter={4} style={{ marginTop: 8 }}>
                                                <Col span={8}>
                                                    <Text type="secondary" style={{ fontSize: 9 }}>Replicas</Text>
                                                    <div><Text strong style={{ fontSize: 11, color: '#10b981' }}>{env.replicas}</Text></div>
                                                </Col>
                                                <Col span={8}>
                                                    <Text type="secondary" style={{ fontSize: 9 }}>CPU</Text>
                                                    <div><Text strong style={{ fontSize: 11 }}>{env.cpu}</Text></div>
                                                </Col>
                                                <Col span={8}>
                                                    <Text type="secondary" style={{ fontSize: 9 }}>Memory</Text>
                                                    <div><Text strong style={{ fontSize: 11 }}>{env.memory}</Text></div>
                                                </Col>
                                            </Row>
                                            <Space style={{ marginTop: 10 }}>
                                                {!isLast && (
                                                    <Tooltip title={`Promote to ${ENVS[i + 1]?.name}`}>
                                                        <Button size="small" type="primary" icon={<ArrowRightOutlined />} style={{ background: ENV_COLORS[ENVS[i + 1]?.key], borderColor: ENV_COLORS[ENVS[i + 1]?.key] }}>
                                                            Promote
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                <Button size="small" icon={<RollbackOutlined />}>Rollback</Button>
                                            </Space>
                                        </Card>
                                    </motion.div>
                                </Col>
                                {!isLast && (
                                    <Col xs={0} md={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                            <ArrowRightOutlined style={{ fontSize: 20, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }} />
                                        </motion.div>
                                    </Col>
                                )}
                            </React.Fragment>
                        );
                    })}
                </Row>

                {/* ─── 2. Deployment Stats ────────────────── */}
                <Row gutter={[12, 12]}>
                    {[
                        { t: 'Total Deployments', v: totalDeploys, c: '#3b82f6', i: <RocketOutlined /> },
                        { t: 'Success Rate', v: `${successRate}%`, c: '#10b981', i: <CheckCircleOutlined /> },
                        { t: 'Avg Deploy Time', v: avgDuration, c: '#8b5cf6', i: <ClockCircleOutlined /> },
                        { t: 'Rollbacks', v: rollbackCount, c: '#f59e0b', i: <RollbackOutlined /> },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                                <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${s.c}` }}>
                                    <Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* ─── 3. Deployment History Table ────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card size="small" style={glassCard} title={<Space><HistoryOutlined style={{ color: themeColor }} /><Text strong>Deployment History</Text><Badge count={filtered.length} style={{ backgroundColor: themeColor }} /></Space>}
                        extra={<Space><Select size="small" allowClear placeholder="Environment" style={{ width: 130 }} value={envFilter} onChange={setEnvFilter} options={[{ value: 'dev', label: 'Dev' }, { value: 'staging', label: 'Staging' }, { value: 'production', label: 'Production' }]} /><Select size="small" allowClear placeholder="Status" style={{ width: 120 }} value={statusFilter} onChange={setStatusFilter} options={[{ value: 'success', label: 'Success' }, { value: 'failed', label: 'Failed' }, { value: 'pending', label: 'Pending' }]} /></Space>}>
                        <Table dataSource={filtered} rowKey="id" size="small" pagination={{ pageSize: 5, size: 'small' }} loading={loading}
                            expandable={{
                                expandedRowRender: (r: any) => (
                                    <div style={{ padding: '4px 0' }}>
                                        <Text strong style={{ fontSize: 11 }}>Release Notes:</Text> <Text style={{ fontSize: 11 }}>{r.releaseNotes}</Text>
                                        <div style={{ marginTop: 6 }}><Text strong style={{ fontSize: 11 }}>Changed Files:</Text>
                                            {r.changes.map((f: string) => <Tag key={f} style={{ fontSize: 10, fontFamily: 'monospace', margin: 2 }}>{f}</Tag>)}
                                        </div>
                                        {r.approvedBy && <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 10 }}>Approved by: {r.approvedBy}</Text></div>}
                                    </div>
                                ),
                            }}
                            columns={[
                                { title: 'Version', dataIndex: 'version', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Environment', dataIndex: 'environment', width: 110, render: (v: string) => <Tag color={ENV_COLORS[v]} style={{ borderRadius: 10, fontSize: 10, color: '#fff' }}>{v}</Tag> },
                                { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={STATUS_COLORS[v]} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Deployed By', dataIndex: 'deployedBy', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Deploy Time', dataIndex: 'deployedAt', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).format('MMM DD HH:mm')}</Text>, sorter: (a: any, b: any) => dayjs(a.deployedAt).unix() - dayjs(b.deployedAt).unix(), defaultSortOrder: 'descend' as const },
                                { title: 'Duration', dataIndex: 'duration', width: 90 },
                                { title: 'Changes', dataIndex: 'changes', width: 75, render: (v: string[]) => <Badge count={v.length} style={{ backgroundColor: '#8b5cf6' }} /> },
                                { title: 'Notes', dataIndex: 'releaseNotes', ellipsis: true, width: 180, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                            ]}
                        />
                    </Card>
                </motion.div>

                {/* ─── 4 & 5. Charts ─────────────────────── */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                            <Card size="small" style={glassCard} title={<Space><DashboardOutlined style={{ color: '#3b82f6' }} /><Text strong>Deployment Frequency</Text></Space>}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={FREQ_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="dev" stackId="a" fill="#3b82f6" name="Dev" />
                                        <Bar dataKey="staging" stackId="a" fill="#f59e0b" name="Staging" />
                                        <Bar dataKey="production" stackId="a" fill="#10b981" name="Production" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </motion.div>
                    </Col>
                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card size="small" style={glassCard} title={<Space><FieldTimeOutlined style={{ color: '#8b5cf6' }} /><Text strong>Deploy Time Trend</Text></Space>}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={TREND_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} unit="m" />
                                        <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Line type="monotone" dataKey="dev" stroke="#3b82f6" strokeWidth={2} name="Dev" dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="staging" stroke="#f59e0b" strokeWidth={2} name="Staging" dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="production" stroke="#10b981" strokeWidth={2} name="Production" dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* ─── 6. Version Timeline ────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <Card size="small" style={glassCard} title={<Space><BranchesOutlined style={{ color: '#8b5cf6' }} /><Text strong>Version Timeline</Text></Space>}>
                        <div style={{ position: 'relative', paddingLeft: 24 }}>
                            <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                            {timeline.map((d, i) => (
                                <motion.div key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.04 }}
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, position: 'relative' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: ENV_COLORS[d.environment], position: 'absolute', left: -18, top: 4, border: `2px solid ${isDark ? '#1e1e28' : '#fff'}`, boxShadow: `0 0 6px ${ENV_COLORS[d.environment]}` }} />
                                    <div style={{ flex: 1, paddingLeft: 8 }}>
                                        <Space size={4}>
                                            <Text strong style={{ fontSize: 13, fontFamily: 'monospace' }}>{d.version}</Text>
                                            <Tag color={ENV_COLORS[d.environment]} style={{ borderRadius: 10, fontSize: 9, color: '#fff' }}>{d.environment}</Tag>
                                            <Tag color={STATUS_COLORS[d.status]} style={{ borderRadius: 10, fontSize: 9 }}>{d.status}</Tag>
                                        </Space>
                                        <div><Text type="secondary" style={{ fontSize: 10 }}>{d.deployedBy} · {dayjs(d.deployedAt).format('MMM DD, HH:mm')} · {d.duration}</Text></div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* ─── 7. Environment Comparison ──────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card size="small" style={glassCard} title={<Space><SwapOutlined style={{ color: '#f59e0b' }} /><Text strong>Environment Comparison</Text></Space>}>
                        <Row gutter={[12, 12]}>
                            {ENVS.map((env, i) => {
                                const nextEnv = ENVS[i + 1];
                                const drift = nextEnv && env.version !== nextEnv.version;
                                const configs = ENV_CONFIGS[env.key] || [];
                                return (
                                    <Col key={env.key} xs={24} md={8}>
                                        <Card size="small" style={{ borderTop: `3px solid ${ENV_COLORS[env.key]}`, borderRadius: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: 13 }}>{env.name}</Text>
                                                <Tag color={ENV_COLORS[env.key]} style={{ borderRadius: 10, fontSize: 9, color: '#fff' }}>{env.key}</Tag>
                                            </div>
                                            <div style={{ marginTop: 6 }}>
                                                <Text style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>{env.version}</Text>
                                            </div>
                                            <div style={{ marginTop: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>Last: {dayjs(env.deployedAt).fromNow()} · {env.replicas} replicas</Text>
                                            </div>
                                            {drift && (
                                                <Tag color="orange" style={{ marginTop: 6, fontSize: 10, borderRadius: 8 }}>
                                                    ⚠ Drift from {nextEnv.name}: {env.version} → {nextEnv.version}
                                                </Tag>
                                            )}
                                            {!drift && nextEnv && (
                                                <Tag color="green" style={{ marginTop: 6, fontSize: 10, borderRadius: 8 }}>✓ In sync with {nextEnv.name}</Tag>
                                            )}
                                            <div style={{ marginTop: 8, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, paddingTop: 6 }}>
                                                <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>Config Variables</Text>
                                                {configs.map(c => (
                                                    <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                        <Text style={{ fontSize: 10, fontFamily: 'monospace', color: isDark ? '#aaa' : '#555' }}>{c.key}</Text>
                                                        <Text strong style={{ fontSize: 10, fontFamily: 'monospace' }}>{c.value}</Text>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    </Card>
                </motion.div>

                {/* ─── 8. Rollback History ────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                    <Collapse ghost expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                        items={[{
                            key: '1',
                            label: <Space><RollbackOutlined style={{ color: '#f59e0b' }} /><Text strong>Rollback History</Text><Badge count={ROLLBACKS.length} style={{ backgroundColor: '#f59e0b' }} /></Space>,
                            children: (
                                <Card size="small" style={glassCard}>
                                    {ROLLBACKS.map((rb, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.05 }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', marginBottom: 8, borderLeft: `3px solid ${rb.success ? '#10b981' : '#ef4444'}` }}>
                                            <div style={{ flex: 1 }}>
                                                <Space size={4}>
                                                    <Text delete style={{ fontSize: 12, fontFamily: 'monospace' }}>{rb.from}</Text>
                                                    <ArrowRightOutlined style={{ fontSize: 10, color: '#999' }} />
                                                    <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{rb.to}</Text>
                                                    <Tag color={ENV_COLORS[rb.env]} style={{ borderRadius: 10, fontSize: 9, color: '#fff' }}>{rb.env}</Tag>
                                                    <Tag color={rb.success ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 9 }}>{rb.success ? 'success' : 'failed'}</Tag>
                                                </Space>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>{rb.reason}</Text></div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <Text style={{ fontSize: 11 }}>{rb.by}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>{dayjs(rb.at).fromNow()}</Text></div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </Card>
                            ),
                        }]} />
                </motion.div>

                {/* ─── 9. Recent Pipeline Activity ─────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <Card size="small" style={glassCard} title={<Space><DeploymentUnitOutlined style={{ color: '#3b82f6' }} /><Text strong>Recent Pipeline Activity</Text></Space>}>
                        <Row gutter={[12, 12]}>
                            {DEPLOYMENTS.slice(0, 6).map((d, i) => (
                                <Col key={d.id} xs={24} md={12}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.65 + i * 0.04 }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                            borderLeft: `3px solid ${ENV_COLORS[d.environment]}`,
                                        }}
                                    >
                                        <div style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: STATUS_COLORS[d.status] === 'green' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {d.status === 'success'
                                                ? <CheckCircleOutlined style={{ color: '#10b981', fontSize: 14 }} />
                                                : <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                                            }
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <Space size={4}>
                                                <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{d.version}</Text>
                                                <Tag color={ENV_COLORS[d.environment]} style={{ borderRadius: 8, fontSize: 9, color: '#fff' }}>{d.environment}</Tag>
                                            </Space>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    {d.deployedBy} · {d.duration} · {dayjs(d.deployedAt).fromNow()}
                                                </Text>
                                            </div>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{d.pipelineId}</Text>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

                {/* ─── 10. Deployment Health Overview ─────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                    <Card size="small" style={glassCard} title={<Space><DashboardOutlined style={{ color: '#10b981' }} /><Text strong>Deployment Health Overview</Text></Space>}>
                        <Row gutter={[12, 12]}>
                            {[
                                { label: 'Deploy Success (30d)', value: `${successRate}%`, color: successRate >= 90 ? '#10b981' : '#f59e0b', desc: `${DEPLOYMENTS.filter(d => d.status === 'success').length} of ${totalDeploys} deployments` },
                                { label: 'Mean Time to Deploy', value: avgDuration, color: '#3b82f6', desc: 'Average across all environments' },
                                { label: 'Environments Healthy', value: `${ENVS.filter(e => e.health === 'healthy').length}/${ENVS.length}`, color: '#10b981', desc: 'All environments operational' },
                                { label: 'Version Drift', value: ENVS[0].version !== ENVS[2].version ? 'Detected' : 'None', color: ENVS[0].version !== ENVS[2].version ? '#f59e0b' : '#10b981', desc: `Dev: ${ENVS[0].version} → Prod: ${ENVS[2].version}` },
                            ].map((item, i) => (
                                <Col key={i} xs={12} md={6}>
                                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.04 }}>
                                        <Card size="small" style={{ borderRadius: 10, textAlign: 'center', borderTop: `3px solid ${item.color}` }}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{item.label}</Text>
                                            <Text strong style={{ fontSize: 20, color: item.color, display: 'block', margin: '4px 0' }}>{item.value}</Text>
                                            <Text type="secondary" style={{ fontSize: 9 }}>{item.desc}</Text>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

            </motion.div>
        </CMSLayout>
    );
}
