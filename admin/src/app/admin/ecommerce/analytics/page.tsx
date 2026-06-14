"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, Segmented, Table, Tag, Empty, Switch, Tooltip, theme } from "antd";
import {
    DollarOutlined, ShoppingCartOutlined, RiseOutlined, FallOutlined,
    UserOutlined, UndoOutlined, PercentageOutlined, BarChartOutlined,
    PieChartOutlined, HeatMapOutlined, TrophyOutlined, CalendarOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell,
    Treemap, ReferenceLine, Legend,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const FUNNEL_COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmt = (v: number) => v ? `Rp ${v.toLocaleString('id-ID')}` : 'Rp 0';
const fmtShort = (v: number) => { if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}B`; if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `Rp ${(v / 1e3).toFixed(0)}K`; return `Rp ${v}`; };

type Period = 'today' | '7d' | '30d' | '90d' | 'year';
interface Order { id: string; orderNumber: string; status: string; totalAmount: number; subtotal: number; tax: number; shippingCost: number; discount: number; paymentMethod: string; paymentStatus: string; customerId: string; shippingAddress: string; fulfillmentType: string; createdAt: string; updatedAt: string; completedAt: string; }
interface OrderItem { id: string; orderId: string; itemId: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number; category: string; sku: string; }
interface Customer { id: string; name: string; email: string; phone: string; customerType: string; totalOrders: number; totalSpent: number; createdAt: string; lastOrderDate: string; }

const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90, year: 365 };

function filterByPeriod<T extends { createdAt: string }>(items: T[], period: Period): T[] {
    const start = dayjs().subtract(PERIOD_DAYS[period], 'day').startOf('day');
    return items.filter(i => dayjs(i.createdAt).isAfter(start));
}
function filterPrevPeriod<T extends { createdAt: string }>(items: T[], period: Period): T[] {
    const days = PERIOD_DAYS[period];
    const end = dayjs().subtract(days, 'day').startOf('day');
    const start = end.subtract(days, 'day');
    return items.filter(i => { const d = dayjs(i.createdAt); return d.isAfter(start) && d.isBefore(end); });
}

const GET_ORDERS = `query($tenantId: String!) { ecomOrders(tenantId: $tenantId) { id orderNumber status totalAmount subtotal tax shippingCost discount paymentMethod paymentStatus customerId shippingAddress fulfillmentType createdAt updatedAt completedAt } }`;
const GET_ORDER_ITEMS = `query($tenantId: String!) { ecomOrderItems(tenantId: $tenantId) { id orderId itemId itemName quantity unitPrice totalPrice category sku } }`;
const GET_CUSTOMERS = `query($tenantId: String!) { ecomCustomers(tenantId: $tenantId) { id name email phone customerType totalOrders totalSpent createdAt lastOrderDate } }`;
const GET_STATS = `query($tenantId: String!) { ecomStats(tenantId: $tenantId) }`;

export default function SalesAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [period, setPeriod] = useState<Period>('30d');
    const [compare, setCompare] = useState(false);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => {
        const vars = { tenantId: DEFAULT_TENANT_ID };
        Promise.allSettled([
            gql(GET_ORDERS, vars), gql(GET_ORDER_ITEMS, vars),
            gql(GET_CUSTOMERS, vars), gql(GET_STATS, vars),
        ]).then(([o, i, c, s]) => {
            if (o.status === 'fulfilled') setOrders((o.value as any).ecomOrders || []);
            if (i.status === 'fulfilled') setItems((i.value as any).ecomOrderItems || []);
            if (c.status === 'fulfilled') setCustomers((c.value as any).ecomCustomers || []);
            if (s.status === 'fulfilled') setStats((s.value as any).ecomStats);
        }).finally(() => setLoading(false));
    }, []);

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    // Filtered data
    const cur = useMemo(() => filterByPeriod(orders, period), [orders, period]);
    const prev = useMemo(() => filterPrevPeriod(orders, period), [orders, period]);
    const curValid = useMemo(() => cur.filter(o => o.status !== 'cancelled' && o.status !== 'refunded'), [cur]);
    const prevValid = useMemo(() => prev.filter(o => o.status !== 'cancelled' && o.status !== 'refunded'), [prev]);
    const curItemIds = useMemo(() => new Set(cur.map(o => o.id)), [cur]);
    const curItems = useMemo(() => items.filter(i => curItemIds.has(i.orderId)), [items, curItemIds]);

    // KPIs
    const totalRevenue = curValid.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const prevRevenue = prevValid.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const ordersCount = curValid.length;
    const prevOrdersCount = prevValid.length;
    const avgOrder = ordersCount > 0 ? totalRevenue / ordersCount : 0;
    const prevAvg = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;
    const uniqueCustomers = new Set(cur.map(o => o.customerId)).size;
    const conversionRate = customers.length > 0 ? (uniqueCustomers / customers.length) * 100 : 0;
    const prevUniqueCustomers = new Set(prev.map(o => o.customerId)).size;
    const prevConversion = customers.length > 0 ? (prevUniqueCustomers / customers.length) * 100 : 0;
    const repeatCustomers = useMemo(() => {
        const cMap: Record<string, number> = {};
        cur.forEach(o => { cMap[o.customerId] = (cMap[o.customerId] || 0) + 1; });
        const repeats = Object.values(cMap).filter(c => c > 1).length;
        return uniqueCustomers > 0 ? (repeats / uniqueCustomers) * 100 : 0;
    }, [cur, uniqueCustomers]);
    const prevRepeat = useMemo(() => {
        const cMap: Record<string, number> = {};
        prev.forEach(o => { cMap[o.customerId] = (cMap[o.customerId] || 0) + 1; });
        const repeats = Object.values(cMap).filter(c => c > 1).length;
        return prevUniqueCustomers > 0 ? (repeats / prevUniqueCustomers) * 100 : 0;
    }, [prev, prevUniqueCustomers]);
    const refundRate = cur.length > 0 ? (cur.filter(o => o.status === 'refunded').length / cur.length) * 100 : 0;
    const prevRefundRate = prev.length > 0 ? (prev.filter(o => o.status === 'refunded').length / prev.length) * 100 : 0;

    const trendPct = (curr: number, prv: number) => prv > 0 ? ((curr - prv) / prv) * 100 : curr > 0 ? 100 : 0;
    const kpis = [
        { title: 'Total Revenue', value: fmtShort(totalRevenue), icon: <DollarOutlined />, color: '#10b981', trend: trendPct(totalRevenue, prevRevenue) },
        { title: 'Orders Count', value: ordersCount.toString(), icon: <ShoppingCartOutlined />, color: '#3b82f6', trend: trendPct(ordersCount, prevOrdersCount) },
        { title: 'Avg Order Value', value: fmtShort(avgOrder), icon: <BarChartOutlined />, color: '#8b5cf6', trend: trendPct(avgOrder, prevAvg) },
        { title: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, icon: <PercentageOutlined />, color: '#f59e0b', trend: trendPct(conversionRate, prevConversion) },
        { title: 'Repeat Customer', value: `${repeatCustomers.toFixed(1)}%`, icon: <UserOutlined />, color: '#06b6d4', trend: trendPct(repeatCustomers, prevRepeat) },
        { title: 'Refund Rate', value: `${refundRate.toFixed(1)}%`, icon: <UndoOutlined />, color: '#ef4444', trend: trendPct(refundRate, prevRefundRate), invertColor: true },
    ];

    // Revenue trend
    const revenueTrend = useMemo(() => {
        const map: Record<string, { revenue: number; prev: number }> = {};
        const days = PERIOD_DAYS[period];
        const groupBy = days <= 7 ? 'day' : days <= 90 ? 'day' : 'week';
        curValid.forEach(o => {
            const key = groupBy === 'week' ? dayjs(o.createdAt).startOf('week').format('MM/DD') : dayjs(o.createdAt).format('MM/DD');
            if (!map[key]) map[key] = { revenue: 0, prev: 0 };
            map[key].revenue += o.totalAmount || 0;
        });
        if (compare) prevValid.forEach(o => {
            const shifted = dayjs(o.createdAt).add(days, 'day');
            const key = groupBy === 'week' ? shifted.startOf('week').format('MM/DD') : shifted.format('MM/DD');
            if (!map[key]) map[key] = { revenue: 0, prev: 0 };
            map[key].prev += o.totalAmount || 0;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, revenue: v.revenue, prev: v.prev }));
    }, [curValid, prevValid, period, compare]);

    // Category treemap
    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        curItems.forEach(i => { const cat = i.category || 'Uncategorized'; map[cat] = (map[cat] || 0) + (i.totalPrice || 0); });
        return Object.entries(map).map(([name, value], i) => ({ name, size: value, fill: COLORS[i % COLORS.length] })).sort((a, b) => b.size - a.size);
    }, [curItems]);

    // Order funnel
    const FUNNEL_STAGES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'];
    const funnelData = useMemo(() => {
        const counts = FUNNEL_STAGES.map(s => cur.filter(o => o.status === s).length);
        const cumulative: number[] = [];
        FUNNEL_STAGES.forEach((_, i) => { cumulative.push(counts.slice(i).reduce((a, b) => a + b, 0) + (i > 0 ? counts.slice(0, i).reduce((a, b) => a + b, 0) - cumulative[0] + counts[0] : 0)); });
        const stageTotals = FUNNEL_STAGES.map((s, i) => {
            const ordered = cur.filter(o => FUNNEL_STAGES.indexOf(o.status) >= i).length;
            return ordered;
        });
        const max = Math.max(...stageTotals, 1);
        return FUNNEL_STAGES.map((s, i) => ({
            stage: s.charAt(0).toUpperCase() + s.slice(1), count: stageTotals[i],
            width: Math.max(25, Math.round((stageTotals[i] / max) * 100)),
            dropoff: i > 0 && stageTotals[i - 1] > 0 ? Math.round((1 - stageTotals[i] / stageTotals[i - 1]) * 100) : 0,
            color: FUNNEL_COLORS[i],
        }));
    }, [cur]);

    // Hourly heatmap
    const heatmapData = useMemo(() => {
        const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        cur.forEach(o => { if (o.createdAt) { const d = dayjs(o.createdAt); grid[d.day()][d.hour()]++; } });
        const max = Math.max(...grid.flat(), 1);
        return { grid, max };
    }, [cur]);

    // Top products
    const topProducts = useMemo(() => {
        const map: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};
        curItems.forEach(i => {
            const key = i.itemId || i.itemName;
            if (!map[key]) map[key] = { name: i.itemName, sku: i.sku || '-', units: 0, revenue: 0 };
            map[key].units += i.quantity || 0;
            map[key].revenue += i.totalPrice || 0;
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }, [curItems]);
    const topMaxRevenue = topProducts.length > 0 ? topProducts[0].revenue : 1;

    // Payment methods
    const paymentData = useMemo(() => {
        const map: Record<string, number> = {};
        curValid.forEach(o => { const m = o.paymentMethod || 'Unknown'; map[m] = (map[m] || 0) + (o.totalAmount || 0); });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [curValid]);

    // Fulfillment types
    const fulfillmentData = useMemo(() => {
        const map: Record<string, number> = {};
        curValid.forEach(o => { const t = o.fulfillmentType || 'Physical'; map[t] = (map[t] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [curValid]);

    // Monthly revenue comparison
    const monthlyComparison = useMemo(() => {
        const thisYear = dayjs().year();
        const map: Record<string, { current: number; previous: number }> = {};
        orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded').forEach(o => {
            const d = dayjs(o.createdAt);
            const month = d.format('MMM');
            if (!map[month]) map[month] = { current: 0, previous: 0 };
            if (d.year() === thisYear) map[month].current += o.totalAmount || 0;
            else if (d.year() === thisYear - 1) map[month].previous += o.totalAmount || 0;
        });
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.map(m => ({ month: m, current: map[m]?.current || 0, previous: map[m]?.previous || 0 }));
    }, [orders]);
    const monthlyAvg = monthlyComparison.reduce((s, m) => s + m.current, 0) / 12;

    if (loading) return (
        <CMSLayout title="Sales Analytics" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981', themeColor]} className="text-[22px] font-bold tracking-tight">Sales Analytics</AuroraText>}
            subTitle={<DecryptedText text="Deep commerce analytics — revenue, products & customer insights" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Period Selector */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Segmented
                    options={[
                        { label: 'Today', value: 'today' }, { label: '7 Days', value: '7d' },
                        { label: '30 Days', value: '30d' }, { label: '90 Days', value: '90d' },
                        { label: 'This Year', value: 'year' },
                    ]}
                    value={period} onChange={v => setPeriod(v as Period)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Switch size="small" checked={compare} onChange={setCompare} />
                    <Text type="secondary" style={{ fontSize: 11 }}>Compare previous period</Text>
                </div>
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
                                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace', lineHeight: 1.3 }}>{k.value}</div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: 16 }}>{k.icon}</div>
                                </div>
                                {compare && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        {(k.invertColor ? k.trend <= 0 : k.trend >= 0)
                                            ? <RiseOutlined style={{ fontSize: 10, color: k.invertColor ? '#10b981' : '#10b981' }} />
                                            : <FallOutlined style={{ fontSize: 10, color: k.invertColor ? '#ef4444' : '#ef4444' }} />}
                                        <Text style={{ fontSize: 10, color: (k.invertColor ? k.trend <= 0 : k.trend >= 0) ? '#10b981' : '#ef4444' }}>
                                            {Math.abs(k.trend).toFixed(1)}% vs prev
                                        </Text>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Quick Insights Bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${themeColor}` }} styles={{ body: { padding: '10px 16px' } }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
                        {[
                            { label: 'Gross Revenue', value: fmtShort(curValid.reduce((s, o) => s + (o.subtotal || 0), 0)), color: '#10b981' },
                            { label: 'Total Tax', value: fmtShort(curValid.reduce((s, o) => s + (o.tax || 0), 0)), color: '#f59e0b' },
                            { label: 'Shipping Collected', value: fmtShort(curValid.reduce((s, o) => s + (o.shippingCost || 0), 0)), color: '#3b82f6' },
                            { label: 'Discounts Given', value: fmtShort(curValid.reduce((s, o) => s + (o.discount || 0), 0)), color: '#ef4444' },
                            { label: 'Unique Customers', value: uniqueCustomers.toString(), color: '#8b5cf6' },
                            { label: 'Avg Items/Order', value: ordersCount > 0 ? (curItems.length / ordersCount).toFixed(1) : '0', color: '#06b6d4' },
                        ].map((m, i) => (
                            <React.Fragment key={m.label}>
                                {i > 0 && <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />}
                                <div>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{m.label}</Text>
                                    <Text strong style={{ fontSize: 14, fontFamily: 'monospace', color: m.color }}>{m.value}</Text>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* Revenue Trend + Category Treemap */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Card size="small" style={glassCard} title={<><RiseOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Revenue Trend</Text></>}>
                            <div style={{ height: 280 }}>
                                {revenueTrend.length > 0 ? (
                                    <ResponsiveContainer>
                                        <AreaChart data={revenueTrend}>
                                            <defs>
                                                <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="date" tick={tickStyle} />
                                            <YAxis tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#salesRevGrad)" strokeWidth={2} name="Revenue" />
                                            {compare && <Area type="monotone" dataKey="prev" stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="6 3" name="Previous Period" />}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No revenue data for this period" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><PieChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Sales by Category</Text></>}>
                            <div style={{ height: 280 }}>
                                {categoryData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <Treemap data={categoryData} dataKey="size" nameKey="name" aspectRatio={4 / 3}>
                                            {categoryData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                        </Treemap>
                                    </ResponsiveContainer>
                                ) : <Empty description="No category data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Order Status Funnel */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <Card size="small" style={glassCard} title={<><BarChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Order Status Funnel</Text></>}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0' }}>
                        {funnelData.map((f, i) => (
                            <React.Fragment key={f.stage}>
                                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.45 + i * 0.07 }}
                                    style={{ width: `${f.width}%`, minWidth: 140, padding: '10px 16px', borderRadius: 8, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{f.stage}</Text>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 16, fontWeight: 700, color: f.color }}>{f.count}</Text>
                                        {f.dropoff > 0 && <Tag style={{ fontSize: 9, margin: 0, borderRadius: 8 }} color={f.dropoff > 30 ? 'red' : f.dropoff > 15 ? 'orange' : 'green'}>-{f.dropoff}%</Tag>}
                                    </div>
                                </motion.div>
                                {i < funnelData.length - 1 && <ArrowRightOutlined style={{ color: '#d1d5db', fontSize: 10, transform: 'rotate(90deg)' }} />}
                            </React.Fragment>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* Hourly Heatmap + Top Products */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><HeatMapOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Hourly Sales Heatmap</Text></>}>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: 2, minWidth: 500 }}>
                                    <div />
                                    {Array.from({ length: 24 }, (_, h) => (
                                        <Text key={h} type="secondary" style={{ fontSize: 8, textAlign: 'center' }}>{h}</Text>
                                    ))}
                                    {heatmapData.grid.map((row, d) => (
                                        <React.Fragment key={d}>
                                            <Text type="secondary" style={{ fontSize: 9, lineHeight: '20px' }}>{DAYS[d]}</Text>
                                            {row.map((val, h) => {
                                                const intensity = heatmapData.max > 0 ? val / heatmapData.max : 0;
                                                return (
                                                    <Tooltip key={h} title={`${DAYS[d]} ${h}:00 — ${val} orders`}>
                                                        <div style={{
                                                            height: 20, borderRadius: 3, cursor: 'default',
                                                            background: val === 0
                                                                ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                                                                : `rgba(245, 158, 11, ${0.15 + intensity * 0.75})`,
                                                            border: `1px solid ${val === 0 ? 'transparent' : `rgba(245, 158, 11, ${0.1 + intensity * 0.3})`}`,
                                                        }} />
                                                    </Tooltip>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8, alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 9 }}>Low</Text>
                                {[0.15, 0.35, 0.55, 0.75, 0.9].map((o, i) => (
                                    <div key={i} style={{ width: 16, height: 10, borderRadius: 2, background: `rgba(245, 158, 11, ${o})` }} />
                                ))}
                                <Text type="secondary" style={{ fontSize: 9 }}>High</Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><TrophyOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Top Products by Revenue</Text></>}>
                            <Table dataSource={topProducts} pagination={false} size="small" rowKey="name"
                                columns={[
                                    { title: '#', key: 'rank', width: 30, render: (_: any, __: any, i: number) => <Text type="secondary" style={{ fontSize: 11 }}>{i + 1}</Text> },
                                    { title: 'Product', dataIndex: 'name', key: 'name', ellipsis: true, render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 80, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                                    { title: 'Units', dataIndex: 'units', key: 'units', width: 55, align: 'right' as const, render: (v: number) => <Tag style={{ borderRadius: 8, margin: 0, fontSize: 10 }} color="blue">{v}</Tag> },
                                    {
                                        title: 'Avg Price', key: 'avg', width: 85, align: 'right' as const,
                                        render: (_: any, r: any) => (
                                            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                                {r.units > 0 ? fmtShort(r.revenue / r.units) : '-'}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: 'Revenue', dataIndex: 'revenue', key: 'revenue', width: 140, align: 'right' as const,
                                        render: (v: number) => (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                <div style={{ flex: 1, maxWidth: 50, height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }}>
                                                    <div style={{ width: `${(v / topMaxRevenue) * 100}%`, height: '100%', borderRadius: 3, background: '#10b981' }} />
                                                </div>
                                                <Text strong style={{ fontSize: 11, fontFamily: 'monospace', color: '#10b981' }}>{fmtShort(v)}</Text>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Payment Donut + Fulfillment Bar */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><PieChartOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Payment Method Breakdown</Text></>}>
                            <div style={{ height: 280, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: themeColor }}>{fmtShort(totalRevenue)}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Total Revenue</Text>
                                </div>
                                {paymentData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: isDark ? '#666' : '#999', strokeWidth: 1 }}>
                                                {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No payment data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><BarChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Fulfillment Type Distribution</Text></>}>
                            <div style={{ height: 280 }}>
                                {fulfillmentData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={fulfillmentData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis type="number" tick={tickStyle} />
                                            <YAxis dataKey="name" type="category" tick={tickStyle} width={80} />
                                            <RTooltip contentStyle={tooltipStyle} />
                                            <Bar dataKey="value" name="Orders" radius={[0, 6, 6, 0]} barSize={24}>
                                                {fulfillmentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No fulfillment data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Monthly Revenue Comparison */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <Card size="small" style={glassCard} title={<><CalendarOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Monthly Revenue Comparison (Current vs Previous Year)</Text></>}>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={monthlyComparison}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="month" tick={tickStyle} />
                                <YAxis tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <ReferenceLine y={monthlyAvg} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: `Avg: ${fmtShort(monthlyAvg)}`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }} />
                                <Bar dataKey="current" name="This Year" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="previous" name="Last Year" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>
        </div>
        </CMSLayout>
    );
}
