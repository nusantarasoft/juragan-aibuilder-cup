"use client";

import React, { useState, useEffect, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { Card, Row, Col, Table, Space, Progress, message, Typography, Segmented, Tooltip, theme } from "antd";
import {
    ClockCircleOutlined, RiseOutlined, FallOutlined,
    ThunderboltOutlined, ReloadOutlined, FieldTimeOutlined,
    DashboardOutlined, FireOutlined, TeamOutlined, BarChartOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import dayjs from "dayjs";

const { Text } = Typography;

const GET_TICKETS = `query { itsmTickets { id ticketNumber title status priority impact urgency categoryId assignedTo assignedTeam reporterName slaResponseDue slaResolutionDue slaBreached createdAt updatedAt resolvedAt closedAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name parentId } }`;
const GET_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalBreached totalDueToday byPriority byStatus avgResponseTime avgResolutionTime resolvedThisWeek slaComplianceRate } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const PERIOD_OPTIONS = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HISTOGRAM_BUCKETS = ['<1h', '1-4h', '4-8h', '8-24h', '1-3d', '3-7d', '>7d'];
const HISTOGRAM_COLORS = ['#52c41a', '#73d13d', '#bae637', '#fadb14', '#fa8c16', '#f5222d', '#cf1322'];

function periodToDays(period: string): number {
    if (period === 'Last 7 Days') return 7;
    if (period === 'Last 30 Days') return 30;
    if (period === 'Last 90 Days') return 90;
    return 365;
}

function fmtDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return '—';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
    return `${(minutes / 1440).toFixed(1)}d`;
}

export default function IncidentAnalyticsPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === "#141414" || antToken.colorBgBase?.includes("14");
    const glass = {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.45)"}`,
        borderRadius: 14,
    };

    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [period, setPeriod] = useState('Last 30 Days');

    useEffect(() => {
        (async () => {
            try {
                const [t, c, s] = await Promise.all([gql(GET_TICKETS), gql(GET_CATEGORIES), gql(GET_STATS)]);
                setTickets(t.itsmTickets || []);
                setCategories(c.itsmCategories || []);
                setStats(s.itsmDashboardStats || {});
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    const cutoff = useMemo(() => dayjs().subtract(periodToDays(period), 'day'), [period]);
    const filtered = useMemo(() => tickets.filter(t => dayjs(t.createdAt).isAfter(cutoff)), [tickets, cutoff]);

    // ── KPI Computations ──────────────────────────────────
    const resolved = useMemo(() => filtered.filter(t => t.resolvedAt), [filtered]);
    const closed = useMemo(() => filtered.filter(t => t.status === 'closed' || t.status === 'resolved'), [filtered]);

    const mttr = useMemo(() => {
        if (resolved.length === 0) return 0;
        const total = resolved.reduce((s, t) => s + dayjs(t.resolvedAt).diff(dayjs(t.createdAt), 'minute'), 0);
        return total / resolved.length;
    }, [resolved]);

    const mtbf = useMemo(() => {
        if (filtered.length < 2) return 0;
        const sorted = [...filtered].sort((a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix());
        let totalGap = 0;
        for (let i = 1; i < sorted.length; i++) {
            totalGap += dayjs(sorted[i].createdAt).diff(dayjs(sorted[i - 1].createdAt), 'minute');
        }
        return totalGap / (sorted.length - 1);
    }, [filtered]);

    const avgFirstResponse = useMemo(() => {
        const withUpdate = filtered.filter(t => t.updatedAt && t.updatedAt !== t.createdAt);
        if (withUpdate.length === 0) return 0;
        const total = withUpdate.reduce((s, t) => s + dayjs(t.updatedAt).diff(dayjs(t.createdAt), 'minute'), 0);
        return total / withUpdate.length;
    }, [filtered]);

    const reopenedRate = useMemo(() => {
        const reopened = filtered.filter(t => t.status === 'open' && t.resolvedAt);
        return filtered.length > 0 ? (reopened.length / filtered.length) * 100 : 0;
    }, [filtered]);

    const resolutionRate = useMemo(() => {
        return filtered.length > 0 ? (closed.length / filtered.length) * 100 : 0;
    }, [filtered, closed]);

    const backlogGrowth = useMemo(() => {
        const created = filtered.length;
        const resolvedCount = resolved.length;
        return created - resolvedCount;
    }, [filtered, resolved]);

    const kpis = [
        { title: 'MTTR', value: fmtDuration(mttr), icon: <ClockCircleOutlined />, color: '#722ed1', sub: 'Mean Time to Resolve' },
        { title: 'MTBF', value: fmtDuration(mtbf), icon: <FieldTimeOutlined />, color: '#13c2c2', sub: 'Mean Time Between Failures' },
        { title: 'First Response', value: fmtDuration(avgFirstResponse), icon: <ThunderboltOutlined />, color: '#1890ff', sub: 'Avg first response time' },
        { title: 'Reopened Rate', value: `${reopenedRate.toFixed(1)}%`, icon: <ReloadOutlined />, color: '#fa8c16', sub: 'Resolved → reopened' },
        { title: 'Resolution Rate', value: `${resolutionRate.toFixed(1)}%`, icon: <DashboardOutlined />, color: '#52c41a', sub: `${closed.length} of ${filtered.length}` },
        { title: 'Backlog Growth', value: `${backlogGrowth >= 0 ? '+' : ''}${backlogGrowth}`, icon: backlogGrowth > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />, color: backlogGrowth > 0 ? '#f5222d' : '#52c41a', sub: 'New minus resolved' },
    ];

    // ── Incident Volume Trend ─────────────────────────────
    const volumeTrend = useMemo(() => {
        const days = periodToDays(period);
        const useWeekly = days > 30;
        const buckets: Record<string, { created: number; resolved: number }> = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = dayjs().subtract(i, 'day');
            const key = useWeekly ? d.startOf('week').format('MM/DD') : d.format('MM/DD');
            if (!buckets[key]) buckets[key] = { created: 0, resolved: 0 };
        }
        filtered.forEach(t => {
            const key = useWeekly ? dayjs(t.createdAt).startOf('week').format('MM/DD') : dayjs(t.createdAt).format('MM/DD');
            if (buckets[key]) buckets[key].created++;
        });
        resolved.forEach(t => {
            const key = useWeekly ? dayjs(t.resolvedAt).startOf('week').format('MM/DD') : dayjs(t.resolvedAt).format('MM/DD');
            if (buckets[key]) buckets[key].resolved++;
        });
        return Object.entries(buckets).map(([date, v]) => ({ date, Created: v.created, Resolved: v.resolved }));
    }, [period, filtered, resolved]);

    // ── Category Breakdown ────────────────────────────────
    const categoryBreakdown = useMemo(() => {
        const catMap: Record<string, string> = {};
        categories.forEach(c => { catMap[c.id] = c.name; });
        const counts: Record<string, number> = {};
        filtered.forEach(t => {
            const name = catMap[t.categoryId] || 'Uncategorized';
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filtered, categories]);

    // ── Priority Distribution (Donut) ─────────────────────
    const priorityDist = useMemo(() => {
        const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
        filtered.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
        return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: priorityColors[name] }));
    }, [filtered]);

    // ── Resolution Time Histogram ─────────────────────────
    const resolutionHistogram = useMemo(() => {
        const buckets = [0, 0, 0, 0, 0, 0, 0];
        resolved.forEach(t => {
            const mins = dayjs(t.resolvedAt).diff(dayjs(t.createdAt), 'minute');
            if (mins < 60) buckets[0]++;
            else if (mins < 240) buckets[1]++;
            else if (mins < 480) buckets[2]++;
            else if (mins < 1440) buckets[3]++;
            else if (mins < 4320) buckets[4]++;
            else if (mins < 10080) buckets[5]++;
            else buckets[6]++;
        });
        return HISTOGRAM_BUCKETS.map((label, i) => ({ bucket: label, count: buckets[i], fill: HISTOGRAM_COLORS[i] }));
    }, [resolved]);

    // ── Top Assignees ─────────────────────────────────────
    const topAssignees = useMemo(() => {
        const map: Record<string, { assigned: number; resolved: number; totalResolTime: number; slaOk: number }> = {};
        filtered.forEach(t => {
            const name = t.assignedTo || 'Unassigned';
            if (!map[name]) map[name] = { assigned: 0, resolved: 0, totalResolTime: 0, slaOk: 0 };
            map[name].assigned++;
            if (t.resolvedAt) {
                map[name].resolved++;
                map[name].totalResolTime += dayjs(t.resolvedAt).diff(dayjs(t.createdAt), 'minute');
            }
            if (!t.slaBreached) map[name].slaOk++;
        });
        return Object.entries(map)
            .filter(([name]) => name !== 'Unassigned')
            .map(([name, v]) => ({
                name, assigned: v.assigned, resolved: v.resolved,
                avgResol: v.resolved > 0 ? v.totalResolTime / v.resolved : 0,
                compliance: v.assigned > 0 ? Math.round((v.slaOk / v.assigned) * 100) : 100,
            }))
            .sort((a, b) => b.resolved - a.resolved)
            .slice(0, 10);
    }, [filtered]);

    const assigneeCols = [
        { title: 'Assignee', dataIndex: 'name', ellipsis: true },
        { title: 'Assigned', dataIndex: 'assigned', width: 80, sorter: (a: any, b: any) => a.assigned - b.assigned },
        { title: 'Resolved', dataIndex: 'resolved', width: 80, sorter: (a: any, b: any) => a.resolved - b.resolved },
        { title: 'Avg Resolution', dataIndex: 'avgResol', width: 120, render: (v: number) => fmtDuration(v) },
        {
            title: 'SLA Compliance', dataIndex: 'compliance', width: 160,
            render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 90 ? '#52c41a' : v >= 70 ? '#fa8c16' : '#f5222d'} format={p => `${p}%`} />,
        },
    ];

    // ── Hourly Heatmap ────────────────────────────────────
    const heatmapData = useMemo(() => {
        const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
        filtered.forEach(t => {
            const d = dayjs(t.createdAt);
            const dow = (d.day() + 6) % 7; // Mon=0
            grid[dow][d.hour()]++;
        });
        return grid;
    }, [filtered]);

    const heatmapMax = useMemo(() => Math.max(1, ...heatmapData.flat()), [heatmapData]);

    const chartTextColor = isDark ? 'rgba(255,255,255,0.65)' : '#666';
    const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#3b82f6", "#8b5cf6"]}>Incident Analytics</AuroraText>}
            subTitle={<DecryptedText text="Comprehensive incident metrics & operational intelligence" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            {ctx}

            {/* ─── 1. Time Period Selector ──────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
                <Segmented
                    options={PERIOD_OPTIONS}
                    value={period}
                    onChange={v => setPeriod(v as string)}
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)', borderRadius: 10 }}
                />
                <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                    {filtered.length} incidents in period
                </Text>
            </motion.div>

            {/* ─── 2. KPI Cards ────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {kpis.map((k, i) => (
                    <Col xs={12} sm={8} md={4} key={k.title}>
                        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${k.color}`, overflow: 'hidden' }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ color: k.color, fontSize: 16 }}>{k.icon}</span>
                                    <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>{k.title}</Text>
                                </div>
                                <Text strong style={{ fontSize: 22, color: k.color, display: 'block', lineHeight: 1.2 }}>{k.value}</Text>
                                <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#bbb' }}>{k.sub}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── 3. Incident Volume + 4. Category ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={16}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card size="small" title={<Space><RiseOutlined style={{ color: themeColor }} /> Incident Volume Trend</Space>} style={{ ...glass, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={volumeTrend}>
                                    <defs>
                                        <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#52c41a" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTextColor }} interval="preserveStartEnd" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12, background: isDark ? '#1f1f1f' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eee'}` }} />
                                    <Area type="monotone" dataKey="Created" stroke="#1890ff" strokeWidth={2} fill="url(#gradCreated)" />
                                    <Area type="monotone" dataKey="Resolved" stroke="#52c41a" strokeWidth={2} fill="url(#gradResolved)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Card size="small" title={<Space><BarChartOutlined style={{ color: themeColor }} /> Top Categories</Space>} style={{ ...glass, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: chartTextColor }} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: chartTextColor }} width={90} />
                                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12, background: isDark ? '#1f1f1f' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eee'}` }} />
                                    <Bar dataKey="count" fill={themeColor} radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 10, fill: chartTextColor }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 5. Priority Donut + 6. Resolution Histogram ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card size="small" title={<Space><FireOutlined style={{ color: '#f5222d' }} /> Priority Distribution</Space>} style={{ ...glass, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={priorityDist}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={100}
                                        paddingAngle={3}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {priorityDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12, background: isDark ? '#1f1f1f' : '#fff' }} />
                                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 26, fontWeight: 700, fill: isDark ? '#fff' : '#333' }}>
                                        {filtered.length}
                                    </text>
                                    <text x="50%" y="57%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>
                                        Total
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <Card size="small" title={<Space><ClockCircleOutlined style={{ color: '#722ed1' }} /> Resolution Time Distribution</Space>} style={{ ...glass, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={resolutionHistogram}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: chartTextColor }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12, background: isDark ? '#1f1f1f' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eee'}` }} />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 10, fill: chartTextColor }}>
                                        {resolutionHistogram.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 7. Top Assignees Table ──────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card
                    size="small"
                    title={<Space><TeamOutlined style={{ color: themeColor }} /> Top Assignees</Space>}
                    style={{ ...glass, marginBottom: 16 }}
                >
                    <Table
                        dataSource={topAssignees}
                        columns={assigneeCols}
                        rowKey="name"
                        size="small"
                        pagination={false}
                        loading={loading}
                        scroll={{ x: 600 }}
                    />
                </Card>
            </motion.div>

            {/* ─── 8. Hourly Heatmap ───────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <Card
                    size="small"
                    title={<Space><FallOutlined style={{ color: '#9254de' }} /> Incident Heatmap — When Incidents Occur</Space>}
                    style={{ ...glass }}
                >
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(24, 1fr)`, gap: 2, minWidth: 700 }}>
                            {/* Header row */}
                            <div />
                            {HOURS.map(h => (
                                <div key={h} style={{ textAlign: 'center', fontSize: 9, color: isDark ? 'rgba(255,255,255,0.4)' : '#999', padding: '4px 0' }}>
                                    {h.toString().padStart(2, '0')}
                                </div>
                            ))}

                            {/* Data rows */}
                            {DAYS_OF_WEEK.map((day, rowIdx) => (
                                <React.Fragment key={day}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.6)' : '#666', display: 'flex', alignItems: 'center' }}>
                                        {day}
                                    </div>
                                    {HOURS.map(h => {
                                        const val = heatmapData[rowIdx]?.[h] || 0;
                                        const intensity = val / heatmapMax;
                                        return (
                                            <Tooltip key={h} title={`${day} ${h.toString().padStart(2, '0')}:00 — ${val} incident${val !== 1 ? 's' : ''}`}>
                                                <div
                                                    style={{
                                                        borderRadius: 3,
                                                        aspectRatio: '1',
                                                        minHeight: 18,
                                                        background: val === 0
                                                            ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                                                            : `rgba(${isDark ? '139,92,246' : '114,46,209'}, ${0.15 + intensity * 0.85})`,
                                                        cursor: 'default',
                                                        transition: 'background 0.2s',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 8,
                                                        color: intensity > 0.5 ? '#fff' : 'transparent',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {val > 0 ? val : ''}
                                                </div>
                                            </Tooltip>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Heatmap legend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
                        <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>Less</Text>
                        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                            <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(${isDark ? '139,92,246' : '114,46,209'}, ${v})` }} />
                        ))}
                        <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>More</Text>
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
