'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Space, Tag, Button, Progress, Skeleton, Collapse, Timeline, message, theme } from 'antd';
import {
    DollarOutlined, TeamOutlined, BugOutlined, ProjectOutlined, ShoppingCartOutlined,
    BellOutlined, CloudOutlined, RiseOutlined, ArrowUpOutlined, ArrowDownOutlined,
    HeartOutlined, DashboardOutlined, ToolOutlined, FundProjectionScreenOutlined,
    ShopOutlined, AccountBookOutlined, WarningOutlined, ExclamationCircleOutlined,
    ClockCircleOutlined, ThunderboltOutlined, ReloadOutlined, RightOutlined,
    CheckCircleOutlined, FireOutlined, SafetyOutlined, ApartmentOutlined,
    CalendarOutlined, TrophyOutlined, FundOutlined,
} from '@ant-design/icons';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };
const anim = (i: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.4 } });

/* ═══ GraphQL Queries ═══ */
const GET_HR_STATS = `query($tenantId: String!) { hrDashboardStats(tenantId: $tenantId) { totalEmployees activeEmployees avgTenure newHiresThisMonth turnoverRate avgSalary totalPayrollThisMonth } }`;
const GET_ECOM_STATS = `query($tenantId: String!) { ecomStats(tenantId: $tenantId) }`;
const GET_ITSM_STATS = `query($tenantId: String!) { itsmDashboardStats(tenantId: $tenantId) }`;
const GET_PM_STATS = `query($tenantId: String!) { pmDashboardStats(tenantId: $tenantId) }`;
const GET_ACCOUNTING = `query($tenantId: String!) { accountingDashboard(tenantId: $tenantId) }`;
const GET_NOTIFICATION_STATS = `query($tenantId: String!) { notificationStats(tenantId: $tenantId) }`;

/* ═══ Demo / fallback data ═══ */
const DEMO_REVENUE = [
    { month: 'Jul', revenue: 320, expenses: 210 },
    { month: 'Aug', revenue: 350, expenses: 225 },
    { month: 'Sep', revenue: 410, expenses: 240 },
    { month: 'Oct', revenue: 390, expenses: 250 },
    { month: 'Nov', revenue: 480, expenses: 260 },
    { month: 'Dec', revenue: 520, expenses: 280 },
    { month: 'Jan', revenue: 490, expenses: 275 },
    { month: 'Feb', revenue: 530, expenses: 290 },
    { month: 'Mar', revenue: 580, expenses: 310 },
    { month: 'Apr', revenue: 620, expenses: 300 },
    { month: 'May', revenue: 670, expenses: 320 },
    { month: 'Jun', revenue: 710, expenses: 340 },
];

const DEMO_RADAR = [
    { dim: 'Productivity', value: 82 },
    { dim: 'Budget Util.', value: 75 },
    { dim: 'Satisfaction', value: 88 },
    { dim: 'Ticket Resol.', value: 70 },
    { dim: 'Project Deliv.', value: 78 },
];

const DEMO_TIMELINE = [
    { module: 'HR', color: '#10b981', desc: 'New employee onboarded — Sarah Chen', time: '12 min ago' },
    { module: 'ITSM', color: '#06b6d4', desc: 'Critical ticket #4821 resolved', time: '25 min ago' },
    { module: 'PM', color: '#8b5cf6', desc: 'Sprint 14 completed — 42 story points', time: '1 hr ago' },
    { module: 'E-Commerce', color: '#f59e0b', desc: 'Flash sale generated $12.4k revenue', time: '2 hr ago' },
    { module: 'Accounting', color: '#3b82f6', desc: 'Monthly reconciliation completed', time: '3 hr ago' },
    { module: 'CRM', color: '#ec4899', desc: 'Deal #892 closed — $45k ARR', time: '4 hr ago' },
    { module: 'HR', color: '#10b981', desc: 'Performance review cycle started', time: '5 hr ago' },
    { module: 'ITSM', color: '#06b6d4', desc: 'SLA breach alert — Ticket #4830', time: '6 hr ago' },
    { module: 'Notifications', color: '#f97316', desc: '2,400 campaign emails delivered', time: '7 hr ago' },
    { module: 'PM', color: '#8b5cf6', desc: 'Project Aurora milestone reached', time: '8 hr ago' },
    { module: 'CRM', color: '#ec4899', desc: 'New lead batch imported — 120 contacts', time: '9 hr ago' },
    { module: 'Accounting', color: '#3b82f6', desc: 'Q2 budget variance report generated', time: '10 hr ago' },
    { module: 'E-Commerce', color: '#f59e0b', desc: 'Inventory restock alert — SKU #7741', time: '11 hr ago' },
    { module: 'HR', color: '#10b981', desc: 'Leave request approved — James Park', time: '12 hr ago' },
    { module: 'ITSM', color: '#06b6d4', desc: 'Change request #CR-201 approved', time: '14 hr ago' },
    { module: 'PM', color: '#8b5cf6', desc: 'Risk escalation on Project Nebula', time: '16 hr ago' },
    { module: 'Notifications', color: '#f97316', desc: 'SMS gateway failover activated', time: '18 hr ago' },
    { module: 'CRM', color: '#ec4899', desc: 'Customer NPS survey completed — Score: 72', time: '20 hr ago' },
    { module: 'Accounting', color: '#3b82f6', desc: 'Payroll batch #PR-0624 processed', time: '22 hr ago' },
    { module: 'E-Commerce', color: '#f59e0b', desc: 'New product catalog sync — 340 items', time: '1 day ago' },
];

const DEMO_ALERTS = [
    { severity: 'critical', title: '3 overdue invoices exceeding 90 days — $42K outstanding', module: 'Accounting' },
    { severity: 'critical', title: 'SLA breach on 2 priority-1 tickets — avg 8h overdue', module: 'ITSM' },
    { severity: 'critical', title: 'Production API latency spike — p99 > 2s', module: 'DevOps' },
    { severity: 'warning', title: 'Project Titan 15% over budget — $28K overspend', module: 'PM' },
    { severity: 'warning', title: 'Engineering dept turnover at 18% — above threshold', module: 'HR' },
    { severity: 'warning', title: 'Cart abandonment rate increased to 72%', module: 'E-Commerce' },
    { severity: 'info', title: 'Staging deployment v3.12 pending review', module: 'DevOps' },
    { severity: 'info', title: 'Quarterly compliance audit scheduled for next week', module: 'Compliance' },
];

const SEVERITY_CONFIG: Record<string, { color: string; tag: string; icon: React.ReactNode }> = {
    critical: { color: '#ef4444', tag: 'red', icon: <FireOutlined style={{ color: '#ef4444', fontSize: 16 }} /> },
    warning: { color: '#f59e0b', tag: 'orange', icon: <ExclamationCircleOutlined style={{ color: '#f59e0b', fontSize: 16 }} /> },
    info: { color: '#3b82f6', tag: 'blue', icon: <SafetyOutlined style={{ color: '#3b82f6', fontSize: 16 }} /> },
};

/* ═══ Sparkline mini-chart component ═══ */
function Sparkline({ data, color }: { data: number[]; color: string }) {
    const min = Math.min(...data);
    const max = Math.max(...data, min + 1);
    const w = 60, h = 22;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min)) * h;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={w} height={h} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1s" fill="freeze" />
            </polyline>
        </svg>
    );
}

/* ═══ Circular Progress Gauge component ═══ */
function Gauge({ pct, label, color, subLabel }: { pct: number; label: string; color: string; subLabel?: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <Progress
                type="circle"
                percent={pct}
                size={78}
                strokeColor={{ '0%': color, '100%': `${color}99` }}
                trailColor={`${color}15`}
                format={p => <span style={{ fontSize: 15, fontWeight: 700, color }}>{p}%</span>}
            />
            <Text strong style={{ fontSize: 11, display: 'block', marginTop: 6 }}>{label}</Text>
            {subLabel && <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>{subLabel}</Text>}
        </div>
    );
}

/* ═══ Financial summary stat pill ═══ */
function FinStat({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
    return (
        <div style={{
            flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 10,
            background: `${color}08`, borderLeft: `3px solid ${color}`,
        }}>
            <div style={{ fontSize: 14, color, marginBottom: 2 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color }}>{value}</div>
            <Text type="secondary" style={{ fontSize: 10 }}>{label}</Text>
        </div>
    );
}

/* ═══ Executive Dashboard ═══ */
export default function ExecutiveDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark ? glassDark : glass;
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();

    const [loading, setLoading] = useState(true);
    const [hr, setHr] = useState<any>({});
    const [ecom, setEcom] = useState<any>({});
    const [itsm, setItsm] = useState<any>({});
    const [pm, setPm] = useState<any>({});
    const [acct, setAcct] = useState<any>({});
    const [notif, setNotif] = useState<any>({});

    /* ── Load all module data in parallel ── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [hrR, eR, iR, pR, aR, nR] = await Promise.all([
                gql<any>(GET_HR_STATS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({})),
                gql<any>(GET_ECOM_STATS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({})),
                gql<any>(GET_ITSM_STATS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({})),
                gql<any>(GET_PM_STATS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({})),
                gql<any>(GET_ACCOUNTING, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({})),
                gql<any>(GET_NOTIFICATION_STATS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({})),
            ]);
            setHr(hrR?.hrDashboardStats || {});
            setEcom(eR?.ecomStats || {});
            setItsm(iR?.itsmDashboardStats || {});
            setPm(pR?.pmDashboardStats || {});
            setAcct(aR?.accountingDashboard || {});
            setNotif(nR?.notificationStats || {});
        } catch {
            /* graceful fallback — demo values remain from defaults */
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Executive KPI summary cards ── */
    const kpis = useMemo(() => [
        { t: 'Revenue', v: `$${((ecom.totalRevenue || 710000) / 1000).toFixed(0)}K`, c: '#10b981', i: <DollarOutlined />, trend: '+12.4%', up: true, spark: [42, 48, 51, 55, 60, 67, 71] },
        { t: 'Net Income', v: `$${((acct.netIncome || 284000) / 1000).toFixed(0)}K`, c: '#3b82f6', i: <AccountBookOutlined />, trend: '+8.2%', up: true, spark: [18, 20, 22, 24, 26, 27, 28] },
        { t: 'Headcount', v: hr.totalEmployees || 248, c: '#8b5cf6', i: <TeamOutlined />, trend: '+4', up: true, spark: [220, 225, 230, 235, 240, 244, 248] },
        { t: 'Open Tickets', v: itsm.openTickets || 23, c: '#f59e0b', i: <BugOutlined />, trend: '-5', up: false, spark: [40, 36, 32, 30, 28, 25, 23] },
        { t: 'Active Projects', v: pm.activeProjects || 14, c: '#06b6d4', i: <ProjectOutlined />, trend: '+2', up: true, spark: [9, 10, 10, 11, 12, 13, 14] },
        { t: 'Customers', v: `${((ecom.totalCustomers || 12400) / 1000).toFixed(1)}K`, c: '#ec4899', i: <ShoppingCartOutlined />, trend: '+340', up: true, spark: [10, 10.5, 11, 11.4, 11.8, 12.1, 12.4] },
        { t: 'Notif. Success', v: `${notif.successRate || 97.2}%`, c: '#f97316', i: <BellOutlined />, trend: '+0.8%', up: true, spark: [95, 95.5, 96, 96.4, 96.8, 97, 97.2] },
        { t: 'System Uptime', v: '99.97%', c: '#14b8a6', i: <CloudOutlined />, trend: 'Stable', up: true, spark: [99.9, 99.92, 99.95, 99.93, 99.96, 99.95, 99.97] },
    ], [hr, ecom, itsm, pm, acct, notif]);

    /* ── Module health scorecard data ── */
    const healthModules = useMemo(() => [
        { name: 'HR', icon: <TeamOutlined />, color: '#10b981',
            status: (hr.turnoverRate || 6.2) < 10 ? 'green' : 'yellow',
            metrics: [{ label: 'Engagement Score', value: '78%' }, { label: 'Turnover Rate', value: `${hr.turnoverRate || 6.2}%` }],
            href: '/admin/hr/dashboard' },
        { name: 'ITSM', icon: <ToolOutlined />, color: '#06b6d4',
            status: 'green',
            metrics: [{ label: 'SLA Compliance', value: `${itsm.slaCompliance || 94}%` }, { label: 'Avg Resolution', value: `${itsm.avgResolutionHrs || 4.2}h` }],
            href: '/admin/itsm/dashboard' },
        { name: 'Projects', icon: <ProjectOutlined />, color: '#8b5cf6',
            status: 'yellow',
            metrics: [{ label: 'Sprint Velocity', value: `${pm.sprintVelocity || 42}pts` }, { label: 'On-Time Delivery', value: `${pm.onTimeDelivery || 82}%` }],
            href: '/admin/pm/dashboard' },
        { name: 'CRM', icon: <HeartOutlined />, color: '#ec4899',
            status: 'green',
            metrics: [{ label: 'Pipeline Value', value: '$1.2M' }, { label: 'Win Rate', value: '34%' }],
            href: '/admin/crm/dashboard' },
        { name: 'E-Commerce', icon: <ShopOutlined />, color: '#f59e0b',
            status: 'green',
            metrics: [{ label: 'Conversion Rate', value: `${ecom.conversionRate || 3.8}%` }, { label: 'Avg Order Value', value: `$${ecom.avgOrderValue || 85}` }],
            href: '/admin/ecommerce/dashboard' },
        { name: 'Accounting', icon: <AccountBookOutlined />, color: '#3b82f6',
            status: (acct.cashRatio || 1.4) >= 1 ? 'green' : 'red',
            metrics: [{ label: 'Cash Ratio', value: `${acct.cashRatio || 1.4}x` }, { label: 'Days Payable', value: `${acct.daysPayable || 32}d` }],
            href: '/admin/accounting/dashboard' },
    ], [hr, ecom, itsm, pm, acct]);

    /* ── Status traffic-light dot ── */
    const statusDot = (s: string) => ({
        background: s === 'green' ? '#10b981' : s === 'yellow' ? '#f59e0b' : '#ef4444',
        width: 10, height: 10, borderRadius: '50%', display: 'inline-block' as const,
        boxShadow: `0 0 6px ${s === 'green' ? '#10b981' : s === 'yellow' ? '#f59e0b' : '#ef4444'}88`,
    });

    /* ── Financial summary computed values ── */
    const totalRevenue = DEMO_REVENUE.reduce((s, m) => s + m.revenue, 0);
    const totalExpenses = DEMO_REVENUE.reduce((s, m) => s + m.expenses, 0);
    const netMargin = Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100);

    /* ═══ Render ═══ */
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Executive Dashboard</AuroraText>}
            subTitle={
                <DecryptedText text="Enterprise-wide KPIs — single pane of glass"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />
            }
            extra={[
                <Button key="cal" icon={<CalendarOutlined />} onClick={() => messageApi.info('Date range filter coming soon')}>Q2 2026</Button>,
                <Button key="r" icon={<ReloadOutlined />} loading={loading} onClick={loadData}>Refresh</Button>,
            ]}
        >
            {contextHolder}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ═══ 0. Premium Header Banner ═══ */}
                <motion.div {...anim(0)}>
                    <div style={{
                        ...glassCard, padding: '18px 24px',
                        background: isDark
                            ? `linear-gradient(135deg, rgba(12,12,30,0.95) 0%, ${themeColor}18 50%, rgba(12,12,30,0.95) 100%)`
                            : `linear-gradient(135deg, rgba(255,255,255,0.8) 0%, ${themeColor}12 50%, rgba(255,255,255,0.8) 100%)`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                    }}>
                        <div>
                            <Text strong style={{ fontSize: 16 }}>Enterprise Health Overview</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Last updated: {new Date().toLocaleString()} • All modules operational
                            </Text>
                        </div>
                        <Space size={16}>
                            <div style={{ textAlign: 'center' }}>
                                <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
                                <Text style={{ fontSize: 10, display: 'block', color: '#10b981' }}>All Systems Go</Text>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <TrophyOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                                <Text style={{ fontSize: 10, display: 'block', color: '#f59e0b' }}>6/6 Modules</Text>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <FundOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                                <Text style={{ fontSize: 10, display: 'block', color: '#3b82f6' }}>+12% MoM</Text>
                            </div>
                        </Space>
                    </div>
                </motion.div>

                {/* ═══ 1. Executive Summary Cards — 8 KPIs ═══ */}
                <Row gutter={[10, 10]}>
                    {kpis.map((k, i) => (
                        <Col key={i} xs={12} sm={8} md={6} lg={3}>
                            <motion.div {...anim(i + 1)}>
                                <Card size="small" hoverable style={{
                                    ...glassCard,
                                    borderTop: `3px solid ${k.c}`,
                                    background: isDark
                                        ? `linear-gradient(135deg, rgba(12,12,30,0.92) 0%, ${k.c}11 100%)`
                                        : `linear-gradient(135deg, rgba(255,255,255,0.65) 0%, ${k.c}11 100%)`,
                                }}>
                                    {loading ? <Skeleton.Input active size="small" style={{ width: '100%' }} /> : (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>{k.t}</Text>
                                                <span style={{ fontSize: 16, color: k.c }}>{k.i}</span>
                                            </div>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: k.c, lineHeight: 1.2 }}>{k.v}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                                <Tag color={k.up ? 'green' : 'red'} style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>
                                                    {k.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {k.trend}
                                                </Tag>
                                                <Sparkline data={k.spark} color={k.c} />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* ═══ 2. Revenue & Financial Overview — Area Chart + Summary Stats ═══ */}
                <motion.div {...anim(9)}>
                    <Card size="small" style={glassCard} title={
                        <Space>
                            <RiseOutlined style={{ color: '#10b981' }} />
                            <Text strong>Revenue &amp; Financial Overview</Text>
                            <Tag color="blue" style={{ borderRadius: 8 }}>12 months</Tag>
                        </Space>
                    }>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={DEMO_REVENUE}>
                                <defs>
                                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke={isDark ? '#555' : '#ccc'} />
                                <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke={isDark ? '#555' : '#ccc'} tickFormatter={v => `$${v}K`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke={isDark ? '#555' : '#ccc'} tickFormatter={v => `$${v}K`} />
                                <RTooltip contentStyle={{ borderRadius: 10, background: isDark ? '#1a1a2e' : '#fff', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gRev)" strokeWidth={2} name="Revenue ($K)" />
                                <Area yAxisId="right" type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#gExp)" strokeWidth={2} name="Expenses ($K)" />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                        {/* Financial Summary Stats beneath chart */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                            <FinStat label="Total Revenue (12mo)" value={`$${totalRevenue}K`} color="#10b981" icon={<DollarOutlined />} />
                            <FinStat label="Total Expenses (12mo)" value={`$${totalExpenses}K`} color="#ef4444" icon={<FundOutlined />} />
                            <FinStat label="Net Profit" value={`$${totalRevenue - totalExpenses}K`} color="#3b82f6" icon={<RiseOutlined />} />
                            <FinStat label="Net Margin" value={`${netMargin}%`} color="#8b5cf6" icon={<TrophyOutlined />} />
                        </div>
                    </Card>
                </motion.div>

                {/* ═══ 3. Module Health Scorecard ═══ */}
                <motion.div {...anim(10)}>
                    <Card size="small" style={glassCard} title={
                        <Space>
                            <DashboardOutlined style={{ color: '#8b5cf6' }} />
                            <Text strong>Module Health Scorecard</Text>
                            <Tag style={{ borderRadius: 8, fontSize: 10 }}>{healthModules.filter(m => m.status === 'green').length}/{healthModules.length} healthy</Tag>
                        </Space>
                    }>
                        <Row gutter={[10, 10]}>
                            {healthModules.map((m, i) => (
                                <Col key={i} xs={12} sm={8} md={4}>
                                    <motion.div {...anim(11 + i)}>
                                        <Card size="small" hoverable onClick={() => router.push(m.href)}
                                            style={{ ...glassCard, cursor: 'pointer', borderLeft: `3px solid ${m.color}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <Space size={6}>
                                                    <span style={{ color: m.color, fontSize: 16 }}>{m.icon}</span>
                                                    <Text strong style={{ fontSize: 12 }}>{m.name}</Text>
                                                </Space>
                                                <span style={statusDot(m.status)} />
                                            </div>
                                            {m.metrics.map((met, j) => (
                                                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                    <Text type="secondary" style={{ fontSize: 10 }}>{met.label}</Text>
                                                    <Text strong style={{ fontSize: 11, color: m.color }}>{met.value}</Text>
                                                </div>
                                            ))}
                                            <div style={{ textAlign: 'right', marginTop: 4 }}>
                                                <Button type="link" size="small" style={{ fontSize: 9, padding: 0, color: m.color }}>
                                                    Details <RightOutlined />
                                                </Button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

                <Row gutter={[14, 14]}>
                    {/* ═══ 4. Cross-Module Activity Timeline ═══ */}
                    <Col xs={24} lg={12}>
                        <motion.div {...anim(17)}>
                            <Card size="small" style={{ ...glassCard, height: '100%' }} title={
                                <Space>
                                    <ClockCircleOutlined style={{ color: '#06b6d4' }} />
                                    <Text strong>Cross-Module Activity</Text>
                                    <Tag style={{ borderRadius: 8, fontSize: 10 }}>Last 20</Tag>
                                </Space>
                            }>
                                <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                                    <Timeline items={DEMO_TIMELINE.map(e => ({
                                        color: e.color,
                                        children: (
                                            <div>
                                                <Tag color={e.color} style={{ fontSize: 9, borderRadius: 8, margin: 0, marginBottom: 2 }}>{e.module}</Tag>
                                                <br />
                                                <Text strong style={{ fontSize: 11 }}>{e.desc}</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 10 }}>{e.time}</Text>
                                            </div>
                                        ),
                                    }))} />
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* ═══ 5. Department Performance — Radar Chart ═══ */}
                    <Col xs={24} lg={12}>
                        <motion.div {...anim(18)}>
                            <Card size="small" style={{ ...glassCard, height: '100%' }} title={
                                <Space>
                                    <FundProjectionScreenOutlined style={{ color: '#f59e0b' }} />
                                    <Text strong>Department Performance</Text>
                                </Space>
                            }>
                                <ResponsiveContainer width="100%" height={340}>
                                    <RadarChart data={DEMO_RADAR} outerRadius="75%">
                                        <PolarGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} />
                                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#555' }} />
                                        <PolarRadiusAxis tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} domain={[0, 100]} />
                                        <Radar name="Score" dataKey="value" stroke={themeColor} fill={themeColor} fillOpacity={0.25} strokeWidth={2} />
                                        <RTooltip contentStyle={{ borderRadius: 10, background: isDark ? '#1a1a2e' : '#fff', border: 'none' }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                                {/* Performance summary beneath radar */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                    {DEMO_RADAR.map(r => (
                                        <Tag key={r.dim} style={{ fontSize: 10, borderRadius: 8 }}>
                                            {r.dim}: <strong>{r.value}%</strong>
                                        </Tag>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* ═══ 6. Key Risks & Alerts ═══ */}
                <motion.div {...anim(19)}>
                    <Collapse ghost defaultActiveKey={['alerts']} items={[{
                        key: 'alerts',
                        label: (
                            <Space>
                                <WarningOutlined style={{ color: '#ef4444' }} />
                                <Text strong>Key Risks &amp; Alerts</Text>
                                <Tag color="red" style={{ borderRadius: 8 }}>{DEMO_ALERTS.filter(a => a.severity === 'critical').length} critical</Tag>
                                <Tag color="orange" style={{ borderRadius: 8 }}>{DEMO_ALERTS.filter(a => a.severity === 'warning').length} warnings</Tag>
                            </Space>
                        ),
                        children: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {DEMO_ALERTS.map((a, i) => {
                                    const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                                            <div style={{
                                                ...glassCard, padding: '10px 14px',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                borderLeft: `3px solid ${cfg.color}`,
                                            }}>
                                                {cfg.icon}
                                                <div style={{ flex: 1 }}>
                                                    <Text strong style={{ fontSize: 12 }}>{a.title}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 10 }}>{a.module}</Text>
                                                </div>
                                                <Tag color={cfg.tag}
                                                    style={{ fontSize: 9, borderRadius: 8, margin: 0, textTransform: 'uppercase' }}>
                                                    {a.severity}
                                                </Tag>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ),
                    }]} />
                </motion.div>

                {/* ═══ 7. Quarterly Targets vs Actual — Gauges ═══ */}
                <motion.div {...anim(20)}>
                    <Card size="small" style={glassCard} title={
                        <Space>
                            <ThunderboltOutlined style={{ color: '#f97316' }} />
                            <Text strong>Quarterly Targets vs Actual</Text>
                            <Tag color="orange" style={{ borderRadius: 8 }}>Q2 2026</Tag>
                        </Space>
                    }>
                        <Row gutter={[16, 16]} justify="space-around">
                            {[
                                { pct: 87, label: 'Revenue Target', color: '#10b981', sub: '$620K / $710K' },
                                { pct: 82, label: 'Project Delivery', color: '#8b5cf6', sub: '14 / 17 milestones' },
                                { pct: 91, label: 'Customer Satisfaction', color: '#3b82f6', sub: 'NPS: 72 / 80' },
                                { pct: 94, label: 'Employee Retention', color: '#ec4899', sub: '94% retained' },
                            ].map((g, i) => (
                                <Col key={i} xs={12} sm={6}>
                                    <motion.div {...anim(21 + i)} style={{ display: 'flex', justifyContent: 'center' }}>
                                        <Gauge pct={g.pct} label={g.label} color={g.color} subLabel={g.sub} />
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

                {/* ═══ 8. Quick Navigation — Module Shortcuts ═══ */}
                <motion.div {...anim(25)}>
                    <Card size="small" style={glassCard} title={
                        <Space>
                            <ApartmentOutlined style={{ color: '#f97316' }} />
                            <Text strong>Quick Navigation</Text>
                        </Space>
                    }>
                        <Row gutter={[10, 10]}>
                            {[
                                { name: 'HR', stat: `${hr.activeEmployees || 248} employees`, icon: <TeamOutlined />, c: '#10b981', href: '/admin/hr/dashboard' },
                                { name: 'ITSM', stat: `${itsm.openTickets || 23} open tickets`, icon: <ToolOutlined />, c: '#06b6d4', href: '/admin/itsm/dashboard' },
                                { name: 'Projects', stat: `${pm.activeProjects || 14} active`, icon: <ProjectOutlined />, c: '#8b5cf6', href: '/admin/pm/dashboard' },
                                { name: 'CRM', stat: '148 deals', icon: <HeartOutlined />, c: '#ec4899', href: '/admin/crm/dashboard' },
                                { name: 'E-Commerce', stat: `$${((ecom.totalRevenue || 710000) / 1000).toFixed(0)}K rev`, icon: <ShopOutlined />, c: '#f59e0b', href: '/admin/ecommerce/dashboard' },
                                { name: 'Accounting', stat: 'P&L ready', icon: <AccountBookOutlined />, c: '#3b82f6', href: '/admin/accounting/dashboard' },
                                { name: 'Reports', stat: 'Build reports', icon: <FundProjectionScreenOutlined />, c: '#f97316', href: '/admin/reports/dashboard' },
                                { name: 'Notifications', stat: `${notif.successRate || 97}% success`, icon: <BellOutlined />, c: '#14b8a6', href: '/admin/notifications' },
                            ].map((m, i) => (
                                <Col key={i} xs={12} sm={6} md={3}>
                                    <motion.div {...anim(26 + i)}>
                                        <Card size="small" hoverable onClick={() => router.push(m.href)}
                                            style={{ ...glassCard, textAlign: 'center', cursor: 'pointer', borderBottom: `3px solid ${m.c}` }}>
                                            <div style={{ fontSize: 22, color: m.c, marginBottom: 4 }}>{m.icon}</div>
                                            <Text strong style={{ fontSize: 12, display: 'block' }}>{m.name}</Text>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{m.stat}</Text>
                                            <div style={{ marginTop: 6 }}>
                                                <Button type="link" size="small" style={{ fontSize: 10, color: m.c, padding: 0 }}>
                                                    Open <RightOutlined />
                                                </Button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

            </motion.div>
        </CMSLayout>
    );
}
