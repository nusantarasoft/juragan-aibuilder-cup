"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    InputNumber, DatePicker, Statistic, Segmented, Tabs, Spin,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, DollarOutlined,
    AppstoreOutlined, UnorderedListOutlined, RocketOutlined,
    TrophyOutlined, CloseCircleOutlined, FunnelPlotOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Deal {
    id: string;
    name: string;
    description: string;
    amount: number;
    currency: string;
    stage: string;
    probability: number;
    closeDate: string;
    accountId: string;
    contactId: string;
    type: string;
    leadSource: string;
    nextStep: string;
    lossReason: string;
    status: string;
    accountName: string;
    contactName: string;
    createdAt: string;
    expectedRevenue: number;
    quotes: Quote[];
}

interface Quote {
    id: string; quoteNumber: string; name: string;
    total: number; status: string; validUntil: string; createdAt: string;
}

const STAGES = [
    { value: "prospecting", label: "Prospecting", color: "#1677ff", prob: 10 },
    { value: "qualification", label: "Qualification", color: "#722ed1", prob: 25 },
    { value: "proposal", label: "Proposal", color: "#eb2f96", prob: 50 },
    { value: "negotiation", label: "Negotiation", color: "#fa8c16", prob: 75 },
    { value: "closed_won", label: "Closed Won", color: "#52c41a", prob: 100 },
    { value: "closed_lost", label: "Closed Lost", color: "#ff4d4f", prob: 0 },
];

const DEAL_TYPES = [
    { value: "new_business", label: "New Business" },
    { value: "existing_business", label: "Existing Business" },
    { value: "renewal", label: "Renewal" },
];

const SOURCES = ["web", "phone", "referral", "partner", "campaign", "social", "other"];

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
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
            const data = await gql(`
                query($tenantId: String!, $stage: String, $search: String) {
                    deals(tenantId: $tenantId, stage: $stage, search: $search) {
                        id name description amount currency stage probability
                        closeDate accountId contactId type leadSource nextStep
                        lossReason status accountName contactName createdAt expectedRevenue
                        quotes { id quoteNumber name total status validUntil createdAt }
                    }
                }
            `, {
                tenantId: DEFAULT_TENANT_ID,
                stage: stageFilter || null,
                search: search || null,
            });
            setDeals(data.deals || []);
        } catch (err: any) {
            message.error("Failed to load: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [search, stageFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerateAI = async () => {
        if (!selected) return;
        setAiLoading(true);
        try {
            const data = await gql(`query($dealId: String!) { generateDealNextBestAction(dealId: $dealId) }`, { dealId: selected.id });
            setAiAction(data.generateDealNextBestAction);
            message.success("AI Next Best Action generated!");
        } catch (err: any) { message.error("Generation failed: " + err.message); }
        finally { setAiLoading(false); }
    };

    const openDetails = (d: Deal) => {
        setSelected(d);
        setAiAction("");
        setDetailOpen(true);
    };

    const handleSave = async () => {
        try {
            const v = await form.validateFields();
            const input = {
                name: v.name, description: v.description || null,
                amount: v.amount || null, currency: v.currency || 'USD',
                stage: v.stage || 'prospecting',
                probability: v.probability ?? STAGES.find(s => s.value === (v.stage || 'prospecting'))?.prob ?? 10,
                closeDate: v.closeDate?.format('YYYY-MM-DD') || null,
                accountId: v.accountId || null, contactId: v.contactId || null,
                type: v.type || null, leadSource: v.leadSource || null,
                nextStep: v.nextStep || null,
            };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateDealInput!) { updateDeal(id: $id, input: $input) { id } }`,
                    { id: editing.id, input });
                message.success("Deal updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateDealInput!) { createDeal(tenantId: $tenantId, input: $input) { id } }`,
                    { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Deal created");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditing(null);
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleStageChange = async (id: string, newStage: string) => {
        try {
            const prob = STAGES.find(s => s.value === newStage)?.prob ?? 10;
            const status = newStage === 'closed_won' ? 'closed_won' : newStage === 'closed_lost' ? 'closed_lost' : 'open';
            await gql(`mutation($id: String!, $input: UpdateDealInput!) { updateDeal(id: $id, input: $input) { id } }`,
                { id, input: { stage: newStage, probability: prob, status } });
            message.success("Stage updated");
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteDeal(id: $id) }`, { id });
            message.success("Deal deleted");
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const formatAmount = (v: number) => {
        if (!v) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
    };

    const openDeals = deals.filter(d => d.status === 'open');
    const totalPipeline = openDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const weightedPipeline = openDeals.reduce((s, d) => s + (d.amount || 0) * (d.probability || 0) / 100, 0);
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const wonAmount = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);

    // ─── Kanban Board ───
    const renderBoard = () => {
        const pipelineStages = STAGES.filter(s => s.value !== 'closed_lost');
        return (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {pipelineStages.map(stage => {
                    const stageDeals = deals.filter(d => d.stage === stage.value);
                    const stageTotal = stageDeals.reduce((s, d) => s + (d.amount || 0), 0);
                    return (
                        <div key={stage.value} style={{
                            minWidth: 260, maxWidth: 280, flex: '0 0 auto',
                            background: '#fafafa', borderRadius: 8, padding: 12,
                            borderTop: `3px solid ${stage.color}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                    <Text strong style={{ fontSize: 13 }}>{stage.label}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 11 }}>{stageDeals.length} deals · {formatAmount(stageTotal)}</Text>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {stageDeals.length === 0 && <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', padding: 16 }}>No deals</Text>}
                                {stageDeals.map(deal => (
                                    <Card key={deal.id} size="small" hoverable
                                        style={{ borderRadius: 6, cursor: 'pointer' }}
                                        onClick={() => { setSelected(deal); setDetailOpen(true); }}
                                    >
                                        <Text strong style={{ fontSize: 13 }}>{deal.name}</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 11 }}>{deal.accountName || 'No account'}</Text>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                                            <Tooltip title="Expected Revenue"><Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 12 }}>{formatAmount(deal.expectedRevenue)}</Text></Tooltip>
                                            <Tooltip title="Deal Amount"><Text style={{ color: stage.color, fontWeight: 500, fontSize: 12 }}>{formatAmount(deal.amount)}</Text></Tooltip>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>{deal.probability}% prob</Text>
                                            {deal.closeDate && <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(deal.closeDate).format('MMM D')}</Text>}
                                        </div>
                                        {/* Stage move buttons */}
                                        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {STAGES.filter(s => s.value !== deal.stage && s.value !== 'closed_lost')
                                                .slice(0, 3)
                                                .map(s => (
                                                    <Tag key={s.value} color={s.color} style={{ cursor: 'pointer', fontSize: 10, margin: 0 }}
                                                        onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, s.value); }}>
                                                        → {s.label}
                                                    </Tag>
                                                ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ─── Table View ───
    const columns: ColumnsType<Deal> = [
        {
            title: "Deal", key: "deal",
            render: (_, r) => (
                <div>
                    <Text strong>{r.name}</Text>
                    <br /><Text type="secondary" style={{ fontSize: 12 }}>{r.accountName || 'No account'}</Text>
                </div>
            ),
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: "Amount", key: "amount", width: 120, align: "right",
            render: (_, r) => <Text strong>{formatAmount(r.amount)}</Text>,
            sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
        },
        {
            title: "Expected Rev.", key: "expectedRevenue", width: 130, align: "right",
            render: (_, r) => <Text style={{ color: '#52c41a' }}>{formatAmount(r.expectedRevenue)}</Text>,
            sorter: (a, b) => (a.expectedRevenue || 0) - (b.expectedRevenue || 0),
        },
        {
            title: "Stage", key: "stage", width: 140,
            render: (_, r) => {
                const s = STAGES.find(s => s.value === r.stage);
                return <Tag color={s?.color}>{s?.label || r.stage}</Tag>;
            },
        },
        {
            title: "Probability", key: "prob", width: 100, align: "right",
            render: (_, r) => `${r.probability || 0}%`,
        },
        {
            title: "Close Date", key: "close", width: 120,
            render: (_, r) => r.closeDate ? dayjs(r.closeDate).format('MMM D, YYYY') : '—',
            sorter: (a, b) => (a.closeDate || '').localeCompare(b.closeDate || ''),
        },
        {
            title: "Actions", key: "actions", width: 130,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => openDetails(r)} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                            name: r.name, description: r.description, amount: r.amount,
                            stage: r.stage, probability: r.probability,
                            closeDate: r.closeDate ? dayjs(r.closeDate) : null,
                            type: r.type, leadSource: r.leadSource, nextStep: r.nextStep,
                        });
                        setIsModalOpen(true);
                    }} /></Tooltip>
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title="Deals"
            subTitle="Track your sales pipeline and opportunities"
            extra={[
                <Segmented key="view"
                    options={[
                        { value: 'board', icon: <AppstoreOutlined /> },
                        { value: 'list', icon: <UnorderedListOutlined /> },
                    ]}
                    value={viewMode}
                    onChange={(v) => setViewMode(v as string)}
                />,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>
                    New Deal
                </Button>,
            ]}
        >
            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card><Statistic title="Pipeline Value (Open)" value={totalPipeline} prefix={<DollarOutlined />} precision={0}
                        formatter={(v) => formatAmount(Number(v))} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="Expected Revenue (Open)" value={weightedPipeline} prefix={<FunnelPlotOutlined />} precision={0}
                        valueStyle={{ color: '#52c41a' }} formatter={(v) => formatAmount(Number(v))} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="Won Revenue" value={wonAmount} prefix={<TrophyOutlined />} precision={0}
                        valueStyle={{ color: '#52c41a' }} formatter={(v) => formatAmount(Number(v))} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="Open Deals" value={openDeals.length} prefix={<FunnelPlotOutlined />} /></Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search deals..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Stage" value={stageFilter} onChange={setStageFilter} allowClear style={{ width: 160 }}
                        options={STAGES.map(s => ({ value: s.value, label: s.label }))} />
                </Space>
            </Card>

            {/* Board or Table */}
            {viewMode === 'board' ? renderBoard() : (
                <Card>
                    <Table columns={columns} dataSource={deals.map(d => ({ ...d, key: d.id }))}
                        loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" />
                </Card>
            )}

            {/* Create/Edit Modal */}
            <Modal title={editing ? "Edit Deal" : "New Deal"} open={isModalOpen} onOk={handleSave}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} okText={editing ? "Update" : "Create"} width={700}>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={16}><Form.Item name="name" label="Deal Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g., Acme Corp — Enterprise License" />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="amount" label="Amount">
                            <InputNumber style={{ width: '100%' }} prefix="$"
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="stage" label="Stage" initialValue="prospecting">
                            <Select options={STAGES.map(s => ({ value: s.value, label: s.label }))} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="probability" label="Probability (%)">
                            <InputNumber style={{ width: '100%' }} min={0} max={100} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="closeDate" label="Close Date">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="type" label="Type">
                            <Select allowClear options={DEAL_TYPES} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="leadSource" label="Lead Source">
                            <Select allowClear options={SOURCES.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="nextStep" label="Next Step">
                            <Input placeholder="e.g., Send proposal" />
                        </Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Drawer */}
            <Drawer title={`Deal: ${selected?.name || ''}`} open={detailOpen} onClose={() => setDetailOpen(false)} width={600}>
                {selected && (
                    <Tabs defaultActiveKey="details" items={[
                        {
                            key: "details", label: "Details", children: (
                                <Descriptions column={1} bordered size="small">
                                    <Descriptions.Item label="Amount"><Text strong>{formatAmount(selected.amount)}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Expected Revenue"><Text type="success">{formatAmount(selected.expectedRevenue)}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Stage">
                                        <Tag color={STAGES.find(s => s.value === selected.stage)?.color}>{STAGES.find(s => s.value === selected.stage)?.label}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Probability">{selected.probability}%</Descriptions.Item>
                                    <Descriptions.Item label="Close Date">{selected.closeDate ? dayjs(selected.closeDate).format('MMM D, YYYY') : '—'}</Descriptions.Item>
                                    <Descriptions.Item label="Account">{selected.accountName || '—'}</Descriptions.Item>
                                    <Descriptions.Item label="Contact">{selected.contactName || '—'}</Descriptions.Item>
                                    <Descriptions.Item label="Type"><Text style={{ textTransform: 'capitalize' }}>{selected.type?.replace('_', ' ') || '—'}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Lead Source"><Text style={{ textTransform: 'capitalize' }}>{selected.leadSource || '—'}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Next Step">{selected.nextStep || '—'}</Descriptions.Item>
                                    {selected.lossReason && <Descriptions.Item label="Loss Reason">{selected.lossReason}</Descriptions.Item>}
                                    <Descriptions.Item label="Description">{selected.description || '—'}</Descriptions.Item>
                                </Descriptions>
                            )
                        },
                        {
                            key: "quotes", label: `Quotes (${selected.quotes?.length || 0})`, children: (
                                <Table
                                    dataSource={selected.quotes || []}
                                    rowKey="id"
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        { title: 'Quote #', dataIndex: 'quoteNumber', render: t => <Text strong>{t}</Text> },
                                        { title: 'Name', dataIndex: 'name' },
                                        { title: 'Status', dataIndex: 'status', render: t => <Tag>{t}</Tag> },
                                        { title: 'Total', dataIndex: 'total', render: t => formatAmount(t) },
                                        { title: 'Date', dataIndex: 'createdAt', render: t => dayjs(t).format('MMM D, YY') },
                                    ]}
                                />
                            )
                        },
                        {
                            key: "ai", label: "AI Insights", children: (
                                <Spin spinning={aiLoading}>
                                    <div style={{ marginBottom: 16 }}>
                                        <Text>Use Gemini 2.5 Pro to analyze the deal attributes and get an actionable recommendation on what to do next to move this deal forward.</Text>
                                    </div>
                                    <Button type="primary" onClick={handleGenerateAI} style={{ marginBottom: 16 }} icon={<RocketOutlined />}>
                                        Generate Next Best Action
                                    </Button>
                                    {aiAction && (
                                        <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                                            <p style={{ margin: 0 }}>{aiAction}</p>
                                        </Card>
                                    )}
                                </Spin>
                            )
                        }
                    ]} />
                )}
            </Drawer>
        </CMSLayout>
    );
}
