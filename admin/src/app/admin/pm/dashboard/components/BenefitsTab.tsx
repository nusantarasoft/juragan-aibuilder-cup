"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProForm } from "@ant-design/pro-components";
import { Button, message, Space, Tag, Popconfirm, Progress, Card, Row, Col, Statistic } from "antd";
import { TrophyOutlined, PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";

const GET_BENEFITS = `
  query GetBenefits($projectId: String!) {
    pmBenefits(projectId: $projectId)
  }
`;

const CREATE_BENEFIT = `
  mutation CreateBenefit(
    $tenantId: String!, $projectId: String!, $benefitName: String!,
    $description: String, $category: String, $targetValue: String,
    $actualValue: String, $measurementMethod: String, $baseline: String,
    $targetDate: String, $owner: String, $status: String, $notes: String
  ) {
    createPmBenefit(
      tenantId: $tenantId, projectId: $projectId, benefitName: $benefitName,
      description: $description, category: $category, targetValue: $targetValue,
      actualValue: $actualValue, measurementMethod: $measurementMethod, baseline: $baseline,
      targetDate: $targetDate, owner: $owner, status: $status, notes: $notes
    )
  }
`;

const UPDATE_BENEFIT = `
  mutation UpdateBenefit(
    $id: ID!, $benefitName: String, $description: String, $category: String,
    $targetValue: String, $actualValue: String, $measurementMethod: String,
    $baseline: String, $targetDate: String, $owner: String, $status: String, $notes: String
  ) {
    updatePmBenefit(
      id: $id, benefitName: $benefitName, description: $description, category: $category,
      targetValue: $targetValue, actualValue: $actualValue, measurementMethod: $measurementMethod,
      baseline: $baseline, targetDate: $targetDate, owner: $owner, status: $status, notes: $notes
    )
  }
`;

const DELETE_BENEFIT = `
  mutation DeleteBenefit($id: ID!) {
    deletePmBenefit(id: $id)
  }
`;

const STATUS_OPTIONS = [
    { label: 'Planned', value: 'planned' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Realized', value: 'realized' },
    { label: 'At Risk', value: 'at_risk' },
    { label: 'Not Achieved', value: 'not_achieved' },
];

const CATEGORY_OPTIONS = [
    { label: 'Financial', value: 'financial' },
    { label: 'Operational', value: 'operational' },
    { label: 'Strategic', value: 'strategic' },
    { label: 'Customer', value: 'customer' },
    { label: 'Compliance', value: 'compliance' },
];

export default function BenefitsTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [benefits, setBenefits] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_BENEFITS, { projectId });
            setBenefits(data.pmBenefits || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_BENEFIT, { id });
            messageApi.success("Benefit deleted.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
        }
    };

    const handleFinish = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_BENEFIT, {
                    id: editing.id,
                    benefitName: values.benefitName || values.benefit_name,
                    description: values.description,
                    category: values.category,
                    targetValue: values.targetValue || values.target_value,
                    actualValue: values.actualValue || values.actual_value,
                    measurementMethod: values.measurementMethod || values.measurement_method,
                    baseline: values.baseline,
                    targetDate: values.targetDate || values.target_date,
                    owner: values.owner,
                    status: values.status,
                    notes: values.notes,
                });
                messageApi.success("Benefit updated.");
            } else {
                await gql(CREATE_BENEFIT, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    benefitName: values.benefitName,
                    description: values.description,
                    category: values.category,
                    targetValue: values.targetValue,
                    actualValue: values.actualValue,
                    measurementMethod: values.measurementMethod,
                    baseline: values.baseline,
                    targetDate: values.targetDate,
                    owner: values.owner,
                    status: values.status || 'planned',
                    notes: values.notes,
                });
                messageApi.success("Benefit added.");
            }
            setIsModalOpen(false);
            loadData();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
            return false;
        }
    };

    const realized = benefits.filter(b => (b.status === 'realized')).length;
    const inProgress = benefits.filter(b => (b.status === 'in_progress')).length;
    const atRisk = benefits.filter(b => (b.status === 'at_risk')).length;

    const columns: ProColumns<any>[] = [
        { title: "Benefit", dataIndex: "benefit_name", key: "benefit_name", render: (_, r) => <strong>{r.benefit_name || r.benefitName}</strong> },
        {
            title: "Category", dataIndex: "category", width: 120,
            render: (_, r) => r.category ? <Tag color="purple">{r.category}</Tag> : '-'
        },
        { title: "Target", dataIndex: "target_value", width: 140, render: (_, r) => r.target_value || r.targetValue || '-' },
        { title: "Actual", dataIndex: "actual_value", width: 140, render: (_, r) => r.actual_value || r.actualValue || '-' },
        { title: "Owner", dataIndex: "owner", width: 120 },
        {
            title: "Status", dataIndex: "status", width: 120,
            render: (_, r) => {
                const color = r.status === 'realized' ? 'green' : r.status === 'at_risk' ? 'red' : r.status === 'in_progress' ? 'blue' : 'default';
                return <Tag color={color}>{(r.status || 'planned').replace('_', ' ').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option", width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />}
                    onClick={() => {
                        setEditing({
                            ...record,
                            benefitName: record.benefit_name || record.benefitName,
                            targetValue: record.target_value || record.targetValue,
                            actualValue: record.actual_value || record.actualValue,
                            measurementMethod: record.measurement_method || record.measurementMethod,
                            targetDate: record.target_date || record.targetDate,
                        });
                        setIsModalOpen(true);
                    }}
                />,
                <Popconfirm key="del" title="Delete benefit?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={8}>
                    <Card size="small" style={{
                        background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                        border: `1px solid rgba(16, 185, 129, 0.2)`, borderRadius: 10,
                    }}>
                        <Statistic title="Realized" value={realized} prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{
                        background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                        border: `1px solid rgba(59, 130, 246, 0.2)`, borderRadius: 10,
                    }}>
                        <Statistic title="In Progress" value={inProgress} prefix={<ClockCircleOutlined style={{ color: '#3b82f6' }} />} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{
                        background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                        border: `1px solid rgba(239, 68, 68, 0.2)`, borderRadius: 10,
                    }}>
                        <Statistic title="At Risk" value={atRisk} prefix={<TrophyOutlined style={{ color: '#ef4444' }} />} />
                    </Card>
                </Col>
            </Row>

            <ProTable
                headerTitle={
                    <Space>
                        <TrophyOutlined style={{ color: '#8b5cf6' }} />
                        <span>Benefits Realization Management</span>
                    </Space>
                }
                rowKey="id"
                dataSource={benefits}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />}
                        onClick={() => { setEditing(null); setIsModalOpen(true); }}
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: 8 }}
                    >
                        Add Benefit
                    </Button>
                ]}
            />

            <ModalForm
                title={editing ? "Edit Benefit" : "Add Benefit"}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleFinish}
                initialValues={editing || { status: 'planned' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProFormText name="benefitName" label="Benefit Name" rules={[{ required: true }]} />
                <ProForm.Group>
                    <ProFormSelect name="category" label="Category" width="sm" options={CATEGORY_OPTIONS} />
                    <ProFormSelect name="status" label="Status" width="sm" options={STATUS_OPTIONS} />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormText name="targetValue" label="Target Value" width="sm" />
                    <ProFormText name="actualValue" label="Actual Value" width="sm" />
                    <ProFormText name="baseline" label="Baseline" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="measurementMethod" label="Measurement Method" width="md" />
                    <ProFormText name="targetDate" label="Target Date" width="sm" />
                    <ProFormText name="owner" label="Owner" width="sm" />
                </ProForm.Group>
                <ProFormTextArea name="notes" label="Notes" />
            </ModalForm>
        </div>
    );
}
