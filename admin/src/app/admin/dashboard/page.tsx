"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Tag, Space, Progress, message, Typography, Card, Badge, Button, Divider, Timeline, Skeleton, Tooltip } from "antd";
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
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { supaRest } from "@/lib/supaRest";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title, Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const DEFAULT_TENANT = 'default';

/* ═══ Dashboard animation styles ═══ */
const dashAnimStyle = `
@keyframes dashFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmerPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.7; }
}
.dash-card {
  animation: dashFadeUp 0.5s ease both;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.dash-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.10);
}
.dash-stat-value .ant-statistic-content-value {
  animation: shimmerPulse 3s ease-in-out infinite;
}
`;
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
    const [invStats, setInvStats] = useState<{ items: number; warehouses: number; purchaseOrders: number; fixedAssets: number }>({ items: 0, warehouses: 0, purchaseOrders: 0, fixedAssets: 0 });
    const [secStats, setSecStats] = useState<{ events: number; auditLogs: number; policies: number }>({ events: 0, auditLogs: 0, policies: 0 });
    const [devopsStats, setDevopsStats] = useState<{ pipelines: number; builds: number; workflows: number }>({ pipelines: 0, builds: 0, workflows: 0 });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [platformCounts, setPlatformCounts] = useState<{ tables: number; modules: number; resolvers: number; extensions: number }>({ tables: 207, modules: 16, resolvers: 37, extensions: 72 });

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
                        supaRest('hr_employees', { select: 'id,status' }),
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
                    const activeEmp = employees.filter((e: any) => e.status === 'active').length;
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
                // ── Inventory Snapshot widget ──
                try {
                    const [invItems, invWh, invPo, invFa] = await Promise.all([
                        supaRest('pm_milestones', { select: 'id' }),
                        supaRest('pm_risk_registers', { select: 'id' }),
                        supaRest('pm_stakeholders', { select: 'id' }),
                        supaRest('pm_requirements', { select: 'id' }),
                    ]);
                    setInvStats({ items: invItems.length, warehouses: invWh.length, purchaseOrders: invPo.length, fixedAssets: invFa.length });
                } catch { /* inventory tables may not exist */ }
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
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    const ModuleCard = ({ title, icon, color, href, children, delay = 0 }: { title: string, icon: React.ReactNode, color: string, href: string, children: React.ReactNode, delay?: number }) => (
        <ProCard bordered hoverable className="dash-card" style={{ borderTop: `4px solid ${color}`, cursor: 'pointer', height: '100%', animationDelay: `${delay}ms`, position: 'relative', overflow: 'hidden' }} onClick={() => router.push(href)}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${color}, ${color}88, ${color}44)` }} />
            <Space style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 18, color }}>{icon}</span>
                <Text strong style={{ fontSize: 13 }}>{title}</Text>
            </Space>
            <div className="dash-stat-value">{children}</div>
        </ProCard>
    );

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Dashboard</AuroraText>}
            subTitle={<DecryptedText text="NusantaraSoft Enterprise Platform" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <style>{dashAnimStyle}</style>
        <div style={{ padding: 24 }}>
            {contextHolder}

            {/* ══════ HEADER ══════ */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space align="center">
                    <DashboardOutlined style={{ fontSize: 28, color: themeColor }} />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>Enterprise Command Center</Title>
                        <Text type="secondary">Real-time overview of all platform modules</Text>
                    </div>
                </Space>
                <Space>
                    <Tag color="blue">207 Tables</Tag>
                    <Tag color="cyan">16 Modules</Tag>
                    <Tag color="green">All Systems Operational</Tag>
                </Space>
            </div>

            {/* ══════ PLATFORM OVERVIEW ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { label: 'Total Tables', value: String(platformCounts.tables), sub: 'PostgreSQL schema objects', color: '#10b981', icon: <DatabaseOutlined /> },
                    { label: 'Active Modules', value: String(platformCounts.modules), sub: 'Enterprise feature modules', color: '#3b82f6', icon: <AppstoreOutlined /> },
                    { label: 'GraphQL Resolvers', value: String(platformCounts.resolvers), sub: 'API query endpoints', color: '#8b5cf6', icon: <ApiOutlined /> },
                    { label: 'DB Extensions', value: String(platformCounts.extensions), sub: 'PostgreSQL extensions', color: '#f59e0b', icon: <ExperimentOutlined /> },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" className="dash-card" style={{ ...glass, borderTop: `4px solid ${s.color}`, animationDelay: `${i * 60}ms`, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}88, ${s.color}44)` }} />
                                <Space size={8}>
                                    <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 10 }}>{s.label}</Text>
                                        <div className="dash-stat-value"><Text strong style={{ fontSize: 16, color: s.color }}>{loading ? '—' : s.value}</Text></div>
                                        <Text type="secondary" style={{ fontSize: 9 }}>{s.sub}</Text>
                                    </div>
                                </Space>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ══════ ROW 1: Platform Health Indicators ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: `4px solid ${themeColor}`, background: 'linear-gradient(135deg, #f9f0ff 0%, #fff 100%)' }}>
                        <Statistic title={<Space><CustomerServiceOutlined style={{ color: themeColor }} /> Open Incidents</Space>} value={itsm?.totalOpen || 0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {itsm?.totalTickets || 0}</Text>} loading={loading} valueStyle={{ color: (itsm?.totalOpen || 0) > 10 ? '#f5222d' : themeColor }} />
                        {itsm?.totalSlaBreach > 0 && <Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 4 }}>{itsm.totalSlaBreach} SLA Breach</Tag>}
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #1890ff', background: 'linear-gradient(135deg, #e6f7ff 0%, #fff 100%)' }}>
                        <Statistic title={<Space><SolutionOutlined style={{ color: '#1890ff' }} /> CRM Pipeline</Space>} value={fmtCurrency(crm?.pipelineValue || 0)} prefix="Rp" loading={loading} valueStyle={{ color: '#1890ff' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{crm?.openDeals || 0} open deals · {crm?.totalAccounts || 0} accounts</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: `4px solid ${avgAvail >= 99.9 ? '#52c41a' : '#fa8c16'}`, background: `linear-gradient(135deg, ${avgAvail >= 99.9 ? '#f6ffed' : '#fffbe6'} 0%, #fff 100%)` }}>
                        <Statistic title={<Space><FieldTimeOutlined style={{ color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} /> Availability</Space>} value={avgAvail || '-'} suffix="%" loading={loading} valueStyle={{ color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{eventsCrit > 0 ? <Text type="danger">{eventsCrit} critical events</Text> : 'All systems nominal'}</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #13c2c2', background: 'linear-gradient(135deg, #e6fffb 0%, #fff 100%)' }}>
                        <Statistic title={<Space><TeamOutlined style={{ color: '#13c2c2' }} /> Workforce</Space>} value={agentsActive} suffix="active" loading={loading} valueStyle={{ color: '#13c2c2' }} />
                        <Progress percent={agentsUtil} size="small" status={agentsUtil > 80 ? 'exception' : 'active'} format={() => `${agentsUtil}% utilized`} />
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 2: SLA Gauge + CRM Pipeline + ITIL Coverage ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><CheckCircleOutlined /> SLA & Quality</Space>} bordered loading={loading} style={{ height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                            <Progress type="dashboard" percent={itsm?.slaCompliance || 0} size={140} strokeColor={(itsm?.slaCompliance || 100) >= 90 ? '#52c41a' : (itsm?.slaCompliance || 100) >= 70 ? '#fa8c16' : '#f5222d'} format={(p) => <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700 }}>{p}%</div><div style={{ fontSize: 10, color: '#999' }}>SLA</div></div>} />
                        </div>
                        <Row gutter={8} style={{ textAlign: 'center', marginTop: 12 }}>
                            <Col span={8}><Statistic title={<span style={{ fontSize: 11 }}>Avg Resolution</span>} value={itsm?.avgResolutionHours || 0} suffix="h" valueStyle={{ fontSize: 16 }} /></Col>
                            <Col span={8}><Statistic title={<span style={{ fontSize: 11 }}>Unassigned</span>} value={itsm?.totalUnassigned || 0} valueStyle={{ fontSize: 16, color: (itsm?.totalUnassigned || 0) > 0 ? '#fa8c16' : '#52c41a' }} /></Col>
                            <Col span={8}><Statistic title={<span style={{ fontSize: 11 }}>Knowledge</span>} value={itsmMod?.knowledge?.published || 0} suffix={`/${itsmMod?.knowledge?.total || 0}`} valueStyle={{ fontSize: 16 }} /></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><SolutionOutlined /> CRM Summary</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a href="/admin/crm/dashboard"><ArrowRightOutlined /></a>}>
                        <Row gutter={[8, 12]}>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Leads" value={crm?.totalIndividuals || 0} valueStyle={{ fontSize: 18, color: '#1890ff' }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Contacts" value={crm?.totalContacts || 0} valueStyle={{ fontSize: 18, color: '#13c2c2' }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Won Revenue" value={fmtCurrency(crm?.wonValue || 0)} prefix="Rp" valueStyle={{ fontSize: 18, color: '#52c41a' }} /></motion.div></Col>
                            <Col span={12}><Statistic title="Quotes" value={crm?.totalQuotes || 0} suffix={<Text type="secondary" style={{ fontSize: 11 }}>{crm?.acceptedQuotes || 0} accepted</Text>} valueStyle={{ fontSize: 18 }} /></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Campaigns" value={crm?.activeCampaigns || 0} suffix={`/ ${crm?.totalCampaigns || 0}`} valueStyle={{ fontSize: 18, color: themeColor }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Cases" value={crm?.openCases || 0} suffix={`/ ${crm?.totalCases || 0}`} valueStyle={{ fontSize: 18, color: (crm?.criticalCases || 0) > 0 ? '#f5222d' : '#1890ff' }} /></motion.div></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><AppstoreOutlined /> ITSM Modules</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a href="/admin/itsm/dashboard"><ArrowRightOutlined /></a>}>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                            {[
                                { label: 'Incidents', value: itsm?.totalOpen || 0, total: itsm?.totalTickets || 0, color: themeColor, icon: <AlertOutlined /> },
                                { label: 'Requests', value: itsmMod?.serviceRequests?.open || 0, total: itsmMod?.serviceRequests?.total || 0, color: '#1890ff', icon: <FileTextOutlined /> },
                                { label: 'Problems', value: itsmMod?.problems?.open || 0, total: itsmMod?.problems?.total || 0, color: '#fa8c16', icon: <BugOutlined /> },
                                { label: 'Changes', value: itsmMod?.changes?.open || 0, total: itsmMod?.changes?.total || 0, color: '#52c41a', icon: <SyncOutlined /> },
                            ].map(m => (
                                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                                    <Space size={6}><span style={{ color: m.color }}>{m.icon}</span><Text style={{ fontSize: 12 }}>{m.label}</Text></Space>
                                    <Space size={4}><Tag color={m.value > 0 ? 'orange' : 'green'} style={{ fontSize: 11 }}>{m.value} open</Tag><Text type="secondary" style={{ fontSize: 11 }}>/ {m.total}</Text></Space>
                                </div>
                            ))}
                        </Space>
                        <Divider style={{ margin: '8px 0' }} />
                        <Row gutter={8} style={{ textAlign: 'center' }}>
                            <Col span={6}><Badge color={themeColor} /><div style={{ fontSize: 10 }}>CMDB</div><Text strong style={{ fontSize: 13 }}>{cmdbCount}</Text></Col>
                            <Col span={6}><Badge color={eventsCrit > 0 ? '#f5222d' : '#52c41a'} /><div style={{ fontSize: 10 }}>Events</div><Text strong style={{ fontSize: 13, color: eventsCrit > 0 ? '#f5222d' : undefined }}>{eventsOpen}</Text></Col>
                            <Col span={6}><Badge color="#9254de" /><div style={{ fontSize: 10 }}>Releases</div><Text strong style={{ fontSize: 13 }}>{releasesActive}</Text></Col>
                            <Col span={6}><Badge color="#1890ff" /><div style={{ fontSize: 10 }}>Deploys</div><Text strong style={{ fontSize: 13 }}>{depsCompleted}/{depsTotal}</Text></Col>
                        </Row>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 2.5: Operations & Notifications Quick Status ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><PlayCircleOutlined /> Operations</Space>} bordered loading={loading} className="dash-card" style={{ height: '100%', animationDelay: '200ms' }} extra={<a onClick={() => router.push('/admin/ops/dashboard')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <Row gutter={[8, 12]}>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Playbooks" value={opsPlaybooks} valueStyle={{ fontSize: 18, color: '#8b5cf6' }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Active Runs" value={opsActiveRuns} valueStyle={{ fontSize: 18, color: '#3b82f6' }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Schedules" value={opsSchedules} valueStyle={{ fontSize: 18, color: '#06b6d4' }} /></motion.div></Col>
                            <Col span={12}><Statistic title="Overdue" value={opsOverdue} valueStyle={{ fontSize: 18, color: opsOverdue > 0 ? '#ef4444' : '#22c55e' }} prefix={opsOverdue > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><BellOutlined /> Notification Health</Space>} bordered loading={loading} className="dash-card" style={{ height: '100%', animationDelay: '260ms' }} extra={<a onClick={() => router.push('/admin/notifications/analytics')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <Progress type="circle" percent={100 - notifHealth.failRate} size={80}
                                strokeColor={notifHealth.failRate <= 5 ? '#22c55e' : notifHealth.failRate <= 15 ? '#f59e0b' : '#ef4444'}
                                format={() => `${100 - notifHealth.failRate}%`} />
                        </div>
                        <Row gutter={8} style={{ textAlign: 'center', marginTop: 8 }}>
                            <Col span={8}><Text style={{ fontSize: 11 }}>Dispatched<br /><Text strong>{notifHealth.dispatched}</Text></Text></Col>
                            <Col span={8}><Text style={{ fontSize: 11 }}>Delivered<br /><Text strong style={{ color: '#22c55e' }}>{notifHealth.delivered}</Text></Text></Col>
                            <Col span={8}><Text style={{ fontSize: 11 }}>Fail Rate<br /><Text strong type={notifHealth.failRate > 10 ? 'danger' : undefined}>{notifHealth.failRate}%</Text></Text></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><ProjectOutlined style={{ color: '#13c2c2' }} /> Project Management</Space>} bordered className="dash-card" style={{ height: '100%', animationDelay: '320ms' }} extra={<a onClick={() => router.push('/admin/pm/portfolio')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                            <Row gutter={[8, 12]}>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                        <Statistic title="Projects" value={pmStats.projects} valueStyle={{ fontSize: 18, color: '#13c2c2' }} prefix={<FundProjectionScreenOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                        <Statistic title="Tasks" value={pmStats.tasks} valueStyle={{ fontSize: 18, color: '#3b82f6' }} prefix={<FileSearchOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={24}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>Sprint Progress</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>Sprints: {pmStats.sprints}</Text>
                                    <Progress percent={pmStats.tasks > 0 ? Math.min(Math.round((pmStats.projects / Math.max(pmStats.tasks, 1)) * 100), 100) : 0} strokeColor={{ from: '#13c2c2', to: '#3b82f6' }} size="small" />
                                </Col>
                            </Row>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 3: Cross-Module Integration — Commerce ↔ Accounting ↔ HR ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><ShopOutlined style={{ color: '#eb2f96' }} /> Commerce & Sales</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a onClick={() => router.push('/admin/ecommerce/dashboard')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <Row gutter={[8, 12]}>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Revenue" value={fmtCurrency(commerce.revenue)} prefix="Rp" valueStyle={{ fontSize: 18, color: '#52c41a' }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Orders" value={commerce.orders} valueStyle={{ fontSize: 18, color: '#1890ff' }} /></motion.div></Col>
                            <Col span={12}><Statistic title="Pending" value={commerce.pending} valueStyle={{ fontSize: 18, color: commerce.pending > 0 ? '#fa8c16' : '#52c41a' }} prefix={commerce.pending > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col>
                            <Col span={12}><Statistic title="Customers" value={commerce.customers} valueStyle={{ fontSize: 18, color: '#13c2c2' }} /></Col>
                        </Row>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LinkOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>Synced with CRM Contacts · Auto-journals to Accounting</Text>
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><AuditOutlined style={{ color: '#722ed1' }} /> Accounting & Finance</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a onClick={() => router.push('/admin/accounting/dashboard')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <Row gutter={[8, 12]}>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Net Balance" value={fmtCurrency(accounting.balance)} prefix="Rp" valueStyle={{ fontSize: 18, color: '#722ed1' }} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Journal Entries" value={accounting.journalEntries} valueStyle={{ fontSize: 18, color: '#1890ff' }} /></motion.div></Col>
                            <Col span={12}><Statistic title={<span style={{ color: '#f5222d' }}>Payables (AP)</span>} value={fmtCurrency(accounting.payables)} prefix="Rp" valueStyle={{ fontSize: 16, color: '#f5222d' }} /></Col>
                            <Col span={12}><Statistic title={<span style={{ color: '#52c41a' }}>Receivables (AR)</span>} value={fmtCurrency(accounting.receivables)} prefix="Rp" valueStyle={{ fontSize: 16, color: '#52c41a' }} /></Col>
                        </Row>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LinkOutlined style={{ color: '#722ed1', fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>Commerce orders → Journals · HR payroll → AP entries</Text>
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><HeartOutlined style={{ color: '#f5222d' }} /> HR & People</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a onClick={() => router.push('/admin/hr/dashboard')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <Row gutter={[8, 12]}>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Active Employees" value={hrStats.employees} valueStyle={{ fontSize: 18, color: '#f5222d' }} prefix={<TeamOutlined />} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Departments" value={hrStats.departments} valueStyle={{ fontSize: 18, color: '#1890ff' }} /></motion.div></Col>
                            <Col span={12}><Statistic title="Pending Leave" value={hrStats.pendingLeave} valueStyle={{ fontSize: 18, color: hrStats.pendingLeave > 0 ? '#fa8c16' : '#52c41a' }} /></Col>
                            <Col span={12}><Statistic title="Open Positions" value={hrStats.openPositions} valueStyle={{ fontSize: 18, color: '#8b5cf6' }} /></Col>
                        </Row>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LinkOutlined style={{ color: '#f5222d', fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>Payroll → Accounting AP · Headcount → PM capacity</Text>
                        </div>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 3.5: Inventory · Security · DevOps ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><InboxOutlined style={{ color: '#52c41a' }} /> PM Governance</Space>} bordered className="dash-card" style={{ height: '100%', animationDelay: '380ms', position: 'relative', overflow: 'hidden' }} extra={<a onClick={() => router.push('/admin/pm/projects')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #52c41a, #52c41a88, #52c41a44)' }} />
                        {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                            <Row gutter={[8, 12]}>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                        <Statistic title="Milestones" value={invStats.items} valueStyle={{ fontSize: 18, color: '#52c41a' }} prefix={<ShoppingOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                        <Statistic title="Risk Items" value={invStats.warehouses} valueStyle={{ fontSize: 18, color: '#1890ff' }} prefix={<ContainerOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                        <Statistic title="Stakeholders" value={invStats.purchaseOrders} valueStyle={{ fontSize: 18, color: '#fa8c16' }} prefix={<CreditCardOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                                        <Statistic title="Requirements" value={invStats.fixedAssets} valueStyle={{ fontSize: 18, color: '#722ed1' }} prefix={<BuildOutlined />} />
                                    </motion.div>
                                </Col>
                            </Row>
                        )}
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><LockOutlined style={{ color: '#f5222d' }} /> Security & Audit</Space>} bordered className="dash-card" style={{ height: '100%', animationDelay: '440ms', position: 'relative', overflow: 'hidden' }} extra={<Tooltip title="Security overview"><SafetyOutlined /></Tooltip>}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #f5222d, #f5222d88, #f5222d44)' }} />
                        {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                            <Row gutter={[8, 12]}>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                        <Statistic title="Security Events" value={secStats.events} valueStyle={{ fontSize: 18, color: secStats.events > 0 ? '#f5222d' : '#52c41a' }} prefix={<AlertOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                        <Statistic title="Audit Entries" value={secStats.auditLogs} valueStyle={{ fontSize: 18, color: '#1890ff' }} prefix={<FileSearchOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={24}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                        <Statistic title="Active Policies" value={secStats.policies} valueStyle={{ fontSize: 18, color: '#722ed1' }} prefix={<SafetyOutlined />} />
                                        {secStats.events === 0 && <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginTop: 4 }}>No active threats</Tag>}
                                    </motion.div>
                                </Col>
                            </Row>
                        )}
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><CodeOutlined style={{ color: '#8b5cf6' }} /> DevOps & Automation</Space>} bordered className="dash-card" style={{ height: '100%', animationDelay: '500ms', position: 'relative', overflow: 'hidden' }} extra={<a onClick={() => router.push('/admin/devops/gitlab')} style={{ cursor: 'pointer' }}><ArrowRightOutlined /></a>}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #8b5cf6, #8b5cf688, #8b5cf644)' }} />
                        {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
                            <Row gutter={[8, 12]}>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                        <Statistic title="Pipelines" value={devopsStats.pipelines} valueStyle={{ fontSize: 18, color: '#8b5cf6' }} prefix={<ToolOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={12}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                        <Statistic title="Builds" value={devopsStats.builds} valueStyle={{ fontSize: 18, color: '#3b82f6' }} prefix={<BuildOutlined />} />
                                    </motion.div>
                                </Col>
                                <Col span={24}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                        <Statistic title="Automation Workflows" value={devopsStats.workflows} valueStyle={{ fontSize: 18, color: '#06b6d4' }} prefix={<SyncOutlined />} />
                                    </motion.div>
                                </Col>
                            </Row>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 4: ITIL v4 Module Quick Status ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="CMDB" icon={<ClusterOutlined />} color={themeColor} href="/admin/itsm/cmdb">
                        <Statistic value={cmdbCount} valueStyle={{ fontSize: 20 }} suffix="CIs" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Events" icon={<ThunderboltOutlined />} color={eventsCrit > 0 ? '#f5222d' : '#52c41a'} href="/admin/itsm/events">
                        <Statistic value={eventsOpen} valueStyle={{ fontSize: 20, color: eventsCrit > 0 ? '#f5222d' : undefined }} suffix="open" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Releases" icon={<RocketOutlined />} color="#9254de" href="/admin/itsm/releases">
                        <Statistic value={releasesActive} valueStyle={{ fontSize: 20 }} suffix="active" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Agents" icon={<TeamOutlined />} color="#13c2c2" href="/admin/itsm/agents">
                        <Statistic value={agentsActive} valueStyle={{ fontSize: 20 }} suffix={`· ${agentsUtil}%`} loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Continuity" icon={<SafetyOutlined />} color="#f5222d" href="/admin/itsm/continuity">
                        <Statistic value={plansActive} valueStyle={{ fontSize: 20 }} suffix="plans" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Deployments" icon={<CloudUploadOutlined />} color="#1890ff" href="/admin/itsm/deployments">
                        <Statistic value={depsCompleted} valueStyle={{ fontSize: 20 }} suffix={`/ ${depsTotal}`} loading={loading} />
                    </ModuleCard>
                </Col>
            </Row>

            {/* ══════ ROW 5: Recent Activity Feed ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <ProCard title={<Space><HistoryOutlined style={{ color: themeColor }} /> Recent Activity</Space>} bordered className="dash-card" style={{ animationDelay: '560ms', position: 'relative', overflow: 'hidden' }} extra={<Tag color="blue">{recentActivity.length} entries</Tag>}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${themeColor}, ${themeColor}88, ${themeColor}44)` }} />
                        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : recentActivity.length === 0 ? (
                            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>No recent activity recorded</Text>
                        ) : (
                            <Timeline style={{ marginTop: 16 }}
                                items={recentActivity.map((log: any, idx: number) => ({
                                    color: idx === 0 ? themeColor : idx < 3 ? '#1890ff' : '#d9d9d9',
                                    children: (
                                        <motion.div key={log.id || idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <Text strong style={{ fontSize: 13 }}>{log.action || log.event_type || 'System Event'}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{log.created_at ? dayjs(log.created_at).fromNow() : ''}</Text>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {log.module && <Tag style={{ fontSize: 10 }}>{log.module}</Tag>}
                                                {log.entity_type && <Tag color="default" style={{ fontSize: 10 }}>{log.entity_type}</Tag>}
                                                {log.user_id && <span>by {String(log.user_id).slice(0, 8)}…</span>}
                                            </Text>
                                        </motion.div>
                                    ),
                                }))}
                            />
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 6: Quick Actions & Module Links ══════ */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><RocketOutlined /> Quick Actions</Space>} bordered>
                        <Row gutter={[8, 8]}>
                            {[
                                { label: 'New Incident', href: '/admin/itsm/tickets', color: themeColor, icon: <AlertOutlined /> },
                                { label: 'New Page', href: '/admin/pages/builder', color: '#fa8c16', icon: <FileTextOutlined /> },
                                { label: 'New Order', href: '/admin/ecommerce/orders', color: '#eb2f96', icon: <ShoppingCartOutlined /> },
                                { label: 'New Employee', href: '/admin/hr/employees', color: '#f5222d', icon: <TeamOutlined /> },
                                { label: 'Journal Entry', href: '/admin/accounting/journals', color: '#722ed1', icon: <AuditOutlined /> },
                                { label: 'New Deal', href: '/admin/crm/deals', color: '#1890ff', icon: <SolutionOutlined /> },
                                { label: 'Run Playbook', href: '/admin/ops/playbooks', color: '#8b5cf6', icon: <PlayCircleOutlined /> },
                                { label: 'AI Studio', href: '/admin/ai-studio', color: '#2f54eb', icon: <DatabaseOutlined /> },
                                { label: 'Manage Users', href: '/admin/users/list', color: '#13c2c2', icon: <TeamOutlined /> },
                                { label: 'Notifications', href: '/admin/notifications/inbox', color: '#06b6d4', icon: <BellOutlined /> },
                            ].map(a => (
                                <Col span={12} key={a.label}>
                                    <Button type="text" block style={{ textAlign: 'left', height: 'auto', padding: '8px 12px', borderRadius: 8, border: '1px solid #f0f0f0' }} onClick={() => router.push(a.href)}>
                                        <Space><span style={{ color: a.color }}>{a.icon}</span><Text style={{ fontSize: 12 }}>{a.label}</Text></Space>
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><AppstoreOutlined /> Platform Modules <Tag color="blue">16</Tag></Space>} bordered>
                        <Row gutter={[8, 8]}>
                            {[
                                { name: 'Content Studio', count: 'Pages & Media', color: '#fa8c16', href: '/admin/pages/list' },
                                { name: 'CRM', count: `${crm?.totalIndividuals || 0} leads`, color: '#1890ff', href: '/admin/crm/dashboard' },
                                { name: 'ITSM', count: `${itsm?.totalTickets || 0} tickets`, color: themeColor, href: '/admin/itsm/dashboard' },
                                { name: 'Commerce', count: `${commerce.orders} orders`, color: '#eb2f96', href: '/admin/ecommerce/dashboard' },
                                { name: 'Inventory', count: 'Items & Stock', color: '#52c41a', href: '/admin/inventory/items' },
                                { name: 'Accounting', count: `${accounting.journalEntries} entries`, color: '#722ed1', href: '/admin/accounting/dashboard' },
                                { name: 'HR & People', count: `${hrStats.employees} staff`, color: '#f5222d', href: '/admin/hr/dashboard' },
                                { name: 'Projects', count: 'Tasks & Sprints', color: '#13c2c2', href: '/admin/pm/portfolio' },
                                { name: 'News & Intel', count: 'Sentiment & Crawl', color: '#2f54eb', href: '/admin/news/dashboard' },
                                { name: 'AI Studio', count: 'ML Models', color: '#3b82f6', href: '/admin/ai-studio' },
                                { name: 'DevOps', count: 'CI/CD & Automation', color: '#8b5cf6', href: '/admin/devops/gitlab' },
                                { name: 'Platform', count: 'Infra & Monitoring', color: '#fa541c', href: '/admin/infrastructure/docker' },
                            ].map(m => (
                                <Col span={12} key={m.name}>
                                    <Card size="small" bordered hoverable style={{ cursor: 'pointer', borderLeft: `3px solid ${m.color}` }} onClick={() => router.push(m.href)}>
                                        <Text strong style={{ color: m.color, fontSize: 13 }}>{m.name}</Text>
                                        <br /><Text type="secondary" style={{ fontSize: 11 }}>{m.count}</Text>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </ProCard>
                </Col>
            </Row>
        </div>
        </CMSLayout>
    );
}
