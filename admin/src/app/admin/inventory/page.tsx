'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Spin, Space, Typography, Progress, Tag, Badge, Button, message, theme } from 'antd';
import {
    DatabaseOutlined, InboxOutlined, ShoppingCartOutlined, ToolOutlined,
    AuditOutlined, ScheduleOutlined, SwapOutlined, BarChartOutlined,
    EnvironmentOutlined, RiseOutlined, FallOutlined, ArrowRightOutlined,
    DownloadOutlined, UploadOutlined, HeatMapOutlined, AimOutlined,
    ThunderboltOutlined, SafetyCertificateOutlined, DollarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { inventoryService } from '@/lib/inventoryService';
import { useRouter } from 'next/navigation';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";

const { Text } = Typography;

export default function InventoryDashboard() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [inv, wh, mfg, opn, bk, rnt, proc, wms]: any[] = await Promise.all([
                inventoryService.getStockStats().catch(() => ({})),
                inventoryService.getWarehouseStats().catch(() => ({})),
                inventoryService.getManufacturingStats().catch(() => ({})),
                inventoryService.getOpnameStats().catch(() => ({})),
                inventoryService.getBookingStats().catch(() => ({})),
                inventoryService.getRentalStats().catch(() => ({})),
                inventoryService.getProcurementStats('default').catch(() => ({})),
                inventoryService.getWmsStats().catch(() => null),
            ]);
            setStats({ inv, wh, mfg, opn, bk, rnt, proc, wms });
        } catch (e: any) { message.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const glass = isDark
        ? { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }
        : { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14 };

    const fmt = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

    if (loading) return (
        <CMSLayout title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Inventory Command Center</AuroraText>}
            subTitle={<DecryptedText text="Unified dashboard across all inventory modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    // WMS computed stats
    const wmsTotalPutaway = (stats.wms?.pendingPutaway || 0) + (stats.wms?.inProgressPutaway || 0) + (stats.wms?.completedPutaway || 0);
    const wmsTotalPick = (stats.wms?.pendingPick || 0) + (stats.wms?.inProgressPick || 0) + (stats.wms?.completedPick || 0);
    const wmsActiveOps = (stats.wms?.inProgressPutaway || 0) + (stats.wms?.inProgressPick || 0);
    const totalWmsOps = wmsTotalPutaway + wmsTotalPick || 1;
    const wmsActivePct = Math.round((wmsActiveOps / totalWmsOps) * 100);

    // Module cards
    const modules = [
        {
            title: 'Put-Away Operations', icon: <DownloadOutlined />, color: '#10b981',
            route: '/admin/inventory/putaway',
            metrics: [
                { label: 'Pending', value: stats.wms?.pendingPutaway || 0, highlight: (stats.wms?.pendingPutaway || 0) > 0 },
                { label: 'In Progress', value: stats.wms?.inProgressPutaway || 0 },
                { label: 'Completed', value: stats.wms?.completedPutaway || 0 },
                { label: 'Total', value: wmsTotalPutaway },
            ],
        },
        {
            title: 'Pick Operations', icon: <UploadOutlined />, color: '#3b82f6',
            route: '/admin/inventory/pick',
            metrics: [
                { label: 'Pending', value: stats.wms?.pendingPick || 0, highlight: (stats.wms?.pendingPick || 0) > 0 },
                { label: 'In Progress', value: stats.wms?.inProgressPick || 0 },
                { label: 'Completed', value: stats.wms?.completedPick || 0 },
                { label: 'Total', value: wmsTotalPick },
            ],
        },
        {
            title: 'Procurement', icon: <ShoppingCartOutlined />, color: '#f59e0b',
            route: '/admin/inventory/procurement',
            metrics: [
                { label: 'POs', value: stats.proc?.totalPos || 0 },
                { label: 'Approved', value: stats.proc?.approvedPos || 0 },
                { label: 'GRNs', value: stats.proc?.totalGrns || 0 },
                { label: 'PO Value', value: fmt(stats.proc?.totalPoValue || 0) },
            ],
        },
        {
            title: 'Manufacturing', icon: <ToolOutlined />, color: '#059669',
            route: '/admin/inventory/manufacturing',
            metrics: [
                { label: 'BOMs', value: stats.mfg?.totalBoms || 0 },
                { label: 'Work Orders', value: stats.mfg?.totalWorkOrders || 0 },
                { label: 'In Progress', value: stats.mfg?.inProgressWo || 0 },
                { label: 'Completed', value: stats.mfg?.completedWo || 0 },
            ],
        },
        {
            title: 'Stock Opname', icon: <AuditOutlined />, color: '#d97706',
            route: '/admin/inventory/stock-opname',
            metrics: [
                { label: 'Sessions', value: stats.opn?.totalSessions || 0 },
                { label: 'Completed', value: stats.opn?.completed || 0 },
                { label: 'Variance', value: fmt(stats.opn?.totalVariance || 0) },
                { label: 'Accuracy', value: stats.opn?.totalSessions ? `${Math.round(((stats.opn?.completed || 0) / stats.opn.totalSessions) * 100)}%` : '—' },
            ],
        },
        {
            title: 'Warehouse Map', icon: <HeatMapOutlined />, color: '#6366f1',
            route: '/admin/inventory/warehouse-map',
            metrics: [
                { label: 'Zones', value: stats.wh?.totalZones || 0 },
                { label: 'Bins', value: stats.wh?.totalBins || 0 },
                { label: 'Transfers', value: stats.wh?.totalTransfers || 0 },
                { label: 'Layouts', value: '3D' },
            ],
        },
    ];

    // Quick actions
    const quickActions = [
        { label: 'Create Put-Away', icon: <DownloadOutlined />, color: '#10b981', route: '/admin/inventory/putaway' },
        { label: 'Create Pick', icon: <UploadOutlined />, color: '#3b82f6', route: '/admin/inventory/pick' },
        { label: 'Item Locator', icon: <AimOutlined />, color: '#8b5cf6', route: '/admin/inventory/item-locator' },
        { label: '3D Map', icon: <EnvironmentOutlined />, color: '#f59e0b', route: '/admin/inventory/warehouse-map' },
        { label: 'Heatmap', icon: <HeatMapOutlined />, color: '#ef4444', route: '/admin/inventory/warehouse-heatmap' },
        { label: 'Analytics', icon: <BarChartOutlined />, color: '#06b6d4', route: '/admin/inventory/analytics' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Inventory Command Center</AuroraText>}
            subTitle={<DecryptedText text="Unified dashboard across all inventory modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ padding: '0 4px' }}>
                {/* Hero KPIs (BENTO GRID) */}
                <BentoGrid className="mb-6 max-w-full">
                    <BentoGridItem
                        title="Total Items"
                        description="Cataloged SKUs"
                        icon={<DatabaseOutlined style={{ color: themeColor }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-indigo-500/10" onClick={() => router.push('/admin/inventory/items')} style={{ cursor: 'pointer' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: themeColor }}>{stats.inv?.totalItems || 0}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Warehouses"
                        description={`${stats.wh?.totalBins || 0} Total Bins Managed`}
                        icon={<InboxOutlined style={{ color: '#3b82f6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-500/10" onClick={() => router.push('/admin/inventory/warehouses')} style={{ cursor: 'pointer' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{stats.wh?.totalWarehouses || 0}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Active POs"
                        description="Approved Purchase Orders"
                        icon={<ShoppingCartOutlined style={{ color: '#f59e0b' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-500/10" onClick={() => router.push('/admin/inventory/procurement')} style={{ cursor: 'pointer' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>{stats.proc?.approvedPos || 0}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="WMS Operations"
                        description="Active Putaway/Pick Tasks"
                        icon={<ThunderboltOutlined style={{ color: '#ef4444' }} />}
                        header={
                            <div className="flex flex-col h-full w-full items-center justify-center rounded-xl bg-red-500/10" onClick={() => router.push('/admin/inventory/putaway')} style={{ cursor: 'pointer' }}>
                                <AnimatedCircularProgressBar
                                    max={100}
                                    min={0}
                                    value={wmsActivePct}
                                    gaugePrimaryColor="#ef4444"
                                    gaugeSecondaryColor="rgba(239, 68, 68, 0.1)"
                                    className="w-[80px] h-[80px] scale-90"
                                />
                                <div style={{ fontSize: 11, marginTop: 4, color: "#ef4444", fontWeight: 600 }}>{wmsActiveOps} Active Ops</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                </BentoGrid>

                {/* Quick Actions */}
                <Card size="small" style={{ ...glass, marginBottom: 16, borderLeft: `3px solid ${themeColor}` }}
                    styles={{ body: { padding: '10px 14px' } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: 11, marginRight: 8, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            ⚡ QUICK ACTIONS
                        </Text>
                        {quickActions.map((a, i) => (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + i * 0.04 }}>
                                <Button size="small" icon={a.icon}
                                    onClick={() => router.push(a.route)}
                                    style={{
                                        borderRadius: 8, fontSize: 11, fontWeight: 600,
                                        background: `${a.color}10`, borderColor: `${a.color}30`, color: a.color,
                                    }}
                                >{a.label}</Button>
                            </motion.div>
                        ))}
                    </div>
                </Card>

                {/* Module Cards */}
                <Row gutter={[12, 12]}>
                    {modules.map((mod, i) => (
                        <Col xs={24} sm={12} lg={8} key={i}>
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}>
                                <div onClick={() => router.push(mod.route)} style={{
                                    ...glass, padding: '16px 18px', borderLeft: `3px solid ${mod.color}`,
                                    cursor: 'pointer', height: '100%', position: 'relative', overflow: 'hidden',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${mod.color}15`; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                >
                                    {/* Background glow */}
                                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${mod.color}10 0%, transparent 70%)`, pointerEvents: 'none' }} />

                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: `linear-gradient(135deg, ${mod.color}, ${mod.color}cc)`, color: '#fff', fontSize: 14,
                                        }}>
                                            {mod.icon}
                                        </div>
                                        <Text strong style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{mod.title}</Text>
                                        <ArrowRightOutlined style={{ marginLeft: 'auto', color: mod.color, fontSize: 10, opacity: 0.5 }} />
                                    </div>

                                    {/* Metrics Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                                        {mod.metrics.map((m: any, j: number) => (
                                            <div key={j}>
                                                <Text style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', textTransform: 'uppercase' as const, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>{m.label}</Text>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Text strong style={{ fontSize: 15, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{m.value}</Text>
                                                    {m.highlight && <Badge dot color="#ef4444" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            </div>
        </CMSLayout>
    );
}
