"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Descriptions, Divider, Drawer, Form, Input, InputNumber, message, Modal, Popconfirm, Progress, Row, Select, Space, Table, Tabs, Tag, Tooltip, Typography, theme } from "antd";
import {
    ShoppingOutlined, SearchOutlined, ReloadOutlined, InboxOutlined,
    TagOutlined, DollarOutlined, FilterOutlined, PlusOutlined,
    EditOutlined, DeleteOutlined, EyeOutlined, CopyOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { inventoryService } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";

const { Text, Title, Paragraph } = Typography;

const SELLABLE_TYPES = [
    { value: 'physical', label: 'Physical Product', icon: 'ðŸ“¦', desc: 'Tangible item tracked in stock (e-commerce, retail)', color: '#3b82f6' },
    { value: 'ticket', label: 'Ticket / Event', icon: 'ðŸŽ«', desc: 'One-time event entry with seat capacity', color: 'var(--theme-color, #8b5cf6)' },
    { value: 'scheduled', label: 'Scheduled Service', icon: 'ðŸ—“ï¸', desc: 'Recurring route or time-based service', color: '#06b6d4' },
    { value: 'rental', label: 'Rental Asset', icon: 'ðŸ”‘', desc: 'Item rented out and returned', color: '#f59e0b' },
];

const ITEM_TYPE_FOR_FULFILLMENT: Record<string, string> = {
    physical: 'finished_good', ticket: 'service', scheduled: 'service', rental: 'goods',
};

const FULFILLMENT_COLORS: Record<string, string> = {
    physical: 'blue', ticket: 'purple', scheduled: 'cyan', rental: 'orange',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'green', draft: 'default', archived: 'red',
};

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : 'â€”';

export default function ProductsPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [fulfillmentFilter, setFulfillmentFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [stats, setStats] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Add Product state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addStep, setAddStep] = useState(0); // 0 = type, 1 = details
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [addForm] = Form.useForm();
    const [saving, setSaving] = useState(false);

    // Edit Product state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [editForm] = Form.useForm();
    const [editSaving, setEditSaving] = useState(false);

    // Detail Drawer
    const [detailDrawer, setDetailDrawer] = useState<any>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [itemsData, statsData] = await Promise.all([
                inventoryService.getItems('default'),
                inventoryService.getStockStats(),
            ]);
            setItems(itemsData);
            setStats(statsData);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    // Only show sellable items
    const sellableItems = items.filter(item =>
        !['raw_material', 'consumable', 'semi_finished'].includes(item.itemType)
    );

    const filtered = sellableItems.filter(item => {
        if (fulfillmentFilter && item.fulfillmentType !== fulfillmentFilter) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) && !item.sku?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // â”€â”€â”€ Add Product â”€â”€â”€
    const handleAddProduct = async () => {
        if (!selectedType) return;
        try {
            const values = await addForm.validateFields();
            setSaving(true);
            await inventoryService.createItem('default', {
                ...values,
                fulfillmentType: selectedType,
                itemType: ITEM_TYPE_FOR_FULFILLMENT[selectedType],
                status: 'active',
            });
            message.success(`Product "${values.name}" has been added to the catalog!`);
            resetAddModal();
            load();
        } catch (e: any) {
            if (e?.errorFields) { message.warning('Please fill all required fields.'); }
            else { message.error('Failed to create product.'); }
        } finally { setSaving(false); }
    };

    const resetAddModal = () => {
        setAddModalOpen(false);
        setSelectedType(null);
        setAddStep(0);
        addForm.resetFields();
    };

    // â”€â”€â”€ Edit Product â”€â”€â”€
    const openEditModal = (product: any) => {
        setEditingProduct(product);
        editForm.setFieldsValue(product);
        setEditModalOpen(true);
    };

    const handleEditProduct = async () => {
        if (!editingProduct) return;
        try {
            const values = await editForm.validateFields();
            setEditSaving(true);
            await inventoryService.updateItem(editingProduct.id, values);
            message.success(`Product "${values.name}" updated successfully!`);
            setEditModalOpen(false);
            setEditingProduct(null);
            editForm.resetFields();
            if (detailDrawer?.id === editingProduct.id) {
                setDetailDrawer({ ...detailDrawer, ...values });
            }
            load();
        } catch (e: any) {
            if (e?.errorFields) { message.warning('Please fill all required fields.'); }
            else { message.error('Failed to update product.'); }
        } finally { setEditSaving(false); }
    };

    // â”€â”€â”€ Delete Product â”€â”€â”€
    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deleteItem(id);
            message.success("Product deleted");
            if (detailDrawer?.id === id) setDetailDrawer(null);
            load();
        } catch { message.error("Failed to delete product"); }
    };

    // â”€â”€â”€ Duplicate â”€â”€â”€
    const handleDuplicate = async (product: any) => {
        try {
            const { id, createdAt, updatedAt, ...rest } = product;
            await inventoryService.createItem('default', { ...rest, name: `${rest.name} (Copy)`, sku: '' });
            message.success(`Duplicated "${product.name}"`);
            load();
        } catch { message.error("Failed to duplicate"); }
    };

    const countByType = (type: string) => sellableItems.filter(i => i.fulfillmentType === type).length;

    const kpiCards = [
        { title: 'Total Products', value: sellableItems.length, icon: <ShoppingOutlined />, color: themeColor },
        { title: 'Physical', value: countByType('physical'), icon: <InboxOutlined />, color: '#3b82f6' },
        { title: 'Tickets', value: countByType('ticket'), icon: <TagOutlined />, color: themeColor },
        { title: 'Scheduled', value: countByType('scheduled'), icon: <FilterOutlined />, color: '#06b6d4' },
        { title: 'Rental', value: countByType('rental'), icon: <DollarOutlined />, color: '#f59e0b' },
        { title: 'Active', value: sellableItems.filter(i => i.status === 'active').length, icon: <ShoppingOutlined />, color: '#10b981' },
    ];

    const columns = [
        { title: 'SKU', dataIndex: 'sku', width: 120, render: (v: string) => <Text code className="text-xs">{v || 'â€”'}</Text> },
        { title: 'Product Name', dataIndex: 'name', ellipsis: true,
            render: (v: string, r: any) => (
                <Text strong className="text-sm cursor-pointer hover:text-[color:var(--theme-color, #7c3aed)]" onClick={() => setDetailDrawer(r)}>{v}</Text>
            ),
        },
        { title: 'Type', dataIndex: 'fulfillmentType', width: 110,
            render: (v: string) => <Tag color={FULFILLMENT_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Cost Price', dataIndex: 'costPrice', width: 120, render: (v: number) => <Text className="text-xs">{fmtCurrency(v)}</Text> },
        { title: 'Selling Price', dataIndex: 'sellingPrice', width: 120,
            render: (v: number) => <Text strong style={{ color: themeColor }} className="text-xs">{fmtCurrency(v)}</Text> },
        { title: 'Margin', key: 'margin', width: 90,
            render: (_: any, r: any) => {
                const cost = r.costPrice || 0;
                const sell = r.sellingPrice || 0;
                const pct = cost > 0 ? (((sell - cost) / cost) * 100) : 0;
                const isProfit = pct >= 0;
                return cost > 0 ? <Text style={{ color: isProfit ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: 12 }}>{pct.toFixed(0)}%</Text> : <Text className="text-xs text-gray-400">â€”</Text>;
            },
        },
        { title: 'Status', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: '', key: 'actions', width: 120, fixed: 'right' as const,
            render: (_: any, r: any) => (
                <Space size={2}>
                    <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} className="text-gray-400 hover:text-[color:var(--theme-color, #7c3aed)]" onClick={() => setDetailDrawer(r)} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} className="text-gray-400 hover:text-blue-500" onClick={() => openEditModal(r)} /></Tooltip>
                    <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(r.id)}>
                        <Tooltip title="Delete"><Button type="text" size="small" icon={<DeleteOutlined />} className="text-gray-400 hover:text-red-500" /></Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Products</AuroraText>}
            subTitle={<DecryptedText text="Catalog from Inventory â€” all fulfillment types" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>{s.icon}</div>
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

                <Card size="small" style={{ flex: 1, borderRadius: 12, minHeight: 400 }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Select value={viewMode} onChange={setViewMode as any} size="small" style={{ width: 100 }}
                                options={[
                                    { label: <span>ðŸŽ² Grid</span>, value: 'grid' },
                                    { label: <span>ðŸ“‹ Table</span>, value: 'table' }
                                ]} />
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search products..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Fulfillment" allowClear value={fulfillmentFilter} onChange={setFulfillmentFilter} style={{ width: 130 }} size="small"
                                options={[{ value: 'physical', label: 'Physical' }, { value: 'ticket', label: 'Ticket' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'rental', label: 'Rental' }]} />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 110 }} size="small"
                                options={[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }]} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button type="primary" icon={<PlusOutlined />}
                                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', borderRadius: 8 }}
                                onClick={() => setAddModalOpen(true)}>Add Product</Button>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: 8 }} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ecommerce_products', title: 'eCommerce Products', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'SKU', key: 'sku' }, { header: 'Price', key: 'price' }, { header: 'Stock', key: 'stock' }, { header: 'Status', key: 'status' }], data: items })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ecommerce_products', title: 'eCommerce Products', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'SKU', key: 'sku' }, { header: 'Price', key: 'price' }, { header: 'Stock', key: 'stock' }, { header: 'Status', key: 'status' }], data: items })} /></Tooltip></RbacGuard>
                        </div>
                    </div>
                    
                    {viewMode === 'table' ? (
                        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} products` }}
                            scroll={{ x: 1000 }}
                            onRow={(record) => ({ onClick: () => setDetailDrawer(record), style: { cursor: 'pointer' } })}
                        />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 12 }}>
                            <AnimatePresence>
                                {filtered.map((item, idx) => {
                                    const cost = item.costPrice || 0;
                                    const sell = item.sellingPrice || 0;
                                    const profit = sell - cost;
                                    const isProfit = profit >= 0;
                                    const pct = cost > 0 ? ((profit / cost) * 100) : 0;
                                    const cfg = SELLABLE_TYPES.find(t => t.value === item.fulfillmentType) || SELLABLE_TYPES[0];
                                    
                                    return (
                                        <motion.div key={item.id} initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05, duration: 0.3 }}
                                            onClick={() => setDetailDrawer(item)}>
                                            <Card hoverable styles={{ body: { padding: 0 } }} style={{
                                                borderRadius: 16, overflow: 'hidden', height: '100%',
                                                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                                            }}>
                                                <div style={{ height: 110, background: `linear-gradient(135deg, ${cfg.color}15, ${cfg.color}05)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: 48, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>{cfg.icon}</div>
                                                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                                        <Tag color={STATUS_COLORS[item.status || 'default']} style={{ margin: 0, borderRadius: 12, border: 'none' }}>{item.status}</Tag>
                                                    </div>
                                                    <div style={{ position: 'absolute', bottom: -16, left: 16, background: isDark ? '#1f2937' : '#fff', padding: '4px 10px', borderRadius: 12, border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                        <Text strong style={{ fontSize: 11, color: cfg.color }}>{cfg.label}</Text>
                                                    </div>
                                                </div>
                                                <div style={{ padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    <div>
                                                        <Tooltip title={item.name}><Text strong ellipsis style={{ fontSize: 15, display: 'block' }}>{item.name}</Text></Tooltip>
                                                        <Text type="secondary" code style={{ fontSize: 10 }}>{item.sku || 'NO-SKU'}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
                                                        <div>
                                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Selling Price</Text>
                                                            <Text strong style={{ fontSize: 16, color: themeColor }}>{fmtCurrency(sell)}</Text>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Margin</Text>
                                                            {cost > 0 ? (
                                                                <Text strong style={{ color: isProfit ? '#10b981' : '#ef4444', fontSize: 13 }}>
                                                                    {isProfit ? '+' : ''}{pct.toFixed(0)}%
                                                                </Text>
                                                            ) : <Text type="secondary" style={{ fontSize: 12 }}>â€”</Text>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            {filtered.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                                    <ShoppingOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} />
                                    <br />No products found.
                                </div>
                            )}
                        </div>
                    )}

                    <Alert
                        message={<span>For advanced settings (variants, media, stock, BOM) â€” <Button size="small" type="link" style={{ padding: 0 }} onClick={() => router.push('/admin/inventory/items')}>Open Item Master â†’</Button></span>}
                        type="info" showIcon style={{ marginTop: 24, borderRadius: 8 }} />
                </Card>
            </div>

            {/* â•â•â• Add Product Modal â•â•â• */}
            <Modal
                title={null}
                open={addModalOpen}
                onCancel={resetAddModal}
                footer={null}
                width={620}
                centered
                styles={{ body: { padding: 0 } }}
            >
                <div style={{ padding: '24px 28px 0', borderBottom: addStep === 1 ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`, paddingBottom: 20 }}>
                    <Title level={4} className="!m-0" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        âœ¨ Add New Product
                    </Title>
                    <Text type="secondary" className="text-xs">Step {addStep + 1} of 2 â€” {addStep === 0 ? 'Choose fulfillment type' : 'Enter product details'}</Text>
                </div>

                <div style={{ padding: '20px 28px' }}>
                    <AnimatePresence mode="wait">
                        {addStep === 0 && (
                            <motion.div key="addStep0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                                <Text strong className="block mb-1">How is this product fulfilled?</Text>
                                <Text type="secondary" className="text-xs block mb-4">Choose the model that best describes this product.</Text>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {SELLABLE_TYPES.map((t, i) => {
                                        const isActive = selectedType === t.value;
                                        return (
                                            <motion.div key={t.value} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                                <Card hoverable onClick={() => setSelectedType(t.value)} style={{
                                                    borderRadius: 14, cursor: 'pointer', transition: 'all 0.25s',
                                                    border: isActive ? `2px solid ${t.color}` : `2px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`,
                                                    background: isActive ? `${t.color}08` : isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                                    boxShadow: isActive ? `0 4px 20px ${t.color}20` : 'none',
                                                }} styles={{ body: { padding: '16px' } }}>
                                                    <div className="flex items-start gap-3">
                                                        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: `${t.color}${isActive ? '20' : '10'}` }}>
                                                            {t.icon}
                                                        </div>
                                                        <div className="flex-1">
                                                            <Text strong className="text-sm" style={{ color: isActive ? t.color : '#111' }}>{t.label}</Text>
                                                            <Text type="secondary" className="text-xs block mt-0.5">{t.desc}</Text>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {addStep === 1 && selectedType && (
                            <motion.div key="addStep1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: `${SELLABLE_TYPES.find(t => t.value === selectedType)?.color}15` }}>
                                        {SELLABLE_TYPES.find(t => t.value === selectedType)?.icon}
                                    </div>
                                    <Tag color={SELLABLE_TYPES.find(t => t.value === selectedType)?.color} className="rounded-full">
                                        {SELLABLE_TYPES.find(t => t.value === selectedType)?.label}
                                    </Tag>
                                </div>

                                <Form form={addForm} layout="vertical" size="middle">
                                    <Form.Item name="name" label="Product Name" rules={[{ required: true, message: 'Name is required' }]}>
                                        <Input size="large" style={{ borderRadius: 10 }}
                                            placeholder={selectedType === 'physical' ? 'e.g. Batik Premium Shirt' : selectedType === 'ticket' ? 'e.g. Nusa Penida Day Tour' : selectedType === 'rental' ? 'e.g. Canon EOS R5 Camera' : 'e.g. Bali-Lombok Express Route'} />
                                    </Form.Item>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="sku" label="SKU (optional)">
                                                <Input placeholder="e.g. NS-POLO-BLU-001" style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="brand" label="Brand (optional)">
                                                <Input placeholder="e.g. Nusantara Collection" style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="costPrice" label="Cost Price (IDR)">
                                                <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="0"
                                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="sellingPrice" label={selectedType === 'rental' ? 'Daily Rate (IDR)' : 'Selling Price (IDR)'} rules={[{ required: true }]}>
                                                <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="0"
                                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    {/* Live margin */}
                                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.costPrice !== cur.costPrice || prev.sellingPrice !== cur.sellingPrice}>
                                        {({ getFieldValue }) => {
                                            const cost = getFieldValue('costPrice') || 0;
                                            const sell = getFieldValue('sellingPrice') || 0;
                                            if (!cost && !sell) return null;
                                            const profit = sell - cost;
                                            const pct = cost > 0 ? ((profit / cost) * 100) : 0;
                                            const isProfit = profit >= 0;
                                            return (
                                                <Card size="small" style={{ borderRadius: 10, background: isProfit ? (isDark ? 'rgba(34,197,94,0.08)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2'), border: `1px solid ${isProfit ? (isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0') : (isDark ? 'rgba(239,68,68,0.2)' : '#fecaca')}`, marginBottom: 16 }}>
                                                    <div className="flex items-center justify-between">
                                                        <Text type="secondary" className="text-xs">Profit per unit</Text>
                                                        <Text strong style={{ color: isProfit ? '#16a34a' : '#dc2626' }}>
                                                            {isProfit ? '+' : ''}{profit.toLocaleString()} {cost > 0 && `(${pct.toFixed(1)}%)`}
                                                        </Text>
                                                    </div>
                                                </Card>
                                            );
                                        }}
                                    </Form.Item>

                                    {/* Type-specific fields */}
                                    {selectedType === 'ticket' && (<>
                                        <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸŽ« Event Details</Text></Divider>
                                        <Row gutter={16}>
                                            <Col span={12}><Form.Item name={['metadata', 'venue']} label="Venue"><Input placeholder="e.g. Bali Convention Center" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={12}><Form.Item name={['metadata', 'eventDate']} label="Event Date"><Input type="date" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={12}><Form.Item name={['metadata', 'capacity']} label="Capacity"><InputNumber min={1} placeholder="500" style={{ width: '100%', borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={12}><Form.Item name={['metadata', 'seatSections']} label="Sections"><Select mode="tags" placeholder="VIP, Regular" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        </Row>
                                    </>)}

                                    {selectedType === 'scheduled' && (<>
                                        <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸ—“ï¸ Route Details</Text></Divider>
                                        <Row gutter={16}>
                                            <Col span={12}><Form.Item name={['metadata', 'origin']} label="Origin"><Input placeholder="e.g. Sanur Harbor" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={12}><Form.Item name={['metadata', 'destination']} label="Destination"><Input placeholder="e.g. Nusa Penida" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={8}><Form.Item name={['metadata', 'capacity']} label="Capacity"><InputNumber min={1} placeholder="100" style={{ width: '100%', borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={8}><Form.Item name={['metadata', 'durationMinutes']} label="Duration (min)"><InputNumber min={1} placeholder="45" style={{ width: '100%', borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={8}><Form.Item name={['metadata', 'vehicleName']} label="Vehicle"><Input placeholder="e.g. KMP Nusa" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        </Row>
                                    </>)}

                                    {selectedType === 'rental' && (<>
                                        <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸ”‘ Rental Details</Text></Divider>
                                        <Row gutter={16}>
                                            <Col span={8}><Form.Item name={['metadata', 'rentalPeriod']} label="Period"><Select options={[{ value: 'hourly', label: 'Hourly' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} style={{ borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={8}><Form.Item name={['metadata', 'condition']} label="Condition"><Select options={[{ value: 'excellent', label: 'âœ¨ Excellent' }, { value: 'good', label: 'ðŸ‘ Good' }, { value: 'fair', label: 'ðŸ‘Œ Fair' }]} style={{ borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={8}><Form.Item name={['metadata', 'depositAmount']} label="Deposit (IDR)"><InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} /></Form.Item></Col>
                                        </Row>
                                    </>)}

                                    {selectedType === 'physical' && (<>
                                        <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸ“¦ Physical Details</Text></Divider>
                                        <Row gutter={16}>
                                            <Col span={8}><Form.Item name="weight" label="Weight"><InputNumber min={0} placeholder="0" style={{ width: '100%', borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={8}><Form.Item name="weightUnit" label="Unit"><Select options={[{ value: 'kg', label: 'Kilogram' }, { value: 'g', label: 'Gram' }, { value: 'lb', label: 'Pound' }]} style={{ borderRadius: 10 }} /></Form.Item></Col>
                                            <Col span={8}><Form.Item name="barcode" label="Barcode"><Input placeholder="EAN-13" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        </Row>
                                    </>)}

                                    <Form.Item name="description" label="Description (optional)">
                                        <Input.TextArea rows={2} placeholder="Brief product description" style={{ borderRadius: 10 }}
                                            showCount maxLength={500} />
                                    </Form.Item>
                                    <Form.Item name="tags" label="Tags (optional)">
                                        <Select mode="tags" placeholder="Add tags..." style={{ borderRadius: 10 }} />
                                    </Form.Item>
                                </Form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {addStep === 1 ? (
                        <Button onClick={() => setAddStep(0)} style={{ borderRadius: 8 }}>â† Back</Button>
                    ) : <div />}
                    {addStep === 0 ? (
                        <Button type="primary" disabled={!selectedType} onClick={() => setAddStep(1)}
                            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', borderRadius: 8, minWidth: 120 }}>
                            Continue â†’
                        </Button>
                    ) : (
                        <Button type="primary" onClick={handleAddProduct} loading={saving}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, minWidth: 140 }}
                            icon={<PlusOutlined />}>
                            Create Product
                        </Button>
                    )}
                </div>
            </Modal>

            {/* â•â•â• Edit Product Modal â•â•â• */}
            <Modal
                title={null}
                open={editModalOpen}
                onCancel={() => { setEditModalOpen(false); setEditingProduct(null); editForm.resetFields(); }}
                footer={null}
                width={620}
                centered
                styles={{ body: { padding: 0 } }}
            >
                {editingProduct && (
                    <>
                        <div style={{ padding: '24px 28px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                    background: `${SELLABLE_TYPES.find(t => t.value === editingProduct.fulfillmentType)?.color || '#6366f1'}15` }}>
                                    {SELLABLE_TYPES.find(t => t.value === editingProduct.fulfillmentType)?.icon || 'ðŸ“¦'}
                                </div>
                                <div>
                                    <Title level={4} className="!m-0" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        Edit Product
                                    </Title>
                                    <Text type="secondary" className="text-xs">{editingProduct.sku || 'No SKU'} Â· {editingProduct.fulfillmentType}</Text>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 28px' }}>
                            <Form form={editForm} layout="vertical" size="middle">
                                <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                                    <Input size="large" style={{ borderRadius: 10 }} />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="sku" label="SKU">
                                            <Input style={{ borderRadius: 10 }} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="brand" label="Brand">
                                            <Input style={{ borderRadius: 10 }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="costPrice" label="Cost Price (IDR)">
                                            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }}
                                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="sellingPrice" label="Selling Price (IDR)" rules={[{ required: true }]}>
                                            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }}
                                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                {/* Live margin */}
                                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.costPrice !== cur.costPrice || prev.sellingPrice !== cur.sellingPrice}>
                                    {({ getFieldValue }) => {
                                        const cost = getFieldValue('costPrice') || 0;
                                        const sell = getFieldValue('sellingPrice') || 0;
                                        if (!cost && !sell) return null;
                                        const profit = sell - cost;
                                        const pct = cost > 0 ? ((profit / cost) * 100) : 0;
                                        const isProfit = profit >= 0;
                                        return (
                                            <Card size="small" style={{ borderRadius: 10, background: isProfit ? (isDark ? 'rgba(34,197,94,0.08)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2'), border: `1px solid ${isProfit ? (isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0') : (isDark ? 'rgba(239,68,68,0.2)' : '#fecaca')}`, marginBottom: 16 }}>
                                                <Row align="middle">
                                                    <Col span={8} style={{ textAlign: 'center' }}>
                                                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Cost</Text>
                                                        <Text strong>{cost.toLocaleString()}</Text>
                                                    </Col>
                                                    <Col span={8} style={{ textAlign: 'center' }}>
                                                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Profit/Unit</Text>
                                                        <Text strong style={{ color: isProfit ? '#16a34a' : '#dc2626' }}>{isProfit ? '+' : ''}{profit.toLocaleString()}</Text>
                                                    </Col>
                                                    <Col span={8} style={{ textAlign: 'center' }}>
                                                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Margin</Text>
                                                        <Text strong style={{ color: isProfit ? '#16a34a' : '#dc2626' }}>{cost > 0 ? `${pct.toFixed(1)}%` : 'â€”'}</Text>
                                                    </Col>
                                                </Row>
                                            </Card>
                                        );
                                    }}
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="taxRate" label="Tax Rate (%)">
                                            <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 10 }} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="status" label="Status">
                                            <Select style={{ borderRadius: 10 }} options={[
                                                { value: 'active', label: 'ðŸŸ¢ Active' },
                                                { value: 'draft', label: 'ðŸŸ¡ Draft' },
                                                { value: 'archived', label: 'âšª Archived' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item name="description" label="Description">
                                    <Input.TextArea rows={2} style={{ borderRadius: 10 }} showCount maxLength={500} />
                                </Form.Item>

                                {/* Type-specific fields in edit */}
                                {editingProduct?.fulfillmentType === 'ticket' && (<>
                                    <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸŽ« Event Details</Text></Divider>
                                    <Row gutter={16}>
                                        <Col span={12}><Form.Item name={['metadata', 'venue']} label="Venue"><Input placeholder="Venue name" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        <Col span={12}><Form.Item name={['metadata', 'eventDate']} label="Event Date"><Input type="date" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={12}><Form.Item name={['metadata', 'capacity']} label="Capacity"><InputNumber min={1} style={{ width: '100%', borderRadius: 10 }} /></Form.Item></Col>
                                        <Col span={12}><Form.Item name={['metadata', 'seatSections']} label="Sections"><Select mode="tags" style={{ borderRadius: 10 }} /></Form.Item></Col>
                                    </Row>
                                </>)}

                                {editingProduct?.fulfillmentType === 'scheduled' && (<>
                                    <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸ—“ï¸ Route</Text></Divider>
                                    <Row gutter={16}>
                                        <Col span={12}><Form.Item name={['metadata', 'origin']} label="Origin"><Input style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        <Col span={12}><Form.Item name={['metadata', 'destination']} label="Destination"><Input style={{ borderRadius: 10 }} /></Form.Item></Col>
                                    </Row>
                                </>)}

                                {editingProduct?.fulfillmentType === 'rental' && (<>
                                    <Divider className="my-3"><Text type="secondary" className="text-xs">ðŸ”‘ Rental</Text></Divider>
                                    <Row gutter={16}>
                                        <Col span={8}><Form.Item name={['metadata', 'rentalPeriod']} label="Period"><Select options={[{ value: 'hourly', label: 'Hourly' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        <Col span={8}><Form.Item name={['metadata', 'condition']} label="Condition"><Select options={[{ value: 'excellent', label: 'âœ¨ Excellent' }, { value: 'good', label: 'ðŸ‘ Good' }, { value: 'fair', label: 'ðŸ‘Œ Fair' }]} style={{ borderRadius: 10 }} /></Form.Item></Col>
                                        <Col span={8}><Form.Item name={['metadata', 'depositAmount']} label="Deposit"><InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} /></Form.Item></Col>
                                    </Row>
                                </>)}

                                <Form.Item name="tags" label="Tags">
                                    <Select mode="tags" style={{ borderRadius: 10 }} />
                                </Form.Item>
                            </Form>
                        </div>

                        <div style={{ padding: '0 28px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={() => { setEditModalOpen(false); editForm.resetFields(); }} style={{ borderRadius: 8 }}>Cancel</Button>
                            <Button type="primary" onClick={handleEditProduct} loading={editSaving}
                                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', borderRadius: 8, minWidth: 140 }}
                                icon={<EditOutlined />}>
                                Save Changes
                            </Button>
                        </div>
                    </>
                )}
            </Modal>

            {/* â•â•â• Product Detail Drawer â•â•â• */}
            <Drawer
                title={null}
                open={!!detailDrawer}
                onClose={() => setDetailDrawer(null)}
                size={480}
                styles={{ body: { padding: 0 } }}
            >
                {detailDrawer && (() => {
                    const ft = SELLABLE_TYPES.find(t => t.value === detailDrawer.fulfillmentType);
                    const profit = (detailDrawer.sellingPrice || 0) - (detailDrawer.costPrice || 0);
                    const marginPct = (detailDrawer.costPrice || 0) > 0 ? ((profit / (detailDrawer.costPrice || 1)) * 100) : 0;
                    return (
                        <div>
                            {/* Hero Header */}
                            <div style={{ padding: '24px 24px 16px', background: `linear-gradient(135deg, ${ft?.color || '#6366f1'}08, ${ft?.color || '#6366f1'}03)`, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` }}>
                                <div className="flex items-center gap-4 mb-3">
                                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${ft?.color || '#6366f1'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                                        {ft?.icon || 'ðŸ“¦'}
                                    </div>
                                    <div className="flex-1">
                                        <Title level={4} className="!m-0">{detailDrawer.name}</Title>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Text type="secondary" code className="text-xs">{detailDrawer.sku || 'No SKU'}</Text>
                                            <Tag color={STATUS_COLORS[detailDrawer.status || 'active']} className="rounded-full text-xs m-0">{detailDrawer.status}</Tag>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Tag color={ft?.color || 'blue'} className="rounded-full">{ft?.label || detailDrawer.fulfillmentType}</Tag>
                                    {detailDrawer.brand && <Tag className="rounded-full">ðŸ·ï¸ {detailDrawer.brand}</Tag>}
                                    {(detailDrawer.tags || []).map((t: string) => <Tag key={t} className="rounded-full text-xs">{t}</Tag>)}
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px 24px' }}>
                                {/* Price Summary */}
                                <Row gutter={10} style={{ marginBottom: 16 }}>
                                    <Col span={8}>
                                        <Card size="small" style={{ borderRadius: 10, textAlign: 'center', background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Cost</Text>
                                            <Text strong style={{ fontSize: 14 }}>{fmtCurrency(detailDrawer.costPrice)}</Text>
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small" style={{ borderRadius: 10, textAlign: 'center', background: isDark ? 'rgba(99,102,241,0.08)' : '#f0f0ff' }}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Sell</Text>
                                            <Text strong style={{ fontSize: 14, color: themeColor }}>{fmtCurrency(detailDrawer.sellingPrice)}</Text>
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small" style={{ borderRadius: 10, textAlign: 'center', background: profit >= 0 ? (isDark ? 'rgba(34,197,94,0.08)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2') }}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Margin</Text>
                                            <Text strong style={{ fontSize: 14, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                                                {(detailDrawer.costPrice || 0) > 0 ? `${marginPct.toFixed(0)}%` : 'â€”'}
                                            </Text>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Details */}
                                <Descriptions column={2} size="small" bordered style={{ borderRadius: 10, marginBottom: 16 }}>
                                    <Descriptions.Item label="Type">{detailDrawer.itemType || 'â€”'}</Descriptions.Item>
                                    <Descriptions.Item label="Tax">{detailDrawer.taxRate || 0}%</Descriptions.Item>
                                    <Descriptions.Item label="Currency">{detailDrawer.currency || 'IDR'}</Descriptions.Item>
                                    <Descriptions.Item label="UOM">{detailDrawer.primaryUom || 'â€”'}</Descriptions.Item>
                                </Descriptions>

                                {detailDrawer.description && (
                                    <Card size="small" style={{ borderRadius: 10, background: '#fafafa', marginBottom: 16 }}>
                                        <Text type="secondary" className="text-xs uppercase tracking-wider block mb-1">Description</Text>
                                        <Paragraph className="!mb-0" style={{ fontSize: 13 }}>{detailDrawer.description}</Paragraph>
                                    </Card>
                                )}

                                {/* Type-specific metadata display */}
                                {detailDrawer.metadata && Object.keys(detailDrawer.metadata).length > 0 && (
                                    <Card size="small" style={{ borderRadius: 10, background: `${ft?.color || '#6366f1'}05`, border: `1px solid ${ft?.color || '#6366f1'}15`, marginBottom: 16 }}>
                                        <Text type="secondary" className="text-xs uppercase tracking-wider block mb-2">
                                            {detailDrawer.fulfillmentType === 'ticket' ? 'ðŸŽ« Event Info' : detailDrawer.fulfillmentType === 'scheduled' ? 'ðŸ—“ï¸ Route Info' : detailDrawer.fulfillmentType === 'rental' ? 'ðŸ”‘ Rental Info' : 'ðŸ“‹ Details'}
                                        </Text>
                                        <Descriptions column={2} size="small">
                                            {detailDrawer.metadata.venue && <Descriptions.Item label="Venue">{detailDrawer.metadata.venue}</Descriptions.Item>}
                                            {detailDrawer.metadata.eventDate && <Descriptions.Item label="Date">{detailDrawer.metadata.eventDate}</Descriptions.Item>}
                                            {detailDrawer.metadata.capacity && <Descriptions.Item label="Capacity">{detailDrawer.metadata.capacity}</Descriptions.Item>}
                                            {detailDrawer.metadata.origin && <Descriptions.Item label="Route">{detailDrawer.metadata.origin} â†’ {detailDrawer.metadata.destination}</Descriptions.Item>}
                                            {detailDrawer.metadata.durationMinutes && <Descriptions.Item label="Duration">{detailDrawer.metadata.durationMinutes} min</Descriptions.Item>}
                                            {detailDrawer.metadata.vehicleName && <Descriptions.Item label="Vehicle">{detailDrawer.metadata.vehicleName}</Descriptions.Item>}
                                            {detailDrawer.metadata.rentalPeriod && <Descriptions.Item label="Period"><Tag className="rounded-full text-xs capitalize">{detailDrawer.metadata.rentalPeriod}</Tag></Descriptions.Item>}
                                            {detailDrawer.metadata.depositAmount && <Descriptions.Item label="Deposit">{fmtCurrency(detailDrawer.metadata.depositAmount)}</Descriptions.Item>}
                                            {detailDrawer.metadata.condition && <Descriptions.Item label="Condition"><Tag className="rounded-full text-xs capitalize">{detailDrawer.metadata.condition}</Tag></Descriptions.Item>}
                                            {detailDrawer.metadata.seatSections?.length > 0 && <Descriptions.Item label="Sections" span={2}>{detailDrawer.metadata.seatSections.map((s: string) => <Tag key={s} className="rounded-full text-xs">{s}</Tag>)}</Descriptions.Item>}
                                        </Descriptions>
                                    </Card>
                                )}

                                <Divider style={{ margin: '12px 0' }} />
                                <div className="flex gap-2 flex-wrap">
                                    <Button type="primary" icon={<EditOutlined />} onClick={() => { setDetailDrawer(null); openEditModal(detailDrawer); }}
                                        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', borderRadius: 8 }}>Edit Product</Button>
                                    <Button icon={<CopyOutlined />} onClick={() => { handleDuplicate(detailDrawer); setDetailDrawer(null); }}
                                        style={{ borderRadius: 8 }}>Duplicate</Button>
                                    <Button onClick={() => { setDetailDrawer(null); router.push('/admin/inventory/items'); }}
                                        style={{ borderRadius: 8 }}>Open in Item Master</Button>
                                    <Popconfirm title="Delete this product permanently?" onConfirm={() => handleDelete(detailDrawer.id)}>
                                        <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>Delete</Button>
                                    </Popconfirm>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Drawer>
        </CMSLayout>
    );
}




