"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Space, Tag, Select, message, Typography, Row, Col, Statistic, Spin, Empty, Table, Progress, Badge } from "antd";
import { TrophyOutlined, BarChartOutlined, TeamOutlined, RiseOutlined, FallOutlined, AimOutlined, DashboardOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

function gradeColor(grade?: string) {
    if (!grade) return '#595959';
    if (grade === 'Excellent') return '#52c41a';
    if (grade === 'Good') return '#1890ff';
    if (grade === 'Satisfactory') return '#faad14';
    return '#ff4d4f';
}

interface Submission {
    id: string; submittedBy?: string; totalScore: number;
    maxPossibleScore: number; percentage: number; grade?: string;
    submittedAt?: string; status: string; templateName?: string;
}

interface Score {
    id: string; submissionId: string; dimension: string;
    score: number; maxScore: number; weight: number; weightedScore: number;
}

export default function KPIDashboardPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [allScores, setAllScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(false);
    const [messageApi, ctx] = message.useMessage();

    // Load KPI templates only
    useEffect(() => {
        (async () => {
            try {
                const res = await gql<{ formTemplates: any[] }>(`
                    query($tid: String!) { formTemplates(tenantId: $tid, category: "kpi") { id name category scoringConfig } }
                `, { tid: DEFAULT_TENANT_ID });
                setTemplates(res.formTemplates || []);
                if (res.formTemplates?.length) setSelectedTemplate(res.formTemplates[0].id);
            } catch (e: any) { messageApi.error(e.message); }
        })();
    }, [messageApi]);

    const loadData = useCallback(async () => {
        if (!selectedTemplate) return;
        setLoading(true);
        try {
            const subRes = await gql<{ formSubmissions: Submission[] }>(`
                query($tid: String!, $tplId: String) {
                    formSubmissions(tenantId: $tid, templateId: $tplId) {
                        id submittedBy totalScore maxPossibleScore percentage grade submittedAt status templateName
                    }
                }
            `, { tid: DEFAULT_TENANT_ID, tplId: selectedTemplate });
            const subs = subRes.formSubmissions || [];
            setSubmissions(subs);
            // Load scores for all submissions
            const scorePromises = subs.map((s: Submission) =>
                gql<{ formScores: Score[] }>(`query($sid: String!) { formScores(submissionId: $sid) { id submissionId dimension score maxScore weight weightedScore } }`, { sid: s.id })
            );
            const scoreResults = await Promise.all(scorePromises);
            setAllScores(scoreResults.flatMap(r => r.formScores || []));
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [selectedTemplate, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    // Aggregate dimension scores across all submissions
    const dimensions = [...new Set(allScores.map(s => s.dimension))];
    const radarData = dimensions.map(dim => {
        const dimScores = allScores.filter(s => s.dimension === dim);
        const avg = dimScores.length ? dimScores.reduce((a, s) => a + s.score, 0) / dimScores.length : 0;
        const max = dimScores.length ? dimScores[0].maxScore : 5;
        return { dimension: dim, score: parseFloat(avg.toFixed(2)), max };
    });

    const scoredSubs = submissions.filter(s => s.percentage > 0);
    const avgScore = scoredSubs.length ? scoredSubs.reduce((a, s) => a + s.totalScore, 0) / scoredSubs.length : 0;
    const avgPct = scoredSubs.length ? scoredSubs.reduce((a, s) => a + s.percentage, 0) / scoredSubs.length : 0;
    const topPerformers = [...scoredSubs].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
    const excellent = scoredSubs.filter(s => s.grade === 'Excellent').length;
    const needsImprovement = scoredSubs.filter(s => s.grade === 'Needs Improvement').length;

    const scoringConfig = templates.find(t => t.id === selectedTemplate)?.scoringConfig || {};

    const columns: ColumnsType<Submission> = [
        { title: '#', key: 'rank', width: 50, render: (_: any, __: any, i: number) => (
            <Badge count={i + 1} style={{ backgroundColor: i === 0 ? '#f5222d' : i < 3 ? '#fa8c16' : '#d9d9d9' }} />
        )},
        { title: 'Submitted By', dataIndex: 'submittedBy', key: 'submittedBy', render: (v: string) => <Text>{v ? `User ${v.slice(0, 8)}…` : '—'}</Text> },
        { title: 'Score', key: 'score', width: 100, render: (_: any, rec) => <Text strong style={{ color: gradeColor(rec.grade) }}>{rec.totalScore.toFixed(2)}</Text> },
        { title: 'Percentage', key: 'pct', width: 180, render: (_: any, rec) => <Progress percent={rec.percentage} size="small" strokeColor={gradeColor(rec.grade)} /> },
        { title: 'Grade', dataIndex: 'grade', key: 'grade', width: 130, render: (g: string) => g ? <Tag color={gradeColor(g)} style={{ fontWeight: 600 }}>{g}</Tag> : '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => <Tag color={s === 'approved' ? 'green' : s === 'submitted' ? 'blue' : 'default'}>{s}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText>KPI Dashboard</AuroraText>}
            subTitle={<DecryptedText text="Performance scorecards, dimension analysis & rankings" speed={40} revealDirection="start" />}
            extra={[
                <Select key="tpl" style={{ width: 300 }} value={selectedTemplate || undefined} onChange={setSelectedTemplate}
                    placeholder="Select KPI Form" options={templates.map(t => ({ value: t.id, label: t.name }))} />,
            ]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : submissions.length === 0 ? (
                    <Card style={glass}><Empty description="No KPI evaluations submitted yet" /></Card>
                ) : (
                    <>
                        {/* Stats */}
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            {[
                                { title: 'Evaluations', value: submissions.length, color: '#1890ff', icon: <TeamOutlined /> },
                                { title: 'Avg Score', value: avgScore.toFixed(2), color: '#722ed1', icon: <TrophyOutlined /> },
                                { title: 'Avg %', value: `${avgPct.toFixed(1)}%`, color: '#13c2c2', icon: <AimOutlined /> },
                                { title: 'Excellent', value: excellent, color: '#52c41a', icon: <RiseOutlined />, suffix: needsImprovement > 0 ? <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>| {needsImprovement} <FallOutlined /></Text> : null },
                            ].map((s, i) => (
                                <Col xs={12} md={6} key={i}>
                                    <Card style={{ ...glass, borderLeft: `3px solid ${s.color}` }} bodyStyle={{ padding: '16px 20px' }}>
                                        <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 24 }} suffix={s.suffix} />
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            {/* Radar Chart */}
                            <Col xs={24} md={12}>
                                <Card title={<Space><DashboardOutlined /> Dimension Analysis</Space>} style={glass}>
                                    {radarData.length === 0 ? <Empty description="No dimension scores" /> : (
                                        <ResponsiveContainer width="100%" height={320}>
                                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="dimension" />
                                                <PolarRadiusAxis angle={30} domain={[0, radarData[0]?.max || 5]} />
                                                <Radar name="Avg Score" dataKey="score" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                                                <Tooltip />
                                                <Legend />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    )}
                                </Card>
                            </Col>
                            {/* Score Distribution */}
                            <Col xs={24} md={12}>
                                <Card title={<Space><BarChartOutlined /> Score Distribution</Space>} style={glass}>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={scoredSubs.map((s, i) => ({ name: `#${i + 1}`, score: s.totalScore, grade: s.grade }))}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, scoringConfig.max_score || 5]} />
                                            <Tooltip />
                                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                                {scoredSubs.map((s, i) => <Cell key={i} fill={gradeColor(s.grade)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Col>
                        </Row>

                        {/* Grading Scale */}
                        {scoringConfig.grading_scale && (
                            <Card size="small" style={{ ...glass, marginBottom: 16 }} title="Grading Scale">
                                <Space size={16} wrap>
                                    {scoringConfig.grading_scale.map((g: any, i: number) => (
                                        <Tag key={i} color={g.color} style={{ fontSize: 13, padding: '4px 12px' }}>
                                            {g.label}: {g.min} – {g.max}
                                        </Tag>
                                    ))}
                                </Space>
                            </Card>
                        )}

                        {/* Rankings Table */}
                        <Card title={<Space><TrophyOutlined style={{ color: '#f5222d' }} /> Performance Rankings</Space>} style={glass}>
                            <Table<Submission> dataSource={topPerformers} columns={columns} rowKey="id" pagination={false} size="middle" />
                        </Card>
                    </>
                )}
            </motion.div>
        </CMSLayout>
    );
}
