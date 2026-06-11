"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProForm, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Space, Tag, Popconfirm, Row, Col, Card, Statistic } from "antd";
import { BankOutlined, PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

const GET_GOVERNANCE = `
  query GetGovernanceDecisions($projectId: String!) {
    pmGovernanceDecisions(projectId: $projectId)
  }
`;

const CREATE_GOVERNANCE = `
  mutation CreateGovernance(
    $tenantId: String!, $projectId: String!, $title: String!,
    $decisionNumber: String, $description: String, $category: String,
    $decision: String, $decidedBy: String, $decisionDate: String,
    $escalationLevel: String, $impact: String, $followUpActions: String,
    $status: String, $dueDate: String
  ) {
    createPmGovernanceDecision(
      tenantId: $tenantId, projectId: $projectId, title: $title,
      decisionNumber: $decisionNumber, description: $description, category: $category,
      decision: $decision, decidedBy: $decidedBy, decisionDate: $decisionDate,
      escalationLevel: $escalationLevel, impact: $impact, followUpActions: $followUpActions,
      status: $status, dueDate: $dueDate
    )
  }
`;

const UPDATE_GOVERNANCE = `
  mutation UpdateGovernance(
    $id: ID!, $title: String, $decisionNumber: String, $description: String,
    $category: String, $decision: String, $decidedBy: String, $decisionDate: String,
    $escalationLevel: String, $impact: String, $followUpActions: String,
    $status: String, $dueDate: String
  ) {
    updatePmGovernanceDecision(
      id: $id, title: $title, decisionNumber: $decisionNumber, description: $description,
      category: $category, decision: $decision, decidedBy: $decidedBy, decisionDate: $decisionDate,
      escalationLevel: $escalationLevel, impact: $impact, followUpActions: $followUpActions,
      status: $status, dueDate: $dueDate
    )
  }
`;

const DELETE_GOVERNANCE = `
  mutation DeleteGovernance($id: ID!) {
    deletePmGovernanceDecision(id: $id)
  }
`;

const CATEGORY_OPTIONS = [
    { label: 'Strategic', value: 'strategic' },
    { label: 'Budget', value: 'budget' },
    { label: 'Scope', value: 'scope' },
    { label: 'Schedule', value: 'schedule' },
    { label: 'Risk', value: 'risk' },
    { label: 'Resource', value: 'resource' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Quality', value: 'quality' },
];

const ESCALATION_OPTIONS = [
    { label: 'Level 1 — PM', value: 'level_1' },
    { label: 'Level 2 — Steering Committee', value: 'level_2' },
    { label: 'Level 3 — Executive Sponsor', value: 'level_3' },
    { label: 'Level 4 — Board', value: 'level_4' },
];

const STATUS_OPTIONS = [
    { label: 'Open', value: 'open' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Decided', value: 'decided' },
    { label: 'Implemented', value: 'implemented' },
    { label: 'Deferred', value: 'deferred' },
];

export default function GovernanceTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_GOVERNANCE, { projectId });
            setEntries(data.pmGovernanceDecisions || []);
        } catch (err: any) { console.error("PM Error", err); } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_GOVERNANCE, { id });
            messageApi.success("Decision deleted.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
        }
    };

    const handleFinish = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_GOVERNANCE, {
                    id: editing.id,
                    title: values.title,
                    decisionNumber: values.decisionNumber || values.decision_number,
                    description: values.description,
                    category: values.category,
                    decision: values.decision,
                    decidedBy: values.decidedBy || values.decided_by,
                    decisionDate: values.decisionDate || values.decision_date,
                    escalationLevel: values.escalationLevel || values.escalation_level,
                    impact: values.impact,
                    followUpActions: values.followUpActions || values.follow_up_actions,
                    status: values.status,
                    dueDate: values.dueDate || values.due_date,
                });
                messageApi.success("Decision updated.");
            } else {
                await gql(CREATE_GOVERNANCE, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    title: values.title,
                    decisionNumber: values.decisionNumber,
                    description: values.description,
                    category: values.category,
                    decision: values.decision,
                    decidedBy: values.decidedBy,
                    decisionDate: values.decisionDate,
                    escalationLevel: values.escalationLevel,
                    impact: values.impact,
                    followUpActions: values.followUpActions,
                    status: values.status || 'open',
                    dueDate: values.dueDate,
                });
                messageApi.success("Decision logged.");
            }
            setIsModalOpen(false);
            loadData();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
            return false;
        }
    };

    const openCount = entries.filter(e => e.status === 'open' || e.status === 'under_review').length;
    const decidedCount = entries.filter(e => e.status === 'decided' || e.status === 'implemented').length;

    const categoryDist = useMemo(() => {
        const counts: Record<string, number> = {};
        entries.forEach((e: any) => { const c = e.category || 'other'; counts[c] = (counts[c] || 0) + 1; });
        const colors: Record<string, string> = { strategic: '#6366f1', budget: '#f59e0b', scope: '#3b82f6', schedule: '#10b981', risk: '#ef4444', resource: '#8b5cf6', compliance: '#f97316', quality: '#14b8a6' };
        return Object.entries(counts).map(([cat, count]) => ({ name: cat, value: count, color: colors[cat] || '#6b7280' }));
    }, [entries]);

    const statusDist = useMemo(() => {
        const counts: Record<string, number> = {};
        entries.forEach((e: any) => { const s = e.status || 'open'; counts[s] = (counts[s] || 0) + 1; });
        const colors: Record<string, string> = { open: '#f59e0b', under_review: '#3b82f6', decided: '#10b981', implemented: '#6366f1', deferred: '#94a3b8' };
        return Object.entries(counts).map(([status, count]) => ({ name: status.replace('_', ' '), value: count, color: colors[status] || '#6b7280' }));
    }, [entries]);

    const columns: ProColumns<any>[] = [
        {
            title: "#", dataIndex: "decision_number", width: 80,
            render: (_, r) => <Tag>{r.decision_number || r.decisionNumber || '—'}</Tag>,
        },
        { title: "Title", dataIndex: "title" },
        {
            title: "Category", dataIndex: "category", width: 110,
            render: (_, r) => r.category ? <Tag color="purple">{r.category}</Tag> : '—',
        },
        {
            title: "Escalation", dataIndex: "escalation_level", width: 140,
            render: (_, r) => {
                const level = r.escalation_level || r.escalationLevel;
                const color = level === 'level_4' ? 'red' : level === 'level_3' ? 'orange' : level === 'level_2' ? 'gold' : 'blue';
                return level ? <Tag color={color}>{level.replace('_', ' ').toUpperCase()}</Tag> : '—';
            }
        },
        {
            title: "Decided By", dataIndex: "decided_by", width: 120,
            render: (_, r) => r.decided_by || r.decidedBy || '—',
        },
        {
            title: "Status", dataIndex: "status", width: 120,
            render: (_, r) => {
                const color = r.status === 'implemented' ? 'green' : r.status === 'decided' ? 'cyan'
                    : r.status === 'under_review' ? 'gold' : r.status === 'deferred' ? 'red' : 'default';
                return <Tag color={color}>{(r.status || 'open').replace('_', ' ').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option", width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />}
                    onClick={() => {
                        setEditing({
                            ...record,
                            decisionNumber: record.decision_number || record.decisionNumber,
                            decidedBy: record.decided_by || record.decidedBy,
                            decisionDate: record.decision_date || record.decisionDate,
                            escalationLevel: record.escalation_level || record.escalationLevel,
                            followUpActions: record.follow_up_actions || record.followUpActions,
                            dueDate: record.due_date || record.dueDate,
                        });
                        setIsModalOpen(true);
                    }}
                />,
                <Popconfirm key="del" title="Delete decision?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={8}>
                    <Card size="small" style={{
                        background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 10,
                    }}>
                        <Statistic title="Total Decisions" value={entries.length} prefix={<BankOutlined style={{ color: '#3b82f6' }} />} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{
                        background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 10,
                    }}>
                        <Statistic title="Open / Under Review" value={openCount} prefix={<ExclamationCircleOutlined style={{ color: '#f59e0b' }} />} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{
                        background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10,
                    }}>
                        <Statistic title="Decided / Implemented" value={decidedCount} prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />} />
                    </Card>
                </Col>
            </Row>

            {entries.length > 0 && (
                <Card size="small" title={<span style={{ fontWeight: 600 }}>Decision Distribution</span>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 140, height: 140, margin: '0 auto' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} strokeWidth={0}>
                                            {categoryDist.map((c, i) => <Cell key={i} fill={c.color} />)}
                                        </Pie>
                                        <RTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isDark ? '#e2e8f0' : '#333' }}>By Category</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                {categoryDist.map(c => (
                                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                                        <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{c.name} ({c.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 140, height: 140, margin: '0 auto' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} strokeWidth={0}>
                                            {statusDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                                        </Pie>
                                        <RTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isDark ? '#e2e8f0' : '#333' }}>By Status</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                {statusDist.map(s => (
                                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                                        <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{s.name} ({s.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <ProTable
                headerTitle={
                    <Space>
                        <BankOutlined style={{ color: 'var(--theme-color, #8b5cf6)' }} />
                        <span>Governance Decision Log</span>
                    </Space>
                }
                rowKey="id"
                dataSource={entries}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />}
                        onClick={() => { setEditing(null); setIsModalOpen(true); }}
                        style={{ background: 'linear-gradient(135deg, var(--theme-color, #8b5cf6), var(--theme-secondary, #6366f1))', border: 'none', borderRadius: 8 }}
                    >
                        Log Decision
                    </Button>
                ]}
            />

            <ModalForm
                title={editing ? "Edit Decision" : "Log Governance Decision"}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleFinish}
                initialValues={editing || { status: 'open', escalationLevel: 'level_1' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormText name="decisionNumber" label="Decision #" width="sm" placeholder="GOV-001" />
                    <ProFormText name="title" label="Title" width="md" rules={[{ required: true }]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormSelect name="category" label="Category" width="sm" options={CATEGORY_OPTIONS} />
                    <ProFormSelect name="escalationLevel" label="Escalation Level" width="sm" options={ESCALATION_OPTIONS} />
                    <ProFormSelect name="status" label="Status" width="sm" options={STATUS_OPTIONS} />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description" placeholder="Describe the context requiring a governance decision." />
                <ProFormTextArea name="decision" label="Decision Made" placeholder="Document the actual decision." />
                <ProForm.Group>
                    <ProFormText name="decidedBy" label="Decided By" width="sm" />
                    <ProFormText name="decisionDate" label="Decision Date" width="sm" placeholder="YYYY-MM-DD" />
                    <ProFormText name="dueDate" label="Due Date" width="sm" placeholder="YYYY-MM-DD" />
                </ProForm.Group>
                <ProFormTextArea name="impact" label="Impact" placeholder="What is the impact of this decision?" />
                <ProFormTextArea name="followUpActions" label="Follow-Up Actions" placeholder="Actions required after decision." />
            </ModalForm>
        </div>
    );
}

