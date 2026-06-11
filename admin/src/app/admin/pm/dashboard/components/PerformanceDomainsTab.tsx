"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Typography, Spin, Input, Progress, Tag, Select, Row, Col, Card, Slider } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, PieChart, Pie, Cell } from 'recharts';
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
        } catch (err: any) { console.error("PM Error", err); } finally {
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

    const scoreData = useMemo(() =>
        DOMAINS.map(d => ({
            name: d.name.length > 12 ? d.name.slice(0, 10) + '..' : d.name,
            score: domains[d.key]?.score || 0,
        })),
    [domains]);

    const healthDist = useMemo(() => {
        const counts: Record<string, number> = {};
        DOMAINS.forEach(d => {
            const status = domains[d.key]?.healthStatus || domains[d.key]?.health_status || 'not_started';
            counts[status] = (counts[status] || 0) + 1;
        });
        return HEALTH_OPTIONS.map(h => ({ name: h.label, value: counts[h.value] || 0, color: h.color })).filter(h => h.value > 0);
    }, [domains]);

    return (
        <div>
            {contextHolder}
            <ProCard
                title={
                    <Space>
                        <FundProjectionScreenOutlined style={{ color: 'var(--theme-color, #8b5cf6)' }} />
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
                <Card size="small" title={<span style={{ fontWeight: 600 }}>Domain Scores and Health</span>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: 2, minWidth: 280, height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={scoreData} margin={{ left: -10, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }} interval={0} angle={-20} textAnchor="end" height={50} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                    <RTooltip contentStyle={{ background: isDark ? '#1e1e2e' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, fontSize: 12 }} />
                                    <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {healthDist.length > 0 && (
                            <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 120, height: 120 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={healthDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} strokeWidth={0}>
                                                {healthDist.map((h, i) => <Cell key={i} fill={h.color} />)}
                                            </Pie>
                                            <RTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                                    {healthDist.map(h => (
                                        <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.color }} />
                                            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{h.name} ({h.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

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
                                        <Slider min={0} max={5} step={1} value={domains[d.key]?.score || 0} onChange={(val: number) => setDomains(prev => ({ ...prev, [d.key]: { ...prev[d.key], score: val, dirty: true } }))} />
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

