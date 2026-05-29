"use client";
import React, { useState, useEffect } from "react";
import { Card, Tag, Space, Typography, Button, Badge, Progress, Empty, Tooltip, List, Avatar } from "antd";
import { FormOutlined, BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined, RightOutlined, FileTextOutlined, TrophyOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;

interface FormTemplate {
    id: string; name: string; category: string; status: string; fieldCount: number;
}

interface FormSubmission {
    id: string; templateName?: string; templateCategory?: string;
    status: string; totalScore: number; percentage: number; grade?: string;
    submittedAt?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    kpi: '#f5222d', survey: '#1890ff', assessment: '#52c41a',
    checklist: '#fa8c16', feedback: '#722ed1', audit: '#13c2c2', custom: '#595959',
};

function gradeColor(grade?: string) {
    if (!grade) return '#595959';
    if (grade === 'Excellent') return '#52c41a';
    if (grade === 'Good') return '#1890ff';
    if (grade === 'Satisfactory') return '#faad14';
    return '#ff4d4f';
}

interface FormIntegrationWidgetProps {
    /** Filter templates by category: 'kpi' | 'survey' | 'checklist' | 'audit' | etc. */
    categories?: string[];
    /** Title override */
    title?: string;
    /** Max items to show */
    maxItems?: number;
    /** Animation delay index (for staggered animations) */
    animIndex?: number;
    /** Glass style override */
    style?: React.CSSProperties;
}

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

/**
 * Reusable Form Builder integration widget for module dashboards.
 * Shows available form templates and recent submissions relevant to the module.
 */
export default function FormIntegrationWidget({
    categories = [],
    title = "Forms & Evaluations",
    maxItems = 3,
    animIndex = 12,
    style,
}: FormIntegrationWidgetProps) {
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [tplRes, subRes] = await Promise.all([
                    gql<{ formTemplates: FormTemplate[] }>(`
                        query($tid: String!) {
                            formTemplates(tenantId: $tid, status: "published") {
                                id name category status fieldCount
                            }
                        }
                    `, { tid: DEFAULT_TENANT_ID }),
                    gql<{ formSubmissions: FormSubmission[] }>(`
                        query($tid: String!) {
                            formSubmissions(tenantId: $tid) {
                                id templateName templateCategory status totalScore percentage grade submittedAt
                            }
                        }
                    `, { tid: DEFAULT_TENANT_ID }),
                ]);
                let tpls = tplRes.formTemplates || [];
                let subs = subRes.formSubmissions || [];
                // Filter by category if provided
                if (categories.length > 0) {
                    tpls = tpls.filter(t => categories.includes(t.category));
                    subs = subs.filter(s => s.templateCategory && categories.includes(s.templateCategory));
                }
                setTemplates(tpls.slice(0, maxItems));
                setSubmissions(subs.slice(0, maxItems));
            } catch (e) {
                console.error('FormIntegrationWidget error:', e);
            }
            setLoading(false);
        };
        loadData();
    }, [categories.join(','), maxItems]);

    const totalForms = templates.length;
    const totalSubs = submissions.length;
    const pendingReview = submissions.filter(s => s.status === 'submitted').length;
    const approved = submissions.filter(s => s.status === 'approved').length;

    if (loading) return null; // Don't show skeleton to avoid layout shift

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animIndex * 0.06, duration: 0.4 }}
        >
            <Card
                title={<><FormOutlined style={{ color: '#722ed1' }} /> {title}</>}
                size="small"
                style={{ ...glass, ...style }}
                extra={
                    <Button type="link" size="small" href="/admin/forms/templates" style={{ fontSize: 11 }}>
                        View All <RightOutlined />
                    </Button>
                }
            >
                {/* Quick Stats Row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <Tag icon={<FileTextOutlined />} color="purple">{totalForms} forms</Tag>
                    <Tag icon={<ClockCircleOutlined />} color="orange">{pendingReview} pending</Tag>
                    <Tag icon={<CheckCircleOutlined />} color="green">{approved} approved</Tag>
                </div>

                {templates.length === 0 && submissions.length === 0 ? (
                    <Empty description="No forms available" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
                ) : (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {/* Active Templates */}
                        {templates.length > 0 && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Available Forms</Text>
                                {templates.map((t, i) => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.08 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        <Avatar size={28} style={{ backgroundColor: CATEGORY_COLORS[t.category] || '#595959', fontSize: 11 }}>
                                            {t.category === 'kpi' ? <BarChartOutlined /> : <FormOutlined />}
                                        </Avatar>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text strong style={{ fontSize: 12, display: 'block' }} ellipsis>{t.name}</Text>
                                            <Space size={4}>
                                                <Tag color={CATEGORY_COLORS[t.category]} style={{ fontSize: 9, margin: 0, lineHeight: '16px' }}>{t.category}</Tag>
                                                <Text type="secondary" style={{ fontSize: 10 }}>{t.fieldCount} fields</Text>
                                            </Space>
                                        </div>
                                        <Button type="link" size="small" href={`/admin/forms/submissions`} style={{ fontSize: 10 }}>
                                            Fill →
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Recent Submissions */}
                        {submissions.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Submissions</Text>
                                {submissions.map((s, i) => (
                                    <motion.div
                                        key={s.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + i * 0.08 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={{ fontSize: 12 }} ellipsis>{s.templateName || 'Form Response'}</Text>
                                            <div>
                                                <Tag color={s.status === 'approved' ? 'green' : s.status === 'submitted' ? 'blue' : 'default'} style={{ fontSize: 9, margin: 0 }}>
                                                    {s.status}
                                                </Tag>
                                                {s.submittedAt && <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>{dayjs(s.submittedAt).fromNow()}</Text>}
                                            </div>
                                        </div>
                                        {s.percentage > 0 ? (
                                            <Tooltip title={`${s.totalScore.toFixed(1)} — ${s.grade || ''}`}>
                                                <Progress
                                                    type="circle"
                                                    size={32}
                                                    percent={s.percentage}
                                                    strokeColor={gradeColor(s.grade)}
                                                    format={() => <span style={{ fontSize: 9 }}>{Math.round(s.percentage)}%</span>}
                                                />
                                            </Tooltip>
                                        ) : (
                                            <Badge status="processing" text={<Text type="secondary" style={{ fontSize: 10 }}>Pending</Text>} />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </Space>
                )}
            </Card>
        </motion.div>
    );
}
