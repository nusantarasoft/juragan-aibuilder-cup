"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Card, Table, Tag, Typography, Rate, Row, Col, Statistic, Avatar, Space, Badge, Tooltip, Select, Button, Modal, Form, Input, message } from "antd";
import { TrophyOutlined, StarFilled, TeamOutlined, RiseOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined, DeleteOutlined, FileExcelOutlined, FilePdfOutlined  } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const PR_Q = `query($t:String!){hrPerformanceReviews(tenantId:$t){id employeeId employeeName reviewPeriod reviewType overallRating strengths areasForImprovement comments status completedAt createdAt}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber departmentName}}`;
const CREATE_M = `mutation($t:String!,$e:String!,$p:String!,$rt:String,$r:Int,$s:String,$a:String,$c:String){createHrPerformanceReview(tenantId:$t,employeeId:$e,reviewPeriod:$p,reviewType:$rt,overallRating:$r,strengths:$s,areasForImprovement:$a,comments:$c){id}}`;
const UPDATE_M = `mutation($id:String!,$r:Int,$s:String,$a:String,$c:String,$st:String){updateHrPerformanceReview(id:$id,overallRating:$r,strengths:$s,areasForImprovement:$a,comments:$c,status:$st){id}}`;
const DELETE_M = `mutation($id:String!){deleteHrPerformanceReview(id:$id)}`;

const statusCfg: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    draft: { color: '#6b7280', icon: <EditOutlined />, label: 'Draft' },
    in_progress: { color: '#3b82f6', icon: <RiseOutlined />, label: 'In Progress' },
    completed: { color: '#10b981', icon: <CheckCircleOutlined />, label: 'Completed' },
};
const ratingCfg: Record<number, { color: string; label: string; gradient: string }> = {
    1: { color: '#ef4444', label: 'Needs Improvement', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
    2: { color: '#f59e0b', label: 'Below Average', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    3: { color: '#eab308', label: 'Meets Expectations', gradient: 'linear-gradient(135deg, #eab308, #facc15)' },
    4: { color: '#3b82f6', label: 'Exceeds Expectations', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
    5: { color: '#10b981', label: 'Outstanding', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
};

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
                        {Array.from({ length: c.rating }, (_, j) => <StarFilled key={j} style={{ color: ratingCfg[c.rating]?.color, fontSize: 11 }} />)}
                    </div>
                    <div style={{ flex: 1, height: 20, borderRadius: 10, background: 'rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(c.count / max) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                            style={{ height: '100%', borderRadius: 10, background: ratingCfg[c.rating]?.gradient, display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: c.count > 0 ? 24 : 0 }}>
                            {c.count > 0 && <Text style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{c.count}</Text>}
                        </motion.div>
                    </div>
                    <Text style={{ fontSize: 11, color: ratingCfg[c.rating]?.color, minWidth: 90 }}>{ratingCfg[c.rating]?.label}</Text>
                </motion.div>
            ))}
        </div>
    );
}

function TopPerformers({ reviews }: { reviews: any[] }) {
    const top = reviews.filter(r => r.overallRating && r.status === 'completed').sort((a, b) => b.overallRating - a.overallRating).slice(0, 5);
    if (!top.length) return <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 20 }}>No completed reviews</Text>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {top.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: i === 0 ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.02)', borderLeft: `3px solid ${ratingCfg[r.overallRating]?.color}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? '#10b981' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}><Text strong style={{ fontSize: 12 }}>{r.employeeName}</Text><Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>{r.reviewPeriod}</Text></div>
                    <Rate disabled value={r.overallRating} style={{ fontSize: 12 }} />
                </motion.div>
            ))}
        </div>
    );
}

export default function PerformancePage() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [rating, setRating] = useState(0);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

    const load = async () => {
        setLoading(true);
        const [r, e] = await Promise.all([
            gql(PR_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrPerformanceReviews: [] })),
            gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
        ]);
        setReviews(r.hrPerformanceReviews || []);
        setEmployees(e.hrEmployees || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async (values: any) => {
        try {
            await gql(CREATE_M, { t: DEFAULT_TENANT_ID, e: values.employeeId, p: values.reviewPeriod, rt: values.reviewType, r: rating || undefined, s: values.strengths, a: values.areasForImprovement, c: values.comments });
            message.success('Performance review created'); setModalOpen(false); form.resetFields(); setRating(0); load();
        } catch (e: any) { message.error(e.message || 'Failed'); }
    };

    const handleComplete = async (id: string) => {
        try { await gql(UPDATE_M, { id, st: 'completed' }); message.success('Review completed'); load(); } catch { message.error('Failed'); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_M, { id }); message.success('Deleted'); load(); } catch { message.error('Failed'); }
    };

    const filtered = statusFilter ? reviews.filter(r => r.status === statusFilter) : reviews;
    const completed = reviews.filter(r => r.status === 'completed');
    const inProgress = reviews.filter(r => r.status === 'in_progress');
    const avgRating = completed.length > 0 ? (completed.reduce((s, r) => s + (r.overallRating || 0), 0) / completed.length) : 0;
    const highPerformers = completed.filter(r => r.overallRating >= 4).length;

    const columns = [
        { title: 'Employee', dataIndex: 'employeeName', render: (v: string, r: any) => <Space><Avatar size="small" style={{ backgroundColor: ratingCfg[r.overallRating]?.color || themeColor, fontSize: 10 }}>{v?.split(' ').map((n: string) => n[0]).join('')}</Avatar><Text strong style={{ fontSize: 13 }}>{v}</Text></Space> },
        { title: 'Period', dataIndex: 'reviewPeriod', render: (v: string) => <Tag style={{ borderRadius: 10 }}>{v}</Tag> },
        { title: 'Type', dataIndex: 'reviewType', render: (v: string) => <Tag color="blue" style={{ borderRadius: 10 }}>{v}</Tag> },
        { title: 'Rating', dataIndex: 'overallRating', sorter: (a: any, b: any) => (a.overallRating || 0) - (b.overallRating || 0),
            render: (v: number) => v ? <Space><div style={{ width: 26, height: 26, borderRadius: 8, background: ratingCfg[v]?.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>{v}</div><Rate disabled value={v} style={{ fontSize: 13 }} /></Space> : '—' },
        { title: 'Strengths', dataIndex: 'strengths', ellipsis: true, render: (v: string) => v ? <Tooltip title={v}><Text style={{ fontSize: 12 }}>{v}</Text></Tooltip> : '—' },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag icon={statusCfg[v]?.icon} color={statusCfg[v]?.color} style={{ borderRadius: 20 }}>{statusCfg[v]?.label || v}</Tag> },
        { title: '', key: 'actions', width: 160,
            render: (_: any, r: any) => (
                <Space size={4}>
                    {(r.status === 'draft' || r.status === 'in_progress') && <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: '#10b981', borderRadius: 6 }} onClick={() => handleComplete(r.id)}>Complete</Button>}
                    {r.status === 'draft' && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete review?', onOk: () => handleDelete(r.id) })} />}
                </Space>
            ) },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Performance</AuroraText>}
            subTitle={<DecryptedText text="Performance reviews, goal tracking & feedback" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'hr_performance', title: 'HR Performance Reviews', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Employee', key: 'employeeName' }, { header: 'Period', key: 'period' }, { header: 'Rating', key: 'overallRating' }, { header: 'Status', key: 'status' }], data: reviews })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'hr_performance', title: 'HR Performance Reviews', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Employee', key: 'employeeName' }, { header: 'Period', key: 'period' }, { header: 'Rating', key: 'overallRating' }, { header: 'Status', key: 'status' }], data: reviews })} /></Tooltip></RbacGuard>,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8 }}>New Review</Button>,
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[
                        { title: 'Total Reviews', value: reviews.length, icon: <TrophyOutlined />, color: '#8b5cf6' },
                        { title: 'Completed', value: completed.length, icon: <CheckCircleOutlined />, color: '#10b981' },
                        { title: 'In Progress', value: inProgress.length, icon: <RiseOutlined />, color: '#3b82f6' },
                        { title: 'High Performers (≥4)', value: highPerformers, icon: <StarFilled />, color: '#f59e0b' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                                    {s.title === 'Total Reviews' && <Rate disabled value={avgRating} allowHalf style={{ fontSize: 12, marginTop: 4 }} />}
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} md={14}>
                        <Card title={<><TrophyOutlined /> Rating Distribution</>} size="small" style={{ ...glass, height: '100%' }}>
                            <RatingDistribution reviews={reviews} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card title={<><StarFilled style={{ color: '#f59e0b' }} /> Top Performers</>} size="small" style={{ ...glass, height: '100%' }}>
                            <TopPerformers reviews={reviews} />
                        </Card>
                    </Col>
                </Row>

                <Card style={glass}
                    title={<Space><TrophyOutlined /><Text strong>Performance Reviews</Text><Badge count={reviews.length} style={{ backgroundColor: themeColor }} /></Space>}
                    extra={<Select placeholder="Filter status" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}
                        options={Object.entries(statusCfg).map(([k, v]) => ({ label: <Space>{v.icon} {v.label}</Space>, value: k }))} />}>
                    <Table scroll={{ x: 900 }} dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                </Card>
            </motion.div>

            <Modal title="New Performance Review" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); setRating(0); }} onOk={() => form.submit()} okText="Create Review" width={560}>
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ paddingTop: 8 }}>
                    <Row gutter={12}>
                        <Col span={16}><Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="label" placeholder="Select employee"
                                options={employees.map(e => ({ label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`, value: e.id }))} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="reviewPeriod" label="Period" rules={[{ required: true }]} initialValue="2026-Q2">
                            <Input placeholder="e.g. 2026-Q2" />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="reviewType" label="Type" initialValue="annual">
                            <Select options={[{ value: 'annual', label: 'Annual' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'probation', label: 'Probation' }, { value: '360', label: '360° Review' }]} />
                        </Form.Item></Col>
                        <Col span={12}><Form.Item label="Overall Rating">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Rate value={rating} onChange={setRating} />
                                {rating > 0 && <Tag color={ratingCfg[rating]?.color} style={{ borderRadius: 10 }}>{ratingCfg[rating]?.label}</Tag>}
                            </div>
                        </Form.Item></Col>
                    </Row>
                    <Form.Item name="strengths" label="Strengths"><Input.TextArea rows={2} placeholder="Key strengths observed..." /></Form.Item>
                    <Form.Item name="areasForImprovement" label="Areas for Improvement"><Input.TextArea rows={2} placeholder="Areas to focus on..." /></Form.Item>
                    <Form.Item name="comments" label="Comments"><Input.TextArea rows={2} placeholder="Additional feedback..." /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}

