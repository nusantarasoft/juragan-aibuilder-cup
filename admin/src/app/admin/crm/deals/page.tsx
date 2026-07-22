"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    InputNumber, DatePicker, Statistic, Segmented, Tabs, Spin,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, DollarOutlined,
    AppstoreOutlined, UnorderedListOutlined, RocketOutlined,
    TrophyOutlined, FunnelPlotOutlined, FileTextOutlined, FileExcelOutlined, FilePdfOutlined, ProjectOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

const { Text } = Typography;
const { TextArea } = Input;

interface Deal {
    id: string; name: string; description: string; amount: number; currency: string;
    stage: string; probability: number; closeDate: string; accountId: string;
    contactId: string; type: string; leadSource: string; nextStep: string;
    lossReason: string; status: string; accountName: string; contactName: string;
    createdAt: string; expectedRevenue: number;
    quotes: { id: string; quoteNumber: string; name: string; total: number; status: string; validUntil: string; createdAt: string; }[];
}

const STAGES = [
    { value: "prospecting", label: "Prospecting", color: "#1677ff", prob: 10 },
    { value: "qualification", label: "Qualification", color: "var(--theme-color, #8b5cf6)", prob: 25 },
    { value: "proposal", label: "Proposal", color: "#eb2f96", prob: 50 },
    { value: "negotiation", label: "Negotiation", color: "#fa8c16", prob: 75 },
    { value: "closed_won", label: "Closed Won", color: "#52c41a", prob: 100 },
    { value: "closed_lost", label: "Closed Lost", color: "#ff4d4f", prob: 0 },
];
const DEAL_TYPES = [{ value: "new_business", label: "New Business" }, { value: "existing_business", label: "Existing Business" }, { value: "renewal", label: "Renewal" }];
const SOURCES = ["web", "phone", "referral", "partner", "campaign", "social", "other"];

const DEAL_FIELDS: FieldDef[] = [
    { name: "name", label: "Deal Name", required: true }, { name: "amount", label: "Amount" },
    { name: "stage", label: "Stage" }, { name: "probability", label: "Probability (%)" },
    { name: "closeDate", label: "Close Date" }, { name: "type", label: "Type" },
    { name: "leadSource", label: "Lead Source" }, { name: "nextStep", label: "Next Step" },
    { name: "description", label: "Description" },
];

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Deal | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Deal | null>(null);
    const [viewMode, setViewMode] = useState<string>("board");
    const [aiAction, setAiAction] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($tenantId: String!, $stage: String, $search: String) { deals(tenantId: $tenantId, stage: $stage, search: $search) { id name description amount currency stage probability closeDate accountId contactId type leadSource nextStep lossReason status accountName contactName createdAt expectedRevenue quotes { id quoteNumber name total status validUntil createdAt } } }`, { tenantId: DEFAULT_TENANT_ID, stage: stageFilter || null, search: search || null });
            setDeals(data.deals || []);
        } catch (err: any) { message.error("Failed to load: " + err.message); }
        finally { setLoading(false); }
    }, [search, stageFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerateAI = async () => {
        if (!selected) return;
        setAiLoading(true);
        try { const data = await gql(`query($dealId: String!) { generateDealNextBestAction(dealId: $dealId) }`, { dealId: selected.id }); setAiAction(data.generateDealNextBestAction); message.success("AI Next Best Action generated!"); }
        catch (err: any) { message.error("Generation failed: " + err.message); }
        finally { setAiLoading(false); }
    };

    const openDetails = (d: Deal) => { setSelected(d); setAiAction(""); setDetailOpen(true); };

    const handleSave = async (values: any) => {
        try {
            const input = { name: values.name, description: values.description || null, amount: values.amount || null, currency: values.currency || 'USD', stage: values.stage || 'prospecting', probability: values.probability ?? STAGES.find(s => s.value === (values.stage || 'prospecting'))?.prob ?? 10, closeDate: values.closeDate?.format('YYYY-MM-DD') || null, accountId: values.accountId || null, contactId: values.contactId || null, type: values.type || null, leadSource: values.leadSource || null, nextStep: values.nextStep || null };
            if (editing) { await gql(`mutation($id: String!, $input: UpdateDealInput!) { updateDeal(id: $id, input: $input) { id } }`, { id: editing.id, input }); message.success("Deal updated"); }
            else { await gql(`mutation($tenantId: String!, $input: CreateDealInput!) { createDeal(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input }); message.success("Deal created"); }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try { await gql(`mutation($tenantId: String!, $input: CreateDealInput!) { createDeal(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input: { name: r.name, amount: r.amount || null, stage: r.stage || 'prospecting', probability: r.probability || 10, type: r.type || null, leadSource: r.leadSource || null, nextStep: r.nextStep || null, description: r.description || null } }); success++; }
            catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadData(); return { success, failed, errors };
    };

    const handleStageChange = async (id: string, newStage: string) => {
        try { const prob = STAGES.find(s => s.value === newStage)?.prob ?? 10; const status = newStage === 'closed_won' ? 'closed_won' : newStage === 'closed_lost' ? 'closed_lost' : 'open'; await gql(`mutation($id: String!, $input: UpdateDealInput!) { updateDeal(id: $id, input: $input) { id } }`, { id, input: { stage: newStage, probability: prob, status } }); message.success("Stage updated"); loadData(); }
        catch (err: any) { message.error(err.message); }
    };

    const handleDelete = async (id: string) => { try { await gql(`mutation($id: String!) { deleteDeal(id: $id) }`, { id }); message.success("Deleted"); loadData(); } catch (err: any) { message.error(err.message); } };

    const formatAmount = (v: number) => { if (!v) return '—'; return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v); };

    const openDeals = deals.filter(d => d.status === 'open');
    const totalPipeline = openDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const weightedPipeline = openDeals.reduce((s, d) => s + (d.amount || 0) * (d.probability || 0) / 100, 0);
    const wonAmount = deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + (d.amount || 0), 0);

    const renderBoard = () => {
        const pipelineStages = STAGES.filter(s => s.value !== 'closed_lost');
        return (<div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {pipelineStages.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage.value);
                const stageTotal = stageDeals.reduce((s, d) => s + (d.amount || 0), 0);
                return (<div key={stage.value} style={{ minWidth: 260, maxWidth: 280, flex: '0 0 auto', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: 12, borderTop: `3px solid ${stage.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><div><Text strong style={{ fontSize: 13 }}>{stage.label}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{stageDeals.length} deals · {formatAmount(stageTotal)}</Text></div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stageDeals.length === 0 && <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', padding: 16 }}>No deals</Text>}
                        {stageDeals.map(deal => (<Card key={deal.id} size="small" hoverable style={{ borderRadius: 6, cursor: 'pointer' }} onClick={() => openDetails(deal)}>
                            <Text strong style={{ fontSize: 13 }}>{deal.name}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{deal.accountName || 'No account'}</Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}><Tooltip title="Expected Revenue"><Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 12 }}>{formatAmount(deal.expectedRevenue)}</Text></Tooltip><Tooltip title="Deal Amount"><Text style={{ color: stage.color, fontWeight: 500, fontSize: 12 }}>{formatAmount(deal.amount)}</Text></Tooltip></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text type="secondary" style={{ fontSize: 11 }}>{deal.probability}% prob</Text>{deal.closeDate && <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(deal.closeDate).format('MMM D')}</Text>}</div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>{STAGES.filter(s => s.value !== deal.stage && s.value !== 'closed_lost').slice(0, 3).map(s => (<Tag key={s.value} color={s.color} style={{ cursor: 'pointer', fontSize: 10, margin: 0 }} onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, s.value); }}>→ {s.label}</Tag>))}</div>
                        </Card>))}
                    </div>
                </div>);
            })}
        </div>);
    };

    const columns: ColumnsType<Deal> = [
        { title: "Deal", key: "deal", render: (_, r) => <div><Text strong>{r.name}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.accountName || 'No account'}</Text></div>, sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: "Amount", key: "amount", width: 120, align: "right", render: (_, r) => <Text strong>{formatAmount(r.amount)}</Text>, sorter: (a, b) => (a.amount || 0) - (b.amount || 0) },
        { title: "Expected Rev.", key: "expectedRevenue", width: 130, align: "right", render: (_, r) => <Text style={{ color: '#52c41a' }}>{formatAmount(r.expectedRevenue)}</Text>, sorter: (a, b) => (a.expectedRevenue || 0) - (b.expectedRevenue || 0) },
        { title: "Stage", key: "stage", width: 140, render: (_, r) => { const s = STAGES.find(s => s.value === r.stage); return <Tag color={s?.color}>{s?.label || r.stage}</Tag>; } },
        { title: "Probability", key: "prob", width: 100, align: "right", render: (_, r) => `${r.probability || 0}%` },
        { title: "Close Date", key: "close", width: 120, render: (_, r) => r.closeDate ? dayjs(r.closeDate).format('MMM D, YYYY') : '—', sorter: (a, b) => (a.closeDate || '').localeCompare(b.closeDate || '') },
        { title: "Actions", key: "actions", width: 130, render: (_, r) => (<Space>
            <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => openDetails(r)} /></Tooltip>
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ name: r.name, description: r.description, amount: r.amount, stage: r.stage, probability: r.probability, closeDate: r.closeDate ? dayjs(r.closeDate) : null, type: r.type, leadSource: r.leadSource, nextStep: r.nextStep }); setIsModalOpen(true); }} /></Tooltip>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
        </Space>) },
    ];

    const formSteps = [
        { title: "Deal Info", icon: <DollarOutlined />, fields: ["name", "amount", "stage", "probability", "closeDate"], content: (<><Row gutter={16}><Col span={16}><Form.Item name="name" label="Deal Name" rules={[{ required: true }]}><Input placeholder="e.g., Acme Corp — Enterprise License" /></Form.Item></Col><Col span={8}><Form.Item name="amount" label="Amount"><InputNumber style={{ width: '100%' }} prefix="$" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item></Col></Row><Row gutter={16}><Col span={8}><Form.Item name="stage" label="Stage" initialValue="prospecting"><Select options={STAGES.map(s => ({ value: s.value, label: s.label }))} /></Form.Item></Col><Col span={8}><Form.Item name="probability" label="Probability (%)"><InputNumber style={{ width: '100%' }} min={0} max={100} /></Form.Item></Col><Col span={8}><Form.Item name="closeDate" label="Close Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col></Row></>) },
        { title: "Details", icon: <FileTextOutlined />, fields: ["type", "leadSource", "nextStep", "description"], content: (<><Row gutter={16}><Col span={8}><Form.Item name="type" label="Type"><Select allowClear options={DEAL_TYPES} /></Form.Item></Col><Col span={8}><Form.Item name="leadSource" label="Lead Source"><Select allowClear options={SOURCES.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} /></Form.Item></Col><Col span={8}><Form.Item name="nextStep" label="Next Step"><Input placeholder="e.g., Send proposal" /></Form.Item></Col></Row><Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item></>) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Deals</AuroraText>}
            subTitle={<DecryptedText text="Track your sales pipeline and opportunities" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Segmented key="view" options={[{ value: 'board', icon: <AppstoreOutlined /> }, { value: 'list', icon: <UnorderedListOutlined /> }]} value={viewMode} onChange={(v) => setViewMode(v as string)} />,
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>New Deal</Button>,
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'crm_deals', title: 'CRM Deals', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Deal', key: 'dealName' }, { header: 'Amount', key: 'amount' }, { header: 'Stage', key: 'stage' }, { header: 'Win %', key: 'probability' }, { header: 'Account', key: 'accountName' }], data: deals })} /></Tooltip> <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'crm_deals', title: 'CRM Deals', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Deal', key: 'dealName' }, { header: 'Amount', key: 'amount' }, { header: 'Stage', key: 'stage' }, { header: 'Win %', key: 'probability' }, { header: 'Account', key: 'accountName' }], data: deals })} /></Tooltip></RbacGuard>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}><Card ><Statistic title="Pipeline Value (Open)" value={totalPipeline} prefix={<DollarOutlined />} precision={0} formatter={(v) => formatAmount(Number(v))} /></Card></motion.div></Col>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}><Card ><Statistic title="Expected Revenue (Open)" value={weightedPipeline} prefix={<FunnelPlotOutlined />} precision={0} valueStyle={{ color: '#52c41a' }} formatter={(v) => formatAmount(Number(v))} /></Card></motion.div></Col>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Card ><Statistic title="Won Revenue" value={wonAmount} prefix={<TrophyOutlined />} precision={0} valueStyle={{ color: '#52c41a' }} formatter={(v) => formatAmount(Number(v))} /></Card></motion.div></Col>
                <Col span={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}><Card ><Statistic title="Open Deals" value={openDeals.length} prefix={<FunnelPlotOutlined />} /></Card></motion.div></Col>
            </Row>
            <Card style={{ marginBottom: 16 }}><Space wrap>
                <Input prefix={<SearchOutlined />} placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                <Select placeholder="Stage" value={stageFilter} onChange={setStageFilter} allowClear style={{ width: 160 }} options={STAGES.map(s => ({ value: s.value, label: s.label }))} />
            </Space></Card>

            {viewMode === 'board' ? renderBoard() : (<Card  styles={{ body: { padding: 0 } }}><Table scroll={{ x: 900 }} columns={columns} dataSource={deals.map(d => ({ ...d, key: d.id }))} loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" /></Card>)}

            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? "Edit Deal" : "New Deal"} entityName="deal" steps={formSteps} fields={DEAL_FIELDS} width={700} onBatchCreate={handleBatchCreate} gradient={["#f59e0b", "#ef4444"]} editMode={!!editing} />

            <Drawer title={`Deal: ${selected?.name || ''}`} open={detailOpen} onClose={() => setDetailOpen(false)} size={600} extra={selected?.stage === 'closed_won' && <Button type="primary" icon={<ProjectOutlined />} onClick={() => router.push(`/admin/pm/projects?createFromDeal=${selected.id}&dealName=${encodeURIComponent(selected.name)}`)}>Create Delivery Project</Button>}>
                {selected && (<Tabs defaultActiveKey="details" items={[
                    { key: "details", label: "Details", children: (<Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Amount"><Text strong>{formatAmount(selected.amount)}</Text></Descriptions.Item>
                        <Descriptions.Item label="Expected Revenue"><Text type="success">{formatAmount(selected.expectedRevenue)}</Text></Descriptions.Item>
                        <Descriptions.Item label="Stage"><Tag color={STAGES.find(s => s.value === selected.stage)?.color}>{STAGES.find(s => s.value === selected.stage)?.label}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Probability">{selected.probability}%</Descriptions.Item>
                        <Descriptions.Item label="Close Date">{selected.closeDate ? dayjs(selected.closeDate).format('MMM D, YYYY') : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Account">{selected.accountName || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Contact">{selected.contactName || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Type"><Text style={{ textTransform: 'capitalize' }}>{selected.type?.replace('_', ' ') || '—'}</Text></Descriptions.Item>
                        <Descriptions.Item label="Lead Source"><Text style={{ textTransform: 'capitalize' }}>{selected.leadSource || '—'}</Text></Descriptions.Item>
                        <Descriptions.Item label="Next Step">{selected.nextStep || '—'}</Descriptions.Item>
                        {selected.lossReason && <Descriptions.Item label="Loss Reason">{selected.lossReason}</Descriptions.Item>}
                        <Descriptions.Item label="Description">{selected.description || '—'}</Descriptions.Item>
                    </Descriptions>) },
                    { key: "quotes", label: `Quotes (${selected.quotes?.length || 0})`, children: (<Table scroll={{ x: 900 }} dataSource={selected.quotes || []} rowKey="id" pagination={false} size="small" columns={[{ title: 'Quote #', dataIndex: 'quoteNumber', render: t => <Text strong>{t}</Text> }, { title: 'Name', dataIndex: 'name' }, { title: 'Status', dataIndex: 'status', render: t => <Tag>{t}</Tag> }, { title: 'Total', dataIndex: 'total', render: t => formatAmount(t) }, { title: 'Date', dataIndex: 'createdAt', render: t => dayjs(t).format('MMM D, YY') }]} />) },
                    { key: "ai", label: "AI Insights", children: (<Spin spinning={aiLoading}><div style={{ marginBottom: 16 }}><Text>Use Gemini 2.5 Pro to analyze the deal and get an actionable recommendation.</Text></div><Button type="primary" onClick={handleGenerateAI} style={{ marginBottom: 16 }} icon={<RocketOutlined />}>Generate Next Best Action</Button>{aiAction && (<Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}><p style={{ margin: 0 }}>{aiAction}</p></Card>)}</Spin>) }
                ]} />)}
            </Drawer>
        </CMSLayout>
    );
}


