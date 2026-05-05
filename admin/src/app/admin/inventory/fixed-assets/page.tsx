"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Tag, Card, Typography, message,
    Row, Col, Modal, Form, Input, InputNumber, Select, Tooltip,
    Drawer, Descriptions, Divider, Progress
} from "antd";
import {
    CarOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
    DeleteOutlined, EditOutlined, EyeOutlined,
    ToolOutlined, DollarOutlined, ExclamationCircleOutlined,
    CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
    ThunderboltOutlined, CalendarOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    inventoryService, FixedAsset, FixedAssetStatsType
} from "@/lib/inventoryService";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

const ASSET_STATUSES: Record<string, { color: string; icon: React.ReactNode }> = {
    active: { color: 'green', icon: <CheckCircleOutlined /> },
    maintenance: { color: 'orange', icon: <ToolOutlined /> },
    disposed: { color: 'default', icon: <CloseCircleOutlined /> },
    written_off: { color: 'red', icon: <WarningOutlined /> },
};

const CONDITIONS: Record<string, string> = {
    excellent: 'green', good: 'blue', fair: 'orange', poor: 'red', damaged: 'volcano',
};

const CATEGORIES = [
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'building', label: 'Building' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'machinery', label: 'Machinery' },
    { value: 'land', label: 'Land' },
    { value: 'software', label: 'Software' },
    { value: 'other', label: 'Other' },
];

const DEP_METHODS = [
    { value: 'straight_line', label: 'Straight Line' },
    { value: 'declining_balance', label: 'Declining Balance' },
    { value: 'no_depreciation', label: 'No Depreciation' },
];

const fmtCurrency = (v?: number) => v != null ? `Rp ${v.toLocaleString()}` : '-';
const fmtDate = (v?: string) => v ? new Date(v).toLocaleDateString() : 'â€”';

const ASSET_FIELDS: FieldDef[] = [
    { name: 'assetName', label: 'Asset Name', required: true },
    { name: 'assetCategory', label: 'Category' },
    { name: 'serialNumber', label: 'Serial Number' },
    { name: 'purchaseDate', label: 'Purchase Date' },
    { name: 'purchasePrice', label: 'Purchase Price', type: 'number' },
    { name: 'depreciationMethod', label: 'Depreciation Method' },
    { name: 'usefulLifeMonths', label: 'Useful Life (months)', type: 'number' },
    { name: 'salvageValue', label: 'Salvage Value', type: 'number' },
    { name: 'location', label: 'Location' },
    { name: 'assignedTo', label: 'Assigned To' },
    { name: 'condition', label: 'Condition' },
    { name: 'warrantyExpiry', label: 'Warranty Expiry' },
    { name: 'maintenanceSchedule', label: 'Maintenance Schedule' },
    { name: 'insurancePolicy', label: 'Insurance Policy' },
    { name: 'notes', label: 'Notes' },
];

export default function FixedAssetsPage() {
    const [stats, setStats] = useState<FixedAssetStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<string | undefined>();
    const [filterStatus, setFilterStatus] = useState<string | undefined>();

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
    const [form] = Form.useForm();

    // Detail Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

    // Dispose Modal
    const [disposeModalOpen, setDisposeModalOpen] = useState(false);
    const [disposeForm] = Form.useForm();
    const [disposeAssetId, setDisposeAssetId] = useState<string | null>(null);

    useEffect(() => { loadAll(); }, [filterCategory, filterStatus]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsData, assetsData] = await Promise.all([
                inventoryService.getFixedAssetStats(),
                inventoryService.getFixedAssets('default', {
                    assetCategory: filterCategory, status: filterStatus,
                }),
            ]);
            setStats(statsData);
            setAssets(assetsData);
        } catch (err) {
            console.error(err);
            message.error("Failed to load fixed assets");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (values: any) => {
        if (editingAsset) {
            await inventoryService.updateFixedAsset(editingAsset.id, values);
            message.success("Asset updated");
        } else {
            await inventoryService.createFixedAsset('default', values);
            message.success("Asset created");
        }
        setModalOpen(false);
        setEditingAsset(null);
        form.resetFields();
        loadAll();
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createFixedAsset('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.assetName || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deleteFixedAsset(id);
            message.success("Asset deleted");
            loadAll();
        } catch { message.error("Failed to delete"); }
    };

    const handleDispose = async () => {
        try {
            const values = await disposeForm.validateFields();
            await inventoryService.disposeFixedAsset(disposeAssetId!, values.disposalMethod, values.disposalValue);
            message.success("Asset disposed");
            setDisposeModalOpen(false);
            disposeForm.resetFields();
            loadAll();
        } catch { message.error("Failed to dispose"); }
    };

    const handleRunDepreciation = async () => {
        try {
            const result = await inventoryService.runDepreciation();
            message.success(`Depreciation run: ${result.processed} assets processed, total: ${fmtCurrency(result.totalDepreciation)}`);
            loadAll();
        } catch { message.error("Failed to run depreciation"); }
    };

    const openEdit = (asset: FixedAsset) => {
        setEditingAsset(asset);
        form.setFieldsValue(asset);
        setModalOpen(true);
    };

    const openDetail = async (asset: FixedAsset) => {
        try {
            const full = await inventoryService.getFixedAsset(asset.id);
            setSelectedAsset(full);
            setDrawerOpen(true);
        } catch {
            setSelectedAsset(asset);
            setDrawerOpen(true);
        }
    };

    // â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const kpiCards = [
        { title: 'Total Assets', value: stats?.totalAssets || 0, icon: <CarOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Active', value: stats?.active || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Maintenance', value: stats?.maintenance || 0, icon: <ToolOutlined />, color: '#f59e0b' },
        { title: 'Disposed', value: stats?.disposed || 0, icon: <CloseCircleOutlined />, color: '#94a3b8' },
        { title: 'Purchase Value', value: fmtCurrency(stats?.totalPurchaseValue), icon: <DollarOutlined />, color: '#3b82f6' },
        { title: 'Current Value', value: fmtCurrency(stats?.totalCurrentValue), icon: <DollarOutlined />, color: '#059669' },
    ];

    // â”€â”€â”€ Depreciation Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const depPct = stats && stats.totalPurchaseValue
        ? Math.round((stats.totalAccumulatedDep / stats.totalPurchaseValue) * 100)
        : 0;

    // â”€â”€â”€ Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const columns = [
        {
            title: 'Asset #', dataIndex: 'assetNumber', width: 140,
            render: (v: string) => <Text code className="text-xs">{v}</Text>,
        },
        {
            title: 'Name', dataIndex: 'assetName', ellipsis: true,
            render: (v: string, r: FixedAsset) => (
                <a onClick={() => openDetail(r)} className="cursor-pointer">
                    <Text strong className="text-sm" style={{ color: themeColor }}>{v}</Text>
                </a>
            ),
        },
        {
            title: 'Category', dataIndex: 'assetCategory', width: 120,
            render: (v: string) => v ? <Tag className="rounded-full text-xs capitalize">{v}</Tag> : 'â€”',
        },
        {
            title: 'Purchase Price', dataIndex: 'purchasePrice', width: 140,
            render: (v: number) => fmtCurrency(v),
        },
        {
            title: 'Current Value', dataIndex: 'currentValue', width: 140,
            render: (v: number) => <Text strong>{fmtCurrency(v)}</Text>,
        },
        {
            title: 'Depreciation', key: 'dep', width: 150,
            render: (_: any, r: FixedAsset) => {
                if (!r.purchasePrice || r.depreciationMethod === 'no_depreciation') return <Text className="text-xs">N/A</Text>;
                const pct = r.purchasePrice ? Math.round(((r.accumulatedDepreciation || 0) / r.purchasePrice) * 100) : 0;
                return (
                    <div>
                        <Text className="text-xs">{fmtCurrency(r.accumulatedDepreciation)}</Text>
                        <Progress percent={pct} size="small" strokeColor={pct >= 80 ? '#ef4444' : '#6366f1'}
                            showInfo={false} className="!mb-0" />
                    </div>
                );
            },
        },
        {
            title: 'Condition', dataIndex: 'condition', width: 100,
            render: (v: string) => v ? <Tag color={CONDITIONS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> : 'â€”',
        },
        {
            title: 'Location', dataIndex: 'location', width: 130, ellipsis: true,
        },
        {
            title: 'Status', dataIndex: 'status', width: 120,
            render: (v: string) => {
                const s = ASSET_STATUSES[v] || { color: 'default', icon: null };
                return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs">{v}</Tag>;
            },
        },
        {
            title: '', key: 'actions', width: 150,
            render: (_: any, r: FixedAsset) => (
                <Space size="small">
                    <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} /></Tooltip>
                    <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
                    {r.status === 'active' && (
                        <Tooltip title="Dispose">
                            <Button size="small" icon={<CloseCircleOutlined />} style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                                onClick={() => { setDisposeAssetId(r.id); disposeForm.resetFields(); setDisposeModalOpen(true); }} />
                        </Tooltip>
                    )}
                    <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: 'Delete this asset?', onOk: () => handleDelete(r.id) })} />
                </Space>
            ),
        },
    ];

    const filteredAssets = assets.filter(a =>
        !searchTerm || a.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const assetSteps = [
        {
            title: "Asset Info",
            icon: <CarOutlined />,
            fields: ["assetName", "assetCategory", "serialNumber", "purchaseDate", "purchasePrice"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="assetName" label="Asset Name" rules={[{ required: true }]}>
                                <Input placeholder="e.g. Toyota Avanza B 1234 CD" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="assetCategory" label="Category">
                                <Select placeholder="Select" options={CATEGORIES} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="serialNumber" label="Serial Number">
                                <Input placeholder="SN-XXX" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="purchaseDate" label="Purchase Date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="purchasePrice" label="Purchase Price">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Depreciation",
            icon: <ThunderboltOutlined />,
            fields: ["depreciationMethod", "usefulLifeMonths", "salvageValue"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="depreciationMethod" label="Method" initialValue="straight_line">
                                <Select options={DEP_METHODS} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="usefulLifeMonths" label="Useful Life (months)">
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="60" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="salvageValue" label="Salvage Value">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Location & Maintenance",
            icon: <CalendarOutlined />,
            fields: ["location", "assignedTo", "condition", "warrantyExpiry", "maintenanceSchedule", "insurancePolicy", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="location" label="Location">
                                <Input placeholder="Building A, Floor 2" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="assignedTo" label="Assigned To">
                                <Input placeholder="Department or person" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="condition" label="Condition" initialValue="good">
                                <Select options={[
                                    { value: 'excellent', label: 'Excellent' },
                                    { value: 'good', label: 'Good' },
                                    { value: 'fair', label: 'Fair' },
                                    { value: 'poor', label: 'Poor' },
                                    { value: 'damaged', label: 'Damaged' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="warrantyExpiry" label="Warranty Expiry">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="maintenanceSchedule" label="Maintenance Schedule">
                                <Select placeholder="Select" options={[
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'quarterly', label: 'Quarterly' },
                                    { value: 'bi_annual', label: 'Bi-Annual' },
                                    { value: 'annual', label: 'Annual' },
                                ]} allowClear />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="insurancePolicy" label="Insurance Policy">
                                <Input placeholder="Policy #" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Asset notes" />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Fixed Assets</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Track, depreciate, and manage company-owned assets and equipment"
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
                                            <Text strong className="text-lg">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Depreciation Summary */}
                {stats && stats.totalPurchaseValue > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card size="small" style={{
                            borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
                            border: '1px solid rgba(99,102,241,0.15)',
                        }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'rgba(99,102,241,0.12)', color: themeColor, fontSize: 20 }}>
                                        <ThunderboltOutlined />
                                    </div>
                                    <div>
                                        <Text type="secondary" className="text-xs block">Total Accumulated Depreciation</Text>
                                        <Text strong className="text-lg">{fmtCurrency(stats.totalAccumulatedDep)}</Text>
                                        <Text type="secondary" className="text-xs ml-2">({depPct}% of purchase value)</Text>
                                    </div>
                                    <div style={{ width: 200 }}>
                                        <Progress percent={depPct} strokeColor={{
                                            '0%': '#6366f1', '100%': depPct > 80 ? '#ef4444' : '#10b981',
                                        }} />
                                    </div>
                                </div>
                                <Button type="primary" icon={<ThunderboltOutlined />}
                                    onClick={() => Modal.confirm({
                                        title: 'Run Monthly Depreciation?',
                                        content: 'This will calculate and apply depreciation for all active assets.',
                                        onOk: handleRunDepreciation,
                                    })}
                                    style={{ background: 'linear-gradient(135deg, #6366f1, var(--theme-color, #7c3aed))', border: 'none', borderRadius: 8 }}>
                                    Run Depreciation
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Main Table Card */}
                <Card size="small" style={{
                    flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)',
                }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Text strong style={{
                                background: 'linear-gradient(to right, #6366f1, var(--theme-color, #7c3aed))',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 15,
                            }}>
                                <CarOutlined /> Assets ({filteredAssets.length})
                            </Text>
                            <Input prefix={<SearchOutlined className="text-gray-400" />}
                                placeholder="Search..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)} allowClear
                                style={{ maxWidth: 220, borderRadius: 8 }} size="small" />
                            <Select value={filterCategory} onChange={v => setFilterCategory(v)} allowClear
                                placeholder="Category" style={{ width: 130 }} size="small"
                                options={CATEGORIES} />
                            <Select value={filterStatus} onChange={v => setFilterStatus(v)} allowClear
                                placeholder="Status" style={{ width: 130 }} size="small"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'maintenance', label: 'Maintenance' },
                                    { value: 'disposed', label: 'Disposed' },
                                ]} />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => { setEditingAsset(null); form.resetFields(); setModalOpen(true); }}
                                style={{ background: 'linear-gradient(135deg, #6366f1, var(--theme-color, #7c3aed))', borderRadius: 8, border: 'none' }}>
                                New Asset
                            </Button>
                        </Space>
                    </div>

                    <Table
                        dataSource={filteredAssets} columns={columns}
                        rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 15, showSizeChanger: false }}
                        scroll={{ x: 1400 }}
                    />
                </Card>
            </div>

            {/* â”€â”€â”€ Stepped Form Modal for Create/Edit â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingAsset(null); form.resetFields(); }}
                onSubmit={handleCreateOrUpdate}
                form={form}
                title={editingAsset ? "Edit Asset" : "New Fixed Asset"}
                entityName="fixed_asset"
                steps={assetSteps}
                fields={ASSET_FIELDS}
                width={700}
                loading={false}
                onBatchCreate={handleBatchCreate}
                gradient={["#6366f1", "var(--theme-color, #7c3aed)"]}
                editMode={!!editingAsset}
                initialValues={editingAsset || undefined}
            />

            {/* â”€â”€â”€ Dispose Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Modal title="Dispose Asset" open={disposeModalOpen}
                onCancel={() => setDisposeModalOpen(false)} onOk={handleDispose}
                okText="Dispose" okButtonProps={{ danger: true }}>
                <Form form={disposeForm} layout="vertical">
                    <Form.Item name="disposalMethod" label="Disposal Method" rules={[{ required: true }]}>
                        <Select placeholder="Select method" options={[
                            { value: 'sold', label: 'Sold' },
                            { value: 'scrapped', label: 'Scrapped' },
                            { value: 'donated', label: 'Donated' },
                            { value: 'recycled', label: 'Recycled' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="disposalValue" label="Disposal Value (if sold)">
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* â”€â”€â”€ Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Drawer title={selectedAsset?.assetName || 'Asset Detail'} open={drawerOpen}
                onClose={() => setDrawerOpen(false)} width={520}
                extra={selectedAsset && (
                    <Space>
                        <Button icon={<EditOutlined />} onClick={() => { setDrawerOpen(false); openEdit(selectedAsset); }}>Edit</Button>
                    </Space>
                )}>
                {selectedAsset && (
                    <div>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Asset #" span={1}>
                                <Text code>{selectedAsset.assetNumber}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Category" span={1}>
                                <Tag className="capitalize">{selectedAsset.assetCategory || 'N/A'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Serial #" span={1}>{selectedAsset.serialNumber || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Condition" span={1}>
                                <Tag color={CONDITIONS[selectedAsset.condition || ''] || 'default'} className="capitalize">
                                    {selectedAsset.condition || 'â€”'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status" span={2}>
                                {(() => {
                                    const s = ASSET_STATUSES[selectedAsset.status || ''] || { color: 'default', icon: null };
                                    return <Tag icon={s.icon} color={s.color}>{selectedAsset.status}</Tag>;
                                })()}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider className="!my-3"><Text type="secondary" className="text-xs">Financial</Text></Divider>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Purchase Date">{fmtDate(selectedAsset.purchaseDate)}</Descriptions.Item>
                            <Descriptions.Item label="Purchase Price">{fmtCurrency(selectedAsset.purchasePrice)}</Descriptions.Item>
                            <Descriptions.Item label="Current Value">
                                <Text strong style={{ color: '#10b981' }}>{fmtCurrency(selectedAsset.currentValue)}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Salvage Value">{fmtCurrency(selectedAsset.salvageValue)}</Descriptions.Item>
                        </Descriptions>

                        <Divider className="!my-3"><Text type="secondary" className="text-xs">Depreciation</Text></Divider>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Method" span={1}>
                                {selectedAsset.depreciationMethod?.replace(/_/g, ' ') || 'â€”'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Useful Life" span={1}>
                                {selectedAsset.usefulLifeMonths ? `${selectedAsset.usefulLifeMonths} months` : 'â€”'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Accumulated Dep." span={1}>
                                <Text style={{ color: '#ef4444' }}>{fmtCurrency(selectedAsset.accumulatedDepreciation)}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Last Dep. Date" span={1}>
                                {fmtDate(selectedAsset.lastDepreciationDate)}
                            </Descriptions.Item>
                        </Descriptions>
                        {selectedAsset.purchasePrice && selectedAsset.depreciationMethod !== 'no_depreciation' && (
                            <div className="mt-3">
                                <Progress
                                    percent={Math.round(((selectedAsset.accumulatedDepreciation || 0) / selectedAsset.purchasePrice) * 100)}
                                    strokeColor={{ '0%': '#6366f1', '100%': '#ef4444' }}
                                    format={pct => `${pct}% depreciated`}
                                />
                            </div>
                        )}

                        <Divider className="!my-3"><Text type="secondary" className="text-xs">Location & Assignment</Text></Divider>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Location">{selectedAsset.location || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Assigned To">{selectedAsset.assignedTo || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Warranty" span={2}>{fmtDate(selectedAsset.warrantyExpiry)}</Descriptions.Item>
                        </Descriptions>

                        <Divider className="!my-3"><Text type="secondary" className="text-xs">Maintenance</Text></Divider>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Schedule">{selectedAsset.maintenanceSchedule || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Last Maint.">{fmtDate(selectedAsset.lastMaintenanceDate)}</Descriptions.Item>
                            <Descriptions.Item label="Next Maint.">{fmtDate(selectedAsset.nextMaintenanceDate)}</Descriptions.Item>
                            <Descriptions.Item label="Insurance">{selectedAsset.insurancePolicy || 'â€”'}</Descriptions.Item>
                        </Descriptions>

                        {selectedAsset.status === 'disposed' && (
                            <>
                                <Divider className="!my-3"><Text type="secondary" className="text-xs">Disposal</Text></Divider>
                                <Descriptions column={2} size="small" bordered>
                                    <Descriptions.Item label="Disposed Date">{fmtDate(selectedAsset.disposedDate)}</Descriptions.Item>
                                    <Descriptions.Item label="Method">{selectedAsset.disposalMethod || 'â€”'}</Descriptions.Item>
                                    <Descriptions.Item label="Disposal Value" span={2}>{fmtCurrency(selectedAsset.disposalValue)}</Descriptions.Item>
                                </Descriptions>
                            </>
                        )}

                        {selectedAsset.notes && (
                            <>
                                <Divider className="!my-3" />
                                <Text type="secondary" className="text-xs block mb-1">Notes</Text>
                                <Text>{selectedAsset.notes}</Text>
                            </>
                        )}
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}


