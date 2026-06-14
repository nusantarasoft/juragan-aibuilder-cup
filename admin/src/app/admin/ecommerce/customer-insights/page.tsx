"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, Table, Tag, Drawer, Timeline, Badge, Tooltip, message, theme } from "antd";
import {
    TeamOutlined, UserAddOutlined, SyncOutlined, DollarOutlined,
    ShoppingCartOutlined, MailOutlined, PlusOutlined, EnvironmentOutlined,
    CrownOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Line, ComposedChart,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const fmtCurrency = (v: number) => v ? `$${v.toLocaleString()}` : '$0';

interface Customer {
    id: string; name: string; email: string; phone: string; customerType: string;
    totalOrders: number; totalSpent: number; loyaltyTier: string; tags: string[];
    address: string; city: string; createdAt: string; lastOrderDate: string;
}
interface Order {
    id: string; customerId: string; totalAmount: number; status: string;
    createdAt: string; completedAt: string;
}

const GET_CUSTOMERS = `query($tenantId: String!) {
    ecomCustomers(tenantId: $tenantId) {
        id name email phone customerType totalOrders totalSpent
        loyaltyTier tags address city createdAt lastOrderDate
    }
}`;
const GET_ORDERS = `query($tenantId: String!) {
    ecomOrders(tenantId: $tenantId) {
        id customerId totalAmount status createdAt completedAt
    }
}`;

// ── RFM helpers ──
function rfmScore(value: number, thresholds: number[]): number {
    if (value >= thresholds[3]) return 5;
    if (value >= thresholds[2]) return 4;
    if (value >= thresholds[1]) return 3;
    if (value >= thresholds[0]) return 2;
    return 1;
}

function getSegmentLabel(r: number, f: number, m: number): { label: string; color: string } {
    if (r >= 4 && f >= 4 && m >= 4) return { label: 'Champions', color: '#10b981' };
    if (f >= 4) return { label: 'Loyal', color: '#3b82f6' };
    if (r >= 4 && f <= 2) return { label: 'New', color: '#06b6d4' };
    if (r >= 3 && f >= 3) return { label: 'Potential', color: '#8b5cf6' };
    if (r <= 2 && f >= 3) return { label: 'At Risk', color: '#f59e0b' };
    if (r <= 2 && f <= 2) return { label: 'Lost', color: '#ef4444' };
    return { label: 'Others', color: '#94a3b8' };
}

const SEGMENT_ORDER = ['Champions', 'Loyal', 'Potential', 'New', 'At Risk', 'Lost', 'Others'];
const TIER_COLORS: Record<string, string> = { gold: '#f59e0b', silver: '#94a3b8', bronze: '#cd7f32', platinum: '#8b5cf6', vip: '#ef4444' };

export default function CustomerInsightsPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
    const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => {
        (async () => {
            try {
                const [cData, oData] = await Promise.all([
                    gql(GET_CUSTOMERS, { tenantId: DEFAULT_TENANT_ID }),
                    gql(GET_ORDERS, { tenantId: DEFAULT_TENANT_ID }),
                ]);
                setCustomers(cData.ecomCustomers || []);
                setOrders(oData.ecomOrders || []);
            } catch (err: any) { message.error("Failed to load data: " + err.message); }
            finally { setLoading(false); }
        })();
    }, []);

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    // ── KPI Calculations ──
    const now = dayjs();
    const thisMonth = customers.filter(c => dayjs(c.createdAt).isSame(now, 'month'));
    const returning = customers.filter(c => (c.totalOrders || 0) > 1);
    const returningRate = customers.length > 0 ? Math.round((returning.length / customers.length) * 100) : 0;
    const totalSpentAll = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const avgLTV = customers.length > 0 ? Math.round(totalSpentAll / customers.length) : 0;
    const totalOrdersAll = customers.reduce((s, c) => s + (c.totalOrders || 0), 0);
    const avgOrders = customers.length > 0 ? (totalOrdersAll / customers.length).toFixed(1) : '0';

    const kpis = [
        { title: 'Total Customers', value: customers.length.toLocaleString(), icon: <TeamOutlined />, color: themeColor },
        { title: 'New This Month', value: thisMonth.length.toLocaleString(), icon: <UserAddOutlined />, color: '#3b82f6' },
        { title: 'Returning Rate', value: `${returningRate}%`, icon: <SyncOutlined />, color: '#8b5cf6' },
        { title: 'Avg Lifetime Value', value: fmtCurrency(avgLTV), icon: <DollarOutlined />, color: '#10b981' },
        { title: 'Avg Orders/Customer', value: avgOrders, icon: <ShoppingCartOutlined />, color: '#f59e0b' },
    ];

    // ── RFM Analysis ──
    const rfmData = useMemo(() => {
        if (customers.length === 0) return { segments: {}, customerRFM: new Map() };
        const recencies = customers.map(c => c.lastOrderDate ? dayjs().diff(dayjs(c.lastOrderDate), 'day') : 999);
        const frequencies = customers.map(c => c.totalOrders || 0);
        const monetaries = customers.map(c => c.totalSpent || 0);
        const sortedR = [...recencies].sort((a, b) => a - b);
        const sortedF = [...frequencies].sort((a, b) => a - b);
        const sortedM = [...monetaries].sort((a, b) => a - b);
        const pct = (arr: number[], p: number) => arr[Math.floor(arr.length * p)] || 0;
        const rThresh = [pct(sortedR, 0.8), pct(sortedR, 0.6), pct(sortedR, 0.4), pct(sortedR, 0.2)]; // inverted: low days = high score
        const fThresh = [pct(sortedF, 0.2), pct(sortedF, 0.4), pct(sortedF, 0.6), pct(sortedF, 0.8)];
        const mThresh = [pct(sortedM, 0.2), pct(sortedM, 0.4), pct(sortedM, 0.6), pct(sortedM, 0.8)];

        const segments: Record<string, Customer[]> = {};
        const customerRFM = new Map<string, { r: number; f: number; m: number; label: string; color: string }>();
        customers.forEach((c, i) => {
            const rVal = 6 - rfmScore(recencies[i], rThresh); // invert: fewer days = higher score
            const fVal = rfmScore(frequencies[i], fThresh);
            const mVal = rfmScore(monetaries[i], mThresh);
            const seg = getSegmentLabel(rVal, fVal, mVal);
            if (!segments[seg.label]) segments[seg.label] = [];
            segments[seg.label].push(c);
            customerRFM.set(c.id, { r: rVal, f: fVal, m: mVal, ...seg });
        });
        return { segments, customerRFM };
    }, [customers]);

    // ── CLV Distribution ──
    const clvBuckets = useMemo(() => {
        const buckets = [
            { label: '$0', min: 0, max: 0.01, count: 0, color: '#94a3b8' },
            { label: '<$100', min: 0.01, max: 100, count: 0, color: '#3b82f6' },
            { label: '$100-500', min: 100, max: 500, count: 0, color: '#8b5cf6' },
            { label: '$500-2K', min: 500, max: 2000, count: 0, color: '#f59e0b' },
            { label: '$2K-10K', min: 2000, max: 10000, count: 0, color: '#10b981' },
            { label: '$10K+', min: 10000, max: Infinity, count: 0, color: '#ef4444' },
        ];
        customers.forEach(c => {
            const v = c.totalSpent || 0;
            const b = buckets.find(b => v >= b.min && v < b.max);
            if (b) b.count++;
        });
        return buckets;
    }, [customers]);

    // ── Growth Trend (12 months) ──
    const growthData = useMemo(() => {
        const map: Record<string, number> = {};
        const months: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const m = dayjs().subtract(i, 'month').format('YYYY-MM');
            months.push(m);
            map[m] = 0;
        }
        customers.forEach(c => {
            const m = dayjs(c.createdAt).format('YYYY-MM');
            if (map[m] !== undefined) map[m]++;
        });
        let cum = customers.filter(c => dayjs(c.createdAt).isBefore(dayjs().subtract(12, 'month'))).length;
        return months.map(m => {
            cum += map[m];
            return { month: dayjs(m + '-01').format('MMM YY'), newCustomers: map[m], cumulative: cum };
        });
    }, [customers]);

    // ── Segmentation Donut ──
    const segmentDonut = useMemo(() => {
        const map: Record<string, number> = {};
        customers.forEach(c => { const t = c.customerType || 'Unknown'; map[t] = (map[t] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    }, [customers]);

    // ── Top Customers ──
    const topCustomers = useMemo(() =>
        [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 20), [customers]);

    // ── Cohort Retention ──
    const cohortData = useMemo(() => {
        if (customers.length === 0 || orders.length === 0) return [];
        const cohorts: { month: string; m0: number; retention: number[] }[] = [];
        for (let i = 5; i >= 0; i--) {
            const cohortMonth = dayjs().subtract(i, 'month').format('YYYY-MM');
            const cohortCustomers = customers.filter(c => dayjs(c.createdAt).format('YYYY-MM') === cohortMonth);
            if (cohortCustomers.length === 0) { cohorts.push({ month: dayjs(cohortMonth + '-01').format('MMM YY'), m0: 0, retention: [] }); continue; }
            const ids = new Set(cohortCustomers.map(c => c.id));
            const retention: number[] = [];
            for (let j = 1; j <= Math.min(6, i); j++) {
                const targetMonth = dayjs(cohortMonth + '-01').add(j, 'month').format('YYYY-MM');
                const active = orders.filter(o => ids.has(o.customerId) && dayjs(o.createdAt).format('YYYY-MM') === targetMonth);
                const uniqueActive = new Set(active.map(o => o.customerId)).size;
                retention.push(Math.round((uniqueActive / cohortCustomers.length) * 100));
            }
            cohorts.push({ month: dayjs(cohortMonth + '-01').format('MMM YY'), m0: cohortCustomers.length, retention });
        }
        return cohorts;
    }, [customers, orders]);

    // ── Geographic Distribution ──
    const geoData = useMemo(() => {
        const map: Record<string, number> = {};
        customers.forEach(c => { if (c.city) map[c.city] = (map[c.city] || 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count]) => ({ city, count }));
    }, [customers]);

    // ── Drawer: customer orders ──
    const drawerOrders = useMemo(() =>
        drawerCustomer ? orders.filter(o => o.customerId === drawerCustomer.id).sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix()) : [],
    [drawerCustomer, orders]);

    const drawerRFM = drawerCustomer ? rfmData.customerRFM.get(drawerCustomer.id) : null;

    if (loading) return <CMSLayout title="Customer Insights"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    const segs = rfmData.segments as Record<string, Customer[]>;
    const segmentGrid = SEGMENT_ORDER.filter(s => segs[s]?.length);
    const filteredBySegment = selectedSegment && segs[selectedSegment] ? segs[selectedSegment] : null;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Customer Insights</AuroraText>}
            subTitle={<DecryptedText text="Customer segmentation, lifetime value & retention analysis" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI Cards */}
            <Row gutter={[12, 12]}>
                {kpis.map((k, i) => (
                    <Col key={i} xs={12} sm={8} md={4} lg={Math.floor(24 / 5)}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${k.color}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{k.title}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace', lineHeight: 1.3 }}>{k.value}</div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: 16 }}>{k.icon}</div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* RFM Analysis Grid */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard} title={<><CrownOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>RFM Segmentation</Text></>}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                        {segmentGrid.map(seg => {
                            const custs = segs[seg];
                            const segColor = getSegmentLabel(0, 0, 0).color;
                            const color = seg === 'Champions' ? '#10b981' : seg === 'Loyal' ? '#3b82f6' : seg === 'New' ? '#06b6d4' : seg === 'Potential' ? '#8b5cf6' : seg === 'At Risk' ? '#f59e0b' : seg === 'Lost' ? '#ef4444' : '#94a3b8';
                            const isActive = selectedSegment === seg;
                            return (
                                <motion.div key={seg} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedSegment(isActive ? null : seg)}
                                    style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', background: isActive ? `${color}20` : `${color}08`, border: `2px solid ${isActive ? color : `${color}25`}`, transition: 'all 0.2s' }}>
                                    <Text style={{ fontSize: 11, color, fontWeight: 600, display: 'block' }}>{seg}</Text>
                                    <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.3 }}>{custs.length}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{customers.length > 0 ? Math.round((custs.length / customers.length) * 100) : 0}% of total</Text>
                                </motion.div>
                            );
                        })}
                    </div>
                    {filteredBySegment && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 12 }}>
                            <Table dataSource={filteredBySegment.slice(0, 10)} rowKey="id" size="small" pagination={false}
                                columns={[
                                    { title: 'Name', dataIndex: 'name', render: (v: string, r: Customer) => <Text strong className="cursor-pointer" onClick={() => setDrawerCustomer(r)}>{v}</Text> },
                                    { title: 'Orders', dataIndex: 'totalOrders', width: 70 },
                                    { title: 'Total Spent', dataIndex: 'totalSpent', width: 120, render: (v: number) => <Text style={{ color: themeColor, fontFamily: 'monospace' }}>{fmtCurrency(v)}</Text> },
                                    { title: 'Last Order', dataIndex: 'lastOrderDate', width: 100, render: (v: string) => v ? dayjs(v).format('MMM DD') : '—' },
                                ]} />
                        </motion.div>
                    )}
                </Card>
            </motion.div>

            {/* CLV Distribution + Growth Trend */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={glassCard} title={<><DollarOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Customer Lifetime Value Distribution</Text></>}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer>
                                    <BarChart data={clvBuckets}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="label" tick={tickStyle} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" name="Customers" radius={[6, 6, 0, 0]} barSize={36}>
                                            {clvBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><UserAddOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Customer Growth Trend</Text></>}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={growthData}>
                                        <defs>
                                            <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="month" tick={tickStyle} />
                                        <YAxis yAxisId="left" tick={tickStyle} />
                                        <YAxis yAxisId="right" orientation="right" tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Area yAxisId="left" type="monotone" dataKey="newCustomers" stroke="#3b82f6" fill="url(#growGrad)" strokeWidth={2} name="New Customers" />
                                        <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Cumulative" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Segmentation Donut + Geographic */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><TeamOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Customer Segmentation</Text></>}>
                            <div style={{ height: 280, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: themeColor }}>{customers.length}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Total</Text>
                                </div>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={segmentDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                                            paddingAngle={3} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                            {segmentDonut.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><EnvironmentOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Geographic Distribution</Text></>}>
                            <div style={{ height: 280 }}>
                                {geoData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={geoData} layout="vertical" margin={{ left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis type="number" tick={tickStyle} />
                                            <YAxis dataKey="city" type="category" tick={tickStyle} width={90} />
                                            <RTooltip contentStyle={tooltipStyle} />
                                            <Bar dataKey="count" name="Customers" radius={[0, 6, 6, 0]} barSize={18}>
                                                {geoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div style={{ textAlign: 'center', padding: 60 }}><Text type="secondary">No city data available</Text></div>}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Top Customers Table */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                <Card size="small" style={glassCard} title={<><CrownOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Top 20 Customers by Lifetime Value</Text></>}>
                    <Table dataSource={topCustomers} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }}
                        onRow={(r) => ({ onClick: () => setDrawerCustomer(r), style: { cursor: 'pointer' } })}
                        columns={[
                            { title: 'Name', dataIndex: 'name', width: 150, render: (v: string) => <Text strong>{v}</Text> },
                            { title: 'Email', dataIndex: 'email', width: 180, ellipsis: true },
                            { title: 'Orders', dataIndex: 'totalOrders', width: 70, sorter: (a: Customer, b: Customer) => (a.totalOrders || 0) - (b.totalOrders || 0) },
                            { title: 'Total Spent', dataIndex: 'totalSpent', width: 120, sorter: (a: Customer, b: Customer) => (a.totalSpent || 0) - (b.totalSpent || 0),
                                render: (v: number) => <Text strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{fmtCurrency(v)}</Text> },
                            { title: 'Avg Order', key: 'avg', width: 100,
                                render: (_: unknown, r: Customer) => <Text style={{ fontFamily: 'monospace' }}>{r.totalOrders > 0 ? fmtCurrency(Math.round((r.totalSpent || 0) / r.totalOrders)) : '—'}</Text> },
                            { title: 'Last Order', dataIndex: 'lastOrderDate', width: 100, render: (v: string) => v ? dayjs(v).format('MMM DD, YY') : '—' },
                            { title: 'Segment', key: 'seg', width: 100,
                                render: (_: unknown, r: Customer) => { const s = rfmData.customerRFM.get(r.id); return s ? <Tag color={s.color} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{s.label}</Tag> : '—'; } },
                            { title: 'Tier', dataIndex: 'loyaltyTier', width: 90,
                                render: (v: string) => v ? <Tag color={TIER_COLORS[v?.toLowerCase()] || 'default'} style={{ borderRadius: 10, fontSize: 10, margin: 0, textTransform: 'capitalize' }}>{v}</Tag> : '—' },
                        ]} />
                </Card>
            </motion.div>

            {/* Cohort Retention Grid */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card size="small" style={glassCard} title={<><ClockCircleOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Cohort Retention Analysis</Text></>}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${gridStroke}` }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Cohort</Text>
                                    </th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${gridStroke}` }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Size</Text>
                                    </th>
                                    {[1, 2, 3, 4, 5, 6].map(m => (
                                        <th key={m} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${gridStroke}` }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>M{m}</Text>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cohortData.map((c, ri) => (
                                    <tr key={ri}>
                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${gridStroke}` }}>
                                            <Text strong style={{ fontSize: 12 }}>{c.month}</Text>
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${gridStroke}` }}>
                                            <Tag style={{ margin: 0, borderRadius: 8 }}>{c.m0}</Tag>
                                        </td>
                                        {[0, 1, 2, 3, 4, 5].map(ci => {
                                            const val = c.retention[ci];
                                            if (val === undefined) return <td key={ci} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${gridStroke}` }}><Text type="secondary" style={{ fontSize: 10 }}>—</Text></td>;
                                            const bg = val >= 60 ? 'rgba(16,185,129,0.2)' : val >= 30 ? 'rgba(245,158,11,0.15)' : val > 0 ? 'rgba(239,68,68,0.12)' : 'transparent';
                                            const textColor = val >= 60 ? '#10b981' : val >= 30 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <td key={ci} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${gridStroke}`, background: bg, borderRadius: 0 }}>
                                                    <Text strong style={{ fontSize: 12, color: textColor }}>{val}%</Text>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </motion.div>
        </div>

        {/* Customer Detail Drawer */}
        <Drawer open={!!drawerCustomer} onClose={() => setDrawerCustomer(null)} width={480}
            title={<Text strong style={{ fontSize: 16 }}>{drawerCustomer?.name}</Text>}>
            {drawerCustomer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Profile */}
                    <Card size="small" style={{ borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                            <div><Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Email</Text><Text>{drawerCustomer.email || '—'}</Text></div>
                            <div><Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Phone</Text><Text>{drawerCustomer.phone || '—'}</Text></div>
                            <div><Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Type</Text><Tag color="blue" style={{ borderRadius: 10, textTransform: 'capitalize' }}>{drawerCustomer.customerType || '—'}</Tag></div>
                            <div><Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Tier</Text><Tag color={TIER_COLORS[drawerCustomer.loyaltyTier?.toLowerCase()] || 'default'} style={{ borderRadius: 10, textTransform: 'capitalize' }}>{drawerCustomer.loyaltyTier || '—'}</Tag></div>
                            <div style={{ gridColumn: '1 / -1' }}><Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Address</Text><Text>{[drawerCustomer.address, drawerCustomer.city].filter(Boolean).join(', ') || '—'}</Text></div>
                        </div>
                    </Card>

                    {/* RFM Scores */}
                    {drawerRFM && (
                        <Card size="small" style={{ borderRadius: 12, borderLeft: `3px solid ${drawerRFM.color}` }}>
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>RFM Scores</Text>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[{ label: 'Recency', val: drawerRFM.r }, { label: 'Frequency', val: drawerRFM.f }, { label: 'Monetary', val: drawerRFM.m }].map(s => (
                                    <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#f0f0f0' }}>
                                        <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>{s.label}</Text>
                                        <Badge count={s.val} style={{ backgroundColor: s.val >= 4 ? '#10b981' : s.val >= 3 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                ))}
                                <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: `${drawerRFM.color}15` }}>
                                    <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>Segment</Text>
                                    <Tag color={drawerRFM.color} style={{ borderRadius: 10, margin: 0, fontSize: 10 }}>{drawerRFM.label}</Tag>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Order History */}
                    <Card size="small" style={{ borderRadius: 12 }} title={<Text strong style={{ fontSize: 12 }}>Order History ({drawerOrders.length})</Text>}>
                        {drawerOrders.length > 0 ? (
                            <Table dataSource={drawerOrders.slice(0, 10)} rowKey="id" size="small" pagination={false}
                                columns={[
                                    { title: 'Date', dataIndex: 'createdAt', width: 90, render: (v: string) => dayjs(v).format('MMM DD, YY') },
                                    { title: 'Amount', dataIndex: 'totalAmount', render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{fmtCurrency(v)}</Text> },
                                    { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'completed' ? 'green' : v === 'cancelled' ? 'red' : 'blue'} style={{ borderRadius: 10, fontSize: 10, margin: 0, textTransform: 'capitalize' }}>{v}</Tag> },
                                ]} />
                        ) : <Text type="secondary" style={{ fontSize: 12 }}>No orders yet</Text>}
                    </Card>

                    {/* Purchase Timeline */}
                    {drawerOrders.length > 0 && (
                        <Card size="small" style={{ borderRadius: 12 }} title={<Text strong style={{ fontSize: 12 }}>Purchase Timeline</Text>}>
                            <Timeline items={drawerOrders.slice(0, 6).map(o => ({
                                color: o.status === 'completed' ? 'green' : o.status === 'cancelled' ? 'red' : 'blue',
                                children: (
                                    <div>
                                        <Text style={{ fontSize: 12 }}>{fmtCurrency(o.totalAmount)}</Text>
                                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>{dayjs(o.createdAt).format('MMM DD, YYYY')}</Text>
                                    </div>
                                ),
                            }))} />
                        </Card>
                    )}

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Tooltip title="Create Order"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, color: '#fff', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <PlusOutlined /> Create Order
                        </motion.button></Tooltip>
                        <Tooltip title="Send Email"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d9d9d9'}`, cursor: 'pointer', background: 'transparent', color: isDark ? '#fff' : '#333', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <MailOutlined /> Send Email
                        </motion.button></Tooltip>
                    </div>
                </div>
            )}
        </Drawer>
        </CMSLayout>
    );
}
