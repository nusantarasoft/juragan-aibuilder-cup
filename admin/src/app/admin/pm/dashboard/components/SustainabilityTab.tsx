"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProForm, ProFormDigit } from "@ant-design/pro-components";
import { Button, message, Space, Tag, Popconfirm, Row, Col, Card, Statistic, Progress, Alert } from "antd";
import { GlobalOutlined, PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined, ThunderboltOutlined, HeartOutlined, TeamOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";

const GET_METRICS = `
  query GetSustainabilityMetrics($projectId: String!) {
    pmSustainabilityMetrics(projectId: $projectId)
  }
`;

const CREATE_METRIC = `
  mutation CreateSustainability(
    $tenantId: String!, $projectId: String!, $dimension: String!, $metricName: String!,
    $description: String, $unit: String, $targetValue: Float, $actualValue: Float,
    $baselineValue: Float, $measurementPeriod: String, $dataSource: String, $status: String, $notes: String
  ) {
    createPmSustainabilityMetric(
      tenantId: $tenantId, projectId: $projectId, dimension: $dimension, metricName: $metricName,
      description: $description, unit: $unit, targetValue: $targetValue, actualValue: $actualValue,
      baselineValue: $baselineValue, measurementPeriod: $measurementPeriod, dataSource: $dataSource,
      status: $status, notes: $notes
    )
  }
`;

const UPDATE_METRIC = `
  mutation UpdateSustainability(
    $id: ID!, $dimension: String, $metricName: String, $description: String, $unit: String,
    $targetValue: Float, $actualValue: Float, $baselineValue: Float,
    $measurementPeriod: String, $dataSource: String, $status: String, $notes: String
  ) {
    updatePmSustainabilityMetric(
      id: $id, dimension: $dimension, metricName: $metricName, description: $description, unit: $unit,
      targetValue: $targetValue, actualValue: $actualValue, baselineValue: $baselineValue,
      measurementPeriod: $measurementPeriod, dataSource: $dataSource, status: $status, notes: $notes
    )
  }
`;

const DELETE_METRIC = `
  mutation DeleteSustainability($id: ID!) {
    deletePmSustainabilityMetric(id: $id)
  }
`;

const AI_SUSTAINABILITY = `
  query GenerateSustainability($projectId: String!) {
    generateSustainabilityImpact(projectId: $projectId)
  }
`;

const DIMENSION_OPTIONS = [
    { label: '🌍 Environmental', value: 'environmental', color: '#10b981', icon: <ThunderboltOutlined /> },
    { label: '👥 Social', value: 'social', color: '#3b82f6', icon: <TeamOutlined /> },
    { label: '💰 Economic', value: 'economic', color: '#f59e0b', icon: <HeartOutlined /> },
    { label: '🏢 Governance', value: 'governance', color: '#8b5cf6', icon: <GlobalOutlined /> },
];

const STATUS_OPTIONS = [
    { label: 'Baseline Set', value: 'baseline' },
    { label: 'Tracking', value: 'tracking' },
    { label: 'On Target', value: 'on_target' },
    { label: 'Below Target', value: 'below_target' },
    { label: 'Exceeded', value: 'exceeded' },
];

export default function SustainabilityTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_METRICS, { projectId });
            setMetrics(data.pmSustainabilityMetrics || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_METRIC, { id });
            messageApi.success("Metric deleted.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
        }
    };

    const handleFinish = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_METRIC, {
                    id: editing.id,
                    dimension: values.dimension,
                    metricName: values.metricName || values.metric_name,
                    description: values.description,
                    unit: values.unit,
                    targetValue: values.targetValue ?? values.target_value,
                    actualValue: values.actualValue ?? values.actual_value,
                    baselineValue: values.baselineValue ?? values.baseline_value,
                    measurementPeriod: values.measurementPeriod || values.measurement_period,
                    dataSource: values.dataSource || values.data_source,
                    status: values.status,
                    notes: values.notes,
                });
                messageApi.success("Metric updated.");
            } else {
                await gql(CREATE_METRIC, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    dimension: values.dimension,
                    metricName: values.metricName,
                    description: values.description,
                    unit: values.unit,
                    targetValue: values.targetValue,
                    actualValue: values.actualValue,
                    baselineValue: values.baselineValue,
                    measurementPeriod: values.measurementPeriod,
                    dataSource: values.dataSource,
                    status: values.status || 'baseline',
                    notes: values.notes,
                });
                messageApi.success("Metric added.");
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
            const data = await gql(AI_SUSTAINABILITY, { projectId });
            const raw = data.generateSustainabilityImpact;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const recs = Array.isArray(parsed) ? parsed : (parsed?.metrics || parsed?.items || []);
            for (const r of recs) {
                await gql(CREATE_METRIC, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    dimension: r.dimension || 'environmental',
                    metricName: r.metricName || r.metric_name || 'Unnamed Metric',
                    description: r.description || '',
                    unit: r.unit || '',
                    targetValue: r.targetValue || r.target_value || 0,
                    actualValue: r.actualValue || r.actual_value || 0,
                    baselineValue: r.baselineValue || r.baseline_value || 0,
                    measurementPeriod: r.measurementPeriod || r.measurement_period || '',
                    dataSource: r.dataSource || r.data_source || 'AI Generated',
                    status: 'baseline',
                    notes: r.notes || '',
                });
            }
            messageApi.success(`Added ${recs.length} metrics.`);
            loadData();
        } catch (error: any) {
            messageApi.error(`AI generation failed: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Group metrics by dimension
    const dimensionCounts = DIMENSION_OPTIONS.map(d => ({
        ...d,
        count: metrics.filter(m => m.dimension === d.value).length,
        onTarget: metrics.filter(m => m.dimension === d.value && (m.status === 'on_target' || m.status === 'exceeded')).length,
    }));

    const getProgress = (actual: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(Math.round((actual / target) * 100), 100);
    };

    const columns: ProColumns<any>[] = [
        {
            title: "Dimension", dataIndex: "dimension", width: 130,
            render: (_, r) => {
                const d = DIMENSION_OPTIONS.find(opt => opt.value === r.dimension);
                return <Tag color={d?.color || 'default'}>{d?.label || r.dimension}</Tag>;
            }
        },
        {
            title: "Metric", dataIndex: "metric_name",
            render: (_, r) => <strong>{r.metric_name || r.metricName}</strong>,
        },
        { title: "Unit", dataIndex: "unit", width: 80 },
        {
            title: "Progress", width: 150,
            render: (_, r) => {
                const actual = r.actual_value || r.actualValue || 0;
                const target = r.target_value || r.targetValue || 0;
                const pct = getProgress(actual, target);
                return (
                    <div>
                        <Progress percent={pct} size="small"
                            strokeColor={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
                        />
                        <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#888' }}>
                            {actual} / {target} {r.unit || ''}
                        </span>
                    </div>
                );
            }
        },
        {
            title: "Status", dataIndex: "status", width: 110,
            render: (_, r) => {
                const color = r.status === 'exceeded' ? 'green' : r.status === 'on_target' ? 'cyan'
                    : r.status === 'below_target' ? 'red' : r.status === 'tracking' ? 'blue' : 'default';
                return <Tag color={color}>{(r.status || 'baseline').replace('_', ' ').toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option", width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />}
                    onClick={() => {
                        setEditing({
                            ...record,
                            metricName: record.metric_name || record.metricName,
                            targetValue: record.target_value || record.targetValue,
                            actualValue: record.actual_value || record.actualValue,
                            baselineValue: record.baseline_value || record.baselineValue,
                            measurementPeriod: record.measurement_period || record.measurementPeriod,
                            dataSource: record.data_source || record.dataSource,
                        });
                        setIsModalOpen(true);
                    }}
                />,
                <Popconfirm key="del" title="Delete metric?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}
            <Alert
                message="Sustainability & ESG Tracking"
                description="PMBOK 8 emphasizes sustainability as a core project management concern. Track environmental, social, economic, and governance metrics to ensure project outcomes align with organizational sustainability goals."
                type="info"
                showIcon
                icon={<GlobalOutlined />}
                style={{ marginBottom: 16, borderRadius: 10 }}
            />

            {/* Dimension Summary */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {dimensionCounts.map(d => (
                    <Col key={d.value} xs={12} sm={6}>
                        <Card size="small" style={{
                            background: isDark ? `${d.color}12` : `${d.color}08`,
                            border: `1px solid ${d.color}33`, borderRadius: 10,
                        }}>
                            <Statistic
                                title={<span style={{ fontSize: 11 }}>{d.label}</span>}
                                value={d.count}
                                suffix={<span style={{ fontSize: 11, color: '#10b981' }}>({d.onTarget} on target)</span>}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <ProTable
                headerTitle={
                    <Space>
                        <GlobalOutlined style={{ color: '#8b5cf6' }} />
                        <span>Sustainability Metrics</span>
                    </Space>
                }
                rowKey="id"
                dataSource={metrics}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="ai" type="dashed" icon={<RobotOutlined />}
                        loading={aiLoading} onClick={handleAiGenerate}>
                        AI Generate Metrics
                    </Button>,
                    <Button key="add" type="primary" icon={<PlusOutlined />}
                        onClick={() => { setEditing(null); setIsModalOpen(true); }}
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: 8 }}
                    >
                        Add Metric
                    </Button>
                ]}
            />

            <ModalForm
                title={editing ? "Edit Metric" : "Add Sustainability Metric"}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleFinish}
                initialValues={editing || { status: 'baseline', dimension: 'environmental' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormSelect name="dimension" label="Dimension" width="sm" options={DIMENSION_OPTIONS} rules={[{ required: true }]} />
                    <ProFormText name="metricName" label="Metric Name" width="md" rules={[{ required: true }]} />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormText name="unit" label="Unit" width="xs" placeholder="e.g., tCO2e" />
                    <ProFormDigit name="baselineValue" label="Baseline Value" width="sm" />
                    <ProFormDigit name="targetValue" label="Target Value" width="sm" />
                    <ProFormDigit name="actualValue" label="Actual Value" width="sm" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="measurementPeriod" label="Measurement Period" width="sm" placeholder="e.g., Monthly" />
                    <ProFormText name="dataSource" label="Data Source" width="sm" />
                    <ProFormSelect name="status" label="Status" width="sm" options={STATUS_OPTIONS} />
                </ProForm.Group>
                <ProFormTextArea name="notes" label="Notes" />
            </ModalForm>
        </div>
    );
}
