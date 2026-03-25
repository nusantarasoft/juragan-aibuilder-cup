"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Tag, Input, Select, Modal, Form, Card,
    Statistic, Typography, message, Empty, Spin, Tabs, Tooltip,
    Drawer, Descriptions, Segmented, Badge, Row, Col, Popconfirm,
    InputNumber, Divider, Switch, Steps
} from "antd";
import {
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    DropboxOutlined, ShoppingCartOutlined, CalendarOutlined,
    SwapOutlined, TagOutlined, BarcodeOutlined, AppstoreOutlined,
    UnorderedListOutlined, FilterOutlined, ReloadOutlined,
    RobotOutlined, ThunderboltOutlined, BoxPlotOutlined,
    ScheduleOutlined, ShoppingOutlined, ToolOutlined,
    ExportOutlined, ImportOutlined, EyeOutlined,
    CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
    DollarOutlined, InboxOutlined, SafetyCertificateOutlined
} from "@ant-design/icons";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TooltipWrapper as AnimatedTooltip } from "@/components/mvpblocks/AnimatedTooltip";
import { inventoryService, InvItem, InvCategory, InvStockStats, AiClassification } from "@/lib/inventoryService";

const { Title, Text, Paragraph } = Typography;

const FULFILLMENT_TYPES = [
    { value: 'physical', label: 'Physical Goods', icon: <DropboxOutlined />, color: '#7c3aed', desc: 'Tangible products with stock tracking', example: 'Laptop, T-shirt, Bolt' },
    { value: 'ticket', label: 'Ticket / Event', icon: <TagOutlined />, color: '#f59e0b', desc: 'One-time events with capacity & seats', example: 'Concert, Museum entry' },
    { value: 'scheduled', label: 'Scheduled Service', icon: <ScheduleOutlined />, color: '#0ea5e9', desc: 'Recurring routes with timetables', example: 'Ship route, Bus line' },
    { value: 'rental', label: 'Rental Asset', icon: <SwapOutlined />, color: '#10b981', desc: 'Items rented out & returned', example: 'Camera, Projector, Vehicle' },
];

const ITEM_TYPES = [
    { value: 'goods', label: 'Goods' },
    { value: 'service', label: 'Service' },
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'finished_good', label: 'Finished Good' },
    { value: 'semi_finished', label: 'Semi-Finished' },
    { value: 'consumable', label: 'Consumable' },
];

const STATUS_COLORS: Record<string, string> = {
    active: 'green', draft: 'orange', archived: 'default',
};

const WIZARD_STEPS = [
    { title: 'Type', icon: <AppstoreOutlined /> },
    { title: 'Details', icon: <EditOutlined /> },
    { title: 'Pricing', icon: <DollarOutlined /> },
    { title: 'Inventory', icon: <InboxOutlined /> },
    { title: 'Review', icon: <CheckCircleOutlined /> },
];

export default function ItemMasterPage() {
    const [items, setItems] = useState<InvItem[]>([]);
    const [categories, setCategories] = useState<InvCategory[]>([]);
    const [stats, setStats] = useState<InvStockStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filterFulfillment, setFilterFulfillment] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Modal
    const [formOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvItem | null>(null);
    const [detailDrawer, setDetailDrawer] = useState<InvItem | null>(null);
    const [aiClassifying, setAiClassifying] = useState(false);
    const [aiResult, setAiResult] = useState<AiClassification | null>(null);
    const [wizardStep, setWizardStep] = useState(0);
    const [selectedFulfillment, setSelectedFulfillment] = useState('physical');
    const [form] = Form.useForm();

    // Category modal
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryForm] = Form.useForm();

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [itemsData, catsData, statsData] = await Promise.all([
                inventoryService.getItems(),
                inventoryService.getCategories(),
                inventoryService.getStockStats(),
            ]);
            setItems(itemsData);
            setCategories(catsData);
            setStats(statsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        let filtered = items;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            filtered = filtered.filter(i =>
                i.name.toLowerCase().includes(s) ||
                i.sku?.toLowerCase().includes(s) ||
                i.description?.toLowerCase().includes(s)
            );
        }
        if (filterFulfillment) filtered = filtered.filter(i => i.fulfillmentType === filterFulfillment);
        if (filterStatus) filtered = filtered.filter(i => i.status === filterStatus);
        return filtered;
    }, [items, searchTerm, filterFulfillment, filterStatus]);

    const handleCreate = () => {
        setEditingItem(null);
        setAiResult(null);
        setWizardStep(0);
        setSelectedFulfillment('physical');
        form.resetFields();
        form.setFieldsValue({ fulfillmentType: 'physical', itemType: 'goods', status: 'active', currency: 'IDR', primaryUom: 'pcs' });
        setFormOpen(true);
    };

    const handleEdit = (item: InvItem) => {
        setEditingItem(item);
        setAiResult(null);
        setWizardStep(1); // skip type selection when editing
        setSelectedFulfillment(item.fulfillmentType || 'physical');
        form.setFieldsValue(item);
        setFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deleteItem(id);
            message.success("Item deleted");
            loadAll();
        } catch { message.error("Failed to delete"); }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingItem) {
                await inventoryService.updateItem(editingItem.id, values);
                message.success("Item updated");
            } else {
                await inventoryService.createItem('default', values);
                message.success("Item created");
            }
            setFormOpen(false);
            loadAll();
        } catch { message.error("Validation failed"); }
    };

    const handleAiClassify = async () => {
        const name = form.getFieldValue('name');
        const desc = form.getFieldValue('description');
        if (!name) { message.warning("Enter item name first"); return; }
        setAiClassifying(true);
        try {
            const result = await inventoryService.aiClassifyItem(name, desc);
            setAiResult(result);
            // Auto-fill suggestions
            if (result.suggestedItemType) form.setFieldValue('itemType', result.suggestedItemType);
            if (result.suggestedFulfillmentType) form.setFieldValue('fulfillmentType', result.suggestedFulfillmentType);
            if (result.suggestedTags?.length) form.setFieldValue('tags', result.suggestedTags);
            message.success(`AI classified with ${result.confidence}% confidence`);
        } catch { message.error("AI classification failed"); }
        finally { setAiClassifying(false); }
    };

    const handleCreateCategory = async () => {
        try {
            const values = await categoryForm.validateFields();
            await inventoryService.createCategory('default', values);
            message.success("Category created");
            setCategoryModalOpen(false);
            categoryForm.resetFields();
            loadAll();
        } catch { message.error("Failed to create category"); }
    };

    // ─── Table Columns ──────────────────────────────────

    const columns = [
        {
            title: 'Item',
            key: 'name',
            sorter: (a: InvItem, b: InvItem) => a.name.localeCompare(b.name),
            render: (_: any, r: InvItem) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ background: `${FULFILLMENT_TYPES.find(f => f.value === r.fulfillmentType)?.color || '#7c3aed'}15` }}>
                        {FULFILLMENT_TYPES.find(f => f.value === r.fulfillmentType)?.icon || <DropboxOutlined />}
                    </div>
                    <div>
                        <Text strong className="block text-sm cursor-pointer hover:text-violet-500"
                            onClick={() => setDetailDrawer(r)}>{r.name}</Text>
                        <Text type="secondary" className="text-xs">{r.sku}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Type',
            key: 'fulfillmentType',
            width: 140,
            render: (_: any, r: InvItem) => {
                const ft = FULFILLMENT_TYPES.find(f => f.value === r.fulfillmentType);
                return <Tag color={ft?.color} className="rounded-full text-xs px-2">{ft?.label || r.fulfillmentType}</Tag>;
            },
        },
        {
            title: 'Category',
            key: 'category',
            width: 140,
            render: (_: any, r: InvItem) => {
                const cat = categories.find(c => c.id === r.categoryId);
                return cat ? <Tag className="rounded-full text-xs">{cat.name}</Tag> : <Text type="secondary" className="text-xs">-</Text>;
            },
        },
        {
            title: 'Cost',
            dataIndex: 'costPrice',
            width: 120,
            sorter: (a: InvItem, b: InvItem) => (a.costPrice || 0) - (b.costPrice || 0),
            render: (v: number, r: InvItem) => <Text className="text-xs font-medium">{(r.currency || 'IDR')} {(v || 0).toLocaleString()}</Text>,
        },
        {
            title: 'Sell Price',
            dataIndex: 'sellingPrice',
            width: 120,
            sorter: (a: InvItem, b: InvItem) => (a.sellingPrice || 0) - (b.sellingPrice || 0),
            render: (v: number, r: InvItem) => <Text className="text-xs font-medium text-green-600">{(r.currency || 'IDR')} {(v || 0).toLocaleString()}</Text>,
        },
        {
            title: 'UOM',
            dataIndex: 'primaryUom',
            width: 80,
            render: (v: string) => <Text className="text-xs">{v || '-'}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 90,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'} className="rounded-full text-xs">{v}</Tag>,
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            render: (_: any, r: InvItem) => (
                <Space size={4}>
                    <AnimatedTooltip content="View">
                        <Button type="text" size="small" icon={<EyeOutlined />}
                            className="text-gray-400 hover:text-violet-500"
                            onClick={() => setDetailDrawer(r)} />
                    </AnimatedTooltip>
                    <AnimatedTooltip content="Edit">
                        <Button type="text" size="small" icon={<EditOutlined />}
                            className="text-gray-400 hover:text-blue-500"
                            onClick={() => handleEdit(r)} />
                    </AnimatedTooltip>
                    <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(r.id)}>
                        <AnimatedTooltip content="Delete">
                            <Button type="text" size="small" icon={<DeleteOutlined />}
                                className="text-gray-400 hover:text-red-500" />
                        </AnimatedTooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ─── Stats Cards ────────────────────────────────────

    const statsCards = [
        { title: 'Total Items', value: stats?.totalItems || 0, icon: <DropboxOutlined />, color: '#7c3aed' },
        { title: 'Physical', value: stats?.physicalCount || 0, icon: <BoxPlotOutlined />, color: '#7c3aed' },
        { title: 'Tickets', value: stats?.ticketCount || 0, icon: <TagOutlined />, color: '#f59e0b' },
        { title: 'Scheduled', value: stats?.scheduledCount || 0, icon: <ScheduleOutlined />, color: '#0ea5e9' },
        { title: 'Rental', value: stats?.rentalCount || 0, icon: <SwapOutlined />, color: '#10b981' },
        { title: 'Low Stock', value: stats?.lowStockCount || 0, icon: <ThunderboltOutlined />, color: '#ef4444' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#9333ea", "#7c3aed", "#6366f1", "#00ffff", "#ff00ff"]}>Item Master</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Unified registry for physical goods, services, tickets, schedules, and rental items"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential
                />
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    {statsCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={{
                                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.5)', borderRadius: 12,
                                }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <Text type="secondary" className="text-xs block">{s.title}</Text>
                                            <Text strong className="text-lg">{s.value}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Toolbar */}
                <Card size="small" style={{
                    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.5)', borderRadius: 12,
                }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                                prefix={<SearchOutlined className="text-gray-400" />}
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                allowClear
                                style={{ maxWidth: 280, borderRadius: 8 }}
                            />
                            <Select
                                placeholder="Fulfillment"
                                value={filterFulfillment || undefined}
                                onChange={v => setFilterFulfillment(v || '')}
                                allowClear
                                style={{ width: 160 }}
                                options={[{ value: '', label: 'All Types' }, ...FULFILLMENT_TYPES]}
                            />
                            <Select
                                placeholder="Status"
                                value={filterStatus || undefined}
                                onChange={v => setFilterStatus(v || '')}
                                allowClear
                                style={{ width: 120 }}
                                options={[
                                    { value: '', label: 'All' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'archived', label: 'Archived' },
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Segmented
                                size="small"
                                value={viewMode}
                                onChange={v => setViewMode(v as 'table' | 'grid')}
                                options={[
                                    { value: 'table', icon: <UnorderedListOutlined /> },
                                    { value: 'grid', icon: <AppstoreOutlined /> },
                                ]}
                            />
                            <AnimatedTooltip content="Reload">
                                <Button icon={<ReloadOutlined />} onClick={loadAll} />
                            </AnimatedTooltip>
                            <AnimatedTooltip content="New Category">
                                <Button icon={<AppstoreOutlined />} onClick={() => setCategoryModalOpen(true)} />
                            </AnimatedTooltip>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', borderRadius: 8, border: 'none' }}>
                                New Item
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Table / Grid */}
                <Card size="small" style={{
                    flex: 1, minHeight: 0, borderRadius: 12,
                    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                }}>
                    {viewMode === 'table' ? (
                        <Table
                            dataSource={filteredItems}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
                            size="small"
                            scroll={{ x: 900 }}
                        />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: 4 }}>
                            {loading ? <Spin className="col-span-full flex justify-center py-20" /> :
                                filteredItems.length === 0 ? <Empty className="col-span-full py-20" description="No items found" /> :
                                    filteredItems.map((item, i) => {
                                        const ft = FULFILLMENT_TYPES.find(f => f.value === item.fulfillmentType);
                                        return (
                                            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                                                <Card size="small" hoverable className="rounded-xl cursor-pointer" onClick={() => setDetailDrawer(item)}
                                                    style={{ borderColor: `${ft?.color || '#7c3aed'}30` }}>
                                                    <div className="flex items-start gap-3 mb-2">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                            style={{ background: `${ft?.color || '#7c3aed'}15`, fontSize: 18 }}>
                                                            {ft?.icon || <DropboxOutlined />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <Text strong className="block text-sm truncate">{item.name}</Text>
                                                            <Text type="secondary" className="text-xs">{item.sku}</Text>
                                                        </div>
                                                        <Tag color={STATUS_COLORS[item.status || 'active']} className="rounded-full text-xs">{item.status}</Tag>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Text className="text-xs">{item.currency} {(item.sellingPrice || 0).toLocaleString()}</Text>
                                                        <Tag color={ft?.color} className="rounded-full text-xs m-0">{ft?.label}</Tag>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
                        </div>
                    )}
                </Card>
            </div>

            {/* ═══ Wizard Modal ═══ */}
            <Modal
                title={null}
                open={formOpen}
                onCancel={() => setFormOpen(false)}
                footer={null}
                width={780}
                closable={false}
                centered
                styles={{ body: { padding: 0 } }}
            >
                {/* Drawer Header */}
                <div style={{ padding: '20px 28px 0', borderBottom: '1px solid #f0f0f0', paddingBottom: 20 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <Title level={4} className="!m-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {editingItem ? 'Edit Item' : 'Create New Item'}
                            </Title>
                            <Text type="secondary" className="text-xs">{WIZARD_STEPS[wizardStep]?.title} — Step {wizardStep + 1} of {WIZARD_STEPS.length}</Text>
                        </div>
                        <Button type="text" onClick={() => setFormOpen(false)} style={{ fontSize: 18 }}>✕</Button>
                    </div>
                    <Steps current={wizardStep} size="small" onChange={s => { if (editingItem || s < wizardStep) setWizardStep(s); }}
                        items={WIZARD_STEPS.map(s => ({ title: s.title, icon: s.icon }))}
                    />
                </div>

                {/* Step Content */}
                <div style={{ maxHeight: '55vh', overflow: 'auto', padding: '24px 28px' }}>
                    <Form form={form} layout="vertical" size="middle">
                        <AnimatePresence mode="wait">
                            {/* ── Step 0: Type Selection ── */}
                            {wizardStep === 0 && (
                                <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                                    <Text strong className="text-base block mb-1">What kind of item are you creating?</Text>
                                    <Text type="secondary" className="text-xs block mb-5">Choose the fulfillment model that best describes this item.</Text>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        {FULFILLMENT_TYPES.map((ft, i) => {
                                            const isActive = selectedFulfillment === ft.value;
                                            return (
                                                <motion.div key={ft.value} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                                    <Card
                                                        hoverable
                                                        onClick={() => { setSelectedFulfillment(ft.value); form.setFieldValue('fulfillmentType', ft.value); }}
                                                        style={{
                                                            borderRadius: 16, cursor: 'pointer', transition: 'all 0.25s',
                                                            border: isActive ? `2px solid ${ft.color}` : '2px solid #f0f0f0',
                                                            background: isActive ? `${ft.color}08` : '#fff',
                                                            boxShadow: isActive ? `0 4px 20px ${ft.color}20` : 'none',
                                                        }}
                                                        styles={{ body: { padding: '20px' } }}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div style={{
                                                                width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 22, background: `${ft.color}${isActive ? '20' : '10'}`, color: ft.color, transition: 'all 0.25s',
                                                            }}>
                                                                {ft.icon}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Text strong className="text-sm">{ft.label}</Text>
                                                                    {isActive && <CheckCircleOutlined style={{ color: ft.color, fontSize: 14 }} />}
                                                                </div>
                                                                <Text type="secondary" className="text-xs block mb-2">{ft.desc}</Text>
                                                                <Tag className="rounded-full text-xs" style={{ color: ft.color, borderColor: `${ft.color}40`, background: `${ft.color}08` }}>
                                                                    e.g. {ft.example}
                                                                </Tag>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                    <Form.Item name="fulfillmentType" hidden><Input /></Form.Item>
                                </motion.div>
                            )}

                            {/* ── Step 1: Details ── */}
                            {wizardStep === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                                    <Text strong className="text-base block mb-1">Item Details</Text>
                                    <Text type="secondary" className="text-xs block mb-5">Give your item a name, description, and let AI help classify it.</Text>

                                    <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Item name is required' }]}>
                                        <Input placeholder={selectedFulfillment === 'physical' ? 'e.g. MacBook Pro 14" M3' : selectedFulfillment === 'ticket' ? 'e.g. Concert VIP Ticket' : selectedFulfillment === 'scheduled' ? 'e.g. Jakarta → Surabaya Ferry' : 'e.g. Canon EOS R5 Camera'}
                                            size="large" style={{ borderRadius: 10 }}
                                            suffix={<Button type="link" icon={<RobotOutlined />} loading={aiClassifying} onClick={handleAiClassify} style={{ color: '#7c3aed', padding: 0 }}>AI Classify</Button>}
                                        />
                                    </Form.Item>

                                    {aiResult && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                            <Card size="small" className="mb-4" style={{ background: 'linear-gradient(135deg, #faf5ff, #f0f0ff)', borderColor: '#d8b4fe', borderRadius: 12 }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7c3aed15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <RobotOutlined style={{ color: '#7c3aed', fontSize: 14 }} />
                                                    </div>
                                                    <Text strong className="text-xs" style={{ color: '#7c3aed' }}>AI Suggestion · {aiResult.confidence}% confidence</Text>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    <Tag color="purple" className="rounded-full">{aiResult.suggestedCategory}</Tag>
                                                    <Tag color="blue" className="rounded-full">{aiResult.suggestedItemType}</Tag>
                                                    <Tag color="green" className="rounded-full">{aiResult.suggestedFulfillmentType}</Tag>
                                                    {aiResult.suggestedTags.map(t => <Tag key={t} className="text-xs rounded-full">{t}</Tag>)}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    )}

                                    <Form.Item name="description" label="Description">
                                        <Input.TextArea rows={3} placeholder="Describe this item in detail..." style={{ borderRadius: 10 }} />
                                    </Form.Item>

                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="itemType" label="Item Type">
                                                <Select options={ITEM_TYPES} style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="categoryId" label="Category">
                                                <Select allowClear placeholder="Select category"
                                                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                                                    dropdownRender={menu => (<>{menu}<Divider className="my-1" /><Button type="link" icon={<PlusOutlined />} onClick={() => setCategoryModalOpen(true)} className="w-full text-left text-xs">Create category</Button></>)}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="brand" label="Brand">
                                                <Input placeholder="Brand name" style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="tags" label="Tags">
                                                <Select mode="tags" placeholder="Add tags..." style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </motion.div>
                            )}

                            {/* ── Step 2: Pricing ── */}
                            {wizardStep === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                                    <Text strong className="text-base block mb-1">Pricing & Cost</Text>
                                    <Text type="secondary" className="text-xs block mb-5">
                                        {selectedFulfillment === 'rental' ? 'Set the daily/period rate and deposit for this rental item.' : selectedFulfillment === 'ticket' ? 'Set ticket pricing by section or tier.' : 'Set cost and selling prices for this item.'}
                                    </Text>

                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="costPrice" label={<span><DollarOutlined className="mr-1" />Cost Price</span>}>
                                                <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} size="large" placeholder="0"
                                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="sellingPrice" label={<span><DollarOutlined className="mr-1" />{selectedFulfillment === 'rental' ? 'Daily Rate' : 'Selling Price'}</span>}>
                                                <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} size="large" placeholder="0"
                                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Form.Item name="currency" label="Currency">
                                                <Select size="large" options={[{ value: 'IDR', label: '🇮🇩 IDR' }, { value: 'USD', label: '🇺🇸 USD' }, { value: 'EUR', label: '🇪🇺 EUR' }, { value: 'SGD', label: '🇸🇬 SGD' }]} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="taxRate" label="Tax Rate (%)">
                                                <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 10 }} size="large" placeholder="11" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            {selectedFulfillment === 'rental' && (
                                                <Form.Item name="metadata.depositAmount" label="Deposit Amount">
                                                    <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} size="large" placeholder="0"
                                                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/,/g, '') as any} />
                                                </Form.Item>
                                            )}
                                        </Col>
                                    </Row>

                                    {/* Margin indicator */}
                                    <Card size="small" style={{ borderRadius: 12, background: '#f9fafb', marginTop: 8 }}>
                                        <div className="flex items-center justify-between">
                                            <Text type="secondary" className="text-xs">💡 Profit Margin</Text>
                                            <Text strong className="text-sm" style={{ color: '#10b981' }}>
                                                {(() => { const c = form.getFieldValue('costPrice') || 0; const s = form.getFieldValue('sellingPrice') || 0; return c > 0 ? `${(((s - c) / c) * 100).toFixed(1)}%` : '—'; })()}
                                            </Text>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {/* ── Step 3: Inventory ── */}
                            {wizardStep === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                                    <Text strong className="text-base block mb-1">
                                        {selectedFulfillment === 'physical' ? 'Stock & Inventory' : selectedFulfillment === 'ticket' ? 'Capacity & Tracking' : selectedFulfillment === 'scheduled' ? 'Schedule & Capacity' : 'Asset Tracking'}
                                    </Text>
                                    <Text type="secondary" className="text-xs block mb-5">
                                        {selectedFulfillment === 'physical' ? 'Configure SKU, unit of measure, and reorder thresholds.' : selectedFulfillment === 'ticket' ? 'Set up capacity limits and ticket tracking.' : selectedFulfillment === 'scheduled' ? 'Define schedule capacity and booking limits.' : 'Configure individual asset tracking and maintenance.'}
                                    </Text>

                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="sku" label={<span><BarcodeOutlined className="mr-1" />SKU</span>}>
                                                <Input size="large" placeholder="Auto-generated if empty" style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="barcode" label={<span><BarcodeOutlined className="mr-1" />Barcode</span>}>
                                                <Input size="large" placeholder="EAN-13, Code-128" style={{ borderRadius: 10 }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Form.Item name="primaryUom" label="Unit of Measure">
                                                <Select size="large" options={
                                                    selectedFulfillment === 'physical' ? [{ value: 'pcs', label: 'Pieces' }, { value: 'kg', label: 'Kilogram' }, { value: 'ltr', label: 'Liter' }, { value: 'box', label: 'Box' }, { value: 'unit', label: 'Unit' }]
                                                    : selectedFulfillment === 'ticket' ? [{ value: 'ticket', label: 'Ticket' }, { value: 'seat', label: 'Seat' }, { value: 'pass', label: 'Pass' }]
                                                    : selectedFulfillment === 'scheduled' ? [{ value: 'seat', label: 'Seat' }, { value: 'cabin', label: 'Cabin' }, { value: 'ticket', label: 'Ticket' }]
                                                    : [{ value: 'unit', label: 'Unit' }, { value: 'day', label: 'Day' }, { value: 'hour', label: 'Hour' }]
                                                } />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="reorderPoint" label={selectedFulfillment === 'physical' ? 'Reorder Point' : 'Min Capacity Alert'}>
                                                <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} size="large" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="status" label="Status">
                                                <Select size="large" options={[{ value: 'active', label: '🟢 Active' }, { value: 'draft', label: '🟡 Draft' }, { value: 'archived', label: '⚪ Archived' }]} />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    {selectedFulfillment === 'physical' && (
                                        <>
                                            <Divider className="my-3" />
                                            <Text strong className="text-xs text-gray-400 uppercase tracking-wider block mb-3">Physical Dimensions</Text>
                                            <Row gutter={16}>
                                                <Col span={8}>
                                                    <Form.Item name="weight" label="Weight">
                                                        <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="0" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={8}>
                                                    <Form.Item name="weightUnit" label="Weight Unit">
                                                        <Select options={[{ value: 'kg', label: 'Kilogram' }, { value: 'g', label: 'Gram' }, { value: 'lb', label: 'Pound' }]} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={8}>
                                                    <Form.Item name="reorderQty" label="Reorder Quantity">
                                                        <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Step 4: Review ── */}
                            {wizardStep === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                                    <Text strong className="text-base block mb-1">Review & Confirm</Text>
                                    <Text type="secondary" className="text-xs block mb-5">Double-check all details before {editingItem ? 'updating' : 'creating'} this item.</Text>

                                    {(() => {
                                        const v = form.getFieldsValue(true);
                                        const ft = FULFILLMENT_TYPES.find(f => f.value === selectedFulfillment);
                                        const cat = categories.find(c => c.id === v.categoryId);
                                        return (
                                            <div className="space-y-4">
                                                {/* Header card */}
                                                <Card style={{ borderRadius: 14, border: `2px solid ${ft?.color || '#7c3aed'}20`, background: `${ft?.color || '#7c3aed'}05` }}>
                                                    <div className="flex items-center gap-4">
                                                        <div style={{ width: 56, height: 56, borderRadius: 14, background: `${ft?.color}15`, color: ft?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                                            {ft?.icon}
                                                        </div>
                                                        <div className="flex-1">
                                                            <Title level={4} className="!m-0">{v.name || 'Untitled Item'}</Title>
                                                            <div className="flex gap-2 mt-1">
                                                                <Tag color={ft?.color} className="rounded-full">{ft?.label}</Tag>
                                                                {v.itemType && <Tag className="rounded-full">{v.itemType}</Tag>}
                                                                {cat && <Tag className="rounded-full">{cat.name}</Tag>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {v.description && <Paragraph className="mt-3 mb-0 text-sm text-gray-500">{v.description}</Paragraph>}
                                                </Card>

                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <Card size="small" style={{ borderRadius: 12 }}>
                                                            <Text type="secondary" className="text-xs uppercase tracking-wider block mb-2">Pricing</Text>
                                                            <Descriptions column={1} size="small">
                                                                <Descriptions.Item label="Cost">{v.currency} {(v.costPrice || 0).toLocaleString()}</Descriptions.Item>
                                                                <Descriptions.Item label="Sell">{v.currency} {(v.sellingPrice || 0).toLocaleString()}</Descriptions.Item>
                                                                <Descriptions.Item label="Tax">{v.taxRate || 0}%</Descriptions.Item>
                                                            </Descriptions>
                                                        </Card>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Card size="small" style={{ borderRadius: 12 }}>
                                                            <Text type="secondary" className="text-xs uppercase tracking-wider block mb-2">Tracking</Text>
                                                            <Descriptions column={1} size="small">
                                                                <Descriptions.Item label="SKU">{v.sku || 'Auto-generated'}</Descriptions.Item>
                                                                <Descriptions.Item label="UOM">{v.primaryUom}</Descriptions.Item>
                                                                <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[v.status]} className="rounded-full text-xs">{v.status}</Tag></Descriptions.Item>
                                                            </Descriptions>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Form>
                </div>

                {/* Footer Navigation */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
                        disabled={wizardStep === 0} style={{ borderRadius: 10 }}>Back</Button>
                    <div className="flex items-center gap-2">
                        {wizardStep < 4 ? (
                            <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => {
                                if (wizardStep === 1) {
                                    form.validateFields(['name']).then(() => setWizardStep(wizardStep + 1)).catch(() => {});
                                } else { setWizardStep(wizardStep + 1); }
                            }}
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', border: 'none', borderRadius: 10, minWidth: 120 }}>
                                Continue
                            </Button>
                        ) : (
                            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit} size="large"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, minWidth: 160 }}>
                                {editingItem ? 'Update Item' : 'Create Item'}
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Category Modal */}
            <Modal title="Create Category" open={categoryModalOpen} onCancel={() => setCategoryModalOpen(false)} onOk={handleCreateCategory} okText="Create">
                <Form form={categoryForm} layout="vertical">
                    <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Electronics, Raw Materials" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="parentId" label="Parent Category">
                        <Select allowClear placeholder="None (top-level)"
                            options={categories.map(c => ({ value: c.id, label: c.name }))} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Drawer */}
            <Drawer
                title={detailDrawer?.name}
                open={!!detailDrawer}
                onClose={() => setDetailDrawer(null)}
                width={480}
            >
                {detailDrawer && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                                style={{
                                    background: `${FULFILLMENT_TYPES.find(f => f.value === detailDrawer.fulfillmentType)?.color || '#7c3aed'}15`,
                                    color: FULFILLMENT_TYPES.find(f => f.value === detailDrawer.fulfillmentType)?.color || '#7c3aed',
                                }}>
                                {FULFILLMENT_TYPES.find(f => f.value === detailDrawer.fulfillmentType)?.icon || <DropboxOutlined />}
                            </div>
                            <div>
                                <Title level={4} className="!m-0">{detailDrawer.name}</Title>
                                <Text type="secondary">{detailDrawer.sku}</Text>
                            </div>
                        </div>

                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Fulfillment">
                                <Tag color={FULFILLMENT_TYPES.find(f => f.value === detailDrawer.fulfillmentType)?.color}>
                                    {FULFILLMENT_TYPES.find(f => f.value === detailDrawer.fulfillmentType)?.label}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Item Type">{detailDrawer.itemType}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={STATUS_COLORS[detailDrawer.status || 'active']}>{detailDrawer.status}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="UOM">{detailDrawer.primaryUom}</Descriptions.Item>
                            <Descriptions.Item label="Cost Price">{detailDrawer.currency} {(detailDrawer.costPrice || 0).toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Selling Price">{detailDrawer.currency} {(detailDrawer.sellingPrice || 0).toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Barcode">{detailDrawer.barcode || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Brand">{detailDrawer.brand || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Category">
                                {categories.find(c => c.id === detailDrawer.categoryId)?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tax Rate">{detailDrawer.taxRate || 0}%</Descriptions.Item>
                            <Descriptions.Item label="Reorder Point">{detailDrawer.reorderPoint || 0}</Descriptions.Item>
                            <Descriptions.Item label="Min Stock">{detailDrawer.minStock || 0}</Descriptions.Item>
                        </Descriptions>

                        {detailDrawer.description && (
                            <>
                                <Divider className="my-3" />
                                <Text strong className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Description</Text>
                                <Paragraph>{detailDrawer.description}</Paragraph>
                            </>
                        )}

                        <Divider className="my-3" />
                        <div className="flex gap-2">
                            <Button icon={<EditOutlined />} onClick={() => { setDetailDrawer(null); handleEdit(detailDrawer); }}>Edit</Button>
                            <Popconfirm title="Delete this item?" onConfirm={() => { handleDelete(detailDrawer.id); setDetailDrawer(null); }}>
                                <Button danger icon={<DeleteOutlined />}>Delete</Button>
                            </Popconfirm>
                        </div>
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
