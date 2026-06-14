"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, Table, Tag, Tooltip, Timeline, theme } from "antd";
import {
    ThunderboltOutlined, RocketOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ClockCircleOutlined, ScheduleOutlined, PlayCircleOutlined, ToolOutlined,
    DashboardOutlined, WarningOutlined, RiseOutlined, FallOutlined,
    FunnelPlotOutlined, FieldTimeOutlined, FireOutlined, BugOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Mock Data ────────────────────────────────────────────
function generateExecutionTrend() {
    return Array.from({ length: 30 }, (_, i) => ({
        day: dayjs().subtract(29 - i, 'day').format('MMM DD'),
        success: rand(30, 75), failed: rand(2, 12), cancelled: rand(0, 5),
    }));
}

const PLATFORM_HEALTH = [
    { name: 'n8n', icon: <ThunderboltOutlined />, workflows: 24, activePct: 87.5, lastExec: '3m ago', status: 'green' as const },
    { name: 'Jenkins', icon: <RocketOutlined />, workflows: 18, activePct: 72.2, lastExec: '12m ago', status: 'green' as const },
    { name: 'AWX', icon: <ToolOutlined />, workflows: 11, activePct: 90.9, lastExec: '2h ago', status: 'yellow' as const },
];

const PLATFORMS = ['n8n', 'Jenkins', 'AWX'] as const;
const WORKFLOW_NAMES = [
    'Email Notification Pipeline', 'Data Sync CRM→ERP', 'Nightly DB Backup', 'Slack Alert on Error',
    'CI Build Admin', 'CI Build Middleware', 'E2E Test Suite', 'Deploy Production',
    'Security Scan Weekly', 'DR Backup Restore', 'Log Rotation Cleanup', 'Report Generator',
    'API Health Monitor', 'Invoice Processing', 'User Onboarding Flow',
];
function generateWorkflows() {
    return WORKFLOW_NAMES.map((name, i) => ({
        key: String(i), name, platform: PLATFORMS[i % 3],
        runs: rand(20, 350), successPct: rand(85, 100), avgDuration: `${rand(1, 45)}m ${rand(0, 59)}s`,
        lastRun: dayjs().subtract(rand(1, 72), 'hour').format('MMM DD HH:mm'),
        status: i < 11 ? 'active' : i < 13 ? 'paused' : 'error',
    })).sort((a, b) => b.runs - a.runs);
}

const DURATION_BUCKETS = [
    { range: '<1min', count: rand(40, 80) }, { range: '1-5min', count: rand(80, 150) },
    { range: '5-15min', count: rand(50, 100) }, { range: '15-30min', count: rand(20, 50) },
    { range: '30min-1hr', count: rand(8, 25) }, { range: '1hr+', count: rand(2, 10) },
];

const FAILURE_REASONS = [
    { reason: 'Timeout', count: rand(15, 35) }, { reason: 'API Error', count: rand(12, 28) },
    { reason: 'Auth Failed', count: rand(8, 20) }, { reason: 'Resource Limit', count: rand(6, 16) },
    { reason: 'Script Error', count: rand(5, 14) }, { reason: 'Network Error', count: rand(3, 10) },
].sort((a, b) => b.count - a.count);

function generateFailureTrend() {
    return Array.from({ length: 7 }, (_, i) => ({
        day: dayjs().subtract(6 - i, 'day').format('ddd'),
        failures: rand(3, 18),
    }));
}

const SCHEDULE_JOBS = ['DB Backup', 'Log Rotate', 'Health Check', 'Report Gen', 'Sync CRM', 'Cleanup'];
function generateScheduleGrid() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => {
        const hours: { count: number; jobs: string[] }[] = [];
        for (let h = 0; h < 24; h++) {
            const isWork = h >= 6 && h <= 22 && !['Sat', 'Sun'].includes(day);
            const count = isWork ? rand(0, 4) : rand(0, 1);
            const jobs = Array.from({ length: count }, () => SCHEDULE_JOBS[rand(0, SCHEDULE_JOBS.length - 1)]);
            hours.push({ count, jobs });
        }
        return { day, hours };
    });
}

function generateResourceUsage() {
    return Array.from({ length: 24 }, (_, h) => ({
        hour: `${String(h).padStart(2, '0')}:00`,
        cpu: rand(15, 85), memory: rand(512, 3200),
    }));
}

const FUNNEL_STAGES = [
    { stage: 'Triggered', count: 1240, color: '#3b82f6' },
    { stage: 'Queued', count: 1180, color: '#8b5cf6' },
    { stage: 'Running', count: 1050, color: '#f59e0b' },
    { stage: 'Completed', count: 920, color: '#10b981' },
    { stage: 'Failed', count: 130, color: '#ef4444' },
];

const ACTIVITY_STATUSES = ['success', 'failed', 'running', 'scheduled'] as const;
function generateTimeline() {
    return Array.from({ length: 15 }, (_, i) => {
        const status = ACTIVITY_STATUSES[rand(0, 3)];
        return {
            key: i, workflow: WORKFLOW_NAMES[rand(0, WORKFLOW_NAMES.length - 1)],
            platform: PLATFORMS[rand(0, 2)], status,
            duration: status === 'scheduled' ? '—' : `${rand(1, 30)}m ${rand(0, 59)}s`,
            timestamp: dayjs().subtract(rand(1, 300), 'minute').format('HH:mm'),
        };
    });
}

export default function AutomationAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const execTrend = useMemo(() => generateExecutionTrend(), []);
    const workflows = useMemo(() => generateWorkflows(), []);
    const failureTrend = useMemo(() => generateFailureTrend(), []);
    const scheduleGrid = useMemo(() => generateScheduleGrid(), []);
    const resourceUsage = useMemo(() => generateResourceUsage(), []);
    const timeline = useMemo(() => generateTimeline(), []);

    useEffect(() => {
        (async () => {
            try {
                await Promise.all([
                    gql(`query($tenantId: String!) { automationWorkflows(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { automationRuns(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { automationSchedules(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                ]);
            } catch { /* use mock data */ }
            finally { setLoading(false); }
        })();
    }, []);

    const totalRuns = execTrend.reduce((s, d) => s + d.success + d.failed + d.cancelled, 0);
    const totalFailed = execTrend.reduce((s, d) => s + d.failed, 0);
    const totalSuccess = execTrend.reduce((s, d) => s + d.success, 0);
    const successRate = totalRuns > 0 ? ((totalSuccess / totalRuns) * 100).toFixed(1) : '0';
    const todayRuns = execTrend[execTrend.length - 1];
    const runsToday = todayRuns ? todayRuns.success + todayRuns.failed + todayRuns.cancelled : 0;

    const kpis = [
        { title: 'Total Workflows', value: '53', icon: <PlayCircleOutlined />, color: '#3b82f6', trend: 8 },
        { title: 'Runs Today', value: String(runsToday), icon: <ThunderboltOutlined />, color: '#10b981', trend: 12 },
        { title: 'Success Rate', value: `${successRate}%`, icon: <CheckCircleOutlined />, color: '#8b5cf6', trend: 3 },
        { title: 'Avg Duration', value: '8m 24s', icon: <ClockCircleOutlined />, color: '#06b6d4', trend: -5 },
        { title: 'Failed Runs', value: String(totalFailed), icon: <CloseCircleOutlined />, color: '#ef4444', trend: -15 },
        { title: 'Scheduled Jobs', value: '18', icon: <ScheduleOutlined />, color: '#f59e0b', trend: 6 },
    ];

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = {
        background: isDark ? 'rgba(30,30,30,0.95)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
        borderRadius: 8, fontSize: 12,
    };
    const statusColor: Record<string, string> = { active: '#10b981', paused: '#f59e0b', error: '#ef4444' };
    const activityColor: Record<string, string> = { success: '#10b981', failed: '#ef4444', running: '#3b82f6', scheduled: '#94a3b8' };
    const platformColor: Record<string, string> = { n8n: '#3b82f6', Jenkins: '#8b5cf6', AWX: '#f59e0b' };
    const schedMax = Math.max(...scheduleGrid.flatMap(r => r.hours.map(h => h.count)), 1);
    const funnelMax = FUNNEL_STAGES[0].count;

    if (loading) return (
        <CMSLayout title="Automation Analytics" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Automation Analytics</AuroraText>}
            subTitle={<DecryptedText text="CI/CD pipeline analytics, workflow insights & automation health" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 1. KPI Cards */}
            <Row gutter={[12, 12]}>
                {kpis.map((k, i) => (
                    <Col key={i} xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${k.color}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{k.title}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace', lineHeight: 1.3 }}>{k.value}</div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: 16 }}>
                                        {k.icon}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    {k.trend > 0 ? <RiseOutlined style={{ color: k.title === 'Failed Runs' ? '#ef4444' : '#10b981', fontSize: 10 }} /> : <FallOutlined style={{ color: k.title === 'Failed Runs' ? '#10b981' : '#ef4444', fontSize: 10 }} />}
                                    <Text style={{ fontSize: 10, color: (k.title === 'Failed Runs' ? k.trend < 0 : k.trend > 0) ? '#10b981' : '#ef4444' }}>{Math.abs(k.trend)}%</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>vs last period</Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* 2. Execution Trend */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard} title={<><DashboardOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Execution Trend (30 Days)</Text></>}>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={execTrend}>
                                <defs>
                                    <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="cancelGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="day" tick={tickStyle} interval={4} />
                                <YAxis tick={tickStyle} />
                                <RTooltip contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="success" stackId="1" stroke="#10b981" fill="url(#successGrad)" strokeWidth={2} name="Success" />
                                <Area type="monotone" dataKey="failed" stackId="1" stroke="#ef4444" fill="url(#failedGrad)" strokeWidth={2} name="Failed" />
                                <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#94a3b8" fill="url(#cancelGrad)" strokeWidth={2} name="Cancelled" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* 3. Platform Health */}
            <Row gutter={[12, 12]}>
                {PLATFORM_HEALTH.map((p, i) => (
                    <Col key={p.name} xs={24} md={8}>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${platformColor[p.name]}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'green' ? '#10b981' : p.status === 'yellow' ? '#f59e0b' : '#ef4444' }} />
                                        <div style={{ color: platformColor[p.name], fontSize: 16 }}>{p.icon}</div>
                                        <Text strong style={{ fontSize: 14 }}>{p.name}</Text>
                                    </div>
                                    <Tag color={p.status === 'green' ? 'green' : p.status === 'yellow' ? 'orange' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                                        {p.status === 'green' ? 'Healthy' : p.status === 'yellow' ? 'Slow' : 'Down'}
                                    </Tag>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    {[
                                        { label: 'Workflows', value: p.workflows },
                                        { label: 'Active', value: `${p.activePct}%` },
                                        { label: 'Last Exec', value: p.lastExec },
                                    ].map(s => (
                                        <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                                            <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>{s.label}</Text>
                                            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: platformColor[p.name] }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* 4. Workflow Performance Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                <Card size="small" style={glassCard} title={<><PlayCircleOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Workflow Performance (Top 15)</Text></>}>
                    <Table dataSource={workflows} rowKey="key" size="small" pagination={false} columns={[
                        { title: 'Workflow', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Platform', dataIndex: 'platform', width: 90, render: (v: string) => <Tag color={v === 'n8n' ? 'blue' : v === 'Jenkins' ? 'purple' : 'orange'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}</Tag> },
                        { title: 'Runs (30d)', dataIndex: 'runs', width: 90, sorter: (a: any, b: any) => a.runs - b.runs, defaultSortOrder: 'descend' as const, render: (v: number) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace', color: '#3b82f6' }}>{v}</Text> },
                        { title: 'Success %', dataIndex: 'successPct', width: 90, render: (v: number) => <Text style={{ fontSize: 11, color: v >= 95 ? '#10b981' : v >= 85 ? '#f59e0b' : '#ef4444' }}>{v}%</Text> },
                        { title: 'Avg Duration', dataIndex: 'avgDuration', width: 100, render: (v: string) => <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Last Run', dataIndex: 'lastRun', width: 110, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'paused' ? 'orange' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>

            {/* 5. Duration Distribution + 6. Failure Analysis */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><FieldTimeOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Duration Distribution</Text></>}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer>
                                    <BarChart data={DURATION_BUCKETS}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="range" tick={tickStyle} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" name="Runs" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={glassCard} title={<><BugOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Failure Analysis</Text></>}>
                            <Row gutter={[16, 12]}>
                                <Col xs={24} md={12}>
                                    <Text type="secondary" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Top Failure Reasons</Text>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {FAILURE_REASONS.map((f, i) => {
                                            const maxCount = FAILURE_REASONS[0].count;
                                            return (
                                                <div key={f.reason} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Text style={{ fontSize: 10, width: 80, textAlign: 'right' }}>{f.reason}</Text>
                                                    <div style={{ flex: 1, height: 18, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', overflow: 'hidden' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }} animate={{ width: `${(f.count / maxCount) * 100}%` }}
                                                            transition={{ delay: 0.6 + i * 0.05 }}
                                                            style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, #ef4444, #f87171)` }}
                                                        />
                                                    </div>
                                                    <Text strong style={{ fontSize: 10, color: '#ef4444', minWidth: 20 }}>{f.count}</Text>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Text type="secondary" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Failure Trend (7 Days)</Text>
                                    <div style={{ height: 200 }}>
                                        <ResponsiveContainer>
                                            <LineChart data={failureTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                                <XAxis dataKey="day" tick={tickStyle} />
                                                <YAxis tick={tickStyle} />
                                                <RTooltip contentStyle={tooltipStyle} />
                                                <Line type="monotone" dataKey="failures" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Failures" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 7. Schedule Calendar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <Card size="small" style={glassCard} title={<><ScheduleOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Schedule Calendar (Weekly)</Text></>}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '42px repeat(24, 1fr)', gap: 2, minWidth: 600 }}>
                            <div />
                            {Array.from({ length: 24 }, (_, h) => (
                                <Text key={h} type="secondary" style={{ fontSize: 8, textAlign: 'center' }}>{h}</Text>
                            ))}
                            {scheduleGrid.map(row => (
                                <React.Fragment key={row.day}>
                                    <Text style={{ fontSize: 10, lineHeight: '20px' }}>{row.day}</Text>
                                    {row.hours.map((cell, h) => {
                                        const intensity = schedMax > 0 ? cell.count / schedMax : 0;
                                        return (
                                            <Tooltip key={h} title={cell.count > 0 ? `${row.day} ${h}:00 — ${cell.count} job${cell.count > 1 ? 's' : ''}: ${cell.jobs.join(', ')}` : `${row.day} ${h}:00 — No jobs`}>
                                                <div style={{
                                                    height: 20, borderRadius: 3,
                                                    background: cell.count > 0 ? `rgba(${isDark ? '245,158,11' : '217,119,6'}, ${0.15 + intensity * 0.75})` : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                                    cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                                                    {cell.count > 0 && <Text style={{ fontSize: 7, color: isDark ? '#fff' : '#78350f', fontWeight: 700 }}>{cell.count}</Text>}
                                                </div>
                                            </Tooltip>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                            <Text type="secondary" style={{ fontSize: 9 }}>Less</Text>
                            {[0.1, 0.3, 0.55, 0.8, 1].map((o, i) => (
                                <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(${isDark ? '245,158,11' : '217,119,6'}, ${o})` }} />
                            ))}
                            <Text type="secondary" style={{ fontSize: 9 }}>More</Text>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* 8. Resource Utilization + 9. Pipeline Stages Funnel */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={glassCard} title={<><FireOutlined style={{ color: '#ec4899' }} /> <Text strong style={{ fontSize: 13 }}>Resource Utilization (24h)</Text></>}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer>
                                    <LineChart data={resourceUsage}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="hour" tick={tickStyle} interval={3} />
                                        <YAxis yAxisId="left" tick={tickStyle} domain={[0, 100]} label={{ value: 'CPU %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: isDark ? '#aaa' : '#666' } }} />
                                        <YAxis yAxisId="right" orientation="right" tick={tickStyle} label={{ value: 'Memory MB', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: isDark ? '#aaa' : '#666' } }} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#ec4899" strokeWidth={2} dot={false} name="CPU %" />
                                        <Line yAxisId="right" type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Memory MB" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><FunnelPlotOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Pipeline Stages Funnel</Text></>}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                                {FUNNEL_STAGES.map((f, i) => (
                                    <motion.div
                                        key={f.stage}
                                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.75 + i * 0.08 }}
                                        style={{
                                            width: `${Math.max(30, Math.round((f.count / funnelMax) * 100))}%`, minWidth: 140,
                                            padding: '8px 14px', borderRadius: 8,
                                            background: `${f.color}18`, border: `1px solid ${f.color}30`,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{f.stage}</Text>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontSize: 14, fontWeight: 700, color: f.color }}>{f.count}</Text>
                                            {i > 0 && (
                                                <Tag style={{ fontSize: 9, margin: 0, borderRadius: 8 }} color={f.count / FUNNEL_STAGES[i - 1].count >= 0.9 ? 'green' : f.count / FUNNEL_STAGES[i - 1].count >= 0.7 ? 'orange' : 'red'}>
                                                    {Math.round((f.count / FUNNEL_STAGES[i - 1].count) * 100)}%
                                                </Tag>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    Overall completion: <Text strong style={{ color: '#10b981', fontSize: 12 }}>{Math.round((FUNNEL_STAGES[3].count / funnelMax) * 100)}%</Text>
                                    {' '}· Drop-off to failure: <Text strong style={{ color: '#ef4444', fontSize: 12 }}>{Math.round((FUNNEL_STAGES[4].count / funnelMax) * 100)}%</Text>
                                </Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 10. Recent Activity Timeline */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
                <Card size="small" style={glassCard} title={<><ClockCircleOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Recent Activity</Text></>}>
                    <Timeline items={timeline.map(t => ({
                        color: activityColor[t.status],
                        children: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <Text strong style={{ fontSize: 11 }}>{t.workflow}</Text>
                                <Tag color={platformColor[t.platform] === '#3b82f6' ? 'blue' : platformColor[t.platform] === '#8b5cf6' ? 'purple' : 'orange'} style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>{t.platform}</Tag>
                                <Tag color={t.status === 'success' ? 'green' : t.status === 'failed' ? 'red' : t.status === 'running' ? 'blue' : 'default'} style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>
                                    {t.status === 'success' ? <CheckCircleOutlined /> : t.status === 'failed' ? <CloseCircleOutlined /> : t.status === 'running' ? <PlayCircleOutlined /> : <ScheduleOutlined />} {t.status}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{t.duration}</Text>
                                <Text type="secondary" style={{ fontSize: 10 }}>{t.timestamp}</Text>
                            </div>
                        ),
                    }))} />
                </Card>
            </motion.div>

        </div>
        </CMSLayout>
    );
}
