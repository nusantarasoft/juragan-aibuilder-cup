"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Space, Badge, Row, Col, Card, Statistic } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

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
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

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

    const freqDist = useMemo(() => {
        const counts: Record<string, number> = {};
        comms.forEach((c: any) => { const f = c.frequency || 'unknown'; counts[f] = (counts[f] || 0) + 1; });
        const colors: Record<string, string> = { daily: '#ef4444', weekly: '#f59e0b', biweekly: '#3b82f6', monthly: '#10b981', quarterly: '#8b5cf6', 'as_needed': '#6b7280', ad_hoc: '#f97316' };
        return Object.entries(counts).map(([freq, count]) => ({ name: freq.replace('_', ' '), value: count, color: colors[freq] || '#6b7280' }));
    }, [comms]);

    const methodDist = useMemo(() => {
        const counts: Record<string, number> = {};
        comms.forEach((c: any) => { const m = c.method || 'other'; counts[m] = (counts[m] || 0) + 1; });
        const colors: Record<string, string> = { email: '#3b82f6', meeting: '#10b981', report: '#f59e0b', dashboard: '#8b5cf6', presentation: '#6366f1', chat: '#14b8a6' };
        return Object.entries(counts).map(([method, count]) => ({ name: method.replace('_', ' '), value: count, color: colors[method] || '#6b7280' }));
    }, [comms]);

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
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${themeColor}`, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Comm Plan Items</span>} value={comms.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #3b82f6', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Status Reports</span>} value={reports.length} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #10b981', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Meetings</span>} value={meetings.length} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#10b981' }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #f59e0b', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Active Plans</span>} value={comms.filter((c: any) => c.status === 'active').length} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }} />
                    </Card>
                </Col>
            </Row>
            {comms.length > 0 && (
                <Card size="small" title={<span style={{ fontWeight: 600 }}>Communications Breakdown</span>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 130, height: 130, margin: '0 auto' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={freqDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                                            {freqDist.map((f, i) => <Cell key={i} fill={f.color} />)}
                                        </Pie>
                                        <RTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isDark ? '#e2e8f0' : '#333' }}>By Frequency</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                {freqDist.map(f => (
                                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }} />
                                        <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{f.name} ({f.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {methodDist.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: 130, height: 130, margin: '0 auto' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={methodDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                                                {methodDist.map((m, i) => <Cell key={i} fill={m.color} />)}
                                            </Pie>
                                            <RTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isDark ? '#e2e8f0' : '#333' }}>By Method</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                    {methodDist.map(m => (
                                        <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                                            <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{m.name} ({m.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}
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
