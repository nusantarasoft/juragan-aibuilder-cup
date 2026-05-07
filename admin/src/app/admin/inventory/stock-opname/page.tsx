"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Table, Button, Space, Tag, Card, Typography, message,
    Row, Col, Modal, Form, Input, InputNumber, Select, Progress, Tooltip
} from "antd";
import {
    AuditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
    FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, DeleteOutlined, EditOutlined,
    EyeOutlined, WarningOutlined, ArrowRightOutlined,
    CalendarOutlined, TeamOutlined,
    FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    inventoryService, OpnameSession, OpnameLine, OpnameStatsType, InvWarehouse
} from "@/lib/inventoryService";
import ItemPicker from "@/components/inventory/ItemPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const SESSION_STATUSES: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: 'default', icon: <FileTextOutlined /> },
    counting: { color: 'processing', icon: <ClockCircleOutlined /> },
    review: { color: 'orange', icon: <EyeOutlined /> },
    completed: { color: 'green', icon: <CheckCircleOutlined /> },
    cancelled: { color: 'red', icon: <ExclamationCircleOutlined /> },
};

const LINE_STATUSES: Record<string, { color: string }> = {
    pending: { color: 'default' },
    counted: { color: 'blue' },
    verified: { color: 'green' },
    discrepancy: { color: 'red' },
};

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '-';

const SESSION_FIELDS: FieldDef[] = [
    { name: 'sessionCode', label: 'Session Code', required: true },
    { name: 'title', label: 'Title', required: true },
    { name: 'warehouseId', label: 'Warehouse', required: true },
    { name: 'countedBy', label: 'Counted By' },
    { name: 'scheduledDate', label: 'Scheduled Date' },
    { name: 'notes', label: 'Notes' },
];

export default function StockOpnamePage() {
    const [stats, setStats] = useState<OpnameStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [sessions, setSessions] = useState<OpnameSession[]>([]);
    const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
    const [opnameLines, setOpnameLines] = useState<Record<string, OpnameLine[]>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    // Modals
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [sessionForm] = Form.useForm();

    const [lineModalOpen, setLineModalOpen] = useState(false);
    const [lineForm] = Form.useForm();
    const [lineSessionId, setLineSessionId] = useState<string | null>(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsData, sessionsData, whData] = await Promise.all([
                inventoryService.getOpnameStats(),
                inventoryService.getOpnameSessions(),
                inventoryService.getWarehouses(),
            ]);
            setStats(statsData);
            setSessions(sessionsData);
            setWarehouses(whData);
        } catch (err) {
            console.error(err);
            message.error("Failed to load stock opname data");
        } finally {
            setLoading(false);
        }
    };

    const loadLines = async (sessionId: string) => {
        try {
            const lines = await inventoryService.getOpnameLines(sessionId);
            setOpnameLines(prev => ({ ...prev, [sessionId]: lines }));
        } catch { console.error("Failed to load lines"); }
    };

    // â”€â”€â”€ Session CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleCreateSession = async (values: any) => {
        const wh = warehouses.find(w => w.id === values.warehouseId);
        const input = { ...values, warehouseName: wh?.name || '' };
        await inventoryService.createOpnameSession('default', input);
        message.success("Session created");
        setSessionModalOpen(false); sessionForm.resetFields(); loadAll();
    };

    const handleBatchCreateSession = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try {
                const wh = warehouses.find(w => w.id === r.warehouseId);
                await inventoryService.createOpnameSession('default', { ...r, warehouseName: wh?.name || '' });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.sessionCode || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        loadAll();
        return { success, failed, errors };
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await inventoryService.updateOpnameSessionStatus(id, newStatus);
            message.success(`Status â†’ ${newStatus}`);
            loadAll();
        } catch { message.error("Failed to update status"); }
    };

    const handleDeleteSession = async (id: string) => {
        try {
            await inventoryService.deleteOpnameSession(id);
            message.success("Session deleted"); loadAll();
        } catch { message.error("Failed to delete"); }
    };

    // â”€â”€â”€ Line CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleAddLine = async () => {
        try {
            const values = await lineForm.validateFields();
            await inventoryService.addOpnameLine(lineSessionId!, values);
            message.success("Item added");
            setLineModalOpen(false); lineForm.resetFields();
            loadLines(lineSessionId!);
        } catch { message.error("Failed to add item"); }
    };

    // â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const kpiCards = [
        { title: 'Total Sessions', value: stats?.totalSessions || 0, icon: <AuditOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { title: 'Draft', value: stats?.draft || 0, icon: <FileTextOutlined />, color: '#94a3b8' },
        { title: 'Counting', value: stats?.counting || 0, icon: <ClockCircleOutlined />, color: '#3b82f6' },
        { title: 'In Review', value: stats?.review || 0, icon: <EyeOutlined />, color: '#f59e0b' },
        { title: 'Completed', value: stats?.completed || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Total Variance', value: fmtCurrency(stats?.totalVariance), icon: <WarningOutlined />, color: stats?.totalVariance && stats.totalVariance < 0 ? '#ef4444' : '#10b981' },
    ];

    // â”€â”€â”€ Session Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const sessionColumns = [
        { title: 'Code', dataIndex: 'sessionCode', width: 140, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Title', dataIndex: 'title', ellipsis: true, render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        { title: 'Warehouse', dataIndex: 'warehouseName', width: 180, ellipsis: true },
        {
            title: 'Progress', key: 'progress', width: 140,
            render: (_: any, r: OpnameSession) => {
                const pct = r.totalItems ? Math.round(((r.itemsCounted || 0) / r.totalItems) * 100) : 0;
                return (
                    <div>
                        <Text className="text-xs">{r.itemsCounted || 0}/{r.totalItems || 0} items</Text>
                        <Progress percent={pct} size="small" strokeColor={pct >= 100 ? '#10b981' : '#6366f1'}
                            showInfo={false} className="!mb-0" />
                    </div>
                );
            },
        },
        { title: 'Counted By', dataIndex: 'countedBy', width: 130 },
        {
            title: 'Scheduled', dataIndex: 'scheduledDate', width: 110,
            render: (v: string) => v ? new Date(v).toLocaleDateString() : 'â€”',
        },
        {
            title: 'Variance', key: 'variance', width: 130,
            render: (_: any, r: OpnameSession) => {
                const v = r.totalVarianceValue || 0;
                if (v === 0) return <Text className="text-xs">â€”</Text>;
                return <Text strong className="text-sm" style={{ color: v < 0 ? '#ef4444' : '#10b981' }}>{fmtCurrency(v)}</Text>;
            },
        },
        {
            title: 'Status', dataIndex: 'status', width: 120,
            render: (v: string) => {
                const s = SESSION_STATUSES[v] || { color: 'default', icon: null };
                return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs">{v}</Tag>;
            },
        },
        {
            title: '', key: 'actions', width: 160,
            render: (_: any, r: OpnameSession) => {
                const transitions: Record<string, { label: string; color: string; next: string }> = {
                    draft: { label: 'Start Count', color: '#3b82f6', next: 'counting' },
                    counting: { label: 'Review', color: '#f59e0b', next: 'review' },
                    review: { label: 'Complete', color: '#10b981', next: 'completed' },
                };
                const action = transitions[r.status || ''];
                return (
                    <Space size="small">
                        {action && (
                            <Button size="small" type="primary"
                                onClick={() => handleStatusChange(r.id, action.next)}
                                style={{ background: action.color, border: 'none', fontSize: 11 }}>
                                {action.label}
                            </Button>
                        )}
                        <Button size="small" danger icon={<DeleteOutlined />}
                            onClick={() => Modal.confirm({ title: 'Delete session?', onOk: () => handleDeleteSession(r.id) })} />
                    </Space>
                );
            },
        },
    ];

    // â”€â”€â”€ Line Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const lineColumns = [
        { title: '#', dataIndex: 'sortOrder', width: 40 },
        { title: 'Item', dataIndex: 'itemName', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        { title: 'SKU', dataIndex: 'itemSku', width: 130, render: (v: string) => v ? <Text code className="text-xs">{v}</Text> : '-' },
        { title: 'Zone / Bin', key: 'location', width: 170, render: (_: any, r: OpnameLine) => `${r.zoneName || 'â€”'} / ${r.binCode || 'â€”'}` },
        {
            title: 'System Qty', dataIndex: 'systemQty', width: 100,
            render: (v: number, r: OpnameLine) => `${v} ${r.uom}`,
        },
        {
            title: 'Actual Qty', dataIndex: 'actualQty', width: 100,
            render: (v: number | null, r: OpnameLine) => v !== null && v !== undefined ? `${v} ${r.uom}` :
                <Tag color="default" className="text-xs">Pending</Tag>,
        },
        {
            title: 'Variance', key: 'variance', width: 100,
            render: (_: any, r: OpnameLine) => {
                if (r.varianceQty === null || r.varianceQty === undefined || r.actualQty === null || r.actualQty === undefined) return 'â€”';
                const color = r.varianceQty < 0 ? '#ef4444' : r.varianceQty > 0 ? '#f59e0b' : '#10b981';
                return <Text strong style={{ color }}>{r.varianceQty > 0 ? '+' : ''}{r.varianceQty} {r.uom}</Text>;
            },
        },
        {
            title: 'Value Impact', dataIndex: 'varianceValue', width: 120,
            render: (v: number | null) => {
                if (v === null || v === undefined) return 'â€”';
                const color = v < 0 ? '#ef4444' : v > 0 ? '#f59e0b' : '#10b981';
                return <Text strong style={{ color, fontSize: 12 }}>{fmtCurrency(v)}</Text>;
            },
        },
        {
            title: 'Status', dataIndex: 'status', width: 100,
            render: (v: string) => <Tag color={LINE_STATUSES[v]?.color || 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
    ];

    const filteredSessions = sessions.filter(s =>
        !searchTerm || s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sessionCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sessionSteps = [
        {
            title: "Session Info",
            icon: <AuditOutlined />,
            fields: ["sessionCode", "title", "warehouseId"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={10}>
                            <Form.Item name="sessionCode" label="Session Code" rules={[{ required: true }]}>
                                <Input placeholder="OPN-2026-XXX" />
                            </Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                                <Input placeholder="Session title" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
                        <Select placeholder="Select warehouse"
                            options={warehouses.map(w => ({ value: w.id, label: `${w.code} â€” ${w.name}` }))} />
                    </Form.Item>
                </>
            ),
        },
        {
            title: "Schedule & Notes",
            icon: <CalendarOutlined />,
            fields: ["countedBy", "scheduledDate", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="countedBy" label="Counted By">
                                <Input placeholder="Person name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="scheduledDate" label="Scheduled Date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Session notes" />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Stock Opname</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Physical stock counting, auditing, and variance tracking"
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
                                            <Text strong className="text-lg">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Main Table Card */}
                <Card size="small" style={{
                    flex: 1, ...glass, borderRadius: 12, border: '1px solid rgba(255,255,255,0.5)',
                }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Text strong style={{
                                background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 15,
                            }}>
                                <AuditOutlined /> Counting Sessions ({sessions.length})
                            </Text>
                            <Input prefix={<SearchOutlined className="text-gray-400" />}
                                placeholder="Search sessions..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)} allowClear
                                style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={loadAll} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'inventory_stock_opname', title: 'Stock Opname', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'sessionNumber' }, { header: 'Warehouse', key: 'warehouseName' }, { header: 'Status', key: 'status' }], data: sessions })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'inventory_stock_opname', title: 'Stock Opname', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'sessionNumber' }, { header: 'Warehouse', key: 'warehouseName' }, { header: 'Status', key: 'status' }], data: sessions })} /></Tooltip></RbacGuard>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => { sessionForm.resetFields(); setSessionModalOpen(true); }}
                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))', borderRadius: 8, border: 'none' }}>
                                New Session
                            </Button>
                        </Space>
                    </div>

                    <Table
                        dataSource={filteredSessions} columns={sessionColumns}
                        rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        scroll={{ x: 1200 }}
                        expandable={{
                            expandedRowKeys: expandedSessionId ? [expandedSessionId] : [],
                            onExpand: (expanded, record) => {
                                setExpandedSessionId(expanded ? record.id : null);
                                if (expanded && !opnameLines[record.id]) loadLines(record.id);
                            },
                            expandedRowRender: (record) => (
                                <div className="p-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <Text strong style={{
                                            background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                        }}>Count Items â€” {record.title}</Text>
                                        <Button size="small" icon={<PlusOutlined />}
                                            onClick={() => { setLineSessionId(record.id); lineForm.resetFields(); setLineModalOpen(true); }}
                                            disabled={record.status === 'completed' || record.status === 'cancelled'}
                                            style={{ borderColor: 'var(--theme-color, #7c3aed)', color: 'var(--theme-color, #7c3aed)' }}>
                                            Add Item
                                        </Button>
                                    </div>
                                    <Table dataSource={opnameLines[record.id] || []} columns={lineColumns}
                                        rowKey="id" size="small" pagination={false}
                                        rowClassName={(r) => {
                                            if (r.varianceQty && r.varianceQty !== 0) return 'bg-red-50/50';
                                            return '';
                                        }}
                                    />
                                </div>
                            ),
                        }}
                    />
                </Card>
            </div>

            {/* â”€â”€â”€ Session SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={sessionModalOpen}
                onCancel={() => { setSessionModalOpen(false); sessionForm.resetFields(); }}
                onSubmit={handleCreateSession}
                form={sessionForm}
                title="New Counting Session"
                entityName="opname_session"
                steps={sessionSteps}
                fields={SESSION_FIELDS}
                width={580}
                loading={false}
                onBatchCreate={handleBatchCreateSession}
                gradient={["var(--theme-color, #7c3aed)", "#6366f1"]}
            />

            {/* â”€â”€â”€ Add Line Item Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Modal title="Add Count Item" open={lineModalOpen}
                onCancel={() => setLineModalOpen(false)} onOk={handleAddLine} okText="Add">
                <Form form={lineForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="itemId" label="Item" rules={[{ required: true, message: 'Select an item' }]}>
                                <ItemPicker
                                    placeholder="Search items by name or SKU..."
                                    onItemSelect={(item) => {
                                        if (item) {
                                            lineForm.setFieldsValue({
                                                itemName: item.name,
                                                itemSku: item.sku,
                                                unitCost: item.costPrice,
                                                uom: item.uom || 'pcs',
                                            });
                                        } else {
                                            lineForm.setFieldsValue({ itemName: undefined, itemSku: undefined, unitCost: undefined, uom: 'pcs' });
                                        }
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="itemName" hidden><input /></Form.Item>
                            <Form.Item name="itemSku" hidden><input /></Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="zoneName" label="Zone">
                                <Input placeholder="Zone" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="binCode" label="Bin">
                                <Input placeholder="Bin code" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="uom" label="UOM" initialValue="pcs">
                                <Select options={[
                                    { value: 'pcs', label: 'pcs' }, { value: 'kg', label: 'kg' },
                                    { value: 'ltr', label: 'ltr' }, { value: 'sheet', label: 'sheet' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="systemQty" label="System Qty" rules={[{ required: true }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="unitCost" label="Unit Cost">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </CMSLayout>
    );
}

