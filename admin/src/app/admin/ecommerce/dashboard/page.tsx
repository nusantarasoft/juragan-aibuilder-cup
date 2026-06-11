"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Statistic, Typography, Spin, Progress, Tag, Space, Badge, Tooltip } from "antd";
import {
    ShoppingCartOutlined, DollarOutlined, UserOutlined, GiftOutlined,
    CheckCircleOutlined, ClockCircleOutlined, SendOutlined, CarOutlined,
    InboxOutlined, CloseCircleOutlined, TagsOutlined, PercentageOutlined,
    ArrowRightOutlined, RiseOutlined, ShopOutlined, TrophyOutlined,
    StarOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { inventoryService, EcomStatsType, EcomOrder } from "@/lib/inventoryService";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const { Text, Title } = Typography;
const fmt = (v: number) => v ? `Rp ${v.toLocaleString('id-ID')}` : 'Rp 0';
const fmtShort = (v: number) => {
    if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `Rp ${(v / 1e3).toFixed(0)}K`;
    return `Rp ${v}`;
};

const STATUS_CFG: Record<string, { color: string; icon: React.ReactNode; emoji: string }> = {
    pending: { color: '#94a3b8', icon: <ClockCircleOutlined />, emoji: '⏳' },
    confirmed: { color: '#3b82f6', icon: <CheckCircleOutlined />, emoji: '✅' },
    processing: { color: '#8b5cf6', icon: <InboxOutlined />, emoji: '📦' },
    shipped: { color: '#06b6d4', icon: <SendOutlined />, emoji: '🚚' },
    delivered: { color: '#0ea5e9', icon: <CarOutlined />, emoji: '📬' },
    completed: { color: '#10b981', icon: <CheckCircleOutlined />, emoji: '🎉' },
    cancelled: { color: '#ef4444', icon: <CloseCircleOutlined />, emoji: '❌' },
    refunded: { color: '#f97316', icon: <CloseCircleOutlined />, emoji: '💸' },
};

// Revenue Trend Recharts
function RevenueTrend({ orders, isDark, textColor }: { orders: EcomOrder[], isDark: boolean, textColor: string }) {
    const dateMap: Record<string, number> = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
        if (o.createdAt) {
            const d = new Date(o.createdAt).toLocaleDateString('en-CA');
            dateMap[d] = (dateMap[d] || 0) + (o.totalAmount || 0);
        }
    });
    const entries = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    if (entries.length < 2) return <Text type="secondary" style={{ fontSize: 12 }}>Not enough data for trend</Text>;

    const data = entries.map(([date, revenue]) => ({ date, revenue }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255,255,255,0.8)', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
                    <p className="font-semibold" style={{ color: textColor, margin: 0, marginBottom: 8 }}>{label}</p>
                    <p style={{ color: '#10b981', margin: 0, fontSize: 13, fontWeight: 'bold' }}>
                        Revenue: {fmt(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height: 250, width: '100%', marginTop: 20 }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                    <XAxis dataKey="date" stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} tickLine={false} axisLine={false} tick={{fontSize: 10}} minTickGap={20} />
                    <YAxis stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} tickLine={false} axisLine={false} tick={{fontSize: 10}} tickFormatter={fmtShort} width={60} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

// Order Status Funnel
function OrderFunnel({ stats }: { stats: EcomStatsType }) {
    const stages = [
        { key: 'pending', label: 'Pending', value: stats.pending || 0 },
        { key: 'confirmed', label: 'Confirmed', value: stats.confirmed || 0 },
        { key: 'processing', label: 'Processing', value: stats.processing || 0 },
        { key: 'shipped', label: 'Shipped', value: stats.shipped || 0 },
        { key: 'delivered', label: 'Delivered', value: stats.delivered || 0 },
        { key: 'completed', label: 'Completed', value: stats.completed || 0 },
    ];
    const total = stats.totalOrders || 1;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {stages.map((s, i) => {
                const cfg = STATUS_CFG[s.key];
                const pct = Math.round((s.value / total) * 100);
                return (
                    <React.Fragment key={s.key}>
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.08 }}
                            style={{ flex: 1, background: `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}08)`, border: `1px solid ${cfg.color}22`, borderRadius: 8, padding: '8px 6px', textAlign: 'center', position: 'relative', overflow: 'hidden', minWidth: 50 }}>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${pct}%`, height: 3, background: cfg.color, borderRadius: 3 }} />
                            <Text style={{ fontSize: 9, color: cfg.color, display: 'block', lineHeight: 1.2 }}>{cfg.emoji} {s.label}</Text>
                            <Text strong style={{ fontSize: 16, color: cfg.color }}>{s.value}</Text>
                        </motion.div>
                        {i < stages.length - 1 && <ArrowRightOutlined style={{ color: '#d1d5db', fontSize: 10 }} />}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default function EcommerceDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<EcomStatsType | null>(null);
    const [orders, setOrders] = useState<EcomOrder[]>([]);
    const [returnStats, setReturnStats] = useState<any>(null);
    const [discountStats, setDiscountStats] = useState<any>(null);
    const [offerStats, setOfferStats] = useState<any>(null);
    const [packageStats, setPackageStats] = useState<any>(null);
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const router = useRouter();

    useEffect(() => {
        Promise.allSettled([
            inventoryService.getEcomStats(),
            inventoryService.getEcomOrders(),
            inventoryService.getEcomReturnStats(),
            inventoryService.getEcomDiscountStats(),
            inventoryService.getEcomOfferStats(),
            inventoryService.getEcomPackageStats(),
        ]).then(([s, o, r, d, of, p]) => {
            if (s.status === 'fulfilled') setStats(s.value);
            if (o.status === 'fulfilled') setOrders(o.value);
            if (r.status === 'fulfilled') setReturnStats(r.value);
            if (d.status === 'fulfilled') setDiscountStats(d.value);
            if (of.status === 'fulfilled') setOfferStats(of.value);
            if (p.status === 'fulfilled') setPackageStats(p.value);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <CMSLayout title="E-Commerce"><div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div></CMSLayout>;

    const s = stats || {} as EcomStatsType;
    const completionRate = s.totalOrders ? Math.round(((s.completed || 0) / s.totalOrders) * 100) : 0;
    const cancelRate = s.totalOrders ? Math.round(((s.cancelled || 0) / s.totalOrders) * 100) : 0;

    // Recent orders
    const recent = [...orders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6);

    const navCard = (title: string, path: string, icon: React.ReactNode, color: string, children: React.ReactNode, delay: number) => (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card hoverable onClick={() => router.push(path)}
                style={{ cursor: 'pointer', borderLeft: `3px solid ${color}`, transition: 'all 0.25s ease' }}
                styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>{children}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color }}>{icon}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{title}</Text>
                    <ArrowRightOutlined style={{ fontSize: 10, opacity: 0.3 }} />
                </div>
            </Card>
        </motion.div>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981', themeColor]} className="text-[22px] font-bold tracking-tight">E-Commerce Dashboard</AuroraText>}
            subTitle={<DecryptedText text="Orders, revenue, customers & promotions at a glance" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Hero KPIs */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} sm={12} md={6}>
                        {navCard('View Orders', '/admin/ecommerce/orders', <ShoppingCartOutlined />, '#3b82f6',
                            <Statistic title={<span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>Total Orders</span>} value={s.totalOrders || 0} valueStyle={{ color: '#3b82f6', fontSize: 24, fontWeight: 'bold' }} />, 0.05)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard('Revenue Detail', '/admin/ecommerce/orders', <DollarOutlined />, '#10b981',
                            <Statistic title={<span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>Total Revenue</span>} value={fmtShort(s.totalRevenue || 0)} valueStyle={{ color: '#10b981', fontSize: 24, fontFamily: 'monospace', fontWeight: 'bold' }} />, 0.1)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard('Manage Customers', '/admin/ecommerce/customers', <UserOutlined />, '#8b5cf6',
                            <Statistic title={<span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>Customers</span>} value={s.totalCustomers || 0} suffix={<Text type="secondary" style={{ fontSize: 11 }}>{s.activeCustomers || 0} active</Text>} valueStyle={{ color: '#8b5cf6', fontSize: 24, fontWeight: 'bold' }} />, 0.15)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card style={{ borderLeft: '3px solid #f59e0b' }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ position: 'relative' }}>
                                        <svg viewBox="0 0 80 80" width={56} height={56}>
                                            <circle cx="40" cy="40" r="30" fill="none" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} strokeWidth="8" />
                                            <circle cx="40" cy="40" r="30" fill="none" stroke="#10b981" strokeWidth="8"
                                                strokeDasharray={`${(completionRate / 100) * 188.5} ${188.5 - (completionRate / 100) * 188.5}`}
                                                strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                                                <animate attributeName="stroke-dasharray" from={`0 188.5`} to={`${(completionRate / 100) * 188.5} ${188.5 - (completionRate / 100) * 188.5}`} dur="1s" fill="freeze" />
                                            </circle>
                                            <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="700" fill={textColor}>{completionRate}%</text>
                                        </svg>
                                    </div>
                                    <div>
                                        <Text strong style={{ fontSize: 13, display: 'block', color: textColor }}>Completion Rate</Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>AOV: {fmt(s.avgOrderValue || 0)}</Text>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Order Funnel */}
                <Card size="small" title={<Text strong style={{ fontSize: 14, color: textColor }}>📊 Order Pipeline</Text>}>
                    <OrderFunnel stats={s} />
                    {cancelRate > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                            <Tag color="red" style={{ borderRadius: 20 }}>❌ {s.cancelled || 0} cancelled ({cancelRate}%)</Tag>
                        </div>
                    )}
                </Card>

                {/* Revenue Trend + Recent Orders */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} md={14}>
                        <Card size="small" title={<Space><RiseOutlined style={{ color: '#10b981' }} /><Text strong style={{ fontSize: 14, color: textColor }}>Revenue Trend (14 days)</Text></Space>}>
                            <RevenueTrend orders={orders} isDark={isDark} textColor={textColor} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card size="small" title={<Space><ShoppingCartOutlined style={{ color: '#3b82f6' }} /><Text strong style={{ fontSize: 14, color: textColor }}>Recent Orders</Text></Space>}
                            extra={<a onClick={() => router.push('/admin/ecommerce/orders')} style={{ fontSize: 11 }}>View All</a>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 250 }}>
                                <AnimatePresence>
                                    {recent.map((o, i) => {
                                        const cfg = STATUS_CFG[o.status || 'pending'];
                                        return (
                                            <motion.div key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: `${cfg.color}15`, borderLeft: `3px solid ${cfg.color}` }}>
                                                <div>
                                                    <Text strong style={{ fontSize: 12, color: textColor }}>{o.orderNumber}</Text>
                                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{o.customerName}</Text>
                                                </div>
                                                <Space size={10}>
                                                    <Text strong style={{ fontSize: 13, color: '#10b981' }}>{fmtShort(o.totalAmount || 0)}</Text>
                                                    <Tag color={cfg.color} style={{ fontSize: 10, borderRadius: 10, padding: '0 8px', margin: 0, border: 'none' }}>{o.status}</Tag>
                                                </Space>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                {recent.length === 0 && <Text type="secondary" style={{ textAlign: 'center', padding: 20 }}>No orders yet</Text>}
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Module Quick Cards */}
                <Row gutter={[14, 14]}>
                    <Col xs={12} sm={8} md={4}>
                        {navCard('Products', '/admin/ecommerce/products', <ShopOutlined />, '#3b82f6',
                            <><Text type="secondary" style={{ fontSize: 11 }}>Products</Text><br/><Text strong style={{ fontSize: 20, color: textColor }}>{(s as any).totalProducts || '—'}</Text></>, 0.3)}
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        {navCard('Packages', '/admin/ecommerce/packages', <GiftOutlined />, '#8b5cf6',
                            <><Text type="secondary" style={{ fontSize: 11 }}>Packages</Text><br/><Text strong style={{ fontSize: 20, color: '#8b5cf6' }}>{packageStats?.totalPackages || 0}</Text><br/><Text style={{ fontSize: 10, color: '#6b7280' }}>{packageStats?.active || 0} active</Text></>, 0.35)}
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        {navCard('Discounts', '/admin/ecommerce/discounts', <PercentageOutlined />, '#f59e0b',
                            <><Text type="secondary" style={{ fontSize: 11 }}>Discounts</Text><br/><Text strong style={{ fontSize: 20, color: '#f59e0b' }}>{discountStats?.totalDiscounts || 0}</Text><br/><Text style={{ fontSize: 10, color: '#6b7280' }}>{discountStats?.active || 0} active</Text></>, 0.4)}
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        {navCard('Offers', '/admin/ecommerce/offers', <TagsOutlined />, '#06b6d4',
                            <><Text type="secondary" style={{ fontSize: 11 }}>Offers</Text><br/><Text strong style={{ fontSize: 20, color: '#06b6d4' }}>{offerStats?.totalOffers || 0}</Text><br/><Text style={{ fontSize: 10, color: '#6b7280' }}>{offerStats?.active || 0} active</Text></>, 0.45)}
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        {navCard('Returns', '/admin/ecommerce/returns', <CloseCircleOutlined />, '#ef4444',
                            <><Text type="secondary" style={{ fontSize: 11 }}>Returns</Text><br/><Text strong style={{ fontSize: 20, color: '#ef4444' }}>{returnStats?.totalReturns || 0}</Text><br/><Text style={{ fontSize: 10, color: '#6b7280' }}>Rp {((returnStats?.totalRefunded || 0) / 1000).toFixed(0)}K ref</Text></>, 0.5)}
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        {navCard('Settings', '/admin/ecommerce/settings', <ThunderboltOutlined />, '#6b7280',
                            <><Text type="secondary" style={{ fontSize: 11 }}>Store</Text><br/><Text strong style={{ fontSize: 20 }}>⚙️</Text><br/><Text style={{ fontSize: 10, color: '#6b7280' }}>Configure</Text></>, 0.55)}
                    </Col>
                </Row>

                {/* Promo & Returns Summary */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" title={<Space><PercentageOutlined style={{ color: '#f59e0b' }} /><Text strong style={{ fontSize: 14, color: textColor }}>Promotions Overview</Text></Space>}>
                            <Row gutter={[12, 12]}>
                                {[
                                    { label: 'Active Discounts', value: discountStats?.active || 0, color: '#f59e0b', total: discountStats?.totalDiscounts || 0 },
                                    { label: 'Active Offers', value: offerStats?.active || 0, color: '#06b6d4', total: offerStats?.totalOffers || 0 },
                                    { label: 'Total Used', value: (discountStats?.totalUsed || 0) + (offerStats?.totalUses || 0), color: '#10b981' },
                                    { label: 'Active Packages', value: packageStats?.active || 0, color: '#8b5cf6', total: packageStats?.totalPackages || 0 },
                                ].map((p, i) => (
                                    <Col span={12} key={i}>
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.06 }}
                                            style={{ padding: '16px 14px', borderRadius: 12, background: `${p.color}15`, borderLeft: `3px solid ${p.color}` }}>
                                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{p.label}</Text>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                                                <Text strong style={{ fontSize: 24, color: p.color }}>{p.value}</Text>
                                                {p.total !== undefined && <Text style={{ fontSize: 11, color: '#9ca3af' }}>of {p.total}</Text>}
                                            </div>
                                        </motion.div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" title={<Space><CloseCircleOutlined style={{ color: '#ef4444' }} /><Text strong style={{ fontSize: 14, color: textColor }}>Returns & Refunds</Text></Space>}>
                            <Row gutter={[12, 12]}>
                                {[
                                    { label: 'Total Returns', value: returnStats?.totalReturns || 0, color: '#ef4444' },
                                    { label: 'Requested', value: returnStats?.requested || 0, color: '#f59e0b' },
                                    { label: 'Completed', value: returnStats?.completed || 0, color: '#10b981' },
                                    { label: 'Total Refunded', value: fmt(returnStats?.totalRefunded || 0), color: '#3b82f6', isText: true },
                                ].map((r, i) => (
                                    <Col span={12} key={i}>
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.06 }}
                                            style={{ padding: '16px 14px', borderRadius: 12, background: `${r.color}15`, borderLeft: `3px solid ${r.color}` }}>
                                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{r.label}</Text>
                                            <Text strong style={{ fontSize: r.isText ? 16 : 24, color: r.color, display: 'block', marginTop: 4 }}>{r.value}</Text>
                                        </motion.div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
