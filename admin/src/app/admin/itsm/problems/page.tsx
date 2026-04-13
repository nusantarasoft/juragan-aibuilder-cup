"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Switch, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, BugOutlined, SearchOutlined, TeamOutlined, ToolOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

const GET_PROBLEMS = `query($status: String, $priority: String, $search: String) { itsmProblems(status: $status, priority: $priority, search: $search) { id problemNumber title description categoryId priority status impact rootCause workaround isKnownError knowledgeArticleId assignedTo assignedGroup reporterName reporterEmail resolutionNotes resolvedAt closedAt createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const CREATE_PROBLEM = `mutation($tenantId: String!, $input: CreateItsmProblemInput!) { createItsmProblem(tenantId: $tenantId, input: $input) { id problemNumber } }`;
const UPDATE_PROBLEM = `mutation($id: ID!, $input: UpdateItsmProblemInput!) { updateItsmProblem(id: $id, input: $input) { id } }`;
const DELETE_PROBLEM = `mutation($id: ID!) { deleteItsmProblem(id: $id) }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', investigating: 'cyan', root_cause_identified: 'geekblue', known_error: 'orange', resolved: 'green', closed: 'default' };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "description", label: "Description" },
    { name: "priority", label: "Priority" },
    { name: "impact", label: "Impact" },
    { name: "assignedTo", label: "Assigned To" },
];

export default function ItsmProblemsPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
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
            const [d, c] = await Promise.all([gql(GET_PROBLEMS, { status: filterStatus, priority: filterPriority }), gql(GET_CATEGORIES)]);
            setData(d.itsmProblems || []);
            setCategories(c.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterPriority, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_PROBLEM, { id: editing.id, input: {
                    title: values.title, description: values.description, categoryId: values.categoryId,
                    priority: values.priority, status: values.status, impact: values.impact,
                    rootCause: values.rootCause, workaround: values.workaround,
                    isKnownError: values.isKnownError || false, assignedTo: values.assignedTo,
                    assignedGroup: values.assignedGroup, resolutionNotes: values.resolutionNotes,
                }});
                messageApi.success("Problem updated.");
            } else {
                const d = await gql(CREATE_PROBLEM, { tenantId: DEFAULT_TENANT_ID, input: {
                    title: values.title, description: values.description, categoryId: values.categoryId,
                    priority: values.priority || 'medium', impact: values.impact || 'medium',
                    assignedTo: values.assignedTo, assignedGroup: values.assignedGroup,
                    reporterName: values.reporterName, reporterEmail: values.reporterEmail,
                }});
                messageApi.success(`Problem ${d.createItsmProblem.problemNumber} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_PROBLEM, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'problemNumber', width: 110, render: (_, r) => <Tag color="volcano" style={{ fontFamily: 'monospace' }}>{r.problemNumber}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (_, r) => <Tag color={priorityColors[r.priority]}>{(r.priority || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 150, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Impact', dataIndex: 'impact', width: 80, render: (_, r) => <Tag>{(r.impact || '').toUpperCase()}</Tag> },
        { title: 'Known Error', dataIndex: 'isKnownError', width: 100, render: (_, r) => r.isKnownError ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 130, ellipsis: true, render: (_, r) => r.assignedTo || <Text type="secondary" italic>Unassigned</Text> },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Problem Management</AuroraText>}
            subTitle={<DecryptedText text="Root cause investigation and known errors" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><BugOutlined /> Problems</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 170 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'new', label: 'New' }, { value: 'investigating', label: 'Investigating' }, { value: 'root_cause_identified', label: 'Root Cause ID' }, { value: 'known_error', label: 'Known Error' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }]} />,
                    <Select key="fp" placeholder="Priority" allowClear style={{ width: 120 }} value={filterPriority} onChange={setFilterPriority}
                        options={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Problem</Button>,
                ]}
            />

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.problemNumber}` : "New Problem"}
                entityName="problem"
                steps={[
                    {
                        title: "Problem Details",
                        icon: <BugOutlined />,
                        fields: ["title", "description"],
                        content: (
                            <>
                                <Form.Item name="title" label="Problem Title" rules={[{ required: true }]}><Input placeholder="Describe the recurring issue" /></Form.Item>
                                <Form.Item name="description" label="Description"><Input.TextArea rows={4} placeholder="What symptoms are being observed across multiple incidents?" /></Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Classification",
                        icon: <ToolOutlined />,
                        fields: ["categoryId", "priority", "impact"],
                        content: (
                            <>
                                <Form.Item name="categoryId" label="Category">
                                    <Select placeholder="Select" allowClear options={categories.map(c => ({ value: c.id, label: c.name }))} />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="priority" label="Priority">
                                            <Select options={[{ value: 'critical', label: '🔴 Critical' }, { value: 'high', label: '🟠 High' }, { value: 'medium', label: '🔵 Medium' }, { value: 'low', label: '🟢 Low' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="impact" label="Impact">
                                            <Select options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                {editing && (
                                    <Form.Item name="status" label="Status">
                                        <Select options={[
                                            { value: 'new', label: 'New' }, { value: 'investigating', label: 'Investigating' },
                                            { value: 'root_cause_identified', label: 'Root Cause Identified' },
                                            { value: 'known_error', label: 'Known Error' },
                                            { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
                                        ]} />
                                    </Form.Item>
                                )}
                            </>
                        ),
                    },
                    {
                        title: "Root Cause Analysis",
                        icon: <SearchOutlined />,
                        fields: ["rootCause", "workaround", "isKnownError"],
                        content: (
                            <>
                                <Form.Item name="rootCause" label="Root Cause"><Input.TextArea rows={3} placeholder="What was identified as the root cause?" /></Form.Item>
                                <Form.Item name="workaround" label="Workaround"><Input.TextArea rows={3} placeholder="Temporary workaround for affected users" /></Form.Item>
                                <Form.Item name="isKnownError" label="Mark as Known Error" valuePropName="checked"><Switch /></Form.Item>
                                {editing && (
                                    <Form.Item name="resolutionNotes" label="Resolution Notes"><Input.TextArea rows={2} placeholder="How was this resolved permanently?" /></Form.Item>
                                )}
                            </>
                        ),
                    },
                    {
                        title: "Assignment",
                        icon: <TeamOutlined />,
                        fields: ["assignedTo", "assignedGroup", "reporterName", "reporterEmail"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="assignedTo" label="Assigned To"><Input placeholder="Investigator" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="assignedGroup" label="Team"><Input placeholder="e.g., Infrastructure Team" /></Form.Item></Col>
                                </Row>
                                {!editing && (
                                    <Row gutter={16}>
                                        <Col span={12}><Form.Item name="reporterName" label="Reporter Name"><Input /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="reporterEmail" label="Reporter Email"><Input /></Form.Item></Col>
                                    </Row>
                                )}
                            </>
                        ),
                    },
                ]}
                fields={FIELDS}
                width={750}
                gradient={["#fa541c", "#d4380d"]}
                editMode={!!editing}
                initialValues={{ priority: 'medium', impact: 'medium' }}
            />
        </div>
        </CMSLayout>
    );
}
