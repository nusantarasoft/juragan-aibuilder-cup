"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Badge, Button, Card, Col, Form, Input, InputNumber, message, Modal, Popconfirm, Progress, Row, Select, Space, Spin, Table, Tag, Tooltip, Typography, theme } from "antd";
import {
    ShoppingCartOutlined, PlusOutlined, ReloadOutlined, CheckCircleOutlined,
    PlayCircleOutlined, CloseCircleOutlined, SearchOutlined,
    EnvironmentOutlined, WarningOutlined, ThunderboltOutlined,
    ClockCircleOutlined, OrderedListOutlined, ArrowRightOutlined
} from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { inventoryService, PickTask, InvBin } from "@/lib/inventoryService";

const { Text } = Typography;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: 'Pending' },
    assigned: { color: 'blue', label: 'Assigned' },
    in_progress: { color: 'purple', label: 'In Progress' },
    completed: { color: 'green', label: 'Completed' },
    short_picked: { color: 'red', label: 'Short Picked' },
    cancelled: { color: 'default', label: 'Cancelled' },
};
const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
    urgent: { color: 'red', label: 'Urgent' },
    high: { color: 'orange', label: 'High' },
    normal: { color: 'blue', label: 'Normal' },
    low: { color: 'default', label: 'Low' },
};

export default function PickPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [tasks, setTasks] = useState<PickTask[]>([]);
    const [bins, setBins] = useState<InvBin[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTaskId, setConfirmTaskId] = useState('');
    const [confirmMaxQty, setConfirmMaxQty] = useState(0);
    const [confirmPickedQty, setConfirmPickedQty] = useState(0);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [t, b] = await Promise.all([
                inventoryService.getPickTasks(),
                inventoryService.getBins(),
            ]);
            setTasks(t); setBins(b);
        } catch { message.error("Failed to load"); }
        finally { setLoading(false); }
    };

    const filteredTasks = useMemo(() => {
        let filtered = tasks;
        if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.taskNumber.toLowerCase().includes(term) ||
                (t.itemName || '').toLowerCase().includes(term) ||
                (t.orderReference || '').toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [tasks, statusFilter, searchTerm]);

    const stats = useMemo(() => ({
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        shortPicked: tasks.filter(t => t.status === 'short_picked').length,
    }), [tasks]);

    // Pick route: ordered list of pending/in_progress tasks by pick sequence
    const pickRoute = useMemo(() =>
        tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'assigned')
            .sort((a, b) => a.pickSequence - b.pickSequence)
    , [tasks]);

    const handleCreate = async () => {
        try {
            const vals = await createForm.validateFields();
            await inventoryService.createPickTask('default', vals);
            message.success('Pick task created');
            setCreateOpen(false); createForm.resetFields(); loadAll();
        } catch (e: any) { message.error(e?.message || 'Failed'); }
    };

    const handleStart = async (id: string) => {
        try { await inventoryService.startPickTask(id); message.success('Picking started'); loadAll(); }
        catch { message.error('Failed'); }
    };
    const handleConfirm = async () => {
        try { await inventoryService.confirmPick(confirmTaskId, confirmPickedQty); message.success(confirmPickedQty < confirmMaxQty ? 'Short pick recorded' : 'Pick confirmed!'); setConfirmOpen(false); loadAll(); }
        catch { message.error('Failed'); }
    };
    const handleCancel = async (id: string) => {
        try { await inventoryService.cancelPickTask(id); message.success('Cancelled'); loadAll(); }
        catch { message.error('Failed'); }
    };

    const cardStyle = isDark
        ? { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }
        : { background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14 };

    const kpiCards = [
        { title: 'Pending', value: stats.pending, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'In Progress', value: stats.inProgress, icon: <ThunderboltOutlined />, color: '#8b5cf6' },
        { title: 'Completed', value: stats.completed, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Short Picked', value: stats.shortPicked, icon: <WarningOutlined />, color: '#ef4444' },
    ];

    const taskColumns = [
        { title: '#', dataIndex: 'pickSequence', width: 50, render: (v: number) => <Badge count={v} style={{ backgroundColor: themeColor }} /> },
        { title: 'Task #', dataIndex: 'taskNumber', width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'Item', dataIndex: 'itemName', render: (v: string, r: PickTask) => <div><Text strong style={{ fontSize: 12 }}>{v || '—'}</Text>{r.itemSku && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{r.itemSku}</Text>}</div> },
        { title: 'Ordered', dataIndex: 'quantity', width: 80, render: (v: number, r: PickTask) => <Text style={{ fontSize: 12 }}>{v} {r.uom}</Text> },
        {
            title: 'Picked', width: 100, render: (_: any, r: PickTask) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: r.pickedQuantity < r.quantity && r.status === 'short_picked' ? '#ef4444' : undefined }}>{r.pickedQuantity}</Text>
                    <Progress percent={r.quantity > 0 ? Math.round((r.pickedQuantity / r.quantity) * 100) : 0} size="small" style={{ width: 50, marginBottom: 0 }} strokeColor={r.pickedQuantity >= r.quantity ? '#10b981' : '#f59e0b'} />
                </div>
            ),
        },
        { title: 'From Bin', dataIndex: 'fromBinCode', width: 130, render: (v: string) => v ? <Tag icon={<EnvironmentOutlined />} color="cyan" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
        { title: 'Order', dataIndex: 'orderReference', width: 120, render: (v: string, r: PickTask) => v ? <Tag style={{ borderRadius: 8, fontSize: 10 }}>{r.orderType}: {v}</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 100, render: (v: string) => <Text style={{ fontSize: 11 }}>{v || '—'}</Text> },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (v: string) => { const c = PRIORITY_CONFIG[v] || PRIORITY_CONFIG.normal; return <Tag color={c.color} style={{ borderRadius: 10, fontSize: 10 }}>{c.label}</Tag>; } },
        { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => { const c = STATUS_CONFIG[v] || STATUS_CONFIG.pending; return <Tag color={c.color} style={{ borderRadius: 10, fontSize: 10 }}>{c.label}</Tag>; } },
        {
            title: 'Actions', width: 160, render: (_: any, r: PickTask) => (
                <Space size="small">
                    {(r.status === 'pending' || r.status === 'assigned') && <Tooltip title="Start Pick"><Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(r.id)} style={{ color: '#8b5cf6', borderColor: '#8b5cf6' }} /></Tooltip>}
                    {(r.status === 'pending' || r.status === 'in_progress') && <Tooltip title="Confirm Pick"><Button size="small" icon={<CheckCircleOutlined />} onClick={() => { setConfirmTaskId(r.id); setConfirmMaxQty(r.quantity); setConfirmPickedQty(r.quantity); setConfirmOpen(true); }} type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} /></Tooltip>}
                    {r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'short_picked' && <Popconfirm title="Cancel this task?" onConfirm={() => handleCancel(r.id)}><Button size="small" icon={<CloseCircleOutlined />} danger /></Popconfirm>}
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#06b6d4", "#3b82f6"]}>Pick List</AuroraText>}
            subTitle={<DecryptedText text="Manage outbound picking from bin locations" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Tooltip key="3d" title="View Pick Route in 3D Map"><Button icon={<EnvironmentOutlined />} onClick={() => {
                    const activeTask = tasks.find(t => t.status === 'in_progress') || tasks.find(t => t.status === 'pending' || t.status === 'assigned');
                    const binCode = activeTask?.fromBinCode;
                    router.push(`/admin/inventory/warehouse-map${binCode ? `?bin=${encodeURIComponent(binCode)}` : ''}`);
                }}>3D Map</Button></Tooltip>,
            ]}
        >
            <Spin spinning={loading}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Row gutter={[10, 10]}>
                        {kpiCards.map((s, i) => (
                            <Col key={i} xs={12} sm={6}>
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                    <Card size="small" style={{ ...cardStyle, borderTop: `3px solid ${s.color}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}15`, color: s.color, fontSize: 16 }}>{s.icon}</div>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{s.title}</Text>
                                                <Text strong style={{ fontSize: 18 }}>{s.value}</Text>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    <Row gutter={12}>
                        <Col xs={24} lg={pickRoute.length > 0 ? 17 : 24}>
                            <Card size="small" style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                    <Text strong style={{ fontSize: 14, background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}><ShoppingCartOutlined /> Pick Tasks</Text>
                                    <Space>
                                        <Select value={statusFilter} onChange={setStatusFilter} size="small" style={{ width: 140 }}
                                            options={[{ value: 'all', label: 'All Statuses' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} />
                                        <Input prefix={<SearchOutlined style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb' }} />} placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} allowClear size="small" style={{ width: 180, borderRadius: 8 }} />
                                        <Button icon={<ReloadOutlined />} size="small" onClick={loadAll} />
                                        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { createForm.resetFields(); setCreateOpen(true); }}
                                            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`, border: 'none', borderRadius: 8 }}>Create Pick</Button>
                                    </Space>
                                </div>
                                <Table dataSource={filteredTasks} columns={taskColumns} rowKey="id" size="small" pagination={{ pageSize: 15, showTotal: t => `${t} tasks` }} scroll={{ x: 1200 }} />
                            </Card>
                        </Col>

                        {pickRoute.length > 0 && (
                            <Col xs={24} lg={7}>
                                <Card size="small" style={{ ...cardStyle, borderLeft: `3px solid ${themeColor}` }}
                                    title={<Text strong style={{ fontSize: 13, color: themeColor }}><OrderedListOutlined /> Pick Route</Text>}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                                        {pickRoute.map((task, i) => (
                                            <motion.div key={task.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                                                <div style={{
                                                    padding: '8px 10px', borderRadius: 10,
                                                    background: task.status === 'in_progress' ? `${themeColor}15` : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                    border: `1px solid ${task.status === 'in_progress' ? themeColor : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                }}>
                                                    <Badge count={i + 1} style={{ backgroundColor: task.status === 'in_progress' ? themeColor : '#666', fontSize: 10 }} />
                                                    <div style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{task.fromBinCode || 'No bin'}</Text>
                                                        <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>{task.itemName || task.taskNumber} × {task.quantity}</Text>
                                                    </div>
                                                    {task.status === 'in_progress' && <ThunderboltOutlined style={{ color: themeColor, fontSize: 12 }} />}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </div>
            </Spin>

            <Modal title={<span style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>Create Pick Task</span>} open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate} okText="Create" width={560}>
                <Form form={createForm} layout="vertical">
                    <Row gutter={12}>
                        <Col span={16}><Form.Item name="itemName" label="Item Name" rules={[{ required: true }]}><Input placeholder="Item name" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="fromBinId" label="From Bin"><Select showSearch optionFilterProp="label" placeholder="Select bin" options={bins.map(b => ({ value: b.id, label: `${b.code} (${b.aisle || '?'}-${b.rack || '?'})` }))} allowClear /></Form.Item></Col>
                        <Col span={12}><Form.Item name="uom" label="UOM" initialValue="pcs"><Select options={[{ value: 'pcs', label: 'Pieces' }, { value: 'kg', label: 'Kilograms' }, { value: 'box', label: 'Boxes' }]} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="orderReference" label="Order Reference"><Input placeholder="SO-001..." /></Form.Item></Col>
                        <Col span={12}><Form.Item name="orderType" label="Order Type"><Select options={[{ value: 'sales_order', label: 'Sales Order' }, { value: 'work_order', label: 'Work Order' }, { value: 'transfer', label: 'Transfer' }, { value: 'manual', label: 'Manual' }]} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={8}><Form.Item name="assignedTo" label="Assigned To"><Input placeholder="Worker" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="priority" label="Priority" initialValue="normal"><Select options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="pickSequence" label="Sequence" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="itemId" hidden initialValue="00000000-0000-0000-0000-000000000000"><Input /></Form.Item>
                </Form>
            </Modal>

            <Modal title="Confirm Pick" open={confirmOpen} onCancel={() => setConfirmOpen(false)} onOk={handleConfirm} okText="Confirm Pick" okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}>
                <Form layout="vertical">
                    <Form.Item label={`Picked Quantity (max: ${confirmMaxQty})`}>
                        <InputNumber value={confirmPickedQty} onChange={v => setConfirmPickedQty(v || 0)} min={0} max={confirmMaxQty} style={{ width: '100%' }} />
                    </Form.Item>
                    {confirmPickedQty < confirmMaxQty && confirmPickedQty > 0 && (
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <Text style={{ color: '#ef4444', fontSize: 12 }}><WarningOutlined /> This will be recorded as a short pick ({confirmPickedQty}/{confirmMaxQty})</Text>
                        </div>
                    )}
                </Form>
            </Modal>
        </CMSLayout>
    );
}
