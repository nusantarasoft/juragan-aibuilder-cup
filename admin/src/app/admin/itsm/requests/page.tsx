"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Typography, Card, Statistic, Badge, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, ReconciliationOutlined, ShopOutlined, UserOutlined, TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_REQUESTS = `query($status: String, $priority: String, $search: String) { itsmServiceRequests(status: $status, priority: $priority, search: $search) { id requestNumber title description catalogItemId categoryId priority status requestedFor requesterName requesterEmail fulfillmentGroup fulfilledBy fulfilledAt notes slaDue createdAt } }`;
const GET_CATALOG = `query { itsmCatalogItems(status: "active") { id catalogCode name } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const CREATE_REQUEST = `mutation($tenantId: String!, $input: CreateItsmServiceRequestInput!) { createItsmServiceRequest(tenantId: $tenantId, input: $input) { id requestNumber } }`;
const UPDATE_REQUEST = `mutation($id: ID!, $input: UpdateItsmServiceRequestInput!) { updateItsmServiceRequest(id: $id, input: $input) { id } }`;
const DELETE_REQUEST = `mutation($id: ID!) { deleteItsmServiceRequest(id: $id) }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { submitted: 'blue', pending_approval: 'orange', approved: 'cyan', in_fulfillment: 'geekblue', fulfilled: 'green', rejected: 'red', cancelled: 'default' };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "description", label: "Description" },
    { name: "requesterName", label: "Requester" },
    { name: "requesterEmail", label: "Email" },
    { name: "priority", label: "Priority" },
];

export default function ItsmRequestsPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [d, cat, cats] = await Promise.all([
                gql(GET_REQUESTS, { status: filterStatus, priority: filterPriority }),
                gql(GET_CATALOG), gql(GET_CATEGORIES),
            ]);
            setData(d.itsmServiceRequests || []);
            setCatalogItems(cat.itsmCatalogItems || []);
            setCategories(cats.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterPriority, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input = {
                title: values.title, description: values.description,
                catalogItemId: values.catalogItemId, categoryId: values.categoryId,
                priority: values.priority || 'medium', requestedFor: values.requestedFor,
                requesterName: values.requesterName, requesterEmail: values.requesterEmail,
                fulfillmentGroup: values.fulfillmentGroup,
            };
            if (editing) {
                await gql(UPDATE_REQUEST, { id: editing.id, input: { ...input, status: values.status, fulfilledBy: values.fulfilledBy, notes: values.notes } });
                messageApi.success("Request updated.");
            } else {
                const d = await gql(CREATE_REQUEST, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success(`Request ${d.createItsmServiceRequest.requestNumber} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_REQUEST, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'requestNumber', width: 100, render: (_, r) => <Tag color="green" style={{ fontFamily: 'monospace' }}>{r.requestNumber}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (_, r) => <Tag color={priorityColors[r.priority]}>{(r.priority || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 130, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Requester', dataIndex: 'requesterName', width: 140, ellipsis: true },
        { title: 'Requested For', dataIndex: 'requestedFor', width: 140, ellipsis: true, render: (_, r) => r.requestedFor || <Text type="secondary" italic>Self</Text> },
        { title: 'Fulfillment', dataIndex: 'fulfillmentGroup', width: 130, ellipsis: true },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Service Requests</AuroraText>}
            subTitle={<DecryptedText text="Manage user service requests" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Requests', value: data.length, icon: <ReconciliationOutlined />, color: '#3b82f6' },
                    { title: 'Open', value: data.filter((d: any) => d.status === 'open' || d.status === 'in_progress' || d.status === 'pending').length, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Fulfilled', value: data.filter((d: any) => d.status === 'fulfilled' || d.status === 'closed').length, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'High Priority', value: data.filter((d: any) => d.priority === 'high' || d.priority === 'critical').length, icon: <ReconciliationOutlined />, color: '#ef4444' },
                    { title: 'Avg Score', value: data.length > 0 ? (data.reduce((s: number, d: any) => s + (d.satisfaction || 0), 0) / data.filter((d: any) => d.satisfaction).length || 0).toFixed(1) : '—', icon: <UserOutlined />, color: '#8b5cf6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={Math.floor(24 / 5)}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <ProTable
                headerTitle={<Space><ReconciliationOutlined /> Service Requests <Badge count={data.length} style={{ backgroundColor: themeColor }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 150 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'submitted', label: 'Submitted' }, { value: 'pending_approval', label: 'Pending Approval' }, { value: 'approved', label: 'Approved' }, { value: 'in_fulfillment', label: 'In Fulfillment' }, { value: 'fulfilled', label: 'Fulfilled' }, { value: 'rejected', label: 'Rejected' }]} />,
                    <Select key="fp" placeholder="Priority" allowClear style={{ width: 120 }} value={filterPriority} onChange={setFilterPriority}
                        options={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Request</Button>,
                    <Tooltip key="excel" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => {
                        exportToExcel({
                            fileName: 'itsm_requests',
                            title: 'Service Requests Report',
                            dateRange: { start: startDate, end: endDate },
                            columns: [
                                { header: 'Request #', key: 'requestNumber' },
                                { header: 'Title', key: 'title' },
                                { header: 'Priority', key: 'priority' },
                                { header: 'Status', key: 'status', format: v => (v || '').replace(/_/g, ' ') },
                                { header: 'Requester', key: 'requesterName' },
                                { header: 'Fulfillment Group', key: 'fulfillmentGroup' },
                            ],
                            data,
                        });
                    }} /></Tooltip>,
                    <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => {
                        exportToPdf({
                            fileName: 'itsm_requests',
                            title: 'Service Requests Report',
                            dateRange: { start: startDate, end: endDate },
                            columns: [
                                { header: 'Request #', key: 'requestNumber' },
                                { header: 'Title', key: 'title' },
                                { header: 'Priority', key: 'priority' },
                                { header: 'Status', key: 'status', format: v => (v || '').replace(/_/g, ' ') },
                                { header: 'Requester', key: 'requesterName' },
                                { header: 'Fulfillment Group', key: 'fulfillmentGroup' },
                            ],
                            data,
                        });
                    }} /></Tooltip>,
                ]}
            />

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.requestNumber}` : "New Service Request"}
                entityName="request"
                steps={[
                    {
                        title: "Request Details",
                        icon: <ReconciliationOutlined />,
                        fields: ["title", "description", "catalogItemId"],
                        content: (
                            <>
                                <Form.Item name="catalogItemId" label="Catalog Item">
                                    <Select placeholder="Select from catalog (optional)" allowClear showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                        options={catalogItems.map(c => ({ value: c.id, label: `${c.catalogCode} — ${c.name}` }))} />
                                </Form.Item>
                                <Form.Item name="title" label="Request Title" rules={[{ required: true }]}><Input placeholder="What do you need?" /></Form.Item>
                                <Form.Item name="description" label="Details"><Input.TextArea rows={3} placeholder="Additional details..." /></Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Classification",
                        icon: <ShopOutlined />,
                        fields: ["categoryId", "priority"],
                        content: (
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="categoryId" label="Category">
                                        <Select placeholder="Select" allowClear options={categories.map(c => ({ value: c.id, label: c.name }))} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="priority" label="Priority">
                                        <Select options={[{ value: 'critical', label: '🔴 Critical' }, { value: 'high', label: '🟠 High' }, { value: 'medium', label: '🔵 Medium' }, { value: 'low', label: '🟢 Low' }]} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        title: "Requester",
                        icon: <UserOutlined />,
                        fields: ["requesterName", "requesterEmail", "requestedFor"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="requesterName" label="Requester Name"><Input placeholder="Your name" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="requesterEmail" label="Email"><Input placeholder="email@company.com" /></Form.Item></Col>
                                </Row>
                                <Form.Item name="requestedFor" label="Requested For (if different)"><Input placeholder="Person this request is for" /></Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Fulfillment",
                        icon: <TeamOutlined />,
                        fields: ["fulfillmentGroup", ...(editing ? ["status", "fulfilledBy", "notes"] : [])],
                        content: (
                            <>
                                <Form.Item name="fulfillmentGroup" label="Fulfillment Group"><Input placeholder="e.g., IT Service Desk" /></Form.Item>
                                {editing && (
                                    <>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="status" label="Status">
                                                    <Select options={[
                                                        { value: 'submitted', label: 'Submitted' }, { value: 'pending_approval', label: 'Pending Approval' },
                                                        { value: 'approved', label: 'Approved' }, { value: 'in_fulfillment', label: 'In Fulfillment' },
                                                        { value: 'fulfilled', label: 'Fulfilled' }, { value: 'rejected', label: 'Rejected' }, { value: 'cancelled', label: 'Cancelled' },
                                                    ]} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}><Form.Item name="fulfilledBy" label="Fulfilled By"><Input placeholder="Agent name" /></Form.Item></Col>
                                        </Row>
                                        <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                                    </>
                                )}
                            </>
                        ),
                    },
                ]}
                fields={FIELDS}
                width={700}
                gradient={["#52c41a", "#389e0d"]}
                editMode={!!editing}
                initialValues={{ priority: 'medium' }}
            />
        </div>
        </CMSLayout>
    );
}
