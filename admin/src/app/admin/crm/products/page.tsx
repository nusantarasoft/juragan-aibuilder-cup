"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    InputNumber, Statistic, Switch,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, ShoppingOutlined,
    DollarOutlined, CheckCircleOutlined, AppstoreOutlined,, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const { TextArea } = Input;

interface Product {
    id: string; name: string; code: string; description: string;
    unitPrice: number; currency: string; category: string;
    isActive: boolean; createdAt: string;
}

const CATEGORIES = ["Software", "Hardware", "Service", "Subscription", "Consulting", "Support", "Other"];

const PRODUCT_FIELDS: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Product Code" },
    { name: "unitPrice", label: "Unit Price", required: true },
    { name: "category", label: "Category" },
    { name: "isActive", label: "Active" },
    { name: "description", label: "Description" },
];

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Product | null>(null);

    const fmt = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v) : '$0.00';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($tenantId: String!, $search: String) { products(tenantId: $tenantId, search: $search) { id name code description unitPrice currency category isActive createdAt } }`, { tenantId: DEFAULT_TENANT_ID, search: search || null });
            setProducts(data.products || []);
        } catch (err: any) { message.error("Failed: " + err.message); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input = { name: values.name, code: values.code || null, description: values.description || null, unitPrice: values.unitPrice, currency: values.currency || 'USD', category: values.category || null };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateProductInput!) { updateProduct(id: $id, input: $input) { id } }`, { id: editing.id, input: { ...input, isActive: values.isActive } });
                message.success("Updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateProductInput!) { createProduct(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try { await gql(`mutation($tenantId: String!, $input: CreateProductInput!) { createProduct(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input: { name: r.name, code: r.code || null, description: r.description || null, unitPrice: r.unitPrice || 0, currency: r.currency || 'USD', category: r.category || null } }); success++; }
            catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadData(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => { await gql(`mutation($id: String!) { deleteProduct(id: $id) }`, { id }); message.success("Deleted"); loadData(); };

    const activeProducts = products.filter(p => p.isActive);
    const avgPrice = activeProducts.length ? activeProducts.reduce((s, p) => s + p.unitPrice, 0) / activeProducts.length : 0;

    const columns: ColumnsType<Product> = [
        { title: "Product", key: "name", render: (_, r) => <div><Text strong>{r.name}</Text>{r.code && <><br /><Text type="secondary" code>{r.code}</Text></>}</div>, sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: "Price", key: "price", width: 120, align: "right", render: (_, r) => <Text strong>{fmt(r.unitPrice)}</Text>, sorter: (a, b) => a.unitPrice - b.unitPrice },
        { title: "Category", key: "cat", width: 120, render: (_, r) => r.category ? <Tag>{r.category}</Tag> : 'â€”' },
        { title: "Status", key: "active", width: 90, render: (_, r) => <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Tag> },
        { title: "Actions", key: "actions", width: 130, render: (_, r) => (<Space>
            <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ name: r.name, code: r.code, description: r.description, unitPrice: r.unitPrice, category: r.category, isActive: r.isActive }); setIsModalOpen(true); }} /></Tooltip>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
        </Space>) },
    ];

    const formSteps = [
        { title: "Product Info", icon: <ShoppingOutlined />, fields: ["name", "code", "unitPrice", "category"], content: (<><Row gutter={16}><Col span={16}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={8}><Form.Item name="code" label="Product Code"><Input placeholder="e.g., SKU-001" /></Form.Item></Col></Row><Row gutter={16}><Col span={8}><Form.Item name="unitPrice" label="Unit Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="$" min={0} /></Form.Item></Col><Col span={8}><Form.Item name="category" label="Category"><Select allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Form.Item></Col>{editing && <Col span={8}><Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>}</Row></>) },
        { title: "Description", icon: <AppstoreOutlined />, fields: ["description", "isActive"], content: (<Form.Item name="description" label="Description"><TextArea rows={4} /></Form.Item>) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Products</AuroraText>}
            subTitle={<DecryptedText text="Product catalog for quotes and deals" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>Add Product</Button>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}><Card style={{ ...glass }}><Statistic title="Total Products" value={products.length} prefix={<ShoppingOutlined />} /></Card></Col>
                <Col span={8}><Card style={{ ...glass }}><Statistic title="Active" value={activeProducts.length} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={8}><Card style={{ ...glass }}><Statistic title="Avg Price" value={avgPrice} prefix={<DollarOutlined />} precision={2} formatter={v => fmt(Number(v))} /></Card></Col>
            </Row>
            <Card style={{ ...glass, marginBottom: 16 }}><Input prefix={<SearchOutlined />} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300 }} allowClear /></Card>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}><Table columns={columns} dataSource={products.map(p => ({ ...p, key: p.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>

            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? "Edit Product" : "Add Product"} entityName="product" steps={formSteps} fields={PRODUCT_FIELDS} width={600} onBatchCreate={handleBatchCreate} gradient={["#ec4899", "#f43f5e"]} editMode={!!editing} />

            <Drawer title="Product Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={450}>
                {selected && (<Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
                    <Descriptions.Item label="Code">{selected.code || 'â€”'}</Descriptions.Item>
                    <Descriptions.Item label="Price"><Text strong>{fmt(selected.unitPrice)}</Text></Descriptions.Item>
                    <Descriptions.Item label="Category">{selected.category || 'â€”'}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={selected.isActive ? 'green' : 'default'}>{selected.isActive ? 'Active' : 'Inactive'}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Description">{selected.description || 'â€”'}</Descriptions.Item>
                </Descriptions>)}
            </Drawer>
        </CMSLayout>
    );
}


