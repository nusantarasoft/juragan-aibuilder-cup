"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, message, Segmented, Table, Tag, Empty, theme } from "antd";
import {
    DollarOutlined, RiseOutlined, FallOutlined, TrophyOutlined,
    ThunderboltOutlined, FunnelPlotOutlined, FieldTimeOutlined,
    PieChartOutlined, BarChartOutlined, LineChartOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell,
    Line, ComposedChart, Legend,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

const glass = { 
    background: 'rgba(255, 255, 255, 0.4)', 
    backdropFilter: 'blur(16px)', 
    border: '1px solid rgba(255, 255, 255, 0.5)', 
    borderRadius: 14,
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
};

interface Deal {
    id: string; dealName: string; amount: number; probability: number; stage: string;
    closeDate: string; priority: string; status: string; lostReason: string; wonReason: string;
    createdAt: string; updatedAt: string;
    account: { companyName: string } | null;
}

type Period = 'month' | 'quarter' | 'year' | 'all';

// ── Helpers ──────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const fmtShort = (v: number) => { if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`; return `$${v}`; };
const daysBetween = (a: string, b: string) => Math.max(1, Math.abs(dayjs(b).diff(dayjs(a), 'day')));

function filterByPeriod(deals: Deal[], period: Period): Deal[] {
    if (period === 'all') return deals;
    const now = dayjs();
    const start = period === 'month' ? now.startOf('month') : period === 'quarter' ? now.startOf('quarter') : now.startOf('year');
    return deals.filter(d => {
        const ref = d.closeDate ? dayjs(d.closeDate) : dayjs(d.createdAt);
        return ref.isAfter(start) || ref.isSame(start, 'day');
    });
}

// ── Funnel Stage Order ───────────────────────────────────
const STAGE_ORDER = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
const STAGE_LABELS: Record<string, string> = {
    prospecting: 'Prospecting', qualification: 'Qualification', proposal: 'Proposal',
    negotiation: 'Negotiation', closed_won: 'Closed Won', closed_lost: 'Closed Lost',
};
const FUNNEL_COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

// ── Deal Size Buckets ────────────────────────────────────
const SIZE_BUCKETS = [
    { label: '<$1K', min: 0, max: 1000, color: '#94a3b8' },
    { label: '$1K–5K', min: 1000, max: 5000, color: '#3b82f6' },
    { label: '$5K–25K', min: 5000, max: 25000, color: '#8b5cf6' },
    { label: '$25K–100K', min: 25000, max: 100000, color: '#f59e0b' },
    { label: '$100K+', min: 100000, max: Infinity, color: '#10b981' },
];

export default function SalesAnalyticsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('year');
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => {
        (async () => {
            try {
                const data = await gql(`
                    query($tenantId: String!) {
                        deals(tenantId: $tenantId) {
                            id dealName amount probability stage closeDate
                            priority status lostReason wonReason
                            createdAt updatedAt
                            account { companyName }
                        }
                    }
                `, { tenantId: DEFAULT_TENANT_ID });
                setDeals(data.deals || []);
            } catch (err: any) { message.error("Failed to load deals: " + err.message); }
            finally { setLoading(false); }
        })();
    }, []);

    // ── Computed analytics ──────────────────────────────
    const filtered = useMemo(() => filterByPeriod(deals, period), [deals, period]);
    const wonDeals = useMemo(() => filtered.filter(d => d.stage === 'closed_won'), [filtered]);
    const lostDeals = useMemo(() => filtered.filter(d => d.stage === 'closed_lost'), [filtered]);
    const openDeals = useMemo(() => filtered.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost'), [filtered]);

    const revenueWon = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const pipelineValue = openDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const weightedForecast = openDeals.reduce((s, d) => s + (d.amount || 0) * ((d.probability || 0) / 100), 0);
    const closedTotal = wonDeals.length + lostDeals.length;
    const winRate = closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : 0;
    const avgCycle = wonDeals.length > 0 ? Math.round(wonDeals.reduce((s, d) => s + daysBetween(d.createdAt, d.closeDate || d.updatedAt), 0) / wonDeals.length) : 0;
    const salesVelocity = avgCycle > 0 ? (pipelineValue * (winRate / 100)) / avgCycle : 0;

    // ── KPI cards data ──────────────────────────────────
    const kpis = [
        { title: 'Revenue Won', value: fmt(revenueWon), icon: <TrophyOutlined />, color: '#10b981', sub: `${wonDeals.length} deals closed` },
        { title: 'Pipeline Value', value: fmt(pipelineValue), icon: <FunnelPlotOutlined />, color: '#3b82f6', sub: `${openDeals.length} open deals` },
        { title: 'Weighted Forecast', value: fmt(weightedForecast), icon: <LineChartOutlined />, color: '#8b5cf6', sub: 'Probability-adjusted' },
        { title: 'Win Rate', value: `${winRate}%`, icon: winRate >= 50 ? <RiseOutlined /> : <FallOutlined />, color: winRate >= 50 ? '#10b981' : '#ef4444', sub: `${wonDeals.length}W / ${lostDeals.length}L` },
        { title: 'Avg Deal Cycle', value: `${avgCycle}d`, icon: <FieldTimeOutlined />, color: '#f59e0b', sub: 'Creation → Close' },
        { title: 'Sales Velocity', value: `${fmtShort(salesVelocity)}/d`, icon: <ThunderboltOutlined />, color: '#06b6d4', sub: 'Pipeline × WR / Cycle' },
    ];

    // ── Revenue Trend (monthly) ─────────────────────────
    const revenueTrend = useMemo(() => {
        const map: Record<string, { won: number; cum: number }> = {};
        const allWon = deals.filter(d => d.stage === 'closed_won').sort((a, b) => dayjs(a.closeDate || a.updatedAt).unix() - dayjs(b.closeDate || b.updatedAt).unix());
        allWon.forEach(d => {
            const key = dayjs(d.closeDate || d.updatedAt).format('YYYY-MM');
            if (!map[key]) map[key] = { won: 0, cum: 0 };
            map[key].won += d.amount || 0;
        });
        const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
        let cumulative = 0;
        return sorted.map(([month, v]) => {
            cumulative += v.won;
            const target = cumulative * 1.1; // 10% growth target line
            return { month: dayjs(month + '-01').format('MMM YY'), revenue: v.won, cumulative, target: Math.round(target) };
        });
    }, [deals]);

    // ── Pipeline Funnel ─────────────────────────────────
    const funnelData = useMemo(() => {
        const stages = STAGE_ORDER.filter(s => s !== 'closed_lost');
        const counts = stages.map(s => filtered.filter(d => d.stage === s).length);
        const maxCount = Math.max(...counts, 1);
        return stages.map((s, i) => ({
            stage: STAGE_LABELS[s] || s, count: counts[i],
            width: Math.max(20, Math.round((counts[i] / maxCount) * 100)),
            conversion: i > 0 && counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 100,
            color: FUNNEL_COLORS[i] || '#94a3b8',
        }));
    }, [filtered]);

    // ── Win/Loss monthly ────────────────────────────────
    const winLossData = useMemo(() => {
        const map: Record<string, { won: number; lost: number }> = {};
        filtered.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost').forEach(d => {
            const key = dayjs(d.closeDate || d.updatedAt).format('YYYY-MM');
            if (!map[key]) map[key] = { won: 0, lost: 0 };
            if (d.stage === 'closed_won') map[key].won++; else map[key].lost++;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({
            month: dayjs(m + '-01').format('MMM YY'), won: v.won, lost: v.lost,
            winRate: v.won + v.lost > 0 ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
        }));
    }, [filtered]);

    // ── Deal Size Distribution ──────────────────────────
    const sizeData = useMemo(() => SIZE_BUCKETS.map(b => ({
        name: b.label, count: filtered.filter(d => (d.amount || 0) >= b.min && (d.amount || 0) < b.max).length, color: b.color,
    })), [filtered]);

    // ── Top Accounts ────────────────────────────────────
    const topAccounts = useMemo(() => {
        const map: Record<string, { name: string; revenue: number; count: number }> = {};
        wonDeals.forEach(d => {
            const name = d.account?.companyName || 'Unknown';
            if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
            map[name].revenue += d.amount || 0; map[name].count++;
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }, [wonDeals]);

    // ── Loss Reasons ────────────────────────────────────
    const lossReasons = useMemo(() => {
        const map: Record<string, number> = {};
        lostDeals.forEach(d => { const r = d.lostReason || 'Not specified'; map[r] = (map[r] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [lostDeals]);

    // ── Forecast Table ──────────────────────────────────
    const forecastRows = useMemo(() => {
        const now = dayjs();
        return [0, 1, 2].map(offset => {
            const m = now.add(offset, 'month');
            const label = m.format('MMMM YYYY');
            const monthDeals = openDeals.filter(d => d.closeDate && dayjs(d.closeDate).isSame(m, 'month'));
            const pipeline = monthDeals.reduce((s, d) => s + (d.amount || 0), 0);
            const weighted = monthDeals.reduce((s, d) => s + (d.amount || 0) * ((d.probability || 0) / 100), 0);
            const pct = pipeline > 0 ? Math.round((weighted / pipeline) * 100) : 0;
            const confidence = pct >= 80 ? 'High' : pct >= 50 ? 'Medium' : 'Low';
            return { key: label, month: label, pipeline, weighted, expectedCount: monthDeals.length, confidence, pct };
        });
    }, [openDeals]);

    // ── Stage Revenue Breakdown ─────────────────────────
    const stageRevenue = useMemo(() => {
        const stages = STAGE_ORDER.filter(s => s !== 'closed_lost');
        return stages.map((s, i) => {
            const stageDeals = filtered.filter(d => d.stage === s);
            const total = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
            return {
                stage: STAGE_LABELS[s] || s,
                count: stageDeals.length,
                total,
                color: FUNNEL_COLORS[i] || '#94a3b8',
            };
        }).filter(s => s.count > 0);
    }, [filtered]);

    // ── Average Deal Size ───────────────────────────────
    const avgDealSize = filtered.length > 0
        ? filtered.reduce((s, d) => s + (d.amount || 0), 0) / filtered.length
        : 0;
    const largestDeal = filtered.reduce((max, d) => (d.amount || 0) > (max?.amount || 0) ? d : max, filtered[0]);

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

    if (loading) return (
        <CMSLayout title="Sales Analytics" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Sales Analytics</AuroraText>}
            subTitle={<DecryptedText text="Revenue analytics, win/loss analysis & forecasting" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Segmented
                    options={[
                        { label: 'This Month', value: 'month' },
                        { label: 'This Quarter', value: 'quarter' },
                        { label: 'This Year', value: 'year' },
                        { label: 'All Time', value: 'all' },
                    ]}
                    value={period}
                    onChange={v => setPeriod(v as Period)}
                    style={{ marginBottom: 4 }}
                />
            </motion.div>

            {/* KPI Cards */}
            <Row gutter={[12, 12]}>
                {kpis.map((k, i) => (
                    <Col key={i} xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${k.color}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{k.title}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace', lineHeight: 1.3 }}>
                                            {k.value}
                                        </div>
                                    </div>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: `${k.color}12`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: k.color, fontSize: 16,
                                    }}>
                                        {k.icon}
                                    </div>
                                </div>
                                <Text type="secondary" style={{ fontSize: 10 }}>{k.sub}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Quick Insights Bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${themeColor}` }} styles={{ body: { padding: '10px 16px' } }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Avg Deal Size</Text>
                            <Text strong style={{ fontSize: 14, fontFamily: 'monospace' }}>{fmt(avgDealSize)}</Text>
                        </div>
                        <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                        <div>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Largest Deal</Text>
                            <Text strong style={{ fontSize: 14, fontFamily: 'monospace' }}>
                                {largestDeal ? fmt(largestDeal.amount || 0) : '—'}
                            </Text>
                            {largestDeal && (
                                <Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>
                                    {largestDeal.dealName}
                                </Text>
                            )}
                        </div>
                        <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                        <div>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Total Deals</Text>
                            <Text strong style={{ fontSize: 14 }}>{filtered.length}</Text>
                        </div>
                        <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                        {stageRevenue.slice(0, 4).map((sr) => (
                            <div key={sr.stage}>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{sr.stage}</Text>
                                <Text strong style={{ fontSize: 13, color: sr.color }}>{sr.count}</Text>
                                <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                                    · {fmtShort(sr.total)}
                                </Text>
                            </div>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* Revenue Trend + Pipeline Funnel */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Card size="small" style={{ ...glassCard }}
                            title={<><LineChartOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Revenue Trend</Text></>}>
                            <div style={{ height: 280 }}>
                                {revenueTrend.length > 0 ? (
                                    <ResponsiveContainer>
                                        <AreaChart data={revenueTrend}>
                                            <defs>
                                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="month" tick={tickStyle} />
                                            <YAxis tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                            <RTooltip
                                                formatter={(v: number) => fmt(v)}
                                                contentStyle={tooltipStyle}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="#10b981"
                                                fill="url(#revGrad)" strokeWidth={2} name="Monthly Revenue" />
                                            <Line type="monotone" dataKey="target" stroke="#f59e0b"
                                                strokeDasharray="6 3" strokeWidth={1.5} dot={false} name="Target (+10%)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No revenue data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }}
                            title={<><FunnelPlotOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Pipeline Conversion Funnel</Text></>}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                                {funnelData.map((f, i) => (
                                    <motion.div
                                        key={f.stage}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.4 + i * 0.08 }}
                                        style={{
                                            width: `${f.width}%`, minWidth: 120,
                                            padding: '8px 14px', borderRadius: 8,
                                            background: `${f.color}18`,
                                            border: `1px solid ${f.color}30`,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{f.stage}</Text>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontSize: 14, fontWeight: 700, color: f.color }}>
                                                {f.count}
                                            </Text>
                                            {i > 0 && (
                                                <Tag
                                                    style={{ fontSize: 9, margin: 0, borderRadius: 8 }}
                                                    color={f.conversion >= 50 ? 'green' : f.conversion >= 25 ? 'orange' : 'red'}
                                                >
                                                    {f.conversion}%
                                                </Tag>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div style={{
                                marginTop: 8, padding: '8px 12px', borderRadius: 8,
                                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                textAlign: 'center',
                            }}>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    Overall conversion: <Text strong style={{ color: '#10b981', fontSize: 12 }}>
                                        {funnelData.length > 1 && funnelData[0].count > 0
                                            ? Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100)
                                            : 0}%
                                    </Text> from {funnelData[0]?.stage} → {funnelData[funnelData.length - 1]?.stage}
                                </Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Win/Loss + Deal Size */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={glassCard}
                            title={<><BarChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Win / Loss Analysis</Text></>}>
                            <div style={{ height: 260 }}>
                                {winLossData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <ComposedChart data={winLossData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="month" tick={tickStyle} />
                                            <YAxis yAxisId="left" tick={tickStyle} />
                                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={tickStyle} />
                                            <RTooltip contentStyle={tooltipStyle} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar yAxisId="left" dataKey="won" fill="#10b981" name="Won" radius={[4, 4, 0, 0]} barSize={18} />
                                            <Bar yAxisId="left" dataKey="lost" fill="#ef4444" name="Lost" radius={[4, 4, 0, 0]} barSize={18} />
                                            <Line yAxisId="right" type="monotone" dataKey="winRate"
                                                stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Win Rate %" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No closed deals yet" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }}
                            title={<><DollarOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Deal Size Distribution</Text></>}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer>
                                    <BarChart data={sizeData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis type="number" tick={tickStyle} />
                                        <YAxis dataKey="name" type="category" tick={tickStyle} width={70} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" name="Deals" radius={[0, 6, 6, 0]} barSize={22}>
                                            {sizeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Top Accounts + Loss Reasons */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={glassCard}
                            title={<><TrophyOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Top Accounts by Revenue</Text></>}>
                            {topAccounts.length > 0 ? (
                                <>
                                    <div style={{ height: 280 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={topAccounts} layout="vertical" margin={{ left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                                <YAxis dataKey="name" type="category" tick={tickStyle} width={110} />
                                                <RTooltip
                                                    formatter={(v: number) => fmt(v)}
                                                    contentStyle={tooltipStyle}
                                                />
                                                <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} barSize={20}>
                                                    {topAccounts.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', gap: 6,
                                        padding: '8px 0 0',
                                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                                    }}>
                                        {topAccounts.slice(0, 6).map((a, i) => (
                                            <Tag
                                                key={a.name}
                                                color={COLORS[i % COLORS.length]}
                                                style={{ fontSize: 10, borderRadius: 10, margin: 0 }}
                                            >
                                                {a.name}: {a.count} deal{a.count !== 1 ? 's' : ''}
                                            </Tag>
                                        ))}
                                    </div>
                                </>
                            ) : <Empty description="No won deals yet" />}
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }}
                            title={<><PieChartOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Loss Reason Analysis</Text></>}>
                            <div style={{ height: 300, position: 'relative' }}>
                                {lossReasons.length > 0 ? (
                                    <>
                                        <div style={{
                                            position: 'absolute', top: '50%', left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center', zIndex: 1, pointerEvents: 'none',
                                        }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>
                                                {lostDeals.length}
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 10 }}>Lost Deals</Text>
                                        </div>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={lossReasons} cx="50%" cy="50%"
                                                    innerRadius={55} outerRadius={90}
                                                    paddingAngle={3} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={{ stroke: '#999', strokeWidth: 1 }}
                                                >
                                                    {lossReasons.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </>
                                ) : <Empty description="No lost deals — great job! 🎉" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Sales Forecast Table */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card size="small" style={glassCard}
                    title={<><RiseOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Sales Forecast — Next 3 Months</Text></>}>
                    <Table
                        dataSource={forecastRows}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: 'Month', dataIndex: 'month', key: 'month',
                                render: (v: string) => <Text strong>{v}</Text>,
                            },
                            {
                                title: 'Pipeline Value', dataIndex: 'pipeline', key: 'pipeline',
                                align: 'right' as const,
                                render: (v: number) => (
                                    <Text style={{ fontFamily: 'monospace' }}>{fmt(v)}</Text>
                                ),
                            },
                            {
                                title: 'Weighted Forecast', dataIndex: 'weighted', key: 'weighted',
                                align: 'right' as const,
                                render: (v: number) => (
                                    <Text strong style={{ color: '#8b5cf6', fontFamily: 'monospace' }}>
                                        {fmt(v)}
                                    </Text>
                                ),
                            },
                            {
                                title: 'Expected Deals', dataIndex: 'expectedCount', key: 'expectedCount',
                                align: 'center' as const,
                                render: (v: number) => (
                                    <Tag color="blue" style={{ borderRadius: 10, margin: 0 }}>{v}</Tag>
                                ),
                            },
                            {
                                title: 'Confidence', dataIndex: 'confidence', key: 'confidence',
                                align: 'center' as const,
                                render: (v: string) => (
                                    <Tag
                                        color={v === 'High' ? 'green' : v === 'Medium' ? 'orange' : 'red'}
                                        style={{ borderRadius: 10, fontWeight: 600 }}
                                    >
                                        {v === 'High' ? '🟢' : v === 'Medium' ? '🟡' : '🔴'} {v}
                                    </Tag>
                                ),
                            },
                        ]}
                        summary={() => {
                            const totalPipeline = forecastRows.reduce((s, r) => s + r.pipeline, 0);
                            const totalWeighted = forecastRows.reduce((s, r) => s + r.weighted, 0);
                            const totalDeals = forecastRows.reduce((s, r) => s + r.expectedCount, 0);
                            return (
                                <Table.Summary.Row style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
                                }}>
                                    <Table.Summary.Cell index={0}>
                                        <Text strong style={{ fontSize: 12 }}>Total (3-Month)</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right">
                                        <Text strong style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                            {fmt(totalPipeline)}
                                        </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} align="right">
                                        <Text strong style={{ color: '#8b5cf6', fontFamily: 'monospace', fontSize: 12 }}>
                                            {fmt(totalWeighted)}
                                        </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} align="center">
                                        <Text strong>{totalDeals}</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={4} align="center">
                                        <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            );
                        }}
                    />
                </Card>
            </motion.div>

        </div>
        </CMSLayout>
    );
}
