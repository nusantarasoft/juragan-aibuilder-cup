"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Space, Button, Tooltip, Row, Col, Drawer, message, Modal, Select } from "antd";
import { ShoppingCartOutlined, SearchOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SendOutlined, EyeOutlined, CarOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService, EcomOrder, EcomOrderItem, EcomStatsType } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";

const { Text } = Typography;

const ORDER_STATUS: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'default', icon: <ClockCircleOutlined /> },
    confirmed: { color: 'blue', icon: <CheckCircleOutlined /> },
    processing: { color: 'processing', icon: <InboxOutlined /> },
    shipped: { color: 'cyan', icon: <SendOutlined /> },
    delivered: { color: 'geekblue', icon: <CarOutlined /> },
    completed: { color: 'green', icon: <CheckCircleOutlined /> },
    cancelled: { color: 'red', icon: <CloseCircleOutlined /> },
    refunded: { color: 'volcano', icon: <CloseCircleOutlined /> },
};

const PAYMENT_COLORS: Record<string, string> = { unpaid: 'red', partial: 'orange', paid: 'green', refunded: 'volcano' };
const FULFILLMENT_COLORS: Record<string, string> = { physical: 'blue', ticket: 'purple', scheduled: 'cyan', rental: 'orange' };

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

export default function OrdersPage() {
    const [stats, setStats] = useState<EcomStatsType | null>(null);
    const [orders, setOrders] = useState<EcomOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [selectedOrder, setSelectedOrder] = useState<EcomOrder | null>(null);
    const [orderItems, setOrderItems] = useState<EcomOrderItem[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [statsData, ordersData] = await Promise.all([
                inventoryService.getEcomStats(),
                inventoryService.getEcomOrders(),
            ]);
            setStats(statsData);
            setOrders(ordersData);
        } catch (err) { console.error(err); message.error("Failed to load orders"); } finally { setLoading(false); }
    };

    const viewOrder = async (order: EcomOrder) => {
        setSelectedOrder(order);
        setDrawerOpen(true);
        try {
            const items = await inventoryService.getEcomOrderItems(order.id);
            setOrderItems(items);
        } catch { setOrderItems([]); }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await inventoryService.updateEcomOrderStatus(id, newStatus);
            message.success(`Status → ${newStatus}`);
            load();
        } catch { message.error("Failed to update status"); }
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deleteEcomOrder(id);
            message.success("Order deleted");
            load();
        } catch { message.error("Failed to delete"); }
    };

    const kpiCards = [
        { title: 'Total Orders', value: stats?.totalOrders || 0, icon: <ShoppingCartOutlined />, color: '#6366f1' },
        { title: 'Pending', value: stats?.pending || 0, icon: <ClockCircleOutlined />, color: '#94a3b8' },
        { title: 'Processing', value: stats?.processing || 0, icon: <InboxOutlined />, color: '#3b82f6' },
        { title: 'Shipped', value: stats?.shipped || 0, icon: <SendOutlined />, color: '#06b6d4' },
        { title: 'Completed', value: stats?.completed || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Revenue', value: fmtCurrency(stats?.totalRevenue), icon: <DollarOutlined />, color: '#f59e0b' },
    ];

    const TRANSITIONS: Record<string, { label: string; color: string; next: string }> = {
        pending: { label: 'Confirm', color: '#3b82f6', next: 'confirmed' },
        confirmed: { label: 'Process', color: '#8b5cf6', next: 'processing' },
        processing: { label: 'Ship', color: '#06b6d4', next: 'shipped' },
        shipped: { label: 'Delivered', color: '#10b981', next: 'delivered' },
        delivered: { label: 'Complete', color: '#059669', next: 'completed' },
    };

    const filteredOrders = orders.filter(o => {
        if (statusFilter && o.status !== statusFilter) return false;
        if (search && !o.orderNumber?.toLowerCase().includes(search.toLowerCase()) && !o.customerName?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const columns = [
        { title: 'Order #', dataIndex: 'orderNumber', width: 140, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Customer', dataIndex: 'customerName', ellipsis: true, render: (v: string) => <Text strong className="text-sm">{v || '—'}</Text> },
        { title: 'Total', dataIndex: 'totalAmount', width: 140, render: (v: number) => <Text strong style={{ color: '#6366f1' }}>{fmtCurrency(v)}</Text> },
        { title: 'Payment', dataIndex: 'paymentStatus', width: 100,
            render: (v: string) => <Tag color={PAYMENT_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Source', dataIndex: 'source', width: 80, render: (v: string) => <Tag className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Date', dataIndex: 'createdAt', width: 100, render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
        { title: 'Status', dataIndex: 'status', width: 120,
            render: (v: string) => {
                const s = ORDER_STATUS[v] || { color: 'default', icon: null };
                return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs capitalize">{v}</Tag>;
            },
        },
        { title: '', key: 'actions', width: 180,
            render: (_: any, r: EcomOrder) => {
                const action = TRANSITIONS[r.status || ''];
                return (
                    <Space size="small">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => viewOrder(r)} />
                        {action && (
                            <Button size="small" type="primary" onClick={() => handleStatusChange(r.id, action.next)}
                                style={{ background: action.color, border: 'none', fontSize: 11 }}>{action.label}</Button>
                        )}
                        <Button size="small" danger icon={<DeleteOutlined />}
                            onClick={() => Modal.confirm({ title: 'Delete order?', onOk: () => handleDelete(r.id) })} />
                    </Space>
                );
            },
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#6366f1", "#8b5cf6", "#a78bfa", "#00ffff", "#ff00ff"]}>Orders</AuroraText>}
            subTitle={<DecryptedText text="Order management across all fulfillment types" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
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
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search orders..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} size="small"
                                options={Object.keys(ORDER_STATUS).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))} />
                        </div>
                        <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                    </div>
                    <Table dataSource={filteredOrders} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} orders` }} scroll={{ x: 1100 }} />
                </Card>
            </div>

            {/* Order Detail Drawer */}
            <Drawer title={`Order ${selectedOrder?.orderNumber || ''}`} open={drawerOpen} onClose={() => setDrawerOpen(false)}
                width={560} styles={{ body: { padding: 16 } }}>
                {selectedOrder && (
                    <div className="space-y-4">
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Row gutter={16}>
                                <Col span={12}><Text type="secondary" className="text-xs block">Customer</Text><Text strong>{selectedOrder.customerName}</Text></Col>
                                <Col span={12}><Text type="secondary" className="text-xs block">Email</Text><Text>{selectedOrder.customerEmail || '—'}</Text></Col>
                            </Row>
                            <Row gutter={16} className="mt-2">
                                <Col span={12}><Text type="secondary" className="text-xs block">Total</Text><Text strong style={{ color: '#6366f1', fontSize: 16 }}>{fmtCurrency(selectedOrder.totalAmount)}</Text></Col>
                                <Col span={12}><Text type="secondary" className="text-xs block">Payment</Text><Tag color={PAYMENT_COLORS[selectedOrder.paymentStatus || ''] || 'default'}>{selectedOrder.paymentStatus} ({selectedOrder.paymentMethod || '—'})</Tag></Col>
                            </Row>
                            <Row gutter={16} className="mt-2">
                                <Col span={12}><Text type="secondary" className="text-xs block">Shipping</Text><Text>{selectedOrder.shippingMethod || '—'} → {selectedOrder.shippingCity || '—'}</Text></Col>
                                <Col span={12}><Text type="secondary" className="text-xs block">Source</Text><Tag>{selectedOrder.source}</Tag></Col>
                            </Row>
                        </Card>

                        <Card size="small" title="Line Items" style={{ borderRadius: 10 }}>
                            <Table dataSource={orderItems} rowKey="id" size="small" pagination={false}
                                columns={[
                                    { title: 'Item', dataIndex: 'itemName', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
                                    { title: 'Type', dataIndex: 'fulfillmentType', width: 80, render: (v: string) => <Tag color={FULFILLMENT_COLORS[v] || 'default'} className="text-xs capitalize">{v}</Tag> },
                                    { title: 'Qty', dataIndex: 'quantity', width: 50 },
                                    { title: 'Price', dataIndex: 'unitPrice', width: 110, render: (v: number) => fmtCurrency(v) },
                                    { title: 'Subtotal', dataIndex: 'subtotal', width: 120, render: (v: number) => <Text strong>{fmtCurrency(v)}</Text> },
                                    { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag className="text-xs capitalize">{v}</Tag> },
                                ]}
                            />
                        </Card>
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
