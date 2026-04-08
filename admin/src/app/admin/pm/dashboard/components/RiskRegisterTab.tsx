"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ActionType, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormDigit, ProForm } from "@ant-design/pro-components";
import { Button, message, Space, Tag, Popconfirm } from "antd";
import { RobotOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const GET_RISKS = `
  query GetRiskRegisters($projectId: String!) {
    pmRiskRegisters(projectId: $projectId) {
      id riskName description category probability impact mitigationStrategy contingencyPlan status riskScore
      owner { firstName lastName }
    }
  }
`;

const CREATE_RISK = `
  mutation CreateRiskRegister($tenantId: String!, $input: CreatePmRiskRegisterInput!) {
    createPmRiskRegister(tenantId: $tenantId, input: $input) {
      id riskName status
    }
  }
`;

const UPDATE_RISK = `
  mutation UpdateRiskRegister($id: ID!, $input: UpdatePmRiskRegisterInput!) {
    updatePmRiskRegister(id: $id, input: $input) {
      id riskName status
    }
  }
`;

const DELETE_RISK = `
  mutation DeleteRiskRegister($id: ID!) {
    deletePmRiskRegister(id: $id)
  }
`;

const AI_GENERATE_RISKS = `
  query GenerateRiskRegister($projectId: String!) {
    generateRiskRegister(projectId: $projectId)
  }
`;

export default function RiskRegisterTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [risks, setRisks] = useState<any[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<any>(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_RISKS, { projectId });
            setRisks(data.pmRiskRegisters || []);
        } catch (error) {
            messageApi.error("Failed to load Risk Register.");
        } finally {
            setLoading(false);
        }
    }, [projectId, messageApi]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAiDetect = async () => {
        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_RISKS, { projectId });
            const raw = data.generateRiskRegister;
            // AI returns { risks: [...] } or a JSON string
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const generatedRisks = Array.isArray(parsed) ? parsed : (parsed?.risks || parsed?.items || []);

            // Insert each generated risk
            for (const r of generatedRisks) {
                await gql(CREATE_RISK, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId,
                        riskName: r.riskName,
                        description: r.description,
                        category: r.category,
                        probability: r.probability || 3,
                        impact: r.impact || 3,
                        mitigationStrategy: r.mitigationStrategy,
                        contingencyPlan: r.contingencyPlan,
                        status: 'identified'
                    }
                });
            }
            messageApi.success(`Successfully added ${generatedRisks.length} AI-detected risks.`);
            loadData();
        } catch (error: any) {
            messageApi.error(`AI Detection failed: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_RISK, { id });
            messageApi.success("Risk deleted.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Failed to delete: ${error.message}`);
        }
    };

    const handleFinish = async (values: any) => {
        try {
            if (editingRisk) {
                await gql(UPDATE_RISK, { id: editingRisk.id, input: values });
                messageApi.success("Risk updated.");
            } else {
                await gql(CREATE_RISK, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Risk added.");
            }
            setIsModalOpen(false);
            loadData();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed to save: ${error.message}`);
            return false;
        }
    };

    const columns: ProColumns<any>[] = [
        { title: "Risk Name", dataIndex: "riskName", width: "20%" },
        {
            title: "Category", dataIndex: "category",
            render: (_, record) => <Tag color="blue">{record.category}</Tag>
        },
        {
            title: "Score", dataIndex: "riskScore",
            render: (_, record) => {
                const score = record.riskScore || 0;
                let color = "success";
                if (score >= 12) color = "error";
                else if (score >= 6) color = "warning";
                return <Tag color={color}>{score} (P{record.probability}×I{record.impact})</Tag>;
            }
        },
        {
            title: "Status", dataIndex: "status",
            render: (_, record) => {
                const color = record.status === "mitigated" ? "green" : (record.status === "realized" ? "red" : "default");
                return <Tag color={color}>{record.status.toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions",
            valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditingRisk(record); setIsModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete risk?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <ProTable
                headerTitle="Project Risk Register"
                rowKey="id"
                dataSource={risks}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="ai" type="dashed" icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiDetect}>
                        Auto-Detect Risks (AI)
                    </Button>,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRisk(null); setIsModalOpen(true); }}>
                        Add Risk
                    </Button>
                ]}
            />

            <ModalForm
                title={editingRisk ? "Edit Risk" : "Add Risk"}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleFinish}
                initialValues={editingRisk || { probability: 3, impact: 3, status: 'identified' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProFormText name="riskName" label="Risk Title" rules={[{ required: true }]} />
                <ProForm.Group>
                    <ProFormSelect name="category" label="Category" width="sm" options={[
                        { label: 'Technical', value: 'Technical' },
                        { label: 'Management', value: 'Management' },
                        { label: 'Organizational', value: 'Organizational' },
                        { label: 'External', value: 'External' },
                    ]} rules={[{ required: true }]} />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { label: 'Identified', value: 'identified' },
                        { label: 'Mitigated', value: 'mitigated' },
                        { label: 'Realized', value: 'realized' },
                        { label: 'Closed', value: 'closed' },
                    ]} rules={[{ required: true }]} />
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormDigit name="probability" label="Probability (1-5)" min={1} max={5} width="sm" rules={[{ required: true }]} />
                    <ProFormDigit name="impact" label="Impact (1-5)" min={1} max={5} width="sm" rules={[{ required: true }]} />
                </ProForm.Group>

                <ProFormTextArea name="description" label="Description" />
                <ProFormTextArea name="mitigationStrategy" label="Mitigation Strategy" />
                <ProFormTextArea name="contingencyPlan" label="Contingency Plan" />
            </ModalForm>
        </div>
    );
}
