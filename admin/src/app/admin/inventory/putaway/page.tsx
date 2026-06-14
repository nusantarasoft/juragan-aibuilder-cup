"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Badge, Button, Card, Col, Empty, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Spin, Table, Tag, Tooltip, Typography, theme } from "antd";
import {
    InboxOutlined, PlusOutlined, ReloadOutlined, CheckCircleOutlined,
    PlayCircleOutlined, CloseCircleOutlined, SearchOutlined,
    EnvironmentOutlined, DownloadOutlined, ThunderboltOutlined,
    ClockCircleOutlined, ArrowRightOutlined, DatabaseOutlined
} from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { inventoryService, PutawayTask, InvBin, BinContent } from "@/lib/inventoryService";

const { Text } = Typography;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: 'Pending' },
    assigned: { color: 'blue', label: 'Assigned' },
    in_progress: { color: 'purple', label: 'In Progress' },
    completed: { color: 'green', label: 'Completed' },
    cancelled: { color: 'default', label: 'Cancelled' },
};
const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
    urgent: { color: 'red', label: 'Urgent' },
    high: { color: 'orange', label: 'High' },
    normal: { color: 'blue', label: 'Normal' },
    low: { color: 'default', label: 'Low' },
};

export default function PutawayPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [tasks, setTasks] = useState<PutawayTask[]>([]);
    const [bins, setBins] = useState<InvBin[]>([]);
    const [binContents, setBinContents] = useState<BinContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [tab, setTab] = useState<'tasks' | 'contents'>('tasks');

    const [createOpen, setCreateOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTaskId, setConfirmTaskId] = useState('');
    const [confirmBinId, setConfirmBinId] = useState('');

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [t, b, c] = await Promise.all([
                inventoryService.getPutawayTasks(),
                inventoryService.getBins(),
                inventoryService.getBinContents(),
            ]);
            setTasks(t); setBins(b); setBinContents(c);
        } catch { message.error("Failed to load data"); }
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
                (t.itemSku || '').toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [tasks, statusFilter, searchTerm]);

    const stats = useMemo(() => ({
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        total: tasks.length,
    }), [tasks]);

    const handleCreate = async () => {
        try {
            const vals = await createForm.validateFields();
            await inventoryService.createPutawayTask('default', vals);
            message.success('Put-away task created');
            setCreateOpen(false); createForm.resetFields(); loadAll();
        } catch (e: any) { message.error(e?.message || 'Failed'); }
    };

    const handleStart = async (id: string) => {
        try { await inventoryService.startPutawayTask(id); message.success('Task started'); loadAll(); }
        catch { message.error('Failed'); }
    };
    const handleConfirm = async () => {
        if (!confirmBinId) { message.warning('Select a bin'); return; }
        try { await inventoryService.confirmPutaway(confirmTaskId, confirmBinId); message.success('Put-away confirmed!'); setConfirmOpen(false); loadAll(); }
        catch { message.error('Failed'); }
    };
    const handleCancel = async (id: string) => {
        try { await inventoryService.cancelPutawayTask(id); message.success('Cancelled'); loadAll(); }
        catch { message.error('Failed'); }
    };

    const cardStyle = isDark
        ? { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }
        : { background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14 };

    const kpiCards = [
        { title: 'Pending', value: stats.pending, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'In Progress', value: stats.inProgress, icon: <ThunderboltOutlined />, color: '#8b5cf6' },
        { title: 'Completed', value: stats.completed, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Bin Contents', value: binContents.length, icon: <DatabaseOutlined />, color: '#3b82f6' },
    ];

    const taskColumns = [
        { title: 'Task #', dataIndex: 'taskNumber', width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'Item', dataIndex: 'itemName', render: (v: string, r: PutawayTask) => <div><Text strong style={{ fontSize: 12 }}>{v || '—'}</Text>{r.itemSku && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{r.itemSku}</Text>}</div> },
        { title: 'Qty', dataIndex: 'quantity', width: 80, render: (v: number, r: PutawayTask) => <Text style={{ fontSize: 12 }}>{v} {r.uom}</Text> },
        { title: 'Source', dataIndex: 'sourceReference', width: 120, render: (v: string, r: PutawayTask) => v ? <Tag style={{ borderRadius: 8, fontSize: 10 }}>{r.sourceType}: {v}</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
        { title: 'Suggested Bin', dataIndex: 'suggestedBinCode', width: 130, render: (v: string) => v ? <Tag icon={<EnvironmentOutlined />} color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
        { title: 'Actual Bin', dataIndex: 'actualBinCode', width: 130, render: (v: string) => v ? <Tag icon={<EnvironmentOutlined />} color="green" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 100, render: (v: string) => <Text style={{ fontSize: 11 }}>{v || '—'}</Text> },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (v: string) => { const c = PRIORITY_CONFIG[v] || PRIORITY_CONFIG.normal; return <Tag color={c.color} style={{ borderRadius: 10, fontSize: 10 }}>{c.label}</Tag>; } },
        { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => { const c = STATUS_CONFIG[v] || STATUS_CONFIG.pending; return <Tag color={c.color} style={{ borderRadius: 10, fontSize: 10 }}>{c.label}</Tag>; } },
        {
            title: 'Actions', width: 160, render: (_: any, r: PutawayTask) => (
                <Space size="small">
                    {(r.status === 'pending' || r.status === 'assigned') && <Tooltip title="Start"><Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(r.id)} style={{ color: '#8b5cf6', borderColor: '#8b5cf6' }} /></Tooltip>}
                    {(r.status === 'pending' || r.status === 'in_progress') && <Tooltip title="Confirm Put-Away"><Button size="small" icon={<CheckCircleOutlined />} onClick={() => { setConfirmTaskId(r.id); setConfirmBinId(r.suggestedBinId || ''); setConfirmOpen(true); }} type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} /></Tooltip>}
                    {r.status !== 'completed' && r.status !== 'cancelled' && <Popconfirm title="Cancel this task?" onConfirm={() => handleCancel(r.id)}><Button size="small" icon={<CloseCircleOutlined />} danger /></Popconfirm>}
                </Space>
            ),
        },
    ];

    const contentColumns = [
        { title: 'Bin', dataIndex: 'binId', width: 140, render: (v: string) => { const b = bins.find(bin => bin.id === v); return <Tag icon={<EnvironmentOutlined />} color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{b?.code || v.slice(0, 8)}</Tag>; } },
        { title: 'Item ID', dataIndex: 'itemId', width: 200, render: (v: string) => <Text code style={{ fontSize: 10 }}>{v.slice(0, 12)}...</Text> },
        { title: 'Qty', dataIndex: 'quantity', width: 80, render: (v: number, r: BinContent) => <Text style={{ fontSize: 12 }}>{v} {r.uom}</Text> },
        { title: 'Lot #', dataIndex: 'lotNumber', width: 100, render: (v: string) => <Text style={{ fontSize: 11 }}>{v || '—'}</Text> },
        { title: 'Batch #', dataIndex: 'batchNumber', width: 100, render: (v: string) => <Text style={{ fontSize: 11 }}>{v || '—'}</Text> },
        { title: 'Expiry', dataIndex: 'expiryDate', width: 100, render: (v: string) => v ? <Text style={{ fontSize: 11 }}>{new Date(v).toLocaleDateString()}</Text> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
        { title: 'Received', dataIndex: 'receivedAt', width: 120, render: (v: string) => v ? <Text style={{ fontSize: 10 }}>{new Date(v).toLocaleDateString()}</Text> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#10b981", "#f59e0b"]}>Put-Away</AuroraText>}
            subTitle={<DecryptedText text="Manage inbound goods placement into bin locations" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Tooltip key="3d" title="View Bin Locations in 3D Map"><Button icon={<EnvironmentOutlined />} onClick={() => {
                    const activeTask = tasks.find(t => t.status === 'in_progress') || tasks.find(t => t.status === 'pending' || t.status === 'assigned');
                    const binCode = activeTask?.suggestedBinCode || activeTask?.actualBinCode;
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

                    <Card size="small" style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <Space>
                                {['tasks', 'contents'].map(t => (
                                    <Button key={t} type={tab === t ? 'primary' : 'default'} size="small" onClick={() => setTab(t as any)}
                                        style={tab === t ? { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`, border: 'none', borderRadius: 8 } : { borderRadius: 8 }}>
                                        {t === 'tasks' ? 'Put-Away Tasks' : 'Bin Contents'}
                                    </Button>
                                ))}
                            </Space>
                            <Space>
                                {tab === 'tasks' && (
                                    <Select value={statusFilter} onChange={setStatusFilter} size="small" style={{ width: 130 }}
                                        options={[{ value: 'all', label: 'All Statuses' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} />
                                )}
                                <Input prefix={<SearchOutlined style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb' }} />} placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} allowClear size="small" style={{ width: 180, borderRadius: 8 }} />
                                <Button icon={<ReloadOutlined />} size="small" onClick={loadAll} />
                                <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { createForm.resetFields(); setCreateOpen(true); }}
                                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`, border: 'none', borderRadius: 8 }}>Create Task</Button>
                            </Space>
                        </div>
                        {tab === 'tasks' ? (
                            <Table dataSource={filteredTasks} columns={taskColumns} rowKey="id" size="small" pagination={{ pageSize: 15, showTotal: t => `${t} tasks` }} scroll={{ x: 1100 }} />
                        ) : (
                            <Table dataSource={binContents} columns={contentColumns} rowKey="id" size="small" pagination={{ pageSize: 15, showTotal: t => `${t} entries` }} scroll={{ x: 800 }} />
                        )}
                    </Card>
                </div>
            </Spin>

            <Modal title={<span style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>Create Put-Away Task</span>} open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate} okText="Create" width={560}>
                <Form form={createForm} layout="vertical">
                    <Row gutter={12}>
                        <Col span={16}><Form.Item name="itemName" label="Item Name" rules={[{ required: true }]}><Input placeholder="Item name" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="itemSku" label="SKU"><Input placeholder="Optional" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="uom" label="UOM" initialValue="pcs"><Select options={[{ value: 'pcs', label: 'Pieces' }, { value: 'kg', label: 'Kilograms' }, { value: 'box', label: 'Boxes' }]} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="sourceReference" label="Source Reference"><Input placeholder="PO-001, GRN-001..." /></Form.Item></Col>
                        <Col span={12}><Form.Item name="sourceType" label="Source Type"><Select options={[{ value: 'grn', label: 'GRN' }, { value: 'purchase_order', label: 'Purchase Order' }, { value: 'production', label: 'Production' }, { value: 'return', label: 'Return' }]} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="assignedTo" label="Assigned To"><Input placeholder="Worker name" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="priority" label="Priority" initialValue="normal"><Select options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="itemId" hidden initialValue="00000000-0000-0000-0000-000000000000"><Input /></Form.Item>
                </Form>
            </Modal>

            <Modal title="Confirm Put-Away" open={confirmOpen} onCancel={() => setConfirmOpen(false)} onOk={handleConfirm} okText="Confirm" okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}>
                <Form layout="vertical">
                    <Form.Item label="Select Actual Bin Location">
                        <Select value={confirmBinId} onChange={setConfirmBinId} showSearch optionFilterProp="label" placeholder="Search bins..."
                            options={bins.map(b => ({ value: b.id, label: `${b.code} (${b.aisle || '?'}-${b.rack || '?'}-L${b.level || '?'})` }))} />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
