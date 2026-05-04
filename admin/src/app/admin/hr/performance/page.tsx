"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Typography, Rate, Progress, Row, Col, Statistic, Avatar, Space, Badge, Tooltip, Select } from "antd";
import { TrophyOutlined, StarFilled, TeamOutlined, RiseOutlined, UserOutlined, CheckCircleOutlined, EditOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const PR_Q = `query($t:String!){hrPerformanceReviews(tenantId:$t){id employeeId employeeName reviewPeriod reviewType overallRating strengths areasForImprovement comments status completedAt createdAt}}`;

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    draft: { color: '#6b7280', icon: <EditOutlined />, label: 'Draft' },
    in_progress: { color: '#3b82f6', icon: <RiseOutlined />, label: 'In Progress' },
    completed: { color: '#10b981', icon: <CheckCircleOutlined />, label: 'Completed' },
};
const ratingConfig: Record<number, { color: string; label: string; gradient: string }> = {
    1: { color: '#ef4444', label: 'Needs Improvement', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
    2: { color: '#f59e0b', label: 'Below Average', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    3: { color: '#eab308', label: 'Meets Expectations', gradient: 'linear-gradient(135deg, #eab308, #facc15)' },
    4: { color: '#3b82f6', label: 'Exceeds Expectations', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
    5: { color: '#10b981', label: 'Outstanding', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
};

// SVG Rating Distribution Bar
function RatingDistribution({ reviews }: { reviews: any[] }) {
    const completed = reviews.filter(r => r.overallRating);
    const counts = [1, 2, 3, 4, 5].map(n => ({ rating: n, count: completed.filter(r => r.overallRating === n).length }));
    const max = Math.max(...counts.map(c => c.count), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {counts.map((c, i) => (
                <motion.div key={c.rating} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 80 }}>
                        {Array.from({ length: c.rating }, (_, j) => <StarFilled key={j} style={{ color: ratingConfig[c.rating]?.color, fontSize: 11 }} />)}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: 20, borderRadius: 10, background: 'rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(c.count / max) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                            style={{ height: '100%', borderRadius: 10, background: ratingConfig[c.rating]?.gradient, display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: c.count > 0 ? 24 : 0 }}>
                            {c.count > 0 && <Text style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{c.count}</Text>}
                        </motion.div>
                    </div>
                    <Text style={{ fontSize: 11, color: ratingConfig[c.rating]?.color, minWidth: 90 }}>{ratingConfig[c.rating]?.label}</Text>
                </motion.div>
            ))}
        </div>
    );
}

// Performance Radar (pentagon shape)
function PerformanceRadar({ reviews }: { reviews: any[] }) {
    const completed = reviews.filter(r => r.overallRating && r.status === 'completed');
    if (completed.length === 0) return <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 20 }}>No completed reviews</Text>;

    const topPerformers = completed.sort((a, b) => b.overallRating - a.overallRating).slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPerformers.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: i === 0 ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.02)', borderLeft: `3px solid ${ratingConfig[r.overallRating]?.color}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? '#10b981' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 12 }}>{r.employeeName}</Text>
                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>{r.reviewPeriod}</Text>
                    </div>
                    <Rate disabled value={r.overallRating} style={{ fontSize: 12 }} />
                </motion.div>
            ))}
        </div>
    );
}

export default function PerformancePage() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const { themeColor } = usePreferencesStore();

    useEffect(() => { gql(PR_Q, { t: DEFAULT_TENANT_ID }).then(d => setReviews(d.hrPerformanceReviews || [])).catch(console.error).finally(() => setLoading(false)); }, []);

    const filtered = statusFilter ? reviews.filter(r => r.status === statusFilter) : reviews;
    const completed = reviews.filter(r => r.status === 'completed');
    const inProgress = reviews.filter(r => r.status === 'in_progress');
    const avgRating = completed.length > 0 ? (completed.reduce((s, r) => s + (r.overallRating || 0), 0) / completed.length) : 0;
    const highPerformers = completed.filter(r => r.overallRating >= 4).length;

    const columns = [
        { title: 'Employee', dataIndex: 'employeeName', key: 'emp', render: (v: string, r: any) => <Space><Avatar size="small" style={{ backgroundColor: ratingConfig[r.overallRating]?.color || themeColor, fontSize: 10 }}>{v?.split(' ').map((n: string) => n[0]).join('')}</Avatar><Text strong style={{ fontSize: 13 }}>{v}</Text></Space> },
        { title: 'Period', dataIndex: 'reviewPeriod', key: 'period', render: (v: string) => <Tag style={{ borderRadius: 10 }}>{v}</Tag> },
        { title: 'Type', dataIndex: 'reviewType', key: 'type', render: (v: string) => <Tag color="blue" style={{ borderRadius: 10 }}>{v}</Tag> },
        { title: 'Rating', dataIndex: 'overallRating', key: 'rating', sorter: (a: any, b: any) => (a.overallRating || 0) - (b.overallRating || 0),
            render: (v: number) => v ? (
                <Space>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: ratingConfig[v]?.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>{v}</div>
                    <Rate disabled value={v} style={{ fontSize: 13 }} />
                </Space>
            ) : '—'
        },
        { title: 'Strengths', dataIndex: 'strengths', key: 'str', ellipsis: true, render: (v: string) => v ? <Tooltip title={v}><Text style={{ fontSize: 12 }}>{v}</Text></Tooltip> : '—' },
        { title: 'Areas for Growth', dataIndex: 'areasForImprovement', key: 'imp', ellipsis: true, render: (v: string) => v ? <Tooltip title={v}><Text style={{ fontSize: 12 }}>{v}</Text></Tooltip> : '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag icon={statusConfig[v]?.icon} color={statusConfig[v]?.color} style={{ borderRadius: 20 }}>{statusConfig[v]?.label || v}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Performance</AuroraText>}
            subTitle={<DecryptedText text="Performance reviews, goal tracking & feedback" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Total Reviews" value={reviews.length} prefix={<TrophyOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Completed" value={completed.length} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}>
                        <Statistic title="Avg Rating" value={avgRating.toFixed(1)} prefix={<StarFilled style={{ color: '#f59e0b' }} />} valueStyle={{ color: '#f59e0b' }} />
                        <Rate disabled value={avgRating} allowHalf style={{ fontSize: 12, marginTop: 4 }} />
                    </Card></Col>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="High Performers (≥4)" value={highPerformers} prefix={<RiseOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                </Row>

                {/* Charts Row */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={14}>
                        <Card title={<><TrophyOutlined /> Rating Distribution</>} size="small" style={{ ...glass, height: '100%' }}>
                            <RatingDistribution reviews={reviews} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card title={<><StarFilled style={{ color: '#f59e0b' }} /> Top Performers</>} size="small" style={{ ...glass, height: '100%' }}>
                            <PerformanceRadar reviews={reviews} />
                        </Card>
                    </Col>
                </Row>

                {/* Reviews Table */}
                <Card style={glass}
                    title={<Space><TrophyOutlined /> <Text strong>Performance Reviews</Text></Space>}
                    extra={<Select placeholder="Filter status" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}
                        options={Object.entries(statusConfig).map(([k, v]) => ({ label: <Space>{v.icon} {v.label}</Space>, value: k }))} />}>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
