"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Progress, Row, Select, Space, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import {
    ToolOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
    FileTextOutlined, ScheduleOutlined, CheckCircleOutlined,
    ClockCircleOutlined, ExclamationCircleOutlined, DeleteOutlined,
    EditOutlined, PlayCircleOutlined, PauseCircleOutlined,
    RocketOutlined, UnorderedListOutlined, DollarOutlined,
    CalendarOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    inventoryService, MfgBom, MfgBomLine, MfgWorkOrder,
    ManufacturingStats, InvWarehouse
} from "@/lib/inventoryService";
import ItemPicker, { MasterItem } from "@/components/inventory/ItemPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const BOM_STATUSES: Record<string, { color: string }> = {
    draft: { color: 'default' },
    active: { color: 'green' },
    revision: { color: 'orange' },
    obsolete: { color: 'red' },
};

const WO_STATUSES: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: 'default', icon: <FileTextOutlined /> },
    planned: { color: 'blue', icon: <ScheduleOutlined /> },
    in_progress: { color: 'orange', icon: <PlayCircleOutlined /> },
    completed: { color: 'green', icon: <CheckCircleOutlined /> },
    cancelled: { color: 'red', icon: <ExclamationCircleOutlined /> },
};

const PRIORITIES: Record<string, { color: string }> = {
    low: { color: 'default' },
    normal: { color: 'blue' },
    high: { color: 'orange' },
    urgent: { color: 'red' },
};

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '-';

const BOM_FIELDS: FieldDef[] = [
    { name: 'code', label: 'BOM Code', required: true },
    { name: 'name', label: 'Name', required: true },
    { name: 'productName', label: 'Product Name' },
    { name: 'productSku', label: 'Product SKU' },
    { name: 'version', label: 'Version' },
    { name: 'status', label: 'Status' },
    { name: 'laborHours', label: 'Labor Hours', type: 'number' },
    { name: 'laborCost', label: 'Labor Cost', type: 'number' },
    { name: 'overheadCost', label: 'Overhead Cost', type: 'number' },
    { name: 'description', label: 'Description' },
];

const WO_FIELDS: FieldDef[] = [
    { name: 'woNumber', label: 'WO Number', required: true },
    { name: 'bomId', label: 'BOM ID', required: true },
    { name: 'bomName', label: 'BOM Name' },
    { name: 'warehouseId', label: 'Warehouse' },
    { name: 'warehouseName', label: 'Warehouse Name' },
    { name: 'plannedQty', label: 'Planned Quantity', required: true, type: 'number' },
    { name: 'priority', label: 'Priority' },
    { name: 'assignedTo', label: 'Assigned To' },
    { name: 'plannedStart', label: 'Start Date' },
    { name: 'plannedEnd', label: 'End Date' },
    { name: 'notes', label: 'Notes' },
];

export default function ManufacturingPage() {
    const [stats, setStats] = useState<ManufacturingStats | null>(null);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [boms, setBoms] = useState<MfgBom[]>([]);
    const [workOrders, setWorkOrders] = useState<MfgWorkOrder[]>([]);
    const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
    const [bomLines, setBomLines] = useState<Record<string, MfgBomLine[]>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("boms");
    const [searchTerm, setSearchTerm] = useState("");

    // Modals
    const [bomModalOpen, setBomModalOpen] = useState(false);
    const [bomEditId, setBomEditId] = useState<string | null>(null);
    const [bomForm] = Form.useForm();

    const [woModalOpen, setWoModalOpen] = useState(false);
    const [woForm] = Form.useForm();

    const [lineModalOpen, setLineModalOpen] = useState(false);
    const [lineForm] = Form.useForm();
    const [lineBomId, setLineBomId] = useState<string | null>(null);

    const [expandedBomId, setExpandedBomId] = useState<string | null>(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsData, bomsData, woData, whData] = await Promise.all([
                inventoryService.getManufacturingStats(),
                inventoryService.getBoms(),
                inventoryService.getWorkOrders(),
                inventoryService.getWarehouses(),
            ]);
            setStats(statsData);
            setBoms(bomsData);
            setWorkOrders(woData);
            setWarehouses(whData);
        } catch (err) {
            console.error(err);
            message.error("Failed to load manufacturing data");
        } finally {
            setLoading(false);
        }
    };

    const loadBomLines = async (bomId: string) => {
        try {
            const lines = await inventoryService.getBomLines(bomId);
            setBomLines(prev => ({ ...prev, [bomId]: lines }));
        } catch { console.error("Failed to load BOM lines"); }
    };

    // â”€â”€â”€ BOM CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleSaveBom = async (values: any) => {
        if (bomEditId) {
            await inventoryService.updateBom(bomEditId, values);
            message.success("BOM updated");
        } else {
            await inventoryService.createBom('default', values);
            message.success("BOM created");
        }
        setBomModalOpen(false); bomForm.resetFields(); setBomEditId(null);
        loadAll();
    };

    const handleBatchCreateBom = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createBom('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.code || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleEditBom = (bom: MfgBom) => {
        setBomEditId(bom.id);
        bomForm.setFieldsValue({
            code: bom.code, name: bom.name, version: bom.version,
            productName: bom.productName, productSku: bom.productSku,
            description: bom.description, uom: bom.uom, yieldQty: bom.yieldQty,
            laborHours: bom.laborHours, laborCost: bom.laborCost,
            overheadCost: bom.overheadCost, status: bom.status,
        });
        setBomModalOpen(true);
    };

    const handleDeleteBom = async (id: string) => {
        try { await inventoryService.deleteBom(id); message.success("BOM deleted"); loadAll(); }
        catch { message.error("Failed to delete"); }
    };

    // â”€â”€â”€ BOM Line CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleAddBomLine = async () => {
        try {
            const values = await lineForm.validateFields();
            await inventoryService.addBomLine(lineBomId!, values);
            message.success("Component added");
            setLineModalOpen(false); lineForm.resetFields();
            loadBomLines(lineBomId!);
        } catch { message.error("Failed"); }
    };

    // â”€â”€â”€ Work Order CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleCreateWo = async (values: any) => {
        const bom = boms.find(b => b.id === values.bomId);
        const wh = warehouses.find(w => w.id === values.warehouseId);
        const input = {
            ...values,
            bomName: bom?.name || '',
            warehouseName: wh?.name || '',
        };
        await inventoryService.createWorkOrder('default', input);
        message.success("Work order created");
        setWoModalOpen(false); woForm.resetFields(); loadAll();
    };

    const handleBatchCreateWo = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try {
                const bom = boms.find(b => b.id === r.bomId);
                const wh = warehouses.find(w => w.id === r.warehouseId);
                await inventoryService.createWorkOrder('default', { ...r, bomName: bom?.name || '', warehouseName: wh?.name || '' });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.woNumber || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleWoStatusChange = async (id: string, newStatus: string) => {
        try {
            await inventoryService.updateWorkOrderStatus(id, newStatus);
            message.success(`Status â†’ ${newStatus.replace('_', ' ')}`);
            loadAll();
        } catch { message.error("Failed to update status"); }
    };

    // â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const kpiCards = [
        { title: 'Total BOMs', value: stats?.totalBoms || 0, icon: <FileTextOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Work Orders', value: stats?.totalWorkOrders || 0, icon: <ToolOutlined />, color: '#0ea5e9' },
        { title: 'Draft', value: stats?.draftWos || 0, icon: <FileTextOutlined />, color: '#94a3b8' },
        { title: 'Planned', value: stats?.plannedWos || 0, icon: <ScheduleOutlined />, color: '#3b82f6' },
        { title: 'In Progress', value: stats?.inProgressWos || 0, icon: <PlayCircleOutlined />, color: '#f59e0b' },
        { title: 'Completed', value: stats?.completedWos || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
    ];

    // â”€â”€â”€ BOM Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const bomColumns = [
        { title: 'Code', dataIndex: 'code', width: 140, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        { title: 'Product', dataIndex: 'productName', width: 180, ellipsis: true },
        { title: 'Version', dataIndex: 'version', width: 80, render: (v: string) => <Tag className="rounded-full text-xs">v{v}</Tag> },
        {
            title: 'Total Cost', dataIndex: 'totalCost', width: 150,
            render: (v: number) => <Text strong className="text-sm">{fmtCurrency(v)}</Text>,
        },
        {
            title: 'Status', dataIndex: 'status', width: 100,
            render: (v: string) => <Tag color={BOM_STATUSES[v]?.color || 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
        {
            title: '', key: 'actions', width: 140,
            render: (_: any, r: MfgBom) => (
                <Space size="small">
                    <Button size="small" icon={<UnorderedListOutlined />} onClick={() => {
                        setExpandedBomId(expandedBomId === r.id ? null : r.id);
                        if (!bomLines[r.id]) loadBomLines(r.id);
                    }}>Lines</Button>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditBom(r)} />
                    <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: 'Delete BOM?', onOk: () => handleDeleteBom(r.id) })} />
                </Space>
            ),
        },
    ];

    // â”€â”€â”€ BOM Line Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const bomLineColumns = [
        { title: '#', dataIndex: 'sortOrder', width: 50 },
        { title: 'Item', dataIndex: 'itemName', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        { title: 'SKU', dataIndex: 'itemSku', width: 130, render: (v: string) => v ? <Text code className="text-xs">{v}</Text> : '-' },
        { title: 'Qty', dataIndex: 'quantity', width: 70, render: (v: number, r: MfgBomLine) => `${v} ${r.uom}` },
        { title: 'Unit Cost', dataIndex: 'unitCost', width: 130, render: fmtCurrency },
        { title: 'Total', dataIndex: 'totalCost', width: 130, render: fmtCurrency },
        { title: 'Scrap %', dataIndex: 'scrapPct', width: 80, render: (v: number) => v ? `${v}%` : '-' },
    ];

    // â”€â”€â”€ Work Order Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const woColumns = [
        {
            title: 'WO #', dataIndex: 'woNumber', width: 140,
            render: (v: string) => <Text code className="text-xs">{v}</Text>,
        },
        { title: 'BOM', dataIndex: 'bomName', width: 200, ellipsis: true },
        { title: 'Warehouse', dataIndex: 'warehouseName', width: 180, ellipsis: true },
        {
            title: 'Progress', key: 'progress', width: 150,
            render: (_: any, r: MfgWorkOrder) => {
                const pct = r.plannedQty ? Math.round(((r.completedQty || 0) / r.plannedQty) * 100) : 0;
                return (
                    <div>
                        <Text className="text-xs">{r.completedQty || 0}/{r.plannedQty} {r.uom}</Text>
                        <Progress percent={pct} size="small" strokeColor={pct >= 100 ? '#10b981' : '#6366f1'}
                            showInfo={false} className="!mb-0" />
                    </div>
                );
            },
        },
        {
            title: 'Priority', dataIndex: 'priority', width: 90,
            render: (v: string) => <Tag color={PRIORITIES[v]?.color || 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 130 },
        {
            title: 'Schedule', key: 'schedule', width: 180,
            render: (_: any, r: MfgWorkOrder) => (
                <Text className="text-xs">
                    {r.plannedStart ? new Date(r.plannedStart).toLocaleDateString() : 'â€”'} â†’{' '}
                    {r.plannedEnd ? new Date(r.plannedEnd).toLocaleDateString() : 'â€”'}
                </Text>
            ),
        },
        {
            title: 'Status', dataIndex: 'status', width: 120,
            render: (v: string) => {
                const s = WO_STATUSES[v] || { color: 'default', icon: null };
                return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs">{v?.replace('_', ' ')}</Tag>;
            },
        },
        {
            title: '', key: 'actions', width: 130,
            render: (_: any, r: MfgWorkOrder) => {
                const nextStatus: Record<string, { label: string; color: string; next: string }> = {
                    draft: { label: 'Plan', color: '#3b82f6', next: 'planned' },
                    planned: { label: 'Start', color: '#f59e0b', next: 'in_progress' },
                    in_progress: { label: 'Complete', color: '#10b981', next: 'completed' },
                };
                const action = nextStatus[r.status || ''];
                return (
                    <Space size="small">
                        {action && (
                            <Button size="small" type="primary"
                                onClick={() => handleWoStatusChange(r.id, action.next)}
                                style={{ background: action.color, border: 'none', fontSize: 11 }}>
                                {action.label}
                            </Button>
                        )}
                    </Space>
                );
            },
        },
    ];

    // â”€â”€â”€ Step Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const bomSteps = [
        {
            title: "Basic Info",
            icon: <FileTextOutlined />,
            fields: ["code", "name", "productName", "productSku", "version", "status"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="code" label="BOM Code" rules={[{ required: true }]}>
                                <Input placeholder="BOM-XXX-001" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                                <Input placeholder="BOM name" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="productName" label="Product Name">
                                <Input placeholder="Finished product name" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="version" label="Version" initialValue="1.0">
                                <Input placeholder="1.0" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="status" label="Status" initialValue="draft">
                                <Select options={[
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'revision', label: 'Revision' },
                                    { value: 'obsolete', label: 'Obsolete' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Costs",
            icon: <DollarOutlined />,
            fields: ["laborHours", "laborCost", "overheadCost", "description"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="laborHours" label="Labor Hours">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="laborCost" label="Labor Cost">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="overheadCost" label="Overhead Cost">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="BOM description" />
                    </Form.Item>
                </>
            ),
        },
    ];

    const woSteps = [
        {
            title: "Order Info",
            icon: <ToolOutlined />,
            fields: ["woNumber", "bomId", "warehouseId", "plannedQty", "priority"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="woNumber" label="WO Number" rules={[{ required: true }]}>
                                <Input placeholder="WO-2026-XXX" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="bomId" label="BOM" rules={[{ required: true }]}>
                                <Select placeholder="Select BOM"
                                    options={boms.filter(b => b.status === 'active').map(b => ({
                                        value: b.id, label: `${b.code} â€” ${b.name}`
                                    }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="warehouseId" label="Warehouse">
                                <Select placeholder="Select warehouse"
                                    options={warehouses.map(w => ({
                                        value: w.id, label: `${w.code} â€” ${w.name}`
                                    }))} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="plannedQty" label="Quantity" rules={[{ required: true }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="priority" label="Priority" initialValue="normal">
                                <Select options={[
                                    { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' },
                                    { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Schedule",
            icon: <CalendarOutlined />,
            fields: ["assignedTo", "plannedStart", "plannedEnd", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="assignedTo" label="Assigned To">
                                <Input placeholder="Name" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="plannedStart" label="Start Date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="plannedEnd" label="End Date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Notes" />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Manufacturing</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Bill of Materials, work orders, and production tracking"
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
                                    ...glass,
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
                    flex: 1, ...glass, borderRadius: 12, border: '1px solid rgba(255,255,255,0.5)',
                }}>
                    <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                        {
                            key: 'boms',
                            label: <span><FileTextOutlined /> Bill of Materials ({boms.length})</span>,
                            children: (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Input prefix={<SearchOutlined className="text-gray-400" />}
                                            placeholder="Search BOMs..." value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)} allowClear
                                            style={{ maxWidth: 280, borderRadius: 8 }} />
                                        <Space>
                                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'inventory_manufacturing', title: 'Manufacturing BOMs', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Product', key: 'productName' }, { header: 'Status', key: 'status' }, { header: 'Quantity', key: 'outputQuantity' }], data: boms })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'inventory_manufacturing', title: 'Manufacturing BOMs', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Product', key: 'productName' }, { header: 'Status', key: 'status' }, { header: 'Quantity', key: 'outputQuantity' }], data: boms })} /></Tooltip></RbacGuard>
                                            <Button type="primary" icon={<PlusOutlined />}
                                                onClick={() => { bomForm.resetFields(); setBomEditId(null); setBomModalOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                                Add BOM
                                            </Button>
                                        </Space>
                                    </div>
                                    <Table
                                        dataSource={boms.filter(b =>
                                            !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            b.code.toLowerCase().includes(searchTerm.toLowerCase())
                                        )}
                                        columns={bomColumns} rowKey="id" loading={loading}
                                        pagination={{ pageSize: 10, showSizeChanger: false }} size="small"
                                        scroll={{ x: 900 }}
                                        expandable={{
                                            expandedRowKeys: expandedBomId ? [expandedBomId] : [],
                                            onExpand: (expanded, record) => {
                                                setExpandedBomId(expanded ? record.id : null);
                                                if (expanded && !bomLines[record.id]) loadBomLines(record.id);
                                            },
                                            expandedRowRender: (record) => (
                                                <div className="p-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Text strong style={{
                                                            background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                        }}>Components â€” {record.name}</Text>
                                                        <Button size="small" icon={<PlusOutlined />}
                                                            onClick={() => { setLineBomId(record.id); lineForm.resetFields(); setLineModalOpen(true); }}
                                                            style={{ borderColor: 'var(--theme-color, #7c3aed)', color: 'var(--theme-color, #7c3aed)' }}>
                                                            Add Component
                                                        </Button>
                                                    </div>
                                                    <Table dataSource={bomLines[record.id] || []} columns={bomLineColumns}
                                                        rowKey="id" size="small" pagination={false} />
                                                </div>
                                            ),
                                        }}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'workorders',
                            label: <span><ToolOutlined /> Work Orders ({workOrders.length})</span>,
                            children: (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div />
                                        <Space>
                                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                                            <Button type="primary" icon={<PlusOutlined />}
                                                onClick={() => { woForm.resetFields(); setWoModalOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                                New Work Order
                                            </Button>
                                        </Space>
                                    </div>
                                    <Table dataSource={workOrders} columns={woColumns}
                                        rowKey="id" loading={loading} size="small"
                                        pagination={{ pageSize: 10, showSizeChanger: false }}
                                        scroll={{ x: 1200 }}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'overview',
                            label: <span><RocketOutlined /> Production Overview</span>,
                            children: (
                                <div>
                                    <Row gutter={[16, 16]}>
                                        {workOrders.filter(wo => wo.status === 'in_progress').length > 0 ? (
                                            workOrders.filter(wo => wo.status === 'in_progress').map(wo => {
                                                const pct = wo.plannedQty ? Math.round(((wo.completedQty || 0) / wo.plannedQty) * 100) : 0;
                                                return (
                                                    <Col key={wo.id} xs={24} sm={12} lg={8}>
                                                        <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <Text code className="text-xs">{wo.woNumber}</Text>
                                                                <Tag color="orange" className="rounded-full text-xs">In Progress</Tag>
                                                            </div>
                                                            <Text strong className="text-sm block mb-1">{wo.bomName}</Text>
                                                            <Text type="secondary" className="text-xs block mb-2">{wo.warehouseName}</Text>
                                                            <Progress percent={pct} strokeColor={{
                                                                '0%': '#6366f1', '100%': '#10b981',
                                                            }} />
                                                            <Row gutter={8} className="mt-2">
                                                                <Col span={12}>
                                                                    <Text type="secondary" className="text-xs block">Planned</Text>
                                                                    <Text strong className="text-sm">{wo.plannedQty} {wo.uom}</Text>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Text type="secondary" className="text-xs block">Completed</Text>
                                                                    <Text strong className="text-sm" style={{ color: '#10b981' }}>
                                                                        {wo.completedQty || 0} {wo.uom}
                                                                    </Text>
                                                                </Col>
                                                            </Row>
                                                            <div className="mt-2 flex justify-between items-center">
                                                                <Text className="text-xs" type="secondary">
                                                                    {wo.assignedTo || 'Unassigned'}
                                                                </Text>
                                                                <Button size="small" type="primary"
                                                                    onClick={() => handleWoStatusChange(wo.id, 'completed')}
                                                                    style={{ background: '#10b981', border: 'none', fontSize: 11 }}>
                                                                    Mark Complete
                                                                </Button>
                                                            </div>
                                                        </Card>
                                                    </Col>
                                                );
                                            })
                                        ) : (
                                            <Col span={24}>
                                                <div className="text-center py-12">
                                                    <RocketOutlined style={{ fontSize: 40, color: '#d4d4d8' }} />
                                                    <Text type="secondary" className="block mt-2">No work orders currently in progress</Text>
                                                </div>
                                            </Col>
                                        )}
                                    </Row>
                                </div>
                            ),
                        },
                    ]} />
                </Card>
            </div>

            {/* â”€â”€â”€ BOM SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={bomModalOpen}
                onCancel={() => { setBomModalOpen(false); setBomEditId(null); bomForm.resetFields(); }}
                onSubmit={handleSaveBom}
                form={bomForm}
                title={bomEditId ? "Edit BOM" : "Add Bill of Materials"}
                entityName="bom"
                steps={bomSteps}
                fields={BOM_FIELDS}
                width={640}
                loading={false}
                onBatchCreate={handleBatchCreateBom}
                gradient={["var(--theme-color, #7c3aed)", "#6366f1"]}
                editMode={!!bomEditId}
            />

            {/* â”€â”€â”€ BOM Line Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Modal title="Add Component" open={lineModalOpen}
                onCancel={() => setLineModalOpen(false)} onOk={handleAddBomLine} okText="Add">
                <Form form={lineForm} layout="vertical">
                    <Form.Item name="itemId" label="Select Item from Master" rules={[{ required: true, message: 'Please select an item' }]}>
                        <ItemPicker
                            onItemSelect={(item: MasterItem | null) => {
                                if (item) {
                                    lineForm.setFieldsValue({
                                        itemName: item.name,
                                        itemSku: item.sku,
                                        unitCost: item.costPrice || 0,
                                        uom: item.uom || 'pcs',
                                    });
                                } else {
                                    lineForm.setFieldsValue({
                                        itemName: undefined,
                                        itemSku: undefined,
                                        unitCost: 0,
                                        uom: 'pcs',
                                    });
                                }
                            }}
                            size="middle"
                        />
                    </Form.Item>
                    <Form.Item name="itemName" hidden><Input /></Form.Item>
                    <Form.Item name="itemSku" hidden><Input /></Form.Item>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="quantity" label="Qty" rules={[{ required: true }]}>
                                <InputNumber min={0.01} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="uom" label="UOM" initialValue="pcs">
                                <Select options={[
                                    { value: 'pcs', label: 'pcs' }, { value: 'kg', label: 'kg' },
                                    { value: 'ltr', label: 'ltr' }, { value: 'sheet', label: 'sheet' },
                                    { value: 'set', label: 'set' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="unitCost" label="Unit Cost">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="scrapPct" label="Scrap %">
                                <InputNumber min={0} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* â”€â”€â”€ Work Order SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={woModalOpen}
                onCancel={() => { setWoModalOpen(false); woForm.resetFields(); }}
                onSubmit={handleCreateWo}
                form={woForm}
                title="New Work Order"
                entityName="work_order"
                steps={woSteps}
                fields={WO_FIELDS}
                width={640}
                loading={false}
                onBatchCreate={handleBatchCreateWo}
                gradient={["var(--theme-color, #7c3aed)", "#6366f1"]}
            />
        </CMSLayout>
    );
}




