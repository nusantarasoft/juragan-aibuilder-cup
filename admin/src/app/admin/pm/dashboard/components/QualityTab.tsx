"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProFormSelect, ProFormDigit, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Progress, Row, Col, Card, Statistic, Space } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, PieChart, Pie, Cell } from 'recharts';
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL ───────────────────────────────────────────────
const GET_METRICS = `query($projectId: String!) { pmQualityMetrics(projectId: $projectId) { id metricName description unit targetValue actualValue toleranceLower toleranceUpper measurementMethod frequency status } }`;
const CREATE_METRIC = `mutation($tenantId: String!, $input: CreatePmQualityMetricInput!) { createPmQualityMetric(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_METRIC = `mutation($id: ID!, $input: UpdatePmQualityMetricInput!) { updatePmQualityMetric(id: $id, input: $input) { id } }`;
const DELETE_METRIC = `mutation($id: ID!) { deletePmQualityMetric(id: $id) }`;

const GET_CHECKLISTS = `query($projectId: String!) { pmQualityChecklists(projectId: $projectId) { id checklistName description deliverable inspector inspectionDate status } }`;
const CREATE_CHECKLIST = `mutation($tenantId: String!, $input: CreatePmQualityChecklistInput!) { createPmQualityChecklist(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_CHECKLIST = `mutation($id: ID!, $input: UpdatePmQualityChecklistInput!) { updatePmQualityChecklist(id: $id, input: $input) { id } }`;
const DELETE_CHECKLIST = `mutation($id: ID!) { deletePmQualityChecklist(id: $id) }`;

const GET_INSPECTIONS = `query($projectId: String!) { pmQualityInspections(projectId: $projectId) { id inspectionType deliverable inspector inspectionDate findings correctiveActions result followUpDate } }`;
const CREATE_INSPECTION = `mutation($tenantId: String!, $input: CreatePmQualityInspectionInput!) { createPmQualityInspection(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_INSPECTION = `mutation($id: ID!, $input: UpdatePmQualityInspectionInput!) { updatePmQualityInspection(id: $id, input: $input) { id } }`;
const DELETE_INSPECTION = `mutation($id: ID!) { deletePmQualityInspection(id: $id) }`;

export default function QualityTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [metrics, setMetrics] = useState<any[]>([]);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricModal, setMetricModal] = useState(false);
    const [editingMetric, setEditingMetric] = useState<any>(null);

    const [checklists, setChecklists] = useState<any[]>([]);
    const [clLoading, setClLoading] = useState(true);
    const [clModal, setClModal] = useState(false);
    const [editingCl, setEditingCl] = useState<any>(null);

    const [inspections, setInspections] = useState<any[]>([]);
    const [insLoading, setInsLoading] = useState(true);
    const [insModal, setInsModal] = useState(false);
    const [editingIns, setEditingIns] = useState<any>(null);

    const loadMetrics = React.useCallback(async () => {
        setMetricsLoading(true);
        try { const d = await gql(GET_METRICS, { projectId }); setMetrics(d.pmQualityMetrics || []); }
        catch { messageApi.error("Failed to load metrics."); }
        finally { setMetricsLoading(false); }
    }, [projectId, messageApi]);

    const loadChecklists = React.useCallback(async () => {
        setClLoading(true);
        try { const d = await gql(GET_CHECKLISTS, { projectId }); setChecklists(d.pmQualityChecklists || []); }
        catch { messageApi.error("Failed to load checklists."); }
        finally { setClLoading(false); }
    }, [projectId, messageApi]);

    const loadInspections = React.useCallback(async () => {
        setInsLoading(true);
        try { const d = await gql(GET_INSPECTIONS, { projectId }); setInspections(d.pmQualityInspections || []); }
        catch { messageApi.error("Failed to load inspections."); }
        finally { setInsLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadMetrics(); loadChecklists(); loadInspections(); }, [loadMetrics, loadChecklists, loadInspections]);

    const metricChart = useMemo(() =>
        metrics.filter((m: any) => m.targetValue || m.actualValue).map((m: any) => ({
            name: (m.metricName || '').slice(0, 14),
            Target: Number(m.targetValue || 0),
            Actual: Number(m.actualValue || 0),
        })),
    [metrics]);

    const inspectionResults = useMemo(() => {
        const counts: Record<string, number> = {};
        inspections.forEach((ins: any) => { const r = ins.result || 'pending'; counts[r] = (counts[r] || 0) + 1; });
        const colors: Record<string, string> = { pass: '#10b981', fail: '#ef4444', conditional: '#f59e0b', pending: '#6b7280' };
        return Object.entries(counts).map(([result, count]) => ({ name: result, value: count, color: colors[result] || '#6b7280' }));
    }, [inspections]);

    // ─── CRUD Helpers ──────────────────────────────────
    const crudHandler = (createQ: string, updateQ: string, loadFn: () => void, setModal: (v: boolean) => void, editObj: any, entityName: string) =>
        async (values: any) => {
            try {
                if (editObj) {
                    await gql(updateQ, { id: editObj.id, input: values });
                    messageApi.success(`${entityName} updated.`);
                } else {
                    await gql(createQ, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                    messageApi.success(`${entityName} created.`);
                }
                setModal(false); loadFn();
                return true;
            } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
        };

    const deleteHandler = (deleteQ: string, loadFn: () => void, entityName: string) =>
        async (id: string) => {
            try { await gql(deleteQ, { id }); messageApi.success(`${entityName} deleted.`); loadFn(); }
            catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
        };

    // ─── Metric Columns ────────────────────────────────
    const metricCols: ProColumns<any>[] = [
        { title: "Metric", dataIndex: "metricName", width: "18%" },
        { title: "Unit", dataIndex: "unit", width: 80 },
        {
            title: "Target vs Actual", key: "progress",
            render: (_, r) => {
                if (!r.targetValue) return '-';
                const pct = r.actualValue ? Math.round((r.actualValue / r.targetValue) * 100) : 0;
                return <Progress percent={pct} size="small" status={pct >= 100 ? 'success' : 'active'} format={() => `${r.actualValue ?? 0} / ${r.targetValue}`} />;
            }
        },
        { title: "Tolerance", key: "tol", render: (_, r) => r.toleranceLower || r.toleranceUpper ? `${r.toleranceLower ?? ''} — ${r.toleranceUpper ?? ''}` : '-' },
        { title: "Frequency", dataIndex: "frequency" },
        { title: "Status", dataIndex: "status", render: (_, r) => <Tag color={r.status === 'met' ? 'green' : r.status === 'at_risk' ? 'orange' : 'default'}>{r.status?.toUpperCase()}</Tag> },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingMetric(record); setMetricModal(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => deleteHandler(DELETE_METRIC, loadMetrics, "Metric")(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    // ─── Checklist Columns ─────────────────────────────
    const clCols: ProColumns<any>[] = [
        { title: "Checklist", dataIndex: "checklistName", width: "20%" },
        { title: "Deliverable", dataIndex: "deliverable" },
        { title: "Inspector", dataIndex: "inspector" },
        { title: "Date", dataIndex: "inspectionDate", valueType: "date" },
        { title: "Status", dataIndex: "status", render: (_, r) => <Tag color={r.status === 'completed' ? 'green' : r.status === 'in_progress' ? 'blue' : 'default'}>{r.status?.toUpperCase()}</Tag> },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingCl(record); setClModal(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => deleteHandler(DELETE_CHECKLIST, loadChecklists, "Checklist")(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    // ─── Inspection Columns ────────────────────────────
    const insCols: ProColumns<any>[] = [
        { title: "Type", dataIndex: "inspectionType" },
        { title: "Deliverable", dataIndex: "deliverable" },
        { title: "Inspector", dataIndex: "inspector" },
        { title: "Date", dataIndex: "inspectionDate", valueType: "date" },
        { title: "Result", dataIndex: "result", render: (_, r) => <Tag color={r.result === 'pass' ? 'green' : r.result === 'fail' ? 'red' : 'orange'}>{r.result?.toUpperCase()}</Tag> },
        { title: "Findings", dataIndex: "findings", ellipsis: true },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingIns(record); setInsModal(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => deleteHandler(DELETE_INSPECTION, loadInspections, "Inspection")(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={8}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${themeColor}`, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Quality Metrics</span>} value={metrics.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} md={8}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #3b82f6', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Checklists</span>} value={checklists.length} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }} />
                    </Card>
                </Col>
                <Col xs={12} md={8}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #10b981', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Inspections</span>} value={inspections.length} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#10b981' }} />
                    </Card>
                </Col>
            </Row>

            {(metricChart.length > 0 || inspectionResults.length > 0) && (
                <Card size="small" title={<span style={{ fontWeight: 600 }}>Quality Overview</span>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {metricChart.length > 0 && (
                            <div style={{ flex: 2, minWidth: 260, height: 200 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: isDark ? '#e2e8f0' : '#333' }}>Target vs Actual</div>
                                <ResponsiveContainer>
                                    <BarChart data={metricChart} margin={{ left: -10, right: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }} interval={0} angle={-20} textAnchor="end" />
                                        <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                        <RTooltip contentStyle={{ background: isDark ? '#1e1e2e' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, fontSize: 12 }} />
                                        <Bar dataKey="Target" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {inspectionResults.length > 0 && (
                            <div style={{ flex: 1, minWidth: 160, textAlign: 'center' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: isDark ? '#e2e8f0' : '#333' }}>Inspection Results</div>
                                <div style={{ width: 130, height: 130, margin: '0 auto' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={inspectionResults} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                                                {inspectionResults.map((r, i) => <Cell key={i} fill={r.color} />)}
                                            </Pie>
                                            <RTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                    {inspectionResults.map(r => (
                                        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
                                            <span style={{ color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>{r.name} ({r.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <Tabs defaultActiveKey="metrics" items={[
                {
                    label: 'Quality Metrics', key: 'metrics',
                    children: (
                        <ProTable headerTitle="Quality Metrics" rowKey="id" dataSource={metrics} loading={metricsLoading} columns={metricCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingMetric(null); setMetricModal(true); }}>Add Metric</Button>
                            ]}
                        />
                    )
                },
                {
                    label: 'Quality Checklists', key: 'checklists',
                    children: (
                        <ProTable headerTitle="Quality Checklists" rowKey="id" dataSource={checklists} loading={clLoading} columns={clCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCl(null); setClModal(true); }}>Add Checklist</Button>
                            ]}
                        />
                    )
                },
                {
                    label: 'Quality Inspections', key: 'inspections',
                    children: (
                        <ProTable headerTitle="Quality Inspections" rowKey="id" dataSource={inspections} loading={insLoading} columns={insCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingIns(null); setInsModal(true); }}>Add Inspection</Button>
                            ]}
                        />
                    )
                }
            ]} />

            {/* Metric Modal */}
            <ModalForm title={editingMetric ? "Edit Metric" : "Add Metric"} open={metricModal} onOpenChange={setMetricModal}
                onFinish={crudHandler(CREATE_METRIC, UPDATE_METRIC, loadMetrics, setMetricModal, editingMetric, "Metric")}
                initialValues={editingMetric || { status: 'tracking' }} modalProps={{ destroyOnClose: true }}>
                <ProFormText name="metricName" label="Metric Name" rules={[{ required: true }]} />
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormText name="unit" label="Unit" width="sm" placeholder="e.g. %, ms, count" />
                    <ProFormDigit name="targetValue" label="Target Value" width="sm" />
                    <ProFormDigit name="actualValue" label="Actual Value" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDigit name="toleranceLower" label="Lower Tolerance" width="sm" />
                    <ProFormDigit name="toleranceUpper" label="Upper Tolerance" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="measurementMethod" label="Measurement Method" width="md" />
                    <ProFormSelect name="frequency" label="Frequency" width="sm" options={[
                        { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
                        { value: 'bi_weekly', label: 'Bi-Weekly' }, { value: 'monthly', label: 'Monthly' },
                        { value: 'per_sprint', label: 'Per Sprint' },
                    ]} />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'tracking', label: 'Tracking' }, { value: 'met', label: 'Met' },
                        { value: 'at_risk', label: 'At Risk' }, { value: 'failed', label: 'Failed' },
                    ]} />
                </ProForm.Group>
            </ModalForm>

            {/* Checklist Modal */}
            <ModalForm title={editingCl ? "Edit Checklist" : "Add Checklist"} open={clModal} onOpenChange={setClModal}
                onFinish={crudHandler(CREATE_CHECKLIST, UPDATE_CHECKLIST, loadChecklists, setClModal, editingCl, "Checklist")}
                initialValues={editingCl || { status: 'pending' }} modalProps={{ destroyOnClose: true }}>
                <ProFormText name="checklistName" label="Checklist Name" rules={[{ required: true }]} />
                <ProFormText name="deliverable" label="Deliverable" />
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormText name="inspector" label="Inspector" width="md" />
                    <ProFormDatePicker name="inspectionDate" label="Inspection Date" width="sm" />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                    ]} />
                </ProForm.Group>
            </ModalForm>

            {/* Inspection Modal */}
            <ModalForm title={editingIns ? "Edit Inspection" : "Add Inspection"} open={insModal} onOpenChange={setInsModal}
                onFinish={crudHandler(CREATE_INSPECTION, UPDATE_INSPECTION, loadInspections, setInsModal, editingIns, "Inspection")}
                initialValues={editingIns || { result: 'pending' }} modalProps={{ destroyOnClose: true }}>
                <ProForm.Group>
                    <ProFormSelect name="inspectionType" label="Type" width="sm" options={[
                        { value: 'review', label: 'Review' }, { value: 'walkthrough', label: 'Walkthrough' },
                        { value: 'audit', label: 'Audit' }, { value: 'testing', label: 'Testing' },
                    ]} />
                    <ProFormText name="deliverable" label="Deliverable" width="md" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="inspector" label="Inspector" width="md" />
                    <ProFormDatePicker name="inspectionDate" label="Inspection Date" width="sm" />
                </ProForm.Group>
                <ProFormTextArea name="findings" label="Findings" />
                <ProFormTextArea name="correctiveActions" label="Corrective Actions" />
                <ProForm.Group>
                    <ProFormSelect name="result" label="Result" width="sm" options={[
                        { value: 'pending', label: 'Pending' }, { value: 'pass', label: 'Pass' },
                        { value: 'fail', label: 'Fail' }, { value: 'conditional', label: 'Conditional' },
                    ]} />
                    <ProFormDatePicker name="followUpDate" label="Follow-Up Date" width="sm" />
                </ProForm.Group>
            </ModalForm>
        </div>
    );
}
