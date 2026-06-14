"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Select, Table, Progress, Spin, message, Divider, Empty, Tooltip, Badge, theme } from "antd";
import {
    TrophyOutlined, BarChartOutlined, DownloadOutlined, ReloadOutlined,
    TeamOutlined, StarOutlined, FileTextOutlined, ArrowUpOutlined,
    ArrowDownOutlined, MinusOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, PieChartOutlined, LineChartOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line, AreaChart, Area } from "recharts";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

function gradeColor(grade?: string) {
    const map: Record<string, string> = { 'Excellent': '#10b981', 'Good': '#3b82f6', 'Satisfactory': '#f59e0b', 'Needs Improvement': '#ef4444' };
    return map[grade || ''] || '#6b7280';
}

export default function FormKpiReportPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [scores, setScores] = useState<any[]>([]);

    const loadTemplates = useCallback(async () => {
        try {
            const res = await gql<{ formTemplates: any[] }>(`
                query($tid: String!) { formTemplates(tenantId: $tid) { id name category status } }
            `, { tid: DEFAULT_TENANT_ID });
            setTemplates(res.formTemplates || []);
        } catch (e: any) { messageApi.error(e.message); }
    }, [messageApi]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await gql<{ formSubmissions: any[] }>(`
                query($tid: String!, $tplId: String) {
                    formSubmissions(tenantId: $tid, templateId: $tplId) {
                        id status totalScore maxPossibleScore percentage grade
                        submittedBy submittedAt templateName templateCategory
                    }
                }
            `, { tid: DEFAULT_TENANT_ID, tplId: selectedTemplate || null });
            setSubmissions(res.formSubmissions || []);

            // Load scores for scored submissions
            const scoredSubs = (res.formSubmissions || []).filter((s: any) => s.percentage > 0);
            const allScores: any[] = [];
            for (const sub of scoredSubs.slice(0, 20)) {
                try {
                    const sRes = await gql<{ formScores: any[] }>(`
                        query($sid: String!) { formScores(submissionId: $sid) { id dimension score maxScore weight weightedScore } }
                    `, { sid: sub.id });
                    allScores.push(...(sRes.formScores || []).map((s: any) => ({ ...s, submissionId: sub.id, templateName: sub.templateName })));
                } catch { /* skip */ }
            }
            setScores(allScores);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [selectedTemplate, messageApi]);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);
    useEffect(() => { loadData(); }, [loadData]);

    // Analytics calculations
    const scoredSubmissions = submissions.filter(s => s.percentage > 0);
    const avgScore = scoredSubmissions.length > 0
        ? scoredSubmissions.reduce((a, s) => a + s.percentage, 0) / scoredSubmissions.length : 0;
    const maxScore = scoredSubmissions.length > 0
        ? Math.max(...scoredSubmissions.map(s => s.percentage)) : 0;
    const minScore = scoredSubmissions.length > 0
        ? Math.min(...scoredSubmissions.map(s => s.percentage)) : 0;

    // Grade distribution
    const gradeDistribution = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'].map(grade => ({
        name: grade,
        value: scoredSubmissions.filter(s => s.grade === grade).length,
        color: gradeColor(grade),
    }));

    // Score distribution (by range)
    const scoreRanges = [
        { name: '90-100%', min: 90, max: 100, color: '#10b981' },
        { name: '80-89%', min: 80, max: 89, color: '#3b82f6' },
        { name: '70-79%', min: 70, max: 79, color: '#06b6d4' },
        { name: '60-69%', min: 60, max: 69, color: '#f59e0b' },
        { name: 'Below 60%', min: 0, max: 59, color: '#ef4444' },
    ].map(r => ({
        ...r,
        value: scoredSubmissions.filter(s => s.percentage >= r.min && s.percentage <= r.max).length,
    }));

    // Dimension averages from scores
    const dimensionMap = new Map<string, { total: number; count: number; maxTotal: number }>();
    scores.forEach(s => {
        const existing = dimensionMap.get(s.dimension) || { total: 0, count: 0, maxTotal: 0 };
        existing.total += s.score;
        existing.count += 1;
        existing.maxTotal += s.maxScore;
        dimensionMap.set(s.dimension, existing);
    });
    const dimensionAvgs = Array.from(dimensionMap.entries()).map(([dim, data]) => ({
        dimension: dim,
        avgScore: Math.round((data.total / data.count) * 100) / 100,
        avgPercentage: Math.round((data.total / data.maxTotal) * 100),
        count: data.count,
    }));

    // Trend data (by template)
    const templateGroups = new Map<string, any[]>();
    scoredSubmissions.forEach(s => {
        const list = templateGroups.get(s.templateName) || [];
        list.push(s);
        templateGroups.set(s.templateName, list);
    });
    const trendData = Array.from(templateGroups.entries()).map(([name, subs]) => ({
        name: name?.slice(0, 20) || 'Unknown',
        avgScore: Math.round(subs.reduce((a: number, s: any) => a + s.percentage, 0) / subs.length),
        count: subs.length,
    }));

    // Top performers
    const topPerformers = [...scoredSubmissions]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10);

    const handleExportCsv = () => {
        const headers = ['Template', 'Submitted By', 'Score', 'Max Score', 'Percentage', 'Grade', 'Status', 'Submitted At'];
        const rows = submissions.map(s => [s.templateName, s.submittedBy || '-', s.totalScore, s.maxPossibleScore, s.percentage, s.grade || '-', s.status, s.submittedAt || '-']);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'kpi_report.csv'; a.click();
        URL.revokeObjectURL(url);
        messageApi.success('CSV exported');
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981']}>KPI Evaluation Report</AuroraText>}
            subTitle={<DecryptedText text="Comprehensive form scoring analytics & insights" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="export" icon={<DownloadOutlined />} onClick={handleExportCsv}>Export CSV</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            ]}
        >
            {contextHolder}
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Filter */}
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                    <Space>
                        <Text strong style={{ fontSize: 12 }}>Filter by form:</Text>
                        <Select placeholder="All forms" allowClear style={{ width: 300 }}
                            value={selectedTemplate || undefined}
                            onChange={v => setSelectedTemplate(v || '')}
                            showSearch optionFilterProp="label"
                            options={templates.map(t => ({ value: t.id, label: `${t.name} (${t.category})` }))} />
                    </Space>
                </Card>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
                ) : submissions.length === 0 ? (
                    <Empty description="No submissions found" />
                ) : (
                    <>
                        {/* Summary Stats */}
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                            {[
                                { label: 'Total Submissions', value: submissions.length, color: '#3b82f6', icon: <FileTextOutlined /> },
                                { label: 'Scored', value: scoredSubmissions.length, color: '#8b5cf6', icon: <StarOutlined /> },
                                { label: 'Avg Score', value: `${avgScore.toFixed(1)}%`, color: avgScore >= 70 ? '#10b981' : '#f59e0b', icon: <TrophyOutlined /> },
                                { label: 'Highest', value: `${maxScore.toFixed(1)}%`, color: '#10b981', icon: <ArrowUpOutlined /> },
                                { label: 'Lowest', value: `${minScore.toFixed(1)}%`, color: '#ef4444', icon: <ArrowDownOutlined /> },
                                { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, color: '#10b981', icon: <CheckCircleOutlined /> },
                            ].map((s, i) => (
                                <Col xs={12} sm={8} md={4} key={i}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                        <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                            <Statistic title={<Text style={{ fontSize: 10 }}>{s.label}</Text>} value={s.value} prefix={s.icon}
                                                valueStyle={{ color: s.color, fontSize: 18 }} />
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>

                        {/* Charts Row 1 */}
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            <Col xs={24} md={12}>
                                <Card size="small" title={<Space><PieChartOutlined style={{ color: '#8b5cf6' }} /> Grade Distribution</Space>} style={glass}>
                                    <div style={{ height: 260 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={gradeDistribution.filter(g => g.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                                                    paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                    labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                                    {gradeDistribution.filter(g => g.value > 0).map((g, i) => <Cell key={i} fill={g.color} />)}
                                                </Pie>
                                                <RTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} md={12}>
                                <Card size="small" title={<Space><BarChartOutlined style={{ color: '#3b82f6' }} /> Score Distribution</Space>} style={glass}>
                                    <div style={{ height: 260 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={scoreRanges}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <RTooltip />
                                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                    {scoreRanges.map((r, i) => <Cell key={i} fill={r.color} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </Col>
                        </Row>

                        {/* Charts Row 2: Dimension Radar + Template Trend */}
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            {dimensionAvgs.length > 0 && (
                                <Col xs={24} md={12}>
                                    <Card size="small" title={<Space><StarOutlined style={{ color: '#f59e0b' }} /> Dimension Averages</Space>} style={glass}>
                                        <div style={{ height: 280 }}>
                                            <ResponsiveContainer>
                                                <RadarChart data={dimensionAvgs}>
                                                    <PolarGrid strokeDasharray="3 3" />
                                                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                                                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                                                    <Radar name="Avg %" dataKey="avgPercentage" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                                                    <Legend />
                                                    <RTooltip />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </Col>
                            )}
                            {trendData.length > 0 && (
                                <Col xs={24} md={dimensionAvgs.length > 0 ? 12 : 24}>
                                    <Card size="small" title={<Space><LineChartOutlined style={{ color: '#10b981' }} /> Score by Form</Space>} style={glass}>
                                        <div style={{ height: 280 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={trendData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                                    <RTooltip />
                                                    <Bar dataKey="avgScore" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Avg Score %" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </Col>
                            )}
                        </Row>

                        {/* Top Performers Table */}
                        {topPerformers.length > 0 && (
                            <Card size="small" title={<Space><TrophyOutlined style={{ color: '#f59e0b' }} /> Top Performers</Space>}
                                style={{ ...glass, marginBottom: 16 }} extra={<Tag>{topPerformers.length} entries</Tag>}>
                                <Table dataSource={topPerformers} rowKey="id" size="small" pagination={false} columns={[
                                    { title: '#', key: 'rank', width: 50, render: (_: any, __: any, i: number) => (
                                        <Badge count={i + 1} style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#c4842d' : '#d1d5db' }} />
                                    )},
                                    { title: 'Form', dataIndex: 'templateName', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v || 'Unknown'}</Text> },
                                    { title: 'Category', dataIndex: 'templateCategory', render: (v: string) => <Tag style={{ fontSize: 10 }}>{v || 'custom'}</Tag> },
                                    { title: 'Score', key: 'score', width: 140, render: (_: any, rec: any) => (
                                        <Space>
                                            <Progress type="circle" size={32} percent={rec.percentage}
                                                strokeColor={gradeColor(rec.grade)} format={() => `${rec.percentage.toFixed(0)}`} />
                                            <Text type="secondary" style={{ fontSize: 11 }}>{rec.totalScore.toFixed(1)}/{rec.maxPossibleScore}</Text>
                                        </Space>
                                    )},
                                    { title: 'Grade', dataIndex: 'grade', render: (v: string) => v ? <Tag color={gradeColor(v)}>{v}</Tag> : '—' },
                                    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'approved' ? 'green' : v === 'submitted' ? 'blue' : 'default'}>{v}</Tag> },
                                ]} />
                            </Card>
                        )}
                    </>
                )}
            </div>
        </CMSLayout>
    );
}
