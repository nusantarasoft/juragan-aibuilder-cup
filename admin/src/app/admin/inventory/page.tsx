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

    // Top KPIs
    const topKpis = [
        { label: 'Total Items', value: stats.inv?.totalItems || 0, icon: <DatabaseOutlined />, color: themeColor, route: '/admin/inventory/items' },
        { label: 'Warehouses', value: stats.wh?.totalWarehouses || 0, icon: <InboxOutlined />, color: '#3b82f6', route: '/admin/inventory/warehouses' },
        { label: 'Total Bins', value: stats.wh?.totalBins || 0, icon: <EnvironmentOutlined />, color: '#10b981', route: '/admin/inventory/location-browser' },
        { label: 'Active POs', value: stats.proc?.approvedPos || 0, icon: <ShoppingCartOutlined />, color: '#f59e0b', route: '/admin/inventory/procurement' },
        { label: 'WMS Active', value: wmsActiveOps, icon: <ThunderboltOutlined />, color: '#ef4444', route: '/admin/inventory/putaway' },
        { label: 'Bin Contents', value: stats.wms?.totalBinContents || 0, icon: <SafetyCertificateOutlined />, color: '#8b5cf6', route: '/admin/inventory/item-locator' },
    ];

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
                {/* Top KPIs */}
                <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
                    {topKpis.map((k, i) => (
                        <Col xs={12} sm={8} md={4} key={i}>
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 20 }}>
                                <div onClick={() => router.push(k.route)} style={{
                                    ...glass, padding: '14px 16px', borderTop: `3px solid ${k.color}`,
                                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${k.color}20`; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                >
                                    <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${k.color}15 0%, transparent 70%)` }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ color: k.color, fontSize: 14 }}>{k.icon}</span>
                                        <span style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{k.label}</span>
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: -0.5 }}>{k.value}</div>
                                </div>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

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
