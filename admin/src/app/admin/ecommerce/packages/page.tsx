"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Space, Button, Tooltip, Row, Col, Drawer, message, Modal, Select, Form, InputNumber, Divider } from "antd";
import { GiftOutlined, SearchOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, MinusCircleOutlined, ShoppingOutlined, EditOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService, EcomPackage, EcomPackageItem, EcomPackageStatsType } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import ItemPicker from "@/components/inventory/ItemPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

const PACKAGE_FIELDS: FieldDef[] = [
    { name: 'name', label: 'Package Name', required: true },
    { name: 'sku', label: 'SKU' },
    { name: 'status', label: 'Status' },
    { name: 'description', label: 'Description' },
    { name: 'packagePrice', label: 'Package Price', type: 'number', required: true },
    { name: 'regularPrice', label: 'Regular Price', type: 'number' },
    { name: 'notes', label: 'Notes' },
];

export default function PackagesPage() {
    const [stats, setStats] = useState<EcomPackageStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const [packages, setPackages] = useState<EcomPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [selected, setSelected] = useState<EcomPackage | null>(null);
    const [pkgItems, setPkgItems] = useState<EcomPackageItem[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [lineItems, setLineItems] = useState<{ key: number; itemId?: string; itemName: string; itemSku?: string; quantity: number; unitPrice: number }[]>([]);
    const [lineKey, setLineKey] = useState(0);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [s, p] = await Promise.all([
                inventoryService.getEcomPackageStats(),
                inventoryService.getEcomPackages(),
            ]);
            setStats(s);
            setPackages(p);
        } catch (err) { console.error(err); message.error("Failed to load packages"); } finally { setLoading(false); }
    };

    const viewPackage = async (pkg: EcomPackage) => {
        setSelected(pkg);
        setDrawerOpen(true);
        try {
            const items = await inventoryService.getEcomPackageItems(pkg.id);
            setPkgItems(items);
        } catch { setPkgItems([]); }
    };

    const handleDelete = async (id: string) => {
        try { await inventoryService.deleteEcomPackage(id); message.success("Package deleted"); load(); }
        catch { message.error("Failed to delete"); }
    };

    const openNew = () => { setEditMode(false); form.resetFields(); setLineItems([]); setLineKey(0); setModalOpen(true); };

    const openEdit = (pkg: EcomPackage) => {
        setEditMode(true);
        setSelected(pkg);
        form.setFieldsValue({ name: pkg.name, sku: pkg.sku, description: pkg.description, packagePrice: pkg.packagePrice, regularPrice: pkg.regularPrice, savings: pkg.savings, status: pkg.status, notes: pkg.notes });
        setLineItems([]);
        setModalOpen(true);
    };

    const addLine = () => { const k = lineKey + 1; setLineKey(k); setLineItems(p => [...p, { key: k, itemName: '', quantity: 1, unitPrice: 0 }]); };
    const removeLine = (k: number) => setLineItems(p => p.filter(l => l.key !== k));
    const updateLine = (k: number, u: any) => setLineItems(p => p.map(l => l.key !== k ? l : { ...l, ...u }));

    const calcRegular = () => lineItems.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

    const handleSave = async (values: any) => {
        setSaving(true);
        try {
            const regular = values.regularPrice || calcRegular();
            const pkg = values.packagePrice || 0;
            const input = {
                name: values.name, sku: values.sku, description: values.description,
                packagePrice: pkg, regularPrice: regular, savings: regular - pkg,
                notes: values.notes, status: values.status || 'active',
                items: lineItems.map(l => ({ itemId: l.itemId, itemName: l.itemName, itemSku: l.itemSku, quantity: l.quantity, unitPrice: l.unitPrice })),
            };
            if (editMode && selected) {
                await inventoryService.updateEcomPackage(selected.id, input as any);
                message.success('Package updated');
            } else {
                await inventoryService.createEcomPackage('default', input as any);
                message.success('Package created');
            }
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
            try { await inventoryService.createEcomPackage('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.name || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        load();
        return { success, failed, errors };
    };

    const kpiCards = [
        { title: 'Total Packages', value: stats?.totalPackages || 0, icon: <GiftOutlined />, color: themeColor },
        { title: 'Active', value: stats?.active || 0, icon: <CheckCircleOutlined />, color: '#10b981' },
        { title: 'Inactive', value: stats?.inactive || 0, icon: <GiftOutlined />, color: '#94a3b8' },
        { title: 'Total Sold', value: stats?.totalSold || 0, icon: <ShoppingOutlined />, color: '#3b82f6' },
        { title: 'Total Savings', value: fmtCurrency(stats?.totalSavings), icon: <DollarOutlined />, color: '#f59e0b' },
    ];

    const filtered = packages.filter(p => {
        if (statusFilter && p.status !== statusFilter) return false;
        if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const columns = [
        { title: 'Package', dataIndex: 'name', render: (v: string, r: EcomPackage) => (<div><Text strong className="text-sm">{v}</Text>{r.sku && <Text type="secondary" className="text-xs block">{r.sku}</Text>}</div>) },
        { title: 'Package Price', dataIndex: 'packagePrice', width: 140, render: (v: number) => <Text strong style={{ color: themeColor }}>{fmtCurrency(v)}</Text> },
        { title: 'Regular Price', dataIndex: 'regularPrice', width: 140, render: (v: number) => <Text type="secondary" style={{ textDecoration: 'line-through' }}>{fmtCurrency(v)}</Text> },
        { title: 'Savings', dataIndex: 'savings', width: 120, render: (v: number) => <Tag color="green" className="rounded-full">{fmtCurrency(v)}</Tag> },
        { title: 'Sold', dataIndex: 'timesSold', width: 70, render: (v: number) => v || 0 },
        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: '', key: 'actions', width: 130, render: (_: any, r: EcomPackage) => (
            <Space size="small">
                <Button size="small" icon={<EyeOutlined />} onClick={() => viewPackage(r)} />
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete package?', onOk: () => handleDelete(r.id) })} />
            </Space>
        )},
    ];

    const packageSteps = [
        {
            title: "Package Info",
            fields: ["name", "sku", "status", "description"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="name" label="Package Name" rules={[{ required: true }]}><Input placeholder="e.g. Snorkeling Adventure Bundle" /></Form.Item></Col>
                        <Col span={6}><Form.Item name="sku" label="SKU"><Input placeholder="PKG-XXX" /></Form.Item></Col>
                        <Col span={6}><Form.Item name="status" label="Status" initialValue="active">
                            <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} placeholder="Package description..." /></Form.Item>
                </>
            ),
        },
        {
            title: "Pricing",
            fields: ["packagePrice", "regularPrice", "notes"],
            content: (
                <Row gutter={16}>
                    <Col span={8}><Form.Item name="packagePrice" label="Package Price" rules={[{ required: true }]}><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="regularPrice" label="Regular Price"><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="notes" label="Notes"><Input.TextArea rows={1} /></Form.Item></Col>
                </Row>
            ),
        },
        {
            title: "Items",
            fields: [],
            content: (
                <>
                    {!editMode && (
                        <div style={{ marginBottom: 12 }}>
                            {lineItems.map(l => (
                                <div key={l.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                    <div style={{ flex: 3 }}>
                                        <ItemPicker onItemSelect={(item) => { if (item) updateLine(l.key, { itemId: item.id, itemName: item.name, itemSku: item.sku, unitPrice: item.sellingPrice || item.costPrice || 0 }); }} />
                                    </div>
                                    <InputNumber min={1} value={l.quantity} onChange={v => updateLine(l.key, { quantity: v || 1 })} style={{ width: 70 }} />
                                    <InputNumber min={0} value={l.unitPrice} onChange={v => updateLine(l.key, { unitPrice: v || 0 })} style={{ width: 120 }} prefix="Rp" />
                                    <span style={{ width: 100, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmtCurrency(l.quantity * l.unitPrice)}</span>
                                    <Button size="small" type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeLine(l.key)} />
                                </div>
                            ))}
                            <Button type="dashed" onClick={addLine} icon={<PlusOutlined />} style={{ width: '100%' }}>Add Item</Button>
                            {lineItems.length > 0 && (
                                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, color: themeColor }}>
                                    Regular Total: {fmtCurrency(calcRegular())}
                                </div>
                            )}
                        </div>
                    )}
                    {editMode && <Text type="secondary">Items cannot be edited here. View the package drawer for current items.</Text>}
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Packages</AuroraText>}
            subTitle={<DecryptedText text="Bundle products into packages with special pricing" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={Math.floor(24 / kpiCards.length)}>
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
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search packages..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} size="small"
                                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}
                                style={{ background: 'linear-gradient(135deg, var(--theme-color, #8b5cf6), #a78bfa)', border: 'none', borderRadius: 8 }}>
                                New Package
                            </Button>
                        </Space>
                    </div>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} packages` }} scroll={{ x: 900 }} />
                </Card>
            </div>

            {/* Detail Drawer */}
            <Drawer title={`Package: ${selected?.name || ''}`} open={drawerOpen} onClose={() => setDrawerOpen(false)}
                width={520} styles={{ body: { padding: 16 } }}>
                {selected && (
                    <div className="space-y-4">
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Row gutter={16}>
                                <Col span={8}><Text type="secondary" className="text-xs block">Package Price</Text><Text strong style={{ color: themeColor, fontSize: 18 }}>{fmtCurrency(selected.packagePrice)}</Text></Col>
                                <Col span={8}><Text type="secondary" className="text-xs block">Regular Price</Text><Text style={{ textDecoration: 'line-through' }}>{fmtCurrency(selected.regularPrice)}</Text></Col>
                                <Col span={8}><Text type="secondary" className="text-xs block">Savings</Text><Tag color="green">{fmtCurrency(selected.savings)}</Tag></Col>
                            </Row>
                            {selected.description && <Text className="text-sm block mt-2">{selected.description}</Text>}
                        </Card>
                        <Card size="small" title="Package Contents" style={{ borderRadius: 10 }}>
                            <Table dataSource={pkgItems} rowKey="id" size="small" pagination={false}
                                columns={[
                                    { title: 'Item', dataIndex: 'itemName', render: (v: string) => <Text strong className="text-sm">{v}</Text> },
                                    { title: 'SKU', dataIndex: 'itemSku', width: 100, render: (v: string) => <Text code className="text-xs">{v || '—'}</Text> },
                                    { title: 'Qty', dataIndex: 'quantity', width: 50 },
                                    { title: 'Unit Price', dataIndex: 'unitPrice', width: 120, render: (v: number) => fmtCurrency(v) },
                                ]}
                            />
                        </Card>
                    </div>
                )}
            </Drawer>

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditMode(false); form.resetFields(); setLineItems([]); }}
                onSubmit={handleSave}
                form={form}
                title={editMode ? "Edit Package" : "New Package"}
                entityName="package"
                steps={packageSteps}
                fields={PACKAGE_FIELDS}
                loading={saving}
                onBatchCreate={handleBatchCreate}
                gradient={["var(--theme-color, #8b5cf6)", "#a78bfa"]}
                editMode={editMode}
            />
        </CMSLayout>
    );
}
