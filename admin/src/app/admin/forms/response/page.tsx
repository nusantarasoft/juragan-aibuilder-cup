"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Card, Button, Space, Tag, message, Typography, Row, Col, Statistic, Progress, Descriptions, Spin, Divider, Empty, Result, Input, Badge, Timeline, Rate, theme } from "antd";
import {
    ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, TrophyOutlined,
    ClockCircleOutlined, PrinterOutlined, StarOutlined, UserOutlined,
    FileTextOutlined, BarChartOutlined, FormOutlined, CalculatorOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useSearchParams, useRouter } from "next/navigation";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import dayjs from "dayjs";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

function gradeColor(grade?: string) {
    if (!grade) return '#595959';
    const map: Record<string, string> = { 'Excellent': '#10b981', 'Good': '#3b82f6', 'Satisfactory': '#f59e0b', 'Needs Improvement': '#ef4444' };
    return map[grade] || '#6b7280';
}

function scoreColor(pct: number) {
    if (pct >= 80) return '#10b981';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
}

function renderFieldValue(fv: any) {
    const val = fv.value;
    const numVal = fv.numericValue;
    const jsonVal = fv.jsonValue;

    switch (fv.fieldType) {
        case 'rating':
            return <Rate disabled value={numVal || parseFloat(val) || 0} count={fv.fieldKpiConfig?.max_score || 5} style={{ fontSize: 20 }} />;
        case 'slider':
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Progress percent={Math.round(((numVal || parseFloat(val) || 0) / (fv.fieldKpiConfig?.max_score || 100)) * 100)} size="small" style={{ flex: 1, maxWidth: 200 }} />
                    <Text strong>{numVal || val || 0}</Text>
                </div>
            );
        case 'checkbox':
        case 'multi_select':
            try {
                const arr = jsonVal || JSON.parse(val);
                if (Array.isArray(arr)) return <Space wrap>{arr.map((v: string, i: number) => <Tag key={i} color="blue">{v}</Tag>)}</Space>;
            } catch { /* fallthrough */ }
            return <Text>{val}</Text>;
        case 'radio':
        case 'select':
            return <Tag color="purple">{val}</Tag>;
        case 'date':
        case 'time':
            return <Tag icon={<ClockCircleOutlined />}>{val}</Tag>;
        case 'email':
            return <a href={`mailto:${val}`}>{val}</a>;
        case 'url':
            return <a href={val} target="_blank" rel="noopener noreferrer">{val}</a>;
        case 'file_upload':
            return <Tag icon={<FileTextOutlined />} color="cyan">{val}</Tag>;
        default:
            return <Text>{val || (numVal != null ? String(numVal) : '—')}</Text>;
    }
}

// ═══════════════════════════════════════════════════════
// MAIN CONTENT
// ═══════════════════════════════════════════════════════
function ResponseDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const submissionId = searchParams.get('id');
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [messageApi, contextHolder] = message.useMessage();

    const [detail, setDetail] = useState<any>(null);
    const [scores, setScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewNotes, setReviewNotes] = useState('');

    const loadData = useCallback(async () => {
        if (!submissionId) return;
        setLoading(true);
        try {
            const [subRes, scoreRes] = await Promise.all([
                gql<{ formSubmission: any }>(`
                    query($id: String!) { formSubmission(id: $id) {
                        id status totalScore maxPossibleScore percentage grade reviewerNotes
                        submittedAt reviewedAt templateName templateCategory submittedBy reviewerId
                        fieldValues { id fieldId value numericValue jsonValue score maxScore fieldLabel fieldType fieldKpiConfig fieldOptions createdAt }
                    } }
                `, { id: submissionId }),
                gql<{ formScores: any[] }>(`
                    query($sid: String!) { formScores(submissionId: $sid) { id dimension score maxScore weight weightedScore notes } }
                `, { sid: submissionId }),
            ]);
            setDetail(subRes.formSubmission);
            setScores(scoreRes.formScores || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [submissionId, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleReview = async (status: string) => {
        try {
            await gql(`mutation($id: String!, $input: ReviewSubmissionInput!) { reviewSubmission(id: $id, input: $input) { id } }`,
                { id: submissionId, input: { status, reviewerId: '00000000-0000-0000-0000-000000000001', notes: reviewNotes || null } });
            messageApi.success(`Submission ${status}`);
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    const handleCalcScore = async () => {
        try {
            await gql(`mutation($sid: String!) { calculateFormScore(submissionId: $sid) { id totalScore percentage grade } }`, { sid: submissionId });
            messageApi.success('Score calculated successfully');
            loadData();
        } catch (e: any) { messageApi.error(e.message); }
    };

    if (!submissionId) {
        return (
            <CMSLayout title="Response Detail">
                <div style={{ textAlign: 'center', padding: 80 }}>
                    <Empty description="No submission selected." />
                    <Button type="primary" onClick={() => router.push('/admin/forms/submissions')} style={{ marginTop: 16 }}>Go to Submissions</Button>
                </div>
            </CMSLayout>
        );
    }

    if (loading) return <CMSLayout title="Response Detail"><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></CMSLayout>;
    if (!detail) return <CMSLayout title="Response Detail"><Result status="404" title="Submission Not Found" extra={<Button onClick={() => router.push('/admin/forms/submissions')}>Back</Button>} /></CMSLayout>;

    const statusColors: Record<string, string> = { draft: '#6b7280', submitted: '#3b82f6', reviewed: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Response Detail</AuroraText>}
            subTitle={<DecryptedText text={detail.templateName || 'Form Response'} animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            {contextHolder}
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {/* Back + Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/forms/submissions')}>Back to Submissions</Button>
                    <Space>
                        {detail.status === 'submitted' && (
                            <>
                                <Button icon={<CalculatorOutlined />} onClick={handleCalcScore}>Calculate Score</Button>
                                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleReview('approved')} style={{ background: '#10b981', borderColor: '#10b981' }}>Approve</Button>
                                <Button danger icon={<CloseCircleOutlined />} onClick={() => handleReview('rejected')}>Reject</Button>
                            </>
                        )}
                    </Space>
                </div>

                {/* Header Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card style={{ ...glass, marginBottom: 16, borderTop: `4px solid ${statusColors[detail.status] || themeColor}` }}>
                        <Row gutter={24} align="middle">
                            <Col flex="auto">
                                <Title level={4} style={{ margin: 0 }}>{detail.templateName}</Title>
                                <Space style={{ marginTop: 4 }}>
                                    <Tag color={statusColors[detail.status]}>{detail.status.toUpperCase()}</Tag>
                                    {detail.templateCategory && <Tag>{detail.templateCategory}</Tag>}
                                    {detail.submittedBy && <Tag icon={<UserOutlined />}>{detail.submittedBy.slice(0, 8)}</Tag>}
                                </Space>
                                <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                                    {detail.submittedAt && <Text type="secondary">Submitted: {dayjs(detail.submittedAt).format('YYYY-MM-DD HH:mm')} · </Text>}
                                    {detail.reviewedAt && <Text type="secondary">Reviewed: {dayjs(detail.reviewedAt).format('YYYY-MM-DD HH:mm')}</Text>}
                                </div>
                            </Col>
                            {detail.percentage > 0 && (
                                <Col style={{ textAlign: 'center' }}>
                                    <Progress type="dashboard" percent={detail.percentage} size={100}
                                        strokeColor={scoreColor(detail.percentage)}
                                        format={() => (
                                            <div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(detail.percentage) }}>{detail.percentage.toFixed(1)}%</div>
                                                {detail.grade && <Tag color={gradeColor(detail.grade)} style={{ fontSize: 10 }}>{detail.grade}</Tag>}
                                            </div>
                                        )} />
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Score: {detail.totalScore.toFixed(2)} / {detail.maxPossibleScore}</Text>
                                    </div>
                                </Col>
                            )}
                        </Row>
                    </Card>
                </motion.div>

                {/* Dimension Scores */}
                {scores.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card size="small" title={<Space><BarChartOutlined style={{ color: '#8b5cf6' }} /> Dimension Scores</Space>}
                            style={{ ...glass, marginBottom: 16 }}>
                            <Row gutter={[16, 12]}>
                                {scores.map((s: any) => (
                                    <Col xs={24} sm={12} key={s.id}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                                            <Text style={{ width: 100, fontSize: 12, flexShrink: 0 }}>{s.dimension}</Text>
                                            <Progress percent={Math.round((s.score / s.maxScore) * 100)} size="small" style={{ flex: 1 }}
                                                strokeColor={scoreColor(Math.round((s.score / s.maxScore) * 100))} />
                                            <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{s.score.toFixed(1)}/{s.maxScore}</Text>
                                            <Tag style={{ fontSize: 10, flexShrink: 0 }}>{(s.weight * 100).toFixed(0)}%</Tag>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </motion.div>
                )}

                {/* Field Values */}
                {(detail.fieldValues?.length ?? 0) > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card size="small" title={<Space><FormOutlined style={{ color: '#3b82f6' }} /> Responses ({detail.fieldValues.length} fields)</Space>}
                            style={{ ...glass, marginBottom: 16 }}>
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                {detail.fieldValues.map((fv: any, idx: number) => (
                                    <motion.div key={fv.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}>
                                        <div style={{
                                            padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                                            display: 'flex', alignItems: 'flex-start', gap: 16,
                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ marginBottom: 4 }}>
                                                    <Text strong style={{ fontSize: 13 }}>{fv.fieldLabel}</Text>
                                                    <Tag style={{ fontSize: 9, marginLeft: 8 }}>{fv.fieldType}</Tag>
                                                </div>
                                                {renderFieldValue(fv)}
                                            </div>
                                            {fv.score > 0 && (
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <Progress type="circle" size={40}
                                                        percent={Math.round((fv.score / fv.maxScore) * 100)}
                                                        strokeColor={scoreColor(Math.round((fv.score / fv.maxScore) * 100))}
                                                        format={() => <Text style={{ fontSize: 10 }}>{fv.score.toFixed(1)}</Text>} />
                                                    <div style={{ fontSize: 9, color: '#9ca3af' }}>/ {fv.maxScore}</div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </Space>
                        </Card>
                    </motion.div>
                )}

                {/* Reviewer Notes */}
                {detail.status === 'submitted' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card size="small" title="Review Notes" style={{ ...glass, marginBottom: 16 }}>
                            <TextArea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                                placeholder="Optional notes for the reviewer..." style={{ borderRadius: 8 }} />
                        </Card>
                    </motion.div>
                )}

                {detail.reviewerNotes && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card size="small" title={<Space><StarOutlined style={{ color: '#f59e0b' }} /> Reviewer Notes</Space>}
                            style={{ ...glass, marginBottom: 16, borderLeft: '3px solid #f59e0b' }}>
                            <Text>{detail.reviewerNotes}</Text>
                        </Card>
                    </motion.div>
                )}
            </div>
        </CMSLayout>
    );
}

export default function FormResponseDetailPage() { return <React.Suspense fallback={<div>Loading...</div>}><FormResponseDetailPageContent /></React.Suspense>; } 
function FormResponseDetailPageContent() {
    return (
        <Suspense fallback={<CMSLayout title="Response Detail"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><Spin size="large" /></div></CMSLayout>}>
            <ResponseDetailContent />
        </Suspense>
    );
}
