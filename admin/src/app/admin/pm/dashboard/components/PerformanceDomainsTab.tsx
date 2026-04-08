"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Typography, Spin, Input, Progress, Tag, Tooltip, Select, Row, Col, Card } from "antd";
import { FundProjectionScreenOutlined, SaveOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";

const { Text } = Typography;
const { TextArea } = Input;

const GET_DOMAINS = `
  query GetDomainHealth($projectId: String!) {
    pmDomainHealth(projectId: $projectId)
  }
`;

const UPSERT_DOMAIN = `
  mutation UpsertDomainHealth(
    $tenantId: String!, $projectId: String!, $domainKey: String!, $domainName: String!,
    $healthStatus: String, $score: Int, $description: String,
    $outcomesAchieved: String, $challenges: String, $improvementActions: String
  ) {
    upsertPmDomainHealth(
      tenantId: $tenantId, projectId: $projectId, domainKey: $domainKey, domainName: $domainName,
      healthStatus: $healthStatus, score: $score, description: $description,
      outcomesAchieved: $outcomesAchieved, challenges: $challenges, improvementActions: $improvementActions
    )
  }
`;

// PMBOK 7 — 8 Performance Domains
const DOMAINS = [
    { key: "stakeholders", name: "Stakeholders", icon: "👥", description: "Activities related to stakeholder engagement and satisfaction." },
    { key: "team", name: "Team", icon: "🤝", description: "Activities concerning team leadership, development, and management." },
    { key: "development_approach", name: "Development Approach & Life Cycle", icon: "🔄", description: "Establish the development approach, cadence, and phases of the life cycle." },
    { key: "planning", name: "Planning", icon: "📋", description: "Activities to establish the initial organization and coordination of the project." },
    { key: "project_work", name: "Project Work", icon: "⚙️", description: "Activities to establish project processes, manage physical resources, and manage procurements." },
    { key: "delivery", name: "Delivery", icon: "📦", description: "Activities related to delivering the scope, quality, and stakeholder expectations." },
    { key: "measurement", name: "Measurement", icon: "📊", description: "Activities to assess project performance and take appropriate actions." },
    { key: "uncertainty", name: "Uncertainty", icon: "🎲", description: "Activities and functions associated with risk and uncertainty." },
];

const HEALTH_OPTIONS = [
    { value: "on_track", label: "On Track", color: "#10b981", icon: <CheckCircleOutlined /> },
    { value: "at_risk", label: "At Risk", color: "#f59e0b", icon: <WarningOutlined /> },
    { value: "off_track", label: "Off Track", color: "#ef4444", icon: <CloseCircleOutlined /> },
    { value: "not_started", label: "Not Started", color: "#6b7280", icon: null },
];

export default function PerformanceDomainsTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [domains, setDomains] = useState<Record<string, any>>({});
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_DOMAINS, { projectId });
            const items = data.pmDomainHealth || [];
            const map: Record<string, any> = {};
            items.forEach((item: any) => { map[item.domain_key || item.domainKey] = item; });
            setDomains(map);
        } catch {
            // First load
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleChange = (domainKey: string, field: string, value: any) => {
        setDomains(prev => ({
            ...prev,
            [domainKey]: { ...prev[domainKey], [field]: value, dirty: true }
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            for (const d of DOMAINS) {
                const a = domains[d.key] || {};
                await gql(UPSERT_DOMAIN, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    domainKey: d.key,
                    domainName: d.name,
                    healthStatus: a.healthStatus || a.health_status || "not_started",
                    score: a.score || 0,
                    description: a.description || "",
                    outcomesAchieved: a.outcomesAchieved || a.outcomes_achieved || "",
                    challenges: a.challenges || "",
                    improvementActions: a.improvementActions || a.improvement_actions || "",
                });
            }
            messageApi.success("All domain health assessments saved.");
            loadData();
        } catch (error: any) {
            messageApi.error(`Save failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const getHealthConfig = (status: string) =>
        HEALTH_OPTIONS.find(h => h.value === status) || HEALTH_OPTIONS[3];

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

    const onTrackCount = DOMAINS.filter(d => (domains[d.key]?.healthStatus || domains[d.key]?.health_status) === 'on_track').length;

    return (
        <div>
            {contextHolder}
            <ProCard
                title={
                    <Space>
                        <FundProjectionScreenOutlined style={{ color: '#8b5cf6' }} />
                        <span>PMBOK 7 — Performance Domains Health</span>
                    </Space>
                }
                bordered
                extra={
                    <Space>
                        <Tag color="green">{onTrackCount} / {DOMAINS.length} On Track</Tag>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSaveAll}
                            loading={saving}
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: 8 }}
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
                <Row gutter={[16, 16]}>
                    {DOMAINS.map(d => {
                        const a = domains[d.key] || {};
                        const healthStatus = a.healthStatus || a.health_status || "not_started";
                        const healthConfig = getHealthConfig(healthStatus);
                        const score = a.score || 0;

                        return (
                            <Col key={d.key} xs={24} sm={12} lg={8} xl={6}>
                                <Card
                                    size="small"
                                    style={{
                                        background: isDark ? 'rgba(20, 20, 32, 0.6)' : 'rgba(255,255,255,0.9)',
                                        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
                                        borderTop: `3px solid ${healthConfig.color}`,
                                        borderRadius: 10,
                                        height: '100%',
                                    }}
                                    title={
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 20 }}>{d.icon}</span>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span>
                                        </div>
                                    }
                                    extra={
                                        a.dirty ? <Tag color="orange" style={{ fontSize: 9 }}>●</Tag> : null
                                    }
                                >
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
                                        {d.description}
                                    </Text>

                                    <div style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Health Status</Text>
                                        <Select
                                            style={{ width: '100%', marginTop: 4 }}
                                            size="small"
                                            value={healthStatus}
                                            onChange={val => handleChange(d.key, 'healthStatus', val)}
                                            options={HEALTH_OPTIONS.map(h => ({
                                                value: h.value,
                                                label: <Space><span style={{ color: h.color }}>●</span>{h.label}</Space>
                                            }))}
                                        />
                                    </div>

                                    <div style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Completion Score</Text>
                                        <Progress
                                            percent={(score / 5) * 100}
                                            size="small"
                                            strokeColor={healthConfig.color}
                                            format={() => `${score}/5`}
                                            style={{ marginTop: 4 }}
                                        />
                                        <input
                                            type="range"
                                            min={0} max={5} step={1}
                                            value={score}
                                            onChange={e => handleChange(d.key, 'score', parseInt(e.target.value))}
                                            style={{ width: '100%', accentColor: healthConfig.color }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Outcomes Achieved</Text>
                                        <TextArea
                                            size="small"
                                            value={a.outcomesAchieved || a.outcomes_achieved || ''}
                                            onChange={e => handleChange(d.key, 'outcomesAchieved', e.target.value)}
                                            placeholder="Key outcomes delivered..."
                                            rows={2}
                                            style={{
                                                fontSize: 11,
                                                background: isDark ? 'rgba(30,30,44,0.6)' : '#fff',
                                                borderRadius: 6,
                                                marginTop: 4,
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <Text style={{ fontSize: 11, fontWeight: 500 }}>Challenges</Text>
                                        <TextArea
                                            size="small"
                                            value={a.challenges || ''}
                                            onChange={e => handleChange(d.key, 'challenges', e.target.value)}
                                            placeholder="Current challenges..."
                                            rows={2}
                                            style={{
                                                fontSize: 11,
                                                background: isDark ? 'rgba(30,30,44,0.6)' : '#fff',
                                                borderRadius: 6,
                                                marginTop: 4,
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
