"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Row, Select, Space, Table, Tag, Tooltip, Typography , theme } from "antd";
import {
    ContainerOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
    DownloadOutlined, UploadOutlined, SwapOutlined,
    DeleteOutlined, WarningOutlined, GiftOutlined,
    CheckCircleOutlined, InboxOutlined, FileExcelOutlined, FilePdfOutlined,
    BarChartOutlined, UnorderedListOutlined, AuditOutlined } from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    inventoryService, StockOperation, StockOperationStatsType
} from "@/lib/inventoryService";
import ItemPicker from "@/components/inventory/ItemPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

const OP_TYPES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    receive: { label: 'Receive', color: 'green', icon: <DownloadOutlined /> },
    release: { label: 'Release', color: 'blue', icon: <UploadOutlined /> },
    adjust: { label: 'Adjust', color: 'orange', icon: <SwapOutlined /> },
    write_off: { label: 'Write-off', color: 'red', icon: <WarningOutlined /> },
    donate: { label: 'Donate', color: 'purple', icon: <GiftOutlined /> },
};

const STATUS_COLORS: Record<string, string> = {
    completed: 'green', draft: 'default', cancelled: 'red',
};

const REASONS = [
    { value: 'internal_use', label: 'Internal Use' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'donation', label: 'Donation' },
    { value: 'sample', label: 'Sample' },
    { value: 'production', label: 'Production' },
    { value: 'return_to_vendor', label: 'Return to Vendor' },
    { value: 'inventory_correction', label: 'Inventory Correction' },
    { value: 'other', label: 'Other' },
];

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '-';

const STOCK_OP_FIELDS: FieldDef[] = [
    { name: 'operationType', label: 'Operation Type', required: true },
    { name: 'reason', label: 'Reason' },
    { name: 'itemId', label: 'Item', required: true },
    { name: 'itemName', label: 'Item Name' },
    { name: 'quantity', label: 'Quantity', required: true, type: 'number' },
    { name: 'unitCost', label: 'Unit Cost', type: 'number' },
    { name: 'warehouseId', label: 'Warehouse' },
    { name: 'batchNumber', label: 'Batch #' },
    { name: 'expiryDate', label: 'Expiry Date' },
    { name: 'reference', label: 'Reference' },
    { name: 'approvedBy', label: 'Approved By' },
    { name: 'createdBy', label: 'Created By' },
    { name: 'notes', label: 'Notes' },
];

export default function StockOperationsPage() {
    const router = useRouter();
    const [stats, setStats] = useState<StockOperationStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const { startDate, endDate } = useDateRangeStore();
    const [operations, setOperations] = useState<StockOperation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string | undefined>();

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsData, opsData] = await Promise.all([
                inventoryService.getStockOperationStats(),
                inventoryService.getStockOperations('default', { operationType: filterType }),
            ]);
            setStats(statsData);
            setOperations(opsData);
        } catch (err) {
            console.error(err);
            message.error("Failed to load stock operations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, [filterType]);

    const handleCreate = async (values: any) => {
        await inventoryService.createStockOperation('default', values);
        message.success("Stock operation created â€” stock ledger updated");
        setModalOpen(false);
        form.resetFields();
        loadAll();
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createStockOperation('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.operationNumber || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deleteStockOperation(id);
            message.success("Operation deleted");
            loadAll();
        } catch { message.error("Failed to delete"); }
    };

    // â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const kpiCards = [
        { title: 'Total Operations', value: stats?.totalOperations || 0, icon: <ContainerOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Receives', value: stats?.receives || 0, icon: <DownloadOutlined />, color: '#10b981' },
        { title: 'Releases', value: stats?.releases || 0, icon: <UploadOutlined />, color: '#3b82f6' },
        { title: 'Adjustments', value: stats?.adjustments || 0, icon: <SwapOutlined />, color: '#f59e0b' },
        { title: 'Write-offs', value: stats?.writeOffs || 0, icon: <WarningOutlined />, color: '#ef4444' },
        { title: 'Donations', value: stats?.donations || 0, icon: <GiftOutlined />, color: themeColor },
    ];

    // â”€â”€â”€ Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const columns = [
        {
            title: 'Op #', dataIndex: 'operationNumber', width: 140,
            render: (v: string) => <Text code className="text-xs">{v}</Text>,
        },
        {
            title: 'Type', dataIndex: 'operationType', width: 120,
            render: (v: string) => {
                const t = OP_TYPES[v] || { label: v, color: 'default', icon: null };
                return <Tag icon={t.icon} color={t.color} className="rounded-full text-xs">{t.label}</Tag>;
            },
        },
        {
            title: 'Item', dataIndex: 'itemName', ellipsis: true,
            render: (v: string) => <Text strong className="text-sm">{v || 'Unknown'}</Text>,
        },
        {
            title: 'Quantity', dataIndex: 'quantity', width: 110,
            render: (v: number, r: StockOperation) => {
                const isIn = r.operationType === 'receive';
                return (
                    <Text strong style={{ color: isIn ? '#10b981' : '#ef4444' }}>
                        {isIn ? '+' : '-'}{Math.abs(v)}
                    </Text>
                );
            },
        },
        {
            title: 'Unit Cost', dataIndex: 'unitCost', width: 130,
            render: (v: number) => fmtCurrency(v),
        },
        {
            title: 'Reason', dataIndex: 'reason', width: 140, ellipsis: true,
            render: (v: string) => v ? <Tag className="rounded-full text-xs">{v.replace(/_/g, ' ')}</Tag> : 'â€”',
        },
        {
            title: 'Batch', dataIndex: 'batchNumber', width: 110,
            render: (v: string) => v || 'â€”',
        },
        {
            title: 'Status', dataIndex: 'status', width: 110,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
        {
            title: 'Date', dataIndex: 'createdAt', width: 110,
            render: (v: string) => v ? new Date(v).toLocaleDateString() : 'â€”',
        },
        {
            title: '', key: 'actions', width: 70,
            render: (_: any, r: StockOperation) => (
                <Button size="small" danger icon={<DeleteOutlined />}
                    onClick={() => Modal.confirm({
                        title: 'Delete this operation?',
                        content: 'This will NOT reverse the stock movement.',
                        onOk: () => handleDelete(r.id),
                    })} />
            ),
        },
    ];

    const filteredOps = operations.filter(o =>
        !searchTerm || (o.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.operationNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const opSteps = [
        {
            title: "Operation",
            fields: ["operationType", "reason", "itemId"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="operationType" label="Operation Type" rules={[{ required: true }]}>
                                <Select placeholder="Select type"
                                    options={Object.entries(OP_TYPES).map(([k, v]) => ({
                                        value: k, label: <span>{v.icon} {v.label}</span>,
                                    }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="reason" label="Reason">
                                <Select placeholder="Select reason" options={REASONS} allowClear />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="itemId" label="Item" rules={[{ required: true, message: 'Select an item' }]}>
                        <ItemPicker
                            placeholder="Search items by name or SKU..."
                            onItemSelect={(item) => {
                                if (item) {
                                    form.setFieldsValue({
                                        itemName: item.name,
                                        unitCost: item.costPrice,
                                    });
                                } else {
                                    form.setFieldsValue({ itemName: undefined, unitCost: undefined });
                                }
                            }}
                        />
                    </Form.Item>
                    <Form.Item name="itemName" hidden><input /></Form.Item>
                </>
            ),
        },
        {
            title: "Quantity & Cost",
            fields: ["quantity", "unitCost", "warehouseId", "batchNumber", "expiryDate", "reference"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                                <InputNumber min={0.001} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="unitCost" label="Unit Cost">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="warehouseId" label="Warehouse" initialValue="default">
                                <Input placeholder="Warehouse ID" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="batchNumber" label="Batch #">
                                <Input placeholder="Batch number" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="expiryDate" label="Expiry Date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="reference" label="Reference">
                                <Input placeholder="External ref" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="approvedBy" label="Approved By">
                                <Input placeholder="Approver name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="createdBy" label="Created By">
                                <Input placeholder="Operator name" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Operation notes" />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#10b981", "#059669", "#6366f1", "#00ffff", "#ff00ff"]}>Stock Operations</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Manual inbound, outbound, adjustments, write-offs, and donations"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential
                />
            }
            extra={[
                <Tooltip key="stock" title="View stock levels"><Button icon={<BarChartOutlined />} onClick={() => router.push('/admin/inventory/stock')}>Stock</Button></Tooltip>,
                <Tooltip key="items" title="Manage items"><Button icon={<UnorderedListOutlined />} onClick={() => router.push('/admin/inventory/items')}>Items</Button></Tooltip>,
                <Tooltip key="opname" title="Stock opname sessions"><Button icon={<AuditOutlined />} onClick={() => router.push('/admin/inventory/stock-opname')}>Opname</Button></Tooltip>,
            ]}
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
                                    <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
                                    <div className="flex items-center gap-3" style={{ position: 'relative' }}>
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18, border: `1px solid ${s.color}20` }}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', letterSpacing: 0.5, textTransform: 'uppercase' as const }} className="block">{s.title}</Text>
                                            <Text strong style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Main Table Card */}
                <Card size="small" style={{
                    flex: 1, ...(isDark ? glassDark : glass), borderLeft: '3px solid #10b981',
                }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Space>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                    <ContainerOutlined style={{ color: '#fff', fontSize: 12 }} />
                                </span>
                                <span style={{ fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>Operations ({filteredOps.length})</span>
                            </Space>
                            <Input prefix={<SearchOutlined className="text-gray-400" />}
                                placeholder="Search..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)} allowClear
                                style={{ maxWidth: 220, borderRadius: 8 }} size="small" />
                            <Select
                                value={filterType} onChange={v => setFilterType(v)} allowClear
                                placeholder="All Types" style={{ width: 140 }} size="small"
                                options={Object.entries(OP_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
                            />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'inventory_stock-operations', title: 'Stock Operations', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'operationNumber' }, { header: 'Type', key: 'operationType' }, { header: 'Status', key: 'status' }, { header: 'From', key: 'sourceWarehouseName' }, { header: 'To', key: 'destinationWarehouseName' }], data: operations })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'inventory_stock-operations', title: 'Stock Operations', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'operationNumber' }, { header: 'Type', key: 'operationType' }, { header: 'Status', key: 'status' }, { header: 'From', key: 'sourceWarehouseName' }, { header: 'To', key: 'destinationWarehouseName' }], data: operations })} /></Tooltip></RbacGuard>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => { form.resetFields(); setModalOpen(true); }}
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 8, border: 'none' }}>
                                New Operation
                            </Button>
                        </Space>
                    </div>

                    <Table
                        dataSource={filteredOps} columns={columns}
                        rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 15, showSizeChanger: false }}
                        scroll={{ x: 1200 }}
                    />
                </Card>
            </div>

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); }}
                onSubmit={handleCreate}
                form={form}
                title="New Stock Operation"
                entityName="stock_operation"
                steps={opSteps}
                fields={STOCK_OP_FIELDS}
                loading={false}
                onBatchCreate={handleBatchCreate}
                gradient={["#10b981", "#059669"]}
            />
        </CMSLayout>
    );
}




