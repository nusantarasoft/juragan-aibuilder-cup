"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Badge, Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, message, Modal, Row, Select, Space, Spin, Table, Tabs, Tag, Tooltip, Typography , theme } from "antd";
import {
    HomeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
    EnvironmentOutlined, AppstoreOutlined, InboxOutlined,
    SwapOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, DeleteOutlined, EditOutlined,
    EyeOutlined, ColumnHeightOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    inventoryService, InvWarehouse, InvZone, InvBin,
    InvStockTransfer, WarehouseStats
} from "@/lib/inventoryService";
import ItemPicker from "@/components/inventory/ItemPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Title, Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

const WAREHOUSE_TYPES: Record<string, { label: string; color: string }> = {
    general: { label: 'General', color: 'blue' },
    cold: { label: 'Cold Storage', color: 'cyan' },
    hazardous: { label: 'Hazardous', color: 'red' },
    bonded: { label: 'Bonded', color: 'purple' },
    transit: { label: 'Transit', color: 'orange' },
};

const ZONE_TYPES: Record<string, { label: string; color: string }> = {
    receiving: { label: 'Receiving', color: 'green' },
    storage: { label: 'Storage', color: 'blue' },
    picking: { label: 'Picking', color: 'orange' },
    packing: { label: 'Packing', color: 'purple' },
    shipping: { label: 'Shipping', color: 'cyan' },
    cold: { label: 'Cold', color: 'geekblue' },
    quarantine: { label: 'Quarantine', color: 'red' },
    staging: { label: 'Staging', color: 'gold' },
    hazardous: { label: 'Hazardous', color: 'volcano' },
    climate_controlled: { label: 'Climate Ctrl', color: 'geekblue' },
    port: { label: 'Port', color: 'lime' },
};

const BIN_STATUSES: Record<string, { color: string }> = {
    available: { color: 'green' },
    occupied: { color: 'blue' },
    reserved: { color: 'orange' },
    maintenance: { color: 'red' },
};

const TRANSFER_STATUSES: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'orange', icon: <ClockCircleOutlined /> },
    approved: { color: 'blue', icon: <CheckCircleOutlined /> },
    in_transit: { color: 'purple', icon: <SwapOutlined /> },
    completed: { color: 'green', icon: <CheckCircleOutlined /> },
    cancelled: { color: 'default', icon: <ExclamationCircleOutlined /> },
};

const WAREHOUSE_FIELDS: FieldDef[] = [
    { name: 'code', label: 'Code', required: true },
    { name: 'name', label: 'Name', required: true },
    { name: 'warehouseType', label: 'Type' },
    { name: 'address', label: 'Address' },
    { name: 'city', label: 'City' },
    { name: 'country', label: 'Country' },
    { name: 'totalCapacity', label: 'Capacity', type: 'number' },
    { name: 'manager', label: 'Manager' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'status', label: 'Status' },
];

export default function WarehousesPage() {
    const [stats, setStats] = useState<WarehouseStats | null>(null);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const { startDate, endDate } = useDateRangeStore();
    const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
    const [zones, setZones] = useState<InvZone[]>([]);
    const [bins, setBins] = useState<InvBin[]>([]);
    const [transfers, setTransfers] = useState<InvStockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("warehouses");
    const [searchTerm, setSearchTerm] = useState("");

    // Modals
    const [whModalOpen, setWhModalOpen] = useState(false);
    const [whEditId, setWhEditId] = useState<string | null>(null);
    const [whForm] = Form.useForm();

    const [zoneModalOpen, setZoneModalOpen] = useState(false);
    const [zoneForm] = Form.useForm();

    const [binModalOpen, setBinModalOpen] = useState(false);
    const [binForm] = Form.useForm();

    const [bulkBinModalOpen, setBulkBinModalOpen] = useState(false);
    const [bulkBinForm] = Form.useForm();
    const [bulkGenerating, setBulkGenerating] = useState(false);

    const [trfModalOpen, setTrfModalOpen] = useState(false);
    const [trfForm] = Form.useForm();

    // Zone/Bin filters
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
    const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsData, whData, zonesData, binsData, trfData] = await Promise.all([
                inventoryService.getWarehouseStats(),
                inventoryService.getWarehouses(),
                inventoryService.getZones(),
                inventoryService.getBins(),
                inventoryService.getStockTransfers(),
            ]);
            setStats(statsData);
            setWarehouses(whData);
            setZones(zonesData);
            setBins(binsData);
            setTransfers(trfData);
        } catch (err) {
            console.error(err);
            message.error("Failed to load warehouse data");
        } finally {
            setLoading(false);
        }
    };

    const warehouseMap = useMemo(() => new Map(warehouses.map(w => [w.id, w])), [warehouses]);
    const zoneMap = useMemo(() => new Map(zones.map(z => [z.id, z])), [zones]);

    const filteredZones = useMemo(() =>
        selectedWarehouseId ? zones.filter(z => z.warehouseId === selectedWarehouseId) : zones,
        [zones, selectedWarehouseId]
    );

    const binCountByZone = useMemo(() => {
        const map = new Map<string, number>();
        bins.forEach(b => map.set(b.zoneId, (map.get(b.zoneId) || 0) + 1));
        return map;
    }, [bins]);

    const filteredBins = useMemo(() => {
        if (selectedZoneId) return bins.filter(b => b.zoneId === selectedZoneId);
        if (selectedWarehouseId) {
            const whZoneIds = new Set(zones.filter(z => z.warehouseId === selectedWarehouseId).map(z => z.id));
            return bins.filter(b => whZoneIds.has(b.zoneId));
        }
        return bins;
    }, [bins, selectedZoneId, selectedWarehouseId, zones]);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Warehouse CRUD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const handleSaveWarehouse = async (values: any) => {
        if (whEditId) {
            await inventoryService.updateWarehouse(whEditId, values);
            message.success("Warehouse updated");
        } else {
            await inventoryService.createWarehouse('default', values);
            message.success("Warehouse created");
        }
        setWhModalOpen(false); whForm.resetFields(); setWhEditId(null);
        loadAll();
    };

    const handleBatchCreateWarehouse = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createWarehouse('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.code || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleEditWarehouse = (wh: InvWarehouse) => {
        setWhEditId(wh.id);
        whForm.setFieldsValue({
            code: wh.code, name: wh.name, warehouseType: wh.warehouseType,
            address: wh.address, city: wh.city, country: wh.country,
            totalCapacity: wh.totalCapacity, manager: wh.manager,
            phone: wh.phone, email: wh.email, status: wh.status,
        });
        setWhModalOpen(true);
    };

    const handleDeleteWarehouse = async (id: string) => {
        try {
            await inventoryService.deleteWarehouse(id);
            message.success("Warehouse deleted");
            loadAll();
        } catch { message.error("Failed to delete"); }
    };

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Zone CRUD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const handleSaveZone = async () => {
        try {
            const values = await zoneForm.validateFields();
            await inventoryService.createZone(values.warehouseId, values);
            message.success("Zone created");
            setZoneModalOpen(false); zoneForm.resetFields(); loadAll();
        } catch { message.error("Failed"); }
    };

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Bin CRUD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const handleSaveBin = async () => {
        try {
            const values = await binForm.validateFields();
            await inventoryService.createBin(values.zoneId, values);
            message.success("Bin created");
            setBinModalOpen(false); binForm.resetFields(); loadAll();
        } catch { message.error("Failed"); }
    };

    // ─── Bulk Bin Generator ────────────────────────────
    const bulkBinPreview = useMemo(() => {
        const vals = bulkBinForm.getFieldsValue();
        if (!vals.aisleStart || !vals.aisleEnd || !vals.rackStart || !vals.rackEnd || !vals.levelStart || !vals.levelEnd) return 0;
        const aisleCount = Math.max(0, vals.aisleEnd.charCodeAt(0) - vals.aisleStart.charCodeAt(0) + 1);
        const rackCount = Math.max(0, (vals.rackEnd || 1) - (vals.rackStart || 1) + 1);
        const levelCount = Math.max(0, (vals.levelEnd || 1) - (vals.levelStart || 1) + 1);
        const posCount = Math.max(1, ((vals.positionEnd || 1) - (vals.positionStart || 1) + 1));
        return aisleCount * rackCount * levelCount * posCount;
    }, [bulkBinForm]);

    const handleBulkGenerateBins = async () => {
        try {
            const values = await bulkBinForm.validateFields();
            setBulkGenerating(true);
            const result = await inventoryService.bulkCreateBins(values.zoneId, {
                aisleStart: values.aisleStart,
                aisleEnd: values.aisleEnd,
                rackStart: values.rackStart,
                rackEnd: values.rackEnd,
                levelStart: values.levelStart,
                levelEnd: values.levelEnd,
                positionStart: values.positionStart || 1,
                positionEnd: values.positionEnd || 1,
                binType: values.binType || 'standard',
                maxWeight: values.maxWeight || undefined,
                maxVolume: values.maxVolume || undefined,
                codePrefix: values.codePrefix || '',
            });
            message.success(`Successfully generated ${result.created} bins!`);
            setBulkBinModalOpen(false);
            bulkBinForm.resetFields();
            loadAll();
        } catch (err: any) {
            message.error(err?.message || 'Failed to generate bins');
        } finally {
            setBulkGenerating(false);
        }
    };

    // ─── Transfer CRUD ────────────────────────────────────────────
    const handleCreateTransfer = async () => {
        try {
            const values = await trfForm.validateFields();
            await inventoryService.createStockTransfer('default', values);
            message.success("Transfer request created");
            setTrfModalOpen(false); trfForm.resetFields(); loadAll();
        } catch { message.error("Failed"); }
    };

    const handleApproveTransfer = async (id: string) => {
        try {
            await inventoryService.approveStockTransfer(id);
            message.success("Transfer approved");
            loadAll();
        } catch { message.error("Failed to approve"); }
    };

    const handleCompleteTransfer = async (id: string) => {
        try {
            await inventoryService.completeStockTransfer(id);
            message.success("Transfer completed");
            loadAll();
        } catch { message.error("Failed to complete"); }
    };

    // ─── KPI Cards ────────────────────────────────────────────────
    const kpiCards = [
        { title: 'Warehouses', value: stats?.totalWarehouses || 0, icon: <HomeOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Zones', value: stats?.totalZones || 0, icon: <AppstoreOutlined />, color: '#0ea5e9' },
        { title: 'Bins', value: stats?.totalBins || 0, icon: <InboxOutlined />, color: '#10b981' },
        { title: 'Active Transfers', value: stats?.activeTransfers || 0, icon: <SwapOutlined />, color: '#f59e0b' },
        { title: 'Total Capacity', value: stats?.totalCapacity || 0, icon: <ColumnHeightOutlined />, color: themeColor },
        { title: 'Used Capacity', value: stats?.usedCapacity || 0, icon: <ColumnHeightOutlined />, color: '#ef4444' },
    ];

    // ─── Warehouse Columns ────────────────────────────────────────
    const warehouseColumns = [
        { title: 'Code', dataIndex: 'code', width: 120, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        {
            title: 'Type', dataIndex: 'warehouseType', width: 120,
            render: (v: string) => {
                const t = WAREHOUSE_TYPES[v] || { label: v, color: 'default' };
                return <Tag color={t.color} className="rounded-full text-xs">{t.label}</Tag>;
            }
        },
        { title: 'City', dataIndex: 'city', width: 120 },
        { title: 'Manager', dataIndex: 'manager', width: 140 },
        {
            title: 'Capacity', key: 'cap', width: 130,
            render: (_: any, r: InvWarehouse) => {
                const pct = r.totalCapacity ? Math.round(((r.usedCapacity || 0) / r.totalCapacity) * 100) : 0;
                return (
                    <div>
                        <Text className="text-xs">{(r.usedCapacity || 0).toLocaleString()} / {(r.totalCapacity || 0).toLocaleString()}</Text>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{
                                width: `${pct}%`,
                                background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                            }} />
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Status', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'maintenance' ? 'orange' : 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
        {
            title: '', key: 'actions', width: 140,
            render: (_: any, r: InvWarehouse) => (
                <Space size="small">
                    <Tooltip title="View in 3D"><Button size="small" type="primary" icon={<EnvironmentOutlined />}
                        onClick={() => window.location.href = `/admin/inventory/warehouse-map?warehouse=${r.id}`}
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', fontSize: 10 }}>3D</Button></Tooltip>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditWarehouse(r)} />
                    <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: 'Delete warehouse?', onOk: () => handleDeleteWarehouse(r.id) })} />
                </Space>
            ),
        },
    ];

    // ─── Zone Columns ─────────────────────────────────────────────
    const zoneColumns = [
        { title: 'Code', dataIndex: 'code', width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'Name', dataIndex: 'name', width: 180, render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
        {
            title: 'Warehouse', dataIndex: 'warehouseId', width: 150,
            render: (v: string) => {
                const wh = warehouseMap.get(v);
                return wh ? (
                    <Tooltip title={`${wh.code} — ${wh.name}`}>
                        <Tag color="blue" style={{ borderRadius: 8, fontSize: 10, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <HomeOutlined style={{ marginRight: 4 }} />{wh.name}
                        </Tag>
                    </Tooltip>
                ) : <Text type="secondary" style={{ fontSize: 11 }}>{v?.slice(0, 8)}...</Text>;
            },
        },
        {
            title: 'Type', dataIndex: 'zoneType', width: 110,
            render: (v: string) => {
                const t = ZONE_TYPES[v] || { label: v || '—', color: 'default' };
                return <Tag color={t.color} style={{ borderRadius: 10, fontSize: 10 }}>{t.label}</Tag>;
            }
        },
        {
            title: 'Bins', key: 'binCount', width: 70,
            render: (_: any, r: InvZone) => {
                const count = binCountByZone.get(r.id) || 0;
                return <Badge count={count} showZero style={{ backgroundColor: count > 0 ? themeColor : '#999', fontSize: 10 }} overflowCount={999} />;
            },
        },
        {
            title: 'Status', dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag>,
        },
        {
            title: '', key: 'actions', width: 60,
            render: (_: any, r: InvZone) => (
                <Tooltip title="Delete zone">
                    <Button size="small" danger type="text" icon={<DeleteOutlined />}
                        onClick={(e) => { e.stopPropagation(); Modal.confirm({ title: `Delete zone "${r.name}"?`, content: 'This will also delete all bins in this zone.', onOk: async () => { try { await inventoryService.deleteZone(r.id); message.success('Zone deleted'); loadAll(); } catch { message.error('Failed to delete zone'); } } }); }} />
                </Tooltip>
            ),
        },
    ];

    // ─── Bin Columns ──────────────────────────────────────────────
    const binColumns = [
        { title: 'Code', dataIndex: 'code', width: 120, render: (v: string) => <Text code style={{ fontSize: 11, fontWeight: 600 }}>{v}</Text> },
        {
            title: 'Warehouse', key: 'warehouse', width: 140,
            render: (_: any, r: InvBin) => {
                const zone = zoneMap.get(r.zoneId);
                const wh = zone ? warehouseMap.get(zone.warehouseId) : null;
                return wh ? (
                    <Text style={{ fontSize: 11 }}>{wh.name}</Text>
                ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
            },
        },
        {
            title: 'Zone', dataIndex: 'zoneId', width: 140,
            render: (v: string) => {
                const zone = zoneMap.get(v);
                return zone ? (
                    <Tooltip title={`${zone.code} — ${zone.name}`}>
                        <Tag color={ZONE_TYPES[zone.zoneType || '']?.color || 'default'} style={{ borderRadius: 8, fontSize: 10 }}>
                            {zone.name}
                        </Tag>
                    </Tooltip>
                ) : <Text type="secondary" style={{ fontSize: 11 }}>{v?.slice(0, 8)}...</Text>;
            },
        },
        {
            title: 'Location', key: 'loc', width: 200,
            render: (_: any, r: InvBin) => (
                <Space size={4}>
                    {r.aisle && <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>A:{r.aisle}</Tag>}
                    {r.rack && r.rack !== 'null' && <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>R:{r.rack}</Tag>}
                    {r.level && r.level !== 'null' && <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>L:{r.level}</Tag>}
                    {r.position && <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>P:{r.position}</Tag>}
                </Space>
            ),
        },
        {
            title: 'Type', dataIndex: 'binType', width: 85,
            render: (v: string) => <Tag color="blue" style={{ borderRadius: 10, fontSize: 10 }}>{v || '—'}</Tag>,
        },
        {
            title: 'Weight', dataIndex: 'maxWeight', width: 80,
            render: (v: number) => v ? <Text style={{ fontSize: 11 }}>{v.toLocaleString()} kg</Text> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
        },
        {
            title: 'Status', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={BIN_STATUSES[v]?.color || 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag>,
        },
        {
            title: '', key: 'actions', width: 50,
            render: (_: any, r: InvBin) => (
                <Tooltip title="Delete bin">
                    <Button size="small" danger type="text" icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete bin "${r.code}"?`, onOk: async () => { try { await inventoryService.deleteBin(r.id); message.success('Bin deleted'); loadAll(); } catch { message.error('Failed to delete bin'); } } })} />
                </Tooltip>
            ),
        },
    ];

    // ─── Transfer Columns ─────────────────────────────────────────
    const transferColumns = [
        {
            title: 'Transfer #', dataIndex: 'transferNumber', width: 130,
            render: (v: string) => <Text code className="text-xs">{v}</Text>,
        },
        {
            title: 'From', dataIndex: 'fromWarehouseId', width: 180,
            render: (v: string) => <Text className="text-xs">{warehouseMap.get(v)?.name || v?.slice(0, 8) || '-'}</Text>,
        },
        {
            title: 'To', dataIndex: 'toWarehouseId', width: 180,
            render: (v: string) => <Text className="text-xs">{warehouseMap.get(v)?.name || v?.slice(0, 8) || '-'}</Text>,
        },
        { title: 'Item', dataIndex: 'itemName', width: 200, ellipsis: true },
        {
            title: 'Qty', dataIndex: 'quantity', width: 80,
            render: (v: number, r: InvStockTransfer) => <Text strong className="text-sm">{v} {r.uom}</Text>,
        },
        { title: 'Requested By', dataIndex: 'requestedBy', width: 120 },
        {
            title: 'Status', dataIndex: 'status', width: 110,
            render: (v: string) => {
                const s = TRANSFER_STATUSES[v] || { color: 'default', icon: null };
                return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs">{v}</Tag>;
            },
        },
        {
            title: '', key: 'actions', width: 140,
            render: (_: any, r: InvStockTransfer) => (
                <Space size="small">
                    {r.status === 'pending' && (
                        <Button size="small" type="primary" onClick={() => handleApproveTransfer(r.id)}
                            style={{ background: '#10b981', border: 'none', fontSize: 11 }}>
                            Approve
                        </Button>
                    )}
                    {r.status === 'approved' && (
                        <Button size="small" type="primary" onClick={() => handleCompleteTransfer(r.id)}
                            style={{ background: '#6366f1', border: 'none', fontSize: 11 }}>
                            Complete
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const warehouseSteps = [
        {
            title: "Basic Info",
            icon: <HomeOutlined />,
            fields: ["code", "name", "warehouseType", "totalCapacity"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                                <Input placeholder="WH-XXX-01" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                                <Input placeholder="Warehouse name" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="warehouseType" label="Type" initialValue="general">
                                <Select options={Object.entries(WAREHOUSE_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="city" label="City"><Input placeholder="City" /></Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="totalCapacity" label="Capacity">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="address" label="Address"><Input placeholder="Full address" /></Form.Item>
                </>
            ),
        },
        {
            title: "Contact & Status",
            icon: <EnvironmentOutlined />,
            fields: ["manager", "phone", "email", "status", "country"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="manager" label="Manager"><Input placeholder="Name" /></Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="phone" label="Phone"><Input placeholder="+62..." /></Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="email" label="Email"><Input placeholder="email@..." /></Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="country" label="Country"><Input placeholder="Country" /></Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="Status" initialValue="active">
                                <Select options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'maintenance', label: 'Maintenance' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Warehouses</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Manage warehouses, zones, bins, and stock transfers"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential
                />
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                {/* KPI Cards */}
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={{
                                    ...(isDark ? glassDark : glass), borderTop: `3px solid ${s.color}`, position: 'relative', overflow: 'hidden',
                                }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <Text type="secondary" className="text-xs block">{s.title}</Text>
                                            <Text strong className="text-lg">{s.value.toLocaleString()}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Tabs */}
                <Card size="small" style={{
                    flex: 1, ...(isDark ? glassDark : glass), borderLeft: `3px solid var(--theme-color, #7c3aed)`,
                }}>
                    <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                        {
                            key: 'warehouses',
                            label: <span><HomeOutlined /> Warehouses ({warehouses.length})</span>,
                            children: (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Input prefix={<SearchOutlined className="text-gray-400" />}
                                            placeholder="Search warehouses..." value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)} allowClear
                                            style={{ maxWidth: 280, borderRadius: 8 }} />
                                        <Space>
                                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'inventory_warehouses', title: 'Warehouses', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Code', key: 'code' }, { header: 'Location', key: 'location' }, { header: 'Type', key: 'warehouseType' }, { header: 'Status', key: 'status' }], data: warehouses })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'inventory_warehouses', title: 'Warehouses', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Code', key: 'code' }, { header: 'Location', key: 'location' }, { header: 'Type', key: 'warehouseType' }, { header: 'Status', key: 'status' }], data: warehouses })} /></Tooltip></RbacGuard>
                                            <Button type="primary" icon={<PlusOutlined />}
                                                onClick={() => { whForm.resetFields(); setWhEditId(null); setWhModalOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                                Add Warehouse
                                            </Button>
                                        </Space>
                                    </div>
                                    <Table
                                        dataSource={warehouses.filter(w =>
                                            !searchTerm || w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            w.code.toLowerCase().includes(searchTerm.toLowerCase())
                                        )}
                                        columns={warehouseColumns} rowKey="id" loading={loading}
                                        pagination={{ pageSize: 10, showSizeChanger: false }} size="small"
                                        scroll={{ x: 900 }}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'zones',
                            label: <span><AppstoreOutlined /> Zones & Bins ({zones.length} / {bins.length})</span>,
                            children: (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Space>
                                            <Select placeholder="Filter by warehouse" allowClear
                                                value={selectedWarehouseId} onChange={v => { setSelectedWarehouseId(v); setSelectedZoneId(undefined); }}
                                                options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                                                style={{ minWidth: 240 }} />
                                            <Select placeholder="Filter by zone" allowClear
                                                value={selectedZoneId} onChange={setSelectedZoneId}
                                                options={filteredZones.map(z => ({ value: z.id, label: `${z.code} - ${z.name}` }))}
                                                style={{ minWidth: 200 }} />
                                        </Space>
                                        <Space>
                                            <Button icon={<PlusOutlined />}
                                                onClick={() => { zoneForm.resetFields(); setZoneModalOpen(true); }}
                                                style={{ borderColor: 'var(--theme-color, #7c3aed)', color: 'var(--theme-color, #7c3aed)' }}>
                                                Add Zone
                                            </Button>
                                            <Button icon={<PlusOutlined />}
                                                onClick={() => { bulkBinForm.resetFields(); setBulkBinModalOpen(true); }}
                                                style={{ borderColor: '#10b981', color: '#10b981' }}>
                                                Generate Bins
                                            </Button>
                                            <Button type="primary" icon={<PlusOutlined />}
                                                onClick={() => { binForm.resetFields(); setBinModalOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                                Add Bin
                                            </Button>
                                        </Space>
                                    </div>

                                    {/* Zones Table */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text strong style={{ fontSize: 13, background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                <AppstoreOutlined style={{ marginRight: 6 }} />Zones ({filteredZones.length})
                                            </Text>
                                            {selectedZoneId && (
                                                <Button size="small" type="link" onClick={() => setSelectedZoneId(undefined)} style={{ fontSize: 11 }}>
                                                    Clear zone filter
                                                </Button>
                                            )}
                                        </div>
                                        <Table dataSource={filteredZones} columns={zoneColumns}
                                            rowKey="id" loading={loading} size="small"
                                            pagination={{ pageSize: 6, showSizeChanger: true, showTotal: (t) => `${t} zones`, size: 'small' }}
                                            onRow={(record) => ({
                                                onClick: () => setSelectedZoneId(prev => prev === record.id ? undefined : record.id),
                                                style: { cursor: 'pointer', background: selectedZoneId === record.id ? (isDark ? 'rgba(124,58,237,0.15)' : '#f5f3ff') : undefined, transition: 'background 0.2s' },
                                            })}
                                            scroll={{ x: 750 }}
                                        />
                                    </div>

                                    {/* Bins Table */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text strong style={{ fontSize: 13, background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                <InboxOutlined style={{ marginRight: 6 }} />
                                                Bins ({filteredBins.length})
                                                {selectedZoneId && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8, fontWeight: 400 }}>in {zoneMap.get(selectedZoneId)?.name || 'zone'}</Text>}
                                                {!selectedZoneId && selectedWarehouseId && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8, fontWeight: 400 }}>in {warehouseMap.get(selectedWarehouseId)?.name || 'warehouse'}</Text>}
                                            </Text>
                                        </div>
                                        <Table dataSource={filteredBins} columns={binColumns}
                                            rowKey="id" loading={loading} size="small"
                                            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} bins`, size: 'small' }}
                                            scroll={{ x: 900 }}
                                        />
                                    </div>
                                </div>
                            ),
                        },
                        {
                            key: 'transfers',
                            label: <span><SwapOutlined /> Transfers ({transfers.length})</span>,
                            children: (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div />
                                        <Space>
                                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                                            <Button type="primary" icon={<PlusOutlined />}
                                                onClick={() => { trfForm.resetFields(); setTrfModalOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                                New Transfer
                                            </Button>
                                        </Space>
                                    </div>
                                    <Table dataSource={transfers} columns={transferColumns}
                                        rowKey="id" loading={loading} size="small"
                                        pagination={{ pageSize: 10, showSizeChanger: false }}
                                        scroll={{ x: 1000 }}
                                    />
                                </div>
                            ),
                        },
                    ]} />
                </Card>
            </div>

            {/* ─── Warehouse SteppedFormModal ───────────────────────────── */}
            <SteppedFormModal
                open={whModalOpen}
                onCancel={() => { setWhModalOpen(false); setWhEditId(null); whForm.resetFields(); }}
                onSubmit={handleSaveWarehouse}
                form={whForm}
                title={whEditId ? "Edit Warehouse" : "Add Warehouse"}
                entityName="warehouse"
                steps={warehouseSteps}
                fields={WAREHOUSE_FIELDS}
                width={600}
                loading={false}
                onBatchCreate={handleBatchCreateWarehouse}
                gradient={["var(--theme-color, #7c3aed)", "#6366f1"]}
                editMode={!!whEditId}
            />

            {/* ─── Zone Modal ───────────────────────────────────────────── */}
            <Modal title="Add Zone" open={zoneModalOpen} onCancel={() => setZoneModalOpen(false)}
                onOk={handleSaveZone} okText="Create">
                <Form form={zoneForm} layout="vertical">
                    <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
                        <Select placeholder="Select warehouse"
                            options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                                <Input placeholder="ZN-A" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                                <Input placeholder="Zone name" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="zoneType" label="Type" initialValue="storage">
                                <Select options={Object.entries(ZONE_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="capacity" label="Capacity">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Zone description" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* ─── Bin Modal ────────────────────────────────────────────── */}
            <Modal title="Add Bin" open={binModalOpen} onCancel={() => setBinModalOpen(false)}
                onOk={handleSaveBin} okText="Create">
                <Form form={binForm} layout="vertical">
                    <Form.Item name="zoneId" label="Zone" rules={[{ required: true }]}>
                        <Select placeholder="Select zone" showSearch optionFilterProp="label"
                            options={zones.map(z => ({
                                value: z.id,
                                label: `${z.code} - ${z.name} (${warehouseMap.get(z.warehouseId)?.code || ''})`
                            }))} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="code" label="Bin Code" rules={[{ required: true }]}>
                                <Input placeholder="BLK-A-01-1L" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="binType" label="Type" initialValue="standard">
                                <Select options={[
                                    { value: 'standard', label: 'Standard' },
                                    { value: 'pallet', label: 'Pallet' },
                                    { value: 'shelf', label: 'Shelf' },
                                    { value: 'floor', label: 'Floor' },
                                    { value: 'cold', label: 'Cold' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="maxWeight" label="Max Weight (kg)">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}><Form.Item name="aisle" label="Aisle"><Input /></Form.Item></Col>
                        <Col span={6}><Form.Item name="rack" label="Rack"><Input /></Form.Item></Col>
                        <Col span={6}><Form.Item name="level" label="Level"><Input /></Form.Item></Col>
                        <Col span={6}><Form.Item name="position" label="Position"><Input /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {/* ─── Bulk Bin Generator Modal ────────────── */}
            <Modal
                title={<span style={{ background: `linear-gradient(to right, #10b981, #059669)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>Bulk Bin Generator</span>}
                open={bulkBinModalOpen}
                onCancel={() => setBulkBinModalOpen(false)}
                onOk={handleBulkGenerateBins}
                okText={`Generate Bins`}
                confirmLoading={bulkGenerating}
                width={640}
                okButtonProps={{ style: { background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' } }}
            >
                <Form form={bulkBinForm} layout="vertical" onValuesChange={() => bulkBinForm.getFieldsValue()}>
                    <Form.Item name="zoneId" label="Zone" rules={[{ required: true, message: 'Select a zone' }]}>
                        <Select placeholder="Select zone" showSearch optionFilterProp="label"
                            options={zones.map(z => ({ value: z.id, label: `${z.code} - ${z.name} (${warehouseMap.get(z.warehouseId)?.code || ''})` }))} />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="aisleStart" label="Aisle Start" rules={[{ required: true }]} initialValue="A">
                                <Input maxLength={1} placeholder="A" style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="aisleEnd" label="Aisle End" rules={[{ required: true }]} initialValue="D">
                                <Input maxLength={1} placeholder="D" style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="rackStart" label="Rack Start" rules={[{ required: true }]} initialValue={1}>
                                <InputNumber min={1} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="rackEnd" label="Rack End" rules={[{ required: true }]} initialValue={10}>
                                <InputNumber min={1} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="levelStart" label="Level Start" rules={[{ required: true }]} initialValue={1}>
                                <InputNumber min={1} max={20} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="levelEnd" label="Level End" rules={[{ required: true }]} initialValue={5}>
                                <InputNumber min={1} max={20} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="positionStart" label="Position Start" initialValue={1}>
                                <InputNumber min={1} max={10} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="positionEnd" label="Position End" initialValue={1}>
                                <InputNumber min={1} max={10} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item name="binType" label="Bin Type" initialValue="standard">
                                <Select options={[
                                    { value: 'standard', label: 'Standard' },
                                    { value: 'pallet', label: 'Pallet' },
                                    { value: 'shelf', label: 'Shelf' },
                                    { value: 'floor', label: 'Floor' },
                                    { value: 'cold', label: 'Cold' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="maxWeight" label="Max Weight (kg)">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="codePrefix" label="Code Prefix">
                                <Input placeholder="e.g. BLK-" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))', border: '1px solid rgba(16,185,129,0.2)', marginTop: 8 }}>
                        <Space direction="vertical" size={2}>
                            <Text strong style={{ color: '#10b981', fontSize: 14 }}>
                                Preview: This will create approximately {bulkBinPreview.toLocaleString()} bins
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Code format: [Prefix]Aisle-Rack-Level-Position (e.g. A-01-L1-P1)
                            </Text>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* ─── Transfer Modal ────────────────────────────────────────── */}
            <Modal title="New Stock Transfer" open={trfModalOpen} onCancel={() => setTrfModalOpen(false)}
                onOk={handleCreateTransfer} okText="Create Transfer" width={600}>
                <Form form={trfForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="fromWarehouseId" label="From Warehouse" rules={[{ required: true }]}>
                                <Select placeholder="Source"
                                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="toWarehouseId" label="To Warehouse" rules={[{ required: true }]}>
                                <Select placeholder="Destination"
                                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item name="itemId" label="Item" rules={[{ required: true, message: 'Select an item' }]}>
                                <ItemPicker
                                    placeholder="Search items by name or SKU..."
                                    onItemSelect={(item) => {
                                        if (item) {
                                            trfForm.setFieldsValue({ itemName: item.name, uom: item.uom || 'pcs' });
                                        } else {
                                            trfForm.setFieldsValue({ itemName: undefined, uom: 'pcs' });
                                        }
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="itemName" hidden><input /></Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="requestedBy" label="Requested By">
                                <Input placeholder="Name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="uom" label="UOM" initialValue="pcs">
                                <Select options={[
                                    { value: 'pcs', label: 'Pieces' },
                                    { value: 'kg', label: 'Kilograms' },
                                    { value: 'ltr', label: 'Liters' },
                                    { value: 'box', label: 'Boxes' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="reason" label="Reason">
                        <Input.TextArea rows={2} placeholder="Transfer reason" />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}






