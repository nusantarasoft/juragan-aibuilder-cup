"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Table, Progress, message, Select, Badge, Empty, Spin, Tabs, theme } from "antd";
import {
    CheckSquareOutlined, ProjectOutlined, FormOutlined, CheckCircleOutlined,
    PlusOutlined, ReloadOutlined, FileTextOutlined,
    ArrowRightOutlined, BarChartOutlined, ExclamationCircleOutlined,
    SafetyOutlined, StarOutlined, RiseOutlined, FallOutlined,
    EyeOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BentoGrid } from "@/components/magicui/bento-grid";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, PieChart, Pie } from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];



// Pre-built quality checklist templates
const CHECKLIST_TEMPLATES = [
    { id: 'qa-sprint', name: 'Sprint QA Checklist', items: 12, category: 'Development', color: '#3b82f6' },
    { id: 'qa-release', name: 'Release Readiness', items: 18, category: 'Deployment', color: '#10b981' },
    { id: 'qa-code', name: 'Code Review Standards', items: 15, category: 'Code Quality', color: '#8b5cf6' },
    { id: 'qa-ux', name: 'UX Review Checklist', items: 10, category: 'Design', color: '#ec4899' },
    { id: 'qa-security', name: 'Security Assessment', items: 20, category: 'Security', color: '#ef4444' },
    { id: 'qa-perf', name: 'Performance Testing', items: 8, category: 'Performance', color: '#f59e0b' },
];

const STATUS_TAG: Record<string, { color: string }> = {
    passed: { color: '#10b981' }, on_target: { color: '#10b981' }, completed: { color: '#10b981' },
    failed: { color: '#ef4444' }, off_target: { color: '#ef4444' },
    in_progress: { color: '#3b82f6' }, pending: { color: '#f59e0b' }, scheduled: { color: '#6366f1' },
    active: { color: '#3b82f6' }, draft: { color: '#6b7280' },
};

const SEVERITY_TAG: Record<string, { color: string }> = {
    critical: { color: '#ef4444' }, high: { color: '#f59e0b' }, medium: { color: '#3b82f6' },
    low: { color: '#6b7280' }, info: { color: '#10b981' },
};

export default function PmQualityPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [inspections, setInspections] = useState<any[]>([]);
    const [qualityLoading, setQualityLoading] = useState(false);

    const glassCard = useMemo(() => ({
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    }), [isDark]);

    // Load form data + projects
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes, pRes] = await Promise.all([
                gql<{ formTemplates: any[] }>(`query($t:String!){ formTemplates(tenantId:$t){ id name category status } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formTemplates: [] })),
                gql<{ formSubmissions: any[] }>(`query($t:String!){ formSubmissions(tenantId:$t){ id status totalScore maxPossibleScore percentage grade submittedBy submittedAt templateName templateCategory } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] })),
                gql<{ pmProjects: any[] }>(`query($t:String!){ pmProjects(tenantId:$t){ id name projectNumber status } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ pmProjects: [] })),
            ]);
            setTemplates(tRes.formTemplates || []);
            const qualitySubs = (sRes.formSubmissions || []).filter((s: any) =>
                s.templateCategory === 'checklist' || s.templateCategory === 'assessment' || s.templateCategory === 'audit' || s.percentage > 0
            );
            setSubmissions(qualitySubs);
            setProjects(pRes.pmProjects || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    // Load project-specific quality data
    const loadQualityData = useCallback(async (projectId: string) => {
        setQualityLoading(true);
        try {
            const [mRes, cRes, iRes] = await Promise.all([
                gql<{ pmQualityMetrics: any[] }>(`query($projectId:String!){ pmQualityMetrics(projectId:$projectId){ id projectId metricName category targetValue actualValue unit status trend measuredAt notes createdAt updatedAt } }`, { projectId }).catch(() => ({ pmQualityMetrics: [] })),
                gql<{ pmQualityChecklists: any[] }>(`query($projectId:String!){ pmQualityChecklists(projectId:$projectId){ id projectId name category description items status completedItems totalItems completedBy completedAt createdAt updatedAt } }`, { projectId }).catch(() => ({ pmQualityChecklists: [] })),
                gql<{ pmQualityInspections: any[] }>(`query($projectId:String!){ pmQualityInspections(projectId:$projectId){ id projectId inspectionType inspector status findings recommendations severity scheduledDate completedDate notes createdAt updatedAt } }`, { projectId }).catch(() => ({ pmQualityInspections: [] })),
            ]);
            setMetrics(mRes.pmQualityMetrics || []);
            setChecklists(cRes.pmQualityChecklists || []);
            setInspections(iRes.pmQualityInspections || []);
        } catch (err: any) { console.error("PM Error", err); }
        setQualityLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (selectedProject) loadQualityData(selectedProject);
        else { setMetrics([]); setChecklists([]); setInspections([]); }
    }, [selectedProject, loadQualityData]);

    // Computed form stats
    const scoredSubs = submissions.filter(s => s.percentage > 0);
    const avgScore = scoredSubs.length > 0 ? scoredSubs.reduce((a: number, s: any) => a + s.percentage, 0) / scoredSubs.length : 0;
    const passRate = scoredSubs.length > 0 ? Math.round((scoredSubs.filter(s => s.percentage >= 70).length / scoredSubs.length) * 100) : 0;

    // Chart data
    const templateScoreMap: Record<string, number[]> = {};
    scoredSubs.forEach((s: any) => {
        const name = (s.templateName || 'Unknown').slice(0, 20);
        if (!templateScoreMap[name]) templateScoreMap[name] = [];
        templateScoreMap[name].push(s.percentage);
    });
    const barData = Object.entries(templateScoreMap).map(([name, scores]) => ({
        name, avgScore: Math.round(scores.reduce((a, s) => a + s, 0) / scores.length),
    }));

    // Quality KPIs
    const metricsOnTarget = metrics.filter(m => m.status === 'on_target' || m.status === 'passed').length;
    const inspCompleted = inspections.filter(i => i.status === 'completed').length;
    const checkPassed = checklists.filter(c => c.status === 'completed' || c.status === 'passed').length;
    const openIssues = inspections.filter(i => i.status !== 'completed' && i.severity && ['critical', 'high'].includes(i.severity)).length;
    const complianceRate = metrics.length > 0 ? Math.round((metricsOnTarget / metrics.length) * 100) : (scoredSubs.length > 0 ? passRate : 0);

    // Radar data for quality dimensions
    const radarData = useMemo(() => {
        const dims = [
            { name: 'Code Quality', key: 'Code Quality', fallback: avgScore },
            { name: 'Testing', key: 'Performance', fallback: passRate },
            { name: 'Security', key: 'Security', fallback: complianceRate },
            { name: 'Documentation', key: 'Development', fallback: avgScore * 0.85 },
            { name: 'Performance', key: 'Deployment', fallback: avgScore * 0.9 },
            { name: 'Reliability', key: 'Design', fallback: complianceRate * 0.95 },
        ];
        return dims.map(d => {
            const relevantMetrics = metrics.filter(m => m.category === d.key);
            const score = relevantMetrics.length > 0
                ? Math.round(relevantMetrics.filter(m => m.status === 'on_target' || m.status === 'passed').length / relevantMetrics.length * 100)
                : Math.round(d.fallback);
            return { dimension: d.name, score: Math.max(0, Math.min(100, score)) };
        });
    }, [metrics, avgScore, passRate, complianceRate]);

    const statCards: Array<{ label: string; value: string | number; color: string; icon: React.ReactNode; trend: 'up' | 'down' | 'stable' }> = [
        { label: 'Quality Metrics', value: metrics.length || CHECKLIST_TEMPLATES.length, color: '#3b82f6', icon: <BarChartOutlined />, trend: 'up' },
        { label: 'Avg Score', value: `${avgScore.toFixed(1)}%`, color: avgScore >= 70 ? '#10b981' : '#f59e0b', icon: <StarOutlined />, trend: avgScore >= 70 ? 'up' : 'down' },
        { label: 'Inspections Done', value: inspCompleted || inspections.length, color: '#8b5cf6', icon: <EyeOutlined />, trend: 'stable' },
        { label: 'Checklists Passed', value: checkPassed || submissions.filter(s => s.status === 'approved').length, color: '#10b981', icon: <CheckCircleOutlined />, trend: 'up' },
        { label: 'Open Issues', value: openIssues || submissions.filter(s => s.status === 'submitted').length, color: '#ef4444', icon: <ExclamationCircleOutlined />, trend: openIssues > 0 ? 'down' : 'up' },
        { label: 'Compliance', value: `${complianceRate}%`, color: complianceRate >= 80 ? '#10b981' : '#f59e0b', icon: <SafetyOutlined />, trend: complianceRate >= 80 ? 'up' : 'down' },
    ];

    // Metric columns
    const metricCols = [
        { title: 'Metric', dataIndex: 'metricName', key: 'metricName', render: (v: string, r: any) => (
            <div><Text strong style={{ fontSize: 12 }}>{v}</Text><div><Tag style={{ fontSize: 9, borderRadius: 8 }}>{r.category || 'General'}</Tag></div></div>
        )},
        { title: 'Target', dataIndex: 'targetValue', key: 'targetValue', width: 90, render: (v: number, r: any) => <Text style={{ fontSize: 12 }}>{v ?? '-'} {r.unit || ''}</Text> },
        { title: 'Actual', dataIndex: 'actualValue', key: 'actualValue', width: 90, render: (v: number, r: any) => {
            const ok = r.targetValue != null && v != null && v >= r.targetValue;
            return <Text style={{ fontSize: 12, color: ok ? '#10b981' : v != null ? '#ef4444' : undefined }}>{v ?? '-'} {r.unit || ''}</Text>;
        }},
        { title: 'Trend', key: 'trend', width: 60, render: (_: any, r: any) => {
            if (r.trend === 'up') return <RiseOutlined style={{ color: '#10b981', fontSize: 16 }} />;
            if (r.trend === 'down') return <FallOutlined style={{ color: '#ef4444', fontSize: 16 }} />;
            return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        }},
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => {
            const cfg = STATUS_TAG[v] || { color: '#6b7280' };
            return <Tag color={cfg.color} style={{ fontSize: 10, borderRadius: 8 }}>{(v || 'unknown').replace(/_/g, ' ').toUpperCase()}</Tag>;
        }},
        { title: 'Measured', dataIndex: 'measuredAt', key: 'measuredAt', width: 100, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v ? dayjs(v).fromNow() : '-'}</Text> },
    ];

    // Inspection columns
    const inspCols = [
        { title: 'Type', dataIndex: 'inspectionType', key: 'type', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{(v || '').replace(/_/g, ' ')}</Text> },
        { title: 'Inspector', dataIndex: 'inspector', key: 'inspector', width: 120, render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '-'}</Text> },
        { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 90, render: (v: string) => {
            const cfg = SEVERITY_TAG[v] || { color: '#6b7280' };
            return <Tag color={cfg.color} style={{ fontSize: 10, borderRadius: 8 }}>{(v || '-').toUpperCase()}</Tag>;
        }},
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => {
            const cfg = STATUS_TAG[v] || { color: '#6b7280' };
            return <Tag color={cfg.color} style={{ fontSize: 10, borderRadius: 8 }}>{(v || '-').replace(/_/g, ' ').toUpperCase()}</Tag>;
        }},
        { title: 'Findings', dataIndex: 'findings', key: 'findings', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 11 }}>{v || '-'}</Text> },
        { title: 'Scheduled', dataIndex: 'scheduledDate', key: 'scheduledDate', width: 100, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v ? dayjs(v).format('MMM D, YYYY') : '-'}</Text> },
    ];

    const tabItems = [
        {
            key: 'overview', label: <Space><BarChartOutlined /> Overview</Space>,
            children: (
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={14}>
                        <Card size="small" title={<Space><BarChartOutlined style={{ color: '#3b82f6' }} /> Quality Radar</Space>} style={glassCard}>
                            <div style={{ height: 280 }}>
                                {radarData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <RadarChart data={radarData} outerRadius="75%">
                                            <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                                            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                            <Radar name="Quality Score" dataKey="score" stroke={themeColor} fill={themeColor} fillOpacity={0.25} strokeWidth={2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No quality data available" />}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card size="small" title={<Space><FileTextOutlined style={{ color: '#8b5cf6' }} /> Recent Evaluations</Space>} style={{ ...glassCard, height: '100%' }}>
                            {scoredSubs.slice(0, 8).map((s: any, i: number) => (
                                <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5'}` }}>
                                    <div>
                                        <Text strong style={{ fontSize: 12 }}>{s.templateName || 'Checklist'}</Text>
                                        <div><Tag style={{ fontSize: 9 }}>{s.status}</Tag></div>
                                    </div>
                                    <Progress type="circle" size={32} percent={s.percentage}
                                        strokeColor={s.percentage >= 70 ? '#10b981' : '#ef4444'}
                                        format={() => <Text style={{ fontSize: 9 }}>{s.percentage.toFixed(0)}</Text>} />
                                </motion.div>
                            ))}
                            {scoredSubs.length === 0 && <Empty description="No results yet" />}
                        </Card>
                    </Col>
                </Row>
            ),
        },
        {
            key: 'metrics', label: <Space><BarChartOutlined /> Metrics <Badge count={metrics.length} size="small" /></Space>,
            children: metrics.length > 0 ? (
                <Card size="small" style={glassCard}>
                    <Table dataSource={metrics} columns={metricCols} rowKey="id" size="small" pagination={{ pageSize: 10 }}
                        style={{ fontSize: 12 }} />
                </Card>
            ) : (
                <Card style={glassCard}>
                    <Empty description={selectedProject ? "No quality metrics found for this project" : "Select a project to view quality metrics"} image={Empty.PRESENTED_IMAGE_SIMPLE}>
                        {selectedProject && <Button type="primary" size="small" icon={<PlusOutlined />} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', marginTop: 8 }}>Add Metric</Button>}
                    </Empty>
                </Card>
            ),
        },
        {
            key: 'checklists', label: <Space><CheckSquareOutlined /> Checklists <Badge count={checklists.length + CHECKLIST_TEMPLATES.length} size="small" /></Space>,
            children: (
                <div>
                    {/* Project Checklists from backend */}
                    {checklists.length > 0 && (
                        <Card size="small" title={<Space><CheckSquareOutlined style={{ color: '#10b981' }} /> Project Checklists</Space>} style={{ ...glassCard, marginBottom: 16 }}>
                            <Row gutter={[12, 12]}>
                                {checklists.map((cl: any, i: number) => {
                                    const pct = cl.totalItems > 0 ? Math.round((cl.completedItems / cl.totalItems) * 100) : 0;
                                    const statusCfg = STATUS_TAG[cl.status] || { color: '#6b7280' };
                                    return (
                                        <Col xs={24} sm={12} md={8} key={cl.id}>
                                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                                <Card size="small" hoverable style={{ ...glassCard, borderTop: `3px solid ${statusCfg.color}` }}>
                                                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <Text strong style={{ fontSize: 12 }}>{cl.name}</Text>
                                                                <div><Tag style={{ fontSize: 9, borderRadius: 8 }}>{cl.category || 'General'}</Tag>
                                                                <Tag color={statusCfg.color} style={{ fontSize: 9, borderRadius: 8 }}>{(cl.status || '').toUpperCase()}</Tag></div>
                                                            </div>
                                                            <Progress type="circle" size={36} percent={pct} strokeColor={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1'}
                                                                format={() => <Text style={{ fontSize: 9 }}>{pct}%</Text>} />
                                                        </div>
                                                        <Progress percent={pct} size="small" showInfo={false} strokeColor={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1'}
                                                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} />
                                                        <Text type="secondary" style={{ fontSize: 10 }}>{cl.completedItems}/{cl.totalItems} items complete</Text>
                                                    </Space>
                                                </Card>
                                            </motion.div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Card>
                    )}
                    {/* Template Checklists */}
                    <Card size="small" title={<Space><FormOutlined style={{ color: '#3b82f6' }} /> Checklist Templates</Space>} style={glassCard}>
                        <Row gutter={[12, 12]}>
                            {CHECKLIST_TEMPLATES.map((tpl, i) => (
                                <Col xs={24} sm={12} md={8} key={tpl.id}>
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                        <Card hoverable size="small" style={{ ...glassCard, borderTop: `3px solid ${tpl.color}`, cursor: 'pointer' }}
                                            onClick={() => router.push('/admin/forms/builder')}>
                                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                <Space>
                                                    <CheckSquareOutlined style={{ fontSize: 18, color: tpl.color }} />
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>{tpl.name}</Text>
                                                        <div><Tag color={tpl.color} style={{ fontSize: 9, borderRadius: 8 }}>{tpl.category}</Tag></div>
                                                    </div>
                                                </Space>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text type="secondary" style={{ fontSize: 10 }}>{tpl.items} check items</Text>
                                                    <Button type="link" size="small" icon={<FormOutlined />} style={{ fontSize: 11 }}>Use</Button>
                                                </div>
                                            </Space>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </div>
            ),
        },
        {
            key: 'gates', label: <Space><SafetyOutlined /> Quality Gates</Space>,
            children: (
                <Card size="small" style={glassCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'auto', padding: '20px 0' }}>
                        {[
                            { name: 'Code Review', status: complianceRate >= 80 ? 'passed' : complianceRate >= 50 ? 'warning' : 'pending', metric: `${complianceRate}%` },
                            { name: 'Unit Tests', status: passRate >= 80 ? 'passed' : passRate >= 50 ? 'warning' : 'pending', metric: `${passRate}%` },
                            { name: 'Security Scan', status: openIssues === 0 ? 'passed' : 'warning', metric: `${openIssues} issues` },
                            { name: 'Integration', status: inspCompleted > 0 ? 'passed' : 'pending', metric: `${inspCompleted} done` },
                            { name: 'Acceptance', status: checkPassed > 0 ? 'passed' : 'pending', metric: `${checkPassed} passed` },
                            { name: 'Release Ready', status: complianceRate >= 80 && passRate >= 80 && openIssues === 0 ? 'passed' : 'blocked', metric: complianceRate >= 80 ? 'Ready' : 'Blocked' },
                        ].map((gate, i, arr) => {
                            const gateColor = gate.status === 'passed' ? '#10b981' : gate.status === 'warning' ? '#f59e0b' : gate.status === 'blocked' ? '#ef4444' : '#64748b';
                            const gateIcon = gate.status === 'passed' ? <CheckCircleOutlined /> : gate.status === 'warning' ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />;
                            return (
                                <React.Fragment key={gate.name}>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                            padding: '16px 24px', borderRadius: 12, minWidth: 120,
                                            background: isDark ? `${gateColor}15` : `${gateColor}10`,
                                            border: `2px solid ${gateColor}44`,
                                        }}
                                    >
                                        <div style={{ fontSize: 24, color: gateColor }}>{gateIcon}</div>
                                        <Text strong style={{ fontSize: 12, textAlign: 'center' }}>{gate.name}</Text>
                                        <Tag color={gateColor} style={{ fontSize: 10, borderRadius: 8 }}>{gate.metric}</Tag>
                                        <Tag color={gateColor} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{gate.status.toUpperCase()}</Tag>
                                    </motion.div>
                                    {i < arr.length - 1 && (
                                        <div style={{ display: 'flex', alignItems: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }}>-{'>'}</div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </Card>
            ),
        },
        {
            key: 'inspections', label: <Space><EyeOutlined /> Inspections <Badge count={inspections.length} size="small" /></Space>,
            children: inspections.length > 0 ? (
                <Card size="small" style={glassCard}>
                    <Table dataSource={inspections} columns={inspCols} rowKey="id" size="small" pagination={{ pageSize: 10 }}
                        style={{ fontSize: 12 }} />
                </Card>
            ) : (
                <Card style={glassCard}>
                    <Empty description={selectedProject ? "No inspections found for this project" : "Select a project to view inspections"} image={Empty.PRESENTED_IMAGE_SIMPLE}>
                        {selectedProject && <Button type="primary" size="small" icon={<PlusOutlined />} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', marginTop: 8 }}>Schedule Inspection</Button>}
                    </Empty>
                </Card>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Quality Management</AuroraText>}
            subTitle={<DecryptedText text="Quality metrics, checklists, inspections & assessments" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => router.push('/admin/forms/builder')}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>Create Checklist</Button>,
                <Button key="forms" icon={<ArrowRightOutlined />} onClick={() => router.push('/admin/forms/templates')}>Form Templates</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={() => { load(); if (selectedProject) loadQualityData(selectedProject); }} />,
            ]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Project Selector */}
                    <Card size="small" style={{ ...glassCard, marginBottom: 16, borderTop: `3px solid ${themeColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <ProjectOutlined style={{ fontSize: 18, color: themeColor }} />
                            <Text strong style={{ fontSize: 13 }}>Project:</Text>
                            <Select
                                placeholder="All Projects (Summary)"
                                value={selectedProject}
                                onChange={setSelectedProject}
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                style={{ minWidth: 280 }}
                                loading={qualityLoading}
                                options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.projectNumber})` }))}
                            />
                            {selectedProject && <Tag color={themeColor} style={{ borderRadius: 8, fontSize: 10 }}>Project-specific data loaded</Tag>}
                            {!selectedProject && <Text type="secondary" style={{ fontSize: 11 }}>Select a project to load metrics, checklists & inspections</Text>}
                        </div>
                    </Card>

                    {/* KPI Stats */}
                    <BentoGrid className="max-w-none md:auto-rows-auto grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                        {statCards.map((s, i) => (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} key={i}>
                                <Card style={{ ...glassCard, borderTop: `3px solid ${s.color}`, height: '100%' }} styles={{ body: { padding: '12px 14px' } }}>
                                    <Statistic title={<Text style={{ fontSize: 10 }}>{s.label}</Text>} value={s.value}
                                        prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                                    {s.trend && (
                                        <div style={{ marginTop: 4, fontSize: 10, color: s.trend === 'up' ? '#10b981' : s.trend === 'down' ? '#ef4444' : '#64748b' }}>
                                            {s.trend === 'up' ? <RiseOutlined /> : s.trend === 'down' ? <FallOutlined /> : null}
                                            {' '}{s.trend === 'up' ? 'Improving' : s.trend === 'down' ? 'Declining' : 'Stable'}
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))}
                    </BentoGrid>

                    {/* Tabs */}
                    {qualityLoading ? (
                        <div style={{ textAlign: 'center', padding: 60 }}><Spin /><div style={{ marginTop: 8 }}><Text type="secondary">Loading quality data…</Text></div></div>
                    ) : (
                        <Tabs defaultActiveKey="overview" items={tabItems} />
                    )}
                </motion.div>
            )}
        </CMSLayout>
    );
}

