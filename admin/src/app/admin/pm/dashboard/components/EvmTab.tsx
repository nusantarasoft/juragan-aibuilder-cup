"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, Card, message, Space, Statistic, Row, Col, Table, Spin, Alert } from "antd";
import { RobotOutlined, SyncOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';
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
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const isDark = resolvedTheme === 'dark';

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
    const cv = latest ? (latest.earnedValue || latest.earned_value || 0) - (latest.actualCost || latest.actual_cost || 0) : 0;
    const sv = latest ? (latest.earnedValue || latest.earned_value || 0) - (latest.plannedValue || latest.planned_value || 0) : 0;

    const formatCurrency = (val: number) => {
        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const chartData = useMemo(() => {
        return metrics.map((m: any) => ({
            date: dayjs(m.snapshotDate || m.snapshot_date || m.createdAt).format('MMM DD'),
            PV: Number(m.plannedValue || m.planned_value || 0),
            EV: Number(m.earnedValue || m.earned_value || 0),
            AC: Number(m.actualCost || m.actual_cost || 0),
        }));
    }, [metrics]);

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
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                            gap: '16px', 
                            marginBottom: '32px' 
                        }}>
                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>Planned Value (PV)</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>${formatCurrency(latest.plannedValue)}</div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>Exact: ${latest.plannedValue?.toLocaleString()}</div>
                            </ProCard>

                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>Earned Value (EV)</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>${formatCurrency(latest.earnedValue)}</div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>Exact: ${latest.earnedValue?.toLocaleString()}</div>
                            </ProCard>

                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>Actual Cost (AC)</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>${formatCurrency(latest.actualCost)}</div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>Exact: ${latest.actualCost?.toLocaleString()}</div>
                            </ProCard>

                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>SPI</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: Number(spi) >= 1 ? '#10b981' : '#ef4444' }}>
                                    {spi} <span style={{ fontSize: 14, fontWeight: 500 }}>{Number(spi) >= 1 ? "Ahead" : "Behind"}</span>
                                </div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>SPI = EV / PV. (&gt;= 1.0 is good)</div>
                            </ProCard>

                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>CPI</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: Number(cpi) >= 1 ? '#10b981' : '#ef4444' }}>
                                    {cpi} <span style={{ fontSize: 14, fontWeight: 500 }}>{Number(cpi) >= 1 ? "Under Budget" : "Over Budget"}</span>
                                </div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>CPI = EV / AC. (&gt;= 1.0 is good)</div>
                            </ProCard>

                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>Cost Variance (CV)</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: cv >= 0 ? '#10b981' : '#ef4444' }}>
                                    {cv < 0 ? "-" : ""}${formatCurrency(Math.abs(cv))}
                                </div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>{cv >= 0 ? 'Under Budget' : 'Over Budget'}</div>
                            </ProCard>

                            <ProCard bordered size="small" style={{ height: '100%', borderRadius: 12 }}>
                                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, fontWeight: 500 }}>Schedule Variance (SV)</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: sv >= 0 ? '#10b981' : '#ef4444' }}>
                                    {sv < 0 ? "-" : ""}${formatCurrency(Math.abs(sv))}
                                </div>
                                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>{sv >= 0 ? 'Ahead of Schedule' : 'Behind Schedule'}</div>
                            </ProCard>
                        </div>
                    )}

                    {chartData.length >= 2 && (
                        <Card size="small" title={<Space><span style={{ fontWeight: 600 }}>S-Curve (EVM Trend)</span></Space>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                        <YAxis 
                                            tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} 
                                            width={65}
                                            tickFormatter={(val: number) => {
                                                if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                                                if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
                                                return `$${val}`;
                                            }}
                                        />
                                        <RTooltip
                                            contentStyle={{
                                                background: isDark ? '#1e1e2e' : '#fff',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                borderRadius: 8, fontSize: 12,
                                            }}
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="PV" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Planned Value" />
                                        <Line type="monotone" dataKey="EV" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Earned Value" />
                                        <Line type="monotone" dataKey="AC" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Actual Cost" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    )}

                    <Table
                        dataSource={metrics}
                        rowKey="id"
                        pagination={{ pageSize: 15 }}
                        size="small"
                        scroll={{ x: 'max-content' }}
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
