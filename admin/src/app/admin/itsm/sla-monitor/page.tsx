"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { Card, Row, Col, Statistic, Tag, Table, Space, Progress, message, Typography, Button, Tooltip, Badge } from "antd";
import {
    AlertOutlined, CheckCircleOutlined, ClockCircleOutlined,
    WarningOutlined, ReloadOutlined, ThunderboltOutlined,
    DashboardOutlined, FieldTimeOutlined, ArrowUpOutlined,
    ArrowDownOutlined, FireOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
    ReferenceLine,
} from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_TICKETS = `query { itsmTickets { id ticketNumber title status priority impact urgency slaResponseDue slaResolutionDue slaBreached assignedTo assignedTeam categoryId reporterName createdAt updatedAt resolvedAt } }`;
const GET_SLA_POLICIES = `query { itsmSlaPolicies { id name priority responseTimeMinutes resolutionTimeMinutes escalationAfterMinutes } }`;
const GET_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalBreached totalDueToday byPriority byStatus avgResponseTime avgResolutionTime resolvedThisWeek slaComplianceRate } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const CHART_COLORS = ['#f5222d', '#fa8c16', '#1890ff', '#52c41a'];
const REFRESH_INTERVAL = 60_000;

/* ── risk helpers ─────────────────────────────────── */
type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function getMinutesRemaining(due: string | null): number {
    if (!due) return Infinity;
    return dayjs(due).diff(dayjs(), 'minute');
}

function getRiskLevel(minRemaining: number): RiskLevel {
    if (minRemaining < 15) return 'CRITICAL';
    if (minRemaining < 60) return 'HIGH';
    if (minRemaining < 240) return 'MEDIUM';
    return 'LOW';
}

const riskMeta: Record<RiskLevel, { color: string; tag: string }> = {
    CRITICAL: { color: '#f5222d', tag: 'red' },
    HIGH: { color: '#fa8c16', tag: 'orange' },
    MEDIUM: { color: '#fadb14', tag: 'gold' },
    LOW: { color: '#52c41a', tag: 'green' },
};

function fmtCountdown(min: number): string {
    if (min === Infinity) return '—';
    if (min <= 0) return 'BREACHED';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
}

function fmtMinutes(m: number): string {
    if (!m || m <= 0) return '—';
    if (m < 60) return `${Math.round(m)}m`;
    return `${(m / 60).toFixed(1)}h`;
}

/* ── component ────────────────────────────────────── */
export default function SlaMonitorPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const [secondsAgo, setSecondsAgo] = useState(0);

    /* ── data fetch ──────────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, p, s] = await Promise.all([gql(GET_TICKETS), gql(GET_SLA_POLICIES), gql(GET_STATS)]);
            setTickets(t.itsmTickets || []);
            setPolicies(p.itsmSlaPolicies || []);
            setStats(s.itsmDashboardStats || {});
            setLastRefresh(Date.now());
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    /* auto-refresh every 60s */
    useEffect(() => {
        const id = setInterval(loadData, REFRESH_INTERVAL);
        return () => clearInterval(id);
    }, [loadData]);

    /* "last updated X seconds ago" ticker */
    useEffect(() => {
        const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000)), 1000);
        return () => clearInterval(id);
    }, [lastRefresh]);

    /* ── computed data ───────────────────────────── */
    const complianceRate = stats?.slaComplianceRate ?? 0;
    const complianceColor = complianceRate >= 95 ? '#52c41a' : complianceRate >= 85 ? '#fadb14' : '#f5222d';

    const openTickets = useMemo(() => tickets.filter(t => !['resolved', 'closed'].includes(t.status)), [tickets]);
    const breachedCount = useMemo(() => openTickets.filter(t => t.slaBreached).length, [openTickets]);
    const withinSla = openTickets.length - breachedCount;

    const dueIn1Hour = useMemo(() => openTickets.filter(t => {
        const m = Math.min(getMinutesRemaining(t.slaResponseDue), getMinutesRemaining(t.slaResolutionDue));
        return m > 0 && m <= 60;
    }).length, [openTickets]);

    const dueToday = stats?.totalDueToday ?? 0;

    /* at-risk tickets (sorted by urgency) */
    const atRiskTickets = useMemo(() => {
        return openTickets
            .map(t => {
                const respMin = getMinutesRemaining(t.slaResponseDue);
                const resolMin = getMinutesRemaining(t.slaResolutionDue);
                const minRemaining = Math.min(respMin, resolMin);
                return { ...t, minRemaining, risk: getRiskLevel(minRemaining) };
            })
            .filter(t => t.minRemaining < Infinity)
            .sort((a, b) => a.minRemaining - b.minRemaining);
    }, [openTickets]);

    /* breach timeline (last 30 days) */
    const breachTimeline = useMemo(() => {
        const map: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) map[dayjs().subtract(i, 'day').format('MM/DD')] = 0;
        tickets.filter(t => t.slaBreached).forEach(t => {
            const key = dayjs(t.updatedAt || t.createdAt).format('MM/DD');
            if (map[key] !== undefined) map[key]++;
        });
        return Object.entries(map).map(([date, count]) => ({ date, count }));
    }, [tickets]);

    const avgBreaches = breachTimeline.length > 0
        ? +(breachTimeline.reduce((s, d) => s + d.count, 0) / breachTimeline.length).toFixed(1)
        : 0;

    /* compliance by priority (donut) */
    const complianceByPriority = useMemo(() => {
        const groups: Record<string, { total: number; ok: number }> = {};
        ['critical', 'high', 'medium', 'low'].forEach(p => (groups[p] = { total: 0, ok: 0 }));
        tickets.forEach(t => {
            const p = t.priority || 'medium';
            if (!groups[p]) return;
            groups[p].total++;
            if (!t.slaBreached) groups[p].ok++;
        });
        return Object.entries(groups).map(([key, v]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: v.total > 0 ? Math.round((v.ok / v.total) * 100) : 100,
            total: v.total,
        }));
    }, [tickets]);

    /* response vs resolution bar chart */
    const responseVsResolution = useMemo(() => {
        return ['critical', 'high', 'medium', 'low'].map(p => {
            const pol = policies.find(pl => pl.priority === p);
            const pTickets = tickets.filter(t => t.priority === p && t.resolvedAt);
            let avgResp = 0, avgResol = 0;
            if (pTickets.length > 0) {
                avgResp = pTickets.reduce((s, t) => s + dayjs(t.updatedAt).diff(dayjs(t.createdAt), 'minute'), 0) / pTickets.length;
                avgResol = pTickets.reduce((s, t) => s + dayjs(t.resolvedAt).diff(dayjs(t.createdAt), 'minute'), 0) / pTickets.length;
            }
            return {
                priority: p.charAt(0).toUpperCase() + p.slice(1),
                'Avg Response': Math.round(avgResp),
                'Avg Resolution': Math.round(avgResol),
                'Response Target': pol?.responseTimeMinutes || 0,
                'Resolution Target': pol?.resolutionTimeMinutes || 0,
            };
        });
    }, [tickets, policies]);

    /* ── KPI stats ───────────────────────────────── */
    const kpis = [
        { title: 'Active Tickets', value: openTickets.length, icon: <AlertOutlined />, color: themeColor },
        { title: 'SLA Breached', value: breachedCount, icon: <FireOutlined />, color: '#f5222d' },
        { title: 'Due in 1 Hour', value: dueIn1Hour, icon: <ExclamationCircleOutlined />, color: '#fa8c16' },
        { title: 'Due Today', value: dueToday, icon: <ClockCircleOutlined />, color: '#fadb14' },
        { title: 'Avg Response', value: fmtMinutes(stats?.avgResponseTime), icon: <ThunderboltOutlined />, color: '#1890ff' },
        { title: 'Avg Resolution', value: fmtMinutes(stats?.avgResolutionTime), icon: <FieldTimeOutlined />, color: '#722ed1' },
    ];

    /* ── table columns ───────────────────────────── */
    const columns = [
        { title: 'Ticket #', dataIndex: 'ticketNumber', width: 110, render: (v: string) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (v: string) => <Tag color={priorityColors[v]}>{(v || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color="geekblue">{(v || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Response Due', dataIndex: 'slaResponseDue', width: 130, render: (v: string) => v ? dayjs(v).format('MMM DD HH:mm') : '—' },
        { title: 'Resolution Due', dataIndex: 'slaResolutionDue', width: 130, render: (v: string) => v ? dayjs(v).format('MMM DD HH:mm') : '—' },
        {
            title: 'Time Left', key: 'remaining', width: 100, render: (_: any, r: any) => {
                const txt = fmtCountdown(r.minRemaining);
                const color = riskMeta[r.risk as RiskLevel]?.color || '#999';
                return <Text strong style={{ color, fontSize: 13 }}>{txt}</Text>;
            }
        },
        {
            title: 'Risk', key: 'risk', width: 100, render: (_: any, r: any) => {
                const meta = riskMeta[r.risk as RiskLevel];
                return (
                    <Tag color={meta.tag} style={r.risk === 'CRITICAL' ? { animation: 'pulse-red 1.5s infinite' } : undefined}>
                        {r.risk}
                    </Tag>
                );
            }
        },
    ];

    /* ── render ───────────────────────────────────── */
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#ef4444", "#fa8c16"]}>SLA Monitor</AuroraText>}
            subTitle={<DecryptedText text="Real-time SLA compliance & breach risk monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Tooltip key="ago" title="Auto-refreshes every 60 seconds">
                    <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                        <ClockCircleOutlined /> Updated {secondsAgo}s ago
                    </Text>
                </Tooltip>,
                <Button key="refresh" icon={<ReloadOutlined spin={loading} />} onClick={loadData}>Refresh</Button>,
            ]}
        >
            {ctx}
            {/* pulsing keyframe for CRITICAL tags */}
            <style>{`@keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>

            {/* ─── 1. SLA Health Score Hero Card ──────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card style={{ ...glass, marginBottom: 16, textAlign: 'center', borderTop: `3px solid ${complianceColor}` }} bodyStyle={{ padding: '28px 24px' }}>
                    <Row align="middle" justify="center" gutter={32}>
                        <Col>
                            <Progress
                                type="dashboard"
                                percent={complianceRate}
                                size={170}
                                strokeColor={complianceColor}
                                format={p => (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 36, fontWeight: 700, color: complianceColor }}>{p}%</div>
                                        <div style={{ fontSize: 11, color: '#999' }}>SLA Compliance</div>
                                    </div>
                                )}
                            />
                        </Col>
                        <Col>
                            <Space direction="vertical" size={4} align="start">
                                <Text strong style={{ fontSize: 20 }}>SLA Health Score</Text>
                                <Text type="secondary">{withinSla} of {openTickets.length} tickets within SLA</Text>
                                <Space size={4}>
                                    {complianceRate >= 85
                                        ? <Tag color="green" icon={<ArrowUpOutlined />}>Trending Up</Tag>
                                        : <Tag color="red" icon={<ArrowDownOutlined />}>Needs Attention</Tag>}
                                    <Badge count={`${stats?.resolvedThisWeek ?? 0} resolved this week`} style={{ backgroundColor: '#52c41a', fontSize: 10 }} />
                                </Space>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </motion.div>

            {/* ─── 2. KPI Stats Row ──────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {kpis.map((k, i) => (
                    <Col xs={12} sm={8} md={4} key={k.title}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${k.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                <Statistic
                                    title={<Text style={{ fontSize: 10 }}>{k.title}</Text>}
                                    value={k.value}
                                    prefix={k.icon}
                                    valueStyle={{ color: k.color, fontSize: 22 }}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── 3. At-Risk Tickets Table ──────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card
                    size="small"
                    title={<Space><FireOutlined style={{ color: '#f5222d' }} /> At-Risk Tickets <Badge count={atRiskTickets.length} style={{ backgroundColor: '#f5222d' }} /></Space>}
                    style={{ ...glass, marginBottom: 16 }}
                >
                    <Table
                        dataSource={atRiskTickets.slice(0, 15)}
                        columns={columns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        loading={loading}
                        scroll={{ x: 900 }}
                        onRow={(r) => ({ style: { cursor: 'pointer' }, onClick: () => router.push(`/admin/itsm/tickets/${r.id}`) })}
                    />
                </Card>
            </motion.div>

            {/* ─── 4 & 5. Charts Row ─────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {/* Breach Timeline */}
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card size="small" title={<Space><WarningOutlined style={{ color: '#f5222d' }} /> SLA Breach Timeline (30 days)</Space>} style={{ ...glass, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={breachTimeline}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                    <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                    <ReferenceLine y={avgBreaches} stroke="#fa8c16" strokeDasharray="4 4" label={{ value: `Avg ${avgBreaches}`, fill: '#fa8c16', fontSize: 10 }} />
                                    <Line type="monotone" dataKey="count" stroke="#f5222d" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} name="Breaches" />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>

                {/* Compliance Donut */}
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Card size="small" title={<Space><DashboardOutlined style={{ color: themeColor }} /> SLA by Priority</Space>} style={{ ...glass, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={complianceByPriority}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={90}
                                        paddingAngle={3}
                                        label={({ name, value }) => `${name} ${value}%`}
                                    >
                                        {complianceByPriority.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number, name: string, entry: any) => [`${v}% (${entry.payload.total} tickets)`, name]} />
                                    {/* center text */}
                                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 700, fill: complianceColor }}>
                                        {complianceRate}%
                                    </text>
                                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fill: '#999' }}>
                                        Overall
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 6. Response vs Resolution Bar ─────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card size="small" title={<Space><CheckCircleOutlined style={{ color: '#1890ff' }} /> Response vs Resolution Times (minutes)</Space>} style={{ ...glass, marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={responseVsResolution} barCategoryGap="25%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                            <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Avg Response" fill="#1890ff" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Avg Resolution" fill="#722ed1" radius={[4, 4, 0, 0]} />
                            {responseVsResolution.some(d => d['Response Target'] > 0) && (
                                <ReferenceLine y={responseVsResolution.reduce((s, d) => s + d['Response Target'], 0) / 4} stroke="#1890ff" strokeDasharray="4 4" label={{ value: 'Resp Target', fill: '#1890ff', fontSize: 9 }} />
                            )}
                            {responseVsResolution.some(d => d['Resolution Target'] > 0) && (
                                <ReferenceLine y={responseVsResolution.reduce((s, d) => s + d['Resolution Target'], 0) / 4} stroke="#722ed1" strokeDasharray="4 4" label={{ value: 'Resol Target', fill: '#722ed1', fontSize: 9 }} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
