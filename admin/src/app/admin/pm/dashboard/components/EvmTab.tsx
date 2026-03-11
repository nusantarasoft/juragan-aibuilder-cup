"use client";

import React, { useState, useEffect } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Statistic, Row, Col, Table, Spin, Alert } from "antd";
import { RobotOutlined, SyncOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";

const GET_EVM = `
  query GetEarnedValues($projectId: String!) {
    pmEarnedValues(projectId: $projectId) {
      id snapshotDate plannedValue earnedValue actualCost
    }
  }
`;

const GENERATE_EVM = `
  mutation GenerateEVM($projectId: String!, $tenantId: String!) {
    generateEarnedValueMetrics(projectId: $projectId, tenantId: $tenantId) {
      id snapshotDate plannedValue earnedValue actualCost
    }
  }
`;

export default function EvmTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [metrics, setMetrics] = useState<any[]>([]);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_EVM, { projectId });
            setMetrics(data.pmEarnedValues || []);
        } catch (error) {
            messageApi.error("Failed to load EVM metrics.");
        } finally {
            setLoading(false);
        }
    }, [projectId, messageApi]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGenerateEVM = async () => {
        setAiLoading(true);
        try {
            await gql(GENERATE_EVM, { projectId, tenantId: DEFAULT_TENANT_ID });
            messageApi.success("Successfully captured new EVM daily snapshot via AI.");
            loadData();
        } catch (error: any) {
            messageApi.error(`AI EVM Generation failed: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Derived Metrics for the latest snapshot
    const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;

    const spi = latest && latest.plannedValue > 0 ? (latest.earnedValue / latest.plannedValue).toFixed(2) : "-";
    const cpi = latest && latest.actualCost > 0 ? (latest.earnedValue / latest.actualCost).toFixed(2) : "-";

    return (
        <ProCard title="Cost Management: Earned Value Metrics (EVM)" bordered>
            {contextHolder}

            <Alert
                message="Earned Value Management (EVM) measures project performance and progress by combining scope, schedule, and resource measurements."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Space style={{ marginBottom: 24 }}>
                <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    loading={aiLoading}
                    onClick={handleGenerateEVM}
                >
                    AI: Capture EVM Snapshot Now
                </Button>
                <Button icon={<SyncOutlined />} onClick={loadData}>Refresh</Button>
            </Space>

            {loading ? <Spin /> : (
                <>
                    {latest && (
                        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                            <Col span={4}>
                                <ProCard bordered size="small">
                                    <Statistic title="Planned Value (PV)" value={latest.plannedValue} prefix="$" precision={2} />
                                </ProCard>
                            </Col>
                            <Col span={4}>
                                <ProCard bordered size="small">
                                    <Statistic title="Earned Value (EV)" value={latest.earnedValue} valueStyle={{ color: '#52c41a' }} prefix="$" precision={2} />
                                </ProCard>
                            </Col>
                            <Col span={4}>
                                <ProCard bordered size="small">
                                    <Statistic title="Actual Cost (AC)" value={latest.actualCost} valueStyle={{ color: '#ff4d4f' }} prefix="$" precision={2} />
                                </ProCard>
                            </Col>
                            <Col span={6}>
                                <ProCard bordered size="small">
                                    <Statistic
                                        title="Schedule Performance Index (SPI)"
                                        value={spi}
                                        suffix={Number(spi) >= 1 ? " Ahead" : " Behind"}
                                        valueStyle={{ color: Number(spi) >= 1 ? '#52c41a' : '#ff4d4f' }}
                                    />
                                    <div style={{ fontSize: 11, color: '#888' }}>SPI = EV / PV. (&gt;= 1.0 is good)</div>
                                </ProCard>
                            </Col>
                            <Col span={6}>
                                <ProCard bordered size="small">
                                    <Statistic
                                        title="Cost Performance Index (CPI)"
                                        value={cpi}
                                        suffix={Number(cpi) >= 1 ? " Under Budget" : " Over Budget"}
                                        valueStyle={{ color: Number(cpi) >= 1 ? '#52c41a' : '#ff4d4f' }}
                                    />
                                    <div style={{ fontSize: 11, color: '#888' }}>CPI = EV / AC. (&gt;= 1.0 is good)</div>
                                </ProCard>
                            </Col>
                        </Row>
                    )}

                    <Table
                        dataSource={metrics}
                        rowKey="id"
                        pagination={{ pageSize: 15 }}
                        size="small"
                        columns={[
                            { title: 'Date', dataIndex: 'snapshotDate', render: (val) => dayjs(val).format('MMM D, YYYY') },
                            { title: 'Planned Value (PV)', dataIndex: 'plannedValue', align: 'right', render: (val) => `$${val.toLocaleString()}` },
                            { title: 'Earned Value (EV)', dataIndex: 'earnedValue', align: 'right', render: (val) => `$${val.toLocaleString()}` },
                            { title: 'Actual Cost (AC)', dataIndex: 'actualCost', align: 'right', render: (val) => `$${val.toLocaleString()}` },
                            {
                                title: 'SPI', align: 'right',
                                render: (_, record) => record.plannedValue > 0 ? (record.earnedValue / record.plannedValue).toFixed(2) : '-'
                            },
                            {
                                title: 'CPI', align: 'right',
                                render: (_, record) => record.actualCost > 0 ? (record.earnedValue / record.actualCost).toFixed(2) : '-'
                            }
                        ]}
                    />
                </>
            )}
        </ProCard>
    );
}
