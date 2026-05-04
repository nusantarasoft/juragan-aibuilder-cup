"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Statistic, Typography, Spin, message, Progress, Tooltip } from "antd";
import {
    TeamOutlined, BankOutlined, ContactsOutlined, DollarOutlined,
    CalendarOutlined, RocketOutlined, BugOutlined, ShoppingOutlined,
    FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
    RiseOutlined, TrophyOutlined, ThunderboltOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useRouter } from "next/navigation";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface DashboardStats {
    totalIndividuals: number; totalAccounts: number; totalContacts: number;
    totalDeals: number; openDeals: number; pipelineValue: number; wonValue: number;
    totalActivities: number; openActivities: number;
    totalCases: number; openCases: number; criticalCases: number;
    totalCampaigns: number; activeCampaigns: number; campaignBudget: number;
    totalQuotes: number; quotesValue: number; acceptedQuotes: number;
    totalProducts: number; activeProducts: number;
}

// ─── Pipeline Funnel ────────────────────────────────────
function PipelineFunnel({ pipeline, won, open, total }: { pipeline: number; won: number; open: number; total: number }) {
    const fmtShort = (v: number) => { if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`; return `$${v}`; };
    const stages = [
        { label: 'Total Deals', value: total, color: '#94a3b8', width: 100 },
        { label: 'Open', value: open, color: '#3b82f6', width: 80 },
        { label: 'Pipeline', value: pipeline, color: '#f59e0b', width: 65 },
        { label: 'Won', value: won, color: '#10b981', width: 50 },
    ].filter(s => s.value > 0);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {stages.map((s, i) => (
                <Tooltip key={i} title={`${s.label}: ${typeof s.value === 'number' && s.value > 100 ? fmtShort(s.value) : s.value}`}>
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.1, duration: 0.4 }}
                        style={{ width: `${s.width}%`, height: 22, borderRadius: 4, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{s.label} · {typeof s.value === 'number' && s.value > 1000 ? fmtShort(s.value) : s.value}</Text>
                    </motion.div>
                </Tooltip>
            ))}
        </div>
    );
}

// ─── Win Rate Donut ─────────────────────────────────────
function WinRateDonut({ rate }: { rate: number }) {
    const r = 34, cx = 50, cy = 50, c = 2 * Math.PI * r;
    const dash = (rate / 100) * c;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg viewBox="0 0 100 100" width={64} height={64}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={10} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth={10}
                    strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                    <animate attributeName="stroke-dasharray" from={`0 ${c}`} to={`${dash} ${c - dash}`} dur="1s" fill="freeze" />
                </circle>
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor">{rate}%</text>
            </svg>
            <div>
                <Text strong style={{ fontSize: 14, display: 'block' }}>Win Rate</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{rate >= 50 ? 'Performing well' : 'Room to improve'}</Text>
            </div>
        </div>
    );
}

export default function CrmDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    useEffect(() => {
        (async () => {
            try {
                const data = await gql(`
                    query($tenantId: String!) {
                        crmDashboard(tenantId: $tenantId) {
                            totalIndividuals totalAccounts totalContacts
                            totalDeals openDeals pipelineValue wonValue
                            totalActivities openActivities
                            totalCases openCases criticalCases
                            totalCampaigns activeCampaigns campaignBudget
                            totalQuotes quotesValue acceptedQuotes
                            totalProducts activeProducts
                        }
                    }
                `, { tenantId: DEFAULT_TENANT_ID });
                setStats(data.crmDashboard);
            } catch (err: any) { message.error("Failed to load dashboard: " + err.message); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading || !stats) return (
        <CMSLayout title="CRM Dashboard" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    const winRate = stats.totalDeals > 0
        ? Math.round((stats.totalDeals - stats.openDeals > 0 ? stats.wonValue / (stats.pipelineValue + stats.wonValue) * 100 : 0))
        : 0;

    // Section helper
    const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${themeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: themeColor, fontSize: 14 }}>{icon}</div>
            <Text strong style={{ fontSize: 15 }}>{label}</Text>
        </motion.div>
    );

    // Nav card helper
    const navCard = (title: string, path: string, icon: React.ReactNode, color: string, children: React.ReactNode, delay: number) => (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card hoverable onClick={() => router.push(path)}
                style={{ ...glass, cursor: 'pointer', borderLeft: `3px solid ${color}`, transition: 'all 0.25s ease' }}
                styles={{ body: { padding: '16px 18px' } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>{children}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color }}>{icon}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{title}</Text>
                    <ArrowRightOutlined style={{ fontSize: 10, opacity: 0.3 }} />
                </div>
            </Card>
        </motion.div>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>CRM Dashboard</AuroraText>}
            subTitle={<DecryptedText text="Overview of your entire CRM at a glance" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Pipeline & Revenue */}
            <div>
                <SectionTitle icon={<DollarOutlined />} label="Pipeline & Revenue" />
                <Row gutter={[14, 14]}>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("View Deals", "/admin/crm/deals", <DollarOutlined />, "#3b82f6",
                            <Statistic title="Pipeline Value" value={stats.pipelineValue} formatter={() => fmt(stats.pipelineValue)} valueStyle={{ color: '#3b82f6', fontSize: 20, fontFamily: 'monospace' }} />,
                        0.05)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("View Deals", "/admin/crm/deals", <TrophyOutlined />, "#10b981",
                            <Statistic title="Won Value" value={stats.wonValue} formatter={() => fmt(stats.wonValue)} valueStyle={{ color: '#10b981', fontSize: 20, fontFamily: 'monospace' }} />,
                        0.1)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("View Quotes", "/admin/crm/quotes", <FileTextOutlined />, "#8b5cf6",
                            <Statistic title="Quotes Value" value={stats.quotesValue} formatter={() => fmt(stats.quotesValue)} valueStyle={{ color: '#8b5cf6', fontSize: 20, fontFamily: 'monospace' }} />,
                        0.15)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card style={{ ...glass, borderLeft: '3px solid #f59e0b' }} styles={{ body: { padding: '16px 18px' } }}>
                                <WinRateDonut rate={winRate} />
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>{stats.openDeals} open · {stats.totalDeals} total</Text>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </div>

            {/* Pipeline Funnel Visualization */}
            {stats.totalDeals > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <Card size="small" style={{ ...glass }}>
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Deal Pipeline Funnel</Text>
                        <PipelineFunnel pipeline={stats.pipelineValue} won={stats.wonValue} open={stats.openDeals} total={stats.totalDeals} />
                    </Card>
                </motion.div>
            )}

            {/* People & Organizations */}
            <div>
                <SectionTitle icon={<TeamOutlined />} label="People & Organizations" />
                <Row gutter={[14, 14]}>
                    <Col xs={24} sm={8}>
                        {navCard("Individuals", "/admin/crm/individuals", <TeamOutlined />, "#3b82f6",
                            <Statistic title="Individuals" value={stats.totalIndividuals} prefix={<TeamOutlined />} />,
                        0.35)}
                    </Col>
                    <Col xs={24} sm={8}>
                        {navCard("Accounts", "/admin/crm/accounts", <BankOutlined />, "#06b6d4",
                            <Statistic title="Accounts" value={stats.totalAccounts} prefix={<BankOutlined />} />,
                        0.4)}
                    </Col>
                    <Col xs={24} sm={8}>
                        {navCard("Contacts", "/admin/crm/contacts", <ContactsOutlined />, "#ec4899",
                            <Statistic title="Contacts" value={stats.totalContacts} prefix={<ContactsOutlined />} />,
                        0.45)}
                    </Col>
                </Row>
            </div>

            {/* Activity & Engagement */}
            <div>
                <SectionTitle icon={<CalendarOutlined />} label="Activity & Engagement" />
                <Row gutter={[14, 14]}>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("Activities", "/admin/crm/activities", <CalendarOutlined />, "#f97316",
                            <Statistic title="Open Activities" value={stats.openActivities} suffix={`/ ${stats.totalActivities}`} valueStyle={{ color: '#f97316' }} />,
                        0.5)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("Campaigns", "/admin/crm/campaigns", <RocketOutlined />, "#6366f1",
                            <Statistic title="Active Campaigns" value={stats.activeCampaigns} suffix={`/ ${stats.totalCampaigns}`} valueStyle={{ color: '#6366f1' }} />,
                        0.55)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("Campaign Budget", "/admin/crm/campaigns", <RiseOutlined />, "#10b981",
                            <Statistic title="Total Budget" value={stats.campaignBudget} formatter={() => fmt(stats.campaignBudget)} valueStyle={{ fontSize: 18, fontFamily: 'monospace' }} />,
                        0.6)}
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        {navCard("Products", "/admin/crm/products", <ShoppingOutlined />, "#8b5cf6",
                            <Statistic title="Active Products" value={stats.activeProducts} suffix={`/ ${stats.totalProducts}`} valueStyle={{ color: themeColor }} />,
                        0.65)}
                    </Col>
                </Row>
            </div>

            {/* Support */}
            <div>
                <SectionTitle icon={<BugOutlined />} label="Support" />
                <Row gutter={[14, 14]}>
                    <Col xs={24} sm={8}>
                        {navCard("Cases", "/admin/crm/cases", <BugOutlined />, "#3b82f6",
                            <Statistic title="Open Cases" value={stats.openCases} suffix={`/ ${stats.totalCases}`} valueStyle={{ color: '#3b82f6' }} />,
                        0.7)}
                    </Col>
                    <Col xs={24} sm={8}>
                        {navCard("Critical Cases", "/admin/crm/cases", <ExclamationCircleOutlined />, "#ef4444",
                            <Statistic title="Critical" value={stats.criticalCases} valueStyle={{ color: stats.criticalCases > 0 ? '#ef4444' : '#10b981' }} prefix={stats.criticalCases > 0 ? <ThunderboltOutlined /> : <CheckCircleOutlined />} />,
                        0.75)}
                    </Col>
                    <Col xs={24} sm={8}>
                        {navCard("Accepted Quotes", "/admin/crm/quotes", <CheckCircleOutlined />, "#10b981",
                            <Statistic title="Accepted Quotes" value={stats.acceptedQuotes} suffix={`/ ${stats.totalQuotes}`} valueStyle={{ color: '#10b981' }} />,
                        0.8)}
                    </Col>
                </Row>
            </div>
        </div>
        </CMSLayout>
    );
}
