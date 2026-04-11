"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDigit, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Space, Table, Row, Col } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined } from "@ant-design/icons";
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

export default function ResourceTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();

    const [resources, setResources] = useState<any[]>([]);
    const [resLoading, setResLoading] = useState(true);
    const [resModal, setResModal] = useState(false);
    const [editingRes, setEditingRes] = useState<any>(null);

    const [raci, setRaci] = useState<any[]>([]);
    const [raciLoading, setRaciLoading] = useState(true);
    const [raciModal, setRaciModal] = useState(false);
    const [editingRaci, setEditingRaci] = useState<any>(null);

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

    useEffect(() => { loadResources(); loadRaci(); }, [loadResources, loadRaci]);

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
        { title: "Allocation", dataIndex: "allocationPercent", render: (_, r) => `${r.allocationPercent}%` },
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
            <Tabs defaultActiveKey="plan" items={[
                {
                    label: 'Resource Plan', key: 'plan',
                    children: (
                        <ProTable headerTitle="Resource Allocation Plan" rowKey="id" dataSource={resources} loading={resLoading} columns={resCols} search={false}
                            toolBarRender={() => [
                                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRes(null); setResModal(true); }}>Add Resource</Button>
                            ]}
                        />
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
