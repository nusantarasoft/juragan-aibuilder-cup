"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Table, Progress, message, Select, Badge, Tooltip, Empty, Spin, Rate, Tabs, Avatar } from "antd";
import {
    TrophyOutlined, StarOutlined, StarFilled, TeamOutlined, BarChartOutlined,
    FormOutlined, CheckCircleOutlined, ClockCircleOutlined, ArrowRightOutlined,
    PlusOutlined, ReloadOutlined, UserOutlined, FileTextOutlined,
    ArrowUpOutlined, ArrowDownOutlined, RiseOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function gradeColor(g?: string) {
    return { 'Excellent': '#10b981', 'Good': '#3b82f6', 'Satisfactory': '#f59e0b', 'Needs Improvement': '#ef4444' }[g || ''] || '#6b7280';
}

export default function HrKpiPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedForm, setSelectedForm] = useState<string>('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes, eRes] = await Promise.all([
                gql<{ formTemplates: any[] }>(`query($t:String!){ formTemplates(tenantId:$t,category:"kpi"){ id name category status } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formTemplates: [] })),
                gql<{ formSubmissions: any[] }>(`query($t:String!){ formSubmissions(tenantId:$t){ id status totalScore maxPossibleScore percentage grade submittedBy submittedAt templateName templateCategory reviewedAt } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] })),
                gql<{ hrEmployees: any[] }>(`query($t:String!){ hrEmployees(tenantId:$t,status:"active"){ id firstName lastName employeeNumber departmentName positionName } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
            ]);
            setTemplates(tRes.formTemplates || []);
            setSubmissions(sRes.formSubmissions || []);
            setEmployees(eRes.hrEmployees || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    // Filter KPI-related submissions
    const kpiSubs = submissions.filter(s => {
        if (selectedForm) return s.templateName === templates.find((t: any) => t.id === selectedForm)?.name;
        return s.templateCategory === 'kpi' || s.percentage > 0;
    });
    const scoredSubs = kpiSubs.filter(s => s.percentage > 0);

    // Stats
    const avgScore = scoredSubs.length > 0 ? scoredSubs.reduce((a, s) => a + s.percentage, 0) / scoredSubs.length : 0;
    const approved = kpiSubs.filter(s => s.status === 'approved').length;
    const pending = kpiSubs.filter(s => s.status === 'submitted').length;

    // Grade distribution for pie
    const gradeData = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'].map(g => ({
        name: g, value: scoredSubs.filter(s => s.grade === g).length, color: gradeColor(g),
    })).filter(g => g.value > 0);

    // Employee KPI summary
    const empMap: Record<string, { name: string; subs: any[]; avgScore: number; bestGrade: string }> = {};
    scoredSubs.forEach((s: any) => {
        const empId = s.submittedBy || 'unknown';
        if (!empMap[empId]) empMap[empId] = { name: empId.slice(0, 8), subs: [], avgScore: 0, bestGrade: '' };
        empMap[empId].subs.push(s);
    });
    const empScores = Object.entries(empMap).map(([id, data]) => {
        const avg = data.subs.reduce((a: number, s: any) => a + s.percentage, 0) / data.subs.length;
        const best = data.subs.sort((a: any, b: any) => b.percentage - a.percentage)[0]?.grade || '';
        // Try to match to employee
        const emp = employees.find(e => e.id === id);
        return {
            id, name: emp ? `${emp.firstName} ${emp.lastName}` : data.name,
            dept: emp?.departmentName || '—',
            avgScore: Math.round(avg * 10) / 10, bestGrade: best,
            evaluations: data.subs.length,
        };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // Bar chart data by form
    const formScoreMap = new Map<string, { scores: number[] }>();
    scoredSubs.forEach(s => {
        const name = s.templateName || 'Unknown';
        const existing = formScoreMap.get(name) || { scores: [] };
        existing.scores.push(s.percentage);
        formScoreMap.set(name, existing);
    });
    const formBarData = Array.from(formScoreMap.entries()).map(([name, data]) => ({
        name: name.length > 18 ? name.slice(0, 18) + '…' : name,
        avgScore: Math.round(data.scores.reduce((a, s) => a + s, 0) / data.scores.length),
        count: data.scores.length,
    }));

    const empColumns: ColumnsType<any> = [
        { title: '#', key: 'rank', width: 50, render: (_: any, __: any, i: number) => (
            <Avatar size="small" style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#c4842d' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280', fontSize: 11 }}>
                {i + 1}
            </Avatar>
        )},
        { title: 'Employee', dataIndex: 'name', render: (v: string, rec: any) => (
            <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 13 }}>{v}</Text>
                <Text type="secondary" style={{ fontSize: 10 }}>{rec.dept}</Text>
            </Space>
        )},
        { title: 'KPI Score', dataIndex: 'avgScore', width: 140, sorter: (a: any, b: any) => a.avgScore - b.avgScore, render: (v: number) => (
            <Space>
                <Progress type="circle" size={36} percent={v} strokeColor={v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444'}
                    format={() => <Text style={{ fontSize: 10 }}>{v}%</Text>} />
            </Space>
        )},
        { title: 'Grade', dataIndex: 'bestGrade', render: (v: string) => v ? <Tag color={gradeColor(v)} style={{ borderRadius: 10 }}>{v}</Tag> : '—' },
        { title: 'Evaluations', dataIndex: 'evaluations', width: 100, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#8b5cf6' }} /> },
        { title: 'Trend', key: 'trend', width: 70, render: (_: any, rec: any) => {
            if (rec.avgScore >= 80) return <ArrowUpOutlined style={{ color: '#10b981', fontSize: 16 }} />;
            if (rec.avgScore >= 60) return <RiseOutlined style={{ color: '#f59e0b', fontSize: 16 }} />;
            return <ArrowDownOutlined style={{ color: '#ef4444', fontSize: 16 }} />;
        }},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6']}>KPI Evaluations</AuroraText>}
            subTitle={<DecryptedText text="Employee KPI performance from form evaluations" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => router.push('/admin/forms/templates')}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none' }}>Create KPI Form</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={load} />,
            ]}
        >
            {ctx}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats Row */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'KPI Forms', value: templates.length, color: '#8b5cf6', icon: <FormOutlined /> },
                            { label: 'Evaluations', value: kpiSubs.length, color: '#3b82f6', icon: <FileTextOutlined /> },
                            { label: 'Avg Score', value: `${avgScore.toFixed(1)}%`, color: avgScore >= 70 ? '#10b981' : '#f59e0b', icon: <TrophyOutlined /> },
                            { label: 'Approved', value: approved, color: '#10b981', icon: <CheckCircleOutlined /> },
                            { label: 'Pending', value: pending, color: '#f59e0b', icon: <ClockCircleOutlined /> },
                            { label: 'Employees', value: empScores.length, color: '#ec4899', icon: <TeamOutlined /> },
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

                    {/* Filter */}
                    <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '10px 16px' }}>
                        <Space>
                            <Text strong style={{ fontSize: 12 }}>KPI Form:</Text>
                            <Select placeholder="All KPI forms" allowClear style={{ width: 300 }}
                                value={selectedForm || undefined} onChange={v => setSelectedForm(v || '')}
                                options={templates.map(t => ({ value: t.id, label: t.name }))} />
                            <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => router.push('/admin/forms/kpi')}>
                                Open KPI Dashboard
                            </Button>
                        </Space>
                    </Card>

                    {scoredSubs.length === 0 ? (
                        <Card style={glass}><Empty description="No KPI evaluations scored yet. Create a KPI form and submit evaluations." /></Card>
                    ) : (
                        <>
                            {/* Charts */}
                            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                                <Col xs={24} md={12}>
                                    <Card size="small" title={<Space><BarChartOutlined style={{ color: '#3b82f6' }} /> Score by Form</Space>} style={glass}>
                                        <div style={{ height: 260 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={formBarData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                                    <RTooltip />
                                                    <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} name="Avg Score %">
                                                        {formBarData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small" title={<Space><StarOutlined style={{ color: '#f59e0b' }} /> Grade Distribution</Space>} style={glass}>
                                        <div style={{ height: 260 }}>
                                            {gradeData.length > 0 ? (
                                                <ResponsiveContainer>
                                                    <PieChart>
                                                        <Pie data={gradeData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                                                            paddingAngle={3} dataKey="value"
                                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                            labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                                            {gradeData.map((g, i) => <Cell key={i} fill={g.color} />)}
                                                        </Pie>
                                                        <RTooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : <Empty description="No graded evaluations" />}
                                        </div>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Employee Rankings Table */}
                            <Card size="small"
                                title={<Space><TrophyOutlined style={{ color: '#f59e0b' }} /> Employee KPI Rankings</Space>}
                                extra={<Tag>{empScores.length} employees</Tag>} style={glass}>
                                <Table<any>
                                    dataSource={empScores}
                                    columns={empColumns}
                                    rowKey="id"
                                    pagination={{ pageSize: 15 }}
                                    size="middle"
                                />
                            </Card>
                        </>
                    )}
                </motion.div>
            )}
        </CMSLayout>
    );
}
