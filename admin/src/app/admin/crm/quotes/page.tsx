"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    InputNumber, Statistic, DatePicker,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, FileTextOutlined,
    DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";

const { Text } = Typography;
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

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
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
            const data = await gql(`
                query($tenantId: String!, $status: String, $search: String) {
                    quotes(tenantId: $tenantId, status: $status, search: $search) {
                        id quoteNumber name dealId accountId contactId
                        status subtotal discountPercent taxPercent total
                        validUntil description dealName accountName contactName createdAt
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, status: statusFilter || null, search: search || null });
            setQuotes(data.quotes || []);
        } catch (err: any) { message.error("Failed: " + err.message); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        try {
            const v = await form.validateFields();
            if (editing) {
                const input = {
                    name: v.name, status: v.status || null,
                    discountPercent: v.discountPercent || 0,
                    taxPercent: v.taxPercent || 0,
                    validUntil: v.validUntil?.format('YYYY-MM-DD') || null,
                    description: v.description || null,
                };
                await gql(`mutation($id: String!, $input: UpdateQuoteInput!) { updateQuote(id: $id, input: $input) { id } }`, { id: editing.id, input });
                message.success("Updated");
            } else {
                const input = {
                    name: v.name,
                    discountPercent: v.discountPercent || 0,
                    taxPercent: v.taxPercent || 0,
                    validUntil: v.validUntil?.format('YYYY-MM-DD') || null,
                    description: v.description || null,
                };
                await gql(`mutation($tenantId: String!, $input: CreateQuoteInput!) { createQuote(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        await gql(`mutation($id: String!) { deleteQuote(id: $id) }`, { id });
        message.success("Deleted"); loadData();
    };

    const totalValue = quotes.reduce((s, q) => s + (q.total || 0), 0);
    const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0);
    const draftCount = quotes.filter(q => q.status === 'draft').length;

    const columns: ColumnsType<Quote> = [
        { title: "#", dataIndex: "quoteNumber", key: "num", width: 110, render: v => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        {
            title: "Quote", key: "name",
            render: (_, r) => <div><Text strong>{r.name}</Text>{r.dealName && <><br /><Text type="secondary" style={{ fontSize: 12 }}>Deal: {r.dealName}</Text></>}</div>,
        },
        { title: "Account", key: "account", width: 140, render: (_, r) => r.accountName || '—' },
        { title: "Total", key: "total", width: 120, align: "right", render: (_, r) => <Text strong>{fmt(r.total)}</Text>, sorter: (a, b) => (a.total || 0) - (b.total || 0) },
        { title: "Status", key: "status", width: 100, render: (_, r) => { const s = STATUSES.find(s => s.value === r.status); return <Tag color={s?.color}>{s?.label || r.status}</Tag>; } },
        { title: "Valid Until", key: "valid", width: 120, render: (_, r) => r.validUntil ? dayjs(r.validUntil).format('MMM D, YYYY') : '—' },
        {
            title: "Actions", key: "actions", width: 130,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r); form.setFieldsValue({
                            name: r.name, status: r.status,
                            discountPercent: r.discountPercent, taxPercent: r.taxPercent,
                            validUntil: r.validUntil ? dayjs(r.validUntil) : null,
                            description: r.description,
                        }); setIsModalOpen(true);
                    }} /></Tooltip>
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete ${r.quoteNumber}?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout title="Quotes" subTitle="Sales quotes and proposals" extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>New Quote</Button>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card><Statistic title="Total Value" value={totalValue} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} /></Card></Col>
                <Col span={6}><Card><Statistic title="Accepted" value={acceptedValue} prefix={<CheckCircleOutlined />} precision={0} valueStyle={{ color: '#52c41a' }} formatter={v => fmt(Number(v))} /></Card></Col>
                <Col span={6}><Card><Statistic title="Drafts" value={draftCount} prefix={<ClockCircleOutlined />} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total Quotes" value={quotes.length} prefix={<FileTextOutlined />} /></Card></Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 140 }} options={STATUSES} />
                </Space>
            </Card>

            <Card><Table columns={columns} dataSource={quotes.map(q => ({ ...q, key: q.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>

            <Modal title={editing ? "Edit Quote" : "New Quote"} open={isModalOpen} onOk={handleSave}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} okText={editing ? "Update" : "Create"} width={600}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Quote Name" rules={[{ required: true }]}><Input placeholder="e.g., Acme Corp — Enterprise Package" /></Form.Item>
                    <Row gutter={16}>
                        {editing && <Col span={8}><Form.Item name="status" label="Status"><Select options={STATUSES} /></Form.Item></Col>}
                        <Col span={8}><Form.Item name="discountPercent" label="Discount %"><InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="taxPercent" label="Tax %"><InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="validUntil" label="Valid Until"><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            <Drawer title="Quote Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (
                    <Descriptions column={1} bordered size="small">
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
                    </Descriptions>
                )}
            </Drawer>
        </CMSLayout>
    );
}
