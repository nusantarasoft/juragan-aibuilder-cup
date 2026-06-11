"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ActionType, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormDigit, ProForm } from "@ant-design/pro-components";
import { Button, message, Space, Tag, Popconfirm, Row, Col, Card, Statistic, Tooltip, Typography } from "antd";
import { RobotOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';
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

    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const riskStats = {
        total: risks.length,
        high: risks.filter((r: any) => ((r.probability || 0) * (r.impact || 0)) >= 12).length,
        medium: risks.filter((r: any) => { const s = (r.probability || 0) * (r.impact || 0); return s >= 6 && s < 12; }).length,
        low: risks.filter((r: any) => ((r.probability || 0) * (r.impact || 0)) < 6).length,
        mitigated: risks.filter((r: any) => r.status === 'mitigated' || r.status === 'Mitigated').length,
    };

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

            {/* Summary Stat Cards */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${themeColor}`, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Total Risks</span>} value={riskStats.total} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #ef4444', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>High Risk</span>} value={riskStats.high} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #f59e0b', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Medium Risk</span>} value={riskStats.medium} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" style={{ borderRadius: 10, borderTop: '3px solid #10b981', background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                        <Statistic title={<span style={{ fontSize: 11 }}>Mitigated</span>} value={riskStats.mitigated} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#10b981' }} />
                    </Card>
                </Col>
            </Row>

            {/* Risk Heat Map */}
            <Card size="small" title={<Space><span style={{ fontWeight: 600 }}>Risk Heat Map</span><Tag>{risks.length} risks</Tag></Space>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 10, writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginBottom: 8 }}>Probability</Typography.Text>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
                            {[5, 4, 3, 2, 1].map(prob =>
                                [1, 2, 3, 4, 5].map(impact => {
                                    const score = prob * impact;
                                    const cellRisks = risks.filter((r: any) => (r.probability || 0) === prob && (r.impact || 0) === impact);
                                    const bg = score >= 15 ? '#dc2626' : score >= 10 ? '#f97316' : score >= 6 ? '#f59e0b' : score >= 3 ? '#84cc16' : '#22c55e';
                                    return (
                                        <Tooltip key={`${prob}-${impact}`} title={cellRisks.length > 0 ? cellRisks.map((r: any) => r.riskName || r.risk_name || 'Unnamed').join(', ') : `P${prob} x I${impact} = ${score}`}>
                                            <div style={{
                                                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                borderRadius: 6, background: `${bg}${cellRisks.length > 0 ? '' : '33'}`,
                                                border: cellRisks.length > 0 ? `2px solid ${bg}` : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                                cursor: cellRisks.length > 0 ? 'pointer' : 'default',
                                                transition: 'transform 0.15s',
                                                fontSize: 11, fontWeight: 600, color: cellRisks.length > 0 ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
                                                minHeight: 44,
                                            }}>
                                                {cellRisks.length > 0 ? cellRisks.length : score}
                                            </div>
                                        </Tooltip>
                                    );
                                })
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            {[1, 2, 3, 4, 5].map(i => <Typography.Text key={i} type="secondary" style={{ fontSize: 10, flex: 1, textAlign: 'center' }}>{i}</Typography.Text>)}
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'center', marginTop: 2 }}>Impact</Typography.Text>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                    {[{ label: 'Critical (15-25)', color: '#dc2626' }, { label: 'High (10-14)', color: '#f97316' }, { label: 'Medium (6-9)', color: '#f59e0b' }, { label: 'Low (3-5)', color: '#84cc16' }, { label: 'Minimal (1-2)', color: '#22c55e' }].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{l.label}</span>
                        </div>
                    ))}
                </div>
            </Card>

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
