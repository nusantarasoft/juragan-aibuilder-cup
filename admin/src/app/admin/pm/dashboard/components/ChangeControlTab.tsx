"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Space, Row, Col } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, BulbOutlined, SwapOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL ───────────────────────────────────────────────
const GET_CHANGE_REQUESTS = `query($projectId: String!) { pmChangeRequests(projectId: $projectId) { id changeNumber title description reason impactScope impactSchedule impactCost impactQuality requestedBy requestedDate reviewedBy decision decisionDate decisionNotes implementationNotes priority status createdAt updatedAt } }`;
const CREATE_CR = `mutation($tenantId: String!, $input: CreatePmChangeRequestInput!) { createPmChangeRequest(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_CR = `mutation($id: ID!, $input: UpdatePmChangeRequestInput!) { updatePmChangeRequest(id: $id, input: $input) { id } }`;
const DELETE_CR = `mutation($id: ID!) { deletePmChangeRequest(id: $id) }`;

const GET_LESSONS = `query($projectId: String!) { pmLessonsLearned(projectId: $projectId) { id category title situation impact lesson recommendation submittedBy submittedDate phase tags createdAt updatedAt } }`;
const CREATE_LESSON = `mutation($tenantId: String!, $input: CreatePmLessonLearnedInput!) { createPmLessonLearned(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_LESSON = `mutation($id: ID!, $input: UpdatePmLessonLearnedInput!) { updatePmLessonLearned(id: $id, input: $input) { id } }`;
const DELETE_LESSON = `mutation($id: ID!) { deletePmLessonLearned(id: $id) }`;

export default function ChangeControlTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();

    const [changes, setChanges] = useState<any[]>([]);
    const [crLoading, setCrLoading] = useState(true);
    const [crModal, setCrModal] = useState(false);
    const [editingCr, setEditingCr] = useState<any>(null);

    const [lessons, setLessons] = useState<any[]>([]);
    const [llLoading, setLlLoading] = useState(true);
    const [llModal, setLlModal] = useState(false);
    const [editingLl, setEditingLl] = useState<any>(null);

    const loadChanges = React.useCallback(async () => {
        setCrLoading(true);
        try { const d = await gql(GET_CHANGE_REQUESTS, { projectId }); setChanges(d.pmChangeRequests || []); }
        catch { messageApi.error("Failed to load change requests."); }
        finally { setCrLoading(false); }
    }, [projectId, messageApi]);

    const loadLessons = React.useCallback(async () => {
        setLlLoading(true);
        try { const d = await gql(GET_LESSONS, { projectId }); setLessons(d.pmLessonsLearned || []); }
        catch { messageApi.error("Failed to load lessons learned."); }
        finally { setLlLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadChanges(); loadLessons(); }, [loadChanges, loadLessons]);

    // ─── Handlers ──────────────────────────────────────
    const handleCrSave = async (values: any) => {
        try {
            if (editingCr) {
                await gql(UPDATE_CR, { id: editingCr.id, input: values });
                messageApi.success("Change request updated.");
            } else {
                await gql(CREATE_CR, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Change request created.");
            }
            setCrModal(false); loadChanges();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleLlSave = async (values: any) => {
        try {
            if (editingLl) {
                await gql(UPDATE_LESSON, { id: editingLl.id, input: values });
                messageApi.success("Lesson updated.");
            } else {
                await gql(CREATE_LESSON, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Lesson recorded.");
            }
            setLlModal(false); loadLessons();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    // ─── Summary Indicators ────────────────────────────
    const pendingCr = changes.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
    const approvedCr = changes.filter(c => c.decision === 'approved').length;
    const rejectedCr = changes.filter(c => c.decision === 'rejected').length;

    // ─── Columns ───────────────────────────────────────
    const crCols: ProColumns<any>[] = [
        { title: "Change #", dataIndex: "changeNumber", width: 100 },
        { title: "Title", dataIndex: "title", width: "20%" },
        {
            title: "Priority", dataIndex: "priority",
            render: (_, r) => {
                const c = r.priority === 'critical' ? 'red' : r.priority === 'high' ? 'orange' : r.priority === 'medium' ? 'blue' : 'default';
                return <Tag color={c}>{r.priority?.toUpperCase()}</Tag>;
            }
        },
        { title: "Requested By", dataIndex: "requestedBy" },
        { title: "Date", dataIndex: "requestedDate", valueType: "date" },
        {
            title: "Status", dataIndex: "status",
            render: (_, r) => {
                const c = r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : r.status === 'implemented' ? 'cyan' : r.status === 'under_review' ? 'orange' : 'default';
                return <Tag color={c}>{r.status?.replace(/_/g, ' ').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Decision", dataIndex: "decision",
            render: (_, r) => {
                if (!r.decision || r.decision === 'pending') return <Tag>PENDING</Tag>;
                const c = r.decision === 'approved' ? 'green' : r.decision === 'rejected' ? 'red' : r.decision === 'deferred' ? 'orange' : 'default';
                return <Tag color={c}>{r.decision?.toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingCr(record); setCrModal(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={async () => { await gql(DELETE_CR, { id: record.id }); messageApi.success("Deleted."); loadChanges(); }}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    const llCols: ProColumns<any>[] = [
        { title: "Title", dataIndex: "title", width: "18%" },
        { title: "Category", dataIndex: "category", render: (_, r) => <Tag color="blue">{r.category}</Tag> },
        { title: "Phase", dataIndex: "phase", render: (_, r) => <Tag>{r.phase}</Tag> },
        {
            title: "Impact", dataIndex: "impact",
            render: (_, r) => {
                if (!r.impact) return '-';
                return <span style={{ color: '#666' }}>{r.impact.length > 60 ? r.impact.substring(0, 60) + '...' : r.impact}</span>;
            }
        },
        { title: "Date", dataIndex: "submittedDate", valueType: "date" },
        { title: "Submitted By", dataIndex: "submittedBy" },
        { title: "Recommendation", dataIndex: "recommendation", ellipsis: true },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingLl(record); setLlModal(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={async () => { await gql(DELETE_LESSON, { id: record.id }); messageApi.success("Deleted."); loadLessons(); }}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}

            {/* Change Request Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <ProCard bordered style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>{pendingCr}</div>
                        <div style={{ color: '#888' }}>Pending Review</div>
                    </ProCard>
                </Col>
                <Col span={8}>
                    <ProCard bordered style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>{approvedCr}</div>
                        <div style={{ color: '#888' }}>Approved</div>
                    </ProCard>
                </Col>
                <Col span={8}>
                    <ProCard bordered style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>{rejectedCr}</div>
                        <div style={{ color: '#888' }}>Rejected</div>
                    </ProCard>
                </Col>
            </Row>

            <Tabs defaultActiveKey="cr" items={[
                {
                    label: <Space><SwapOutlined /> Change Requests</Space>, key: 'cr',
                    children: (
                        <ProTable
                            headerTitle="Change Request Log"
                            rowKey="id"
                            dataSource={changes}
                            loading={crLoading}
                            columns={crCols}
                            search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCr(null); setCrModal(true); }}>
                                    Submit Change Request
                                </Button>
                            ]}
                        />
                    )
                },
                {
                    label: <Space><BulbOutlined /> Lessons Learned</Space>, key: 'll',
                    children: (
                        <ProTable
                            headerTitle="Lessons Learned Register"
                            rowKey="id"
                            dataSource={lessons}
                            loading={llLoading}
                            columns={llCols}
                            search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingLl(null); setLlModal(true); }}>
                                    Record Lesson
                                </Button>
                            ]}
                        />
                    )
                }
            ]} />

            {/* Change Request Modal */}
            <ModalForm
                title={editingCr ? "Edit Change Request" : "Submit Change Request"}
                open={crModal}
                onOpenChange={setCrModal}
                onFinish={handleCrSave}
                initialValues={editingCr || { status: 'submitted', priority: 'medium' }}
                modalProps={{ destroyOnClose: true }}
                width={700}
            >
                <ProForm.Group>
                    <ProFormText name="changeNumber" label="Change #" width="sm" placeholder="CR-001" />
                    <ProFormText name="title" label="Title" rules={[{ required: true }]} width="md" />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description" rules={[{ required: true }]} />
                <ProFormTextArea name="reason" label="Reason for Change" />
                <ProForm.Group>
                    <ProFormSelect name="priority" label="Priority" width="sm" options={[
                        { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
                    ]} />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'submitted', label: 'Submitted' }, { value: 'under_review', label: 'Under Review' },
                        { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
                        { value: 'implemented', label: 'Implemented' }, { value: 'deferred', label: 'Deferred' },
                    ]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="requestedBy" label="Requested By" width="md" />
                    <ProFormDatePicker name="requestedDate" label="Request Date" width="sm" />
                </ProForm.Group>
                <ProFormTextArea name="impactScope" label="Impact on Scope" />
                <ProFormTextArea name="impactSchedule" label="Impact on Schedule" />
                <ProFormTextArea name="impactCost" label="Impact on Cost" />
                <ProFormTextArea name="impactQuality" label="Impact on Quality" />
                <ProForm.Group>
                    <ProFormText name="reviewedBy" label="Reviewed By" width="md" />
                    <ProFormSelect name="decision" label="Decision" width="sm" options={[
                        { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' }, { value: 'deferred', label: 'Deferred' },
                    ]} />
                    <ProFormDatePicker name="decisionDate" label="Decision Date" width="sm" />
                </ProForm.Group>
                <ProFormTextArea name="decisionNotes" label="Decision Notes" />
                <ProFormTextArea name="implementationNotes" label="Implementation Notes" />
            </ModalForm>

            {/* Lessons Learned Modal */}
            <ModalForm
                title={editingLl ? "Edit Lesson" : "Record Lesson Learned"}
                open={llModal}
                onOpenChange={setLlModal}
                onFinish={handleLlSave}
                initialValues={editingLl || {}}
                modalProps={{ destroyOnClose: true }}
                width={700}
            >
                <ProFormText name="title" label="Title" rules={[{ required: true }]} />
                <ProForm.Group>
                    <ProFormSelect name="category" label="Category" width="sm" options={[
                        { value: 'technical', label: 'Technical' }, { value: 'process', label: 'Process' },
                        { value: 'management', label: 'Management' }, { value: 'communication', label: 'Communication' },
                        { value: 'risk', label: 'Risk' }, { value: 'quality', label: 'Quality' },
                    ]} />
                    <ProFormSelect name="phase" label="Project Phase" width="sm" options={[
                        { value: 'initiation', label: 'Initiation' }, { value: 'planning', label: 'Planning' },
                        { value: 'execution', label: 'Execution' }, { value: 'monitoring', label: 'Monitoring & Controlling' },
                        { value: 'closing', label: 'Closing' },
                    ]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDatePicker name="submittedDate" label="Date Identified" width="sm" />
                    <ProFormText name="submittedBy" label="Submitted By" width="md" />
                </ProForm.Group>
                <ProFormTextArea name="situation" label="Situation / Context" rules={[{ required: true }]} />
                <ProFormTextArea name="impact" label="Impact" />
                <ProFormTextArea name="lesson" label="Lesson Learned" />
                <ProFormTextArea name="recommendation" label="Recommendation" />
            </ModalForm>
        </div>
    );
}
