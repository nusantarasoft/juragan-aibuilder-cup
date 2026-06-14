"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, message, Table, Tag, Empty, Timeline, theme, Select, Tooltip } from "antd";
import {
    RocketOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
    ClockCircleOutlined, BranchesOutlined, FieldTimeOutlined, DeploymentUnitOutlined,
    PieChartOutlined, LineChartOutlined, CloudServerOutlined, UserOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Pipeline { id: string; name: string; repository: string; branch: string; status: string; stages: string[]; trigger: string; duration: number; startedAt: string; finishedAt: string; commit: string; author: string; }
interface Build { id: string; pipelineId: string; stage: string; status: string; duration: number; log: string; startedAt: string; finishedAt: string; }
interface Deployment { id: string; pipelineId: string; environment: string; status: string; version: string; deployedBy: string; deployedAt: string; rollbackTarget: string; }

const STATUS_MAP: Record<string, { color: string; antColor: string }> = {
    success: { color: '#10b981', antColor: 'green' }, failed: { color: '#ef4444', antColor: 'red' },
    running: { color: '#3b82f6', antColor: 'blue' }, pending: { color: '#9ca3af', antColor: 'default' },
    cancelled: { color: '#f59e0b', antColor: 'orange' },
};
const ENV_COLORS: Record<string, string> = { dev: '#3b82f6', staging: '#f59e0b', production: '#10b981' };
const TRIGGER_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

const fmtDur = (s: number) => { if (!s) return '—'; const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}m ${sec}s` : `${sec}s`; };

export default function PipelinesDashboardPage() {
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [builds, setBuilds] = useState<Build[]>([]);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [branchFilter, setBranchFilter] = useState<string | null>(null);
    const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => {
        (async () => {
            try {
                const [pData, bData, dData] = await Promise.all([
                    gql(`query($tenantId: String!) { devopsPipelines(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { devopsBuilds(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { devopsDeployments(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                ]);
                setPipelines(Array.isArray(pData.devopsPipelines) ? pData.devopsPipelines : []);
                setBuilds(Array.isArray(bData.devopsBuilds) ? bData.devopsBuilds : []);
                setDeployments(Array.isArray(dData.devopsDeployments) ? dData.devopsDeployments : []);
            } catch (err: any) { message.error("Failed to load pipeline data: " + err.message); }
            finally { setLoading(false); }
        })();
    }, []);

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    // ── Stats ──────────────────────────────────────────────
    const sorted = useMemo(() => [...pipelines].sort((a, b) => dayjs(b.startedAt).unix() - dayjs(a.startedAt).unix()), [pipelines]);
    const successCount = pipelines.filter(p => p.status === 'success').length;
    const successRate = pipelines.length > 0 ? Math.round((successCount / pipelines.length) * 100) : 0;
    const runningCount = pipelines.filter(p => p.status === 'running').length;
    const avgDuration = pipelines.length > 0 ? Math.round(pipelines.reduce((s, p) => s + (p.duration || 0), 0) / pipelines.length) : 0;
    const failedToday = pipelines.filter(p => p.status === 'failed' && dayjs(p.startedAt).isSame(dayjs(), 'day')).length;

    const stats = [
        { t: 'Total Pipelines', v: pipelines.length, c: '#3b82f6', i: <RocketOutlined /> },
        { t: 'Success Rate', v: `${successRate}%`, c: '#10b981', i: <CheckCircleOutlined /> },
        { t: 'Running Now', v: runningCount, c: '#8b5cf6', i: <SyncOutlined spin={runningCount > 0} /> },
        { t: 'Avg Duration', v: fmtDur(avgDuration), c: '#f59e0b', i: <FieldTimeOutlined /> },
        { t: 'Failed Today', v: failedToday, c: '#ef4444', i: <CloseCircleOutlined /> },
    ];

    // ── Pipeline Stage Viz (last 8) ────────────────────────
    const recentPipelines = sorted.slice(0, 8);

    // ── Filtered pipelines for table ──────────────────────
    const branches = useMemo(() => [...new Set(pipelines.map(p => p.branch))], [pipelines]);
    const tableData = useMemo(() => {
        let data = sorted;
        if (statusFilter) data = data.filter(p => p.status === statusFilter);
        if (branchFilter) data = data.filter(p => p.branch === branchFilter);
        return data;
    }, [sorted, statusFilter, branchFilter]);

    // ── Build Success Trend (30 days) ─────────────────────
    const buildTrend = useMemo(() => {
        const map: Record<string, { success: number; failed: number }> = {};
        const start = dayjs().subtract(30, 'day');
        builds.filter(b => dayjs(b.startedAt).isAfter(start)).forEach(b => {
            const key = dayjs(b.startedAt).format('MM/DD');
            if (!map[key]) map[key] = { success: 0, failed: 0 };
            if (b.status === 'success') map[key].success++; else if (b.status === 'failed') map[key].failed++;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));
    }, [builds]);

    // ── Build Duration Trend ──────────────────────────────
    const durationTrend = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        const start = dayjs().subtract(30, 'day');
        builds.filter(b => dayjs(b.startedAt).isAfter(start) && b.duration > 0).forEach(b => {
            const key = dayjs(b.startedAt).format('MM/DD');
            if (!map[key]) map[key] = { total: 0, count: 0 };
            map[key].total += b.duration; map[key].count++;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, avg: Math.round(v.total / v.count) }));
    }, [builds]);

    // ── Environment Status ────────────────────────────────
    const envStatus = useMemo(() => {
        const envs = ['dev', 'staging', 'production'];
        return envs.map(env => {
            const envDeps = deployments.filter(d => d.environment === env).sort((a, b) => dayjs(b.deployedAt).unix() - dayjs(a.deployedAt).unix());
            const latest = envDeps[0] || null;
            return { env, latest };
        });
    }, [deployments]);

    // ── Recent Deployments (last 15) ──────────────────────
    const recentDeploys = useMemo(() =>
        [...deployments].sort((a, b) => dayjs(b.deployedAt).unix() - dayjs(a.deployedAt).unix()).slice(0, 15),
    [deployments]);

    // ── Trigger Distribution ──────────────────────────────
    const triggerData = useMemo(() => {
        const map: Record<string, number> = {};
        pipelines.forEach(p => { const t = p.trigger || 'unknown'; map[t] = (map[t] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [pipelines]);

    if (loading) return (
        <CMSLayout title="CI/CD Pipelines" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>CI/CD Pipelines</AuroraText>}
            subTitle={<DecryptedText text="Pipeline orchestration, build analytics & deployment tracking" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 1. Pipeline Stats ──────────────────────────── */}
            <Row gutter={[12, 12]}>
                {stats.map((s, i) => (
                    <Col key={i} xs={12} md={4} lg={Math.floor(24 / stats.length)}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${s.c}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{s.t}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: s.c, fontFamily: 'monospace', lineHeight: 1.3 }}>{s.v}</div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${s.c}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c, fontSize: 16 }}>{s.i}</div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ── 2. Pipeline Stage Visualization ────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card size="small" style={glassCard} title={<><RocketOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Pipeline Stage Flow</Text></>}>
                    {recentPipelines.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {recentPipelines.map((p, pi) => {
                                const pBuilds = builds.filter(b => b.pipelineId === p.id);
                                const isExpanded = expandedPipeline === p.id;
                                return (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + pi * 0.04 }}
                                        style={{ padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`, cursor: 'pointer' }}
                                        onClick={() => setExpandedPipeline(isExpanded ? null : p.id)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Text strong style={{ fontSize: 12 }}>{p.name}</Text>
                                                <Tag style={{ fontSize: 9, borderRadius: 8, margin: 0 }} color="blue"><BranchesOutlined /> {p.branch}</Tag>
                                                {p.commit && <Text code style={{ fontSize: 9 }}>{p.commit.slice(0, 7)}</Text>}
                                                {p.author && <Text type="secondary" style={{ fontSize: 10 }}><UserOutlined /> {p.author}</Text>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>{fmtDur(p.duration)}</Text>
                                                <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(p.startedAt).format('MMM D HH:mm')}</Text>
                                            </div>
                                        </div>
                                        {/* Stage nodes */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8, overflowX: 'auto' }}>
                                            {(p.stages || []).map((stage, si) => {
                                                const build = pBuilds.find(b => b.stage === stage);
                                                const st = build?.status || (si === 0 && p.status === 'running' ? 'running' : 'pending');
                                                const sc = STATUS_MAP[st]?.color || '#9ca3af';
                                                return (
                                                    <React.Fragment key={si}>
                                                        {si > 0 && <div style={{ width: 24, height: 2, background: isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db', flexShrink: 0 }} />}
                                                        <Tooltip title={`${stage}: ${st}`}>
                                                            <div style={{
                                                                minWidth: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                background: `${sc}20`, border: `2px solid ${sc}`, fontSize: 9, fontWeight: 600, color: sc, flexShrink: 0,
                                                                animation: st === 'running' ? 'pulse 1.5s infinite' : undefined,
                                                                padding: '0 6px',
                                                            }}>
                                                                {stage.slice(0, 4)}
                                                            </div>
                                                        </Tooltip>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <div style={{ marginLeft: 10 }}>
                                                <Tag color={STATUS_MAP[p.status]?.antColor || 'default'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                                                    {p.status === 'running' && <SyncOutlined spin style={{ marginRight: 4 }} />}{p.status}
                                                </Tag>
                                            </div>
                                        </div>
                                        {/* Expanded build details */}
                                        {isExpanded && pBuilds.length > 0 && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }}>
                                                {pBuilds.map(b => (
                                                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 }}>
                                                        <Text style={{ fontSize: 11 }}>{b.stage}</Text>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <Tag color={STATUS_MAP[b.status]?.antColor || 'default'} style={{ borderRadius: 8, fontSize: 9, margin: 0 }}>{b.status}</Tag>
                                                            <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{fmtDur(b.duration)}</Text>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : <Empty description="No pipelines found" />}
                </Card>
            </motion.div>

            {/* ── 3. Pipeline List Table ──────────────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard} title={<><DeploymentUnitOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>All Pipelines</Text></>}
                    extra={<div style={{ display: 'flex', gap: 8 }}>
                        <Select allowClear placeholder="Status" size="small" style={{ width: 110 }} value={statusFilter} onChange={setStatusFilter}
                            options={Object.keys(STATUS_MAP).map(s => ({ label: s, value: s }))} />
                        <Select allowClear placeholder="Branch" size="small" style={{ width: 120 }} value={branchFilter} onChange={setBranchFilter}
                            options={branches.map(b => ({ label: b, value: b }))} />
                    </div>}
                >
                    <Table dataSource={tableData} rowKey="id" size="small" pagination={{ pageSize: 8, size: 'small' }} columns={[
                        { title: '#', dataIndex: 'id', width: 70, render: (v: string) => <Text strong style={{ fontSize: 11, color: '#3b82f6' }}>#{v.slice(-5)}</Text> },
                        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Branch', dataIndex: 'branch', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}><BranchesOutlined /> {v}</Tag> },
                        { title: 'Stages', dataIndex: 'stages', width: 120, render: (_: any, r: Pipeline) => (
                            <div style={{ display: 'flex', gap: 3 }}>
                                {(r.stages || []).map((_, si) => {
                                    const b = builds.find(b => b.pipelineId === r.id && b.stage === r.stages[si]);
                                    const c = STATUS_MAP[b?.status || 'pending']?.color || '#9ca3af';
                                    return <div key={si} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />;
                                })}
                            </div>
                        )},
                        { title: 'Status', dataIndex: 'status', width: 95, render: (v: string) => (
                            <Tag color={STATUS_MAP[v]?.antColor || 'default'} style={{ borderRadius: 10, fontSize: 10 }}>
                                {v === 'running' && <SyncOutlined spin style={{ marginRight: 3 }} />}{v}
                            </Tag>
                        )},
                        { title: 'Duration', dataIndex: 'duration', width: 80, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{fmtDur(v)}</Text> },
                        { title: 'Trigger', dataIndex: 'trigger', width: 80, render: (v: string) => <Tag style={{ fontSize: 9, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Author', dataIndex: 'author', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Started', dataIndex: 'startedAt', width: 120, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(v).format('MMM D HH:mm')}</Text> },
                    ]} />
                </Card>
            </motion.div>

            {/* ── 4 & 5. Build Trends ────────────────────────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={glassCard} title={<><CheckCircleOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Build Success Trend</Text></>}>
                            <div style={{ height: 260 }}>
                                {buildTrend.length > 0 ? (
                                    <ResponsiveContainer>
                                        <AreaChart data={buildTrend}>
                                            <defs>
                                                <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                                </linearGradient>
                                                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="day" tick={tickStyle} />
                                            <YAxis tick={tickStyle} />
                                            <RTooltip contentStyle={tooltipStyle} />
                                            <Area type="monotone" dataKey="success" stroke="#10b981" fill="url(#successGrad)" strokeWidth={2} name="Success" />
                                            <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#failGrad)" strokeWidth={2} name="Failed" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No build data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={glassCard} title={<><LineChartOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Build Duration Trend</Text></>}>
                            <div style={{ height: 260 }}>
                                {durationTrend.length > 0 ? (
                                    <ResponsiveContainer>
                                        <LineChart data={durationTrend}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="day" tick={tickStyle} />
                                            <YAxis tickFormatter={v => fmtDur(v)} tick={tickStyle} />
                                            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtDur(v)} />
                                            <ReferenceLine y={300} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '5m target', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                                            <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Avg Duration (s)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No build duration data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ── 6. Environment Deployment Status ───────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                <Card size="small" style={glassCard} title={<><CloudServerOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Environment Deployment Status</Text></>}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                        {envStatus.map((e, ei) => (
                            <React.Fragment key={e.env}>
                                {ei > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                                        <Text type="secondary" style={{ fontSize: 16 }}>→</Text>
                                    </div>
                                )}
                                <div style={{
                                    flex: 1, minWidth: 180, padding: '14px 18px', borderRadius: 12,
                                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                                    border: `1px solid ${e.latest?.status === 'failed' ? '#ef4444' : ENV_COLORS[e.env]}40`,
                                    borderTop: `3px solid ${ENV_COLORS[e.env]}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text strong style={{ fontSize: 13, textTransform: 'capitalize' }}>{e.env}</Text>
                                        <div style={{
                                            width: 10, height: 10, borderRadius: '50%',
                                            background: e.latest ? (e.latest.status === 'failed' ? '#ef4444' : '#10b981') : '#9ca3af',
                                            boxShadow: e.latest?.status !== 'failed' ? `0 0 6px ${e.latest ? '#10b981' : '#9ca3af'}` : '0 0 6px #ef4444',
                                        }} />
                                    </div>
                                    {e.latest ? (<>
                                        <Text style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: ENV_COLORS[e.env] }}>{e.latest.version}</Text>
                                        <div style={{ marginTop: 4 }}>
                                            <Text type="secondary" style={{ fontSize: 10 }}><UserOutlined /> {e.latest.deployedBy}</Text>
                                        </div>
                                        <div><Text type="secondary" style={{ fontSize: 10 }}><ClockCircleOutlined /> {dayjs(e.latest.deployedAt).format('MMM D HH:mm')}</Text></div>
                                        <Tag color={e.latest.status === 'failed' ? 'red' : 'green'} style={{ fontSize: 9, borderRadius: 8, marginTop: 6 }}>{e.latest.status}</Tag>
                                    </>) : <Text type="secondary" style={{ fontSize: 11 }}>No deployments</Text>}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* ── 7 & 8. Timeline + Trigger Donut ────────────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={{ ...glassCard, maxHeight: 420, overflow: 'auto' }}
                            title={<><FieldTimeOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Recent Deployments</Text></>}>
                            {recentDeploys.length > 0 ? (
                                <Timeline items={recentDeploys.map(d => ({
                                    color: d.status === 'failed' ? 'red' : ENV_COLORS[d.environment] || '#3b82f6',
                                    children: (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                                            <div>
                                                <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{d.version}</Text>
                                                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                                    <Tag color={ENV_COLORS[d.environment] || 'blue'} style={{ fontSize: 9, borderRadius: 8, margin: 0, color: '#fff' }}>{d.environment}</Tag>
                                                    <Tag color={d.status === 'failed' ? 'red' : 'green'} style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{d.status}</Tag>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>{d.deployedBy}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>{dayjs(d.deployedAt).format('MMM D HH:mm')}</Text></div>
                                            </div>
                                        </div>
                                    ),
                                }))} />
                            ) : <Empty description="No deployments" />}
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }}
                            title={<><PieChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Pipeline Triggers</Text></>}>
                            <div style={{ height: 300, position: 'relative' }}>
                                {triggerData.length > 0 ? (<>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: themeColor }}>{pipelines.length}</div>
                                        <Text type="secondary" style={{ fontSize: 10 }}>Total</Text>
                                    </div>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={triggerData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                                {triggerData.map((_, i) => <Cell key={i} fill={TRIGGER_COLORS[i % TRIGGER_COLORS.length]} />)}
                                            </Pie>
                                            <RTooltip contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </>) : <Empty description="No trigger data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

        </div>
        <style jsx global>{`
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
        </CMSLayout>
    );
}
