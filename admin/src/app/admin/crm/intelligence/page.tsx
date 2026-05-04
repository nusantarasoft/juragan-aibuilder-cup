"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Card, Tabs, Table, Tag, Typography, Progress, Space, Badge, Tooltip,
    message, Spin, Row, Col, Statistic, List, Button,
} from "antd";
import {
    ThunderboltOutlined, TrophyOutlined, WarningOutlined,
    RiseOutlined, FallOutlined, ReloadOutlined,
    UserOutlined, DollarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
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

const gradeColors: Record<string, string> = { A: '#52c41a', B: '#1677ff', C: '#faad14', D: '#ff7a45', F: '#ff4d4f' };
const riskColors: Record<string, string> = { low: 'green', medium: 'orange', high: 'red' };

export default function AIIntelligencePage() {
    const [leads, setLeads] = useState<LeadScore[]>([]);
    const [deals, setDeals] = useState<DealInsight[]>([]);
    const { themeColor } = usePreferencesStore();
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

    const leadColumns: ColumnsType<LeadScore> = [
        {
            title: "Lead", key: "name",
            render: (_, r) => (
                <div>
                    <Text strong>{r.firstName} {r.lastName}</Text>
                    {r.company && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.company}</Text></>}
                </div>
            ),
        },
        {
            title: "Score", key: "score", width: 180, sorter: (a, b) => a.score - b.score, defaultSortOrder: 'descend',
            render: (_, r) => (
                <Space>
                    <Progress type="circle" percent={r.score} size={40}
                        strokeColor={gradeColors[r.grade]} format={() => r.score} />
                    <Tag color={gradeColors[r.grade]} style={{ fontWeight: 'bold', fontSize: 16, padding: '2px 10px' }}>{r.grade}</Tag>
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
                <div>
                    <Text strong>{r.dealName}</Text>
                    {r.accountName && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.accountName}</Text></>}
                </div>
            ),
        },
        { title: "Amount", key: "amount", width: 120, align: "right", render: (_, r) => <Text strong>{fmt(r.amount)}</Text> },
        { title: "Stage", key: "stage", width: 120, render: (_, r) => <Tag color="blue">{r.stage}</Tag> },
        {
            title: "Risk", key: "risk", width: 90,
            render: (_, r) => <Badge color={riskColors[r.riskLevel]} text={<Text style={{ color: riskColors[r.riskLevel], fontWeight: 600 }}>{r.riskLevel.toUpperCase()}</Text>} />,
            sorter: (a, b) => { const o = { high: 3, medium: 2, low: 1 }; return (o[b.riskLevel as keyof typeof o] || 0) - (o[a.riskLevel as keyof typeof o] || 0); },
        },
        { title: "Age", key: "age", width: 80, render: (_, r) => `${r.daysSinceCreation}d`, sorter: (a, b) => b.daysSinceCreation - a.daysSinceCreation },
        {
            title: "Insights & Recommendation", key: "insights",
            render: (_, r) => (
                <div>
                    {r.insights.map((i, idx) => <div key={idx} style={{ fontSize: 12 }}>{i}</div>)}
                    <Text type="success" strong style={{ fontSize: 12 }}>💡 {r.recommendation}</Text>
                </div>
            ),
        },
    ];

    if (loading) return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>AI Intelligence</AuroraText>} subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>AI Intelligence</AuroraText>}
            subTitle={<DecryptedText text="AI-powered lead scoring and deal insights" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={loadData}>Refresh Analysis</Button>]}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={6}>
                    <Card style={{ ...glass }}><Statistic title="Avg Lead Score" value={avgScore} suffix="/ 100"
                        prefix={<ThunderboltOutlined />} valueStyle={{ color: avgScore >= 50 ? '#52c41a' : '#faad14' }} /></Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card style={{ ...glass }}><Statistic title="Hot Leads (A/B)" value={hotLeads}
                        prefix={<TrophyOutlined />} valueStyle={{ color: '#52c41a' }}
                        suffix={`/ ${leads.length}`} /></Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card style={{ ...glass }}><Statistic title="At-Risk Deals" value={atRisk}
                        prefix={<WarningOutlined />} valueStyle={{ color: atRisk > 0 ? '#ff4d4f' : '#52c41a' }}
                        suffix={`/ ${deals.length}`} /></Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card style={{ ...glass }}><Statistic title="Pipeline at Risk" value={deals.filter(d => d.riskLevel === 'high').reduce((s, d) => s + (d.amount || 0), 0)}
                        prefix={<DollarOutlined />} formatter={v => fmt(Number(v))}
                        valueStyle={{ color: '#ff4d4f' }} /></Card>
                </Col>
            </Row>

            <Card style={{ ...glass }}>
                <Tabs defaultActiveKey="leads" items={[
                    {
                        key: 'leads', label: <span><UserOutlined /> Lead Scoring ({leads.length})</span>,
                        children: <Table columns={leadColumns} dataSource={leads.map(l => ({ ...l, key: l.individualId }))}
                            pagination={{ pageSize: 15 }} size="middle" />,
                    },
                    {
                        key: 'deals', label: <span><RiseOutlined /> Deal Insights ({deals.length})</span>,
                        children: <Table columns={dealColumns} dataSource={deals.map(d => ({ ...d, key: d.dealId }))}
                            pagination={{ pageSize: 15 }} size="middle" />,
                    },
                ]} />
            </Card>
        </CMSLayout>
    );
}
