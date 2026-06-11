"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Table, Progress, message, Select, Badge, Empty, Spin, Tabs, Tooltip, Rate, theme } from "antd";
import {
    SmileOutlined, FrownOutlined, MehOutlined, FormOutlined, CheckCircleOutlined,
    ClockCircleOutlined, PlusOutlined, ReloadOutlined, FileTextOutlined,
    ArrowRightOutlined, BarChartOutlined, TeamOutlined, StarOutlined,
    TrophyOutlined, UserOutlined, HeartOutlined, MessageOutlined,
    LineChartOutlined, PieChartOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

// Satisfaction categories
const SAT_LEVELS = [
    { key: 'promoter', label: 'Promoters', min: 80, icon: <SmileOutlined />, color: '#10b981', emoji: '😊' },
    { key: 'passive', label: 'Passives', min: 60, icon: <MehOutlined />, color: '#f59e0b', emoji: '😐' },
    { key: 'detractor', label: 'Detractors', min: 0, icon: <FrownOutlined />, color: '#ef4444', emoji: '😞' },
];

// Pre-built survey templates
const SURVEY_TEMPLATES = [
    { id: 'csat', name: 'Customer Satisfaction (CSAT)', items: 8, color: '#10b981', desc: 'Overall satisfaction with products & services' },
    { id: 'nps', name: 'Net Promoter Score (NPS)', items: 5, color: '#3b82f6', desc: 'Likelihood to recommend to others' },
    { id: 'ces', name: 'Customer Effort Score (CES)', items: 6, color: '#8b5cf6', desc: 'Ease of resolving issues / completing tasks' },
    { id: 'post-purchase', name: 'Post-Purchase Survey', items: 10, color: '#f59e0b', desc: 'Experience after buying a product' },
    { id: 'onboarding', name: 'Onboarding Feedback', items: 7, color: '#ec4899', desc: 'New customer onboarding experience' },
    { id: 'support', name: 'Support Ticket Survey', items: 4, color: '#06b6d4', desc: 'Post-support interaction feedback' },
];

export default function CrmSurveysPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sRes, cRes] = await Promise.all([
                gql<{ formSubmissions: any[] }>(`query($t:String!){ formSubmissions(tenantId:$t){ id status totalScore maxPossibleScore percentage grade submittedBy submittedAt templateName templateCategory } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] })),
                gql<{ crmContacts: any[] }>(`query($t:String!){ crmContacts(tenantId:$t){ id firstName lastName email company } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ crmContacts: [] })),
            ]);
            setSubmissions((sRes.formSubmissions || []).filter((s: any) => s.templateCategory === 'survey' || s.templateCategory === 'feedback' || s.percentage > 0));
            setContacts(cRes.crmContacts || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    const scoredSubs = submissions.filter(s => s.percentage > 0);
    const avgSat = scoredSubs.length > 0 ? scoredSubs.reduce((a: number, s: any) => a + s.percentage, 0) / scoredSubs.length : 0;

    // NPS-style calculation
    const promoters = scoredSubs.filter(s => s.percentage >= 80).length;
    const passives = scoredSubs.filter(s => s.percentage >= 60 && s.percentage < 80).length;
    const detractors = scoredSubs.filter(s => s.percentage < 60).length;
    const npsScore = scoredSubs.length > 0 ? Math.round(((promoters - detractors) / scoredSubs.length) * 100) : 0;

    // Satisfaction pie data
    const satData = SAT_LEVELS.map(level => ({
        name: level.label,
        value: scoredSubs.filter(s => {
            if (level.min === 80) return s.percentage >= 80;
            if (level.min === 60) return s.percentage >= 60 && s.percentage < 80;
            return s.percentage < 60;
        }).length,
        color: level.color,
    })).filter(d => d.value > 0);

    // Score by survey type bar
    const surveyScoreMap: Record<string, number[]> = {};
    scoredSubs.forEach((s: any) => {
        const name = (s.templateName || 'Survey').slice(0, 18);
        if (!surveyScoreMap[name]) surveyScoreMap[name] = [];
        surveyScoreMap[name].push(s.percentage);
    });
    const barData = Object.entries(surveyScoreMap).map(([name, scores]) => ({
        name, avgScore: Math.round(scores.reduce((a, s) => a + s, 0) / scores.length),
    }));

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#ec4899']}>Customer Surveys</AuroraText>}
            subTitle={<DecryptedText text="CSAT, NPS & customer feedback powered by Forms" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => router.push('/admin/forms/builder')}
                    style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)', border: 'none' }}>Create Survey</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
            ]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Surveys', value: SURVEY_TEMPLATES.length, color: '#ec4899', icon: <FormOutlined /> },
                            { label: 'Responses', value: submissions.length, color: '#3b82f6', icon: <FileTextOutlined /> },
                            { label: 'CSAT', value: `${avgSat.toFixed(1)}%`, color: avgSat >= 70 ? '#10b981' : '#f59e0b', icon: <SmileOutlined /> },
                            { label: 'NPS Score', value: npsScore, color: npsScore >= 0 ? '#10b981' : '#ef4444', icon: <TrophyOutlined /> },
                            { label: 'Promoters', value: promoters, color: '#10b981', icon: <HeartOutlined /> },
                            { label: 'Contacts', value: contacts.length, color: '#8b5cf6', icon: <TeamOutlined /> },
                        ].map((s, i) => (
                            <Col xs={12} sm={8} md={4} key={i}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <Card style={{ borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                        <Statistic title={<Text style={{ fontSize: 10 }}>{s.label}</Text>} value={s.value}
                                            prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    {/* NPS Gauge */}
                    <Card style={{ marginBottom: 16, textAlign: 'center' }} bodyStyle={{ padding: '20px 24px' }}>
                        <Row align="middle" gutter={24}>
                            <Col xs={24} md={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Net Promoter Score</Text>
                                    <div style={{
                                        fontSize: 48, fontWeight: 800, lineHeight: 1.2, marginTop: 4,
                                        color: npsScore >= 50 ? '#10b981' : npsScore >= 0 ? '#f59e0b' : '#ef4444',
                                    }}>{npsScore}</div>
                                    <Tag color={npsScore >= 50 ? 'green' : npsScore >= 0 ? 'orange' : 'red'} style={{ borderRadius: 10 }}>
                                        {npsScore >= 50 ? 'Excellent' : npsScore >= 0 ? 'Good' : 'Needs Work'}
                                    </Tag>
                                </div>
                            </Col>
                            <Col xs={24} md={16}>
                                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {SAT_LEVELS.map((level, i) => {
                                        const count = level.min === 80 ? promoters : level.min === 60 ? passives : detractors;
                                        const pct = scoredSubs.length > 0 ? Math.round((count / scoredSubs.length) * 100) : 0;
                                        return (
                                            <motion.div key={level.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.2 + i * 0.1 }}
                                                style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 12, background: `${level.color}08`, border: `1px solid ${level.color}20`, minWidth: 120 }}>
                                                <div style={{ fontSize: 28 }}>{level.emoji}</div>
                                                <Text strong style={{ color: level.color, fontSize: 20 }}>{count}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>{level.label} ({pct}%)</Text></div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    <Tabs defaultActiveKey="templates" items={[
                        {
                            key: 'templates', label: <Space><FormOutlined /> Survey Templates</Space>,
                            children: (
                                <Row gutter={[16, 16]}>
                                    {SURVEY_TEMPLATES.map((tpl, i) => (
                                        <Col xs={24} sm={12} md={8} key={tpl.id}>
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                                <Card hoverable style={{ borderTop: `3px solid ${tpl.color}`, cursor: 'pointer' }}
                                                    onClick={() => router.push('/admin/forms/builder')}>
                                                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                        <Text strong style={{ fontSize: 14 }}>{tpl.name}</Text>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>{tpl.desc}</Text>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                            <Tag color={tpl.color} style={{ fontSize: 10 }}>{tpl.items} questions</Tag>
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
                            key: 'results', label: <Space><BarChartOutlined /> Survey Results <Badge count={scoredSubs.length} size="small" /></Space>,
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={14}>
                                        <Card size="small" title={<Space><BarChartOutlined style={{ color: '#3b82f6' }} /> Satisfaction by Survey</Space>} >
                                            <div style={{ height: 280 }}>
                                                {barData.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <BarChart data={barData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} />
                                                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                                            <RTooltip />
                                                            <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} name="Satisfaction %">
                                                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : <Empty description="No survey results yet" />}
                                            </div>
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={10}>
                                        <Card size="small" title={<Space><PieChartOutlined style={{ color: '#ec4899' }} /> Satisfaction Split</Space>} style={{ height: '100%' }}>
                                            <div style={{ height: 280 }}>
                                                {satData.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <Pie data={satData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                                                                paddingAngle={3} dataKey="value"
                                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                                labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                                                {satData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                                            </Pie>
                                                            <RTooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : <Empty description="No data" />}
                                            </div>
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
