'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Tag, Spin, Space, message, Tabs, Statistic, Progress, Table } from 'antd';
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, RiseOutlined, FallOutlined, DatabaseOutlined, ShoppingCartOutlined, DollarOutlined, ToolOutlined, AuditOutlined, ScheduleOutlined, SwapOutlined, InboxOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { inventoryService } from '@/lib/inventoryService';
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

export default function AnalyticsPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(false);
    const [invStats, setInvStats] = useState<any>(null);
    const [mfgStats, setMfgStats] = useState<any>(null);
    const [opnameStats, setOpnameStats] = useState<any>(null);
    const [bookingStats, setBookingStats] = useState<any>(null);
    const [rentalStats, setRentalStats] = useState<any>(null);
    const [warehouseStats, setWarehouseStats] = useState<any>(null);
    const [procStats, setProcStats] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [inv, mfg, opn, bk, rnt, wh, proc]: any[] = await Promise.all([
                inventoryService.getStockStats(),
                inventoryService.getManufacturingStats(),
                inventoryService.getOpnameStats(),
                inventoryService.getBookingStats(),
                inventoryService.getRentalStats(),
                inventoryService.getWarehouseStats(),
                inventoryService.getProcurementStats('default'),
            ]);
            setInvStats(inv); setMfgStats(mfg); setOpnameStats(opn);
            setBookingStats(bk); setRentalStats(rnt); setWarehouseStats(wh); setProcStats(proc);
        } catch (e: any) { message.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const fmt = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

    if (loading) return <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Analytics & AI</AuroraText>} subTitle={<DecryptedText text="Cross-module analytics, performance metrics, and intelligence hub" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

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
    ];

    const fulfillmentBreakdown = [
        { type: 'Physical Goods', count: invStats?.physicalCount || 0, color: 'var(--theme-color, #7c3aed)' },
        { type: 'Tickets & Events', count: invStats?.ticketCount || 0, color: '#2563eb' },
        { type: 'Scheduled Services', count: invStats?.scheduledCount || 0, color: '#059669' },
        { type: 'Rental Items', count: invStats?.rentalCount || 0, color: '#d97706' },
    ];
    const totalFulfillment = fulfillmentBreakdown.reduce((s, f) => s + f.count, 0) || 1;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Analytics & AI</AuroraText>} subTitle={<DecryptedText text="Cross-module analytics, performance metrics, and intelligence hub" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <div style={{ padding: '0 4px' }}>

                {/* Overview KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
                    {topCards.map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            style={{ ...glass, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.45)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: k.color, fontSize: 16 }}>{k.icon}</span>
                                <span style={{ color: '#999', fontSize: 12 }}>{k.label}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{k.value}</div>
                        </motion.div>
                    ))}
                </div>

                <Tabs items={[
                    { key: 'overview', label: '📊 Module Overview', children: (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {analyticModules.map((mod, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                                    <Card size="small" title={<Space>{mod.icon}<span>{mod.title}</span></Space>}
                                        style={{ borderRadius: 12, height: '100%' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            {mod.stats.map((s: any, j: number) => (
                                                <div key={j} style={{ padding: '8px 0' }}>
                                                    <div style={{ color: '#999', fontSize: 11, marginBottom: 4 }}>{s.label}</div>
                                                    {s.progress !== undefined ? (
                                                        <div>
                                                            <span style={{ fontWeight: 700, fontSize: 16 }}>{s.value}</span>
                                                            <Progress percent={s.progress} size="small" showInfo={false}
                                                                strokeColor={s.progress >= 80 ? '#52c41a' : s.progress >= 50 ? '#1890ff' : '#faad14'} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontWeight: 700, fontSize: 16 }}>{s.value}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )},
                    { key: 'fulfillment', label: '🎯 Fulfillment Breakdown', children: (
                        <div style={{ maxWidth: 700 }}>
                            <Card title="Item Distribution by Fulfillment Type" style={{ borderRadius: 12 }}>
                                {fulfillmentBreakdown.map((f, i) => (
                                    <div key={i} style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 500 }}>{f.type}</span>
                                            <span style={{ fontWeight: 700 }}>{f.count} items ({Math.round(f.count / totalFulfillment * 100)}%)</span>
                                        </div>
                                        <Progress percent={Math.round(f.count / totalFulfillment * 100)} strokeColor={f.color} showInfo={false} />
                                    </div>
                                ))}
                            </Card>

                            <Card title="Revenue Streams" style={{ borderRadius: 12, marginTop: 16 }}>
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
                            ].map((metric: any, i) => (
                                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
                                    <Card size="small" style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
                                        <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>{metric.title}</div>
                                        {metric.suffix === '%' ? (
                                            <Progress type="circle" percent={metric.value} size={80}
                                                strokeColor={metric.color} format={() => `${metric.value}%`} />
                                        ) : (
                                            <div style={{ fontSize: 20, fontWeight: 700, color: metric.color || '#1a1a2e' }}>
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
