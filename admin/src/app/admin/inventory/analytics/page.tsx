'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Tag, Spin, Space, Tooltip, message, Tabs, Statistic, Progress, Table , theme } from "antd";
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, RiseOutlined, FallOutlined, DatabaseOutlined, ShoppingCartOutlined, DollarOutlined, ToolOutlined, AuditOutlined, ScheduleOutlined, SwapOutlined, InboxOutlined, DownloadOutlined, UploadOutlined, UnorderedListOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { inventoryService } from '@/lib/inventoryService';
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

export default function AnalyticsPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [loading, setLoading] = useState(false);
    const [invStats, setInvStats] = useState<any>(null);
    const [mfgStats, setMfgStats] = useState<any>(null);
    const [opnameStats, setOpnameStats] = useState<any>(null);
    const [bookingStats, setBookingStats] = useState<any>(null);
    const [rentalStats, setRentalStats] = useState<any>(null);
    const [warehouseStats, setWarehouseStats] = useState<any>(null);
    const [procStats, setProcStats] = useState<any>(null);
    const [wmsStats, setWmsStats] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [inv, mfg, opn, bk, rnt, wh, proc, wms]: any[] = await Promise.all([
                inventoryService.getStockStats(),
                inventoryService.getManufacturingStats(),
                inventoryService.getOpnameStats(),
                inventoryService.getBookingStats(),
                inventoryService.getRentalStats(),
                inventoryService.getWarehouseStats(),
                inventoryService.getProcurementStats('default'),
                inventoryService.getWmsStats().catch(() => null),
            ]);
            setInvStats(inv); setMfgStats(mfg); setOpnameStats(opn);
            setBookingStats(bk); setRentalStats(rnt); setWarehouseStats(wh); setProcStats(proc); setWmsStats(wms);
        } catch (e: any) { message.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const fmt = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

    if (loading) return <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Analytics & AI</AuroraText>} subTitle={<DecryptedText text="Cross-module analytics, performance metrics, and intelligence hub" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Tooltip key="items" title="Manage items"><Button icon={<UnorderedListOutlined />} onClick={() => router.push('/admin/inventory/items')}>Items</Button></Tooltip>, <Tooltip key="stock" title="View stock levels"><Button icon={<BarChartOutlined />} onClick={() => router.push('/admin/inventory/stock')}>Stock</Button></Tooltip>, <Tooltip key="3d" title="View 3D Warehouse"><Button icon={<EnvironmentOutlined />} onClick={() => router.push('/admin/inventory/warehouse-map')}>3D Map</Button></Tooltip>]}><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    const topCards = [
        { label: 'Total Items', value: invStats?.totalItems || 0, icon: <DatabaseOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { label: 'Physical', value: invStats?.physicalCount || 0, icon: <InboxOutlined />, color: '#2563eb' },
        { label: 'Tickets', value: invStats?.ticketCount || 0, icon: <ScheduleOutlined />, color: '#0891b2' },
        { label: 'Scheduled', value: invStats?.scheduledCount || 0, icon: <ScheduleOutlined />, color: '#059669' },
        { label: 'Rental', value: invStats?.rentalCount || 0, icon: <SwapOutlined />, color: '#d97706' },
        { label: 'Categories', value: invStats?.totalCategories || 0, icon: <PieChartOutlined />, color: '#dc2626' },
    ];

    // Computed analytics
    const totalBookingRevenue = bookingStats?.totalRevenue || 0;
    const totalRentalRevenue = rentalStats?.totalRevenue || 0;
    const totalProcSpend = procStats?.totalPoValue || 0;
    const bookingFillRate = bookingStats?.totalBookings && bookingStats?.totalOccurrences
        ? Math.round((bookingStats.totalBookings / (bookingStats.totalOccurrences * 50)) * 100) : 0;
    const rentalUtilization = rentalStats?.totalAssets
        ? Math.round((rentalStats.rented / rentalStats.totalAssets) * 100) : 0;
    const opnameAccuracy = opnameStats?.totalSessions
        ? Math.round((opnameStats.completed / opnameStats.totalSessions) * 100) : 0;
    const mfgCompletionRate = mfgStats?.totalWorkOrders
        ? Math.round(((mfgStats.completedWo || 0) / mfgStats.totalWorkOrders) * 100) : 0;
    const wmsTotalPutaway = (wmsStats?.pendingPutaway || 0) + (wmsStats?.inProgressPutaway || 0) + (wmsStats?.completedPutaway || 0);
    const wmsTotalPick = (wmsStats?.pendingPick || 0) + (wmsStats?.inProgressPick || 0) + (wmsStats?.completedPick || 0);
    const wmsPutawayRate = wmsTotalPutaway > 0 ? Math.round((wmsStats?.completedPutaway || 0) / wmsTotalPutaway * 100) : 0;
    const wmsPickRate = wmsTotalPick > 0 ? Math.round((wmsStats?.completedPick || 0) / wmsTotalPick * 100) : 0;

    const analyticModules = [
        { title: 'Procurement', icon: <ShoppingCartOutlined style={{ color: 'var(--theme-color, #7c3aed)' }} />, stats: [
            { label: 'Total POs', value: procStats?.totalPos || 0 },
            { label: 'Approved POs', value: procStats?.approvedPos || 0 },
            { label: 'Total PO Value', value: fmt(totalProcSpend) },
            { label: 'GRN Count', value: procStats?.totalGrns || 0 },
        ]},
        { title: 'Warehouse', icon: <InboxOutlined style={{ color: '#2563eb' }} />, stats: [
            { label: 'Warehouses', value: warehouseStats?.totalWarehouses || 0 },
            { label: 'Zones', value: warehouseStats?.totalZones || 0 },
            { label: 'Bins', value: warehouseStats?.totalBins || 0 },
            { label: 'Transfers', value: warehouseStats?.totalTransfers || 0 },
        ]},
        { title: 'Manufacturing', icon: <ToolOutlined style={{ color: '#059669' }} />, stats: [
            { label: 'BOMs', value: mfgStats?.totalBoms || 0 },
            { label: 'Work Orders', value: mfgStats?.totalWorkOrders || 0 },
            { label: 'Completion Rate', value: `${mfgCompletionRate}%`, progress: mfgCompletionRate },
            { label: 'In Progress', value: mfgStats?.inProgressWo || 0 },
        ]},
        { title: 'Stock Opname', icon: <AuditOutlined style={{ color: '#d97706' }} />, stats: [
            { label: 'Sessions', value: opnameStats?.totalSessions || 0 },
            { label: 'Completed', value: opnameStats?.completed || 0 },
            { label: 'Accuracy', value: `${opnameAccuracy}%`, progress: opnameAccuracy },
            { label: 'Variance', value: fmt(opnameStats?.totalVariance || 0) },
        ]},
        { title: 'Bookings', icon: <ScheduleOutlined style={{ color: '#0891b2' }} />, stats: [
            { label: 'Schedules', value: bookingStats?.totalSchedules || 0 },
            { label: 'Bookings', value: bookingStats?.totalBookings || 0 },
            { label: 'Revenue', value: fmt(totalBookingRevenue) },
            { label: 'Upcoming', value: bookingStats?.upcomingDepartures || 0 },
        ]},
        { title: 'Rentals', icon: <SwapOutlined style={{ color: '#dc2626' }} />, stats: [
            { label: 'Assets', value: rentalStats?.totalAssets || 0 },
            { label: 'Utilization', value: `${rentalUtilization}%`, progress: rentalUtilization },
            { label: 'Contracts', value: rentalStats?.totalContracts || 0 },
            { label: 'Revenue', value: fmt(totalRentalRevenue) },
        ]},
        { title: 'WMS Operations', icon: <DownloadOutlined style={{ color: '#0ea5e9' }} />, stats: [
            { label: 'Put-Away Tasks', value: wmsTotalPutaway },
            { label: 'Pick Tasks', value: wmsTotalPick },
            { label: 'Put-Away Rate', value: `${wmsPutawayRate}%`, progress: wmsPutawayRate },
            { label: 'Bin Contents', value: wmsStats?.totalBinContents || 0 },
        ]},
    ];

    const fulfillmentBreakdown = [
        { type: 'Physical Goods', count: invStats?.physicalCount || 0, color: 'var(--theme-color, #7c3aed)' },
        { type: 'Tickets & Events', count: invStats?.ticketCount || 0, color: '#2563eb' },
        { type: 'Scheduled Services', count: invStats?.scheduledCount || 0, color: '#059669' },
        { type: 'Rental Items', count: invStats?.rentalCount || 0, color: '#d97706' },
    ];
    const totalFulfillment = fulfillmentBreakdown.reduce((s, f) => s + f.count, 0) || 1;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Analytics & AI</AuroraText>} subTitle={<DecryptedText text="Cross-module analytics, performance metrics, and intelligence hub" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
                <Tooltip key="items" title="Manage items"><Button icon={<UnorderedListOutlined />} onClick={() => router.push('/admin/inventory/items')}>Items</Button></Tooltip>,
                <Tooltip key="stock" title="View stock levels"><Button icon={<BarChartOutlined />} onClick={() => router.push('/admin/inventory/stock')}>Stock</Button></Tooltip>,
                <Tooltip key="3d" title="View 3D Warehouse"><Button icon={<EnvironmentOutlined />} onClick={() => router.push('/admin/inventory/warehouse-map')}>3D Map</Button></Tooltip>,
            ]}>
            <div style={{ padding: '0 4px' }}>

                {/* Overview KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
                    {topCards.map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
                            style={{ ...(isDark ? glassDark : glass), padding: '16px 18px', borderTop: `3px solid ${k.color}`, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${k.color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 32, opacity: 0.06, color: k.color, pointerEvents: 'none' }}>{k.icon}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
                                <span style={{ color: k.color, fontSize: 14 }}>{k.icon}</span>
                                <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{k.label}</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, position: 'relative', letterSpacing: -0.5 }}>{k.value}</div>
                        </motion.div>
                    ))}
                </div>

                <Tabs items={[
                    { key: 'overview', label: '📊 Module Overview', children: (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {analyticModules.map((mod, i) => {
                                const modColors: Record<string, string> = { Procurement: '#7c3aed', Warehouse: '#2563eb', Manufacturing: '#059669', 'Stock Opname': '#d97706', Bookings: '#0891b2', Rentals: '#dc2626', 'WMS Operations': '#0ea5e9' };
                                const mc = modColors[mod.title] || '#6b7280';
                                return (
                                <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}>
                                    <Card size="small" title={
                                        <Space>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${mc}, ${mc}bb)` }}>
                                                {React.cloneElement(mod.icon, { style: { color: '#fff', fontSize: 12 } })}
                                            </span>
                                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{mod.title}</span>
                                        </Space>
                                    }
                                        style={{ ...(isDark ? glassDark : glass), borderLeft: `3px solid ${mc}`, height: '100%' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            {mod.stats.map((s: any, j: number) => (
                                                <div key={j} style={{ padding: '8px 0' }}>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 4, letterSpacing: 0.3, textTransform: 'uppercase' as const }}>{s.label}</div>
                                                    {s.progress !== undefined ? (
                                                        <div>
                                                            <span style={{ fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>{s.value}</span>
                                                            <Progress percent={s.progress} size="small" showInfo={false}
                                                                strokeColor={s.progress >= 80 ? '#52c41a' : s.progress >= 50 ? '#1890ff' : '#faad14'} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>{s.value}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </motion.div>
                            );})}
                        </div>
                    )},
                    { key: 'fulfillment', label: '🎯 Fulfillment Breakdown', children: (
                        <div style={{ maxWidth: 700 }}>
                            <Card title={
                                <Space>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                                        <PieChartOutlined style={{ color: '#fff', fontSize: 12 }} />
                                    </span>
                                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Item Distribution by Fulfillment Type</span>
                                </Space>
                            } style={{ ...(isDark ? glassDark : glass), borderLeft: '3px solid #8b5cf6' }}>
                                {fulfillmentBreakdown.map((f, i) => (
                                    <div key={i} style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{f.type}</span>
                                            <span style={{ fontWeight: 700, color: f.color }}>{f.count} items ({Math.round(f.count / totalFulfillment * 100)}%)</span>
                                        </div>
                                        <Progress percent={Math.round(f.count / totalFulfillment * 100)} strokeColor={f.color} showInfo={false} />
                                    </div>
                                ))}
                            </Card>

                            <Card title={
                                <Space>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                        <DollarOutlined style={{ color: '#fff', fontSize: 12 }} />
                                    </span>
                                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Revenue Streams</span>
                                </Space>
                            } style={{ ...(isDark ? glassDark : glass), borderLeft: '3px solid #22c55e', marginTop: 16 }}>
                                <Table scroll={{ x: 900 }} dataSource={[
                                    { stream: 'Procurement Spend', amount: totalProcSpend, type: 'expense' },
                                    { stream: 'Booking Revenue', amount: totalBookingRevenue, type: 'revenue' },
                                    { stream: 'Rental Revenue', amount: totalRentalRevenue, type: 'revenue' },
                                ]} rowKey="stream" pagination={false} size="small" columns={[
                                    { title: 'Stream', dataIndex: 'stream' },
                                    { title: 'Amount', dataIndex: 'amount', render: fmt },
                                    { title: 'Type', dataIndex: 'type', render: (v: string) => (
                                        <Tag color={v === 'revenue' ? 'green' : 'volcano'} icon={v === 'revenue' ? <RiseOutlined /> : <FallOutlined />}>{v.toUpperCase()}</Tag>
                                    )},
                                ]} />
                            </Card>
                        </div>
                    )},
                    { key: 'kpi', label: '📈 Key Metrics', children: (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {[
                                { title: 'Manufacturing Completion', value: mfgCompletionRate, suffix: '%', color: mfgCompletionRate >= 70 ? '#52c41a' : '#faad14' },
                                { title: 'Opname Accuracy', value: opnameAccuracy, suffix: '%', color: opnameAccuracy >= 80 ? '#52c41a' : '#faad14' },
                                { title: 'Rental Utilization', value: rentalUtilization, suffix: '%', color: rentalUtilization >= 50 ? '#1890ff' : '#faad14' },
                                { title: 'Booking Fill Rate', value: bookingFillRate, suffix: '%', color: bookingFillRate >= 60 ? '#52c41a' : '#faad14' },
                                { title: 'Booking Revenue', value: totalBookingRevenue, prefix: 'Rp ', isFormatted: true },
                                { title: 'Rental Revenue', value: totalRentalRevenue, prefix: 'Rp ', isFormatted: true },
                                { title: 'Procurement Spend', value: totalProcSpend, prefix: 'Rp ', isFormatted: true },
                                { title: 'Opname Variance', value: opnameStats?.totalVariance || 0, prefix: 'Rp ', isFormatted: true, color: (opnameStats?.totalVariance || 0) < 0 ? '#f5222d' : '#52c41a' },
                                { title: 'Put-Away Completion', value: wmsPutawayRate, suffix: '%', color: wmsPutawayRate >= 70 ? '#52c41a' : '#faad14' },
                                { title: 'Pick Completion', value: wmsPickRate, suffix: '%', color: wmsPickRate >= 70 ? '#52c41a' : '#faad14' },
                            ].map((metric: any, i) => (
                                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}>
                                    <Card size="small" style={{ ...(isDark ? glassDark : glass), borderLeft: `3px solid ${metric.color || '#6b7280'}`, textAlign: 'center', height: '100%' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 8, letterSpacing: 0.3 }}>{metric.title}</div>
                                        {metric.suffix === '%' ? (
                                            <Progress type="circle" percent={metric.value} size={80}
                                                strokeColor={metric.color} strokeWidth={8} format={() => <span style={{ color: metric.color, fontWeight: 700 }}>{`${metric.value}%`}</span>} />
                                        ) : (
                                            <div style={{ fontSize: 20, fontWeight: 700, color: metric.color || 'rgba(255,255,255,0.85)' }}>
                                                {metric.isFormatted ? fmt(metric.value) : metric.value}
                                            </div>
                                        )}
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )},
                ]} />
            </div>
        </CMSLayout>
    );
}
