"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Space, Tag, Select, message, Typography, Row, Col, Statistic, Spin, Empty } from "antd";
import { BarChartOutlined, PieChartOutlined, CheckCircleOutlined, TrophyOutlined, PercentageOutlined, TeamOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GRADE_COLORS: Record<string, string> = {
    'Excellent': '#52c41a', 'Good': '#1890ff', 'Satisfactory': '#faad14', 'Needs Improvement': '#ff4d4f',
};
const PIE_COLORS = ['#52c41a', '#1890ff', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

interface FormTemplate { id: string; name: string; category: string; }
interface Analytics {
    totalSubmissions: number; submittedCount: number; approvedCount: number;
    averageScore: number; averagePercentage: number; completionRate: number;
    gradeDistribution: Record<string, number>; statusDistribution: Record<string, number>;
}

export default function FormAnalyticsPage() {
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [messageApi, ctx] = message.useMessage();

    useEffect(() => {
        (async () => {
            try {
                const res = await gql<{ formTemplates: FormTemplate[] }>(`
                    query($tid: String!) { formTemplates(tenantId: $tid) { id name category } }
                `, { tid: DEFAULT_TENANT_ID });
                setTemplates(res.formTemplates || []);
                if (res.formTemplates?.length) setSelectedTemplate(res.formTemplates[0].id);
            } catch (e: any) { messageApi.error(e.message); }
        })();
    }, [messageApi]);

    const loadAnalytics = useCallback(async () => {
        if (!selectedTemplate) return;
        setLoading(true);
        try {
            const res = await gql<{ formAnalytics: Analytics }>(`
                query($tid: String!, $tplId: String!) {
                    formAnalytics(tenantId: $tid, templateId: $tplId) {
                        totalSubmissions submittedCount approvedCount
                        averageScore averagePercentage completionRate
                        gradeDistribution statusDistribution
                    }
                }
            `, { tid: DEFAULT_TENANT_ID, tplId: selectedTemplate });
            setAnalytics(res.formAnalytics);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [selectedTemplate, messageApi]);

    useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

    const gradeData = analytics ? Object.entries(analytics.gradeDistribution).map(([name, value]) => ({ name, value, color: GRADE_COLORS[name] || '#595959' })) : [];
    const statusData = analytics ? Object.entries(analytics.statusDistribution).map(([name, value]) => ({ name, value })) : [];

    return (
        <CMSLayout
            title={<AuroraText>Form Analytics</AuroraText>}
            subTitle={<DecryptedText text="Insights and metrics for form submissions" speed={40} revealDirection="start" />}
            extra={[
                <Select key="tpl" style={{ width: 280 }} value={selectedTemplate || undefined} onChange={setSelectedTemplate}
                    placeholder="Select a form" showSearch optionFilterProp="label"
                    options={templates.map(t => ({ value: t.id, label: `${t.name} (${t.category})` }))} />,
            ]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : !analytics || analytics.totalSubmissions === 0 ? (
                    <Card style={glass}><Empty description="No submissions yet for this form" /></Card>
                ) : (
                    <>
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            {[
                                { title: 'Total Responses', value: analytics.totalSubmissions, color: '#1890ff', icon: <TeamOutlined /> },
                                { title: 'Completion Rate', value: `${analytics.completionRate}%`, color: '#52c41a', icon: <CheckCircleOutlined /> },
                                { title: 'Avg Score', value: analytics.averageScore.toFixed(2), color: '#722ed1', icon: <TrophyOutlined /> },
                                { title: 'Avg Percentage', value: `${analytics.averagePercentage.toFixed(1)}%`, color: '#fa8c16', icon: <PercentageOutlined /> },
                            ].map((s, i) => (
                                <Col xs={12} md={6} key={i}>
                                    <Card style={{ ...glass, borderLeft: `3px solid ${s.color}` }} bodyStyle={{ padding: '16px 20px' }}>
                                        <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 24 }} />
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={14}>
                                <Card title={<Space><BarChartOutlined /> Status Distribution</Space>} style={glass}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={statusData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#1890ff" radius={[4, 4, 0, 0]}>
                                                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Col>
                            <Col xs={24} md={10}>
                                <Card title={<Space><PieChartOutlined /> Grade Distribution</Space>} style={glass}>
                                    {gradeData.length === 0 ? <Empty description="No graded submissions" /> : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                                    {gradeData.map((g, i) => <Cell key={i} fill={g.color} />)}
                                                </Pie>
                                                <Legend />
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    </>
                )}
            </motion.div>
        </CMSLayout>
    );
}
