"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Table, Progress, message, Badge, Empty, Spin, Tooltip, Timeline, Divider } from "antd";
import {
    SafetyOutlined, AuditOutlined, CheckCircleOutlined,
    ClockCircleOutlined, PlusOutlined, ReloadOutlined, FileTextOutlined,
    ArrowRightOutlined, BarChartOutlined, ExclamationCircleOutlined,
    LockOutlined, BugOutlined, FormOutlined, StarOutlined,
    WarningOutlined, AlertOutlined, EyeOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

function riskColor(score: number) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

function riskLabel(score: number) {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Medium Risk';
    return 'High Risk';
}

// Pre-defined audit templates
const AUDIT_TEMPLATES = [
    { id: 'sec-infra', name: 'Infrastructure Security Audit', icon: <SafetyOutlined />, items: 25, severity: 'Critical', color: '#ef4444' },
    { id: 'sec-app', name: 'Application Security Review', icon: <BugOutlined />, items: 20, severity: 'High', color: '#f59e0b' },
    { id: 'sec-access', name: 'Access Control Assessment', icon: <LockOutlined />, items: 15, severity: 'High', color: '#8b5cf6' },
    { id: 'sec-data', name: 'Data Protection Compliance', icon: <SafetyOutlined />, items: 18, severity: 'Critical', color: '#ef4444' },
    { id: 'sec-network', name: 'Network Security Check', icon: <AlertOutlined />, items: 22, severity: 'Medium', color: '#3b82f6' },
    { id: 'sec-incident', name: 'Incident Response Readiness', icon: <WarningOutlined />, items: 12, severity: 'High', color: '#ec4899' },
];

export default function ItsmAuditPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const sRes = await gql<{ formSubmissions: any[] }>(`
                query($t:String!){ formSubmissions(tenantId:$t){
                    id status totalScore maxPossibleScore percentage grade
                    submittedBy submittedAt reviewedAt templateName templateCategory
                } }
            `, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] }));
            const auditSubs = (sRes.formSubmissions || []).filter((s: any) =>
                s.templateCategory === 'audit' || s.templateCategory === 'assessment' ||
                s.templateCategory === 'checklist' || s.percentage > 0
            );
            setSubmissions(auditSubs);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    const scoredSubs = submissions.filter(s => s.percentage > 0);
    const avgCompliance = scoredSubs.length > 0 ? scoredSubs.reduce((a: number, s: any) => a + s.percentage, 0) / scoredSubs.length : 0;
    const highRisk = scoredSubs.filter(s => s.percentage < 60).length;
    const medRisk = scoredSubs.filter(s => s.percentage >= 60 && s.percentage < 80).length;
    const lowRisk = scoredSubs.filter(s => s.percentage >= 80).length;

    // Risk distribution for pie
    const riskData = [
        { name: 'Low Risk', value: lowRisk, color: '#10b981' },
        { name: 'Medium Risk', value: medRisk, color: '#f59e0b' },
        { name: 'High Risk', value: highRisk, color: '#ef4444' },
    ].filter(r => r.value > 0);

    const columns: ColumnsType<any> = [
        { title: 'Assessment', dataIndex: 'templateName', render: (v: string) => (
            <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 12 }}>{v || 'Security Audit'}</Text>
                <Tag style={{ fontSize: 9 }}>audit</Tag>
            </Space>
        )},
        { title: 'Compliance', key: 'score', width: 130, sorter: (a: any, b: any) => a.percentage - b.percentage, render: (_: any, rec: any) => (
            <Space>
                <Progress type="circle" size={36} percent={rec.percentage}
                    strokeColor={riskColor(rec.percentage)}
                    format={() => <Text style={{ fontSize: 10 }}>{rec.percentage.toFixed(0)}</Text>} />
            </Space>
        )},
        { title: 'Risk Level', key: 'risk', width: 120, render: (_: any, rec: any) => {
            const color = riskColor(rec.percentage);
            return <Tag color={color} style={{ borderRadius: 10 }}>{riskLabel(rec.percentage)}</Tag>;
        }},
        { title: 'Grade', dataIndex: 'grade', width: 100, render: (v: string) => v ? <Tag color={v === 'Excellent' ? 'green' : v === 'Good' ? 'blue' : v === 'Satisfactory' ? 'orange' : 'red'}>{v}</Tag> : '—' },
        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'approved' ? 'green' : v === 'submitted' ? 'blue' : 'default'}>{v}</Tag> },
        { title: 'Audited', dataIndex: 'submittedAt', width: 110, render: (v: string) => v ? <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text> : '—' },
        { title: '', key: 'action', width: 50, render: (_: any, rec: any) => (
            <Tooltip title="View Detail"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => router.push(`/admin/forms/response?id=${rec.id}`)} /></Tooltip>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b']}>IT Security Audits</AuroraText>}
            subTitle={<DecryptedText text="Security assessments, compliance audits & vulnerability checks" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => router.push('/admin/forms/builder')}
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none' }}>New Audit</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
            ]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Audit Templates', value: AUDIT_TEMPLATES.length, color: '#ef4444', icon: <AuditOutlined /> },
                            { label: 'Assessments', value: submissions.length, color: '#3b82f6', icon: <FileTextOutlined /> },
                            { label: 'Compliance Avg', value: `${avgCompliance.toFixed(1)}%`, color: riskColor(avgCompliance), icon: <SafetyOutlined /> },
                            { label: 'High Risk', value: highRisk, color: '#ef4444', icon: <ExclamationCircleOutlined /> },
                            { label: 'Medium Risk', value: medRisk, color: '#f59e0b', icon: <WarningOutlined /> },
                            { label: 'Low Risk', value: lowRisk, color: '#10b981', icon: <CheckCircleOutlined /> },
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

                    {/* Audit Templates */}
                    <Card size="small" title={<Space><AuditOutlined style={{ color: '#ef4444' }} /> Audit Templates</Space>}
                        style={{ ...glass, marginBottom: 16 }} extra={<Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => router.push('/admin/forms/templates')}>All Forms</Button>}>
                        <Row gutter={[12, 12]}>
                            {AUDIT_TEMPLATES.map((tpl, i) => (
                                <Col xs={24} sm={12} md={8} key={tpl.id}>
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                                        <Card size="small" hoverable style={{ borderRadius: 12, borderLeft: `3px solid ${tpl.color}`, cursor: 'pointer' }}
                                            onClick={() => router.push('/admin/forms/builder')}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Space>
                                                    <span style={{ fontSize: 18, color: tpl.color }}>{tpl.icon}</span>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>{tpl.name}</Text>
                                                        <div>
                                                            <Tag style={{ fontSize: 9 }}>{tpl.items} items</Tag>
                                                            <Tag color={tpl.severity === 'Critical' ? 'red' : tpl.severity === 'High' ? 'orange' : 'blue'} style={{ fontSize: 9 }}>{tpl.severity}</Tag>
                                                        </div>
                                                    </div>
                                                </Space>
                                            </div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    {/* Risk Overview + Audit Results */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                        <Col xs={24} md={8}>
                            <Card size="small" title={<Space><SafetyOutlined style={{ color: '#8b5cf6' }} /> Risk Overview</Space>} style={{ ...glass, height: '100%' }}>
                                {riskData.length > 0 ? (
                                    <>
                                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                            <Progress type="dashboard" percent={Math.round(avgCompliance)} size={120}
                                                strokeColor={riskColor(avgCompliance)}
                                                format={() => (
                                                    <div>
                                                        <div style={{ fontSize: 22, fontWeight: 700, color: riskColor(avgCompliance) }}>{avgCompliance.toFixed(1)}%</div>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>Compliance</Text>
                                                    </div>
                                                )} />
                                        </div>
                                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                            {riskData.map((r, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: `${r.color}08` }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
                                                    <Text style={{ flex: 1, fontSize: 12 }}>{r.name}</Text>
                                                    <Badge count={r.value} style={{ backgroundColor: r.color }} />
                                                </div>
                                            ))}
                                        </Space>
                                    </>
                                ) : <Empty description="No audit data" />}
                            </Card>
                        </Col>
                        <Col xs={24} md={16}>
                            <Card size="small" title={<Space><FileTextOutlined style={{ color: '#3b82f6' }} /> Audit Results <Badge count={scoredSubs.length} size="small" /></Space>}
                                style={{ ...glass, height: '100%' }}>
                                <Table<any>
                                    dataSource={scoredSubs.slice(0, 15)}
                                    columns={columns}
                                    rowKey="id"
                                    size="small"
                                    pagination={false}
                                    locale={{ emptyText: <Empty description="No audit results. Create an audit form to get started." /> }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </motion.div>
            )}
        </CMSLayout>
    );
}
