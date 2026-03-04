"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    DatePicker, InputNumber, Statistic,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, RocketOutlined,
    DollarOutlined, CalendarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

interface Campaign {
    id: string; name: string; type: string; status: string;
    startDate: string; endDate: string;
    budget: number; actualCost: number; expectedRevenue: number;
    description: string; createdAt: string;
}

const TYPES = [
    { value: "email", label: "Email" },
    { value: "webinar", label: "Webinar" },
    { value: "event", label: "Event" },
    { value: "ad", label: "Ad" },
    { value: "social", label: "Social" },
    { value: "other", label: "Other" },
];

const STATUSES = [
    { value: "planned", label: "Planned", color: "blue" },
    { value: "active", label: "Active", color: "green" },
    { value: "completed", label: "Completed", color: "default" },
    { value: "cancelled", label: "Cancelled", color: "red" },
];

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Campaign | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Campaign | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!, $status: String, $search: String) {
                    campaigns(tenantId: $tenantId, status: $status, search: $search) {
                        id name type status startDate endDate
                        budget actualCost expectedRevenue description createdAt
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, status: statusFilter || null, search: search || null });
            setCampaigns(data.campaigns || []);
        } catch (err: any) { message.error("Failed to load: " + err.message); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const fmt = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '—';

    const handleSave = async () => {
        try {
            const v = await form.validateFields();
            const input = {
                name: v.name, type: v.type || null, status: v.status || 'planned',
                startDate: v.startDate?.format('YYYY-MM-DD') || null,
                endDate: v.endDate?.format('YYYY-MM-DD') || null,
                budget: v.budget || null, actualCost: v.actualCost || null,
                expectedRevenue: v.expectedRevenue || null,
                description: v.description || null,
            };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateCampaignInput!) { updateCampaign(id: $id, input: $input) { id } }`, { id: editing.id, input });
                message.success("Campaign updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateCampaignInput!) { createCampaign(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Campaign created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteCampaign(id: $id) }`, { id });
            message.success("Deleted"); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((s, c) => s + (c.actualCost || 0), 0);
    const activeCount = campaigns.filter(c => c.status === 'active').length;

    const columns: ColumnsType<Campaign> = [
        { title: "Campaign", key: "name", render: (_, r) => <div><Text strong>{r.name}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.type || 'General'}</Text></div> },
        { title: "Status", key: "status", width: 110, render: (_, r) => { const s = STATUSES.find(s => s.value === r.status); return <Tag color={s?.color}>{s?.label || r.status}</Tag>; } },
        { title: "Budget", key: "budget", width: 120, align: "right", render: (_, r) => fmt(r.budget) },
        { title: "Spent", key: "spent", width: 120, align: "right", render: (_, r) => fmt(r.actualCost) },
        { title: "Dates", key: "dates", width: 180, render: (_, r) => r.startDate ? `${dayjs(r.startDate).format('MMM D')} → ${r.endDate ? dayjs(r.endDate).format('MMM D') : 'Ongoing'}` : '—' },
        {
            title: "Actions", key: "actions", width: 130,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r); form.setFieldsValue({
                            name: r.name, type: r.type, status: r.status,
                            startDate: r.startDate ? dayjs(r.startDate) : null,
                            endDate: r.endDate ? dayjs(r.endDate) : null,
                            budget: r.budget, actualCost: r.actualCost,
                            expectedRevenue: r.expectedRevenue, description: r.description,
                        }); setIsModalOpen(true);
                    }} /></Tooltip>
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout title="Campaigns" subTitle="Marketing campaigns and outreach" extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>New Campaign</Button>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card><Statistic title="Total Budget" value={totalBudget} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total Spent" value={totalSpent} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} /></Card></Col>
                <Col span={6}><Card><Statistic title="Active" value={activeCount} prefix={<RocketOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total" value={campaigns.length} prefix={<CalendarOutlined />} /></Card></Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 150 }} options={STATUSES} />
                </Space>
            </Card>

            <Card><Table columns={columns} dataSource={campaigns.map(c => ({ ...c, key: c.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>

            <Modal title={editing ? "Edit Campaign" : "New Campaign"} open={isModalOpen} onOk={handleSave}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} okText={editing ? "Update" : "Create"} width={700}>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={16}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="type" label="Type"><Select allowClear options={TYPES} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="status" label="Status" initialValue="planned"><Select options={STATUSES} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="startDate" label="Start"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="endDate" label="End"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="budget" label="Budget"><InputNumber style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="actualCost" label="Actual Cost"><InputNumber style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="expectedRevenue" label="Expected Revenue"><InputNumber style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            <Drawer title="Campaign Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
                        <Descriptions.Item label="Type">{selected.type || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUSES.find(s => s.value === selected.status)?.color}>{selected.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Budget">{fmt(selected.budget)}</Descriptions.Item>
                        <Descriptions.Item label="Spent">{fmt(selected.actualCost)}</Descriptions.Item>
                        <Descriptions.Item label="Expected Revenue">{fmt(selected.expectedRevenue)}</Descriptions.Item>
                        <Descriptions.Item label="Dates">{selected.startDate ? dayjs(selected.startDate).format('MMM D, YYYY') : '—'} → {selected.endDate ? dayjs(selected.endDate).format('MMM D, YYYY') : 'Ongoing'}</Descriptions.Item>
                        <Descriptions.Item label="Description">{selected.description || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </CMSLayout>
    );
}
