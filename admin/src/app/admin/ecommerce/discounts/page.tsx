"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Space, Button, Tooltip, Row, Col, message, Modal, Select, Form, InputNumber, Switch, DatePicker } from "antd";
import { PercentageOutlined, SearchOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, PlusOutlined, EditOutlined, CopyOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService, EcomDiscount, EcomDiscountStatsType } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";

const { Text } = Typography;
const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

const DISCOUNT_FIELDS: FieldDef[] = [
    { name: 'name', label: 'Discount Name', required: true },
    { name: 'code', label: 'Coupon Code' },
    { name: 'status', label: 'Status' },
    { name: 'description', label: 'Description' },
    { name: 'discountType', label: 'Discount Type' },
    { name: 'discountValue', label: 'Discount Value', type: 'number', required: true },
    { name: 'minOrderAmount', label: 'Min Order Amount', type: 'number' },
    { name: 'maxDiscountAmount', label: 'Max Discount', type: 'number' },
    { name: 'validFrom', label: 'Valid From', type: 'date' },
    { name: 'validUntil', label: 'Valid Until', type: 'date' },
    { name: 'usageLimit', label: 'Usage Limit', type: 'number' },
    { name: 'appliesTo', label: 'Applies To' },
    { name: 'autoApply', label: 'Auto-Apply', type: 'boolean' },
    { name: 'stackable', label: 'Stackable', type: 'boolean' },
    { name: 'notes', label: 'Notes' },
];

export default function DiscountsPage() {
    const [stats, setStats] = useState<EcomDiscountStatsType | null>(null);
    const [discounts, setDiscounts] = useState<EcomDiscount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [modalOpen, setModalOpen] = useState(false);
    const [editDiscount, setEditDiscount] = useState<EcomDiscount | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [s, d] = await Promise.all([
                inventoryService.getEcomDiscountStats(),
                inventoryService.getEcomDiscounts(),
            ]);
            setStats(s);
            setDiscounts(d);
        } catch (err) { console.error(err); message.error("Failed to load discounts"); } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        try { await inventoryService.deleteEcomDiscount(id); message.success("Discount deleted"); load(); }
        catch { message.error("Failed"); }
    };

    const openNew = () => { setEditDiscount(null); form.resetFields(); setModalOpen(true); };

    const openEdit = (d: EcomDiscount) => {
        setEditDiscount(d);
        form.setFieldsValue({
            ...d,
            validFrom: d.validFrom ? dayjs(d.validFrom) : undefined,
            validUntil: d.validUntil ? dayjs(d.validUntil) : undefined,
        });
        setModalOpen(true);
    };

    const generateCode = () => {
        const code = 'SAVE' + Math.random().toString(36).substring(2, 8).toUpperCase();
        form.setFieldsValue({ code });
    };

    const handleSave = async (values: any) => {
        setSaving(true);
        try {
            const input = {
                code: values.code, name: values.name, description: values.description,
                discountType: values.discountType, discountValue: values.discountValue,
                minOrderAmount: values.minOrderAmount, maxDiscountAmount: values.maxDiscountAmount,
                usageLimit: values.usageLimit,
                validFrom: values.validFrom?.toISOString?.() || values.validFrom,
                validUntil: values.validUntil?.toISOString?.() || values.validUntil,
                autoApply: values.autoApply || false,
                appliesTo: values.appliesTo,
                stackable: values.stackable || false,
                notes: values.notes, status: values.status || 'active',
            };
            if (editDiscount) {
                await inventoryService.updateEcomDiscount(editDiscount.id, input as any);
                message.success('Discount updated');
            } else {
                await inventoryService.createEcomDiscount('default', input as any);
                message.success('Discount created');
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
            try { await inventoryService.createEcomDiscount('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.name || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        load();
        return { success, failed, errors };
    };

    const kpiCards = [
        { title: 'Total Discounts', value: stats?.totalDiscounts || 0, icon: <PercentageOutlined />, color: '#10b981' },
        { title: 'Active', value: stats?.active || 0, icon: <CheckCircleOutlined />, color: '#3b82f6' },
        { title: 'Coupons', value: stats?.coupons || 0, icon: <CopyOutlined />, color: '#8b5cf6' },
        { title: 'Auto-Apply', value: stats?.autoApply || 0, icon: <ThunderboltOutlined />, color: '#f59e0b' },
        { title: 'Expired', value: stats?.expired || 0, icon: <ClockCircleOutlined />, color: '#94a3b8' },
        { title: 'Total Used', value: stats?.totalUsed || 0, icon: <DollarOutlined />, color: '#ef4444' },
    ];

    const filtered = discounts.filter(d => {
        if (statusFilter && d.status !== statusFilter) return false;
        if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const columns = [
        { title: 'Discount', key: 'name', render: (_: any, r: EcomDiscount) => (
            <div>
                <Text strong className="text-sm">{r.name}</Text>
                {r.code && <div><Tag color="purple" className="text-xs mt-1">{r.code}</Tag></div>}
            </div>
        )},
        { title: 'Type', key: 'type', width: 130,
            render: (_: any, r: EcomDiscount) => (
                <Text strong style={{ color: '#10b981' }}>
                    {r.discountType === 'percentage' ? `${r.discountValue}% off` : fmtCurrency(r.discountValue) + ' off'}
                </Text>
            ),
        },
        { title: 'Min Order', dataIndex: 'minOrderAmount', width: 130, render: (v: number) => v ? fmtCurrency(v) : '—' },
        { title: 'Uses', key: 'uses', width: 100,
            render: (_: any, r: EcomDiscount) => <Text>{r.timesUsed || 0}{r.usageLimit ? ` / ${r.usageLimit}` : ''}</Text> },
        { title: 'Valid Until', dataIndex: 'validUntil', width: 120,
            render: (v: string) => v ? new Date(v).toLocaleDateString() : '∞' },
        { title: 'Features', key: 'features', width: 140,
            render: (_: any, r: EcomDiscount) => (
                <Space size={4}>
                    {r.autoApply && <Tag color="orange" className="text-xs">Auto</Tag>}
                    {r.stackable && <Tag color="cyan" className="text-xs">Stackable</Tag>}
                    {r.code && <Tag color="purple" className="text-xs">Coupon</Tag>}
                </Space>
            ),
        },
        { title: 'Status', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'expired' ? 'volcano' : 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: '', key: 'actions', width: 100,
            render: (_: any, r: EcomDiscount) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: 'Delete discount?', onOk: () => handleDelete(r.id) })} />
                </Space>
            ),
        },
    ];

    const discountSteps = [
        {
            title: "Basic Info",
            fields: ["name", "code", "status", "description"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={10}><Form.Item name="name" label="Discount Name" rules={[{ required: true }]}><Input placeholder="e.g. New Customer Discount" /></Form.Item></Col>
                        <Col span={8}>
                            <Form.Item name="code" label="Coupon Code">
                                <Input placeholder="SAVE20" addonAfter={<Button type="link" size="small" onClick={generateCode} style={{ padding: 0, height: 'auto' }}>Generate</Button>} />
                            </Form.Item>
                        </Col>
                        <Col span={6}><Form.Item name="status" label="Status" initialValue="active">
                            <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={1} placeholder="Discount details..." /></Form.Item>
                </>
            ),
        },
        {
            title: "Discount Rules",
            fields: ["discountType", "discountValue", "minOrderAmount", "maxDiscountAmount"],
            content: (
                <Row gutter={16}>
                    <Col span={6}><Form.Item name="discountType" label="Discount Type" initialValue="percentage">
                        <Select options={[{ value: 'percentage', label: 'Percentage' }, { value: 'fixed_amount', label: 'Fixed Amount' }]} />
                    </Form.Item></Col>
                    <Col span={6}><Form.Item name="discountValue" label="Value" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item></Col>
                    <Col span={6}><Form.Item name="minOrderAmount" label="Min Order"><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item name="maxDiscountAmount" label="Max Discount"><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                </Row>
            ),
        },
        {
            title: "Validity & Options",
            fields: ["validFrom", "validUntil", "usageLimit", "appliesTo", "autoApply", "stackable", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="validFrom" label="Valid From"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="validUntil" label="Valid Until"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={4}><Form.Item name="usageLimit" label="Usage Limit"><InputNumber min={0} style={{ width: '100%' }} placeholder="0=∞" /></Form.Item></Col>
                        <Col span={4}><Form.Item name="appliesTo" label="Applies To" initialValue="order">
                            <Select options={[{ value: 'order', label: 'Order' }, { value: 'item', label: 'Item' }, { value: 'shipping', label: 'Shipping' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}><Form.Item name="autoApply" label="Auto-Apply" valuePropName="checked"><Switch /></Form.Item></Col>
                        <Col span={6}><Form.Item name="stackable" label="Stackable" valuePropName="checked"><Switch /></Form.Item></Col>
                        <Col span={12}><Form.Item name="notes" label="Notes"><Input.TextArea rows={1} /></Form.Item></Col>
                    </Row>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#10b981", "#059669", "#34d399", "#00ffff", "#ff00ff"]}>Discounts</AuroraText>}
            subTitle={<DecryptedText text="Manage discount codes, coupons, and auto-apply rules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
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
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search discounts or codes..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 260, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} size="small"
                                options={[{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'inactive', label: 'Inactive' }]} />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8 }}>
                                New Discount
                            </Button>
                        </Space>
                    </div>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} discounts` }} scroll={{ x: 1000 }} />
                </Card>
            </div>

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditDiscount(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editDiscount ? "Edit Discount" : "New Discount"}
                entityName="discount"
                steps={discountSteps}
                fields={DISCOUNT_FIELDS}
                loading={saving}
                onBatchCreate={handleBatchCreate}
                gradient={["#10b981", "#059669"]}
                editMode={!!editDiscount}
            />
        </CMSLayout>
    );
}
