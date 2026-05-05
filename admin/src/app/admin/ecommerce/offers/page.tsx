"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Space, Button, Tooltip, Row, Col, message, Modal, Select, Form, InputNumber, DatePicker } from "antd";
import { TagOutlined, SearchOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, PlusOutlined, EditOutlined, ThunderboltOutlined, FireOutlined, PercentageOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { inventoryService, EcomOffer, EcomOfferStatsType } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";

const { Text } = Typography;
const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

const OFFER_TYPES = [
    { value: 'flash_sale', label: 'Flash Sale' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'clearance', label: 'Clearance' },
    { value: 'bundle_deal', label: 'Bundle Deal' },
    { value: 'bogo', label: 'Buy One Get One' },
    { value: 'limited_time', label: 'Limited Time' },
];

const OFFER_TYPE_COLORS: Record<string, string> = {
    flash_sale: 'red', seasonal: 'blue', clearance: 'orange',
    bundle_deal: 'purple', bogo: 'cyan', limited_time: 'magenta',
};

const OFFER_FIELDS: FieldDef[] = [
    { name: 'name', label: 'Offer Name', required: true },
    { name: 'offerType', label: 'Type', required: true },
    { name: 'status', label: 'Status' },
    { name: 'description', label: 'Description' },
    { name: 'discountType', label: 'Discount Type' },
    { name: 'discountValue', label: 'Discount Value', type: 'number', required: true },
    { name: 'minOrderAmount', label: 'Min Order Amount', type: 'number' },
    { name: 'maxUses', label: 'Max Uses', type: 'number' },
    { name: 'startDate', label: 'Start Date', type: 'date' },
    { name: 'endDate', label: 'End Date', type: 'date' },
    { name: 'appliesTo', label: 'Applies To' },
    { name: 'bannerText', label: 'Banner Text' },
    { name: 'badgeText', label: 'Badge Text' },
    { name: 'notes', label: 'Notes' },
];

export default function OffersPage() {
    const [stats, setStats] = useState<EcomOfferStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [offers, setOffers] = useState<EcomOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [modalOpen, setModalOpen] = useState(false);
    const [editOffer, setEditOffer] = useState<EcomOffer | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [s, o] = await Promise.all([
                inventoryService.getEcomOfferStats(),
                inventoryService.getEcomOffers(),
            ]);
            setStats(s);
            setOffers(o);
        } catch (err) { console.error(err); message.error("Failed to load offers"); } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        try { await inventoryService.deleteEcomOffer(id); message.success("Offer deleted"); load(); }
        catch { message.error("Failed"); }
    };

    const openNew = () => { setEditOffer(null); form.resetFields(); setModalOpen(true); };

    const openEdit = (o: EcomOffer) => {
        setEditOffer(o);
        form.setFieldsValue({
            ...o,
            startDate: o.startDate ? dayjs(o.startDate) : undefined,
            endDate: o.endDate ? dayjs(o.endDate) : undefined,
        });
        setModalOpen(true);
    };

    const handleSave = async (values: any) => {
        setSaving(true);
        try {
            const input = {
                name: values.name, description: values.description,
                offerType: values.offerType, discountType: values.discountType,
                discountValue: values.discountValue, minOrderAmount: values.minOrderAmount,
                maxUses: values.maxUses,
                startDate: values.startDate?.toISOString?.() || values.startDate,
                endDate: values.endDate?.toISOString?.() || values.endDate,
                appliesTo: values.appliesTo, bannerText: values.bannerText,
                badgeText: values.badgeText, notes: values.notes,
                status: values.status || 'draft',
            };
            if (editOffer) {
                await inventoryService.updateEcomOffer(editOffer.id, input as any);
                message.success('Offer updated');
            } else {
                await inventoryService.createEcomOffer('default', input as any);
                message.success('Offer created');
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
            try { await inventoryService.createEcomOffer('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.name || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        load();
        return { success, failed, errors };
    };

    const kpiCards = [
        { title: 'Total Offers', value: stats?.totalOffers || 0, icon: <TagOutlined />, color: '#ef4444' },
        { title: 'Active', value: stats?.active || 0, icon: <ThunderboltOutlined />, color: '#10b981' },
        { title: 'Draft', value: stats?.draft || 0, icon: <ClockCircleOutlined />, color: '#94a3b8' },
        { title: 'Expired', value: stats?.expired || 0, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'Total Uses', value: stats?.totalUses || 0, icon: <FireOutlined />, color: themeColor },
    ];

    const filtered = offers.filter(o => {
        if (statusFilter && o.status !== statusFilter) return false;
        if (search && !o.name?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const columns = [
        { title: 'Offer', dataIndex: 'name', render: (v: string, r: EcomOffer) => (
            <div>
                <Text strong className="text-sm">{v}</Text>
                {r.description && <Text type="secondary" className="text-xs block" style={{ maxWidth: 250 }}>{r.description.substring(0, 60)}{(r.description.length || 0) > 60 ? '...' : ''}</Text>}
            </div>
        )},
        { title: 'Type', dataIndex: 'offerType', width: 120,
            render: (v: string) => <Tag color={OFFER_TYPE_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v?.replace(/_/g, ' ') || '—'}</Tag> },
        { title: 'Discount', key: 'discount', width: 130,
            render: (_: any, r: EcomOffer) => (
                <Text strong style={{ color: '#ef4444' }}>
                    {r.discountType === 'percentage' ? `${r.discountValue}%` : fmtCurrency(r.discountValue)}
                </Text>
            ),
        },
        { title: 'Uses', key: 'uses', width: 100,
            render: (_: any, r: EcomOffer) => <Text>{r.currentUses || 0}{r.maxUses ? ` / ${r.maxUses}` : ''}</Text> },
        { title: 'Period', key: 'period', width: 180,
            render: (_: any, r: EcomOffer) => (
                <Text className="text-xs">
                    {r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'} → {r.endDate ? new Date(r.endDate).toLocaleDateString() : '∞'}
                </Text>
            ),
        },
        { title: 'Status', dataIndex: 'status', width: 100,
            render: (v: string) => {
                const colors: Record<string, string> = { active: 'green', draft: 'default', expired: 'volcano', paused: 'orange' };
                return <Tag color={colors[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag>;
            },
        },
        { title: '', key: 'actions', width: 100,
            render: (_: any, r: EcomOffer) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: 'Delete offer?', onOk: () => handleDelete(r.id) })} />
                </Space>
            ),
        },
    ];

    const offerSteps = [
        {
            title: "Basic Info",
            fields: ["name", "offerType", "status", "description"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="name" label="Offer Name" rules={[{ required: true }]}><Input placeholder="e.g. Summer Flash Sale" /></Form.Item></Col>
                        <Col span={6}><Form.Item name="offerType" label="Type" rules={[{ required: true }]}><Select options={OFFER_TYPES} /></Form.Item></Col>
                        <Col span={6}><Form.Item name="status" label="Status" initialValue="draft">
                            <Select options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} placeholder="Offer details..." /></Form.Item>
                </>
            ),
        },
        {
            title: "Discount & Limits",
            fields: ["discountType", "discountValue", "minOrderAmount", "maxUses"],
            content: (
                <Row gutter={16}>
                    <Col span={6}><Form.Item name="discountType" label="Discount Type" initialValue="percentage">
                        <Select options={[{ value: 'percentage', label: 'Percentage' }, { value: 'fixed_amount', label: 'Fixed Amount' }]} />
                    </Form.Item></Col>
                    <Col span={6}><Form.Item name="discountValue" label="Value" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item></Col>
                    <Col span={6}><Form.Item name="minOrderAmount" label="Min Order"><InputNumber min={0} prefix="Rp" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item name="maxUses" label="Max Uses"><InputNumber min={0} style={{ width: '100%' }} placeholder="0 = unlimited" /></Form.Item></Col>
                </Row>
            ),
        },
        {
            title: "Schedule & Display",
            fields: ["startDate", "endDate", "appliesTo", "bannerText", "badgeText", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="startDate" label="Start Date"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="endDate" label="End Date"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="appliesTo" label="Applies To" initialValue="all_products">
                            <Select options={[{ value: 'all_products', label: 'All Products' }, { value: 'specific_items', label: 'Specific Items' }, { value: 'category', label: 'Category' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="bannerText" label="Banner Text"><Input placeholder="e.g. 🔥 50% OFF!" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="badgeText" label="Badge Text"><Input placeholder="e.g. HOT DEAL" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="notes" label="Notes"><Input.TextArea rows={1} /></Form.Item></Col>
                    </Row>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#ef4444", "#f59e0b", "#f97316", "#ff6b6b", "#ff00ff"]}>Offers</AuroraText>}
            subTitle={<DecryptedText text="Create and manage promotional offers & flash sales" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
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
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search offers..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} size="small"
                                options={[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }]} />
                        </div>
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ecommerce_offers', title: 'eCommerce Offers', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'offerType' }, { header: 'Discount', key: 'discountValue' }, { header: 'Status', key: 'status' }], data: offers })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ecommerce_offers', title: 'eCommerce Offers', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'offerType' }, { header: 'Discount', key: 'discountValue' }, { header: 'Status', key: 'status' }], data: offers })} /></Tooltip></RbacGuard>
            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ecommerce_offers', title: 'eCommerce Offers', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'offerType' }, { header: 'Discount', key: 'discountValue' }, { header: 'Status', key: 'status' }], data: offers })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ecommerce_offers', title: 'eCommerce Offers', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'offerType' }, { header: 'Discount', key: 'discountValue' }, { header: 'Status', key: 'status' }], data: offers })} /></Tooltip></RbacGuard>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}
                                style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', border: 'none', borderRadius: 8 }}>
                                New Offer
                            </Button>
                        </Space>
                    </div>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} offers` }} scroll={{ x: 900 }} />
                </Card>
            </div>

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditOffer(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editOffer ? "Edit Offer" : "New Offer"}
                entityName="offer"
                steps={offerSteps}
                fields={OFFER_FIELDS}
                loading={saving}
                onBatchCreate={handleBatchCreate}
                gradient={["#ef4444", "#f97316"]}
                editMode={!!editOffer}
            />
        </CMSLayout>
    );
}
