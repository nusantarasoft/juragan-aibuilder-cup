"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Card, Tabs, Table, Tag, Typography, Progress, Space, Badge, Tooltip,
    message, Spin, Row, Col, Statistic, Button, Empty,
} from "antd";
import {
    ThunderboltOutlined, TrophyOutlined, WarningOutlined,
    RiseOutlined, FallOutlined, ReloadOutlined,
    UserOutlined, DollarOutlined, BulbOutlined, FireOutlined,
    CheckCircleOutlined, ClockCircleOutlined, FunnelPlotOutlined,
    FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface LeadScore {
    individualId: string; firstName: string; lastName: string;
    email: string; company: string; leadStatus: string;
    score: number; grade: string; factors: string[];
}

interface DealInsight {
    dealId: string; dealName: string; stage: string;
    amount: number; probability: number; accountName: string;
    contactName: string; closeDate: string; daysSinceCreation: number;
    riskLevel: string; insights: string[]; recommendation: string;
}

const gradeColors: Record<string, string> = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
const gradeLabels: Record<string, string> = { A: 'Hot', B: 'Warm', C: 'Nurture', D: 'Cold', F: 'Disqualified' };
const riskColors: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

// ── Lead Grade Distribution (donut-like visual) ──
function GradeDistribution({ leads }: { leads: LeadScore[] }) {
    const grades = ['A', 'B', 'C', 'D', 'F'];
    const total = leads.length || 1;
    return (
        <div style={{ display: 'flex', gap: 10 }}>
            {grades.map((g, i) => {
                const cnt = leads.filter(l => l.grade === g).length;
                const pct = Math.round((cnt / total) * 100);
                return (
                    <motion.div key={g} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 12, background: `${gradeColors[g]}08`, border: `1px solid ${gradeColors[g]}25`, textAlign: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${gradeColors[g]}20`, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: gradeColors[g] }}>{g}</div>
                        <Text strong style={{ fontSize: 22, color: gradeColors[g], display: 'block' }}>{cnt}</Text>
                        <Text style={{ fontSize: 10, display: 'block', color: '#6b7280' }}>{gradeLabels[g]}</Text>
                        <Text style={{ fontSize: 9, color: '#9ca3af' }}>{pct}%</Text>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ── Deal Risk Funnel ──
function RiskFunnel({ deals }: { deals: DealInsight[] }) {
    const risks = [
        { key: 'low', label: 'Low Risk', icon: <CheckCircleOutlined />, color: '#10b981' },
        { key: 'medium', label: 'Medium Risk', icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { key: 'high', label: 'High Risk', icon: <WarningOutlined />, color: '#ef4444' },
    ];
    const total = deals.length || 1;
    const fmt = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '$0';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.map((r, i) => {
                const filtered = deals.filter(d => d.riskLevel === r.key);
                const cnt = filtered.length;
                const pct = Math.round((cnt / total) * 100);
                const totalAmt = filtered.reduce((s, d) => s + (d.amount || 0), 0);
                return (
                    <motion.div key={r.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ minWidth: 100, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: r.color, fontSize: 14 }}>{r.icon}</span>
                            <Text style={{ fontSize: 11, fontWeight: 600 }}>{r.label}</Text>
                        </div>
                        <div style={{ flex: 1, position: 'relative', height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                                style={{ height: '100%', borderRadius: 14, background: `${r.color}30`, position: 'absolute' }} />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                                style={{ height: '100%', borderRadius: 14, background: r.color, opacity: 0.8, display: 'flex', alignItems: 'center', paddingLeft: 10, minWidth: cnt > 0 ? 50 : 0 }}>
                                {cnt > 0 && <Text style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{cnt} deals</Text>}
                            </motion.div>
                        </div>
                        <Text style={{ fontSize: 10, color: '#6b7280', minWidth: 80, textAlign: 'right' }}>{fmt(totalAmt)}</Text>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ── AI Recommendations Widget ──
function AIRecommendations({ deals }: { deals: DealInsight[] }) {
    const highRisk = deals.filter(d => d.riskLevel === 'high').slice(0, 5);
    if (highRisk.length === 0) return <Empty description="No at-risk deals — pipeline is healthy 🎉" />;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {highRisk.map((d, i) => (
                <motion.div key={d.dealId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ ...glass, padding: '10px 14px', borderRadius: 10, borderLeft: `3px solid #ef4444` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                            <Text strong style={{ fontSize: 12 }}>{d.dealName}</Text>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{d.accountName} · {d.daysSinceCreation}d old</Text>
                        </div>
                        <Tag color="red" style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>HIGH RISK</Tag>
                    </div>
                    <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.06)', marginTop: 4 }}>
                        <BulbOutlined style={{ color: '#f59e0b', marginRight: 4 }} />
                        <Text style={{ fontSize: 11, color: '#374151' }}>💡 {d.recommendation}</Text>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

export default function AIIntelligencePage() {
    const [leads, setLeads] = useState<LeadScore[]>([]);
    const [deals, setDeals] = useState<DealInsight[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    leadScores(tenantId: $tenantId) {
                        individualId firstName lastName email company leadStatus score grade factors
                    }
                    dealInsights(tenantId: $tenantId) {
                        dealId dealName stage amount probability accountName contactName
                        closeDate daysSinceCreation riskLevel insights recommendation
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setLeads(data.leadScores || []);
            setDeals(data.dealInsights || []);
        } catch (err: any) { message.error("Failed: " + err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const fmt = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '$0';

    const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;
    const hotLeads = leads.filter(l => l.grade === 'A' || l.grade === 'B').length;
    const atRisk = deals.filter(d => d.riskLevel === 'high').length;
    const totalPipeline = deals.reduce((s, d) => s + (d.amount || 0), 0);
    const weightedPipeline = deals.reduce((s, d) => s + (d.amount || 0) * ((d.probability || 0) / 100), 0);
    const avgDealAge = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + (d.daysSinceCreation || 0), 0) / deals.length) : 0;

    const leadColumns: ColumnsType<LeadScore> = [
        {
            title: "Lead", key: "name",
            render: (_, r) => (
                <Space>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${gradeColors[r.grade]}15`, border: `2px solid ${gradeColors[r.grade]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: gradeColors[r.grade] }}>{r.firstName[0]}{r.lastName[0]}</div>
                    <div><Text strong>{r.firstName} {r.lastName}</Text>{r.company && <><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.company}</Text></>}</div>
                </Space>
            ),
        },
        {
            title: "Score", key: "score", width: 180, sorter: (a, b) => a.score - b.score, defaultSortOrder: 'descend',
            render: (_, r) => (
                <Space>
                    <Progress type="circle" percent={r.score} size={40}
                        strokeColor={gradeColors[r.grade]} format={() => r.score} />
                    <Tag color={gradeColors[r.grade]} style={{ fontWeight: 'bold', fontSize: 14, padding: '2px 10px', borderRadius: 10 }}>{r.grade}</Tag>
                </Space>
            ),
        },
        {
            title: "Status", key: "status", width: 110,
            render: (_, r) => r.leadStatus ? <Tag>{r.leadStatus}</Tag> : <Tag color="default">No status</Tag>,
        },
        {
            title: "Scoring Factors", key: "factors",
            render: (_, r) => (
                <Tooltip title={r.factors.join('\n')}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.factors.slice(0, 3).join(' · ')}{r.factors.length > 3 ? ` +${r.factors.length - 3} more` : ''}
                    </Text>
                </Tooltip>
            ),
        },
    ];

    const dealColumns: ColumnsType<DealInsight> = [
        {
            title: "Deal", key: "name",
            render: (_, r) => (
                <div><Text strong>{r.dealName}</Text>{r.accountName && <><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.accountName}</Text></>}</div>
            ),
        },
        { title: "Amount", key: "amount", width: 120, align: "right", render: (_, r) => <Text strong>{fmt(r.amount)}</Text> },
        { title: "Stage", key: "stage", width: 120, render: (_, r) => <Tag color="blue">{r.stage}</Tag> },
        {
            title: "Win %", key: "prob", width: 80,
            render: (_, r) => <Progress type="circle" percent={r.probability} size={32} strokeColor={r.probability >= 70 ? '#10b981' : r.probability >= 40 ? '#f59e0b' : '#ef4444'} />,
        },
        {
            title: "Risk", key: "risk", width: 90,
            render: (_, r) => <Badge color={riskColors[r.riskLevel]} text={<Text style={{ color: riskColors[r.riskLevel], fontWeight: 600 }}>{r.riskLevel.toUpperCase()}</Text>} />,
            sorter: (a, b) => { const o = { high: 3, medium: 2, low: 1 }; return (o[b.riskLevel as keyof typeof o] || 0) - (o[a.riskLevel as keyof typeof o] || 0); },
        },
        { title: "Age", key: "age", width: 70, render: (_, r) => <Text>{r.daysSinceCreation}d</Text>, sorter: (a, b) => b.daysSinceCreation - a.daysSinceCreation },
        {
            title: "AI Recommendation", key: "rec",
            render: (_, r) => (
                <Tooltip title={r.insights.join('\n')}>
                    <Text style={{ fontSize: 12 }}>💡 {r.recommendation}</Text>
                </Tooltip>
            ),
        },
    ];

    if (loading) return (
        <CMSLayout title={<AuroraText colors={[themeColor, "#8b5cf6", "#06b6d4"]}>AI Intelligence</AuroraText>} subTitle="Analyzing pipeline...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /><br /><Text type="secondary" style={{ marginTop: 8 }}>Running AI analysis on leads & deals...</Text></div>
        </CMSLayout>
    );

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "#8b5cf6", "#06b6d4"]} className="text-[22px] font-bold tracking-tight">AI Intelligence</AuroraText>}
            subTitle={<DecryptedText text="AI-powered lead scoring, deal insights & pipeline analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} style={{ borderRadius: 8 }}>Refresh Analysis</Button>,
                <Tooltip key="xl" title="Export leads to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'crm_lead_scoring', title: 'CRM Lead Scoring Report', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'firstName', format: (v: string, row: any) => `${v} ${row.lastName}` }, { header: 'Email', key: 'email' }, { header: 'Company', key: 'company' }, { header: 'Score', key: 'score' }, { header: 'Grade', key: 'grade' }, { header: 'Status', key: 'leadStatus' }], data: leads })} /></Tooltip>,
                <Tooltip key="pd" title="Export deals to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'crm_deal_insights', title: 'CRM Deal Insights Report', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Deal', key: 'dealName' }, { header: 'Account', key: 'accountName' }, { header: 'Amount', key: 'amount', format: (v: number) => fmt(v) }, { header: 'Stage', key: 'stage' }, { header: 'Win %', key: 'probability' }, { header: 'Risk', key: 'riskLevel' }, { header: 'Age (d)', key: 'daysSinceCreation' }], data: deals })} /></Tooltip>,
            ]}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* KPI Stats */}
                <Row gutter={[12, 12]}>
                    {[
                        { title: 'Avg Lead Score', value: `${avgScore}/100`, icon: <ThunderboltOutlined />, color: avgScore >= 50 ? '#10b981' : '#f59e0b' },
                        { title: 'Hot Leads (A/B)', value: `${hotLeads}/${leads.length}`, icon: <FireOutlined />, color: '#ef4444' },
                        { title: 'At-Risk Deals', value: atRisk, icon: <WarningOutlined />, color: atRisk > 0 ? '#ef4444' : '#10b981' },
                        { title: 'Total Pipeline', value: fmt(totalPipeline), icon: <DollarOutlined />, color: '#3b82f6' },
                        { title: 'Weighted Pipeline', value: fmt(weightedPipeline), icon: <FunnelPlotOutlined />, color: '#8b5cf6' },
                        { title: 'Avg Deal Age', value: `${avgDealAge}d`, icon: <ClockCircleOutlined />, color: '#06b6d4' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Analytics Row */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<><ThunderboltOutlined /> <Text strong style={{ fontSize: 13 }}>Lead Grade Distribution</Text></>}>
                            <GradeDistribution leads={leads} />
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<><FunnelPlotOutlined /> <Text strong style={{ fontSize: 13 }}>Deal Risk Analysis</Text></>}>
                            <RiskFunnel deals={deals} />
                        </Card>
                    </Col>
                </Row>

                {/* AI Recommendations */}
                <Card size="small" style={{ ...glass }} title={<><BulbOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>AI Action Items — High-Risk Deals</Text></>}>
                    <AIRecommendations deals={deals} />
                </Card>

                {/* Data Tables */}
                <Card style={{ ...glass }}>
                    <Tabs defaultActiveKey="leads" items={[
                        {
                            key: 'leads', label: <span><UserOutlined /> Lead Scoring <Badge count={leads.length} style={{ backgroundColor: themeColor }} /></span>,
                            children: <Table columns={leadColumns} dataSource={leads.map(l => ({ ...l, key: l.individualId }))}
                                pagination={{ pageSize: 15 }} size="middle" />,
                        },
                        {
                            key: 'deals', label: <span><RiseOutlined /> Deal Insights <Badge count={deals.length} style={{ backgroundColor: '#3b82f6' }} /></span>,
                            children: <Table columns={dealColumns} dataSource={deals.map(d => ({ ...d, key: d.dealId }))}
                                pagination={{ pageSize: 15 }} size="middle" />,
                        },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
