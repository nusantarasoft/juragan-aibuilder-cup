"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Space, Button, Tooltip, Row, Col, Drawer, message, Modal, Select, Form, InputNumber, Divider } from "antd";
import { RollbackOutlined, SearchOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService, EcomReturn, EcomReturnItem, EcomReturnStatsType, EcomOrder } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    requested: { color: 'orange', icon: <ClockCircleOutlined /> },
    approved: { color: 'blue', icon: <CheckCircleOutlined /> },
    received: { color: 'cyan', icon: <RollbackOutlined /> },
    completed: { color: 'green', icon: <CheckCircleOutlined /> },
    rejected: { color: 'red', icon: <CloseCircleOutlined /> },
};

const REASON_OPTIONS = [
    { value: 'changed_mind', label: 'Changed Mind' },
    { value: 'defective', label: 'Defective Product' },
    { value: 'wrong_item', label: 'Wrong Item Received' },
    { value: 'damaged', label: 'Damaged in Shipping' },
    { value: 'not_as_described', label: 'Not as Described' },
    { value: 'other', label: 'Other' },
];

const RESOLUTION_OPTIONS = [
    { value: 'refund', label: 'Full Refund' },
    { value: 'partial_refund', label: 'Partial Refund' },
    { value: 'exchange', label: 'Exchange' },
    { value: 'store_credit', label: 'Store Credit' },
];

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

const TRANSITIONS: Record<string, { label: string; color: string; next: string }> = {
    requested: { label: 'Approve', color: '#3b82f6', next: 'approved' },
    approved: { label: 'Mark Received', color: '#06b6d4', next: 'received' },
    received: { label: 'Complete', color: '#10b981', next: 'completed' },
};

const RETURN_FIELDS: FieldDef[] = [
    { name: 'orderId', label: 'Order', required: true },
    { name: 'orderNumber', label: 'Order Number' },
    { name: 'customerName', label: 'Customer' },
    { name: 'customerEmail', label: 'Email' },
    { name: 'reason', label: 'Reason', required: true },
    { name: 'resolution', label: 'Resolution', required: true },
    { name: 'refundMethod', label: 'Refund Method' },
    { name: 'refundAmount', label: 'Refund Amount', type: 'number' },
    { name: 'restockingFee', label: 'Restocking Fee', type: 'number' },
    { name: 'notes', label: 'Notes' },
];

export default function ReturnsPage() {
    const [stats, setStats] = useState<EcomReturnStatsType | null>(null);
    const [returns, setReturns] = useState<EcomReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [selected, setSelected] = useState<EcomReturn | null>(null);
    const [returnItems, setReturnItems] = useState<EcomReturnItem[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [orders, setOrders] = useState<EcomOrder[]>([]);
    const [lineItems, setLineItems] = useState<{ key: number; itemName: string; itemSku?: string; quantity: number; unitPrice: number; condition: string; restock: boolean }[]>([]);
    const [lineKey, setLineKey] = useState(0);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [s, r] = await Promise.all([
                inventoryService.getEcomReturnStats(),
                inventoryService.getEcomReturns(),
            ]);
            setStats(s);
            setReturns(r);
        } catch (err) { console.error(err); message.error("Failed to load returns"); } finally { setLoading(false); }
    };

    const viewReturn = async (ret: EcomReturn) => {
        setSelected(ret);
        setDrawerOpen(true);
        try {
            const items = await inventoryService.getEcomReturnItems(ret.id);
            setReturnItems(items);
        } catch { setReturnItems([]); }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try { await inventoryService.updateEcomReturnStatus(id, newStatus); message.success(`Status → ${newStatus}`); load(); }
        catch { message.error("Failed to update status"); }
    };

    const handleDelete = async (id: string) => {
        try { await inventoryService.deleteEcomReturn(id); message.success("Return deleted"); load(); }
        catch { message.error("Failed to delete"); }
    };

    const openNewReturn = async () => {
        form.resetFields(); setLineItems([]); setLineKey(0); setModalOpen(true);
        try { const o = await inventoryService.getEcomOrders(); setOrders(o); } catch { setOrders([]); }
    };

    const onOrderChange = (orderId: string) => {
        const o = orders.find(x => x.id === orderId);
        if (o) { form.setFieldsValue({ orderNumber: o.orderNumber, customerName: o.customerName, customerEmail: o.customerEmail }); }
    };

    const addLine = () => { const k = lineKey + 1; setLineKey(k); setLineItems(p => [...p, { key: k, itemName: '', quantity: 1, unitPrice: 0, condition: 'unopened', restock: true }]); };
    const removeLine = (k: number) => setLineItems(p => p.filter(l => l.key !== k));
    const updateLine = (k: number, u: any) => setLineItems(p => p.map(l => l.key !== k ? l : { ...l, ...u }));

    const handleCreate = async (values: any) => {
        setSaving(true);
        try {
            if (!lineItems.length) { message.warning('Add at least one item'); setSaving(false); return; }
            const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
            await inventoryService.createEcomReturn('default', {
                orderId: values.orderId, orderNumber: values.orderNumber,
                customerName: values.customerName, customerEmail: values.customerEmail,
                reason: values.reason, resolution: values.resolution,
                subtotal, refundAmount: values.refundAmount || subtotal,
                restockingFee: values.restockingFee || 0,
                refundMethod: values.refundMethod || 'original_payment',
                notes: values.notes, internalNotes: values.internalNotes,
                items: lineItems.map(l => ({ itemName: l.itemName, itemSku: l.itemSku, quantity: l.quantity, unitPrice: l.unitPrice, condition: l.condition, restock: l.restock })),
            } as any);
            message.success('Return created');
            setModalOpen(false);
            form.resetFields();
            load();
        } catch (e: any) {
            message.error(e.message || 'Failed');
        } finally { setSaving(false); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createEcomReturn('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.orderNumber || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        load();
        return { success, failed, errors };
    };

    const kpiCards = [
        { title: 'Total Returns', value: stats?.totalReturns || 0, icon: <RollbackOutlined />, color: '#f59e0b' },
        { title: 'Requested', value: stats?.requested || 0, icon: <ClockCircleOutlined />, color: '#f97316' },
        { title: 'Approved', value: stats?.approved || 0, icon: <CheckCircleOutlined />, color: '#3b82f6' },
        { title: 'Received', value: stats?.received || 0, icon: <RollbackOutlined />, color: '#06b6d4' },
        { title: 'Completed', value: stats?.completed || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Total Refunded', value: fmtCurrency(stats?.totalRefunded), icon: <DollarOutlined />, color: '#ef4444' },
    ];

    const filtered = returns.filter(r => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (search && !r.returnNumber?.toLowerCase().includes(search.toLowerCase()) && !r.customerName?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const columns = [
        { title: 'Return #', dataIndex: 'returnNumber', width: 140, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Order', dataIndex: 'orderNumber', width: 130, render: (v: string) => <Text className="text-xs">{v || '—'}</Text> },
        { title: 'Customer', dataIndex: 'customerName', ellipsis: true, render: (v: string) => <Text strong className="text-sm">{v || '—'}</Text> },
        { title: 'Reason', dataIndex: 'reason', width: 130, render: (v: string) => <Tag className="rounded-full text-xs capitalize">{v?.replace(/_/g, ' ') || '—'}</Tag> },
        { title: 'Refund', dataIndex: 'refundAmount', width: 130, render: (v: number) => <Text strong style={{ color: '#ef4444' }}>{fmtCurrency(v)}</Text> },
        { title: 'Refund Status', dataIndex: 'refundStatus', width: 110,
            render: (v: string) => <Tag color={v === 'refunded' ? 'green' : v === 'pending' ? 'orange' : 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Date', dataIndex: 'createdAt', width: 100, render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
        { title: 'Status', dataIndex: 'status', width: 110,
            render: (v: string) => { const s = STATUS_CONFIG[v] || { color: 'default', icon: null }; return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs capitalize">{v}</Tag>; }
        },
        { title: '', key: 'actions', width: 200,
            render: (_: any, r: EcomReturn) => {
                const action = TRANSITIONS[r.status || ''];
                return (
                    <Space size="small">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => viewReturn(r)} />
                        {action && (
                            <Button size="small" type="primary" onClick={() => handleStatusChange(r.id, action.next)}
                                style={{ background: action.color, border: 'none', fontSize: 11 }}>{action.label}</Button>
                        )}
                        {r.status === 'requested' && (
                            <Button size="small" danger onClick={() => handleStatusChange(r.id, 'rejected')} style={{ fontSize: 11 }}>Reject</Button>
                        )}
                        <Button size="small" danger icon={<DeleteOutlined />}
                            onClick={() => Modal.confirm({ title: 'Delete return?', onOk: () => handleDelete(r.id) })} />
                    </Space>
                );
            },
        },
    ];

    const returnSteps = [
        {
            title: "Order",
            fields: ["orderId", "orderNumber", "customerName"],
            content: (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="orderId" label="Order" rules={[{ required: true }]}>
                            <Select placeholder="Select order" showSearch allowClear onChange={onOrderChange}
                                filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                                options={orders.map(o => ({ value: o.id, label: `${o.orderNumber} — ${o.customerName || ''}` }))} />
                        </Form.Item>
                    </Col>
                    <Col span={6}><Form.Item name="orderNumber" label="Order #"><Input disabled /></Form.Item></Col>
                    <Col span={6}><Form.Item name="customerName" label="Customer"><Input disabled /></Form.Item></Col>
                </Row>
            ),
        },
        {
            title: "Reason & Resolution",
            fields: ["reason", "resolution", "refundMethod", "refundAmount", "restockingFee", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Select options={REASON_OPTIONS} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="resolution" label="Resolution" rules={[{ required: true }]}><Select options={RESOLUTION_OPTIONS} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="refundMethod" label="Refund Method">
                            <Select options={[{ value: 'original_payment', label: 'Original Payment' }, { value: 'store_credit', label: 'Store Credit' }, { value: 'bank_transfer', label: 'Bank Transfer' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="refundAmount" label="Refund Amount"><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="restockingFee" label="Restocking Fee"><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="notes" label="Notes"><Input.TextArea rows={1} /></Form.Item></Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Return Items",
            fields: [],
            content: (
                <div style={{ marginBottom: 12 }}>
                    {lineItems.map(l => (
                        <div key={l.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            <Input value={l.itemName} onChange={e => updateLine(l.key, { itemName: e.target.value })} placeholder="Item name" style={{ flex: 2 }} />
                            <InputNumber min={1} value={l.quantity} onChange={v => updateLine(l.key, { quantity: v || 1 })} style={{ width: 70 }} placeholder="Qty" />
                            <InputNumber min={0} value={l.unitPrice} onChange={v => updateLine(l.key, { unitPrice: v || 0 })} style={{ width: 120 }} prefix="Rp" />
                            <Select value={l.condition} onChange={v => updateLine(l.key, { condition: v })} style={{ width: 110 }}
                                options={[{ value: 'unopened', label: 'Unopened' }, { value: 'opened', label: 'Opened' }, { value: 'damaged', label: 'Damaged' }]} />
                            <Button size="small" type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeLine(l.key)} />
                        </div>
                    ))}
                    <Button type="dashed" onClick={addLine} icon={<PlusOutlined />} style={{ width: '100%' }}>Add Item</Button>
                </div>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#f59e0b", "#ef4444", "#f97316", "#00ffff", "#ff00ff"]}>Returns</AuroraText>}
            subTitle={<DecryptedText text="Manage customer returns & refunds with auto-restocking" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
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
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>{s.icon}</div>
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

                <Card size="small" style={{ flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search returns..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} size="small"
                                options={Object.keys(STATUS_CONFIG).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))} />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openNewReturn}
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none', borderRadius: 8 }}>
                                New Return
                            </Button>
                        </Space>
                    </div>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} returns` }} scroll={{ x: 1200 }} />
                </Card>
            </div>

            <Drawer title={`Return ${selected?.returnNumber || ''}`} open={drawerOpen} onClose={() => setDrawerOpen(false)}
                width={520} styles={{ body: { padding: 16 } }}>
                {selected && (
                    <div className="space-y-4">
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Row gutter={16}>
                                <Col span={12}><Text type="secondary" className="text-xs block">Customer</Text><Text strong>{selected.customerName}</Text></Col>
                                <Col span={12}><Text type="secondary" className="text-xs block">Order</Text><Text code>{selected.orderNumber}</Text></Col>
                            </Row>
                            <Row gutter={16} className="mt-2">
                                <Col span={8}><Text type="secondary" className="text-xs block">Reason</Text><Tag className="capitalize">{selected.reason?.replace(/_/g, ' ')}</Tag></Col>
                                <Col span={8}><Text type="secondary" className="text-xs block">Resolution</Text><Tag color="blue" className="capitalize">{selected.resolution?.replace(/_/g, ' ')}</Tag></Col>
                                <Col span={8}><Text type="secondary" className="text-xs block">Refund</Text><Text strong style={{ color: '#ef4444' }}>{fmtCurrency(selected.refundAmount)}</Text></Col>
                            </Row>
                        </Card>
                        <Card size="small" title="Return Items" style={{ borderRadius: 10 }}>
                            <Table dataSource={returnItems} rowKey="id" size="small" pagination={false}
                                columns={[
                                    { title: 'Item', dataIndex: 'itemName', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
                                    { title: 'Qty', dataIndex: 'quantity', width: 50 },
                                    { title: 'Price', dataIndex: 'unitPrice', width: 110, render: (v: number) => fmtCurrency(v) },
                                    { title: 'Condition', dataIndex: 'condition', width: 100, render: (v: string) => <Tag className="text-xs capitalize">{v}</Tag> },
                                    { title: 'Restock', dataIndex: 'restock', width: 70, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
                                ]}
                            />
                        </Card>
                    </div>
                )}
            </Drawer>

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); setLineItems([]); }}
                onSubmit={handleCreate}
                form={form}
                title="New Return Request"
                entityName="return"
                steps={returnSteps}
                fields={RETURN_FIELDS}
                loading={saving}
                onBatchCreate={handleBatchCreate}
                gradient={["#f59e0b", "#ef4444"]}
            />
        </CMSLayout>
    );
}
