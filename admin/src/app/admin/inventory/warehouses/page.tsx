"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Badge, Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, message, Modal, Row, Select, Space, Spin, Table, Tabs, Tag, Tooltip, Typography } from "antd";
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

    const filteredBins = useMemo(() =>
        selectedZoneId ? bins.filter(b => b.zoneId === selectedZoneId) : bins,
        [bins, selectedZoneId]
    );

    // â”€â”€â”€ Warehouse CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€â”€ Zone CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleSaveZone = async () => {
        try {
            const values = await zoneForm.validateFields();
            await inventoryService.createZone(values.warehouseId, values);
            message.success("Zone created");
            setZoneModalOpen(false); zoneForm.resetFields(); loadAll();
        } catch { message.error("Failed"); }
    };

    // â”€â”€â”€ Bin CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleSaveBin = async () => {
        try {
            const values = await binForm.validateFields();
            await inventoryService.createBin(values.zoneId, values);
            message.success("Bin created");
            setBinModalOpen(false); binForm.resetFields(); loadAll();
        } catch { message.error("Failed"); }
    };

    // â”€â”€â”€ Transfer CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const kpiCards = [
        { title: 'Warehouses', value: stats?.totalWarehouses || 0, icon: <HomeOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Zones', value: stats?.totalZones || 0, icon: <AppstoreOutlined />, color: '#0ea5e9' },
        { title: 'Bins', value: stats?.totalBins || 0, icon: <InboxOutlined />, color: '#10b981' },
        { title: 'Active Transfers', value: stats?.activeTransfers || 0, icon: <SwapOutlined />, color: '#f59e0b' },
        { title: 'Total Capacity', value: stats?.totalCapacity || 0, icon: <ColumnHeightOutlined />, color: themeColor },
        { title: 'Used Capacity', value: stats?.usedCapacity || 0, icon: <ColumnHeightOutlined />, color: '#ef4444' },
    ];

    // â”€â”€â”€ Warehouse Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            title: '', key: 'actions', width: 100,
            render: (_: any, r: InvWarehouse) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditWarehouse(r)} />
                    <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: 'Delete warehouse?', onOk: () => handleDeleteWarehouse(r.id) })} />
                </Space>
            ),
        },
    ];

    // â”€â”€â”€ Zone Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const zoneColumns = [
        { title: 'Code', dataIndex: 'code', width: 100, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        {
            title: 'Warehouse', dataIndex: 'warehouseId', width: 160,
            render: (v: string) => <Text className="text-xs">{warehouseMap.get(v)?.name || v.slice(0, 8)}</Text>,
        },
        {
            title: 'Type', dataIndex: 'zoneType', width: 110,
            render: (v: string) => {
                const t = ZONE_TYPES[v] || { label: v, color: 'default' };
                return <Tag color={t.color} className="rounded-full text-xs">{t.label}</Tag>;
            }
        },
        { title: 'Capacity', dataIndex: 'capacity', width: 80 },
        { title: 'Description', dataIndex: 'description', ellipsis: true },
        {
            title: 'Status', dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
    ];

    // â”€â”€â”€ Bin Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const binColumns = [
        { title: 'Code', dataIndex: 'code', width: 130, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        {
            title: 'Zone', dataIndex: 'zoneId', width: 130,
            render: (v: string) => <Text className="text-xs">{zoneMap.get(v)?.name || v.slice(0, 8)}</Text>,
        },
        {
            title: 'Location', key: 'loc', width: 180,
            render: (_: any, r: InvBin) => (
                <Text className="text-xs">
                    Aisle {r.aisle || '-'} / Rack {r.rack || '-'} / L{r.level || '-'} / {r.position || '-'}
                </Text>
            ),
        },
        {
            title: 'Type', dataIndex: 'binType', width: 90,
            render: (v: string) => <Tag className="rounded-full text-xs">{v}</Tag>,
        },
        {
            title: 'Max Weight', dataIndex: 'maxWeight', width: 100,
            render: (v: number) => v ? `${v.toLocaleString()} kg` : '-',
        },
        {
            title: 'Status', dataIndex: 'status', width: 100,
            render: (v: string) => <Tag color={BIN_STATUSES[v]?.color || 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
    ];

    // â”€â”€â”€ Transfer Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={{
                                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.5)', borderRadius: 12,
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
                    flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)',
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
                                            <Button type="primary" icon={<PlusOutlined />}
                                                onClick={() => { binForm.resetFields(); setBinModalOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                                Add Bin
                                            </Button>
                                        </Space>
                                    </div>

                                    <Row gutter={16}>
                                        <Col xs={24} lg={10}>
                                            <Text strong className="text-sm mb-2 block"
                                                style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                Zones
                                            </Text>
                                            <Table dataSource={filteredZones} columns={zoneColumns}
                                                rowKey="id" loading={loading} size="small"
                                                pagination={{ pageSize: 8, showSizeChanger: false }}
                                                onRow={(record) => ({
                                                    onClick: () => setSelectedZoneId(record.id),
                                                    style: { cursor: 'pointer', background: selectedZoneId === record.id ? '#f5f3ff' : undefined },
                                                })}
                                                scroll={{ x: 600 }}
                                            />
                                        </Col>
                                        <Col xs={24} lg={14}>
                                            <Text strong className="text-sm mb-2 block"
                                                style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                Bins {selectedZoneId ? `(${zoneMap.get(selectedZoneId)?.name || ''})` : '(All)'}
                                            </Text>
                                            <Table dataSource={filteredBins} columns={binColumns}
                                                rowKey="id" loading={loading} size="small"
                                                pagination={{ pageSize: 8, showSizeChanger: false }}
                                                scroll={{ x: 700 }}
                                            />
                                        </Col>
                                    </Row>
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

            {/* â”€â”€â”€ Warehouse SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€â”€ Zone Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€â”€ Bin Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€â”€ Transfer Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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




