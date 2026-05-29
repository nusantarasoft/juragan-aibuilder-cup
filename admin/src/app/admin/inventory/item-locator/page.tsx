"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Input, Table, message, Badge, Spin, Select, Drawer, Empty, Tooltip, Statistic, Avatar, theme } from "antd";
import {
    AimOutlined, SearchOutlined, ReloadOutlined, InboxOutlined,
    EnvironmentOutlined, AppstoreOutlined, HomeOutlined, RightOutlined,
    BarcodeOutlined, ShoppingOutlined, ColumnHeightOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { inventoryService, InvWarehouse, InvZone, InvBin, InvItem, StockLedgerEntry } from "@/lib/inventoryService";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";

const { Text } = Typography;

const ZONE_COLORS: Record<string, string> = {
    receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
    packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
};

interface ItemLocation {
    itemId: string;
    itemName: string;
    sku: string;
    warehouseName: string;
    warehouseCode: string;
    zoneName: string;
    zoneCode: string;
    zoneType: string;
    binCode: string;
    aisle: string;
    rack: string;
    level: string;
    position: string;
    onHand: number;
    reserved: number;
    available: number;
}

// Generate demo item locations
function generateDemoLocations(): ItemLocation[] {
    const items = [
        { id: 'i1', name: 'Laptop Dell XPS 15', sku: 'LP-DELL-XPS15' },
        { id: 'i2', name: 'Mouse Logitech MX Master', sku: 'MS-LGT-MXM3' },
        { id: 'i3', name: 'Keyboard Mechanical Cherry', sku: 'KB-CHRY-MX01' },
        { id: 'i4', name: 'Monitor Samsung 27"', sku: 'MN-SMS-27K' },
        { id: 'i5', name: 'Webcam HD Pro 4K', sku: 'WC-PRO-4K01' },
        { id: 'i6', name: 'USB-C Hub 7-in-1', sku: 'HB-USB-7IN1' },
        { id: 'i7', name: 'SSD Samsung 1TB', sku: 'SD-SMS-1TB' },
        { id: 'i8', name: 'RAM DDR5 32GB', sku: 'RM-DDR5-32G' },
        { id: 'i9', name: 'Power Supply 750W', sku: 'PS-750W-GLD' },
        { id: 'i10', name: 'Ethernet Cable Cat6 5m', sku: 'CB-ETH-C6-5' },
        { id: 'i11', name: 'Headset Sony WH-1000XM5', sku: 'HS-SNY-XM5' },
        { id: 'i12', name: 'Docking Station USB-C', sku: 'DK-USB-C01' },
        { id: 'i13', name: 'Thermal Paste Arctic MX4', sku: 'TP-ARC-MX4' },
        { id: 'i14', name: 'CPU Intel i9-14900K', sku: 'CP-INT-14K' },
        { id: 'i15', name: 'GPU NVIDIA RTX 4090', sku: 'GP-NVD-4090' },
    ];
    const zones = [
        { code: 'STR-A', name: 'Storage Zone A', type: 'storage' },
        { code: 'STR-B', name: 'Storage Zone B', type: 'storage' },
        { code: 'CLD', name: 'Cold Storage', type: 'cold' },
        { code: 'PCK', name: 'Picking Area', type: 'picking' },
    ];

    return items.map((item, i) => {
        const zone = zones[i % zones.length];
        const aisle = `${(i % 3) + 1}`;
        const rack = `${Math.floor(i / 3) % 3 + 1}`;
        const level = `${(i % 4) + 1}`;
        return {
            itemId: item.id, itemName: item.name, sku: item.sku,
            warehouseName: 'Demo Warehouse', warehouseCode: 'WH-DEMO-01',
            zoneName: zone.name, zoneCode: zone.code, zoneType: zone.type,
            binCode: `${zone.code}-A${aisle}-R${rack}-L${level}`,
            aisle, rack, level, position: '1',
            onHand: Math.floor(Math.random() * 50) + 5,
            reserved: Math.floor(Math.random() * 10),
            available: Math.floor(Math.random() * 40) + 1,
        };
    });
}

export default function ItemLocatorPage() {
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
        tooltipBg: isDark ? 'rgba(12,12,30,0.95)' : 'rgba(255,255,255,0.95)',
        tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        tooltipText: isDark ? '#e2e8f0' : '#1e293b',
        statsLabel: isDark ? '#64748b' : '#94a3b8',
        statsValue: isDark ? '#e2e8f0' : '#334155',
        chartAxis: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
        chartGrid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        iconOnGradient: '#fff',
    };

    const glass = { background: t.cardBg, backdropFilter: 'blur(12px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14 };
    const glassDark = { background: t.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${t.cardBorder}`, borderRadius: 14 };
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<ItemLocation[]>([]);
    const [searchText, setSearchText] = useState('');
    const [selectedItem, setSelectedItem] = useState<ItemLocation | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [items, warehouses, zones, bins, ledger] = await Promise.all([
                inventoryService.getItems().catch(() => []),
                inventoryService.getWarehouses().catch(() => []),
                inventoryService.getZones().catch(() => []),
                inventoryService.getBins().catch(() => []),
                inventoryService.getStockLedger().catch(() => []),
            ]);

            if (items.length > 0 && ledger.length > 0) {
                const whMap = new Map(warehouses.map((w: InvWarehouse) => [w.id, w]));
                const zoneMap = new Map(zones.map((z: InvZone) => [z.id, z]));
                const binMap = new Map(bins.map((b: InvBin) => [b.id, b]));

                const locs: ItemLocation[] = ledger.map((l: StockLedgerEntry) => {
                    const item = items.find((i: InvItem) => i.id === l.itemId);
                    const wh = l.warehouseId ? whMap.get(l.warehouseId) : null;
                    // Find a bin for this item in this warehouse
                    const zone = zones.find((z: InvZone) => z.warehouseId === l.warehouseId);
                    const bin = zone ? bins.find((b: InvBin) => b.zoneId === zone.id) : null;

                    return {
                        itemId: l.itemId,
                        itemName: item?.name || 'Unknown',
                        sku: item?.sku || '—',
                        warehouseName: wh?.name || 'Unknown',
                        warehouseCode: wh?.code || '—',
                        zoneName: zone?.name || '—',
                        zoneCode: zone?.code || '—',
                        zoneType: zone?.zoneType || 'storage',
                        binCode: bin?.code || '—',
                        aisle: bin?.aisle || '—',
                        rack: bin?.rack || '—',
                        level: bin?.level || '—',
                        position: bin?.position || '—',
                        onHand: l.onHand,
                        reserved: l.reserved,
                        available: l.available,
                    };
                }).filter((l: ItemLocation) => l.itemName !== 'Unknown');
                setLocations(locs.length > 0 ? locs : generateDemoLocations());
            } else {
                setLocations(generateDemoLocations());
            }
        } catch {
            setLocations(generateDemoLocations());
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        if (!searchText) return locations;
        const lower = searchText.toLowerCase();
        return locations.filter(l =>
            l.itemName.toLowerCase().includes(lower) ||
            l.sku.toLowerCase().includes(lower) ||
            l.binCode.toLowerCase().includes(lower) ||
            l.zoneCode.toLowerCase().includes(lower)
        );
    }, [locations, searchText]);

    const handleLocate = (item: ItemLocation) => {
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    const handleView3D = (item: ItemLocation) => {
        router.push(`/admin/inventory/warehouse-map?search=${encodeURIComponent(item.binCode)}`);
    };

    const columns: ColumnsType<ItemLocation> = [
        { title: 'Item', key: 'item', width: 220, render: (_, r) => (
            <div>
                <Text strong style={{ fontSize: 11 }}>{r.itemName}</Text>
                <div><Text code style={{ fontSize: 9 }}>{r.sku}</Text></div>
            </div>
        )},
        { title: 'Zone', dataIndex: 'zoneCode', width: 90, render: (v: string, r) => (
            <Tag color={ZONE_COLORS[r.zoneType] || 'default'} style={{ fontSize: 10, borderRadius: 6 }}>{v}</Tag>
        )},
        { title: 'Bin', dataIndex: 'binCode', width: 140, render: (v: string) => (
            <Text code style={{ fontSize: 10 }}>{v}</Text>
        )},
        { title: 'Location', key: 'loc', width: 150, render: (_, r) => (
            <Text style={{ fontSize: 10 }}>Aisle {r.aisle} / Rack {r.rack} / L{r.level}</Text>
        )},
        { title: 'On Hand', dataIndex: 'onHand', width: 70, render: (v: number) => <Text strong style={{ fontSize: 12, color: '#3b82f6' }}>{v}</Text> },
        { title: 'Available', dataIndex: 'available', width: 75, render: (v: number) => <Text strong style={{ fontSize: 12, color: '#22c55e' }}>{v}</Text> },
        { title: 'Reserved', dataIndex: 'reserved', width: 75, render: (v: number) => v > 0 ? <Badge count={v} style={{ backgroundColor: '#f59e0b' }} /> : <Text type="secondary">0</Text> },
        { title: '', key: 'actions', width: 100, render: (_, r) => (
            <Space size={4}>
                <Tooltip title="View Details"><Button size="small" type="text" icon={<AimOutlined />} onClick={() => handleLocate(r)} /></Tooltip>
                <Tooltip title="Show in 3D Map"><Button size="small" type="primary" icon={<EnvironmentOutlined />}
                    onClick={() => handleView3D(r)} style={{ background: themeColor, borderColor: themeColor, fontSize: 10 }}>3D</Button></Tooltip>
            </Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#22c55e', '#f59e0b']}>Item Locator</AuroraText>}
            subTitle={<DecryptedText text="Find any item's exact warehouse location instantly" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={load} />]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Items Tracked', value: locations.length, color: '#3b82f6', icon: <ShoppingOutlined /> },
                            { label: 'Total On Hand', value: locations.reduce((s, l) => s + l.onHand, 0), color: '#8b5cf6', icon: <InboxOutlined /> },
                            { label: 'Available', value: locations.reduce((s, l) => s + l.available, 0), color: '#22c55e', icon: <AppstoreOutlined /> },
                            { label: 'Reserved', value: locations.reduce((s, l) => s + l.reserved, 0), color: '#f59e0b', icon: <ColumnHeightOutlined /> },
                        ].map((s, i) => (
                            <Col xs={12} md={6} key={i}>
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}>
                                    <Card style={{ ...glassDark, borderTop: `3px solid ${s.color}`, position: 'relative', overflow: 'hidden' }} styles={{ body: { padding: '14px 16px' } }}>
                                        <div style={{ position: 'absolute', top: -8, right: -4, fontSize: 48, opacity: 0.04, color: s.color }}>
                                            {s.icon}
                                        </div>
                                        <Statistic title={<Text style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: t.textSecondary }}>{s.label}</Text>}
                                            value={s.value} prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                                            valueStyle={{ color: s.color, fontSize: 20, fontWeight: 700 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    {/* Search Bar */}
                    <Card style={{ ...glassDark, marginBottom: 16, borderLeft: `3px solid ${themeColor}` }} styles={{ body: { padding: '10px 16px' } }}>
                        <Space wrap style={{ width: '100%' }}>
                            <Input prefix={<SearchOutlined style={{ color: themeColor }} />}
                                placeholder="Search by item name, SKU, bin code, or zone..."
                                value={searchText} onChange={e => setSearchText(e.target.value)}
                                style={{ width: 380, borderRadius: 10 }} allowClear size="large" />
                            <Tag style={{ borderRadius: 20, padding: '2px 12px', fontSize: 11, fontWeight: 600, background: `${themeColor}10`, borderColor: `${themeColor}30`, color: themeColor }}>
                                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                            </Tag>
                        </Space>
                    </Card>

                    {/* Results Table */}
                    <Card size="small" title={
                        <Space>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AimOutlined style={{ color: t.iconOnGradient, fontSize: 12 }} />
                            </div>
                            <Text strong style={{ fontSize: 13 }}>Item Locations</Text>
                        </Space>
                    } style={glass}>
                        <Table<ItemLocation>
                            dataSource={filtered}
                            columns={columns}
                            rowKey={(r) => `${r.itemId}-${r.binCode}`}
                            size="small"
                            pagination={{ pageSize: 12, showSizeChanger: true }}
                            scroll={{ x: 900 }}
                        />
                    </Card>
                </motion.div>
            )}

            {/* Item Detail Drawer */}
            <Drawer title={selectedItem ? `📍 ${selectedItem.itemName}` : 'Item Location'}
                open={drawerOpen} onClose={() => setDrawerOpen(false)} width={380}>
                {selectedItem && (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {/* Item */}
                        <Card size="small" style={glass}>
                            <Space>
                                <Avatar size={40} style={{ background: `${themeColor}20`, color: themeColor }}><BarcodeOutlined /></Avatar>
                                <div>
                                    <Text strong style={{ fontSize: 13 }}>{selectedItem.itemName}</Text>
                                    <div><Text code style={{ fontSize: 10 }}>{selectedItem.sku}</Text></div>
                                </div>
                            </Space>
                        </Card>

                        {/* Location Path */}
                        <Card size="small" title={<Space size={6}><div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EnvironmentOutlined style={{ color: t.iconOnGradient, fontSize: 10 }} /></div><Text strong style={{ fontSize: 12 }}>Location Path</Text></Space>} style={{ ...glassDark, borderLeft: '3px solid #3b82f6' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    { label: 'Warehouse', value: `${selectedItem.warehouseCode} — ${selectedItem.warehouseName}`, icon: <HomeOutlined />, color: '#6b7280' },
                                    { label: 'Zone', value: `${selectedItem.zoneCode} — ${selectedItem.zoneName}`, icon: <AppstoreOutlined />, color: ZONE_COLORS[selectedItem.zoneType] || '#6b7280' },
                                    { label: 'Bin', value: selectedItem.binCode, icon: <InboxOutlined />, color: '#3b82f6' },
                                ].map((step, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${step.color}12`, color: step.color, fontSize: 13, border: `1px solid ${step.color}20` }}>{step.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <Text type="secondary" style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{step.label}</Text>
                                            <div><Text strong style={{ fontSize: 11 }}>{step.value}</Text></div>
                                        </div>
                                        {i < 2 && <RightOutlined style={{ color: t.textFaint, fontSize: 8 }} />}
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Exact Position */}
                        <Card size="small" title={<Space size={6}><div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: t.iconOnGradient }}>📐</div><Text strong style={{ fontSize: 12 }}>Exact Position</Text></Space>} style={{ ...glassDark, borderLeft: '3px solid #8b5cf6' }}>
                            <Row gutter={[8, 8]}>
                                {[
                                    { label: 'Aisle', value: selectedItem.aisle, color: '#3b82f6' },
                                    { label: 'Rack', value: selectedItem.rack, color: '#e87722' },
                                    { label: 'Level', value: selectedItem.level, color: '#22c55e' },
                                    { label: 'Position', value: selectedItem.position, color: '#8b5cf6' },
                                ].map(p => (
                                    <Col span={6} key={p.label}>
                                        <div style={{ textAlign: 'center', padding: '8px 0', background: `${p.color}08`, borderRadius: 8, border: `1px solid ${p.color}15` }}>
                                            <Text type="secondary" style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{p.label}</Text>
                                            <div><Text strong style={{ fontSize: 18, color: p.color }}>{p.value}</Text></div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>

                        {/* Stock */}
                        <Card size="small" title={<Space size={6}><div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: t.iconOnGradient }}>📦</div><Text strong style={{ fontSize: 12 }}>Stock</Text></Space>} style={{ ...glassDark, borderLeft: '3px solid #22c55e' }}>
                            <Row gutter={[8, 8]}>
                                <Col span={8}><Statistic title={<span style={{ fontSize: 9 }}>On Hand</span>} value={selectedItem.onHand} valueStyle={{ fontSize: 18, color: '#3b82f6', fontWeight: 700 }} /></Col>
                                <Col span={8}><Statistic title={<span style={{ fontSize: 9 }}>Available</span>} value={selectedItem.available} valueStyle={{ fontSize: 18, color: '#22c55e', fontWeight: 700 }} /></Col>
                                <Col span={8}><Statistic title={<span style={{ fontSize: 9 }}>Reserved</span>} value={selectedItem.reserved} valueStyle={{ fontSize: 18, color: '#f59e0b', fontWeight: 700 }} /></Col>
                            </Row>
                        </Card>

                        {/* 3D Navigate */}
                        <Button type="primary" block icon={<EnvironmentOutlined />} size="large"
                            onClick={() => handleView3D(selectedItem)}
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: 10 }}>
                            Show in 3D Warehouse Map
                        </Button>
                    </Space>
                )}
            </Drawer>
        </CMSLayout>
    );
}
