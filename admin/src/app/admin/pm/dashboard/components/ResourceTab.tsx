"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDigit, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Space, Table, Row, Col, Card, Statistic } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined, ExclamationCircleOutlined, CalendarOutlined } from "@ant-design/icons";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { useTheme } from 'next-themes';
import dayjs from 'dayjs';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL ───────────────────────────────────────────────
const GET_RESOURCES = `query($projectId: String!) { pmResourcePlans(projectId: $projectId) { id resourceName role resourceType allocationPercent hourlyRate startDate endDate availabilityHours plannedHours actualHours skills notes status } }`;
const CREATE_RESOURCE = `mutation($tenantId: String!, $input: CreatePmResourcePlanInput!) { createPmResourcePlan(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_RESOURCE = `mutation($id: ID!, $input: UpdatePmResourcePlanInput!) { updatePmResourcePlan(id: $id, input: $input) { id } }`;
const DELETE_RESOURCE = `mutation($id: ID!) { deletePmResourcePlan(id: $id) }`;

const GET_RACI = `query($projectId: String!) { pmRaciMatrix(projectId: $projectId) { id deliverable personName roleType notes } }`;
const CREATE_RACI = `mutation($tenantId: String!, $input: CreatePmRaciEntryInput!) { createPmRaciEntry(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_RACI = `mutation($id: ID!, $input: UpdatePmRaciEntryInput!) { updatePmRaciEntry(id: $id, input: $input) { id } }`;
const DELETE_RACI = `mutation($id: ID!) { deletePmRaciEntry(id: $id) }`;

const GET_TASKS = `
  query GetTasksForHeatmap($tenantId: String!, $projectId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId) {
      id estimatedHours loggedHours startDate dueDate status
      assignee { firstName lastName }
    }
  }
`;

export default function ResourceTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const isDark = resolvedTheme === 'dark';

    const [resources, setResources] = useState<any[]>([]);
    const [resLoading, setResLoading] = useState(true);
    const [resModal, setResModal] = useState(false);
    const [editingRes, setEditingRes] = useState<any>(null);

    const [raci, setRaci] = useState<any[]>([]);
    const [raciLoading, setRaciLoading] = useState(true);
    const [raciModal, setRaciModal] = useState(false);
    const [editingRaci, setEditingRaci] = useState<any>(null);

    const [tasks, setTasks] = useState<any[]>([]);

    const loadResources = React.useCallback(async () => {
        setResLoading(true);
        try { const d = await gql(GET_RESOURCES, { projectId }); setResources(d.pmResourcePlans || []); }
        catch { messageApi.error("Failed to load resources."); }
        finally { setResLoading(false); }
    }, [projectId, messageApi]);

    const loadRaci = React.useCallback(async () => {
        setRaciLoading(true);
        try { const d = await gql(GET_RACI, { projectId }); setRaci(d.pmRaciMatrix || []); }
        catch { messageApi.error("Failed to load RACI."); }
        finally { setRaciLoading(false); }
    }, [projectId, messageApi]);

    const loadTasks = React.useCallback(async () => {
        try {
            const d = await gql(GET_TASKS, { tenantId: DEFAULT_TENANT_ID, projectId });
            setTasks(d.pmTasks || []);
        } catch { }
    }, [projectId]);

    useEffect(() => { loadResources(); loadRaci(); loadTasks(); }, [loadResources, loadRaci, loadTasks]);

    // ─── Summary Stats ─────────────────────────────────
    const resourceStats = useMemo(() => {
        const humans = resources.filter((r: any) => r.type === 'human' || r.resourceType === 'human');
        const totalPlanned = resources.reduce((sum: number, r: any) => sum + (r.plannedHours || r.planned_hours || 0), 0);
        const totalActual = resources.reduce((sum: number, r: any) => sum + (r.actualHours || r.actual_hours || 0), 0);
        const totalCost = resources.reduce((sum: number, r: any) => {
            const rate = r.hourlyRate || r.hourly_rate || 0;
            const hours = r.actualHours || r.actual_hours || r.plannedHours || r.planned_hours || 0;
            return sum + (rate * hours);
        }, 0);
        const overAllocated = humans.filter((r: any) => (r.allocation || r.allocationPercent || 0) > 100).length;
        return { total: resources.length, humans: humans.length, totalPlanned, totalActual, totalCost, overAllocated };
    }, [resources]);

    // ─── Type Distribution ──────────────────────────────
    const typeDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        resources.forEach((r: any) => {
            const type = r.type || r.resourceType || 'unknown';
            counts[type] = (counts[type] || 0) + 1;
        });
        const colorMap: Record<string, string> = { human: '#3b82f6', equipment: '#f59e0b', material: '#10b981', facility: '#8b5cf6' };
        return Object.entries(counts).map(([type, count]) => ({ name: type, value: count, color: colorMap[type] || '#6b7280' }));
    }, [resources]);

    // ─── Heatmap Logic ─────────────────────────────────
    const heatmapData = useMemo(() => {
        const assignees: Record<string, Record<string, number>> = {};
        const monthsSet = new Set<string>();
        
        tasks.forEach(t => {
            if (!t.assignee || t.status === 'done') return;
            const name = `${t.assignee.firstName} ${t.assignee.lastName}`;
            const start = t.startDate ? dayjs(t.startDate) : dayjs();
            const mKey = start.format('MMM YYYY');
            monthsSet.add(mKey);
            
            if (!assignees[name]) assignees[name] = {};
            assignees[name][mKey] = (assignees[name][mKey] || 0) + (t.estimatedHours || 0);
        });
        
        const months = Array.from(monthsSet).sort((a, b) => dayjs(a, 'MMM YYYY').valueOf() - dayjs(b, 'MMM YYYY').valueOf());
        if (months.length === 0) months.push(dayjs().format('MMM YYYY'));
        
        return { assignees, months };
    }, [tasks]);

    // ─── Handlers ──────────────────────────────────────
    const handleResSave = async (values: any) => {
        try {
            if (editingRes) {
                await gql(UPDATE_RESOURCE, { id: editingRes.id, input: values });
                messageApi.success("Resource updated.");
            } else {
                await gql(CREATE_RESOURCE, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Resource added.");
            }
            setResModal(false); loadResources();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleRaciSave = async (values: any) => {
        try {
            if (editingRaci) {
                await gql(UPDATE_RACI, { id: editingRaci.id, input: values });
                messageApi.success("RACI entry updated.");
            } else {
                await gql(CREATE_RACI, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("RACI entry added.");
            }
            setRaciModal(false); loadRaci();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    // ─── RACI Matrix Builder ───────────────────────────
    const buildRaciMatrix = () => {
        const deliverables = [...new Set(raci.map(r => r.deliverable))];
        const people = [...new Set(raci.map(r => r.personName))];

        const cols: any[] = [
            { title: "Deliverable", dataIndex: "deliverable", fixed: 'left', width: 200 },
            ...people.map(p => ({
                title: p, dataIndex: p, width: 100, align: 'center' as const,
                render: (val: string) => {
                    if (!val) return '-';
                    const colors: Record<string, string> = { R: 'red', A: 'orange', C: 'blue', I: 'green' };
                    return <Tag color={colors[val] || 'default'}>{val}</Tag>;
                }
            }))
        ];

        const data = deliverables.map(d => {
            const row: any = { deliverable: d, key: d };
            people.forEach(p => {
                const entry = raci.find(r => r.deliverable === d && r.personName === p);
                row[p] = entry?.roleType || '';
            });
            return row;
        });

        return { cols, data };
    };

    // ─── Resource Columns ──────────────────────────────
    const resCols: ProColumns<any>[] = [
        { title: "Name", dataIndex: "resourceName", width: "15%" },
        { title: "Role", dataIndex: "role" },
        { title: "Type", dataIndex: "resourceType", render: (_, r) => <Tag color={r.resourceType === 'human' ? 'blue' : r.resourceType === 'equipment' ? 'purple' : 'cyan'}>{r.resourceType?.toUpperCase()}</Tag> },
        { title: "Allocation", dataIndex: "allocationPercent", render: (_: any, r: any) => {
            const pct = r.allocationPercent || 0;
            return (
                <Space size={4}>
                    <span style={{ fontWeight: 600, color: pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : undefined }}>{pct}%</span>
                    {pct > 100 && <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 12 }} />}
                </Space>
            );
        }},
        { title: "Rate/hr", dataIndex: "hourlyRate", render: (_, r) => r.hourlyRate ? `$${r.hourlyRate}` : '-' },
        { title: "Planned / Actual", key: "hours", render: (_, r) => `${r.plannedHours || 0}h / ${r.actualHours || 0}h` },
        { title: "Status", dataIndex: "status", render: (_, r) => <Tag color={r.status === 'active' ? 'green' : r.status === 'released' ? 'default' : 'blue'}>{r.status?.toUpperCase()}</Tag> },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingRes(record); setResModal(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={async () => { await gql(DELETE_RESOURCE, { id: record.id }); messageApi.success("Deleted."); loadResources(); }}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    const { cols: raciCols, data: raciData } = buildRaciMatrix();

    return (
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${themeColor}` }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Total Resources</span>} value={resourceStats.total} prefix={<TeamOutlined style={{ color: themeColor }} />} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #3b82f6' }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Planned Hours</span>} value={resourceStats.totalPlanned} suffix="h" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #10b981' }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Actual Hours</span>} value={resourceStats.totalActual} suffix="h" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#10b981' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${resourceStats.overAllocated > 0 ? '#ef4444' : '#f59e0b'}` }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Est. Cost</span>} value={resourceStats.totalCost} prefix="$" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }} />
                    </Card>
                </Col>
            </Row>
            <Tabs defaultActiveKey="plan" items={[
                {
                    label: 'Resource Plan', key: 'plan',
                    children: (
                        <>
                        {typeDistribution.length > 0 && resources.length > 0 && (
                            <Card size="small" style={{ marginBottom: 12, borderRadius: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 100, height: 100 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} strokeWidth={0}>
                                                    {typeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                </Pie>
                                                <RTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {typeDistribution.map(t => (
                                            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                                                <span style={{ textTransform: 'capitalize' }}>{t.name}</span>
                                                <Tag style={{ margin: 0, fontSize: 10, borderRadius: 8 }}>{t.value}</Tag>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        )}
                        <ProTable headerTitle="Resource Allocation Plan" rowKey="id" dataSource={resources} loading={resLoading} columns={resCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRes(null); setResModal(true); }}>Add Resource</Button>
                            ]}
                        />
                        </>
                    )
                },
                {
                    label: 'RACI Matrix', key: 'raci',
                    children: (
                        <ProCard title={<Space><TeamOutlined /> RACI Matrix</Space>} extra={
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRaci(null); setRaciModal(true); }}>Add Entry</Button>
                        }>
                            <Table dataSource={raciData} columns={raciCols} loading={raciLoading} scroll={{ x: 'max-content' }}
                                size="small" pagination={false} bordered />
                        </ProCard>
                    )
                },
                {
                    label: 'Workload Heatmap', key: 'heatmap',
                    children: (
                        <ProCard title={<Space><CalendarOutlined /> Monthly Estimated Workload</Space>}>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ display: 'flex', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', paddingBottom: 8, marginBottom: 8, minWidth: 600 }}>
                                    <div style={{ width: 150, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Assignee</div>
                                    {heatmapData.months.map(m => (
                                        <div key={m} style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>{m}</div>
                                    ))}
                                </div>
                                {Object.keys(heatmapData.assignees).length === 0 ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>No assigned tasks found.</div>
                                ) : (
                                    Object.entries(heatmapData.assignees).map(([name, data]) => (
                                        <div key={name} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, minWidth: 600 }}>
                                            <div style={{ width: 150, fontWeight: 500, fontSize: 13 }}>{name}</div>
                                            {heatmapData.months.map(m => {
                                                const hours = data[m] || 0;
                                                // Color scale based on a rough 160h/month full time
                                                let bg = 'transparent';
                                                let color = isDark ? '#e2e8f0' : '#333';
                                                if (hours > 160) { bg = '#ef4444'; color = '#fff'; } // Overallocated
                                                else if (hours > 120) { bg = '#f59e0b'; color = '#fff'; } // Heavy
                                                else if (hours > 40) { bg = '#10b981'; color = '#fff'; } // Moderate
                                                else if (hours > 0) { bg = isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5'; } // Light
                                                
                                                return (
                                                    <div key={m} style={{ flex: 1, padding: 2 }}>
                                                        <div style={{ 
                                                            background: bg, color: color, 
                                                            borderRadius: 4, padding: '4px 0', 
                                                            textAlign: 'center', fontSize: 12, 
                                                            fontWeight: hours > 40 ? 600 : 400 
                                                        }}>
                                                            {hours > 0 ? `${hours}h` : '-'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                                <div style={{ marginTop: 24, display: 'flex', gap: 16, fontSize: 12 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }}/> &gt; 160h (Over)</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }}/> 120-160h (Heavy)</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }}/> 40-120h (Mod)</span>
                                </div>
                            </div>
                        </ProCard>
                    )
                }
            ]} />

            {/* Resource Modal */}
            <ModalForm title={editingRes ? "Edit Resource" : "Add Resource"} open={resModal} onOpenChange={setResModal}
                onFinish={handleResSave} initialValues={editingRes || { resourceType: 'human', allocationPercent: 100, status: 'assigned' }}
                modalProps={{ destroyOnClose: true }}>
                <ProFormText name="resourceName" label="Resource Name" rules={[{ required: true }]} />
                <ProForm.Group>
                    <ProFormText name="role" label="Role" width="md" />
                    <ProFormSelect name="resourceType" label="Type" width="sm" options={[
                        { value: 'human', label: 'Human' }, { value: 'equipment', label: 'Equipment' },
                        { value: 'material', label: 'Material' }, { value: 'facility', label: 'Facility' },
                    ]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDigit name="allocationPercent" label="Allocation %" min={0} max={100} width="sm" />
                    <ProFormDigit name="hourlyRate" label="Hourly Rate ($)" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDatePicker name="startDate" label="Start Date" width="sm" />
                    <ProFormDatePicker name="endDate" label="End Date" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDigit name="plannedHours" label="Planned Hours" width="sm" />
                    <ProFormDigit name="actualHours" label="Actual Hours" width="sm" />
                </ProForm.Group>
                <ProFormText name="skills" label="Skills" placeholder="e.g. React, Java, PM" />
                <ProFormTextArea name="notes" label="Notes" />
                <ProFormSelect name="status" label="Status" options={[
                    { value: 'assigned', label: 'Assigned' }, { value: 'active', label: 'Active' },
                    { value: 'released', label: 'Released' },
                ]} />
            </ModalForm>

            {/* RACI Modal */}
            <ModalForm title={editingRaci ? "Edit RACI Entry" : "Add RACI Entry"} open={raciModal} onOpenChange={setRaciModal}
                onFinish={handleRaciSave} initialValues={editingRaci || { roleType: 'R' }}
                modalProps={{ destroyOnClose: true }}>
                <ProFormText name="deliverable" label="Deliverable / Activity" rules={[{ required: true }]} />
                <ProFormText name="personName" label="Person Name" rules={[{ required: true }]} />
                <ProFormSelect name="roleType" label="RACI Role" rules={[{ required: true }]} options={[
                    { value: 'R', label: 'R — Responsible' },
                    { value: 'A', label: 'A — Accountable' },
                    { value: 'C', label: 'C — Consulted' },
                    { value: 'I', label: 'I — Informed' },
                ]} />
                <ProFormTextArea name="notes" label="Notes" />
            </ModalForm>
        </div>
    );
}
