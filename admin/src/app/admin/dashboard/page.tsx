"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Tag, Space, Progress, message, Typography, Card, Badge, Button, Divider, Timeline, Skeleton, Tooltip, theme } from "antd";
import {
    DashboardOutlined, FileTextOutlined, PictureOutlined,
    TeamOutlined, CustomerServiceOutlined, SolutionOutlined,
    ShoppingCartOutlined, ProjectOutlined, AlertOutlined,
    BugOutlined, SyncOutlined, BookOutlined,
    ClusterOutlined, ThunderboltOutlined, RocketOutlined,
    SafetyOutlined, FieldTimeOutlined, CloudUploadOutlined,
    WarningOutlined, CheckCircleOutlined,
    ArrowRightOutlined, BarChartOutlined,
    BuildOutlined, DatabaseOutlined,
    ShopOutlined, AppstoreOutlined,
    PlayCircleOutlined, CalendarOutlined, BellOutlined,
    DollarOutlined, WalletOutlined, HeartOutlined,
    ShoppingOutlined, CreditCardOutlined, AuditOutlined,
    LinkOutlined, LockOutlined, FileSearchOutlined,
    InboxOutlined, CodeOutlined, ToolOutlined,
    HistoryOutlined, ApiOutlined, ContainerOutlined,
    FundProjectionScreenOutlined, ExperimentOutlined,
    FormOutlined, StarOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { supaRest } from "@/lib/supaRest";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

/* ═══ New Dashboard Components ═══ */
import {
    DashboardStyles, DASH_COLORS, DASH_CARD,
    PlatformOverviewBar,
    HealthIndicatorCards,
    SLAQualityCard,
    CRMSummaryCard,
    ITSMModulesCard,
    ModuleQuickCards,
} from "@/components/dashboard";

const { Title, Text } = Typography;
const DEFAULT_TENANT = 'default';

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const GET_ITSM_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalSlaBreach avgResolutionHours slaCompliance totalTickets byCritical byHigh byMedium byLow } }`;
const GET_ITSM_MODULES = `query { itsmModuleCounts { serviceRequests { total open } problems { total open knownErrors } changes { total open } knowledge { total published } } }`;
const GET_CRM_STATS = `query { crmDashboard(tenantId: "${DEFAULT_TENANT}") { totalIndividuals totalAccounts totalContacts totalDeals openDeals pipelineValue wonValue totalActivities openActivities totalCases openCases criticalCases totalCampaigns activeCampaigns campaignBudget totalQuotes quotesValue acceptedQuotes totalProducts } }`;

const fmtCurrency = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

export default function DashboardPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [itsm, setItsm] = useState<any>(null);
    const [itsmMod, setItsmMod] = useState<any>(null);
    const [crm, setCrm] = useState<any>(null);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    // ITIL v4
    const [cmdbCount, setCmdbCount] = useState(0);
    const [eventsOpen, setEventsOpen] = useState(0);
    const [eventsCrit, setEventsCrit] = useState(0);
    const [releasesActive, setReleasesActive] = useState(0);
    const [agentsActive, setAgentsActive] = useState(0);
    const [agentsUtil, setAgentsUtil] = useState(0);
    const [plansActive, setPlansActive] = useState(0);
    const [avgAvail, setAvgAvail] = useState(0);
    const [depsCompleted, setDepsCompleted] = useState(0);
    const [depsTotal, setDepsTotal] = useState(0);
    // Ops module
    const [opsPlaybooks, setOpsPlaybooks] = useState(0);
    const [opsActiveRuns, setOpsActiveRuns] = useState(0);
    const [opsOverdue, setOpsOverdue] = useState(0);
    const [opsSchedules, setOpsSchedules] = useState(0);
    const [notifHealth, setNotifHealth] = useState<{ dispatched: number; delivered: number; failRate: number }>({ dispatched: 0, delivered: 0, failRate: 0 });
    // Cross-module: Commerce, Accounting, HR
    const [commerce, setCommerce] = useState<{ orders: number; revenue: number; pending: number; customers: number }>({ orders: 0, revenue: 0, pending: 0, customers: 0 });
    const [accounting, setAccounting] = useState<{ balance: number; payables: number; receivables: number; journalEntries: number }>({ balance: 0, payables: 0, receivables: 0, journalEntries: 0 });
    const [hrStats, setHrStats] = useState<{ employees: number; departments: number; pendingLeave: number; openPositions: number }>({ employees: 0, departments: 0, pendingLeave: 0, openPositions: 0 });
    // New widgets state
    const [pmStats, setPmStats] = useState<{ projects: number; tasks: number; sprints: number }>({ projects: 0, tasks: 0, sprints: 0 });
    const [secStats, setSecStats] = useState<{ events: number; auditLogs: number; policies: number }>({ events: 0, auditLogs: 0, policies: 0 });
    const [devopsStats, setDevopsStats] = useState<{ pipelines: number; builds: number; workflows: number }>({ pipelines: 0, builds: 0, workflows: 0 });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [platformCounts, setPlatformCounts] = useState<{ tables: number; modules: number; resolvers: number; extensions: number }>({ tables: 207, modules: 16, resolvers: 37, extensions: 72 });
    const [formsStats, setFormsStats] = useState<{ templates: number; published: number; submissions: number; pending: number; avgScore: number }>({ templates: 0, published: 0, submissions: 0, pending: 0, avgScore: 0 });
    const [wmsStats, setWmsStats] = useState<{ items: number; warehouses: number; wmsActive: number; binContents: number; pendingPutaway: number; pendingPick: number }>({ items: 0, warehouses: 0, wmsActive: 0, binContents: 0, pendingPutaway: 0, pendingPick: 0 });
    const [fmStats, setFmStats] = useState<{ dcimRacks: number; bmsAlarms: number; scadaTags: number; bimModels: number }>({ dcimRacks: 0, bmsAlarms: 0, scadaTags: 0, bimModels: 0 });

    useEffect(() => {
        (async () => {
            try {
                const [is, im, cs] = await Promise.all([
                    gql(GET_ITSM_STATS), gql(GET_ITSM_MODULES), gql(GET_CRM_STATS),
                ]);
                setItsm(is.itsmDashboardStats);
                setItsmMod(im.itsmModuleCounts);
                setCrm(cs.crmDashboard);
                // ITIL v4 aggregates
                const [cis, events, releases, agents, conts, avails, deps] = await Promise.all([
                    supaRest('itsm_configuration_items', { select: 'id' }),
                    supaRest('itsm_events', { select: 'id,severity,status' }),
                    supaRest('itsm_releases', { select: 'id,status' }),
                    supaRest('itsm_agents', { select: 'id,status,current_ticket_count,max_tickets' }),
                    supaRest('itsm_continuity_plans', { select: 'id,status' }),
                    supaRest('itsm_availability_records', { select: 'id,availability_pct' }),
                    supaRest('itsm_deployments', { select: 'id,status' }),
                ]);
                setCmdbCount(cis.length);
                const openEvts = events.filter((e: any) => e.status !== 'closed');
                setEventsOpen(openEvts.length);
                setEventsCrit(openEvts.filter((e: any) => e.severity === 'critical' || e.severity === 'high').length);
                setReleasesActive(releases.filter((r: any) => !['deployed', 'cancelled', 'rolled_back'].includes(r.status)).length);
                const activeA = agents.filter((a: any) => a.status === 'active');
                setAgentsActive(activeA.length);
                setAgentsUtil(activeA.length > 0 ? Math.round(activeA.reduce((s: number, a: any) => s + ((a.current_ticket_count || 0) / (a.max_tickets || 10) * 100), 0) / activeA.length) : 0);
                setPlansActive(conts.filter((p: any) => p.status === 'active').length);
                setAvgAvail(avails.length > 0 ? +(avails.reduce((s: number, r: any) => s + (r.availability_pct || 0), 0) / avails.length).toFixed(2) : 0);
                setDepsCompleted(deps.filter((d: any) => d.status === 'completed').length);
                setDepsTotal(deps.length);
                // Ops module data
                try {
                    const [opsPb, opsRn, opsSch, notifLogs] = await Promise.all([
                        gql(`query($t: String!) { opsPlaybooks(tenantId: $t) { id } }`, { t: DEFAULT_TENANT }),
                        gql(`query($t: String!) { opsRuns(tenantId: $t) { id status dueAt } }`, { t: DEFAULT_TENANT }),
                        gql(`query($t: String!) { opsSchedules(tenantId: $t) { id isActive } }`, { t: DEFAULT_TENANT }),
                        gql(`query($t: String!) { notificationLogs(tenantId: $t) { id status } }`, { t: DEFAULT_TENANT }),
                    ]);
                    setOpsPlaybooks((opsPb.opsPlaybooks || []).length);
                    const runs = opsRn.opsRuns || [];
                    setOpsActiveRuns(runs.filter((r: any) => r.status === 'in_progress').length);
                    setOpsOverdue(runs.filter((r: any) => r.dueAt && dayjs(r.dueAt).isBefore(dayjs()) && r.status !== 'completed').length);
                    setOpsSchedules((opsSch.opsSchedules || []).filter((s: any) => s.isActive).length);
                    const logs = notifLogs.notificationLogs || [];
                    const sent = logs.filter((l: any) => l.status === 'sent').length;
                    const failed = logs.filter((l: any) => l.status === 'failed').length;
                    setNotifHealth({ dispatched: logs.length, delivered: sent, failRate: logs.length > 0 ? Math.round((failed / logs.length) * 100) : 0 });
                } catch { /* ignore ops data errors */ }
                // Cross-module: Commerce + Accounting + HR
                try {
                    const [orders, products, customers, accounts, journals, payables, receivables, employees, departments, leaves] = await Promise.all([
                        supaRest('ecommerce_orders', { select: 'id,status,total_amount' }),
                        supaRest('ecommerce_products', { select: 'id' }),
                        supaRest('ecommerce_customers', { select: 'id' }),
                        supaRest('accounting_accounts', { select: 'id,balance' }),
                        supaRest('accounting_journal_entries', { select: 'id' }),
                        supaRest('accounting_payables', { select: 'id,amount,status' }),
                        supaRest('accounting_receivables', { select: 'id,amount,status' }),
                        supaRest('hr_employees', { select: 'id,employment_status' }),
                        supaRest('hr_departments', { select: 'id' }),
                        supaRest('hr_leave_requests', { select: 'id,status' }),
                    ]);
                    const totalRev = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
                    const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing').length;
                    setCommerce({ orders: orders.length, revenue: totalRev, pending: pendingOrders, customers: customers.length });
                    const totalBal = accounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
                    const totalAP = payables.filter((p: any) => p.status !== 'paid').reduce((s: number, p: any) => s + (p.amount || 0), 0);
                    const totalAR = receivables.filter((r: any) => r.status !== 'collected').reduce((s: number, r: any) => s + (r.amount || 0), 0);
                    setAccounting({ balance: totalBal, payables: totalAP, receivables: totalAR, journalEntries: journals.length });
                    const activeEmp = employees.filter((e: any) => e.employment_status === 'active').length;
                    const pendingLeave = leaves.filter((l: any) => l.status === 'pending').length;
                    setHrStats({ employees: activeEmp, departments: departments.length, pendingLeave, openPositions: 0 });
                } catch { /* tables may not exist yet */ }
                // ── Project Management widget ──
                try {
                    const [pmProjects, pmTasks, pmSprints] = await Promise.all([
                        supaRest('pm_projects', { select: 'id' }),
                        supaRest('pm_tasks', { select: 'id' }),
                        supaRest('pm_sprints', { select: 'id' }),
                    ]);
                    setPmStats({ projects: pmProjects.length, tasks: pmTasks.length, sprints: pmSprints.length });
                } catch { /* pm tables may not exist */ }
                // ── Security & Audit widget ──
                try {
                    const [secEvts, audLogs, secPol] = await Promise.all([
                        supaRest('security_events', { select: 'id' }),
                        supaRest('audit_logs', { select: 'id' }),
                        supaRest('security_policies', { select: 'id' }),
                    ]);
                    setSecStats({ events: secEvts.length, auditLogs: audLogs.length, policies: secPol.length });
                } catch { /* security tables may not exist */ }
                // ── DevOps & Automation widget ──
                try {
                    const [pipes, builds, wflows] = await Promise.all([
                        supaRest('devops_pipelines', { select: 'id' }),
                        supaRest('devops_builds', { select: 'id' }),
                        supaRest('automation_workflows', { select: 'id' }),
                    ]);
                    setDevopsStats({ pipelines: pipes.length, builds: builds.length, workflows: wflows.length });
                } catch { /* devops tables may not exist */ }
                // ── Recent Activity Feed ──
                try {
                    const actLogs = await supaRest('audit_logs', { select: '*', order: 'created_at.desc', limit: 10 });
                    setRecentActivity(actLogs || []);
                } catch { /* audit_logs may not exist */ }
                // ── Platform overview counts ──
                try {
                    const [extRows] = await Promise.all([
                        supaRest('pg_available_extensions' as any, { select: 'name', limit: 500 }),
                    ]);
                    setPlatformCounts(prev => ({ ...prev, extensions: Array.isArray(extRows) ? extRows.length : prev.extensions }));
                } catch { /* keep defaults */ }
                // ── Forms & KPI stats ──
                try {
                    const [fTpls, fSubs] = await Promise.all([
                        supaRest('form_templates', { select: 'id,status' }),
                        supaRest('form_submissions', { select: 'id,status,percentage' }),
                    ]);
                    const published = fTpls.filter((t: any) => t.status === 'published').length;
                    const pending = fSubs.filter((s: any) => s.status === 'submitted' || s.status === 'draft').length;
                    const scored = fSubs.filter((s: any) => (s.percentage || 0) > 0);
                    const avg = scored.length > 0 ? scored.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / scored.length : 0;
                    setFormsStats({ templates: fTpls.length, published, submissions: fSubs.length, pending, avgScore: Math.round(avg) });
                } catch { /* form tables may not exist */ }
                // ── Inventory & WMS widget ──
                try {
                    const wmsData = await gql(`query($t: String!) { wmsStats(tenantId: $t) { pendingPutaway inProgressPutaway completedPutaway pendingPick inProgressPick completedPick totalBinContents } }`, { t: DEFAULT_TENANT });
                    const [invItems, invWh] = await Promise.all([
                        supaRest('inv_items', { select: 'id' }),
                        supaRest('inv_warehouses', { select: 'id' }),
                    ]);
                    const ws = wmsData.wmsStats || {};
                    setWmsStats({
                        items: invItems.length,
                        warehouses: invWh.length,
                        wmsActive: (ws.inProgressPutaway || 0) + (ws.inProgressPick || 0),
                        binContents: ws.totalBinContents || 0,
                        pendingPutaway: ws.pendingPutaway || 0,
                        pendingPick: ws.pendingPick || 0,
                    });
                } catch { /* inventory/wms tables may not exist */ }
                // ── Facility Management widget ──
                try {
                    const [dcimRacks, bmsAlarms, scadaTags, bimModels] = await Promise.all([
                        supaRest('dcim_racks', { select: 'id' }),
                        supaRest('bms_alarm_events', { select: 'id' }),
                        supaRest('scada_tags', { select: 'id' }),
                        supaRest('bim_models', { select: 'id' }),
                    ]);
                    setFmStats({ dcimRacks: dcimRacks.length, bmsAlarms: bmsAlarms.length, scadaTags: scadaTags.length, bimModels: bimModels.length });
                } catch { /* fm tables may not exist yet */ }
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    /* ═══ Shared card wrapper for remaining inline sections ═══ */
    const DashCard: React.FC<{ title: React.ReactNode; extra?: React.ReactNode; accentColor?: string; delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, extra, accentColor, delay = 0, children, style }) => (
        <div className="dash-card-new" style={{
            background: DASH_COLORS.surface,
            border: DASH_CARD.border,
            borderRadius: DASH_CARD.borderRadius,
            padding: DASH_CARD.padding,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            animationDelay: `${delay}ms`,
            ...style,
        }}>
            {accentColor && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text strong style={{ fontSize: 14, color: DASH_COLORS.textPrimary }}>{title}</Text>
                {extra}
            </div>
            {children}
        </div>
    );

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Dashboard</AuroraText>}
            subTitle={<DecryptedText text="NusantaraSoft Enterprise Platform" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <DashboardStyles />
        <div style={{ padding: 24, background: DASH_COLORS.background, minHeight: '100vh' }}>
            {contextHolder}

            {/* ══════ HEADER ══════ */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Space align="center" size={12}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${themeColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DashboardOutlined style={{ fontSize: 22, color: themeColor }} />
                        </div>
                        <div>
                            <Title level={3} style={{ margin: 0, fontSize: 22, color: DASH_COLORS.textPrimary }}>Enterprise Command Center</Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>Real-time overview of all platform modules</Text>
                        </div>
                    </Space>
                    <Space size={8}>
                        <Tag style={{ borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#3b82f6', fontWeight: 500 }}>{platformCounts.tables} Tables</Tag>
                        <Tag style={{ borderRadius: 8, border: '1px solid #a5f3fc', background: '#ecfeff', color: '#06b6d4', fontWeight: 500 }}>{platformCounts.modules} Modules</Tag>
                        <Tag style={{ borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}>All Systems Operational</Tag>
                    </Space>
                </div>
            </motion.div>

            {/* ══════ PLATFORM OVERVIEW ══════ */}
            <PlatformOverviewBar counts={platformCounts} loading={loading} />

            {/* ══════ ROW 1: Health Indicators ══════ */}
            <HealthIndicatorCards itsm={itsm} crm={crm} avgAvail={avgAvail} eventsCrit={eventsCrit} agentsActive={agentsActive} agentsUtil={agentsUtil} loading={loading} themeColor={themeColor} />

            {/* ══════ ROW 2: SLA + CRM + ITSM ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ height: '100%' }}>
                        <SLAQualityCard itsm={itsm} itsmMod={itsmMod} loading={loading} />
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ height: '100%' }}>
                        <CRMSummaryCard crm={crm} loading={loading} onNavigate={() => router.push('/admin/crm/dashboard')} />
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ height: '100%' }}>
                        <ITSMModulesCard itsm={itsm} itsmMod={itsmMod} cmdbCount={cmdbCount} eventsOpen={eventsOpen} eventsCrit={eventsCrit} releasesActive={releasesActive} depsCompleted={depsCompleted} depsTotal={depsTotal} loading={loading} themeColor={themeColor} onNavigate={() => router.push('/admin/itsm/dashboard')} />
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 2.5: Operations · Notifications · PM ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><PlayCircleOutlined style={{ color: DASH_COLORS.purple }} /> Operations</Space>} extra={<a onClick={() => router.push('/admin/ops/dashboard')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor={DASH_COLORS.purple} delay={200}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Playbooks" value={opsPlaybooks} valueStyle={{ fontSize: 18, color: DASH_COLORS.purple }} /></Col>
                                    <Col span={12}><Statistic title="Active Runs" value={opsActiveRuns} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} /></Col>
                                    <Col span={12}><Statistic title="Schedules" value={opsSchedules} valueStyle={{ fontSize: 18, color: DASH_COLORS.cyan }} /></Col>
                                    <Col span={12}><Statistic title="Overdue" value={opsOverdue} valueStyle={{ fontSize: 18, color: opsOverdue > 0 ? DASH_COLORS.red : DASH_COLORS.green }} prefix={opsOverdue > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col>
                                </Row>
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><BellOutlined style={{ color: DASH_COLORS.blue }} /> Notification Health</Space>} extra={<a onClick={() => router.push('/admin/notifications/analytics')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} delay={260}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (<>
                                <div style={{ textAlign: 'center', padding: '4px 0' }}>
                                    <Progress type="circle" percent={100 - notifHealth.failRate} size={80}
                                        strokeColor={notifHealth.failRate <= 5 ? DASH_COLORS.green : notifHealth.failRate <= 15 ? DASH_COLORS.amber : DASH_COLORS.red}
                                        trailColor="rgba(0,0,0,0.04)"
                                        format={() => `${100 - notifHealth.failRate}%`} />
                                </div>
                                <Row gutter={8} style={{ textAlign: 'center', marginTop: 8 }}>
                                    <Col span={8}><Text style={{ fontSize: 11 }}>Dispatched<br /><Text strong>{notifHealth.dispatched}</Text></Text></Col>
                                    <Col span={8}><Text style={{ fontSize: 11 }}>Delivered<br /><Text strong style={{ color: DASH_COLORS.green }}>{notifHealth.delivered}</Text></Text></Col>
                                    <Col span={8}><Text style={{ fontSize: 11 }}>Fail Rate<br /><Text strong type={notifHealth.failRate > 10 ? 'danger' : undefined}>{notifHealth.failRate}%</Text></Text></Col>
                                </Row>
                            </>)}
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><ProjectOutlined style={{ color: DASH_COLORS.teal }} /> Project Management</Space>} extra={<a onClick={() => router.push('/admin/pm/portfolio')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} delay={320}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Projects" value={pmStats.projects} valueStyle={{ fontSize: 18, color: DASH_COLORS.teal }} prefix={<FundProjectionScreenOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Tasks" value={pmStats.tasks} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} prefix={<FileSearchOutlined />} /></Col>
                                    <Col span={24}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Sprint Progress · Sprints: {pmStats.sprints}</Text>
                                        <Progress percent={pmStats.tasks > 0 ? Math.min(Math.round((pmStats.projects / Math.max(pmStats.tasks, 1)) * 100), 100) : 0} strokeColor={{ from: DASH_COLORS.teal, to: DASH_COLORS.blue }} size="small" />
                                    </Col>
                                </Row>
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 3: Commerce · Accounting · HR ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><ShopOutlined style={{ color: DASH_COLORS.pink }} /> Commerce & Sales</Space>} extra={<a onClick={() => router.push('/admin/ecommerce/dashboard')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor={DASH_COLORS.pink}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (<>
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Revenue" value={fmtCurrency(commerce.revenue)} prefix="Rp" valueStyle={{ fontSize: 18, color: DASH_COLORS.green }} /></Col>
                                    <Col span={12}><Statistic title="Orders" value={commerce.orders} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} /></Col>
                                    <Col span={12}><Statistic title="Pending" value={commerce.pending} valueStyle={{ fontSize: 18, color: commerce.pending > 0 ? DASH_COLORS.amber : DASH_COLORS.green }} prefix={commerce.pending > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Customers" value={commerce.customers} valueStyle={{ fontSize: 18, color: DASH_COLORS.teal }} /></Col>
                                </Row>
                                <Divider style={{ margin: '8px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkOutlined style={{ color: DASH_COLORS.blue, fontSize: 12 }} /><Text type="secondary" style={{ fontSize: 11 }}>Synced with CRM Contacts · Auto-journals to Accounting</Text></div>
                            </>)}
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><AuditOutlined style={{ color: '#722ed1' }} /> Accounting & Finance</Space>} extra={<a onClick={() => router.push('/admin/accounting/dashboard')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor="#722ed1">
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (<>
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Net Balance" value={fmtCurrency(accounting.balance)} prefix="Rp" valueStyle={{ fontSize: 18, color: '#722ed1' }} /></Col>
                                    <Col span={12}><Statistic title="Journal Entries" value={accounting.journalEntries} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} /></Col>
                                    <Col span={12}><Statistic title={<span style={{ color: DASH_COLORS.red }}>Payables (AP)</span>} value={fmtCurrency(accounting.payables)} prefix="Rp" valueStyle={{ fontSize: 16, color: DASH_COLORS.red }} /></Col>
                                    <Col span={12}><Statistic title={<span style={{ color: DASH_COLORS.green }}>Receivables (AR)</span>} value={fmtCurrency(accounting.receivables)} prefix="Rp" valueStyle={{ fontSize: 16, color: DASH_COLORS.green }} /></Col>
                                </Row>
                                <Divider style={{ margin: '8px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkOutlined style={{ color: '#722ed1', fontSize: 12 }} /><Text type="secondary" style={{ fontSize: 11 }}>Commerce orders → Journals · HR payroll → AP entries</Text></div>
                            </>)}
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><HeartOutlined style={{ color: DASH_COLORS.red }} /> HR & People</Space>} extra={<a onClick={() => router.push('/admin/hr/dashboard')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor={DASH_COLORS.red}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (<>
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Active Employees" value={hrStats.employees} valueStyle={{ fontSize: 18, color: DASH_COLORS.red }} prefix={<TeamOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Departments" value={hrStats.departments} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} /></Col>
                                    <Col span={12}><Statistic title="Pending Leave" value={hrStats.pendingLeave} valueStyle={{ fontSize: 18, color: hrStats.pendingLeave > 0 ? DASH_COLORS.amber : DASH_COLORS.green }} /></Col>
                                    <Col span={12}><Statistic title="Open Positions" value={hrStats.openPositions} valueStyle={{ fontSize: 18, color: DASH_COLORS.purple }} /></Col>
                                </Row>
                                <Divider style={{ margin: '8px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkOutlined style={{ color: DASH_COLORS.red, fontSize: 12 }} /><Text type="secondary" style={{ fontSize: 11 }}>Payroll → Accounting AP · Headcount → PM capacity</Text></div>
                            </>)}
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 3.25: Forms & KPI ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
                        <DashCard title={<Space size={8}><FormOutlined style={{ color: DASH_COLORS.purple }} /> Forms & KPI Evaluations</Space>} extra={<a onClick={() => router.push('/admin/forms/templates')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor={DASH_COLORS.purple} delay={350}>
                            {loading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
                                <Row gutter={[16, 12]}>
                                    <Col xs={12} sm={6} md={4}><Statistic title="Templates" value={formsStats.templates} valueStyle={{ fontSize: 18, color: DASH_COLORS.purple }} prefix={<FileTextOutlined />} /></Col>
                                    <Col xs={12} sm={6} md={4}><Statistic title="Published" value={formsStats.published} valueStyle={{ fontSize: 18, color: DASH_COLORS.green }} prefix={<CheckCircleOutlined />} /></Col>
                                    <Col xs={12} sm={6} md={4}><Statistic title="Submissions" value={formsStats.submissions} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} prefix={<InboxOutlined />} /></Col>
                                    <Col xs={12} sm={6} md={4}><Statistic title="Pending Review" value={formsStats.pending} valueStyle={{ fontSize: 18, color: formsStats.pending > 0 ? DASH_COLORS.amber : DASH_COLORS.green }} prefix={formsStats.pending > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col>
                                    <Col xs={12} sm={6} md={4}><Statistic title="Avg Score" value={formsStats.avgScore} suffix="%" valueStyle={{ fontSize: 18, color: formsStats.avgScore >= 80 ? DASH_COLORS.green : formsStats.avgScore >= 60 ? DASH_COLORS.amber : DASH_COLORS.red }} prefix={<StarOutlined />} /></Col>
                                    <Col xs={12} sm={6} md={4}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                                            <Button size="small" type="primary" onClick={() => router.push('/admin/forms/templates')} style={{ background: DASH_COLORS.purple, borderColor: DASH_COLORS.purple, fontSize: 11, borderRadius: 8 }} icon={<FormOutlined />}>Manage Forms</Button>
                                            <Button size="small" onClick={() => router.push('/admin/forms/kpi')} style={{ fontSize: 11, borderRadius: 8 }} icon={<BarChartOutlined />}>KPI Dashboard</Button>
                                        </div>
                                    </Col>
                                </Row>
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 3.5: Facility Management ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <DashCard title={<Space size={8}><BuildOutlined style={{ color: '#0ea5e9' }} /> Facility Management (Digital Twin)</Space>} extra={<a onClick={() => router.push('/admin/dcim/dashboard')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor="#0ea5e9" delay={360}>
                            {loading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
                                <Row gutter={[16, 12]}>
                                    <Col xs={12} sm={6}><Statistic title="DCIM (Racks)" value={fmStats.dcimRacks} valueStyle={{ fontSize: 18, color: '#0ea5e9' }} prefix={<DatabaseOutlined />} /></Col>
                                    <Col xs={12} sm={6}><Statistic title="BMS (Alarms)" value={fmStats.bmsAlarms} valueStyle={{ fontSize: 18, color: DASH_COLORS.amber }} prefix={<AlertOutlined />} /></Col>
                                    <Col xs={12} sm={6}><Statistic title="SCADA (Tags)" value={fmStats.scadaTags} valueStyle={{ fontSize: 18, color: DASH_COLORS.green }} prefix={<ApiOutlined />} /></Col>
                                    <Col xs={12} sm={6}><Statistic title="BIM (Models)" value={fmStats.bimModels} valueStyle={{ fontSize: 18, color: DASH_COLORS.purple }} prefix={<PictureOutlined />} /></Col>
                                </Row>
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 3.75: Inventory · Security · DevOps ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><InboxOutlined style={{ color: DASH_COLORS.green }} /> Inventory & WMS</Space>} extra={<a onClick={() => router.push('/admin/inventory')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor={DASH_COLORS.green} delay={380}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (<>
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Items" value={wmsStats.items} valueStyle={{ fontSize: 18, color: DASH_COLORS.green }} prefix={<ShoppingOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Warehouses" value={wmsStats.warehouses} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} prefix={<ContainerOutlined />} /></Col>
                                    <Col span={12}><Statistic title="WMS Active" value={wmsStats.wmsActive} valueStyle={{ fontSize: 18, color: wmsStats.wmsActive > 0 ? DASH_COLORS.amber : DASH_COLORS.green }} prefix={wmsStats.wmsActive > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Bin Contents" value={wmsStats.binContents} valueStyle={{ fontSize: 18, color: DASH_COLORS.purple }} prefix={<BuildOutlined />} /></Col>
                                </Row>
                                <Divider style={{ margin: '8px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <LinkOutlined style={{ color: DASH_COLORS.green, fontSize: 12 }} />
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {wmsStats.pendingPutaway > 0 && <Tag color="orange" style={{ fontSize: 10, borderRadius: 8 }}>{wmsStats.pendingPutaway} pending put-away</Tag>}
                                        {wmsStats.pendingPick > 0 && <Tag color="blue" style={{ fontSize: 10, borderRadius: 8 }}>{wmsStats.pendingPick} pending pick</Tag>}
                                        {wmsStats.pendingPutaway === 0 && wmsStats.pendingPick === 0 && 'All WMS operations up to date'}
                                    </Text>
                                </div>
                            </>)}
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><LockOutlined style={{ color: DASH_COLORS.red }} /> Security & Audit</Space>} extra={<Tooltip title="Security overview"><SafetyOutlined /></Tooltip>} accentColor={DASH_COLORS.red} delay={440}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Security Events" value={secStats.events} valueStyle={{ fontSize: 18, color: secStats.events > 0 ? DASH_COLORS.red : DASH_COLORS.green }} prefix={<AlertOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Audit Entries" value={secStats.auditLogs} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} prefix={<FileSearchOutlined />} /></Col>
                                    <Col span={24}>
                                        <Statistic title="Active Policies" value={secStats.policies} valueStyle={{ fontSize: 18, color: '#722ed1' }} prefix={<SafetyOutlined />} />
                                        {secStats.events === 0 && <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginTop: 4, borderRadius: 8 }}>No active threats</Tag>}
                                    </Col>
                                </Row>
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><CodeOutlined style={{ color: DASH_COLORS.purple }} /> DevOps & Automation</Space>} extra={<a onClick={() => router.push('/admin/devops/gitlab')} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary }}><ArrowRightOutlined /></a>} accentColor={DASH_COLORS.purple} delay={500}>
                            {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                                <Row gutter={[8, 12]}>
                                    <Col span={12}><Statistic title="Pipelines" value={devopsStats.pipelines} valueStyle={{ fontSize: 18, color: DASH_COLORS.purple }} prefix={<ToolOutlined />} /></Col>
                                    <Col span={12}><Statistic title="Builds" value={devopsStats.builds} valueStyle={{ fontSize: 18, color: DASH_COLORS.blue }} prefix={<BuildOutlined />} /></Col>
                                    <Col span={24}><Statistic title="Automation Workflows" value={devopsStats.workflows} valueStyle={{ fontSize: 18, color: DASH_COLORS.cyan }} prefix={<SyncOutlined />} /></Col>
                                </Row>
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 4: ITIL v4 Module Quick Status ══════ */}
            <ModuleQuickCards cmdbCount={cmdbCount} eventsOpen={eventsOpen} eventsCrit={eventsCrit} releasesActive={releasesActive} agentsActive={agentsActive} agentsUtil={agentsUtil} plansActive={plansActive} depsCompleted={depsCompleted} depsTotal={depsTotal} loading={loading} themeColor={themeColor} onNavigate={(path) => router.push(path)} />

            {/* ══════ ROW 5: Recent Activity ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <DashCard title={<Space size={8}><HistoryOutlined style={{ color: themeColor }} /> Recent Activity</Space>} extra={<Tag style={{ borderRadius: 8, background: `${themeColor}12`, color: themeColor, border: `1px solid ${themeColor}30` }}>{recentActivity.length} entries</Tag>} accentColor={themeColor} delay={560}>
                            {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : recentActivity.length === 0 ? (
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>No recent activity recorded</Text>
                            ) : (
                                <Timeline style={{ marginTop: 8 }}
                                    items={recentActivity.map((log: any, idx: number) => ({
                                        color: idx === 0 ? themeColor : idx < 3 ? DASH_COLORS.blue : '#d9d9d9',
                                        children: (
                                            <motion.div key={log.id || idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <Text strong style={{ fontSize: 13 }}>{log.action || log.event_type || 'System Event'}</Text>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{log.created_at ? dayjs(log.created_at).fromNow() : ''}</Text>
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {log.module && <Tag style={{ fontSize: 10, borderRadius: 6 }}>{log.module}</Tag>}
                                                    {log.entity_type && <Tag color="default" style={{ fontSize: 10, borderRadius: 6 }}>{log.entity_type}</Tag>}
                                                    {log.user_id && <span>by {String(log.user_id).slice(0, 8)}…</span>}
                                                </Text>
                                            </motion.div>
                                        ),
                                    }))}
                                />
                            )}
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>

            {/* ══════ ROW 6: Quick Actions & Module Links ══════ */}
            <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><RocketOutlined style={{ color: themeColor }} /> Quick Actions</Space>}>
                            <Row gutter={[8, 8]}>
                                {[
                                    { label: 'New Incident', href: '/admin/itsm/tickets', color: themeColor, icon: <AlertOutlined /> },
                                    { label: 'New Page', href: '/admin/pages/builder', color: DASH_COLORS.amber, icon: <FileTextOutlined /> },
                                    { label: 'New Order', href: '/admin/ecommerce/orders', color: DASH_COLORS.pink, icon: <ShoppingCartOutlined /> },
                                    { label: 'New Employee', href: '/admin/hr/employees', color: DASH_COLORS.red, icon: <TeamOutlined /> },
                                    { label: 'Journal Entry', href: '/admin/accounting/journals', color: '#722ed1', icon: <AuditOutlined /> },
                                    { label: 'New Deal', href: '/admin/crm/deals', color: DASH_COLORS.blue, icon: <SolutionOutlined /> },
                                    { label: 'Run Playbook', href: '/admin/ops/playbooks', color: DASH_COLORS.purple, icon: <PlayCircleOutlined /> },
                                    { label: 'AI Studio', href: '/admin/ai-studio', color: '#2f54eb', icon: <DatabaseOutlined /> },
                                    { label: 'Manage Users', href: '/admin/users/list', color: DASH_COLORS.teal, icon: <TeamOutlined /> },
                                    { label: 'Notifications', href: '/admin/notifications/inbox', color: DASH_COLORS.cyan, icon: <BellOutlined /> },
                                ].map(a => (
                                    <Col span={12} key={a.label}>
                                        <Button type="text" block style={{ textAlign: 'left', height: 'auto', padding: '8px 12px', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, transition: 'all 0.2s' }} onClick={() => router.push(a.href)}>
                                            <Space><span style={{ color: a.color }}>{a.icon}</span><Text style={{ fontSize: 12 }}>{a.label}</Text></Space>
                                        </Button>
                                    </Col>
                                ))}
                            </Row>
                        </DashCard>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} style={{ height: '100%' }}>
                        <DashCard title={<Space size={8}><AppstoreOutlined style={{ color: themeColor }} /> Platform Modules <Tag style={{ borderRadius: 8, background: `${themeColor}12`, color: themeColor, border: `1px solid ${themeColor}30`, fontSize: 11 }}>16</Tag></Space>}>
                            <Row gutter={[8, 8]}>
                                {[
                                    { name: 'Content Studio', count: 'Pages & Media', color: DASH_COLORS.amber, href: '/admin/pages/list' },
                                    { name: 'CRM', count: `${crm?.totalIndividuals || 0} leads`, color: DASH_COLORS.blue, href: '/admin/crm/dashboard' },
                                    { name: 'ITSM', count: `${itsm?.totalTickets || 0} tickets`, color: themeColor, href: '/admin/itsm/dashboard' },
                                    { name: 'Commerce', count: `${commerce.orders} orders`, color: DASH_COLORS.pink, href: '/admin/ecommerce/dashboard' },
                                    { name: 'Inventory', count: 'Items & Stock', color: DASH_COLORS.green, href: '/admin/inventory/items' },
                                    { name: 'Accounting', count: `${accounting.journalEntries} entries`, color: '#722ed1', href: '/admin/accounting/dashboard' },
                                    { name: 'HR & People', count: `${hrStats.employees} staff`, color: DASH_COLORS.red, href: '/admin/hr/dashboard' },
                                    { name: 'Projects', count: 'Tasks & Sprints', color: DASH_COLORS.teal, href: '/admin/pm/portfolio' },
                                    { name: 'News & Intel', count: 'Sentiment & Crawl', color: '#2f54eb', href: '/admin/news/dashboard' },
                                    { name: 'AI Studio', count: 'ML Models', color: DASH_COLORS.blue, href: '/admin/ai-studio' },
                                    { name: 'DevOps', count: 'CI/CD & Automation', color: DASH_COLORS.purple, href: '/admin/devops/gitlab' },
                                    { name: 'Platform', count: 'Infra & Monitoring', color: '#fa541c', href: '/admin/infrastructure/docker' },
                                    { name: 'DCIM', count: 'Data Center', color: '#0ea5e9', href: '/admin/dcim/dashboard' },
                                    { name: 'BMS', count: 'Building Mgmt', color: DASH_COLORS.amber, href: '/admin/bms' },
                                    { name: 'SCADA', count: 'Telemetry', color: DASH_COLORS.green, href: '/admin/scada' },
                                    { name: 'BIM', count: '3D Models', color: DASH_COLORS.purple, href: '/admin/bim' },
                                ].map(m => (
                                    <Col span={12} key={m.name}>
                                        <div onClick={() => router.push(m.href)} style={{
                                            padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                            border: `1px solid rgba(0,0,0,0.06)`, borderLeft: `3px solid ${m.color}`,
                                            transition: 'all 0.2s', background: '#fff',
                                        }}>
                                            <Text strong style={{ color: m.color, fontSize: 13 }}>{m.name}</Text>
                                            <br /><Text type="secondary" style={{ fontSize: 11 }}>{m.count}</Text>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </DashCard>
                    </motion.div>
                </Col>
            </Row>
        </div>
        </CMSLayout>
    );
}
