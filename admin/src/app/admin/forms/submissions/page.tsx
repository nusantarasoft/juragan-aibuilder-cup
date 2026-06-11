"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Card, Space, Tag, Input, Select, message, Tooltip, Typography, Row, Col, Statistic, Drawer, Progress, Descriptions, Timeline, Badge, Popconfirm, theme } from "antd";
import { SearchOutlined, ReloadOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ClockCircleOutlined, FileTextOutlined, TrophyOutlined, InboxOutlined, ExpandOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: 12 };

interface Submission {
    id: string; tenantId: string; templateId: string; submittedBy?: string;
    status: string; totalScore: number; maxPossibleScore: number;
    percentage: number; grade?: string; reviewerId?: string;
    reviewerNotes?: string; reviewedAt?: string; submittedAt?: string;
    templateName?: string; templateCategory?: string;
    fieldValues?: any[]; createdAt: string; updatedAt: string;
}

const STATUS_MAP: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: 'default', icon: <ClockCircleOutlined /> },
    submitted: { color: 'processing', icon: <InboxOutlined /> },
    reviewed: { color: 'warning', icon: <EyeOutlined /> },
    approved: { color: 'success', icon: <CheckCircleOutlined /> },
    rejected: { color: 'error', icon: <CloseCircleOutlined /> },
};

function gradeColor(grade?: string) {
    if (!grade) return '#595959';
    if (grade === 'Excellent') return '#52c41a';
    if (grade === 'Good') return '#1890ff';
    if (grade === 'Satisfactory') return '#faad14';
    return '#ff4d4f';
}

export default function FormSubmissionsPage() {
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [data, setData] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<Submission | null>(null);
    const [scores, setScores] = useState<any[]>([]);
    const [messageApi, ctx] = message.useMessage();
    const router = useRouter();

    const stats = {
        total: data.length,
        submitted: data.filter(d => d.status === 'submitted').length,
        approved: data.filter(d => d.status === 'approved').length,
        avgScore: data.filter(d => d.percentage > 0).length > 0
            ? (data.reduce((a, d) => a + d.percentage, 0) / data.filter(d => d.percentage > 0).length).toFixed(1) : '0',
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await gql<{ formSubmissions: Submission[] }>(`
                query($tid: String!, $st: String) {
                    formSubmissions(tenantId: $tid, status: $st) {
                        id tenantId templateId submittedBy status totalScore maxPossibleScore
                        percentage grade reviewerId reviewerNotes reviewedAt submittedAt
                        templateName templateCategory createdAt updatedAt
                    }
                }
            `, { tid: DEFAULT_TENANT_ID, st: statusFilter || null });
            setData(res.formSubmissions || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [statusFilter, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const openDetail = async (rec: Submission) => {
        setDetail(rec);
        setDetailOpen(true);
        try {
            const [subRes, scoreRes] = await Promise.all([
                gql<{ formSubmission: Submission }>(`
                    query($id: String!) { formSubmission(id: $id) {
                        id status totalScore maxPossibleScore percentage grade reviewerNotes
                        submittedAt reviewedAt templateName templateCategory
                        fieldValues { id fieldId value numericValue jsonValue score maxScore fieldLabel fieldType fieldKpiConfig fieldOptions createdAt }
                    } }
                `, { id: rec.id }),
                gql<{ formScores: any[] }>(`
                    query($sid: String!) { formScores(submissionId: $sid) { id dimension score maxScore weight weightedScore } }
                `, { sid: rec.id }),
            ]);
            setDetail(subRes.formSubmission);
            setScores(scoreRes.formScores || []);
        } catch { /* keep what we have */ }
    };

    const handleReview = async (id: string, status: string) => {
        try {
            await gql(`mutation($id: String!, $input: ReviewSubmissionInput!) { reviewSubmission(id: $id, input: $input) { id } }`,
                { id, input: { status, reviewerId: '00000000-0000-0000-0000-000000000001' } });
            messageApi.success(`Submission ${status}`);
            setDetailOpen(false); loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    const handleCalcScore = async (id: string) => {
        try {
            await gql(`mutation($sid: String!) { calculateFormScore(submissionId: $sid) { id totalScore percentage grade } }`, { sid: id });
            messageApi.success('Score calculated');
            openDetail(detail!);
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteSubmission(id: $id) }`, { id });
            messageApi.success('Submission deleted');
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    const columns: ColumnsType<Submission> = [
        { title: 'Form', dataIndex: 'templateName', key: 'templateName', render: (n: string, rec) => (
            <Space direction="vertical" size={0}>
                <Text strong style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => openDetail(rec)}>{n || 'Unknown'}</Text>
                {rec.templateCategory && <Tag style={{ fontSize: 10 }}>{rec.templateCategory}</Tag>}
            </Space>
        )},
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (s: string) => {
            const sm = STATUS_MAP[s];
            return <Badge status={s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'processing'} text={<Tag color={sm?.color} icon={sm?.icon}>{s}</Tag>} />;
        }},
        { title: 'Score', key: 'score', width: 160, render: (_: any, rec) => rec.percentage > 0 ? (
            <Space><Progress type="circle" size={36} percent={rec.percentage} strokeColor={gradeColor(rec.grade)} format={() => rec.totalScore.toFixed(1)} />{rec.grade && <Tag color={gradeColor(rec.grade)}>{rec.grade}</Tag>}</Space>
        ) : <Text type="secondary">—</Text> },
        { title: 'Submitted', dataIndex: 'submittedAt', key: 'submittedAt', width: 140, render: (d: string) => d ? <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}><Text type="secondary">{dayjs(d).fromNow()}</Text></Tooltip> : '—' },
        { title: '', key: 'actions', width: 100, align: 'right' as const, render: (_: any, rec) => (
            <Space size={4}>
                <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(rec)} /></Tooltip>
                <Tooltip title="Full Review"><Button type="text" size="small" icon={<ExpandOutlined />} onClick={() => router.push(`/admin/forms/response?id=${rec.id}`)} /></Tooltip>
                <Popconfirm title="Delete?" onConfirm={() => handleDelete(rec.id)}><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Popconfirm>
            </Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText>Submissions</AuroraText>}
            subTitle={<DecryptedText text="Review form responses and manage scoring" speed={40} revealDirection="start" />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    {[
                        { title: 'Total', value: stats.total, color: '#1890ff', icon: <FileTextOutlined /> },
                        { title: 'Pending Review', value: stats.submitted, color: '#fa8c16', icon: <ClockCircleOutlined /> },
                        { title: 'Approved', value: stats.approved, color: '#52c41a', icon: <CheckCircleOutlined /> },
                        { title: 'Avg Score', value: stats.avgScore + '%', color: '#722ed1', icon: <TrophyOutlined /> },
                    ].map((s, i) => (
                        <Col xs={12} md={6} key={i}>
                            <Card style={{ ...glass, borderLeft: `3px solid ${s.color}` }} bodyStyle={{ padding: '16px 20px' }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 24 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                    <Row gutter={12} align="middle">
                        <Col flex="auto"><Input prefix={<SearchOutlined />} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 300 }} /></Col>
                        <Col><Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}
                            options={Object.entries(STATUS_MAP).map(([v]) => ({ value: v, label: v }))} /></Col>
                    </Row>
                </Card>
                <Card style={glass}>
                    <Table<Submission> dataSource={data.filter(d => !search || d.templateName?.toLowerCase().includes(search.toLowerCase()))} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                </Card>

                <Drawer title={detail?.templateName || 'Submission'} open={detailOpen} onClose={() => { setDetailOpen(false); setDetail(null); setScores([]); }} width={640}
                    extra={detail?.status === 'submitted' ? (
                        <Space>
                            <Button icon={<TrophyOutlined />} onClick={() => handleCalcScore(detail!.id)}>Calculate Score</Button>
                            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleReview(detail!.id, 'approved')} style={{ background: '#52c41a' }}>Approve</Button>
                            <Button danger icon={<CloseCircleOutlined />} onClick={() => handleReview(detail!.id, 'rejected')}>Reject</Button>
                        </Space>
                    ) : null}
                >
                    {detail && (
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <Descriptions column={2} size="small" bordered>
                                <Descriptions.Item label="Status"><Tag color={STATUS_MAP[detail.status]?.color}>{detail.status}</Tag></Descriptions.Item>
                                <Descriptions.Item label="Score">{detail.totalScore > 0 ? `${detail.totalScore.toFixed(2)} / ${detail.maxPossibleScore}` : '—'}</Descriptions.Item>
                                <Descriptions.Item label="Percentage">{detail.percentage > 0 ? <Progress percent={detail.percentage} size="small" strokeColor={gradeColor(detail.grade)} /> : '—'}</Descriptions.Item>
                                <Descriptions.Item label="Grade">{detail.grade ? <Tag color={gradeColor(detail.grade)}>{detail.grade}</Tag> : '—'}</Descriptions.Item>
                                <Descriptions.Item label="Submitted">{detail.submittedAt ? dayjs(detail.submittedAt).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
                                <Descriptions.Item label="Reviewed">{detail.reviewedAt ? dayjs(detail.reviewedAt).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
                            </Descriptions>
                            {scores.length > 0 && (
                                <Card size="small" title="Dimension Scores" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa' }}>
                                    {scores.map((s: any) => (
                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
                                            <Text style={{ width: 120 }}>{s.dimension}</Text>
                                            <Progress percent={Math.round((s.score / s.maxScore) * 100)} size="small" style={{ flex: 1 }} />
                                            <Text type="secondary">{s.score.toFixed(1)}/{s.maxScore}</Text>
                                            <Tag>{(s.weight * 100).toFixed(0)}%</Tag>
                                        </div>
                                    ))}
                                </Card>
                            )}
                            {(detail.fieldValues?.length ?? 0) > 0 && (
                                <Card size="small" title="Answers" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa' }}>
                                    {detail.fieldValues!.map((fv: any) => (
                                        <div key={fv.id} style={{ padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
                                            <Text strong>{fv.fieldLabel}</Text> <Tag style={{ fontSize: 10 }}>{fv.fieldType}</Tag>
                                            <div style={{ marginTop: 4 }}>
                                                <Text>{fv.value || (fv.numericValue != null ? fv.numericValue : JSON.stringify(fv.jsonValue))}</Text>
                                                {fv.score > 0 && <Text type="secondary" style={{ marginLeft: 8 }}>Score: {fv.score}/{fv.maxScore}</Text>}
                                            </div>
                                        </div>
                                    ))}
                                </Card>
                            )}
                            {detail.reviewerNotes && <Card size="small" title="Reviewer Notes"><Text>{detail.reviewerNotes}</Text></Card>}
                        </Space>
                    )}
                </Drawer>
            </motion.div>
        </CMSLayout>
    );
}
