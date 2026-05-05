"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    DatePicker, InputNumber, Statistic, Tabs, Spin,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, RocketOutlined,
    DollarOutlined, PercentageOutlined, CalendarOutlined,
    FileTextOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
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

interface Campaign {
    id: string; name: string; type: string; status: string;
    startDate: string; endDate: string;
    budget: number; actualCost: number; expectedRevenue: number;
    description: string; createdAt: string;
}
interface CampaignMember {
    id: string; campaignId: string; individualId: string;
    status: string; individualName: string; individualEmail: string; createdAt: string;
}

const TYPES = [{ value: "email", label: "Email" }, { value: "webinar", label: "Webinar" }, { value: "event", label: "Event" }, { value: "ad", label: "Ad" }, { value: "social", label: "Social" }, { value: "other", label: "Other" }];
const STATUSES = [{ value: "planned", label: "Planned", color: "blue" }, { value: "active", label: "Active", color: "green" }, { value: "completed", label: "Completed", color: "default" }, { value: "cancelled", label: "Cancelled", color: "red" }];

const CAMPAIGN_FIELDS: FieldDef[] = [
    { name: "name", label: "Name", required: true }, { name: "type", label: "Type" },
    { name: "status", label: "Status" }, { name: "startDate", label: "Start Date" },
    { name: "endDate", label: "End Date" }, { name: "budget", label: "Budget" },
    { name: "actualCost", label: "Actual Cost" }, { name: "expectedRevenue", label: "Expected Revenue" },
    { name: "description", label: "Description" },
];

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Campaign | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Campaign | null>(null);
    const [members, setMembers] = useState<CampaignMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [aiContent, setAiContent] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($tenantId: String!, $status: String, $search: String) { campaigns(tenantId: $tenantId, status: $status, search: $search) { id name type status startDate endDate budget actualCost expectedRevenue description createdAt } }`, { tenantId: DEFAULT_TENANT_ID, status: statusFilter || null, search: search || null });
            setCampaigns(data.campaigns || []);
        } catch (err: any) { message.error("Failed to load: " + err.message); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const fetchMembers = async (campaignId: string) => {
        setMembersLoading(true);
        try { const data = await gql(`query($campaignId: String!) { campaignMembers(campaignId: $campaignId) { id status individualName individualEmail createdAt } }`, { campaignId }); setMembers(data.campaignMembers || []); }
        catch (err: any) { message.error("Failed to load members: " + err.message); }
        finally { setMembersLoading(false); }
    };

    const handleGenerateAI = async () => {
        if (!selected) return; setAiLoading(true);
        try { const data = await gql(`query($campaignId: String!) { generateCampaignContent(campaignId: $campaignId) }`, { campaignId: selected.id }); setAiContent(data.generateCampaignContent); message.success("AI draft generated!"); }
        catch (err: any) { message.error("Generation failed: " + err.message); }
        finally { setAiLoading(false); }
    };

    const openDetails = (c: Campaign) => { setSelected(c); setAiContent(""); setMembers([]); setDetailOpen(true); fetchMembers(c.id); };
    const fmt = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : 'â€”';

    const handleSave = async (values: any) => {
        try {
            const input = { name: values.name, type: values.type || null, status: values.status || 'planned', startDate: values.startDate?.format('YYYY-MM-DD') || null, endDate: values.endDate?.format('YYYY-MM-DD') || null, budget: values.budget || null, actualCost: values.actualCost || null, expectedRevenue: values.expectedRevenue || null, description: values.description || null };
            if (editing) { await gql(`mutation($id: String!, $input: UpdateCampaignInput!) { updateCampaign(id: $id, input: $input) { id } }`, { id: editing.id, input }); message.success("Campaign updated"); }
            else { await gql(`mutation($tenantId: String!, $input: CreateCampaignInput!) { createCampaign(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input }); message.success("Campaign created"); }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try { await gql(`mutation($tenantId: String!, $input: CreateCampaignInput!) { createCampaign(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input: { name: r.name, type: r.type || null, status: r.status || 'planned', budget: r.budget || null, expectedRevenue: r.expectedRevenue || null, description: r.description || null } }); success++; }
            catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadData(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => { try { await gql(`mutation($id: String!) { deleteCampaign(id: $id) }`, { id }); message.success("Deleted"); loadData(); } catch (err: any) { message.error(err.message); } };

    const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((s, c) => s + (c.actualCost || 0), 0);
    const totalExpected = campaigns.reduce((s, c) => s + (c.expectedRevenue || 0), 0);
    const roi = totalSpent > 0 ? ((totalExpected - totalSpent) / totalSpent) * 100 : 0;

    const columns: ColumnsType<Campaign> = [
        { title: "Campaign", key: "name", render: (_, r) => <div><Text strong>{r.name}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.type || 'General'}</Text></div> },
        { title: "Status", key: "status", width: 110, render: (_, r) => { const s = STATUSES.find(s => s.value === r.status); return <Tag color={s?.color}>{s?.label || r.status}</Tag>; } },
        { title: "Budget", key: "budget", width: 120, align: "right", render: (_, r) => fmt(r.budget) },
        { title: "Spent", key: "spent", width: 120, align: "right", render: (_, r) => fmt(r.actualCost) },
        { title: "Expected", key: "expected", width: 120, align: "right", render: (_, r) => fmt(r.expectedRevenue) },
        { title: "Dates", key: "dates", width: 180, render: (_, r) => r.startDate ? `${dayjs(r.startDate).format('MMM D')} â†’ ${r.endDate ? dayjs(r.endDate).format('MMM D') : 'Ongoing'}` : 'â€”' },
        { title: "Actions", key: "actions", width: 130, align: "right", render: (_, r) => (<Space>
            <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => openDetails(r)} /></Tooltip>
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ name: r.name, type: r.type, status: r.status, startDate: r.startDate ? dayjs(r.startDate) : null, endDate: r.endDate ? dayjs(r.endDate) : null, budget: r.budget, actualCost: r.actualCost, expectedRevenue: r.expectedRevenue, description: r.description }); setIsModalOpen(true); }} /></Tooltip>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
        </Space>) },
    ];

    const memberColumns: ColumnsType<CampaignMember> = [
        { title: "Name", dataIndex: "individualName", key: "name", render: (text, r) => <div><Text strong>{text || 'Unknown'}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.individualEmail || 'â€”'}</Text></div> },
        { title: "Status", dataIndex: "status", key: "status", width: 100, render: t => <Tag color="blue">{t}</Tag> },
        { title: "Added", dataIndex: "createdAt", key: "createdAt", width: 100, render: t => dayjs(t).format('MMM D, YYYY') },
    ];

    const formSteps = [
        { title: "Campaign", icon: <RocketOutlined />, fields: ["name", "type", "status", "startDate", "endDate"], content: (<><Row gutter={16}><Col span={16}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={8}><Form.Item name="type" label="Type"><Select allowClear options={TYPES} /></Form.Item></Col></Row><Row gutter={16}><Col span={8}><Form.Item name="status" label="Status" initialValue="planned"><Select options={STATUSES} /></Form.Item></Col><Col span={8}><Form.Item name="startDate" label="Start"><DatePicker style={{ width: '100%' }} /></Form.Item></Col><Col span={8}><Form.Item name="endDate" label="End"><DatePicker style={{ width: '100%' }} /></Form.Item></Col></Row></>) },
        { title: "Budget", icon: <DollarOutlined />, fields: ["budget", "actualCost", "expectedRevenue", "description"], content: (<><Row gutter={16}><Col span={8}><Form.Item name="budget" label="Budget"><InputNumber style={{ width: '100%' }} prefix="$" /></Form.Item></Col><Col span={8}><Form.Item name="actualCost" label="Actual Cost"><InputNumber style={{ width: '100%' }} prefix="$" /></Form.Item></Col><Col span={8}><Form.Item name="expectedRevenue" label="Expected Revenue"><InputNumber style={{ width: '100%' }} prefix="$" /></Form.Item></Col></Row><Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item></>) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Campaigns</AuroraText>}
            subTitle={<DecryptedText text="Marketing campaigns and outreach" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>New Campaign</Button>,
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'crm_campaigns', title: 'CRM Campaigns', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'type' }, { header: 'Status', key: 'status' }, { header: 'Budget', key: 'budget' }], data: campaigns })} /></Tooltip> <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'crm_campaigns', title: 'CRM Campaigns', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'type' }, { header: 'Status', key: 'status' }, { header: 'Budget', key: 'budget' }], data: campaigns })} /></Tooltip></RbacGuard>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Total Budget" value={totalBudget} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} /></Card></Col>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Total Spent" value={totalSpent} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} /></Card></Col>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Expected Revenue" value={totalExpected} prefix={<DollarOutlined />} precision={0} formatter={v => fmt(Number(v))} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Expected ROI" value={roi} prefix={<PercentageOutlined />} precision={1} suffix="%" valueStyle={{ color: roi > 0 ? '#52c41a' : (roi < 0 ? '#cf1322' : 'inherit') }} /></Card></Col>
            </Row>
            <Card style={{ ...glass, marginBottom: 16 }}><Space wrap>
                <Input prefix={<SearchOutlined />} placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 150 }} options={STATUSES} />
            </Space></Card>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}><Table columns={columns} dataSource={campaigns.map(c => ({ ...c, key: c.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>

            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? "Edit Campaign" : "New Campaign"} entityName="campaign" steps={formSteps} fields={CAMPAIGN_FIELDS} width={700} onBatchCreate={handleBatchCreate} gradient={["#f59e0b", "#ea580c"]} editMode={!!editing} />

            <Drawer title={`Campaign: ${selected?.name || ''}`} open={detailOpen} onClose={() => setDetailOpen(false)} width={650}>
                {selected && (<Tabs defaultActiveKey="details" items={[
                    { key: "details", label: "Details", children: (<Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Type"><Text style={{ textTransform: 'capitalize' }}>{selected.type || 'â€”'}</Text></Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUSES.find(s => s.value === selected.status)?.color}>{selected.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Budget">{fmt(selected.budget)}</Descriptions.Item>
                        <Descriptions.Item label="Spent">{fmt(selected.actualCost)}</Descriptions.Item>
                        <Descriptions.Item label="Expected Revenue">{fmt(selected.expectedRevenue)}</Descriptions.Item>
                        <Descriptions.Item label="ROI">{selected.actualCost > 0 ? (<Text type={selected.expectedRevenue - selected.actualCost > 0 ? 'success' : 'danger'}>{(((selected.expectedRevenue - selected.actualCost) / selected.actualCost) * 100).toFixed(1)}%</Text>) : 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Dates">{selected.startDate ? dayjs(selected.startDate).format('MMM D, YYYY') : 'â€”'} â†’ {selected.endDate ? dayjs(selected.endDate).format('MMM D, YYYY') : 'Ongoing'}</Descriptions.Item>
                        <Descriptions.Item label="Description">{selected.description || 'â€”'}</Descriptions.Item>
                    </Descriptions>) },
                    { key: "members", label: "Members", children: (<Table columns={memberColumns} dataSource={members} rowKey="id" pagination={{ pageSize: 15 }} size="small" loading={membersLoading} />) },
                    { key: "ai", label: "AI Copy Generator", children: (<Spin spinning={aiLoading}><div style={{ marginBottom: 16 }}><Text>Use Gemini 2.5 Pro to generate optimized copy for this campaign.</Text></div><Button type="primary" onClick={handleGenerateAI} style={{ marginBottom: 16 }} icon={<RocketOutlined />}>Generate {selected.type ? selected.type.replace(/^\w/, c => c.toUpperCase()) : 'Campaign'} Draft</Button>{aiContent && (<TextArea rows={12} value={aiContent} onChange={e => setAiContent(e.target.value)} />)}</Spin>) }
                ]} />)}
            </Drawer>
        </CMSLayout>
    );
}


