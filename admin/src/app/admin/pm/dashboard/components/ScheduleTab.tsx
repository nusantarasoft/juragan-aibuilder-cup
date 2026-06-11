"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProFormSelect, ProFormDatePicker, ProFormDigit } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Space, Progress, Row, Col, Card, Statistic, Empty, Timeline } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined, FlagOutlined, CalendarOutlined, NodeIndexOutlined, CheckCircleOutlined, WarningOutlined, ToolOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

// ─── GraphQL ───────────────────────────────────────────────
const GET_MILESTONES = `query($projectId: String!) { pmMilestones(projectId: $projectId) { id name description dueDate completedDate percentComplete isCritical status sortOrder } }`;
const CREATE_MILESTONE = `mutation($tenantId: String!, $input: CreatePmMilestoneInput!) { createPmMilestone(tenantId: $tenantId, input: $input) { id name } }`;
const UPDATE_MILESTONE = `mutation($id: ID!, $input: UpdatePmMilestoneInput!) { updatePmMilestone(id: $id, input: $input) { id name } }`;
const DELETE_MILESTONE = `mutation($id: ID!) { deletePmMilestone(id: $id) }`;

const GET_ACTIVITIES = `query($projectId: String!) { pmActivities(projectId: $projectId) }`;
const CREATE_ACTIVITY = `mutation($tenantId: String!, $input: JSON!) { createPmActivity(tenantId: $tenantId, input: $input) }`;
const UPDATE_ACTIVITY = `mutation($id: ID!, $input: JSON!) { updatePmActivity(id: $id, input: $input) }`;
const DELETE_ACTIVITY = `mutation($id: ID!) { deletePmActivity(id: $id) }`;

const AI_GENERATE_SCHEDULE = `query($projectId: String!) { generateScheduleFromWbs(projectId: $projectId) }`;

export default function ScheduleTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    // Milestones state
    const [milestones, setMilestones] = useState<any[]>([]);
    const [msLoading, setMsLoading] = useState(true);
    const [msModal, setMsModal] = useState(false);
    const [editingMs, setEditingMs] = useState<any>(null);

    // Activities state
    const [activities, setActivities] = useState<any[]>([]);
    const [actLoading, setActLoading] = useState(true);
    const [actModal, setActModal] = useState(false);
    const [editingAct, setEditingAct] = useState<any>(null);

    const [aiLoading, setAiLoading] = useState(false);

    // ─── Loaders ───────────────────────────────────────
    const loadMilestones = useCallback(async () => {
        setMsLoading(true);
        try {
            const d = await gql(GET_MILESTONES, { projectId });
            setMilestones(d.pmMilestones || []);
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to load milestones."); }
        finally { setMsLoading(false); }
    }, [projectId, messageApi]);

    const loadActivities = useCallback(async () => {
        setActLoading(true);
        try {
            const d = await gql(GET_ACTIVITIES, { projectId });
            setActivities(d.pmActivities || []);
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to load activities."); }
        finally { setActLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadMilestones(); loadActivities(); }, [loadMilestones, loadActivities]);

    // ─── Milestone Handlers ──────────────────────────────
    const handleMsSave = async (values: any) => {
        try {
            if (editingMs) {
                await gql(UPDATE_MILESTONE, { id: editingMs.id, input: values });
                messageApi.success("Milestone updated.");
            } else {
                await gql(CREATE_MILESTONE, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Milestone created.");
            }
            setMsModal(false); loadMilestones();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleMsDelete = async (id: string) => {
        try { await gql(DELETE_MILESTONE, { id }); messageApi.success("Milestone deleted."); loadMilestones(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    // ─── Activity Handlers ──────────────────────────────
    const handleActSave = async (values: any) => {
        try {
            if (editingAct) {
                await gql(UPDATE_ACTIVITY, { id: editingAct.id, input: values });
                messageApi.success("Activity updated.");
            } else {
                await gql(CREATE_ACTIVITY, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Activity created.");
            }
            setActModal(false); loadActivities();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleActDelete = async (id: string) => {
        try { await gql(DELETE_ACTIVITY, { id }); messageApi.success("Activity deleted."); loadActivities(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    // ─── AI Generate ──────────────────────────────────────
    const handleAiSchedule = async () => {
        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_SCHEDULE, { projectId });
            const raw = data.generateScheduleFromWbs;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const aiMilestones = Array.isArray(parsed) ? parsed : (parsed?.milestones || []);
            const aiActivities = parsed?.activities || [];

            let msCount = 0;
            for (const ms of aiMilestones) {
                await gql(CREATE_MILESTONE, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId,
                        name: ms.name,
                        description: ms.description || '',
                        dueDate: ms.plannedDate || ms.dueDate,
                        status: ms.status || 'pending',
                        isCritical: ms.isCritical || false,
                    }
                });
                msCount++;
            }

            let actCount = 0;
            for (const act of aiActivities) {
                await gql(CREATE_ACTIVITY, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId,
                        name: act.name,
                        description: act.description || '',
                        durationDays: act.durationDays || 5,
                        status: 'not_started',
                    }
                });
                actCount++;
            }

            messageApi.success(`AI generated ${msCount} milestones and ${actCount} activities from WBS.`);
            loadMilestones();
            loadActivities();
        } catch (err: any) { messageApi.error(`AI failed: ${err.message}`); }
        finally { setAiLoading(false); }
    };

    // ─── Stats ────────────────────────────────────────────
    const completedMs = milestones.filter(m => m.status === 'completed').length;
    const overdueMs = milestones.filter(m => m.status !== 'completed' && m.dueDate && dayjs(m.dueDate).isBefore(dayjs())).length;
    const totalActivities = activities.length;
    const completedAct = activities.filter(a => a.status === 'completed').length;

    const msDist = useMemo(() => {
        const counts: Record<string, number> = {};
        milestones.forEach((m: any) => { const s = m.status || 'pending'; counts[s] = (counts[s] || 0) + 1; });
        const colors: Record<string, string> = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', at_risk: '#ef4444', delayed: '#f97316' };
        return Object.entries(counts).map(([status, count]) => ({ name: status.replace('_', ' '), value: count, color: colors[status] || '#6b7280' }));
    }, [milestones]);

    const actDist = useMemo(() => {
        const counts: Record<string, number> = {};
        activities.forEach((a: any) => { const s = a.status || 'pending'; counts[s] = (counts[s] || 0) + 1; });
        const colors: Record<string, string> = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#ef4444' };
        return Object.entries(counts).map(([status, count]) => ({ name: status.replace('_', ' '), value: count, color: colors[status] || '#6b7280' }));
    }, [activities]);

    // ─── Columns ──────────────────────────────────────────
    const msCols: ProColumns<any>[] = [
        { title: "Milestone", dataIndex: "name", width: "25%",
            render: (_, r) => <Space>{r.isCritical && <Tag color="red">CRITICAL</Tag>}<strong>{r.name}</strong></Space>
        },
        { title: "Due Date", dataIndex: "dueDate", valueType: "date", width: 120,
            render: (_, r) => {
                const isOverdue = r.status !== 'completed' && r.dueDate && dayjs(r.dueDate).isBefore(dayjs());
                return <Tag color={isOverdue ? 'red' : 'default'}>{r.dueDate ? dayjs(r.dueDate).format('YYYY-MM-DD') : '-'}</Tag>;
            }
        },
        { title: "Completed", dataIndex: "completedDate", valueType: "date", width: 120 },
        { title: "Progress", dataIndex: "percentComplete", width: 130,
            render: (_, r) => <Progress percent={r.percentComplete || 0} size="small" status={r.status === 'completed' ? 'success' : 'active'} />
        },
        { title: "Status", dataIndex: "status", width: 110,
            render: (_, r) => {
                const color = r.status === 'completed' ? 'green' : r.status === 'in_progress' ? 'blue' : r.status === 'at_risk' ? 'orange' : 'default';
                return <Tag color={color}>{(r.status || 'pending').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option", width: 100,
            render: (_, record) => [
                <Button key="e" type="text" icon={<EditOutlined />} onClick={() => { setEditingMs(record); setMsModal(true); }} />,
                <Popconfirm key="d" title="Delete?" onConfirm={() => handleMsDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    const actCols: ProColumns<any>[] = [
        { title: "Activity", dataIndex: "name", width: "25%" },
        { title: "Duration (days)", dataIndex: "durationDays", width: 100,
            render: (_, r) => <Tag>{r.duration_days || r.durationDays || '-'} days</Tag>
        },
        { title: "Start", dataIndex: "startDate", valueType: "date", width: 110,
            render: (_, r) => (r.start_date || r.startDate) ? dayjs(r.start_date || r.startDate).format('YYYY-MM-DD') : '-'
        },
        { title: "End", dataIndex: "endDate", valueType: "date", width: 110,
            render: (_, r) => (r.end_date || r.endDate) ? dayjs(r.end_date || r.endDate).format('YYYY-MM-DD') : '-'
        },
        { title: "Assigned To", dataIndex: "assignedTo", width: 120,
            render: (_, r) => r.assigned_to || r.assignedTo || '-'
        },
        { title: "Status", dataIndex: "status", width: 110,
            render: (_, r) => {
                const color = r.status === 'completed' ? 'green' : r.status === 'in_progress' ? 'blue' : 'default';
                return <Tag color={color}>{(r.status || 'not_started').replace(/_/g, ' ').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option", width: 100,
            render: (_, record) => [
                <Button key="e" type="text" icon={<EditOutlined />} onClick={() => { setEditingAct(record); setActModal(true); }} />,
                <Popconfirm key="d" title="Delete?" onConfirm={() => handleActDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}

            {/* Schedule Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 10, border: isDark ? '1px solid rgba(99,102,241,0.2)' : '1px solid #e6f7ff', background: isDark ? 'rgba(99,102,241,0.08)' : '#f0f5ff' }}>
                        <Statistic title={<span style={{ fontSize: 11 }}><FlagOutlined style={{ marginRight: 4 }} /> Total Milestones</span>} value={milestones.length} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 10, border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid #f6ffed', background: isDark ? 'rgba(16,185,129,0.08)' : '#f6ffed' }}>
                        <Statistic title={<span style={{ fontSize: 11 }}><CheckCircleOutlined style={{ marginRight: 4 }} /> Completed</span>} value={completedMs} suffix={`/ ${milestones.length}`} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 10, border: isDark ? '1px solid rgba(239,68,68,0.2)' : '1px solid #fff1f0', background: isDark ? 'rgba(239,68,68,0.08)' : '#fff1f0' }}>
                        <Statistic title={<span style={{ fontSize: 11 }}><WarningOutlined style={{ marginRight: 4 }} /> Overdue</span>} value={overdueMs} valueStyle={{ color: overdueMs > 0 ? '#cf1322' : '#3f8600' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 10, border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #f9f0ff', background: isDark ? 'rgba(139,92,246,0.08)' : '#f9f0ff' }}>
                        <Statistic title={<span style={{ fontSize: 11 }}><ToolOutlined style={{ marginRight: 4 }} /> Activities</span>} value={completedAct} suffix={`/ ${totalActivities}`} />
                    </Card>
                </Col>
            </Row>

            {(msDist.length > 0 || actDist.length > 0) && (
                <Card size="small" title={<span style={{ fontWeight: 600 }}>Schedule Status</span>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {msDist.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: 130, height: 130, margin: '0 auto' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={msDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                                                {msDist.map((m, i) => <Cell key={i} fill={m.color} />)}
                                            </Pie>
                                            <RTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isDark ? '#e2e8f0' : '#333' }}>Milestones</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                    {msDist.map(m => (
                                        <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                                            <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{m.name} ({m.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {actDist.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: 130, height: 130, margin: '0 auto' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={actDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                                                {actDist.map((a, i) => <Cell key={i} fill={a.color} />)}
                                            </Pie>
                                            <RTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isDark ? '#e2e8f0' : '#333' }}>Activities</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                    {actDist.map(a => (
                                        <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                                            <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{a.name} ({a.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <Tabs defaultActiveKey="milestones" items={[
                {
                    label: <Space><FlagOutlined /> Milestones</Space>, key: 'milestones',
                    children: (
                        <ProTable
                            headerTitle={<Space><FlagOutlined style={{ color: '#1890ff' }} /> Project Milestones</Space>}
                            rowKey="id" dataSource={milestones} loading={msLoading} columns={msCols} search={false}
                            toolBarRender={() => [
                                <Button key="ai" type="dashed" icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiSchedule}>
                                    AI Generate Schedule
                                </Button>,
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingMs(null); setMsModal(true); }}>
                                    Add Milestone
                                </Button>
                            ]}
                        />
                    )
                },
                {
                    label: <Space><NodeIndexOutlined /> Activities</Space>, key: 'activities',
                    children: (
                        <ProTable
                            headerTitle={<Space><CalendarOutlined style={{ color: '#722ed1' }} /> Schedule Activities</Space>}
                            rowKey="id" dataSource={activities} loading={actLoading} columns={actCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingAct(null); setActModal(true); }}>
                                    Add Activity
                                </Button>
                            ]}
                        />
                    )
                },
                {
                    label: <Space><CalendarOutlined /> Timeline</Space>, key: 'timeline',
                    children: milestones.length > 0 ? (
                        <Timeline mode="left" style={{ padding: '16px 0' }}
                            items={milestones.map(ms => ({
                                color: ms.status === 'completed' ? 'green' : ms.status === 'in_progress' ? 'blue' : 'gray',
                                label: ms.dueDate ? dayjs(ms.dueDate).format('YYYY-MM-DD') : '',
                                children: (
                                    <div>
                                        <strong>{ms.name}</strong>
                                        {ms.isCritical && <Tag color="red" style={{ marginLeft: 8 }}>CRITICAL</Tag>}
                                        <br />
                                        <Tag color={ms.status === 'completed' ? 'green' : 'default'}>{(ms.status || 'pending').toUpperCase()}</Tag>
                                        {ms.description && <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginTop: 4 }}>{ms.description}</div>}
                                    </div>
                                )
                            }))}
                        />
                    ) : <Empty description="No milestones yet. Add milestones or generate from AI." />
                }
            ]} />

            {/* Milestone Modal */}
            <ModalForm
                title={editingMs ? "Edit Milestone" : "Add Milestone"}
                open={msModal} onOpenChange={setMsModal}
                onFinish={handleMsSave}
                initialValues={editingMs || { status: 'pending', percentComplete: 0, isCritical: false }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProFormText name="name" label="Milestone Name" rules={[{ required: true }]} />
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormDatePicker name="dueDate" label="Due Date" width="sm" />
                    <ProFormDatePicker name="completedDate" label="Completed Date" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDigit name="percentComplete" label="Progress (%)" min={0} max={100} width="sm" />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'at_risk', label: 'At Risk' },
                        { value: 'delayed', label: 'Delayed' },
                    ]} />
                    <ProFormSelect name="isCritical" label="Critical Path" width="xs" options={[
                        { value: false, label: 'No' }, { value: true, label: 'Yes' },
                    ]} />
                </ProForm.Group>
            </ModalForm>

            {/* Activity Modal */}
            <ModalForm
                title={editingAct ? "Edit Activity" : "Add Activity"}
                open={actModal} onOpenChange={setActModal}
                onFinish={handleActSave}
                initialValues={editingAct || { status: 'not_started', durationDays: 5 }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProFormText name="name" label="Activity Name" rules={[{ required: true }]} />
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormDigit name="durationDays" label="Duration (days)" min={1} width="sm" />
                    <ProFormText name="assignedTo" label="Assigned To" width="md" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDatePicker name="startDate" label="Start Date" width="sm" />
                    <ProFormDatePicker name="endDate" label="End Date" width="sm" />
                </ProForm.Group>
                <ProFormSelect name="status" label="Status" width="sm" options={[
                    { value: 'not_started', label: 'Not Started' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'blocked', label: 'Blocked' },
                ]} />
            </ModalForm>
        </div>
    );
}

