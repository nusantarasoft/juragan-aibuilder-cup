'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Spin, Table, Tag, Empty, theme } from 'antd';
import {
    DatabaseOutlined, DollarOutlined, WarningOutlined, SyncOutlined,
    ShoppingCartOutlined, CheckCircleOutlined, BarChartOutlined,
    AlertOutlined, LineChartOutlined, InboxOutlined, StopOutlined,
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell, Treemap, AreaChart, Area, LineChart, Line,
    Legend,
} from 'recharts';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { inventoryService, type InvItem, type StockMovement } from '@/lib/inventoryService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
const fmt = (v: number) => v ? `Rp ${v.toLocaleString('id-ID')}` : 'Rp 0';
const fmtShort = (v: number) => { if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`; if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`; return `${v}`; };

const GET_POS = `query($tenantId: String!) { invPurchaseOrders(tenantId: $tenantId) { id poNumber supplierId title status totalAmount expectedDelivery sentAt confirmedAt createdAt } }`;

export default function SupplyChainAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<InvItem[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [pos, setPos] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [it, mv, wh, cat, po] = await Promise.allSettled([
                inventoryService.getItems(),
                inventoryService.getStockMovements(),
                inventoryService.getWarehouses(),
                inventoryService.getCategories(),
                gql(GET_POS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            if (it.status === 'fulfilled') setItems(it.value);
            if (mv.status === 'fulfilled') setMovements(mv.value);
            if (wh.status === 'fulfilled') setWarehouses(wh.value);
            if (cat.status === 'fulfilled') setCategories(cat.value);
            if (po.status === 'fulfilled') setPos((po.value as any).invPurchaseOrders || []);
        } catch { /* handled */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // ─── Category Map ────────────────────────────────────
    const catMap = useMemo(() => {
        const m: Record<string, string> = {};
        categories.forEach(c => { m[c.id] = c.name; });
        return m;
    }, [categories]);
    const getCat = (item: InvItem) => catMap[item.categoryId || ''] || 'Uncategorized';

    // ─── KPI Calculations ────────────────────────────────
    const totalSKUs = items.length;
    const totalStockValue = useMemo(() => items.reduce((s, i) => s + ((i.costPrice || 0) * (i.minStock || 0)), 0) || items.reduce((s, i) => s + (i.costPrice || 0), 0), [items]);
    const belowReorder = useMemo(() => items.filter(i => (i.reorderPoint || 0) > 0 && (i.minStock || 0) <= (i.reorderPoint || 0)).length, [items]);
    const outboundMvs = useMemo(() => movements.filter(m => m.movementType === 'out' || m.movementType === 'sale'), [movements]);
    const avgTurnover = useMemo(() => {
        if (!items.length) return 0;
        const totalOut = outboundMvs.reduce((s, m) => s + Math.abs(m.quantity), 0);
        const avgStock = items.reduce((s, i) => s + (i.minStock || 1), 0) / items.length;
        return avgStock > 0 ? +(totalOut / (items.length * avgStock)).toFixed(2) : 0;
    }, [items, outboundMvs]);
    const pendingPOs = useMemo(() => pos.filter(p => p.status === 'draft' || p.status === 'sent' || p.status === 'pending').length, [pos]);
    const stockAccuracy = useMemo(() => {
        const total = items.length || 1;
        const accurate = items.filter(i => (i.minStock || 0) >= 0).length;
        return Math.round((accurate / total) * 100);
    }, [items]);

    const kpis = [
        { title: 'Total SKUs', value: totalSKUs, icon: <DatabaseOutlined />, color: themeColor },
        { title: 'Stock Value', value: fmtShort(totalStockValue), icon: <DollarOutlined />, color: '#10b981' },
        { title: 'Below Reorder', value: belowReorder, icon: <WarningOutlined />, color: '#ef4444' },
        { title: 'Avg Turnover', value: avgTurnover, icon: <SyncOutlined />, color: '#3b82f6' },
        { title: 'Pending POs', value: pendingPOs, icon: <ShoppingCartOutlined />, color: '#f59e0b' },
        { title: 'Stock Accuracy', value: `${stockAccuracy}%`, icon: <CheckCircleOutlined />, color: '#8b5cf6' },
    ];

    // ─── 2. Inventory Turnover by Category ───────────────
    const turnoverByCategory = useMemo(() => {
        const catOutbound: Record<string, number> = {};
        const catStock: Record<string, number> = {};
        items.forEach(i => { const c = getCat(i); catStock[c] = (catStock[c] || 0) + (i.minStock || 1); });
        const itemCatMap: Record<string, string> = {};
        items.forEach(i => { itemCatMap[i.id] = getCat(i); });
        outboundMvs.forEach(m => { const c = itemCatMap[m.itemId] || 'Uncategorized'; catOutbound[c] = (catOutbound[c] || 0) + Math.abs(m.quantity); });
        return Object.keys(catStock).map((c, i) => ({
            category: c, turnover: +(((catOutbound[c] || 0) / (catStock[c] || 1))).toFixed(2), fill: COLORS[i % COLORS.length],
        })).sort((a, b) => b.turnover - a.turnover).slice(0, 12);
    }, [items, outboundMvs, getCat]);

    // ─── 3. Stock Value Distribution (Treemap) ───────────
    const stockValueTree = useMemo(() => {
        const catVal: Record<string, number> = {};
        items.forEach(i => { const c = getCat(i); catVal[c] = (catVal[c] || 0) + ((i.costPrice || 0) * Math.max(i.minStock || 0, 1)); });
        return Object.entries(catVal).map(([name, value], i) => ({ name, size: value, fill: COLORS[i % COLORS.length] })).sort((a, b) => b.size - a.size);
    }, [items, getCat]);

    // ─── 4. ABC Analysis ─────────────────────────────────
    const abcData = useMemo(() => {
        const valued = items.map(i => ({ ...i, value: (i.costPrice || 0) * Math.max(i.minStock || 0, 1) })).sort((a, b) => b.value - a.value);
        const totalVal = valued.reduce((s, i) => s + i.value, 0) || 1;
        let cumulative = 0;
        const classified = valued.map(i => { cumulative += i.value; const pct = cumulative / totalVal; return { ...i, cls: pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C' }; });
        const groups = { A: classified.filter(i => i.cls === 'A'), B: classified.filter(i => i.cls === 'B'), C: classified.filter(i => i.cls === 'C') };
        const summary = [
            { cls: 'A', items: groups.A.length, value: groups.A.reduce((s, i) => s + i.value, 0), pctItems: Math.round((groups.A.length / (items.length || 1)) * 100), pctValue: Math.round((groups.A.reduce((s, i) => s + i.value, 0) / totalVal) * 100), color: '#ef4444' },
            { cls: 'B', items: groups.B.length, value: groups.B.reduce((s, i) => s + i.value, 0), pctItems: Math.round((groups.B.length / (items.length || 1)) * 100), pctValue: Math.round((groups.B.reduce((s, i) => s + i.value, 0) / totalVal) * 100), color: '#f59e0b' },
            { cls: 'C', items: groups.C.length, value: groups.C.reduce((s, i) => s + i.value, 0), pctItems: Math.round((groups.C.length / (items.length || 1)) * 100), pctValue: Math.round((groups.C.reduce((s, i) => s + i.value, 0) / totalVal) * 100), color: '#3b82f6' },
        ];
        const topA = groups.A.slice(0, 20).map(i => ({ key: i.id, name: i.name, sku: i.sku || '-', qty: i.minStock || 0, value: i.value }));
        return { summary, topA };
    }, [items]);

    // ─── 5. Reorder Alerts ───────────────────────────────
    const reorderAlerts = useMemo(() => {
        return items.filter(i => (i.reorderPoint || 0) > 0 && (i.minStock || 0) <= (i.reorderPoint || 0))
            .map(i => {
                const qty = i.minStock || 0; const rp = i.reorderPoint || 0;
                const severity = qty === 0 ? 'critical' : qty < rp / 2 ? 'warning' : 'info';
                return { ...i, currentQty: qty, reorderPt: rp, suggestedQty: i.reorderQty || Math.max(rp - qty, 1), severity };
            })
            .sort((a, b) => { const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }; return (order[a.severity] ?? 2) - (order[b.severity] ?? 2); })
            .slice(0, 20);
    }, [items]);

    // ─── 6. Stock Movement Trend (30 days) ───────────────
    const movementTrend = useMemo(() => {
        const start = dayjs().subtract(30, 'day').startOf('day');
        const days: Record<string, { date: string; inbound: number; outbound: number }> = {};
        for (let d = 0; d < 30; d++) {
            const key = start.add(d, 'day').format('MM/DD');
            days[key] = { date: key, inbound: 0, outbound: 0 };
        }
        movements.forEach(m => {
            const d = dayjs(m.createdAt);
            if (d.isBefore(start)) return;
            const key = d.format('MM/DD');
            if (!days[key]) return;
            if (m.movementType === 'in' || m.movementType === 'purchase') days[key].inbound += Math.abs(m.quantity);
            else if (m.movementType === 'out' || m.movementType === 'sale') days[key].outbound += Math.abs(m.quantity);
        });
        return Object.values(days).map(d => ({ ...d, net: d.inbound - d.outbound }));
    }, [movements]);

    // ─── 7. Warehouse Utilization ────────────────────────
    const warehouseUtil = useMemo(() => {
        return warehouses.map(w => {
            const total = w.totalCapacity || 100;
            const used = w.usedCapacity || 0;
            const pct = Math.round((used / total) * 100);
            const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
            return { name: w.name || w.code, used, total, pct, color };
        }).sort((a, b) => b.pct - a.pct);
    }, [warehouses]);

    // ─── 8. Demand Forecasting ───────────────────────────
    const forecastData = useMemo(() => {
        const start90 = dayjs().subtract(90, 'day').startOf('day');
        const dailyOut: Record<string, number> = {};
        for (let d = 0; d < 90; d++) { dailyOut[start90.add(d, 'day').format('YYYY-MM-DD')] = 0; }
        outboundMvs.forEach(m => {
            const key = dayjs(m.createdAt).format('YYYY-MM-DD');
            if (key in dailyOut) dailyOut[key] += Math.abs(m.quantity);
        });
        const vals = Object.values(dailyOut);
        const windowSize = 7;
        const result: { day: string; actual: number | null; forecast: number | null; upper: number | null; lower: number | null }[] = [];
        // Last 30 days actual
        const last30Start = dayjs().subtract(30, 'day');
        vals.slice(60).forEach((v, i) => {
            result.push({ day: last30Start.add(i, 'day').format('MM/DD'), actual: v, forecast: null, upper: null, lower: null });
        });
        // Forecast next 30
        const allVals = [...vals];
        for (let d = 0; d < 30; d++) {
            const slice = allVals.slice(Math.max(0, allVals.length - windowSize));
            const avg = slice.reduce((s, v) => s + v, 0) / (slice.length || 1);
            const std = Math.sqrt(slice.reduce((s, v) => s + (v - avg) ** 2, 0) / (slice.length || 1));
            allVals.push(Math.round(avg));
            result.push({
                day: dayjs().add(d + 1, 'day').format('MM/DD'),
                actual: null, forecast: Math.round(avg),
                upper: Math.round(avg + 1.5 * std), lower: Math.max(0, Math.round(avg - 1.5 * std)),
            });
        }
        return result;
    }, [outboundMvs]);

    // ─── 9. Supplier Performance ─────────────────────────
    const supplierPerf = useMemo(() => {
        const map: Record<string, { name: string; poCount: number; totalValue: number; onTime: number; totalDays: number; delivered: number }> = {};
        pos.forEach(p => {
            const sid = p.supplierId || 'Unknown';
            if (!map[sid]) map[sid] = { name: p.title || sid, poCount: 0, totalValue: 0, onTime: 0, totalDays: 0, delivered: 0 };
            map[sid].poCount++;
            map[sid].totalValue += p.totalAmount || 0;
            if (p.confirmedAt && p.expectedDelivery) {
                map[sid].delivered++;
                if (dayjs(p.confirmedAt).isBefore(dayjs(p.expectedDelivery).add(1, 'day'))) map[sid].onTime++;
                map[sid].totalDays += Math.abs(dayjs(p.confirmedAt).diff(dayjs(p.createdAt), 'day'));
            }
        });
        const maxVal = Math.max(...Object.values(map).map(v => v.totalValue), 1);
        return Object.values(map).map(s => ({
            key: s.name, supplier: s.name, poCount: s.poCount, totalValue: s.totalValue,
            onTimePct: s.delivered > 0 ? Math.round((s.onTime / s.delivered) * 100) : 0,
            avgLead: s.delivered > 0 ? Math.round(s.totalDays / s.delivered) : 0,
            barWidth: Math.round((s.totalValue / maxVal) * 100),
        })).sort((a, b) => b.totalValue - a.totalValue);
    }, [pos]);

    // ─── 10. Dead Stock ──────────────────────────────────
    const deadStock = useMemo(() => {
        const cutoff = dayjs().subtract(90, 'day');
        const lastOutMap: Record<string, string> = {};
        movements.filter(m => m.movementType === 'out' || m.movementType === 'sale').forEach(m => {
            if (!lastOutMap[m.itemId] || dayjs(m.createdAt).isAfter(dayjs(lastOutMap[m.itemId]))) lastOutMap[m.itemId] = m.createdAt;
        });
        const dead = items.filter(i => !lastOutMap[i.id] || dayjs(lastOutMap[i.id]).isBefore(cutoff))
            .map(i => ({
                key: i.id, name: i.name, sku: i.sku || '-', qty: i.minStock || 0,
                value: (i.costPrice || 0) * Math.max(i.minStock || 0, 1),
                daysSince: lastOutMap[i.id] ? dayjs().diff(dayjs(lastOutMap[i.id]), 'day') : 999,
            })).sort((a, b) => b.value - a.value).slice(0, 20);
        const totalDeadValue = dead.reduce((s, d) => s + d.value, 0);
        return { dead, totalDeadValue };
    }, [items, movements]);

    if (loading) return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Supply Chain Analytics</AuroraText>}
            subTitle={<DecryptedText text="Loading supply chain intelligence..." animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Supply Chain Analytics</AuroraText>}
            subTitle={<DecryptedText text="Advanced inventory forecasting, ABC analysis & supply chain intelligence" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
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
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: 16 }}>{k.icon}</div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* 2. Turnover by Category + 3. Stock Value Treemap */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Card size="small" style={glassCard} title={<><SyncOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Inventory Turnover by Category</Text></>}>
                            <div style={{ height: 280 }}>
                                {turnoverByCategory.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={turnoverByCategory} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis type="number" tick={tickStyle} />
                                            <YAxis dataKey="category" type="category" tick={tickStyle} width={110} />
                                            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}x`, 'Turnover']} />
                                            <Bar dataKey="turnover" name="Turnover Rate" radius={[0, 6, 6, 0]} barSize={18}>
                                                {turnoverByCategory.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No turnover data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><BarChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Stock Value Distribution</Text></>}>
                            <div style={{ height: 280 }}>
                                {stockValueTree.length > 0 ? (
                                    <ResponsiveContainer>
                                        <Treemap data={stockValueTree} dataKey="size" nameKey="name" aspectRatio={4 / 3}>
                                            {stockValueTree.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                        </Treemap>
                                    </ResponsiveContainer>
                                ) : <Empty description="No stock value data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 4. ABC Analysis */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card size="small" style={glassCard} title={<><BarChartOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>ABC Analysis</Text></>}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        {abcData.summary.map(s => (
                            <div key={s.cls} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Tag color={s.color} style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Class {s.cls}</Tag>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{s.pctItems}% items · {s.pctValue}% value</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div><Text type="secondary" style={{ fontSize: 10 }}>Items</Text><div style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.items}</div></div>
                                    <div style={{ textAlign: 'right' }}><Text type="secondary" style={{ fontSize: 10 }}>Value</Text><div style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{fmtShort(s.value)}</div></div>
                                </div>
                                <div style={{ height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', marginTop: 6 }}>
                                    <div style={{ width: `${s.pctValue}%`, height: '100%', borderRadius: 2, background: s.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {abcData.topA.length > 0 && (
                        <Table dataSource={abcData.topA} pagination={false} size="small" scroll={{ x: 500 }}
                            columns={[
                                { title: '#', key: 'r', width: 30, render: (_: any, __: any, i: number) => <Text type="secondary">{i + 1}</Text> },
                                { title: 'Name', dataIndex: 'name', ellipsis: true, render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'SKU', dataIndex: 'sku', width: 90, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                                { title: 'Qty', dataIndex: 'qty', width: 60, align: 'right' as const },
                                { title: 'Value', dataIndex: 'value', width: 100, align: 'right' as const, render: (v: number) => <Text style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 11 }}>{fmtShort(v)}</Text> },
                            ]}
                        />
                    )}
                </Card>
            </motion.div>

            {/* 5. Reorder Alerts */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                <Card size="small" style={{ ...glassCard, borderLeft: '3px solid #ef4444' }} title={<><AlertOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Reorder Alerts ({reorderAlerts.length})</Text></>}>
                    {reorderAlerts.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                            {reorderAlerts.map(a => {
                                const sc = a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6';
                                return (
                                    <div key={a.id} style={{ padding: '10px 12px', borderRadius: 8, background: `${sc}08`, border: `1px solid ${sc}25` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <Text strong style={{ fontSize: 12 }}>{a.name}</Text>
                                            <Tag color={sc} style={{ margin: 0, fontSize: 9, borderRadius: 6 }}>{a.severity.toUpperCase()}</Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10 }}>{a.sku}</Text>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                            <div><Text type="secondary" style={{ fontSize: 9 }}>Current</Text><div style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>{a.currentQty}</div></div>
                                            <div><Text type="secondary" style={{ fontSize: 9 }}>Reorder Pt</Text><div style={{ fontWeight: 600, fontSize: 14 }}>{a.reorderPt}</div></div>
                                            <div><Text type="secondary" style={{ fontSize: 9 }}>Suggested</Text><div style={{ fontWeight: 600, color: '#10b981', fontSize: 14 }}>{a.suggestedQty}</div></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <Empty description="All items above reorder point ✓" />}
                </Card>
            </motion.div>

            {/* 6. Stock Movement Trend + 7. Warehouse Utilization */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={glassCard} title={<><LineChartOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Stock Movement Trend (30 Days)</Text></>}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={movementTrend}>
                                        <defs>
                                            <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="date" tick={tickStyle} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Area type="monotone" dataKey="inbound" stroke="#10b981" fill="url(#gradIn)" strokeWidth={2} name="Inbound" />
                                        <Area type="monotone" dataKey="outbound" stroke="#ef4444" fill="url(#gradOut)" strokeWidth={2} name="Outbound" />
                                        <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Net" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><InboxOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Warehouse Utilization</Text></>}>
                            {warehouseUtil.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                                    {warehouseUtil.map((w, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontSize: 12, fontWeight: 500 }}>{w.name}</Text>
                                                <Text style={{ fontSize: 11, fontWeight: 700, color: w.color }}>{w.pct}%</Text>
                                            </div>
                                            <div style={{ height: 14, borderRadius: 7, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', overflow: 'hidden' }}>
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${w.pct}%` }} transition={{ delay: 0.6 + i * 0.08, duration: 0.6 }}
                                                    style={{ height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${w.color}cc, ${w.color})` }} />
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 9 }}>{w.used} / {w.total} units</Text>
                                        </div>
                                    ))}
                                </div>
                            ) : <Empty description="No warehouse data" />}
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 8. Demand Forecasting */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card size="small" style={glassCard} title={<><LineChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Demand Forecasting (SMA)</Text></>}>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={forecastData}>
                                <defs>
                                    <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="day" tick={tickStyle} interval={4} />
                                <YAxis tick={tickStyle} />
                                <RTooltip contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confBand)" name="Confidence Band" />
                                <Area type="monotone" dataKey="lower" stroke="none" fill="#fff" fillOpacity={0} name=" " />
                                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
                                <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" connectNulls={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* 9. Supplier Performance + 10. Dead Stock */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={glassCard} title={<><ShoppingCartOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Supplier Performance</Text></>}>
                            {supplierPerf.length > 0 ? (
                                <Table dataSource={supplierPerf} pagination={false} size="small" scroll={{ x: 600 }}
                                    columns={[
                                        { title: 'Supplier', dataIndex: 'supplier', ellipsis: true, render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                        { title: 'POs', dataIndex: 'poCount', width: 50, align: 'center' as const },
                                        {
                                            title: 'Total Value', dataIndex: 'totalValue', width: 130, align: 'right' as const,
                                            render: (v: number, r: any) => (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                    <div style={{ flex: 1, maxWidth: 40, height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }}>
                                                        <div style={{ width: `${r.barWidth}%`, height: '100%', borderRadius: 3, background: '#06b6d4' }} />
                                                    </div>
                                                    <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#06b6d4' }}>{fmtShort(v)}</Text>
                                                </div>
                                            ),
                                        },
                                        { title: 'On-Time', dataIndex: 'onTimePct', width: 70, align: 'center' as const, render: (v: number) => <Tag color={v >= 80 ? 'green' : v >= 50 ? 'orange' : 'red'} style={{ margin: 0, fontSize: 10 }}>{v}%</Tag> },
                                        { title: 'Lead (d)', dataIndex: 'avgLead', width: 65, align: 'center' as const },
                                    ]}
                                />
                            ) : <Empty description="No purchase order data" />}
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%', borderLeft: '3px solid #6b7280' }}
                            title={<><StopOutlined style={{ color: '#6b7280' }} /> <Text strong style={{ fontSize: 13 }}>Dead Stock Analysis</Text></>}
                            extra={<Tag color="red" style={{ fontWeight: 700 }}>Total: {fmtShort(deadStock.totalDeadValue)}</Tag>}
                        >
                            {deadStock.dead.length > 0 ? (
                                <Table dataSource={deadStock.dead} pagination={{ pageSize: 8, size: 'small' }} size="small" scroll={{ x: 450 }}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', ellipsis: true, render: (v: string) => <Text strong style={{ fontSize: 11 }}>{v}</Text> },
                                        { title: 'SKU', dataIndex: 'sku', width: 75, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                                        { title: 'Qty', dataIndex: 'qty', width: 45, align: 'right' as const },
                                        { title: 'Value', dataIndex: 'value', width: 80, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace', fontSize: 10 }}>{fmtShort(v)}</Text> },
                                        { title: 'Days', dataIndex: 'daysSince', width: 50, align: 'center' as const, render: (v: number) => <Tag color={v > 180 ? 'red' : 'orange'} style={{ margin: 0, fontSize: 9 }}>{v > 900 ? '∞' : v}</Tag> },
                                    ]}
                                />
                            ) : <Empty description="No dead stock ✓" />}
                        </Card>
                    </motion.div>
                </Col>
            </Row>

        </div>
        </CMSLayout>
    );
}
