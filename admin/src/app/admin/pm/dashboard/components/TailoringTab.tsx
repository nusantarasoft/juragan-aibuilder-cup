"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProForm } from "@ant-design/pro-components";
import { Button, message, Space, Tag, Popconfirm, Alert } from "antd";
import { ToolOutlined, PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const GET_TAILORING = `
  query GetTailoringLog($projectId: String!) {
    pmTailoringLog(projectId: $projectId)
  }
`;

const CREATE_TAILORING = `
  mutation CreateTailoring(
    $tenantId: String!, $projectId: String!, $area: String!,
    $tailoredApproach: String!, $rationale: String!,
    $originalApproach: String, $impact: String, $decidedBy: String, $status: String
  ) {
    createPmTailoringEntry(
      tenantId: $tenantId, projectId: $projectId, area: $area,
      tailoredApproach: $tailoredApproach, rationale: $rationale,
      originalApproach: $originalApproach, impact: $impact, decidedBy: $decidedBy, status: $status
    )
  }
`;

const UPDATE_TAILORING = `
  mutation UpdateTailoring(
    $id: ID!, $area: String, $tailoredApproach: String, $rationale: String,
    $originalApproach: String, $impact: String, $decidedBy: String, $status: String
  ) {
    updatePmTailoringEntry(
      id: $id, area: $area, tailoredApproach: $tailoredApproach, rationale: $rationale,
      originalApproach: $originalApproach, impact: $impact, decidedBy: $decidedBy, status: $status
    )
  }
`;

const DELETE_TAILORING = `
  mutation DeleteTailoring($id: ID!) {
    deletePmTailoringEntry(id: $id)
  }
`;

const AI_TAILORING = `
  query GenerateTailoring($projectId: String!) {
    generateTailoringRecommendations(projectId: $projectId)
  }
`;

const AREA_OPTIONS = [
    { label: 'Processes', value: 'processes' },
    { label: 'Engagement', value: 'engagement' },
    { label: 'Tools', value: 'tools' },
    { label: 'Methods', value: 'methods' },
    { label: 'Artifacts', value: 'artifacts' },
    { label: 'Life Cycle', value: 'life_cycle' },
    { label: 'Governance', value: 'governance' },
];

const STATUS_OPTIONS = [
    { label: 'Proposed', value: 'proposed' },
    { label: 'Approved', value: 'approved' },
    { label: 'Implemented', value: 'implemented' },
    { label: 'Rejected', value: 'rejected' },
];

export default function TailoringTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [entries, setEntries] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_TAILORING, { projectId });
            setEntries(data.pmTailoringLog || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_TAILORING, { id });
            messageApi.success("Entry deleted.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
        }
    };

    const handleFinish = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_TAILORING, {
                    id: editing.id,
                    area: values.area,
                    tailoredApproach: values.tailoredApproach || values.tailored_approach,
                    rationale: values.rationale,
                    originalApproach: values.originalApproach || values.original_approach,
                    impact: values.impact,
                    decidedBy: values.decidedBy || values.decided_by,
                    status: values.status,
                });
                messageApi.success("Entry updated.");
            } else {
                await gql(CREATE_TAILORING, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    area: values.area,
                    tailoredApproach: values.tailoredApproach,
                    rationale: values.rationale,
                    originalApproach: values.originalApproach,
                    impact: values.impact,
                    decidedBy: values.decidedBy,
                    status: values.status || 'proposed',
                });
                messageApi.success("Entry added.");
            }
            setIsModalOpen(false);
            loadData();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
            return false;
        }
    };

    const handleAiGenerate = async () => {
        setAiLoading(true);
        try {
            const data = await gql(AI_TAILORING, { projectId });
            const raw = data.generateTailoringRecommendations;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const recs = Array.isArray(parsed) ? parsed : (parsed?.recommendations || parsed?.items || []);
            for (const r of recs) {
                await gql(CREATE_TAILORING, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    area: r.area || 'processes',
                    tailoredApproach: r.tailoredApproach || r.tailored_approach || '',
                    rationale: r.rationale || '',
                    originalApproach: r.originalApproach || r.original_approach || '',
                    impact: r.impact || '',
                    decidedBy: 'AI',
                    status: 'proposed',
                });
            }
            messageApi.success(`Added ${recs.length} AI recommendations.`);
            loadData();
        } catch (error: any) {
            messageApi.error(`AI generation failed: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const columns: ProColumns<any>[] = [
        {
            title: "Area", dataIndex: "area", width: 120,
            render: (_, r) => <Tag color="blue">{(r.area || '').toUpperCase()}</Tag>
        },
        {
            title: "Tailored Approach", dataIndex: "tailored_approach",
            render: (_, r) => r.tailored_approach || r.tailoredApproach || '-',
        },
        {
            title: "Original Approach", dataIndex: "original_approach", width: 200,
            render: (_, r) => r.original_approach || r.originalApproach || '-',
        },
        { title: "Rationale", dataIndex: "rationale", width: 200, ellipsis: true },
        {
            title: "Decided By", dataIndex: "decided_by", width: 100,
            render: (_, r) => r.decided_by || r.decidedBy || '-',
        },
        {
            title: "Status", dataIndex: "status", width: 110,
            render: (_, r) => {
                const color = r.status === 'approved' ? 'green' : r.status === 'implemented' ? 'cyan' : r.status === 'rejected' ? 'red' : 'default';
                return <Tag color={color}>{(r.status || 'proposed').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option", width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />}
                    onClick={() => {
                        setEditing({
                            ...record,
                            tailoredApproach: record.tailored_approach || record.tailoredApproach,
                            originalApproach: record.original_approach || record.originalApproach,
                            decidedBy: record.decided_by || record.decidedBy,
                        });
                        setIsModalOpen(true);
                    }}
                />,
                <Popconfirm key="del" title="Delete entry?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <Alert
                message="Tailoring Log"
                description="Document how project management processes, methods, and artifacts have been tailored to fit the specific project context. PMBOK 7 emphasizes that every project is unique and tailoring is essential."
                type="info"
                showIcon
                icon={<ToolOutlined />}
                style={{ marginBottom: 16, borderRadius: 10 }}
            />

            <ProTable
                headerTitle={
                    <Space>
                        <ToolOutlined style={{ color: '#8b5cf6' }} />
                        <span>Tailoring Decisions</span>
                    </Space>
                }
                rowKey="id"
                dataSource={entries}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="ai" type="dashed" icon={<RobotOutlined />}
                        loading={aiLoading} onClick={handleAiGenerate}>
                        AI Recommend
                    </Button>,
                    <Button key="add" type="primary" icon={<PlusOutlined />}
                        onClick={() => { setEditing(null); setIsModalOpen(true); }}
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: 8 }}
                    >
                        Add Entry
                    </Button>
                ]}
            />

            <ModalForm
                title={editing ? "Edit Tailoring Entry" : "Add Tailoring Entry"}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleFinish}
                initialValues={editing || { status: 'proposed' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormSelect name="area" label="Area" width="sm" options={AREA_OPTIONS} rules={[{ required: true }]} />
                    <ProFormSelect name="status" label="Status" width="sm" options={STATUS_OPTIONS} />
                </ProForm.Group>
                <ProFormTextArea name="tailoredApproach" label="Tailored Approach" rules={[{ required: true }]}
                    placeholder="Describe the tailored approach..." />
                <ProFormTextArea name="originalApproach" label="Original Approach"
                    placeholder="What was the standard/original approach?" />
                <ProFormTextArea name="rationale" label="Rationale" rules={[{ required: true }]}
                    placeholder="Why was tailoring necessary?" />
                <ProForm.Group>
                    <ProFormTextArea name="impact" label="Impact" width="md"
                        placeholder="What is the impact of this tailoring?" />
                    <ProFormText name="decidedBy" label="Decided By" width="sm" />
                </ProForm.Group>
            </ModalForm>
        </div>
    );
}
