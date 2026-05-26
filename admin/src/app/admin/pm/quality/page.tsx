"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Table, Progress, message, Select, Badge, Empty, Spin, Tabs, Avatar, Tooltip } from "antd";
import {
    CheckSquareOutlined, ProjectOutlined, FormOutlined, CheckCircleOutlined,
    ClockCircleOutlined, PlusOutlined, ReloadOutlined, FileTextOutlined,
    ArrowRightOutlined, BarChartOutlined, TeamOutlined, ExclamationCircleOutlined,
    SafetyOutlined, StarOutlined, RocketOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell } from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

function gradeColor(g?: string) {
    return { 'Excellent': '#10b981', 'Good': '#3b82f6', 'Satisfactory': '#f59e0b', 'Needs Improvement': '#ef4444' }[g || ''] || '#6b7280';
}

// Pre-built quality checklist templates
const CHECKLIST_TEMPLATES = [
    { id: 'qa-sprint', name: 'Sprint QA Checklist', items: 12, category: 'Development', color: '#3b82f6' },
    { id: 'qa-release', name: 'Release Readiness', items: 18, category: 'Deployment', color: '#10b981' },
    { id: 'qa-code', name: 'Code Review Standards', items: 15, category: 'Code Quality', color: '#8b5cf6' },
    { id: 'qa-ux', name: 'UX Review Checklist', items: 10, category: 'Design', color: '#ec4899' },
    { id: 'qa-security', name: 'Security Assessment', items: 20, category: 'Security', color: '#ef4444' },
    { id: 'qa-perf', name: 'Performance Testing', items: 8, category: 'Performance', color: '#f59e0b' },
];

export default function PmQualityPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes] = await Promise.all([
                gql<{ formTemplates: any[] }>(`query($t:String!){ formTemplates(tenantId:$t){ id name category status } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formTemplates: [] })),
                gql<{ formSubmissions: any[] }>(`query($t:String!){ formSubmissions(tenantId:$t){ id status totalScore maxPossibleScore percentage grade submittedBy submittedAt templateName templateCategory } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] })),
            ]);
            setTemplates(tRes.formTemplates || []);
            // Filter for checklist/assessment category or any with scores
            const qualitySubs = (sRes.formSubmissions || []).filter((s: any) =>
                s.templateCategory === 'checklist' || s.templateCategory === 'assessment' || s.templateCategory === 'audit' || s.percentage > 0
            );
            setSubmissions(qualitySubs);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    const scoredSubs = submissions.filter(s => s.percentage > 0);
    const avgScore = scoredSubs.length > 0 ? scoredSubs.reduce((a: number, s: any) => a + s.percentage, 0) / scoredSubs.length : 0;
    const passRate = scoredSubs.length > 0 ? Math.round((scoredSubs.filter(s => s.percentage >= 70).length / scoredSubs.length) * 100) : 0;

    // Score by template for bar chart
    const templateScoreMap: Record<string, number[]> = {};
    scoredSubs.forEach((s: any) => {
        const name = (s.templateName || 'Unknown').slice(0, 20);
        if (!templateScoreMap[name]) templateScoreMap[name] = [];
        templateScoreMap[name].push(s.percentage);
    });
    const barData = Object.entries(templateScoreMap).map(([name, scores]) => ({
        name, avgScore: Math.round(scores.reduce((a, s) => a + s, 0) / scores.length),
    }));

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Quality Checklists</AuroraText>}
            subTitle={<DecryptedText text="Project quality gates, checklists & assessments powered by Forms" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => router.push('/admin/forms/builder')}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>Create Checklist</Button>,
                <Button key="forms" icon={<ArrowRightOutlined />} onClick={() => router.push('/admin/forms/templates')}>Form Templates</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
            ]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Checklists', value: CHECKLIST_TEMPLATES.length, color: '#3b82f6', icon: <CheckSquareOutlined /> },
                            { label: 'Evaluations', value: submissions.length, color: '#8b5cf6', icon: <FileTextOutlined /> },
                            { label: 'Quality Score', value: `${avgScore.toFixed(1)}%`, color: avgScore >= 70 ? '#10b981' : '#f59e0b', icon: <StarOutlined /> },
                            { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? '#10b981' : '#f59e0b', icon: <CheckCircleOutlined /> },
                            { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, color: '#10b981', icon: <SafetyOutlined /> },
                            { label: 'Pending', value: submissions.filter(s => s.status === 'submitted').length, color: '#f59e0b', icon: <ClockCircleOutlined /> },
                        ].map((s, i) => (
                            <Col xs={12} sm={8} md={4} key={i}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                        <Statistic title={<Text style={{ fontSize: 10 }}>{s.label}</Text>} value={s.value}
                                            prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    <Tabs defaultActiveKey="templates" items={[
                        {
                            key: 'templates', label: <Space><CheckSquareOutlined /> Checklist Templates</Space>,
                            children: (
                                <Row gutter={[16, 16]}>
                                    {CHECKLIST_TEMPLATES.map((tpl, i) => (
                                        <Col xs={24} sm={12} md={8} key={tpl.id}>
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                                <Card hoverable style={{
                                                    ...glass, borderTop: `3px solid ${tpl.color}`, cursor: 'pointer',
                                                }} onClick={() => router.push('/admin/forms/builder')}>
                                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                        <Space>
                                                            <CheckSquareOutlined style={{ fontSize: 20, color: tpl.color }} />
                                                            <div>
                                                                <Text strong>{tpl.name}</Text>
                                                                <div><Tag color={tpl.color} style={{ fontSize: 10, borderRadius: 8 }}>{tpl.category}</Tag></div>
                                                            </div>
                                                        </Space>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>{tpl.items} check items</Text>
                                                            <Button type="link" size="small" icon={<FormOutlined />}>Use Template</Button>
                                                        </div>
                                                    </Space>
                                                </Card>
                                            </motion.div>
                                        </Col>
                                    ))}
                                </Row>
                            ),
                        },
                        {
                            key: 'results', label: <Space><BarChartOutlined /> Quality Results <Badge count={scoredSubs.length} size="small" /></Space>,
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={14}>
                                        <Card size="small" title={<Space><BarChartOutlined style={{ color: '#3b82f6' }} /> Score by Checklist</Space>} style={glass}>
                                            <div style={{ height: 280 }}>
                                                {barData.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <BarChart data={barData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                                            <RTooltip />
                                                            <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} name="Avg Score %">
                                                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : <Empty description="No scored evaluations yet" />}
                                            </div>
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={10}>
                                        <Card size="small" title={<Space><FileTextOutlined style={{ color: '#8b5cf6' }} /> Recent Evaluations</Space>} style={{ ...glass, height: '100%' }}>
                                            {scoredSubs.slice(0, 8).map((s: any, i: number) => (
                                                <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
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
                    ]} />
                </motion.div>
            )}
        </CMSLayout>
    );
}
