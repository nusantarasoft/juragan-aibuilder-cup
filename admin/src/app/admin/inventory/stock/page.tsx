"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Badge, Button, Card, Col, Descriptions, Divider, Empty, Form, Input, InputNumber, message, Row, Select, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import {
    ArrowUpOutlined, ArrowDownOutlined, SwapOutlined,
    WarningOutlined, ReloadOutlined, PlusOutlined,
    SearchOutlined, ThunderboltOutlined, BarChartOutlined,
    RobotOutlined, DashboardOutlined, CheckCircleOutlined,
    ClockCircleOutlined, ExclamationCircleOutlined,
    FileTextOutlined, UnorderedListOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TooltipWrapper as AnimatedTooltip } from "@/components/mvpblocks/AnimatedTooltip";
import {
    inventoryService, InvItem, StockLedgerEntry, StockMovement,
    InvStockStats
} from "@/lib/inventoryService";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Title, Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

const MOVEMENT_FIELDS: FieldDef[] = [
    { name: 'itemId', label: 'Item ID', required: true },
    { name: 'movementType', label: 'Movement Type', required: true },
    { name: 'quantity', label: 'Quantity', required: true, type: 'number' },
    { name: 'unitCost', label: 'Unit Cost', type: 'number' },
    { name: 'reference', label: 'Reference' },
    { name: 'batchNumber', label: 'Batch Number' },
    { name: 'serialNumber', label: 'Serial Number' },
    { name: 'notes', label: 'Notes' },
];

const MOVEMENT_COLORS: Record<string, string> = {
    IN: 'green', OUT: 'red', TRANSFER: 'blue',
    ADJUST_IN: 'cyan', ADJUST_OUT: 'orange',
    RETURN_IN: 'lime', PRODUCTION: 'purple', CONSUMPTION: 'volcano',
};

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
    IN: <ArrowDownOutlined />, OUT: <ArrowUpOutlined />,
    TRANSFER: <SwapOutlined />, ADJUST_IN: <ArrowDownOutlined />,
    ADJUST_OUT: <ArrowUpOutlined />, RETURN_IN: <ArrowDownOutlined />,
    PRODUCTION: <CheckCircleOutlined />, CONSUMPTION: <ExclamationCircleOutlined />,
};

export default function StockDashboardPage() {
    const [stats, setStats] = useState<InvStockStats | null>(null);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [items, setItems] = useState<InvItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Movement modal
    const [movementModalOpen, setMovementModalOpen] = useState(false);
    const [movementForm] = Form.useForm();

    // AI Anomaly
    const [anomalyLoading, setAnomalyLoading] = useState(false);
    const [anomalyResult, setAnomalyResult] = useState<any>(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsData, ledgerData, movementsData, itemsData] = await Promise.all([
                inventoryService.getStockStats(),
                inventoryService.getStockLedger(),
                inventoryService.getStockMovements('default', { limit: 50 }),
                inventoryService.getItems(),
            ]);
            setStats(statsData);
            setLedger(ledgerData);
            setMovements(movementsData);
            setItems(itemsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

    const handleAddMovement = async (values: any) => {
        await inventoryService.createStockMovement('default', values);
        message.success("Stock movement recorded");
        setMovementModalOpen(false);
        movementForm.resetFields();
        loadAll();
    };

    const handleBatchCreateMovement = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try {
                await inventoryService.createStockMovement('default', r);
                success++;
            } catch (e: any) {
                failed++;
                errors.push(`${r.reference || 'Unknown'}: ${e.message || 'Failed'}`);
            }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleAnomalyDetection = async () => {
        setAnomalyLoading(true);
        try {
            const result = await inventoryService.aiDetectAnomalies();
            setAnomalyResult(result);
            if (result.anomalies?.length === 0) {
                message.success("No anomalies detected!");
            } else {
                message.warning(`${result.anomalies?.length || 0} anomalies found`);
            }
        } catch { message.error("AI analysis failed"); }
        finally { setAnomalyLoading(false); }
    };

    // Ledger columns (enriched with item names)
    const ledgerColumns = [
        {
            title: 'Item',
            key: 'item',
            render: (_: any, r: StockLedgerEntry) => {
                const item = itemMap.get(r.itemId);
                return (
                    <div>
                        <Text strong className="text-sm">{item?.name || r.itemId.slice(0, 8)}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">{item?.sku || ''}</Text>
                    </div>
                );
            },
        },
        {
            title: 'Warehouse',
            dataIndex: 'warehouseId',
            width: 120,
            render: (v: string) => <Tag className="rounded-full text-xs">{v || 'Default'}</Tag>,
        },
        {
            title: 'On Hand',
            dataIndex: 'onHand',
            width: 100,
            sorter: (a: StockLedgerEntry, b: StockLedgerEntry) => a.onHand - b.onHand,
            render: (v: number) => <Text strong className="text-sm">{v.toLocaleString()}</Text>,
        },
        {
            title: 'Reserved',
            dataIndex: 'reserved',
            width: 100,
            render: (v: number) => <Text className="text-sm text-orange-500">{v.toLocaleString()}</Text>,
        },
        {
            title: 'Available',
            dataIndex: 'available',
            width: 100,
            sorter: (a: StockLedgerEntry, b: StockLedgerEntry) => a.available - b.available,
            render: (v: number) => {
                const color = v <= 0 ? 'text-red-500' : v < 10 ? 'text-orange-500' : 'text-green-600';
                return <Text strong className={`text-sm ${color}`}>{v.toLocaleString()}</Text>;
            },
        },
        {
            title: 'Status',
            key: 'status',
            width: 90,
            render: (_: any, r: StockLedgerEntry) => {
                const item = itemMap.get(r.itemId);
                const reorder = item?.reorderPoint || 0;
                if (r.onHand <= 0) return <Badge status="error" text={<Text className="text-xs">Out</Text>} />;
                if (reorder > 0 && r.onHand <= reorder) return <Badge status="warning" text={<Text className="text-xs">Low</Text>} />;
                return <Badge status="success" text={<Text className="text-xs">OK</Text>} />;
            },
        },
    ];

    const movementColumns = [
        {
            title: 'Time',
            dataIndex: 'createdAt',
            width: 150,
            render: (v: string) => <Text className="text-xs">{new Date(v).toLocaleString()}</Text>,
        },
        {
            title: 'Item',
            key: 'item',
            render: (_: any, r: StockMovement) => {
                const item = itemMap.get(r.itemId);
                return <Text className="text-sm">{item?.name || r.itemId.slice(0, 8)}</Text>;
            },
        },
        {
            title: 'Type',
            dataIndex: 'movementType',
            width: 120,
            render: (v: string) => (
                <Tag icon={MOVEMENT_ICONS[v]} color={MOVEMENT_COLORS[v] || 'default'} className="rounded-full text-xs">
                    {v}
                </Tag>
            ),
        },
        {
            title: 'Qty',
            dataIndex: 'quantity',
            width: 80,
            render: (v: number, r: StockMovement) => {
                const isIn = ['IN', 'RETURN_IN', 'ADJUST_IN', 'PRODUCTION'].includes(r.movementType);
                return <Text className={`text-sm font-medium ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                    {isIn ? '+' : '-'}{Math.abs(v).toLocaleString()}
                </Text>;
            },
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            width: 140,
            render: (v: string) => <Text className="text-xs">{v || '-'}</Text>,
        },
        {
            title: 'Notes',
            dataIndex: 'notes',
            ellipsis: true,
            render: (v: string) => <Text className="text-xs">{v || '-'}</Text>,
        },
    ];

    const kpiCards = [
        { title: 'Total Items', value: stats?.totalItems || 0, icon: <DashboardOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Total On-Hand', value: stats?.totalOnHand || 0, icon: <BarChartOutlined />, color: '#0ea5e9' },
        { title: 'Total Reserved', value: stats?.totalReserved || 0, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'Low Stock', value: stats?.lowStockCount || 0, icon: <WarningOutlined />, color: '#ef4444' },
        { title: 'Movements', value: stats?.totalMovements || 0, icon: <SwapOutlined />, color: '#10b981' },
        { title: 'Active Items', value: stats?.activeItems || 0, icon: <CheckCircleOutlined />, color: themeColor },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Stock Dashboard</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Real-time inventory levels, stock movements, and AI-powered anomaly detection"
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
                                    ...glassDark, borderTop: `3px solid ${s.color}`, position: 'relative', overflow: 'hidden',
                                }}>
                                    <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
                                    <div className="flex items-center gap-3" style={{ position: 'relative' }}>
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18, border: `1px solid ${s.color}20` }}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' as const }} className="block">{s.title}</Text>
                                            <Text strong style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Toolbar */}
                <Card size="small" style={{
                    ...glassDark, borderLeft: `3px solid var(--theme-color, #7c3aed)`,
                }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Input
                                prefix={<SearchOutlined className="text-gray-400" />}
                                placeholder="Search stock..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                allowClear style={{ maxWidth: 260, borderRadius: 8 }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button icon={<RobotOutlined />} onClick={handleAnomalyDetection}
                                loading={anomalyLoading}
                                style={{ borderColor: 'var(--theme-color, #7c3aed)', color: 'var(--theme-color, #7c3aed)' }}>
                                AI Anomaly Detection
                            </Button>
                            <AnimatedTooltip content="Reload">
                                <Button icon={<ReloadOutlined />} onClick={loadAll} />
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'inventory_stock', title: 'Stock Ledger', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Item', key: 'itemName' }, { header: 'Warehouse', key: 'warehouseName' }, { header: 'Type', key: 'transactionType' }, { header: 'Qty', key: 'quantity' }, { header: 'Balance', key: 'balanceAfter' }], data: ledger })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'inventory_stock', title: 'Stock Ledger', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Item', key: 'itemName' }, { header: 'Warehouse', key: 'warehouseName' }, { header: 'Type', key: 'transactionType' }, { header: 'Qty', key: 'quantity' }, { header: 'Balance', key: 'balanceAfter' }], data: ledger })} /></Tooltip></RbacGuard>
                            </AnimatedTooltip>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => { movementForm.resetFields(); setMovementModalOpen(true); }}
                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                Record Movement
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* AI Anomaly Banner */}
                {anomalyResult && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <Card size="small" style={{
                            background: anomalyResult.anomalies?.length > 0 ? '#fff7ed' : '#f0fdf4',
                            borderColor: anomalyResult.anomalies?.length > 0 ? '#fed7aa' : '#bbf7d0',
                            borderRadius: 12,
                        }}>
                            <div className="flex items-start gap-3">
                                <RobotOutlined style={{ fontSize: 20, color: 'var(--theme-color, #7c3aed)' }} />
                                <div className="flex-1">
                                    <Text strong className="text-sm block mb-1">AI Anomaly Analysis</Text>
                                    <Text className="text-xs">{anomalyResult.summary || anomalyResult.message}</Text>
                                    {anomalyResult.anomalies?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {anomalyResult.anomalies.map((a: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <Tag color={a.riskLevel === 'high' ? 'red' : a.riskLevel === 'medium' ? 'orange' : 'green'} className="text-xs rounded-full">
                                                        {a.riskLevel}
                                                    </Tag>
                                                    <Text className="text-xs">{a.itemName}: {a.reason}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button type="text" size="small" onClick={() => setAnomalyResult(null)}>âœ•</Button>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Two-column: Stock Levels + Recent Movements */}
                <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
                    <Col xs={24} lg={14}>
                        <Card size="small" title={
                            <Space>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                                    <BarChartOutlined style={{ color: '#fff', fontSize: 12 }} />
                                </span>
                                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Stock Levels</span>
                            </Space>
                        } style={{ height: '100%', ...glassDark, borderLeft: '3px solid #3b82f6' }}>
                            <Table
                                dataSource={ledger}
                                columns={ledgerColumns}
                                rowKey="id"
                                loading={loading}
                                pagination={{ pageSize: 10, showSizeChanger: false }}
                                size="small"
                                scroll={{ x: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={10}>
                        <Card size="small" title={
                            <Space>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                    <SwapOutlined style={{ color: '#fff', fontSize: 12 }} />
                                </span>
                                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Recent Movements</span>
                            </Space>
                        } style={{ height: '100%', ...glassDark, borderLeft: '3px solid #10b981' }}>
                            <Table
                                dataSource={movements}
                                columns={movementColumns}
                                rowKey="id"
                                loading={loading}
                                pagination={{ pageSize: 10, showSizeChanger: false }}
                                size="small"
                                scroll={{ x: 500 }}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* â”€â”€â”€ Record Movement SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={movementModalOpen}
                onCancel={() => { setMovementModalOpen(false); movementForm.resetFields(); }}
                onSubmit={handleAddMovement}
                form={movementForm}
                title="Record Stock Movement"
                entityName="stock_movement"
                steps={[
                    {
                        title: "Movement Info",
                        icon: <SwapOutlined />,
                        fields: ["itemId", "movementType", "quantity"],
                        content: (
                            <>
                                <Form.Item name="itemId" label="Item" rules={[{ required: true }]}>
                                    <Select showSearch optionFilterProp="label" placeholder="Select item"
                                        options={items.map(i => ({ value: i.id, label: `${i.name} (${i.sku})` }))} />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="movementType" label="Movement Type" rules={[{ required: true }]}>
                                            <Select options={[
                                                { value: 'IN', label: 'ðŸ“¥ Stock In' },
                                                { value: 'OUT', label: 'ðŸ“¤ Stock Out' },
                                                { value: 'ADJUST_IN', label: 'ðŸ”¼ Adjust In' },
                                                { value: 'ADJUST_OUT', label: 'ðŸ”½ Adjust Out' },
                                                { value: 'TRANSFER', label: 'ðŸ”„ Transfer' },
                                                { value: 'RETURN_IN', label: 'â†©ï¸ Return In' },
                                                { value: 'PRODUCTION', label: 'ðŸ­ Production' },
                                                { value: 'CONSUMPTION', label: 'ðŸ”§ Consumption' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                                            <InputNumber min={0.001} style={{ width: '100%' }} placeholder="0" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Details",
                        icon: <FileTextOutlined />,
                        fields: ["unitCost", "reference", "batchNumber", "serialNumber", "notes"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="unitCost" label="Unit Cost">
                                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="reference" label="Reference">
                                            <Input placeholder="PO-001, SO-001" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="batchNumber" label="Batch Number">
                                            <Input placeholder="Optional" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="serialNumber" label="Serial Number">
                                            <Input placeholder="Optional" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="notes" label="Notes">
                                    <Input.TextArea rows={2} placeholder="Reason or additional notes" />
                                </Form.Item>
                            </>
                        ),
                    },
                ]}
                fields={MOVEMENT_FIELDS}
                width={640}
                loading={false}
                onBatchCreate={handleBatchCreateMovement}
                gradient={["var(--theme-color, #7c3aed)", "#6366f1"]}
            />
        </CMSLayout>
    );
}




