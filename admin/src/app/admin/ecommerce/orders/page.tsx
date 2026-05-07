"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Space, Button, Tooltip, Row, Col, Drawer, message, Modal, Select, Form, InputNumber, Divider } from "antd";
import { ShoppingCartOutlined, SearchOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SendOutlined, EyeOutlined, CarOutlined, DeleteOutlined, InboxOutlined, PlusOutlined, MinusCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { inventoryService, EcomOrder, EcomOrderItem, EcomStatsType, EcomCustomer } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import ItemPicker from "@/components/inventory/ItemPicker";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

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

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : 'â€”';

interface OrderLineItem {
    key: number;
    itemId?: string;
    itemName: string;
    itemSku?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
}

export default function OrdersPage() {
    const [stats, setStats] = useState<EcomStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [orders, setOrders] = useState<EcomOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [selectedOrder, setSelectedOrder] = useState<EcomOrder | null>(null);
    const [orderItems, setOrderItems] = useState<EcomOrderItem[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // New Order modal
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [orderForm] = Form.useForm();
    const [customers, setCustomers] = useState<EcomCustomer[]>([]);
    const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
    const [lineKeyCounter, setLineKeyCounter] = useState(0);

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
            message.success(`Status â†’ ${newStatus}`);
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

    // â”€â”€â”€ New Order helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const openNewOrder = async () => {
        orderForm.resetFields();
        setLineItems([]);
        setLineKeyCounter(0);
        setOrderModalOpen(true);
        try {
            const c = await inventoryService.getEcomCustomers();
            setCustomers(c);
        } catch { setCustomers([]); }
    };

    const onCustomerChange = (customerId: string) => {
        const c = customers.find(x => x.id === customerId);
        if (c) {
            orderForm.setFieldsValue({
                customerName: `${c.firstName} ${c.lastName || ''}`.trim(),
                customerEmail: c.email,
                customerPhone: c.phone,
            });
        }
    };

    const addLineItem = () => {
        const key = lineKeyCounter + 1;
        setLineKeyCounter(key);
        setLineItems(prev => [...prev, { key, itemName: '', quantity: 1, unitPrice: 0, discount: 0, subtotal: 0 }]);
    };

    const removeLineItem = (key: number) => {
        setLineItems(prev => prev.filter(l => l.key !== key));
    };

    const updateLineItem = (key: number, updates: Partial<OrderLineItem>) => {
        setLineItems(prev => prev.map(l => {
            if (l.key !== key) return l;
            const updated = { ...l, ...updates };
            updated.subtotal = (updated.quantity * updated.unitPrice) - (updated.discount || 0);
            return updated;
        }));
    };

    const orderSubtotal = lineItems.reduce((sum, l) => sum + l.subtotal, 0);

    const handleCreateOrder = async () => {
        try {
            const values = await orderForm.validateFields();
            if (lineItems.length === 0) { message.warning('Add at least one line item'); return; }
            const shippingCost = values.shippingCost || 0;
            const order = await inventoryService.createEcomOrder('default', {
                orderNumber: values.orderNumber,
                customerId: values.customerId,
                customerName: values.customerName,
                customerEmail: values.customerEmail,
                customerPhone: values.customerPhone,
                shippingAddress: values.shippingAddress,
                shippingCity: values.shippingCity,
                shippingProvince: values.shippingProvince,
                shippingPostalCode: values.shippingPostalCode,
                shippingMethod: values.shippingMethod,
                shippingCost,
                subtotal: orderSubtotal,
                totalAmount: orderSubtotal + shippingCost,
                paymentMethod: values.paymentMethod,
                notes: values.notes,
                source: 'admin',
            } as any);
            // Add line items
            for (const l of lineItems) {
                await inventoryService.addEcomOrderItem(order.id, {
                    itemId: l.itemId,
                    itemName: l.itemName,
                    itemSku: l.itemSku,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    discount: l.discount,
                    subtotal: l.subtotal,
                } as any);
            }
            message.success('Order created');
            setOrderModalOpen(false);
            load();
        } catch (e: any) {
            if (e.errorFields) return;
            message.error(e.message || 'Failed to create order');
        }
    };

    const kpiCards = [
        { title: 'Total Orders', value: stats?.totalOrders || 0, icon: <ShoppingCartOutlined />, color: themeColor },
        { title: 'Pending', value: stats?.pending || 0, icon: <ClockCircleOutlined />, color: '#94a3b8' },
        { title: 'Processing', value: stats?.processing || 0, icon: <InboxOutlined />, color: '#3b82f6' },
        { title: 'Shipped', value: stats?.shipped || 0, icon: <SendOutlined />, color: '#06b6d4' },
        { title: 'Completed', value: stats?.completed || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Revenue', value: fmtCurrency(stats?.totalRevenue), icon: <DollarOutlined />, color: '#f59e0b' },
    ];

    const TRANSITIONS: Record<string, { label: string; color: string; next: string }> = {
        pending: { label: 'Confirm', color: '#3b82f6', next: 'confirmed' },
        confirmed: { label: 'Process', color: themeColor, next: 'processing' },
        processing: { label: 'Ship', color: '#06b6d4', next: 'shipped' },
        shipped: { label: 'Delivered', color: '#10b981', next: 'delivered' },
        delivered: { label: 'Complete', color: '#059669', next: 'completed' },
    };

    const CANCELLABLE = new Set(['pending', 'confirmed', 'processing', 'shipped']);

    const filteredOrders = orders.filter(o => {
        if (statusFilter && o.status !== statusFilter) return false;
        if (search && !o.orderNumber?.toLowerCase().includes(search.toLowerCase()) && !o.customerName?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const columns = [
        { title: 'Order #', dataIndex: 'orderNumber', width: 140, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Customer', dataIndex: 'customerName', ellipsis: true, render: (v: string) => <Text strong className="text-sm">{v || 'â€”'}</Text> },
        { title: 'Total', dataIndex: 'totalAmount', width: 140, render: (v: number) => <Text strong style={{ color: themeColor }}>{fmtCurrency(v)}</Text> },
        { title: 'Payment', dataIndex: 'paymentStatus', width: 100,
            render: (v: string) => <Tag color={PAYMENT_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Source', dataIndex: 'source', width: 80, render: (v: string) => <Tag className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Date', dataIndex: 'createdAt', width: 100, render: (v: string) => v ? new Date(v).toLocaleDateString() : 'â€”' },
        { title: 'Status', dataIndex: 'status', width: 120,
            render: (v: string) => {
                const s = ORDER_STATUS[v] || { color: 'default', icon: null };
                return <Tag icon={s.icon} color={s.color} className="rounded-full text-xs capitalize">{v}</Tag>;
            },
        },
        { title: '', key: 'actions', width: 220,
            render: (_: any, r: EcomOrder) => {
                const action = TRANSITIONS[r.status || ''];
                const canCancel = CANCELLABLE.has(r.status || '');
                return (
                    <Space size="small">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => viewOrder(r)} />
                        {action && (
                            <Button size="small" type="primary" onClick={() => handleStatusChange(r.id, action.next)}
                                style={{ background: action.color, border: 'none', fontSize: 11 }}>{action.label}</Button>
                        )}
                        {canCancel && (
                            <Button size="small" danger onClick={() => Modal.confirm({
                                title: 'Cancel this order?',
                                content: ['processing', 'shipped'].includes(r.status || '')
                                    ? 'Stock will be automatically restored for physical items.'
                                    : 'This order has not been processed yet.',
                                okText: 'Cancel Order',
                                okButtonProps: { danger: true },
                                onOk: () => handleStatusChange(r.id, 'cancelled'),
                            })} style={{ fontSize: 11 }}>Cancel</Button>
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
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Orders</AuroraText>}
            subTitle={<DecryptedText text="Order management across all fulfillment types" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={{
                                    ...glass,
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

                <Card size="small" style={{ flex: 1, ...glass, borderRadius: 12, border: '1px solid rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search orders..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} size="small"
                                options={Object.keys(ORDER_STATUS).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))} />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ecommerce_orders', title: 'eCommerce Orders', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Order #', key: 'orderNumber' }, { header: 'Customer', key: 'customerName' }, { header: 'Total', key: 'totalAmount' }, { header: 'Payment', key: 'paymentStatus' }, { header: 'Status', key: 'status' }, { header: 'Date', key: 'createdAt' }], data: filteredOrders })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ecommerce_orders', title: 'eCommerce Orders', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Order #', key: 'orderNumber' }, { header: 'Customer', key: 'customerName' }, { header: 'Total', key: 'totalAmount' }, { header: 'Payment', key: 'paymentStatus' }, { header: 'Status', key: 'status' }, { header: 'Date', key: 'createdAt' }], data: filteredOrders })} /></Tooltip></RbacGuard>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openNewOrder}
                                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', borderRadius: 8 }}>
                                New Order
                            </Button>
                        </Space>
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
                                <Col span={12}><Text type="secondary" className="text-xs block">Email</Text><Text>{selectedOrder.customerEmail || 'â€”'}</Text></Col>
                            </Row>
                            <Row gutter={16} className="mt-2">
                                <Col span={12}><Text type="secondary" className="text-xs block">Total</Text><Text strong style={{ color: themeColor, fontSize: 16 }}>{fmtCurrency(selectedOrder.totalAmount)}</Text></Col>
                                <Col span={12}><Text type="secondary" className="text-xs block">Payment</Text><Tag color={PAYMENT_COLORS[selectedOrder.paymentStatus || ''] || 'default'}>{selectedOrder.paymentStatus} ({selectedOrder.paymentMethod || 'â€”'})</Tag></Col>
                            </Row>
                            <Row gutter={16} className="mt-2">
                                <Col span={12}><Text type="secondary" className="text-xs block">Shipping</Text><Text>{selectedOrder.shippingMethod || 'â€”'} â†’ {selectedOrder.shippingCity || 'â€”'}</Text></Col>
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

            {/* â”€â”€â”€ New Order Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Modal title="New Order" open={orderModalOpen} onCancel={() => setOrderModalOpen(false)}
                onOk={handleCreateOrder} okText="Create Order" width={720}>
                <Form form={orderForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="orderNumber" label="Order Number" rules={[{ required: true }]}>
                                <Input placeholder="ORD-2026-XXX" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="customerId" label="Customer">
                                <Select placeholder="Select customer (optional)" showSearch allowClear
                                    filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                                    onChange={onCustomerChange}
                                    options={customers.map(c => ({
                                        value: c.id, label: `${c.customerCode} â€” ${c.firstName} ${c.lastName || ''}`
                                    }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
                                <Input placeholder="Full name" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="customerEmail" label="Email">
                                <Input placeholder="email@example.com" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="customerPhone" label="Phone">
                                <Input placeholder="+62..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider plain style={{ margin: '8px 0' }}>Line Items</Divider>
                    <div style={{ marginBottom: 12 }}>
                        {lineItems.map((line) => (
                            <div key={line.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <div style={{ flex: 3 }}>
                                    <ItemPicker
                                        onItemSelect={(item) => { if (item) updateLineItem(line.key, { itemId: item.id, itemName: item.name, itemSku: item.sku, unitPrice: item.sellingPrice || item.costPrice || 0 }); }}
                                    />
                                </div>
                                <InputNumber min={1} value={line.quantity} onChange={v => updateLineItem(line.key, { quantity: v || 1 })} style={{ width: 70 }} placeholder="Qty" />
                                <InputNumber min={0} value={line.unitPrice} onChange={v => updateLineItem(line.key, { unitPrice: v || 0 })} style={{ width: 120 }} prefix="Rp" placeholder="Price" />
                                <InputNumber min={0} value={line.discount} onChange={v => updateLineItem(line.key, { discount: v || 0 })} style={{ width: 100 }} prefix="-Rp" placeholder="Disc" />
                                <span style={{ width: 100, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                    {fmtCurrency(line.subtotal)}
                                </span>
                                <Button size="small" type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeLineItem(line.key)} />
                            </div>
                        ))}
                        <Button type="dashed" onClick={addLineItem} icon={<PlusOutlined />} style={{ width: '100%' }}>
                            Add Item
                        </Button>
                    </div>

                    <Divider plain style={{ margin: '8px 0' }}>Shipping & Payment</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="shippingAddress" label="Address">
                                <Input placeholder="Street address" />
                            </Form.Item>
                        </Col>
                        <Col span={5}>
                            <Form.Item name="shippingCity" label="City">
                                <Input placeholder="City" />
                            </Form.Item>
                        </Col>
                        <Col span={5}>
                            <Form.Item name="shippingProvince" label="Province">
                                <Input placeholder="Province" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="shippingMethod" label="Shipping Method">
                                <Select placeholder="Select" allowClear options={[
                                    { value: 'standard', label: 'Standard' }, { value: 'express', label: 'Express' },
                                    { value: 'same_day', label: 'Same Day' }, { value: 'pickup', label: 'Pickup' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="shippingCost" label="Shipping Cost">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="paymentMethod" label="Payment Method">
                                <Select placeholder="Select" allowClear options={[
                                    { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'cash', label: 'Cash' },
                                    { value: 'credit_card', label: 'Credit Card' }, { value: 'ewallet', label: 'E-Wallet' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="notes" label="Notes">
                                <Input.TextArea rows={1} placeholder="Order notes..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: themeColor }}>
                        Subtotal: {fmtCurrency(orderSubtotal)} | Total: {fmtCurrency(orderSubtotal + (orderForm.getFieldValue('shippingCost') || 0))}
                    </div>
                </Form>
            </Modal>
        </CMSLayout>
    );
}



