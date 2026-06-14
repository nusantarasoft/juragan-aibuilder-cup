"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Typography, Spin, Slider, Input, Progress, Tag, Tooltip, Card } from "antd";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { RadarChartOutlined, SaveOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";

const { Text } = Typography;
const { TextArea } = Input;

const GET_PRINCIPLES = `
  query GetPrincipleAssessments($projectId: String!) {
    pmPrincipleAssessments(projectId: $projectId)
  }
`;

const UPSERT_PRINCIPLE = `
  mutation UpsertPrincipleAssessment(
    $tenantId: String!, $projectId: String!, $principleKey: String!,
    $principleName: String!, $score: Int, $notes: String, $evidence: String
  ) {
    upsertPmPrincipleAssessment(
      tenantId: $tenantId, projectId: $projectId, principleKey: $principleKey,
      principleName: $principleName, score: $score, notes: $notes, evidence: $evidence
    )
  }
`;

// PMBOK 7 — 12 Project Management Principles
const PRINCIPLES = [
    { key: "stewardship", name: "Stewardship", description: "Be a diligent, respectful, and caring steward.", color: "var(--theme-color, #8b5cf6)" },
    { key: "team", name: "Team", description: "Create a collaborative project team environment.", color: "#6366f1" },
    { key: "stakeholders", name: "Stakeholders", description: "Effectively engage with stakeholders.", color: "#3b82f6" },
    { key: "value", name: "Value", description: "Focus on value.", color: "#0ea5e9" },
    { key: "systems_thinking", name: "Systems Thinking", description: "Recognize, evaluate, and respond to system interactions.", color: "#14b8a6" },
    { key: "leadership", name: "Leadership", description: "Demonstrate leadership behaviors.", color: "#10b981" },
    { key: "tailoring", name: "Tailoring", description: "Tailor based on context.", color: "#22c55e" },
    { key: "quality", name: "Quality", description: "Build quality into processes and deliverables.", color: "#84cc16" },
    { key: "complexity", name: "Complexity", description: "Navigate complexity.", color: "#eab308" },
    { key: "risk", name: "Risk", description: "Optimize risk responses.", color: "#f59e0b" },
    { key: "adaptability", name: "Adaptability & Resilience", description: "Embrace adaptability and resiliency.", color: "#f97316" },
    { key: "change", name: "Change", description: "Enable change to achieve the envisioned future state.", color: "#ef4444" },
];

export default function PrinciplesTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assessments, setAssessments] = useState<Record<string, any>>({});
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_PRINCIPLES, { projectId });
            const items = data.pmPrincipleAssessments || [];
            const map: Record<string, any> = {};
            items.forEach((item: any) => { map[item.principle_key || item.principleKey] = item; });
            setAssessments(map);
        } catch (err: any) { console.error("PM Error", err); } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleScoreChange = (principleKey: string, score: number) => {
        setAssessments(prev => ({
            ...prev,
            [principleKey]: { ...prev[principleKey], score, dirty: true }
        }));
    };

    const handleFieldChange = (principleKey: string, field: string, value: string) => {
        setAssessments(prev => ({
            ...prev,
            [principleKey]: { ...prev[principleKey], [field]: value, dirty: true }
        }));
    };

    const handleSave = async (principleKey: string, principleName: string) => {
        setSaving(true);
        try {
            const a = assessments[principleKey] || {};
            await gql(UPSERT_PRINCIPLE, {
                tenantId: DEFAULT_TENANT_ID,
                projectId,
                principleKey,
                principleName,
                score: a.score || 0,
                notes: a.notes || "",
                evidence: a.evidence || "",
            });
            setAssessments(prev => ({
                ...prev,
                [principleKey]: { ...prev[principleKey], dirty: false }
            }));
            messageApi.success(`Saved: ${principleName}`);
        } catch (error: any) {
            messageApi.error(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            for (const p of PRINCIPLES) {
                const a = assessments[p.key] || {};
                await gql(UPSERT_PRINCIPLE, {
                    tenantId: DEFAULT_TENANT_ID,
                    projectId,
                    principleKey: p.key,
                    principleName: p.name,
                    score: a.score || 0,
                    notes: a.notes || "",
                    evidence: a.evidence || "",
                });
            }
            setAssessments(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { next[k] = { ...next[k], dirty: false }; });
                return next;
            });
            messageApi.success("All principle assessments saved.");
        } catch (error: any) {
            messageApi.error(`Save failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const avgScore = PRINCIPLES.reduce((sum, p) => sum + (assessments[p.key]?.score || 0), 0) / PRINCIPLES.length;

    const radarData = useMemo(() =>
        PRINCIPLES.map(p => ({
            principle: p.name.length > 15 ? p.name.slice(0, 13) + '..' : p.name,
            score: assessments[p.key]?.score || 0,
            fullMark: 5,
        })),
    [assessments]);

    const getScoreColor = (score: number) => {
        if (score >= 4) return '#10b981';
        if (score >= 3) return '#eab308';
        if (score >= 2) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

    return (
        <div>
            {contextHolder}
            <ProCard
                title={
                    <Space>
                        <RadarChartOutlined style={{ color: 'var(--theme-color, #8b5cf6)' }} />
                        <span>PMBOK 7 — Project Management Principles Assessment</span>
                    </Space>
                }
                bordered
                extra={
                    <Space>
                        <Tag color={avgScore >= 3.5 ? 'green' : avgScore >= 2.5 ? 'gold' : 'red'}>
                            Avg Score: {avgScore.toFixed(1)} / 5
                        </Tag>
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
                {/* Radar Chart Overview */}
                <Card size="small" title={<Space><RadarChartOutlined style={{ color: isDark ? '#a78bfa' : '#6366f1' }} /><span style={{ fontWeight: 600 }}>Principles Assessment Overview</span><Tag>{(avgScore).toFixed(1)} / 5.0 avg</Tag></Space>} style={{ marginBottom: 16, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer>
                            <RadarChart data={radarData} cx="50%" cy="50%">
                                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                                <PolarAngleAxis dataKey="principle" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9, fill: isDark ? '#64748b' : '#94a3b8' }} />
                                <RTooltip contentStyle={{ background: isDark ? '#1e1e2e' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, fontSize: 12 }} />
                                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Summary Progress Bar */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12,
                    marginBottom: 24,
                    padding: 16,
                    background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)',
                    borderRadius: 10,
                }}>
                    {PRINCIPLES.map(p => {
                        const score = assessments[p.key]?.score || 0;
                        return (
                            <Tooltip key={p.key} title={`${p.name}: ${score}/5`}>
                                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setExpandedKey(expandedKey === p.key ? null : p.key)}>
                                    <Progress
                                        type="circle"
                                        percent={(score / 5) * 100}
                                        size={52}
                                        strokeColor={p.color}
                                        format={() => score}
                                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                    />
                                    <div style={{ fontSize: 10, marginTop: 6, color: isDark ? '#a78bfa' : '#6d28d9', fontWeight: 500 }}>
                                        {p.name}
                                    </div>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Principle Detail Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PRINCIPLES.map(p => {
                        const a = assessments[p.key] || {};
                        const isExpanded = expandedKey === p.key;
                        return (
                            <div
                                key={p.key}
                                style={{
                                    background: isDark ? 'rgba(20, 20, 32, 0.6)' : 'rgba(255,255,255,0.9)',
                                    border: `1px solid ${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.06)'}`,
                                    borderLeft: `3px solid ${p.color}`,
                                    borderRadius: 10,
                                    padding: '14px 18px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div
                                    onClick={() => setExpandedKey(isExpanded ? null : p.key)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <Text strong style={{ fontSize: 14 }}>{p.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>{p.description}</Text>
                                    </div>
                                    <Space>
                                        {a.dirty && <Tag color="orange" style={{ fontSize: 10 }}>Unsaved</Tag>}
                                        <div style={{ width: 160 }} onClick={e => e.stopPropagation()}>
                                            <Slider
                                                min={0} max={5} step={1}
                                                value={a.score || 0}
                                                onChange={(val) => handleScoreChange(p.key, val)}
                                                marks={{ 0: '0', 5: '5' }}
                                                trackStyle={{ background: p.color }}
                                                handleStyle={{ borderColor: p.color }}
                                            />
                                        </div>
                                        <Tag color={getScoreColor(a.score || 0)} style={{ fontSize: 13, fontWeight: 600, minWidth: 32, textAlign: 'center' }}>
                                            {a.score || 0}
                                        </Tag>
                                    </Space>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                                <InfoCircleOutlined /> Notes / Assessment Rationale
                                            </Text>
                                            <TextArea
                                                value={a.notes || ''}
                                                onChange={e => handleFieldChange(p.key, 'notes', e.target.value)}
                                                placeholder="Why did you rate this principle at this level?"
                                                rows={2}
                                                style={{
                                                    background: isDark ? 'rgba(30,30,44,0.6)' : '#fff',
                                                    borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.1)',
                                                    borderRadius: 8,
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                                <InfoCircleOutlined /> Supporting Evidence
                                            </Text>
                                            <TextArea
                                                value={a.evidence || ''}
                                                onChange={e => handleFieldChange(p.key, 'evidence', e.target.value)}
                                                placeholder="Observable behaviors, artifacts, or outcomes supporting this score."
                                                rows={2}
                                                style={{
                                                    background: isDark ? 'rgba(30,30,44,0.6)' : '#fff',
                                                    borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.1)',
                                                    borderRadius: 8,
                                                }}
                                            />
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Button
                                                type="primary" size="small"
                                                icon={<SaveOutlined />}
                                                onClick={() => handleSave(p.key, p.name)}
                                                loading={saving}
                                                style={{ background: p.color, border: 'none', borderRadius: 6 }}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ProCard>
        </div>
    );
}

