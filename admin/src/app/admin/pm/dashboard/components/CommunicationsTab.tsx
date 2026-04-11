"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Space, Descriptions, Badge } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined, MailOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL ───────────────────────────────────────────────
const GET_COMM_PLANS = `query($projectId: String!) { pmCommPlans(projectId: $projectId) { id communicationItem targetAudience frequency method responsiblePerson keyMessage notes status } }`;
const CREATE_COMM = `mutation($tenantId: String!, $input: CreatePmCommPlanInput!) { createPmCommPlan(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_COMM = `mutation($id: ID!, $input: UpdatePmCommPlanInput!) { updatePmCommPlan(id: $id, input: $input) { id } }`;
const DELETE_COMM = `mutation($id: ID!) { deletePmCommPlan(id: $id) }`;

const GET_STATUS_REPORTS = `query($projectId: String!) { pmStatusReports(projectId: $projectId) { id reportDate reportPeriod overallHealth scheduleHealth costHealth scopeHealth accomplishments plannedActivities issuesAndRisks decisionsNeeded preparedBy } }`;
const CREATE_STATUS = `mutation($tenantId: String!, $input: CreatePmStatusReportInput!) { createPmStatusReport(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_STATUS = `mutation($id: ID!, $input: UpdatePmStatusReportInput!) { updatePmStatusReport(id: $id, input: $input) { id } }`;
const DELETE_STATUS = `mutation($id: ID!) { deletePmStatusReport(id: $id) }`;

const GET_MEETINGS = `query($projectId: String!) { pmMeetingMinutes(projectId: $projectId) { id meetingType meetingDate title attendees agenda discussion decisions nextMeetingDate } }`;
const CREATE_MEETING = `mutation($tenantId: String!, $input: CreatePmMeetingMinutesInput!) { createPmMeetingMinutes(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_MEETING = `mutation($id: ID!, $input: UpdatePmMeetingMinutesInput!) { updatePmMeetingMinutes(id: $id, input: $input) { id } }`;
const DELETE_MEETING = `mutation($id: ID!) { deletePmMeetingMinutes(id: $id) }`;

const AI_COMM_PLAN = `query($projectId: String!) { generateCommPlan(projectId: $projectId) }`;

export default function CommunicationsTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();

    const [comms, setComms] = useState<any[]>([]);
    const [commLoading, setCommLoading] = useState(true);
    const [commModal, setCommModal] = useState(false);
    const [editingComm, setEditingComm] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const [reports, setReports] = useState<any[]>([]);
    const [repLoading, setRepLoading] = useState(true);
    const [repModal, setRepModal] = useState(false);
    const [editingRep, setEditingRep] = useState<any>(null);

    const [meetings, setMeetings] = useState<any[]>([]);
    const [meetLoading, setMeetLoading] = useState(true);
    const [meetModal, setMeetModal] = useState(false);
    const [editingMeet, setEditingMeet] = useState<any>(null);

    const loadComms = React.useCallback(async () => {
        setCommLoading(true);
        try { const d = await gql(GET_COMM_PLANS, { projectId }); setComms(d.pmCommPlans || []); }
        catch { messageApi.error("Failed to load comm plans."); }
        finally { setCommLoading(false); }
    }, [projectId, messageApi]);

    const loadReports = React.useCallback(async () => {
        setRepLoading(true);
        try { const d = await gql(GET_STATUS_REPORTS, { projectId }); setReports(d.pmStatusReports || []); }
        catch { messageApi.error("Failed to load status reports."); }
        finally { setRepLoading(false); }
    }, [projectId, messageApi]);

    const loadMeetings = React.useCallback(async () => {
        setMeetLoading(true);
        try { const d = await gql(GET_MEETINGS, { projectId }); setMeetings(d.pmMeetingMinutes || []); }
        catch { messageApi.error("Failed to load meeting minutes."); }
        finally { setMeetLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadComms(); loadReports(); loadMeetings(); }, [loadComms, loadReports, loadMeetings]);

    const handleAiComm = async () => {
        setAiLoading(true);
        try {
            const d = await gql(AI_COMM_PLAN, { projectId });
            const raw = d.generateCommPlan;
            // AI returns { communications: [...] } or a JSON string
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const items = Array.isArray(parsed) ? parsed : (parsed?.communications || parsed?.items || []);
            for (const item of items) {
                await gql(CREATE_COMM, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId, communicationItem: item.communicationItem || item.title,
                        targetAudience: item.targetAudience, frequency: item.frequency,
                        method: item.method, responsiblePerson: item.responsiblePerson, status: 'active'
                    }
                });
            }
            messageApi.success(`Added ${items.length} comm items from AI.`);
            loadComms();
        } catch (err: any) { messageApi.error(`AI failed: ${err.message}`); }
        finally { setAiLoading(false); }
    };

    // ─── Helper for save/delete ────────────────────────
    const makeSaveHandler = (createQ: string, updateQ: string, loadFn: () => void, setModal: (v: boolean) => void, editObj: any, name: string) =>
        async (values: any) => {
            try {
                if (editObj) {
                    await gql(updateQ, { id: editObj.id, input: values }); messageApi.success(`${name} updated.`);
                } else {
                    await gql(createQ, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } }); messageApi.success(`${name} created.`);
                }
                setModal(false); loadFn(); return true;
            } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
        };

    const makeDeleteHandler = (deleteQ: string, loadFn: () => void) =>
        async (id: string) => { await gql(deleteQ, { id }); messageApi.success("Deleted."); loadFn(); };

    const healthColor = (h: string) => h === 'green' ? 'success' : h === 'yellow' ? 'warning' : h === 'red' ? 'error' : 'default';

    // ─── Columns ───────────────────────────────────────
    const commCols: ProColumns<any>[] = [
        { title: "Communication Item", dataIndex: "communicationItem", width: "22%" },
        { title: "Audience", dataIndex: "targetAudience" },
        { title: "Frequency", dataIndex: "frequency", render: (_, r) => <Tag>{r.frequency}</Tag> },
        { title: "Method", dataIndex: "method" },
        { title: "Responsible", dataIndex: "responsiblePerson" },
        { title: "Status", dataIndex: "status", render: (_, r) => <Tag color={r.status === 'active' ? 'green' : 'default'}>{r.status?.toUpperCase()}</Tag> },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="e" type="text" icon={<EditOutlined />} onClick={() => { setEditingComm(record); setCommModal(true); }} />,
                <Popconfirm key="d" title="Delete?" onConfirm={() => makeDeleteHandler(DELETE_COMM, loadComms)(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    const reportCols: ProColumns<any>[] = [
        { title: "Date", dataIndex: "reportDate", valueType: "date", width: 120 },
        { title: "Period", dataIndex: "reportPeriod" },
        { title: "Overall", dataIndex: "overallHealth", render: (_, r) => <Badge status={healthColor(r.overallHealth) as any} text={r.overallHealth?.toUpperCase()} /> },
        { title: "Schedule", dataIndex: "scheduleHealth", render: (_, r) => <Badge status={healthColor(r.scheduleHealth) as any} text={r.scheduleHealth?.toUpperCase()} /> },
        { title: "Cost", dataIndex: "costHealth", render: (_, r) => <Badge status={healthColor(r.costHealth) as any} text={r.costHealth?.toUpperCase()} /> },
        { title: "Scope", dataIndex: "scopeHealth", render: (_, r) => <Badge status={healthColor(r.scopeHealth) as any} text={r.scopeHealth?.toUpperCase()} /> },
        { title: "Prepared By", dataIndex: "preparedBy" },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="e" type="text" icon={<EditOutlined />} onClick={() => { setEditingRep(record); setRepModal(true); }} />,
                <Popconfirm key="d" title="Delete?" onConfirm={() => makeDeleteHandler(DELETE_STATUS, loadReports)(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    const meetCols: ProColumns<any>[] = [
        { title: "Date", dataIndex: "meetingDate", valueType: "date", width: 120 },
        { title: "Type", dataIndex: "meetingType", render: (_, r) => <Tag color="blue">{r.meetingType}</Tag> },
        { title: "Title", dataIndex: "title", width: "20%" },
        { title: "Attendees", dataIndex: "attendees", ellipsis: true },
        { title: "Decisions", dataIndex: "decisions", ellipsis: true },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="e" type="text" icon={<EditOutlined />} onClick={() => { setEditingMeet(record); setMeetModal(true); }} />,
                <Popconfirm key="d" title="Delete?" onConfirm={() => makeDeleteHandler(DELETE_MEETING, loadMeetings)(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <Tabs defaultActiveKey="comm" items={[
                {
                    label: 'Communications Plan', key: 'comm',
                    children: (
                        <ProTable headerTitle="Communications Management Plan" rowKey="id" dataSource={comms} loading={commLoading} columns={commCols} search={false}
                            toolBarRender={() => [
                                <Button key="ai" type="dashed" icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiComm}>Generate Plan (AI)</Button>,
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingComm(null); setCommModal(true); }}>Add Item</Button>
                            ]}
                        />
                    )
                },
                {
                    label: 'Status Reports', key: 'status',
                    children: (
                        <ProTable headerTitle="Project Status Reports" rowKey="id" dataSource={reports} loading={repLoading} columns={reportCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRep(null); setRepModal(true); }}>New Report</Button>
                            ]}
                        />
                    )
                },
                {
                    label: 'Meeting Minutes', key: 'meetings',
                    children: (
                        <ProTable headerTitle="Meeting Minutes" rowKey="id" dataSource={meetings} loading={meetLoading} columns={meetCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingMeet(null); setMeetModal(true); }}>New Minutes</Button>
                            ]}
                        />
                    )
                }
            ]} />

            {/* Comm Plan Modal */}
            <ModalForm title={editingComm ? "Edit" : "Add Communication Item"} open={commModal} onOpenChange={setCommModal}
                onFinish={makeSaveHandler(CREATE_COMM, UPDATE_COMM, loadComms, setCommModal, editingComm, "Item")}
                initialValues={editingComm || { status: 'active' }} modalProps={{ destroyOnClose: true }}>
                <ProFormText name="communicationItem" label="Communication Item" rules={[{ required: true }]} />
                <ProForm.Group>
                    <ProFormText name="targetAudience" label="Target Audience" width="md" />
                    <ProFormSelect name="frequency" label="Frequency" width="sm" options={[
                        { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
                        { value: 'bi_weekly', label: 'Bi-Weekly' }, { value: 'monthly', label: 'Monthly' },
                        { value: 'quarterly', label: 'Quarterly' }, { value: 'as_needed', label: 'As Needed' },
                    ]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="method" label="Method" width="sm" placeholder="e.g. Email, Meeting, Report" />
                    <ProFormText name="responsiblePerson" label="Responsible" width="md" />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
                    ]} />
                </ProForm.Group>
                <ProFormTextArea name="keyMessage" label="Key Message" />
            </ModalForm>

            {/* Status Report Modal */}
            <ModalForm title={editingRep ? "Edit Report" : "New Status Report"} open={repModal} onOpenChange={setRepModal}
                onFinish={makeSaveHandler(CREATE_STATUS, UPDATE_STATUS, loadReports, setRepModal, editingRep, "Report")}
                initialValues={editingRep || { overallHealth: 'green', scheduleHealth: 'green', costHealth: 'green', scopeHealth: 'green' }}
                modalProps={{ destroyOnClose: true }} width={800}>
                <ProForm.Group>
                    <ProFormDatePicker name="reportDate" label="Report Date" width="sm" />
                    <ProFormText name="reportPeriod" label="Report Period" width="md" placeholder="e.g. Week 12, Sprint 3" />
                    <ProFormText name="preparedBy" label="Prepared By" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormSelect name="overallHealth" label="Overall" width="xs" options={[
                        { value: 'green', label: '🟢 Green' }, { value: 'yellow', label: '🟡 Yellow' }, { value: 'red', label: '🔴 Red' },
                    ]} />
                    <ProFormSelect name="scheduleHealth" label="Schedule" width="xs" options={[
                        { value: 'green', label: '🟢 Green' }, { value: 'yellow', label: '🟡 Yellow' }, { value: 'red', label: '🔴 Red' },
                    ]} />
                    <ProFormSelect name="costHealth" label="Cost" width="xs" options={[
                        { value: 'green', label: '🟢 Green' }, { value: 'yellow', label: '🟡 Yellow' }, { value: 'red', label: '🔴 Red' },
                    ]} />
                    <ProFormSelect name="scopeHealth" label="Scope" width="xs" options={[
                        { value: 'green', label: '🟢 Green' }, { value: 'yellow', label: '🟡 Yellow' }, { value: 'red', label: '🔴 Red' },
                    ]} />
                </ProForm.Group>
                <ProFormTextArea name="accomplishments" label="Key Accomplishments" />
                <ProFormTextArea name="plannedActivities" label="Planned Activities (Next Period)" />
                <ProFormTextArea name="issuesAndRisks" label="Issues & Risks" />
                <ProFormTextArea name="decisionsNeeded" label="Decisions Needed" />
            </ModalForm>

            {/* Meeting Minutes Modal */}
            <ModalForm title={editingMeet ? "Edit Minutes" : "New Meeting Minutes"} open={meetModal} onOpenChange={setMeetModal}
                onFinish={makeSaveHandler(CREATE_MEETING, UPDATE_MEETING, loadMeetings, setMeetModal, editingMeet, "Minutes")}
                initialValues={editingMeet || {}} modalProps={{ destroyOnClose: true }} width={700}>
                <ProForm.Group>
                    <ProFormSelect name="meetingType" label="Meeting Type" width="sm" options={[
                        { value: 'standup', label: 'Daily Standup' }, { value: 'planning', label: 'Sprint Planning' },
                        { value: 'review', label: 'Sprint Review' }, { value: 'retrospective', label: 'Retrospective' },
                        { value: 'steering', label: 'Steering Committee' }, { value: 'kickoff', label: 'Kickoff' },
                        { value: 'other', label: 'Other' },
                    ]} />
                    <ProFormDatePicker name="meetingDate" label="Date" width="sm" />
                </ProForm.Group>
                <ProFormText name="title" label="Meeting Title" rules={[{ required: true }]} />
                <ProFormText name="attendees" label="Attendees" placeholder="Comma-separated names" />
                <ProFormTextArea name="agenda" label="Agenda" />
                <ProFormTextArea name="discussion" label="Discussion Summary" />
                <ProFormTextArea name="decisions" label="Key Decisions" />
                <ProFormDatePicker name="nextMeetingDate" label="Next Meeting Date" />
            </ModalForm>
        </div>
    );
}
