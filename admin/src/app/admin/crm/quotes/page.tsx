"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    InputNumber, Statistic, DatePicker,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, FileTextOutlined,
    DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const { TextArea } = Input;

interface Quote {
    id: string; quoteNumber: string; name: string;
    dealId: string; accountId: string; contactId: string;
    status: string; subtotal: number; discountPercent: number;
    taxPercent: number; total: number; validUntil: string;
    description: string; dealName: string; accountName: string;
    contactName: string; createdAt: string;
}

const STATUSES = [
    { value: "draft", label: "Draft", color: "default" },
    { value: "presented", label: "Presented", color: "blue" },
    { value: "accepted", label: "Accepted", color: "green" },
    { value: "rejected", label: "Rejected", color: "red" },
    { value: "expired", label: "Expired", color: "orange" },
];

const QUOTE_FIELDS: FieldDef[] = [
    { name: "name", label: "Quote Name", required: true },
    { name: "discountPercent", label: "Discount %" },
    { name: "taxPercent", label: "Tax %" },
    { name: "validUntil", label: "Valid Until" },
    { name: "description", label: "Description" },
    { name: "status", label: "Status" },
];

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Quote | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Quote | null>(null);

    const fmt = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '$0';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($tenantId: String!, $status: String, $search: String) { quotes(tenantId: $tenantId, status: $status, search: $search) { id quoteNumber name dealId accountId contactId status subtotal discountPercent taxPercent total validUntil description dealName accountName contactName createdAt } }`, { tenantId: DEFAULT_TENANT_ID, status: statusFilter || null, search: search || null });
            setQuotes(data.quotes || []);
        } catch (err: any) { message.error("Failed: " + err.message); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                const input = { name: values.name, status: values.status || null, discountPercent: values.discountPercent || 0, taxPercent: values.taxPercent || 0, validUntil: values.validUntil?.format('YYYY-MM-DD') || null, description: values.description || null };
                await gql(`mutation($id: String!, $input: UpdateQuoteInput!) { updateQuote(id: $id, input: $input) { id } }`, { id: editing.id, input });
                message.success("Updated");
            } else {
                const input = { name: values.name, discountPercent: values.discountPercent || 0, taxPercent: values.taxPercent || 0, validUntil: values.validUntil?.format('YYYY-MM-DD') || null, description: values.description || null };
                await gql(`mutation($tenantId: String!, $input: CreateQuoteInput!) { createQuote(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try { await gql(`mutation($tenantId: String!, $input: CreateQuoteInput!) { createQuote(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input: { name: r.name, discountPercent: r.discountPercent || 0, taxPercent: r.taxPercent || 0, validUntil: r.validUntil || null, description: r.description || null } }); success++; }
            catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadData(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => { await gql(`mutation($id: String!) { deleteQuote(id: $id) }`, { id }); message.success("Deleted"); loadData(); };

    const totalValue = quotes.reduce((s, q) => s + (q.total || 0), 0);
    const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0);
    const draftCount = quotes.filter(q => q.status === 'draft').length;

    const columns: ColumnsType<Quote> = [
        { title: "#", dataIndex: "quoteNumber", key: "num", width: 110, render: v => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        { title: "Quote", key: "name", render: (_, r) => <div><Text strong>{r.name}</Text>{r.dealName && <><br /><Text type="secondary" style={{ fontSize: 12 }}>Deal: {r.dealName}</Text></>}</div> },
        { title: "Account", key: "account", width: 140, render: (_, r) => r.accountName || '—' },
        { title: "Total", key: "total", width: 120, align: "right", render: (_, r) => <Text strong>{fmt(r.total)}</Text>, sorter: (a, b) => (a.total || 0) - (b.total || 0) },
        { title: "Status", key: "status", width: 100, render: (_, r) => { const s = STATUSES.find(s => s.value === r.status); return <Tag color={s?.color}>{s?.label || r.status}</Tag>; } },
        { title: "Valid Until", key: "valid", width: 120, render: (_, r) => r.validUntil ? dayjs(r.validUntil).format('MMM D, YYYY') : '—' },
        { title: "Actions", key: "actions", width: 130, render: (_, r) => (<Space>
            <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ name: r.name, status: r.status, discountPercent: r.discountPercent, taxPercent: r.taxPercent, validUntil: r.validUntil ? dayjs(r.validUntil) : null, description: r.description }); setIsModalOpen(true); }} /></Tooltip>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete ${r.quoteNumber}?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
        </Space>) },
    ];

    const formSteps = [
        { title: "Quote Info", icon: <FileTextOutlined />, fields: ["name", "status", "discountPercent", "taxPercent"], content: (<><Form.Item name="name" label="Quote Name" rules={[{ required: true }]}><Input placeholder="e.g., Acme Corp — Enterprise Package" /></Form.Item><Row gutter={16}>{editing && <Col span={8}><Form.Item name="status" label="Status"><Select options={STATUSES} /></Form.Item></Col>}<Col span={8}><Form.Item name="discountPercent" label="Discount %"><InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" /></Form.Item></Col><Col span={8}><Form.Item name="taxPercent" label="Tax %"><InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" /></Form.Item></Col></Row></>) },
        { title: "Details", icon: <DollarOutlined />, fields: ["validUntil", "description"], content: (<><Form.Item name="validUntil" label="Valid Until"><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item></>) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Quotes</AuroraText>}
            subTitle={<DecryptedText text="Sales quotes and proposals" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>New Quote</Button>,
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'crm_quotes', title: 'CRM Quotes', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Quote #', key: 'quoteNumber' }, { header: 'Account', key: 'accountName' }, { header: 'Total', key: 'total' }, { header: 'Status', key: 'status' }], data: quotes })} /></Tooltip> <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'crm_quotes', title: 'CRM Quotes', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Quote #', key: 'quoteNumber' }, { header: 'Account', key: 'accountName' }, { header: 'Total', key: 'total' }, { header: 'Status', key: 'status' }], data: quotes })} /></Tooltip></RbacGuard>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}><Card style={{ ...glass }}><Statistic title="Total Value" value={totalValue} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} /></Card></motion.div></Col>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}><Card style={{ ...glass }}><Statistic title="Accepted" value={acceptedValue} prefix={<CheckCircleOutlined />} precision={0} valueStyle={{ color: '#52c41a' }} formatter={v => fmt(Number(v))} /></Card></motion.div></Col>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Card style={{ ...glass }}><Statistic title="Drafts" value={draftCount} prefix={<ClockCircleOutlined />} /></Card></motion.div></Col>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}><Card style={{ ...glass }}><Statistic title="Total Quotes" value={quotes.length} prefix={<FileTextOutlined />} /></Card></motion.div></Col>
            </Row>
            <Card style={{ ...glass, marginBottom: 16 }}><Space wrap>
                <Input prefix={<SearchOutlined />} placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 140 }} options={STATUSES} />
            </Space></Card>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}><Table scroll={{ x: 900 }} columns={columns} dataSource={quotes.map(q => ({ ...q, key: q.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>

            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? "Edit Quote" : "New Quote"} entityName="quote" steps={formSteps} fields={QUOTE_FIELDS} width={600} onBatchCreate={handleBatchCreate} gradient={["#0ea5e9", "#6366f1"]} editMode={!!editing} />

            <Drawer title="Quote Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (<Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Quote #"><Text code>{selected.quoteNumber}</Text></Descriptions.Item>
                    <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={STATUSES.find(s => s.value === selected.status)?.color}>{selected.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Subtotal">{fmt(selected.subtotal)}</Descriptions.Item>
                    <Descriptions.Item label="Discount">{selected.discountPercent || 0}%</Descriptions.Item>
                    <Descriptions.Item label="Tax">{selected.taxPercent || 0}%</Descriptions.Item>
                    <Descriptions.Item label="Total"><Text strong style={{ fontSize: 16 }}>{fmt(selected.total)}</Text></Descriptions.Item>
                    <Descriptions.Item label="Deal">{selected.dealName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Account">{selected.accountName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Contact">{selected.contactName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Valid Until">{selected.validUntil ? dayjs(selected.validUntil).format('MMM D, YYYY') : '—'}</Descriptions.Item>
                    <Descriptions.Item label="Description">{selected.description || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                </Descriptions>)}
            </Drawer>
        </CMSLayout>
    );
}



