"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    Statistic,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, CheckOutlined,
    ExclamationCircleOutlined, ClockCircleOutlined,
    BugOutlined, QuestionCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

interface SupportCase {
    id: string; caseNumber: string; subject: string; description: string;
    status: string; priority: string; origin: string; type: string;
    contactId: string; accountId: string; resolution: string; closedAt: string;
    contactName: string; accountName: string; createdAt: string;
}

const STATUSES = [
    { value: "new", label: "New", color: "blue" },
    { value: "working", label: "Working", color: "orange" },
    { value: "escalated", label: "Escalated", color: "red" },
    { value: "closed", label: "Closed", color: "default" },
];

const PRIORITIES = [
    { value: "low", label: "Low", color: "default" },
    { value: "medium", label: "Medium", color: "blue" },
    { value: "high", label: "High", color: "orange" },
    { value: "critical", label: "Critical", color: "red" },
];

const ORIGINS = ["web", "phone", "email", "chat"];
const CASE_TYPES = [
    { value: "question", label: "Question" },
    { value: "problem", label: "Problem" },
    { value: "feature_request", label: "Feature Request" },
    { value: "incident", label: "Incident" },
];

export default function CasesPage() {
    const [cases, setCases] = useState<SupportCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<SupportCase | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<SupportCase | null>(null);
    const [closeModal, setCloseModal] = useState(false);
    const [closeTarget, setCloseTarget] = useState<SupportCase | null>(null);
    const [resolution, setResolution] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!, $status: String, $priority: String, $search: String) {
                    cases(tenantId: $tenantId, status: $status, priority: $priority, search: $search) {
                        id caseNumber subject description status priority origin type
                        contactId accountId resolution closedAt
                        contactName accountName createdAt
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, status: statusFilter || null, priority: priorityFilter || null, search: search || null });
            setCases(data.cases || []);
        } catch (err: any) { message.error("Failed to load: " + err.message); }
        finally { setLoading(false); }
    }, [search, statusFilter, priorityFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        try {
            const v = await form.validateFields();
            const input = {
                subject: v.subject, description: v.description || null,
                status: v.status || 'new', priority: v.priority || 'medium',
                origin: v.origin || null, type: v.type || null,
            };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateCaseInput!) { updateCase(id: $id, input: $input) { id } }`, { id: editing.id, input });
                message.success("Case updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateCaseInput!) { createCase(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Case created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleClose = async () => {
        if (!closeTarget || !resolution.trim()) { message.warning("Resolution required"); return; }
        try {
            await gql(`mutation($id: String!, $resolution: String!) { closeCase(id: $id, resolution: $resolution) { id } }`, { id: closeTarget.id, resolution });
            message.success("Case closed"); setCloseModal(false); setCloseTarget(null); setResolution(""); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteCase(id: $id) }`, { id });
            message.success("Deleted"); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const openCount = cases.filter(c => c.status !== 'closed').length;
    const criticalCount = cases.filter(c => c.priority === 'critical' && c.status !== 'closed').length;
    const closedCount = cases.filter(c => c.status === 'closed').length;

    const columns: ColumnsType<SupportCase> = [
        { title: "#", dataIndex: "caseNumber", key: "num", width: 100, render: v => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        {
            title: "Subject", key: "subject",
            render: (_, r) => (
                <div>
                    <Text strong>{r.subject}</Text>
                    {r.accountName && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.accountName}</Text></>}
                </div>
            ),
        },
        { title: "Priority", key: "priority", width: 100, render: (_, r) => { const p = PRIORITIES.find(p => p.value === r.priority); return <Tag color={p?.color}>{p?.label || r.priority}</Tag>; } },
        { title: "Status", key: "status", width: 110, render: (_, r) => { const s = STATUSES.find(s => s.value === r.status); return <Tag color={s?.color}>{s?.label || r.status}</Tag>; } },
        { title: "Origin", key: "origin", width: 80, render: (_, r) => r.origin ? <Tag>{r.origin}</Tag> : '—' },
        { title: "Type", key: "type", width: 120, render: (_, r) => r.type ? <Tag>{r.type.replace('_', ' ')}</Tag> : '—' },
        { title: "Created", key: "created", width: 110, render: (_, r) => dayjs(r.createdAt).format('MMM D, YYYY') },
        {
            title: "Actions", key: "actions", width: 150,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
                    {r.status !== 'closed' && <Tooltip title="Close Case"><Button type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }}
                        onClick={() => { setCloseTarget(r); setResolution(""); setCloseModal(true); }} /></Tooltip>}
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r); form.setFieldsValue({
                            subject: r.subject, description: r.description,
                            status: r.status, priority: r.priority,
                            origin: r.origin, type: r.type,
                        }); setIsModalOpen(true);
                    }} /></Tooltip>
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete ${r.caseNumber}?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout title="Cases" subTitle="Customer support cases and issue tracking" extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>New Case</Button>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card><Statistic title="Open" value={openCount} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#1677ff' }} /></Card></Col>
                <Col span={6}><Card><Statistic title="Critical" value={criticalCount} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: criticalCount > 0 ? '#ff4d4f' : undefined }} /></Card></Col>
                <Col span={6}><Card><Statistic title="Closed" value={closedCount} prefix={<CheckOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total" value={cases.length} prefix={<BugOutlined />} /></Card></Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 130 }} options={STATUSES} />
                    <Select placeholder="Priority" value={priorityFilter} onChange={setPriorityFilter} allowClear style={{ width: 130 }} options={PRIORITIES} />
                </Space>
            </Card>

            <Card><Table columns={columns} dataSource={cases.map(c => ({ ...c, key: c.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>

            <Modal title={editing ? "Edit Case" : "New Case"} open={isModalOpen} onOk={handleSave}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} okText={editing ? "Update" : "Create"} width={600}>
                <Form form={form} layout="vertical">
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input placeholder="Brief issue description" /></Form.Item>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="priority" label="Priority" initialValue="medium"><Select options={PRIORITIES} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="origin" label="Origin"><Select allowClear options={ORIGINS.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="type" label="Type"><Select allowClear options={CASE_TYPES} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
                </Form>
            </Modal>

            <Modal title={`Close Case: ${closeTarget?.caseNumber}`} open={closeModal} okText="Close Case"
                okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
                onOk={handleClose} onCancel={() => { setCloseModal(false); setCloseTarget(null); }}>
                <p>Provide a resolution for this case:</p>
                <TextArea rows={4} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how the issue was resolved..." />
            </Modal>

            <Drawer title="Case Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Case #"><Text code>{selected.caseNumber}</Text></Descriptions.Item>
                        <Descriptions.Item label="Subject">{selected.subject}</Descriptions.Item>
                        <Descriptions.Item label="Priority"><Tag color={PRIORITIES.find(p => p.value === selected.priority)?.color}>{selected.priority}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUSES.find(s => s.value === selected.status)?.color}>{selected.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Origin">{selected.origin || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Type">{selected.type?.replace('_', ' ') || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Contact">{selected.contactName || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Account">{selected.accountName || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Description">{selected.description || '—'}</Descriptions.Item>
                        {selected.resolution && <Descriptions.Item label="Resolution">{selected.resolution}</Descriptions.Item>}
                        {selected.closedAt && <Descriptions.Item label="Closed At">{dayjs(selected.closedAt).format('MMM D, YYYY HH:mm')}</Descriptions.Item>}
                        <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </CMSLayout>
    );
}
