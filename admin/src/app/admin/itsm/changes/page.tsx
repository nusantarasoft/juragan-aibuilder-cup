"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Switch, DatePicker, Typography, Card, Statistic, Badge } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SwapOutlined, FileProtectOutlined, ScheduleOutlined, TeamOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_CHANGES = `query($status: String, $changeType: String, $search: String) { itsmChanges(status: $status, changeType: $changeType, search: $search) { id changeNumber title description categoryId changeType priority riskLevel status impact implementationPlan rollbackPlan testPlan scheduledStart scheduledEnd cabRequired cabDecision cabNotes cabDate requestedBy assignedTo assignedGroup reviewNotes createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const CREATE_CHANGE = `mutation($tenantId: String!, $input: CreateItsmChangeInput!) { createItsmChange(tenantId: $tenantId, input: $input) { id changeNumber } }`;
const UPDATE_CHANGE = `mutation($id: ID!, $input: UpdateItsmChangeInput!) { updateItsmChange(id: $id, input: $input) { id } }`;
const DELETE_CHANGE = `mutation($id: ID!) { deleteItsmChange(id: $id) }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const riskColors: Record<string, string> = { low: 'green', medium: 'blue', high: 'orange', critical: 'red' };
const typeColors: Record<string, string> = { standard: 'green', normal: 'blue', emergency: 'red' };
const statusColors: Record<string, string> = {
    draft: 'default', submitted: 'blue', under_review: 'cyan', approved: 'green',
    scheduled: 'geekblue', implementing: 'orange', completed: 'green', failed: 'red', cancelled: 'default',
};

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "description", label: "Description" },
    { name: "changeType", label: "Change Type" },
    { name: "priority", label: "Priority" },
    { name: "riskLevel", label: "Risk Level" },
];

export default function ItsmChangesPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [d, c] = await Promise.all([gql(GET_CHANGES, { status: filterStatus, changeType: filterType }), gql(GET_CATEGORIES)]);
            setData(d.itsmChanges || []);
            setCategories(c.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterType, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input: any = {
                title: values.title, description: values.description, categoryId: values.categoryId,
                changeType: values.changeType || 'normal', priority: values.priority || 'medium',
                riskLevel: values.riskLevel || 'medium', impact: values.impact || 'medium',
                implementationPlan: values.implementationPlan, rollbackPlan: values.rollbackPlan,
                testPlan: values.testPlan, cabRequired: values.cabRequired ?? true,
                requestedBy: values.requestedBy, assignedTo: values.assignedTo, assignedGroup: values.assignedGroup,
            };
            if (editing) {
                input.status = values.status;
                input.cabDecision = values.cabDecision;
                input.cabNotes = values.cabNotes;
                input.reviewNotes = values.reviewNotes;
                await gql(UPDATE_CHANGE, { id: editing.id, input });
                messageApi.success("Change updated.");
            } else {
                const d = await gql(CREATE_CHANGE, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success(`Change ${d.createItsmChange.changeNumber} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_CHANGE, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'changeNumber', width: 110, render: (_, r) => <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>{r.changeNumber}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Type', dataIndex: 'changeType', width: 100, render: (_, r) => <Tag color={typeColors[r.changeType]}>{(r.changeType || '').toUpperCase()}</Tag> },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (_, r) => <Tag color={priorityColors[r.priority]}>{(r.priority || '').toUpperCase()}</Tag> },
        { title: 'Risk', dataIndex: 'riskLevel', width: 80, render: (_, r) => <Tag color={riskColors[r.riskLevel]}>{(r.riskLevel || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 130, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'CAB', dataIndex: 'cabRequired', width: 70, render: (_, r) => r.cabRequired ? <Tag color="purple">Yes</Tag> : <Tag>No</Tag> },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 130, ellipsis: true },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Change Management</AuroraText>}
            subTitle={<DecryptedText text="Plan, review, and implement changes" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Changes', value: data.length, icon: <SwapOutlined />, color: '#3b82f6' },
                    { title: 'Approved', value: data.filter((d: any) => d.status === 'approved' || d.status === 'implemented').length, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'Emergency', value: data.filter((d: any) => d.changeType === 'emergency').length, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
                    { title: 'Pending Review', value: data.filter((d: any) => d.status === 'pending' || d.status === 'submitted').length, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Success Rate', value: data.length > 0 ? `${Math.round((data.filter((d: any) => d.status === 'implemented' || d.status === 'closed').length / data.length) * 100)}%` : '—', icon: <CheckCircleOutlined />, color: '#8b5cf6' },
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
                headerTitle={<Space><SwapOutlined /> Change Requests <Badge count={data.length} style={{ backgroundColor: themeColor }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 150 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'under_review', label: 'Under Review' }, { value: 'approved', label: 'Approved' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'implementing', label: 'Implementing' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }]} />,
                    <Select key="ft" placeholder="Type" allowClear style={{ width: 120 }} value={filterType} onChange={setFilterType}
                        options={[{ value: 'standard', label: 'Standard' }, { value: 'normal', label: 'Normal' }, { value: 'emergency', label: 'Emergency' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Change</Button>,
                ]}
            />

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.changeNumber}` : "New Change Request"}
                entityName="change"
                steps={[
                    {
                        title: "Change Details",
                        icon: <SwapOutlined />,
                        fields: ["title", "description"],
                        content: (
                            <>
                                <Form.Item name="title" label="Change Title" rules={[{ required: true }]}><Input placeholder="What is being changed?" /></Form.Item>
                                <Form.Item name="description" label="Description"><Input.TextArea rows={4} placeholder="Detailed change description, reason, and expected outcome" /></Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Classification & Risk",
                        icon: <FileProtectOutlined />,
                        fields: ["changeType", "categoryId", "priority", "riskLevel", "impact", "cabRequired"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="changeType" label="Change Type">
                                            <Select options={[{ value: 'standard', label: '📋 Standard' }, { value: 'normal', label: '🔄 Normal' }, { value: 'emergency', label: '🚨 Emergency' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="priority" label="Priority">
                                            <Select options={[{ value: 'critical', label: '🔴 Critical' }, { value: 'high', label: '🟠 High' }, { value: 'medium', label: '🔵 Medium' }, { value: 'low', label: '🟢 Low' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="riskLevel" label="Risk Level">
                                            <Select options={[{ value: 'low', label: '🟢 Low' }, { value: 'medium', label: '🔵 Medium' }, { value: 'high', label: '🟠 High' }, { value: 'critical', label: '🔴 Critical' }]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="categoryId" label="Category">
                                            <Select placeholder="Select" allowClear options={categories.map(c => ({ value: c.id, label: c.name }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="cabRequired" label="CAB Required?" valuePropName="checked"><Switch defaultChecked /></Form.Item>
                                    </Col>
                                </Row>
                                {editing && (
                                    <>
                                        <Form.Item name="status" label="Status">
                                            <Select options={[
                                                { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' },
                                                { value: 'under_review', label: 'Under Review' }, { value: 'approved', label: 'Approved' },
                                                { value: 'scheduled', label: 'Scheduled' }, { value: 'implementing', label: 'Implementing' },
                                                { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }, { value: 'cancelled', label: 'Cancelled' },
                                            ]} />
                                        </Form.Item>
                                        <Row gutter={16}>
                                            <Col span={12}><Form.Item name="cabDecision" label="CAB Decision"><Select allowClear options={[{ value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'deferred', label: 'Deferred' }]} /></Form.Item></Col>
                                            <Col span={12}><Form.Item name="cabNotes" label="CAB Notes"><Input /></Form.Item></Col>
                                        </Row>
                                    </>
                                )}
                            </>
                        ),
                    },
                    {
                        title: "Plans",
                        icon: <ScheduleOutlined />,
                        fields: ["implementationPlan", "rollbackPlan", "testPlan"],
                        content: (
                            <>
                                <Form.Item name="implementationPlan" label="Implementation Plan"><Input.TextArea rows={3} placeholder="Step-by-step implementation procedure" /></Form.Item>
                                <Form.Item name="rollbackPlan" label="Rollback Plan"><Input.TextArea rows={3} placeholder="How to revert if the change fails" /></Form.Item>
                                <Form.Item name="testPlan" label="Test Plan"><Input.TextArea rows={3} placeholder="How will success be validated?" /></Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Assignment",
                        icon: <TeamOutlined />,
                        fields: ["requestedBy", "assignedTo", "assignedGroup"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="requestedBy" label="Requested By"><Input placeholder="Requester name" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="assignedTo" label="Assigned To"><Input placeholder="Implementer" /></Form.Item></Col>
                                </Row>
                                <Form.Item name="assignedGroup" label="Implementation Team"><Input placeholder="e.g., Change Management Team" /></Form.Item>
                                {editing && (
                                    <Form.Item name="reviewNotes" label="Review Notes"><Input.TextArea rows={2} placeholder="Post-implementation review" /></Form.Item>
                                )}
                            </>
                        ),
                    },
                ]}
                fields={FIELDS}
                width={800}
                gradient={["#2f54eb", "#1d39c4"]}
                editMode={!!editing}
                initialValues={{ changeType: 'normal', priority: 'medium', riskLevel: 'medium', cabRequired: true }}
            />
        </div>
        </CMSLayout>
    );
}
