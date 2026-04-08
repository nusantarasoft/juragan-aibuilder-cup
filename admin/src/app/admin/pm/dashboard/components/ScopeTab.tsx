"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Tabs, Descriptions, Spin, Space, Empty, Tree } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined, SaveOutlined, ApartmentOutlined, ScheduleOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL Queries ───────────────────────────────────────
const GET_SCOPE = `query($projectId: String!) { pmScopeStatement(projectId: $projectId) { id projectObjectives productScopeDescription deliverables acceptanceCriteria exclusions constraints assumptions } }`;
const UPSERT_SCOPE = `mutation($projectId: String!, $tenantId: String!, $input: UpsertPmScopeStatementInput!) { upsertPmScopeStatement(projectId: $projectId, tenantId: $tenantId, input: $input) { id } }`;

const GET_WBS = `query($projectId: String!) { pmWbsItems(projectId: $projectId) { id parentId wbsCode title description level sortOrder status assignedTo estimatedCost actualCost } }`;
const CREATE_WBS = `mutation($tenantId: String!, $input: CreatePmWbsItemInput!) { createPmWbsItem(tenantId: $tenantId, input: $input) { id title } }`;
const UPDATE_WBS = `mutation($id: ID!, $input: UpdatePmWbsItemInput!) { updatePmWbsItem(id: $id, input: $input) { id title } }`;
const DELETE_WBS = `mutation($id: ID!) { deletePmWbsItem(id: $id) }`;

const GET_REQS = `query($projectId: String!) { pmRequirements(projectId: $projectId) { id requirementId title description category priority source status verificationMethod } }`;
const CREATE_REQ = `mutation($tenantId: String!, $input: CreatePmRequirementInput!) { createPmRequirement(tenantId: $tenantId, input: $input) { id title } }`;
const UPDATE_REQ = `mutation($id: ID!, $input: UpdatePmRequirementInput!) { updatePmRequirement(id: $id, input: $input) { id title } }`;
const DELETE_REQ = `mutation($id: ID!) { deletePmRequirement(id: $id) }`;

const AI_GENERATE_WBS = `query($projectId: String!) { generateWbs(projectId: $projectId) }`;
const AI_GENERATE_TASKS = `query($projectId: String!) { generateTasksFromWbs(projectId: $projectId) }`;
const AI_GENERATE_SCHEDULE = `query($projectId: String!) { generateScheduleFromWbs(projectId: $projectId) }`;

const CREATE_TASK = `mutation($tenantId: String!, $input: CreatePmTaskInput!) { createPmTask(tenantId: $tenantId, input: $input) { id title } }`;
const CREATE_MILESTONE = `mutation($tenantId: String!, $input: CreatePmMilestoneInput!) { createPmMilestone(tenantId: $tenantId, input: $input) { id name } }`;
const CREATE_ACTIVITY = `mutation($tenantId: String!, $input: JSON!) { createPmActivity(tenantId: $tenantId, input: $input) }`;

export default function ScopeTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();

    // Scope Statement
    const [scope, setScope] = useState<any>(null);
    const [scopeLoading, setScopeLoading] = useState(true);
    const [scopeEditing, setScopeEditing] = useState(false);

    // WBS
    const [wbsItems, setWbsItems] = useState<any[]>([]);
    const [wbsLoading, setWbsLoading] = useState(true);
    const [wbsModalOpen, setWbsModalOpen] = useState(false);
    const [editingWbs, setEditingWbs] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiTaskLoading, setAiTaskLoading] = useState(false);
    const [aiSchedLoading, setAiSchedLoading] = useState(false);

    // Requirements
    const [reqs, setReqs] = useState<any[]>([]);
    const [reqsLoading, setReqsLoading] = useState(true);
    const [reqModalOpen, setReqModalOpen] = useState(false);
    const [editingReq, setEditingReq] = useState<any>(null);

    // ─── Loaders ───────────────────────────────────────
    const loadScope = React.useCallback(async () => {
        setScopeLoading(true);
        try {
            const data = await gql(GET_SCOPE, { projectId });
            setScope(data.pmScopeStatement);
        } catch { messageApi.error("Failed to load scope statement."); }
        finally { setScopeLoading(false); }
    }, [projectId, messageApi]);

    const loadWbs = React.useCallback(async () => {
        setWbsLoading(true);
        try {
            const data = await gql(GET_WBS, { projectId });
            setWbsItems(data.pmWbsItems || []);
        } catch { messageApi.error("Failed to load WBS."); }
        finally { setWbsLoading(false); }
    }, [projectId, messageApi]);

    const loadReqs = React.useCallback(async () => {
        setReqsLoading(true);
        try {
            const data = await gql(GET_REQS, { projectId });
            setReqs(data.pmRequirements || []);
        } catch { messageApi.error("Failed to load requirements."); }
        finally { setReqsLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadScope(); loadWbs(); loadReqs(); }, [loadScope, loadWbs, loadReqs]);

    // ─── Scope Statement Handlers ──────────────────────
    const handleScopeSave = async (values: any) => {
        try {
            await gql(UPSERT_SCOPE, { projectId, tenantId: DEFAULT_TENANT_ID, input: values });
            messageApi.success("Scope statement saved.");
            setScopeEditing(false);
            loadScope();
            return true;
        } catch (err: any) { messageApi.error(`Save failed: ${err.message}`); return false; }
    };

    // ─── WBS Handlers ──────────────────────────────────
    const handleWbsSave = async (values: any) => {
        try {
            if (editingWbs) {
                await gql(UPDATE_WBS, { id: editingWbs.id, input: values });
                messageApi.success("WBS item updated.");
            } else {
                await gql(CREATE_WBS, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("WBS item created.");
            }
            setWbsModalOpen(false);
            loadWbs();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleDeleteWbs = async (id: string) => {
        try { await gql(DELETE_WBS, { id }); messageApi.success("WBS item deleted."); loadWbs(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const handleAiWbs = async () => {
        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_WBS, { projectId });
            const raw = data.generateWbs;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

            // Flatten nested WBS tree into flat items preserving wbsCode
            const flattenWbs = (nodes: any[], result: any[] = []): any[] => {
                for (const n of nodes) {
                    result.push({ wbsCode: n.wbsCode, title: n.title, description: n.description, level: n.level ?? 0 });
                    if (n.children?.length) flattenWbs(n.children, result);
                }
                return result;
            };
            const rawItems = Array.isArray(parsed) ? parsed : (parsed?.items || []);
            const items = flattenWbs(rawItems);

            // Sort by wbsCode to ensure parents are created before children
            items.sort((a, b) => (a.wbsCode || '').localeCompare(b.wbsCode || '', undefined, { numeric: true }));

            // Track wbsCode → database UUID for parent linking
            const codeToId = new Map<string, string>();

            for (const item of items) {
                // Derive parent wbsCode: "1.2.3" → "1.2", "1" → null
                let parentId: string | null = null;
                if (item.wbsCode) {
                    const parts = item.wbsCode.split('.');
                    if (parts.length > 1) {
                        const parentCode = parts.slice(0, -1).join('.');
                        parentId = codeToId.get(parentCode) || null;
                    }
                }

                const result = await gql(CREATE_WBS, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId,
                        title: item.title,
                        wbsCode: item.wbsCode,
                        description: item.description,
                        level: item.level ?? 0,
                        parentId,
                    }
                });

                // Store mapping: wbsCode → created item id
                if (item.wbsCode && result.createPmWbsItem?.id) {
                    codeToId.set(item.wbsCode, result.createPmWbsItem.id);
                }
            }

            messageApi.success(`Added ${items.length} WBS items from AI.`);
            loadWbs();
        } catch (err: any) { messageApi.error(`AI failed: ${err.message}`); }
        finally { setAiLoading(false); }
    };

    // ─── Generate Tasks from WBS ──────────────────────────
    const handleAiTasks = async () => {
        setAiTaskLoading(true);
        try {
            const data = await gql(AI_GENERATE_TASKS, { projectId });
            const raw = data.generateTasksFromWbs;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const tasks = Array.isArray(parsed) ? parsed : (parsed?.tasks || parsed?.items || []);
            let count = 0;
            for (const t of tasks) {
                await gql(CREATE_TASK, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId,
                        title: t.title,
                        description: t.description || `WBS: ${t.wbsCode || 'N/A'}`,
                        priority: t.priority || 'medium',
                        type: t.type || 'task',
                        estimatedHours: t.estimatedHours || 0,
                        status: 'todo',
                    }
                });
                count++;
            }
            messageApi.success(`Created ${count} tasks from WBS. Check Kanban Board!`);
        } catch (err: any) { messageApi.error(`AI failed: ${err.message}`); }
        finally { setAiTaskLoading(false); }
    };

    // ─── Generate Schedule from WBS ──────────────────────────
    const handleAiSchedule = async () => {
        setAiSchedLoading(true);
        try {
            const data = await gql(AI_GENERATE_SCHEDULE, { projectId });
            const raw = data.generateScheduleFromWbs;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const milestones = Array.isArray(parsed) ? parsed : (parsed?.milestones || []);
            const activities = parsed?.activities || [];
            let msCount = 0, actCount = 0;
            for (const ms of milestones) {
                await gql(CREATE_MILESTONE, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: { projectId, name: ms.name, description: ms.description || '', dueDate: ms.plannedDate || ms.dueDate, status: ms.status || 'pending' }
                });
                msCount++;
            }
            for (const act of activities) {
                await gql(CREATE_ACTIVITY, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: { projectId, name: act.name, description: act.description || '', durationDays: act.durationDays || 5, status: 'not_started' }
                });
                actCount++;
            }
            messageApi.success(`Created ${msCount} milestones & ${actCount} activities. Check Schedule tab!`);
        } catch (err: any) { messageApi.error(`AI failed: ${err.message}`); }
        finally { setAiSchedLoading(false); }
    };

    // ─── Requirements Handlers ─────────────────────────
    const handleReqSave = async (values: any) => {
        try {
            if (editingReq) {
                await gql(UPDATE_REQ, { id: editingReq.id, input: values });
                messageApi.success("Requirement updated.");
            } else {
                await gql(CREATE_REQ, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Requirement created.");
            }
            setReqModalOpen(false);
            loadReqs();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleDeleteReq = async (id: string) => {
        try { await gql(DELETE_REQ, { id }); messageApi.success("Requirement deleted."); loadReqs(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    // ─── WBS Tree Builder ──────────────────────────────
    const buildWbsTree = (items: any[]): any[] => {
        const map = new Map();
        const roots: any[] = [];
        items.forEach(item => map.set(item.id, {
            ...item,
            key: item.id,
            title: item.title,
            wbsCode: item.wbsCode || '',
            level: item.level ?? 0,
            children: []
        }));
        map.forEach(node => {
            if (node.parentId && map.has(node.parentId)) {
                map.get(node.parentId).children.push(node);
            } else {
                roots.push(node);
            }
        });
        // Sort each level by wbsCode
        const sortChildren = (nodes: any[]) => {
            nodes.sort((a: any, b: any) => (a.wbsCode || '').localeCompare(b.wbsCode || '', undefined, { numeric: true }));
            nodes.forEach((n: any) => { if (n.children?.length) sortChildren(n.children); });
        };
        sortChildren(roots);
        return roots;
    };

    // ─── Columns ───────────────────────────────────────
    const reqColumns: ProColumns<any>[] = [
        { title: "ID", dataIndex: "requirementId", width: 100 },
        { title: "Title", dataIndex: "title", width: "20%" },
        { title: "Category", dataIndex: "category", render: (_, r) => r.category ? <Tag color="blue">{r.category}</Tag> : '-' },
        { title: "Priority", dataIndex: "priority", render: (_, r) => {
            const c = r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'orange' : 'green';
            return <Tag color={c}>{r.priority?.toUpperCase()}</Tag>;
        }},
        { title: "Status", dataIndex: "status", render: (_, r) => {
            const c = r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'default';
            return <Tag color={c}>{r.status?.toUpperCase()}</Tag>;
        }},
        { title: "Verification", dataIndex: "verificationMethod", ellipsis: true },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingReq(record); setReqModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDeleteReq(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <Tabs defaultActiveKey="scope" items={[
                {
                    label: 'Scope Statement', key: 'scope',
                    children: scopeLoading ? <Spin /> : (
                        <ProCard title="Project Scope Statement" extra={
                            <Button icon={scopeEditing ? <SaveOutlined /> : <EditOutlined />} onClick={() => setScopeEditing(!scopeEditing)}>
                                {scopeEditing ? 'Cancel' : 'Edit'}
                            </Button>
                        }>
                            {scopeEditing ? (
                                <ModalForm
                                    title="Edit Scope Statement"
                                    open={scopeEditing}
                                    onOpenChange={setScopeEditing}
                                    onFinish={handleScopeSave}
                                    initialValues={scope || {}}
                                    modalProps={{ destroyOnClose: true }}
                                >
                                    <ProFormTextArea name="projectObjectives" label="Project Objectives" />
                                    <ProFormTextArea name="productScopeDescription" label="Product Scope Description" />
                                    <ProFormTextArea name="deliverables" label="Deliverables" />
                                    <ProFormTextArea name="acceptanceCriteria" label="Acceptance Criteria" />
                                    <ProFormTextArea name="exclusions" label="Exclusions" />
                                    <ProFormTextArea name="constraints" label="Constraints" />
                                    <ProFormTextArea name="assumptions" label="Assumptions" />
                                </ModalForm>
                            ) : scope ? (
                                <Descriptions column={1} bordered size="small">
                                    <Descriptions.Item label="Project Objectives">{scope.projectObjectives || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Product Scope">{scope.productScopeDescription || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Deliverables">{scope.deliverables || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Acceptance Criteria">{scope.acceptanceCriteria || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Exclusions">{scope.exclusions || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Constraints">{scope.constraints || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Assumptions">{scope.assumptions || '-'}</Descriptions.Item>
                                </Descriptions>
                            ) : <Empty description="No scope statement yet. Click Edit to create one." />}
                        </ProCard>
                    )
                },
                {
                    label: 'Work Breakdown Structure', key: 'wbs',
                    children: (
                        <ProCard
                            title={<Space><ApartmentOutlined /> Work Breakdown Structure</Space>}
                            extra={
                                <Space>
                                    <Button type="dashed" icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiWbs}>Generate WBS (AI)</Button>
                                    <Button type="dashed" icon={<UnorderedListOutlined />} loading={aiTaskLoading} onClick={handleAiTasks}>Generate Tasks</Button>
                                    <Button type="dashed" icon={<ScheduleOutlined />} loading={aiSchedLoading} onClick={handleAiSchedule}>Generate Schedule</Button>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingWbs(null); setWbsModalOpen(true); }}>Add Item</Button>
                                </Space>
                            }
                        >
                            {wbsLoading ? <Spin /> : wbsItems.length > 0 ? (
                                <Tree
                                    treeData={buildWbsTree(wbsItems)}
                                    defaultExpandAll
                                    showLine={{ showLeafIcon: false }}
                                    showIcon
                                    blockNode
                                    style={{ fontSize: 13 }}
                                    titleRender={(node: any) => (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                            <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 36, textAlign: 'center', margin: 0 }}>
                                                {node.wbsCode || '-'}
                                            </Tag>
                                            <span style={{ fontWeight: node.level <= 1 ? 600 : 400, flex: 1 }}>{node.title?.replace(/^\d+(\.\d+)*\s*/, '')}</span>
                                            <Tag color={node.status === 'completed' ? 'green' : node.status === 'in_progress' ? 'processing' : 'default'}
                                                 style={{ fontSize: 10, borderRadius: 4 }}>
                                                {(node.status || 'pending').toUpperCase()}
                                            </Tag>
                                            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setEditingWbs(node); setWbsModalOpen(true); }} />
                                            <Popconfirm title="Delete this WBS item?" onConfirm={() => handleDeleteWbs(node.id)}>
                                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                                            </Popconfirm>
                                        </div>
                                    )}
                                />
                            ) : <Empty description="No WBS items yet." />}
                        </ProCard>
                    )
                },
                {
                    label: 'Requirements', key: 'requirements',
                    children: (
                        <>
                            <ProTable
                                headerTitle="Requirements Traceability Matrix"
                                rowKey="id"
                                dataSource={reqs}
                                loading={reqsLoading}
                                columns={reqColumns}
                                search={false}
                                toolBarRender={() => [
                                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingReq(null); setReqModalOpen(true); }}>Add Requirement</Button>
                                ]}
                            />
                        </>
                    )
                }
            ]} />

            {/* WBS Item Modal */}
            <ModalForm
                title={editingWbs ? "Edit WBS Item" : "Add WBS Item"}
                open={wbsModalOpen}
                onOpenChange={setWbsModalOpen}
                onFinish={handleWbsSave}
                initialValues={editingWbs || { level: 1, sortOrder: 0, status: 'pending' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProFormText name="title" label="Title" rules={[{ required: true }]} />
                <ProForm.Group>
                    <ProFormText name="wbsCode" label="WBS Code" placeholder="e.g. 1.1.2" width="sm" />
                    <ProFormSelect name="parentId" label="Parent Item" width="md" options={wbsItems.map(w => ({ value: w.id, label: `${w.wbsCode || ''} ${w.title}` }))} />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                    ]} />
                </ProForm.Group>
            </ModalForm>

            {/* Requirement Modal */}
            <ModalForm
                title={editingReq ? "Edit Requirement" : "Add Requirement"}
                open={reqModalOpen}
                onOpenChange={setReqModalOpen}
                onFinish={handleReqSave}
                initialValues={editingReq || { priority: 'medium', status: 'proposed' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormText name="requirementId" label="Requirement ID" placeholder="REQ-001" width="sm" />
                    <ProFormText name="title" label="Title" rules={[{ required: true }]} width="md" />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormSelect name="category" label="Category" width="sm" options={[
                        { value: 'functional', label: 'Functional' },
                        { value: 'non_functional', label: 'Non-Functional' },
                        { value: 'business', label: 'Business' },
                        { value: 'technical', label: 'Technical' },
                    ]} />
                    <ProFormSelect name="priority" label="Priority" width="sm" options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                    ]} />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'proposed', label: 'Proposed' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'implemented', label: 'Implemented' },
                        { value: 'verified', label: 'Verified' },
                    ]} />
                </ProForm.Group>
                <ProFormText name="source" label="Source" placeholder="Stakeholder name or document" />
                <ProFormText name="verificationMethod" label="Verification Method" placeholder="e.g. Testing, Inspection, Demonstration" />
            </ModalForm>
        </div>
    );
}
