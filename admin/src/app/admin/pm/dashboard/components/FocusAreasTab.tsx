"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Typography, Spin, Input, Progress, Tag, Tooltip, Select, Row, Col, Card } from "antd";
import { FlagOutlined, SaveOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";

const { Text } = Typography;
const { TextArea } = Input;

const GET_FOCUS_AREAS = `
  query GetFocusAreas($projectId: String!) {
    pmFocusAreas(projectId: $projectId)
  }
`;

const UPSERT_FOCUS_AREA = `
  mutation UpsertFocusArea(
    $tenantId: String!, $projectId: String!, $focusAreaKey: String!, $focusAreaName: String!,
    $progressPercent: Int, $status: String, $notes: String, $keyDeliverables: String, $totalItems: Int
  ) {
    upsertPmFocusArea(
      tenantId: $tenantId, projectId: $projectId, focusAreaKey: $focusAreaKey, focusAreaName: $focusAreaName,
      progressPercent: $progressPercent, status: $status, notes: $notes, keyDeliverables: $keyDeliverables, totalItems: $totalItems
    )
  }
`;

// PMBOK 8 Focus Areas (draft standards)
const FOCUS_AREAS = [
    { key: "predictive", name: "Predictive Planning", icon: "📋", color: "#3b82f6", description: "Structured planning with defined scope, schedules, and cost baselines." },
    { key: "adaptive", name: "Adaptive Execution", icon: "🔄", color: "var(--theme-color, #8b5cf6)", description: "Iterative and incremental delivery with frequent feedback loops." },
    { key: "risk_mgmt", name: "Risk Management", icon: "⚠️", color: "#f59e0b", description: "Identification, analysis, and response planning for project risks." },
    { key: "quality_mgmt", name: "Quality Management", icon: "✅", color: "#10b981", description: "Ensuring deliverables meet defined quality standards." },
    { key: "resource_mgmt", name: "Resource Management", icon: "👥", color: "#6366f1", description: "Optimizing people, equipment, and materials needed for the project." },
    { key: "stakeholder_perf", name: "Stakeholder Performance", icon: "🤝", color: "#0ea5e9", description: "Ensuring stakeholder engagement meets project needs." },
    { key: "value_delivery", name: "Value Delivery", icon: "💎", color: "#ec4899", description: "Maximizing the value delivered to stakeholders and end users." },
    { key: "integration", name: "Integration Coordination", icon: "🔗", color: "#14b8a6", description: "Coordinating all aspects of project management holistically." },
];

const STATUS_OPTIONS = [
    { value: "not_started", label: "Not Started", color: "#6b7280" },
    { value: "in_progress", label: "In Progress", color: "#3b82f6" },
    { value: "on_track", label: "On Track", color: "#10b981" },
    { value: "at_risk", label: "At Risk", color: "#f59e0b" },
    { value: "completed", label: "Completed", color: "var(--theme-color, #8b5cf6)" },
];

export default function FocusAreasTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [areas, setAreas] = useState<Record<string, any>>({});
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_FOCUS_AREAS, { projectId });
            const items = data.pmFocusAreas || [];
            const map: Record<string, any> = {};
            items.forEach((item: any) => { map[item.focus_area_key || item.focusAreaKey] = item; });
            setAreas(map);
        } catch {
            // first load
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleChange = (key: string, field: string, value: any) => {
        setAreas(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value, dirty: true }
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            for (const fa of FOCUS_AREAS) {
                const a = areas[fa.key] || {};
                await gql(UPSERT_FOCUS_AREA, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    focusAreaKey: fa.key,
                    focusAreaName: fa.name,
                    progressPercent: a.progressPercent || a.progress_percent || 0,
                    status: a.status || "not_started",
                    notes: a.notes || "",
                    keyDeliverables: a.keyDeliverables || a.key_deliverables || "",
                    totalItems: a.totalItems || a.total_items || 0,
                });
            }
            messageApi.success("All focus areas saved.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Save failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

    const completedCount = FOCUS_AREAS.filter(fa => (areas[fa.key]?.status) === 'completed').length;
    const avgProgress = Math.round(
        FOCUS_AREAS.reduce((sum, fa) => sum + (areas[fa.key]?.progressPercent || areas[fa.key]?.progress_percent || 0), 0) / FOCUS_AREAS.length
    );

    return (
        <div>
            {contextHolder}
            <ProCard
                title={
                    <Space>
                        <FlagOutlined style={{ color: 'var(--theme-color, #8b5cf6)' }} />
                        <span>PMBOK 8 — Focus Areas</span>
                    </Space>
                }
                bordered
                extra={
                    <Space>
                        <Tag color="blue">Avg Progress: {avgProgress}%</Tag>
                        <Tag color="green">{completedCount} / {FOCUS_AREAS.length} Complete</Tag>
                        <Button
                            type="primary" icon={<SaveOutlined />}
                            onClick={handleSaveAll} loading={saving}
                            style={{ background: 'linear-gradient(135deg, var(--theme-color, #8b5cf6), var(--theme-secondary, #6366f1))', border: 'none', borderRadius: 8 }}
                        >
                            Save All
                        </Button>
                    </Space>
                }
                style={{
                    background: isDark ? 'rgba(15, 15, 23, 0.6)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(12px)',
                    border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 12,
                }}
            >
                {/* Overall Progress */}
                <div style={{
                    marginBottom: 24, padding: 16,
                    background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 16,
                }}>
                    <Progress
                        type="dashboard"
                        percent={avgProgress}
                        size={80}
                        strokeColor={{ '0%': 'var(--theme-color, #8b5cf6)', '100%': 'var(--theme-secondary, #6366f1)' }}
                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                    />
                    <div>
                        <Text strong style={{ fontSize: 16 }}>Overall Focus Area Health</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {completedCount} of {FOCUS_AREAS.length} focus areas completed • Average progress {avgProgress}%
                        </Text>
                    </div>
                </div>

                <Row gutter={[16, 16]}>
                    {FOCUS_AREAS.map(fa => {
                        const a = areas[fa.key] || {};
                        const prog = a.progressPercent || a.progress_percent || 0;
                        const status = a.status || 'not_started';
                        const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

                        return (
                            <Col key={fa.key} xs={24} sm={12} lg={8} xl={6}>
                                <Card
                                    size="small"
                                    style={{
                                        background: isDark ? 'rgba(20, 20, 32, 0.6)' : 'rgba(255,255,255,0.9)',
                                        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
                                        borderTop: `3px solid ${fa.color}`,
                                        borderRadius: 10,
                                        height: '100%',
                                    }}
                                    title={
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 18 }}>{fa.icon}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{fa.name}</span>
                                            {a.dirty && <Tag color="orange" style={{ fontSize: 8, padding: '0 4px', margin: 0 }}>●</Tag>}
                                        </div>
                                    }
                                >
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 10 }}>
                                        {fa.description}
                                    </Text>

                                    <div style={{ marginBottom: 10 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Status</Text>
                                        <Select
                                            style={{ width: '100%', marginTop: 4 }}
                                            size="small"
                                            value={status}
                                            onChange={val => handleChange(fa.key, 'status', val)}
                                            options={STATUS_OPTIONS.map(s => ({
                                                value: s.value,
                                                label: <Space><span style={{ color: s.color }}>●</span>{s.label}</Space>
                                            }))}
                                        />
                                    </div>

                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 11, fontWeight: 500 }}>Progress</Text>
                                            <Text style={{ fontSize: 11 }}>{prog}%</Text>
                                        </div>
                                        <Progress
                                            percent={prog}
                                            size="small"
                                            strokeColor={fa.color}
                                            showInfo={false}
                                            style={{ marginTop: 4 }}
                                        />
                                        <input
                                            type="range" min={0} max={100} step={5}
                                            value={prog}
                                            onChange={e => handleChange(fa.key, 'progressPercent', parseInt(e.target.value))}
                                            style={{ width: '100%', accentColor: fa.color }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Key Deliverables</Text>
                                        <TextArea
                                            size="small"
                                            value={a.keyDeliverables || a.key_deliverables || ''}
                                            onChange={e => handleChange(fa.key, 'keyDeliverables', e.target.value)}
                                            placeholder="Key deliverables for this area..."
                                            rows={2}
                                            style={{
                                                fontSize: 10,
                                                background: isDark ? 'rgba(30,30,44,0.6)' : '#fff',
                                                borderRadius: 6, marginTop: 4,
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Notes</Text>
                                        <TextArea
                                            size="small"
                                            value={a.notes || ''}
                                            onChange={e => handleChange(fa.key, 'notes', e.target.value)}
                                            placeholder="Additional notes..."
                                            rows={2}
                                            style={{
                                                fontSize: 10,
                                                background: isDark ? 'rgba(30,30,44,0.6)' : '#fff',
                                                borderRadius: 6, marginTop: 4,
                                            }}
                                        />
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </ProCard>
        </div>
    );
}
