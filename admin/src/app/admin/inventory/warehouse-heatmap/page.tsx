"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Select, Statistic, Badge, Spin, Tooltip, Progress, Table, Segmented, message, theme } from "antd";
import {
    HeatMapOutlined, HomeOutlined, AppstoreOutlined, InboxOutlined,
    ReloadOutlined, BarChartOutlined, ThunderboltOutlined, WarningOutlined,
    ArrowUpOutlined, ArrowDownOutlined, FireOutlined, ColumnHeightOutlined,
    EnvironmentOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Cell, PieChart, Pie } from "recharts";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { inventoryService, InvWarehouse, InvZone, InvBin } from "@/lib/inventoryService";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";

const { Text } = Typography;

const ZONE_COLORS: Record<string, string> = {
    receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
    packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
};

function heatColor(pct: number): string {
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    if (pct >= 50) return '#eab308';
    if (pct >= 30) return '#22c55e';
    return '#3b82f6';
}

function generateDemoAnalytics() {
    const zones = [
        { code: 'RCV', name: 'Receiving Dock', type: 'receiving', totalBins: 12, occupied: 8, items: 45, weight: 1200 },
        { code: 'STR-A', name: 'Storage Zone A', type: 'storage', totalBins: 60, occupied: 48, items: 320, weight: 8500 },
        { code: 'STR-B', name: 'Storage Zone B', type: 'storage', totalBins: 60, occupied: 35, items: 210, weight: 5600 },
        { code: 'PCK', name: 'Picking Area', type: 'picking', totalBins: 12, occupied: 10, items: 85, weight: 2100 },
        { code: 'PAK', name: 'Packing Station', type: 'packing', totalBins: 12, occupied: 6, items: 32, weight: 800 },
        { code: 'SHP', name: 'Shipping Dock', type: 'shipping', totalBins: 18, occupied: 12, items: 65, weight: 3200 },
        { code: 'CLD', name: 'Cold Storage', type: 'cold', totalBins: 27, occupied: 22, items: 150, weight: 4100 },
        { code: 'QRN', name: 'Quarantine', type: 'quarantine', totalBins: 8, occupied: 3, items: 12, weight: 400 },
    ];
    return zones.map(z => ({
        ...z,
        available: z.totalBins - z.occupied,
        utilization: Math.round((z.occupied / z.totalBins) * 100),
        avgItemsPerBin: z.occupied > 0 ? +(z.items / z.occupied).toFixed(1) : 0,
        avgWeightPerBin: z.occupied > 0 ? Math.round(z.weight / z.occupied) : 0,
    }));
}

function loadBuilderLayout(): any[] {
    try {
        const saved = localStorage.getItem('nusantarasoft_warehouse_layout');
        if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
}

export default function WarehouseHeatmapPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const t = {
        text: isDark ? '#e2e8f0' : '#1e293b',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
        textMuted: isDark ? '#64748b' : '#94a3b8',
        textFaint: isDark ? '#475569' : '#cbd5e1',
        cardBg: isDark ? 'rgba(12,12,30,0.92)' : 'rgba(255,255,255,0.85)',
        cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        panelBg: isDark ? 'rgba(12,12,30,0.88)' : 'rgba(255,255,255,0.9)',
        panelBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        canvasBg: isDark ? '#080814' : '#f0f2f5',
        gridLine: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        gridLineMajor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
        gridLineMinor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)',
        tooltipBg: isDark ? 'rgba(12,12,30,0.95)' : 'rgba(255,255,255,0.95)',
        tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        tooltipText: isDark ? '#e2e8f0' : '#1e293b',
        statsLabel: isDark ? '#64748b' : '#94a3b8',
        statsValue: isDark ? '#e2e8f0' : '#334155',
        chartAxis: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
        chartGrid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        floorplanLabel: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
        floorplanText: isDark ? '#fff' : '#1e293b',
        progressTrack: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        legendBg: isDark ? 'rgba(12,12,30,0.85)' : 'rgba(255,255,255,0.85)',
        legendBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        legendText: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
        tableRowEven: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        tableRowOdd: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        tableRowHover: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)',
        heatmapCardBg: isDark ? 'rgba(12,12,30,0.88)' : 'rgba(255,255,255,0.9)',
        insetShadow: isDark ? 'inset 0 0 60px rgba(0,0,0,0.4)' : 'inset 0 0 60px rgba(0,0,0,0.06)',
    };
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
    const [selectedWh, setSelectedWh] = useState<string>('');
    const [zoneData, setZoneData] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<string>('heatmap');
    const [builderLayout, setBuilderLayout] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const whs = await inventoryService.getWarehouses();
            if (whs.length > 0) {
                setWarehouses(whs);
                setSelectedWh(whs[0].id);
                const [zones, bins] = await Promise.all([
                    inventoryService.getZones(whs[0].id),
                    inventoryService.getBins(),
                ]);
                const zoneIds = new Set(zones.map(z => z.id));
                const whBins = bins.filter(b => zoneIds.has(b.zoneId));
                const analytics = zones.map(z => {
                    const zBins = whBins.filter(b => b.zoneId === z.id);
                    const occupied = zBins.filter(b => b.status === 'occupied').length;
                    const items = zBins.reduce((s, b) => s + (b.currentItemCount || 0), 0);
                    return {
                        code: z.code, name: z.name, type: z.zoneType || 'storage',
                        totalBins: zBins.length, occupied, available: zBins.length - occupied,
                        items, weight: occupied * 250,
                        utilization: zBins.length > 0 ? Math.round((occupied / zBins.length) * 100) : 0,
                        avgItemsPerBin: occupied > 0 ? +(items / occupied).toFixed(1) : 0,
                        avgWeightPerBin: occupied > 0 ? Math.round((occupied * 250) / occupied) : 0,
                    };
                });
                setZoneData(analytics);
            } else {
                setWarehouses([{ id: 'demo', tenantId: 'demo', code: 'WH-DEMO', name: 'Demo Warehouse', status: 'active', createdAt: '', updatedAt: '' }]);
                setSelectedWh('demo');
                setZoneData(generateDemoAnalytics());
            }
        } catch {
            setWarehouses([{ id: 'demo', tenantId: 'demo', code: 'WH-DEMO', name: 'Demo Warehouse', status: 'active', createdAt: '', updatedAt: '' }]);
            setSelectedWh('demo');
            setZoneData(generateDemoAnalytics());
        }
        setBuilderLayout(loadBuilderLayout());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalBins = zoneData.reduce((s, z) => s + z.totalBins, 0);
    const totalOccupied = zoneData.reduce((s, z) => s + z.occupied, 0);
    const totalItems = zoneData.reduce((s, z) => s + z.items, 0);
    const overallUtil = totalBins > 0 ? Math.round((totalOccupied / totalBins) * 100) : 0;
    const hotZones = zoneData.filter(z => z.utilization >= 80).length;
    const coldZones = zoneData.filter(z => z.utilization < 30).length;

    const pieData = zoneData.map(z => ({ name: z.code, value: z.occupied, color: ZONE_COLORS[z.type] || '#6b7280' }));

    const layoutZones = builderLayout.filter(o => o.type === 'zone');
    const layoutRacks = builderLayout.filter(o => o.type === 'rack');
    const GRID = 30;

    const columns = [
        { title: 'Zone', dataIndex: 'code', width: 80, render: (v: string, r: any) => (
            <Space size={4}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: ZONE_COLORS[r.type] || '#6b7280' }} />
                <Text strong style={{ fontSize: 11 }}>{v}</Text>
            </Space>
        )},
        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'Bins', dataIndex: 'totalBins', width: 60, render: (v: number) => <Text style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'Occupied', dataIndex: 'occupied', width: 75, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#3b82f6' }} /> },
        { title: 'Free', dataIndex: 'available', width: 60, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#22c55e' }} /> },
        { title: 'Items', dataIndex: 'items', width: 60, render: (v: number) => <Text style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'Utilization', dataIndex: 'utilization', width: 120, render: (v: number) => (
            <Progress percent={v} size="small" strokeColor={heatColor(v)}
                format={p => <Text style={{ fontSize: 10, color: heatColor(v) }}>{p}%</Text>} />
        )},
        { title: 'Status', key: 'status', width: 80, render: (_: any, r: any) => (
            <Tag color={r.utilization >= 90 ? 'red' : r.utilization >= 70 ? 'orange' : r.utilization >= 40 ? 'green' : 'blue'}
                style={{ fontSize: 9, borderRadius: 6 }}>
                {r.utilization >= 90 ? 'CRITICAL' : r.utilization >= 70 ? 'HIGH' : r.utilization >= 40 ? 'NORMAL' : 'LOW'}
            </Tag>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b']}>Warehouse Heatmap</AuroraText>}
            subTitle={<DecryptedText text="Zone utilization heatmap and capacity analytics" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Tooltip key="builder" title="Open Warehouse Builder">
                    <Button icon={<EnvironmentOutlined />} onClick={() => router.push('/admin/inventory/warehouse-map')}>Builder</Button>
                </Tooltip>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
            ]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* KPI Cards */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Total Bins', value: totalBins, color: '#3b82f6', icon: <InboxOutlined /> },
                            { label: 'Occupied', value: totalOccupied, color: '#8b5cf6', icon: <AppstoreOutlined /> },
                            { label: 'Utilization', value: `${overallUtil}%`, color: heatColor(overallUtil), icon: <BarChartOutlined />, suffix: '' },
                            { label: 'Total Items', value: totalItems, color: '#10b981', icon: <ColumnHeightOutlined /> },
                            { label: 'Hot Zones', value: hotZones, color: '#ef4444', icon: <FireOutlined /> },
                            { label: 'Cold Zones', value: coldZones, color: '#06b6d4', icon: <ThunderboltOutlined /> },
                        ].map((s, i) => (
                            <Col xs={12} sm={8} md={4} key={i}>
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}>
                                    <Card style={{
                                        background: t.cardBg,
                                        backdropFilter: 'blur(16px)',
                                        border: `1px solid ${t.cardBorder}`,
                                        borderRadius: 14,
                                        borderTop: `3px solid ${s.color}`,
                                        borderImage: `linear-gradient(90deg, ${s.color}, ${s.color}88) 1`,
                                        borderImageSlice: 1,
                                        borderTopWidth: 3,
                                        borderTopStyle: 'solid',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }} styles={{ body: { padding: '14px 16px', position: 'relative', zIndex: 1 } }}>
                                        {/* Glow watermark */}
                                        <div style={{
                                            position: 'absolute', top: -10, right: -10,
                                            width: 70, height: 70, borderRadius: '50%',
                                            background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`,
                                            pointerEvents: 'none',
                                        }} />
                                        {/* Large icon watermark */}
                                        <div style={{
                                            position: 'absolute', top: 8, right: 10,
                                            fontSize: 32, color: `${s.color}12`, pointerEvents: 'none',
                                            lineHeight: 1,
                                        }}>{React.cloneElement(s.icon, { style: { fontSize: 32, color: `${s.color}15` } })}</div>
                                        <Statistic title={<Text style={{ fontSize: 10, color: t.textMuted, letterSpacing: 0.5 }}>{s.label}</Text>}
                                            value={s.value} prefix={React.cloneElement(s.icon, { style: { fontSize: 14, color: s.color } })}
                                            valueStyle={{ color: s.color, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    {/* View mode toggle */}
                    <div style={{ marginBottom: 12 }}>
                        <Segmented value={viewMode}
                            onChange={v => setViewMode(v as string)}
                            options={[
                                { label: '🔥 Heatmap', value: 'heatmap' },
                                { label: '🗺️ Floor Plan', value: 'floorplan' },
                                { label: '📊 Charts', value: 'charts' },
                            ]}
                            style={{ fontWeight: 600 }}
                        />
                    </div>

                    {/* Heatmap Grid View */}
                    {viewMode === 'heatmap' && (
                        <Card size="small" title={<Space><HeatMapOutlined style={{ color: '#ef4444' }} /> Zone Heatmap Grid</Space>}
                            style={{ background: t.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14, marginBottom: 16 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '10px 0' }}>
                                {zoneData.map((zone, i) => (
                                    <motion.div key={zone.code}
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
                                        whileHover={{ scale: 1.03, y: -2 }}
                                        style={{
                                            width: `calc(${Math.max(zone.totalBins / totalBins * 100, 10)}% - 10px)`,
                                            minWidth: 130, maxWidth: 260,
                                            background: t.heatmapCardBg,
                                            border: `1px solid ${heatColor(zone.utilization)}30`,
                                            borderLeft: `3px solid ${heatColor(zone.utilization)}`,
                                            borderRadius: 12, padding: '12px 14px', position: 'relative', overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                                            boxShadow: `0 2px 12px ${heatColor(zone.utilization)}10`,
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${heatColor(zone.utilization)}30`;
                                            (e.currentTarget as HTMLElement).style.borderColor = `${heatColor(zone.utilization)}60`;
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${heatColor(zone.utilization)}10`;
                                            (e.currentTarget as HTMLElement).style.borderColor = `${heatColor(zone.utilization)}30`;
                                        }}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Text strong style={{ fontSize: 13, color: t.text }}>{zone.code}</Text>
                                                    <span style={{
                                                        fontSize: 8, padding: '1px 6px', borderRadius: 8,
                                                        background: `${ZONE_COLORS[zone.type] || '#6b7280'}25`,
                                                        color: ZONE_COLORS[zone.type] || '#6b7280',
                                                        border: `1px solid ${ZONE_COLORS[zone.type] || '#6b7280'}40`,
                                                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                                                    }}>{zone.type}</span>
                                                </div>
                                                <Text style={{ fontSize: 20, fontWeight: 800, color: heatColor(zone.utilization), letterSpacing: -1 }}>{zone.utilization}%</Text>
                                            </div>
                                            <Text style={{ fontSize: 9, color: t.textMuted }}>{zone.name}</Text>
                                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                                <div><Text style={{ fontSize: 8, color: t.textFaint }}>Bins</Text><div><Text style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{zone.totalBins}</Text></div></div>
                                                <div><Text style={{ fontSize: 8, color: t.textFaint }}>Used</Text><div><Text style={{ fontSize: 12, fontWeight: 700, color: heatColor(zone.utilization) }}>{zone.occupied}</Text></div></div>
                                                <div><Text style={{ fontSize: 8, color: t.textFaint }}>Items</Text><div><Text style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{zone.items}</Text></div></div>
                                            </div>
                                            {/* Mini progress bar */}
                                            <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: t.progressTrack, overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${zone.utilization}%` }}
                                                    transition={{ delay: i * 0.06 + 0.3, duration: 0.6, ease: 'easeOut' }}
                                                    style={{
                                                        height: '100%', borderRadius: 2,
                                                        background: `linear-gradient(90deg, ${heatColor(zone.utilization)}80, ${heatColor(zone.utilization)})`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div style={{
                                display: 'flex', gap: 6, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap',
                                background: t.legendBg, backdropFilter: 'blur(12px)',
                                padding: '8px 18px', borderRadius: 50,
                                border: `1px solid ${t.legendBorder}`,
                                width: 'fit-content', margin: '14px auto 0',
                                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                            }}>
                                {[
                                    { label: 'Critical ≥90%', color: '#ef4444' },
                                    { label: 'High 70-89%', color: '#f59e0b' },
                                    { label: 'Normal 30-69%', color: '#22c55e' },
                                    { label: 'Low <30%', color: '#3b82f6' },
                                ].map(l => (
                                    <span key={l.label} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '3px 10px', borderRadius: 20,
                                        background: `${l.color}12`,
                                        border: `1px solid ${l.color}30`,
                                    }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block', boxShadow: `0 0 6px ${l.color}60` }} />
                                        <Text style={{ fontSize: 9, color: t.legendText, fontWeight: 500 }}>{l.label}</Text>
                                    </span>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* 2D Floor Plan View */}
                    {viewMode === 'floorplan' && (
                        <Card size="small" title={<Space><EnvironmentOutlined style={{ color: '#3b82f6' }} /> 2D Floor Plan</Space>}
                            extra={layoutZones.length === 0 ? <Tag color="orange">No builder layout</Tag> : <Tag color="green">{layoutZones.length} zones • {layoutRacks.length} racks</Tag>}
                            style={{ background: t.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14, marginBottom: 16 }}>
                            {layoutZones.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
                                    <Text type="secondary">No builder layout found. Create one in the Warehouse Builder to see the floor plan here.</Text>
                                    <div style={{ marginTop: 12 }}>
                                        <Button type="primary" icon={<EnvironmentOutlined />} onClick={() => router.push('/admin/inventory/warehouse-map')}>
                                            Open Warehouse Builder
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', maxWidth: 500, maxHeight: 500, margin: '0 auto' }}>
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: t.canvasBg, borderRadius: 10, border: `1px solid ${t.cardBorder}`,
                                        overflow: 'hidden',
                                        boxShadow: t.insetShadow,
                                    }}>
                                        {/* Grid pattern */}
                                        {Array.from({ length: GRID + 1 }, (_, i) => (
                                            <React.Fragment key={i}>
                                                <div style={{
                                                    position: 'absolute', left: `${(i / GRID) * 100}%`, top: 0, bottom: 0, width: 1,
                                                    background: i % 5 === 0 ? t.gridLineMajor : t.gridLineMinor,
                                                }} />
                                                <div style={{
                                                    position: 'absolute', top: `${(i / GRID) * 100}%`, left: 0, right: 0, height: 1,
                                                    background: i % 5 === 0 ? t.gridLineMajor : t.gridLineMinor,
                                                }} />
                                            </React.Fragment>
                                        ))}
                                        {layoutZones.map((zone: any, i: number) => {
                                            const zoneType = zone.zoneType || 'storage';
                                            const matchedData = zoneData.find(z =>
                                                z.type === zoneType || (zone.label && z.name.toLowerCase().includes(zone.label.toLowerCase()))
                                            );
                                            const util = matchedData?.utilization || Math.round(Math.random() * 80 + 10);
                                            const color = zone.color || ZONE_COLORS[zoneType] || '#3b82f6';
                                            return (
                                                <Tooltip key={zone.id || i} title={`${zone.label || zoneType} — ${util}% utilized`}>
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${(zone.x / GRID) * 100}%`,
                                                            top: `${(zone.z / GRID) * 100}%`,
                                                            width: `${((zone.width || 1) / GRID) * 100}%`,
                                                            height: `${((zone.depth || 1) / GRID) * 100}%`,
                                                            background: `${color}15`,
                                                            border: `1px solid ${color}50`,
                                                            borderRadius: 4,
                                                            overflow: 'hidden',
                                                            cursor: 'pointer',
                                                            transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                                                        }}
                                                        onMouseEnter={e => {
                                                            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${color}40, inset 0 0 20px ${color}15`;
                                                            (e.currentTarget as HTMLElement).style.borderColor = `${color}90`;
                                                        }}
                                                        onMouseLeave={e => {
                                                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                                            (e.currentTarget as HTMLElement).style.borderColor = `${color}50`;
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                                            height: `${util}%`,
                                                            background: `linear-gradient(0deg, ${heatColor(util)}35, ${heatColor(util)}10)`,
                                                            transition: 'height 0.5s',
                                                        }} />
                                                        <div style={{ position: 'relative', padding: '2px 4px' }}>
                                                            <div style={{ color: t.floorplanText, fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: isDark ? '0 1px 4px rgba(0,0,0,0.6)' : 'none' }}>
                                                                {zone.label || zoneType}
                                                            </div>
                                                            <div style={{ color: heatColor(util), fontSize: 10, fontWeight: 800, textShadow: `0 0 8px ${heatColor(util)}50` }}>{util}%</div>
                                                        </div>
                                                    </div>
                                                </Tooltip>
                                            );
                                        })}
                                        {layoutRacks.map((rack: any, i: number) => (
                                            <div key={rack.id || `r${i}`} style={{
                                                position: 'absolute',
                                                left: `${(rack.x / GRID) * 100}%`,
                                                top: `${(rack.z / GRID) * 100}%`,
                                                width: `${(1 / GRID) * 100}%`,
                                                height: `${(1 / GRID) * 100}%`,
                                                background: 'rgba(232,119,34,0.15)',
                                                border: '1px solid rgba(232,119,34,0.30)',
                                                borderRadius: 2,
                                                boxShadow: '0 0 6px rgba(232,119,34,0.10)',
                                            }} />
                                        ))}
                                        <div style={{
                                            position: 'absolute', bottom: 6, right: 8,
                                            color: t.floorplanLabel, fontSize: 8, letterSpacing: 1, fontWeight: 600,
                                        }}>
                                            2D FLOOR PLAN • {layoutZones.length} zones • {layoutRacks.length} racks
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Charts View */}
                    {viewMode === 'charts' && (
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            <Col xs={24} md={14}>
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                                <Card size="small" title={
                                    <Space>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                                            <BarChartOutlined style={{ color: '#fff', fontSize: 12 }} />
                                        </span>
                                        <span style={{ fontWeight: 600 }}>Utilization by Zone</span>
                                    </Space>
                                } style={{ background: t.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14, borderLeft: '3px solid #3b82f6' }}>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={zoneData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                                            <XAxis dataKey="code" fontSize={10} stroke={t.chartAxis} />
                                            <YAxis domain={[0, 100]} fontSize={10} tickFormatter={v => `${v}%`} stroke={t.chartAxis} />
                                            <RTooltip formatter={(v: number) => [`${v}%`, 'Utilization']}
                                                contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, fontSize: 11, color: t.tooltipText }} />
                                            <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                                                {zoneData.map((z, i) => <Cell key={i} fill={heatColor(z.utilization)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                                </motion.div>
                            </Col>
                            <Col xs={24} md={10}>
                                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                                <Card size="small" title={
                                    <Space>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                                            <AppstoreOutlined style={{ color: '#fff', fontSize: 12 }} />
                                        </span>
                                        <span style={{ fontWeight: 600 }}>Occupied Bins Distribution</span>
                                    </Space>
                                } style={{ background: t.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14, borderLeft: '3px solid #8b5cf6' }}>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                                innerRadius={50} outerRadius={90} paddingAngle={2}>
                                                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                            </Pie>
                                            <RTooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, fontSize: 11, color: t.tooltipText }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>
                                </motion.div>
                            </Col>
                        </Row>
                    )}

                    {/* Detailed Table */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card size="small" title={
                        <Space>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <HomeOutlined style={{ color: '#fff', fontSize: 12 }} />
                            </span>
                            <span style={{ fontWeight: 600 }}>Zone Details</span>
                        </Space>
                    }
                        extra={<Text type="secondary" style={{ fontSize: 10 }}>{zoneData.length} zones</Text>}
                        style={{ background: t.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14, borderLeft: '3px solid #10b981' }}>
                        <Table dataSource={zoneData} columns={columns} rowKey="code" size="small"
                            pagination={false} scroll={{ x: 700 }}
                            onRow={(_record, index) => ({
                                style: {
                                    background: (index ?? 0) % 2 === 0 ? t.tableRowEven : t.tableRowOdd,
                                },
                                onMouseEnter: (e) => { (e.currentTarget as HTMLElement).style.background = t.tableRowHover; },
                                onMouseLeave: (e) => { (e.currentTarget as HTMLElement).style.background = ((index ?? 0) % 2 === 0 ? t.tableRowEven : t.tableRowOdd); },
                            })}
                        />
                    </Card>
                    </motion.div>
                </motion.div>
            )}
        </CMSLayout>
    );
}
