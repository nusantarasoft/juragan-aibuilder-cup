"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Card, Space, Tag, Input, Select, Modal, Form, message, Tooltip, Dropdown, Badge, Typography, Row, Col, Statistic, Drawer, Rate, Skeleton, Popconfirm } from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, CopyOutlined, EditOutlined, DeleteOutlined, EyeOutlined, RocketOutlined, DownloadOutlined, UploadOutlined, FormOutlined, BarChartOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, SafetyOutlined, MoreOutlined, StarOutlined, AuditOutlined, UnorderedListOutlined, ShareAltOutlined, LinkOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

// ─── Types ──────────────────────────────────────────────

interface FormTemplate {
    id: string; tenantId: string; name: string; description?: string;
    category: string; status: string; settings?: any; scoringConfig?: any;
    styleConfig?: any; version: number; tags?: string[]; fieldCount?: number;
    fields?: FormField[]; createdAt: string; updatedAt: string;
}

interface FormField {
    id: string; fieldType: string; label: string; description?: string;
    isRequired: boolean; sortOrder: number; sectionTitle?: string;
    options?: any; kpiConfig?: any;
}

// ─── Constants ──────────────────────────────────────────

const CATEGORIES = [
    { value: 'kpi', label: 'KPI', color: '#f5222d', icon: <BarChartOutlined /> },
    { value: 'survey', label: 'Survey', color: '#1890ff', icon: <FormOutlined /> },
    { value: 'assessment', label: 'Assessment', color: '#52c41a', icon: <CheckCircleOutlined /> },
    { value: 'checklist', label: 'Checklist', color: '#fa8c16', icon: <UnorderedListOutlined /> },
    { value: 'feedback', label: 'Feedback', color: '#722ed1', icon: <StarOutlined /> },
    { value: 'audit', label: 'Audit', color: '#13c2c2', icon: <AuditOutlined /> },
    { value: 'custom', label: 'Custom', color: '#595959', icon: <FileTextOutlined /> },
];

const STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'published', label: 'Published', color: 'green' },
    { value: 'archived', label: 'Archived', color: 'orange' },
    { value: 'closed', label: 'Closed', color: 'red' },
];

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TEMPLATE_FRAGMENT = `
    id tenantId name description category status settings scoringConfig
    styleConfig version tags fieldCount createdAt updatedAt
`;

// ─── Page ───────────────────────────────────────────────

export default function FormTemplatesPage() {
    const [data, setData] = useState<FormTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<FormTemplate | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRecord, setDetailRecord] = useState<FormTemplate | null>(null);
    const [detailFields, setDetailFields] = useState<FormField[]>([]);
    const [form] = Form.useForm();
    const [messageApi, ctx] = message.useMessage();
    const router = useRouter();

    // ── Stats ──
    const stats = {
        total: data.length,
        published: data.filter(d => d.status === 'published').length,
        kpi: data.filter(d => d.category === 'kpi').length,
        draft: data.filter(d => d.status === 'draft').length,
    };

    // ── Load ──
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await gql<{ formTemplates: FormTemplate[] }>(`
                query($tid: String!, $cat: String, $st: String, $q: String) {
                    formTemplates(tenantId: $tid, category: $cat, status: $st, search: $q) { ${TEMPLATE_FRAGMENT} }
                }
            `, { tid: DEFAULT_TENANT_ID, cat: catFilter || null, st: statusFilter || null, q: search || null });
            setData(res.formTemplates || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [catFilter, statusFilter, search, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── CRUD ──
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editRecord) {
                await gql(`mutation($id: String!, $input: UpdateFormTemplateInput!) { updateFormTemplate(id: $id, input: $input) { id } }`,
                    { id: editRecord.id, input: values });
                messageApi.success('Template updated');
            } else {
                await gql(`mutation($tid: String!, $input: CreateFormTemplateInput!) { createFormTemplate(tenantId: $tid, input: $input) { id } }`,
                    { tid: DEFAULT_TENANT_ID, input: values });
                messageApi.success('Template created');
            }
            setModalOpen(false); form.resetFields(); setEditRecord(null); loadData();
        } catch (e: any) { if (e.errorFields) return; messageApi.error(e.message); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteFormTemplate(id: $id) }`, { id });
            messageApi.success('Template deleted');
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    const handleDuplicate = async (id: string) => {
        try {
            await gql(`mutation($id: String!, $tid: String!) { duplicateFormTemplate(id: $id, tenantId: $tid) { id name } }`,
                { id, tid: DEFAULT_TENANT_ID });
            messageApi.success('Template duplicated');
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    const handlePublish = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { publishFormTemplate(id: $id) { id status } }`, { id });
            messageApi.success('Template published');
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    // ── Export/Import ──
    const handleExport = async (id: string) => {
        try {
            const res = await gql<{ formTemplate: FormTemplate }>(`
                query($id: String!) {
                    formTemplate(id: $id) { ${TEMPLATE_FRAGMENT} fields { id fieldType label description placeholder isRequired sortOrder sectionTitle sectionId options kpiConfig validation conditional defaultValue metadata } }
                }
            `, { id });
            const tpl = res.formTemplate;
            const exportData = {
                _type: 'nusantarasoft_form_template',
                _version: '1.0',
                _exportedAt: new Date().toISOString(),
                template: { name: tpl.name, description: tpl.description, category: tpl.category, settings: tpl.settings, scoringConfig: tpl.scoringConfig, tags: tpl.tags },
                fields: (tpl.fields || []).map((f: any) => ({ fieldType: f.fieldType, label: f.label, description: f.description, placeholder: f.placeholder, isRequired: f.isRequired, sortOrder: f.sortOrder, sectionTitle: f.sectionTitle, sectionId: f.sectionId, options: f.options, kpiConfig: f.kpiConfig, validation: f.validation, conditional: f.conditional, defaultValue: f.defaultValue, metadata: f.metadata })),
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${tpl.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_form.json`; a.click();
            URL.revokeObjectURL(url);
            messageApi.success(`Exported: ${tpl.name}`);
        } catch (e: any) { messageApi.error(e.message); }
    };

    const handleImport = async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (data._type !== 'nusantarasoft_form_template') throw new Error('Invalid form template file');
            // Create template
            const res = await gql<{ createFormTemplate: FormTemplate }>(`
                mutation($tid: String!, $input: CreateFormTemplateInput!) {
                    createFormTemplate(tenantId: $tid, input: $input) { id name }
                }
            `, { tid: DEFAULT_TENANT_ID, input: { ...data.template, name: `${data.template.name} (Imported)`, status: 'draft' } });
            // Save fields
            if (data.fields?.length > 0) {
                await gql(`
                    mutation($tid: String!, $fields: [FormFieldInput!]!) {
                        saveFormFields(templateId: $tid, fields: $fields) { id }
                    }
                `, { tid: res.createFormTemplate.id, fields: data.fields });
            }
            messageApi.success(`Imported: ${res.createFormTemplate.name} with ${data.fields?.length || 0} fields`);
            loadData();
        } catch (e: any) { messageApi.error('Import failed: ' + e.message); }
        return false;
    };

    const handleCopyShareLink = (id: string) => {
        const url = `${window.location.origin}/admin/forms/fill?id=${id}`;
        navigator.clipboard.writeText(url);
        messageApi.success('Share link copied to clipboard!');
    };

    const openDetail = async (record: FormTemplate) => {
        setDetailRecord(record);
        setDetailOpen(true);
        try {
            const res = await gql<{ formTemplate: FormTemplate }>(`
                query($id: String!) {
                    formTemplate(id: $id) { ${TEMPLATE_FRAGMENT} fields { id fieldType label description isRequired sortOrder sectionTitle options kpiConfig } }
                }
            `, { id: record.id });
            setDetailFields(res.formTemplate.fields || []);
        } catch { setDetailFields([]); }
    };

    // ── Columns ──
    const columns: ColumnsType<FormTemplate> = [
        {
            title: 'Name', dataIndex: 'name', key: 'name',
            render: (name: string, rec) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => openDetail(rec)}>{name}</Text>
                    {rec.description && <Text type="secondary" style={{ fontSize: 12 }}>{rec.description.slice(0, 60)}{rec.description.length > 60 ? '…' : ''}</Text>}
                </Space>
            ),
        },
        {
            title: 'Category', dataIndex: 'category', key: 'category', width: 120,
            render: (cat: string) => {
                const c = CATEGORIES.find(c => c.value === cat);
                return c ? <Tag icon={c.icon} color={c.color}>{c.label}</Tag> : <Tag>{cat}</Tag>;
            },
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 110,
            render: (st: string) => {
                const s = STATUSES.find(s => s.value === st);
                return <Badge status={st === 'published' ? 'success' : st === 'draft' ? 'default' : 'warning'} text={<Tag color={s?.color}>{s?.label || st}</Tag>} />;
            },
        },
        {
            title: 'Fields', dataIndex: 'fieldCount', key: 'fieldCount', width: 80, align: 'center' as const,
            render: (c: number) => <Tag color="blue">{c || 0}</Tag>,
        },
        {
            title: 'Version', dataIndex: 'version', key: 'version', width: 80, align: 'center' as const,
            render: (v: number) => <Text type="secondary">v{v}</Text>,
        },
        {
            title: 'Updated', dataIndex: 'updatedAt', key: 'updatedAt', width: 130,
            render: (d: string) => <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}><Text type="secondary">{dayjs(d).fromNow()}</Text></Tooltip>,
        },
        {
            title: '', key: 'actions', width: 160, align: 'right' as const,
            render: (_: any, rec) => (
                <Space size={4}>
                    <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(rec)} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditRecord(rec); form.setFieldsValue({ name: rec.name, description: rec.description, category: rec.category, tags: rec.tags }); setModalOpen(true); }} /></Tooltip>
                    <Tooltip title="Open Builder"><Button type="text" size="small" icon={<FormOutlined style={{ color: '#8b5cf6' }} />} onClick={() => router.push(`/admin/forms/builder?id=${rec.id}`)} /></Tooltip>
                    {rec.status === 'published' && <Tooltip title="Fill Form"><Button type="text" size="small" icon={<CheckCircleOutlined style={{ color: '#10b981' }} />} onClick={() => router.push(`/admin/forms/fill?id=${rec.id}`)} /></Tooltip>}
                    {rec.status === 'draft' && <Tooltip title="Publish"><Button type="text" size="small" icon={<RocketOutlined style={{ color: '#52c41a' }} />} onClick={() => handlePublish(rec.id)} /></Tooltip>}
                    <Dropdown menu={{ items: [
                        { key: 'dup', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => handleDuplicate(rec.id) },
                        { key: 'export', label: 'Export JSON', icon: <DownloadOutlined />, onClick: () => handleExport(rec.id) },
                        { key: 'share', label: 'Copy Share Link', icon: <LinkOutlined />, onClick: () => handleCopyShareLink(rec.id) },
                        { type: 'divider' as const },
                        { key: 'del', label: <Popconfirm title="Delete this template?" onConfirm={() => handleDelete(rec.id)}><span style={{ color: '#ff4d4f' }}>Delete</span></Popconfirm>, icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />, danger: true },
                    ] }}><Button type="text" size="small" icon={<MoreOutlined />} /></Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText>Form Builder</AuroraText>}
            subTitle={<DecryptedText text="Create KPI evaluations, surveys, checklists & more" speed={40} revealDirection="start" />}
            extra={[
                <Button key="import" icon={<UploadOutlined />} onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = (e: any) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }; input.click(); }}>Import</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>New Template</Button>,
            ]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {/* Stats Row */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    {[
                        { title: 'Total Forms', value: stats.total, color: '#1890ff', icon: <FormOutlined /> },
                        { title: 'Published', value: stats.published, color: '#52c41a', icon: <CheckCircleOutlined /> },
                        { title: 'KPI Forms', value: stats.kpi, color: '#f5222d', icon: <BarChartOutlined /> },
                        { title: 'Drafts', value: stats.draft, color: '#faad14', icon: <ClockCircleOutlined /> },
                    ].map((s, i) => (
                        <Col xs={12} md={6} key={i}>
                            <Card style={{ ...glass, borderLeft: `3px solid ${s.color}` }} bodyStyle={{ padding: '16px 20px' }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 24 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Filters */}
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                    <Row gutter={12} align="middle">
                        <Col flex="auto">
                            <Input prefix={<SearchOutlined />} placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 300 }} />
                        </Col>
                        <Col>
                            <Select placeholder="Category" allowClear style={{ width: 140 }} value={catFilter || undefined} onChange={v => setCatFilter(v || '')}
                                options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
                        </Col>
                        <Col>
                            <Select placeholder="Status" allowClear style={{ width: 130 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}
                                options={STATUSES.map(s => ({ value: s.value, label: s.label }))} />
                        </Col>
                    </Row>
                </Card>

                {/* Table */}
                <Card style={glass}>
                    <Table<FormTemplate>
                        dataSource={data} columns={columns} rowKey="id"
                        loading={loading} pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} templates` }}
                        size="middle"
                    />
                </Card>

                {/* Create/Edit Modal */}
                <Modal title={editRecord ? 'Edit Template' : 'New Form Template'} open={modalOpen}
                    onCancel={() => { setModalOpen(false); form.resetFields(); setEditRecord(null); }}
                    onOk={handleSave} okText={editRecord ? 'Update' : 'Create'} width={560}
                    styles={{ body: { paddingTop: 16 } }}
                >
                    <Form form={form} layout="vertical">
                        <Form.Item name="name" label="Template Name" rules={[{ required: true, message: 'Name is required' }]}>
                            <Input placeholder="e.g. Employee KPI Evaluation Q2 2026" />
                        </Form.Item>
                        <Form.Item name="description" label="Description">
                            <Input.TextArea rows={3} placeholder="Purpose and instructions for this form" />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="category" label="Category" initialValue="custom">
                                    <Select options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="tags" label="Tags">
                                    <Select mode="tags" placeholder="Add tags" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>

                {/* Detail Drawer */}
                <Drawer title={detailRecord?.name || 'Template Details'} open={detailOpen} onClose={() => { setDetailOpen(false); setDetailRecord(null); setDetailFields([]); }}
                    width={600} extra={
                        <Space>
                            {detailRecord?.status === 'draft' && <Button type="primary" size="small" icon={<RocketOutlined />} onClick={() => { handlePublish(detailRecord!.id); setDetailOpen(false); }}>Publish</Button>}
                            <Button size="small" icon={<EditOutlined />} onClick={() => { if (detailRecord) { setEditRecord(detailRecord); form.setFieldsValue({ name: detailRecord.name, description: detailRecord.description, category: detailRecord.category, tags: detailRecord.tags }); setModalOpen(true); setDetailOpen(false); } }}>Edit</Button>
                            <Button size="small" type="primary" icon={<FormOutlined />} onClick={() => { if (detailRecord) { router.push(`/admin/forms/builder?id=${detailRecord.id}`); } }} style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>Open Builder</Button>
                        </Space>
                    }
                >
                    {detailRecord && (
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <Row gutter={12}>
                                <Col span={8}><Text type="secondary">Category</Text><br />{(() => { const c = CATEGORIES.find(c => c.value === detailRecord.category); return c ? <Tag icon={c.icon} color={c.color}>{c.label}</Tag> : <Tag>{detailRecord.category}</Tag>; })()}</Col>
                                <Col span={8}><Text type="secondary">Status</Text><br /><Tag color={STATUSES.find(s => s.value === detailRecord.status)?.color}>{detailRecord.status}</Tag></Col>
                                <Col span={8}><Text type="secondary">Version</Text><br /><Text>v{detailRecord.version}</Text></Col>
                            </Row>
                            {detailRecord.description && <Paragraph type="secondary">{detailRecord.description}</Paragraph>}
                            {(detailRecord.tags?.length ?? 0) > 0 && <div>{detailRecord.tags!.map((t: string) => <Tag key={t} color="blue">{t}</Tag>)}</div>}
                            {detailRecord.scoringConfig?.grading_scale && (
                                <Card size="small" title="Grading Scale" style={{ background: '#fafafa' }}>
                                    {detailRecord.scoringConfig.grading_scale.map((g: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                            <Tag color={g.color}>{g.label}</Tag>
                                            <Text type="secondary">{g.min} – {g.max}</Text>
                                        </div>
                                    ))}
                                </Card>
                            )}
                            <Card size="small" title={`Fields (${detailFields.length})`} style={{ background: '#fafafa' }}>
                                {detailFields.length === 0 ? <Text type="secondary">No fields yet. Use the Builder to add fields.</Text> :
                                    detailFields.map((f, i) => (
                                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < detailFields.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                            <Tag color="blue" style={{ minWidth: 70, textAlign: 'center' }}>{f.fieldType}</Tag>
                                            <div style={{ flex: 1 }}>
                                                <Text strong>{f.label}</Text>
                                                {f.isRequired && <Text type="danger" style={{ marginLeft: 4 }}>*</Text>}
                                                {f.sectionTitle && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>§ {f.sectionTitle}</Text>}
                                            </div>
                                            {f.kpiConfig?.weight && <Tag color="red">{f.kpiConfig.weight}%</Tag>}
                                        </div>
                                    ))
                                }
                            </Card>
                        </Space>
                    )}
                </Drawer>
            </motion.div>
        </CMSLayout>
    );
}
