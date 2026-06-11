"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import {
    Card, Row, Col, Statistic, Tag, Table, Space, Tabs, Timeline,
    Button, Typography, Avatar, Tooltip, Spin, message, Rate, Badge,
    Descriptions, Divider, Progress,
} from "antd";
import {
    ArrowLeftOutlined, EditOutlined, BankOutlined, PhoneOutlined,
    GlobalOutlined, DollarOutlined, TeamOutlined, MailOutlined,
    CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, UserOutlined, PlusOutlined,
    FireOutlined, StarOutlined, EnvironmentOutlined, RocketOutlined,
    ThunderboltOutlined, FileTextOutlined, BugOutlined,
    FunnelPlotOutlined, TrophyOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text, Title } = Typography;

/* ── types ──────────────────────────────────────── */
interface Account {
    id: string; companyName: string; industry: string; type: string; rating: string;
    website: string; phone: string; billingAddress: string; shippingAddress: string;
    revenue: number; employees: number; parentAccountId: string; ownerId: string;
    description: string; createdAt: string; updatedAt: string;
}
interface Contact { id: string; firstName: string; lastName: string; email: string; phone: string; title: string; role: string; accountId: string; }
interface Deal { id: string; dealName: string; amount: number; probability: number; stage: string; closeDate: string; accountId: string; priority: string; status: string; createdAt: string; }
interface Activity { id: string; subject: string; type: string; status: string; priority: string; dueDate: string; relatedToId: string; relatedToType: string; completedAt: string; description: string; createdAt: string; }
interface SupportCase { id: string; caseNumber: string; subject: string; status: string; priority: string; origin: string; type: string; accountId: string; resolution: string; closedAt: string; createdAt: string; }

/* ── constants ──────────────────────────────────── */
const STAGES: Record<string, { label: string; color: string }> = {
    prospecting: { label: "Prospecting", color: "#1677ff" },
    qualification: { label: "Qualification", color: "#8b5cf6" },
    proposal: { label: "Proposal", color: "#eb2f96" },
    negotiation: { label: "Negotiation", color: "#fa8c16" },
    closed_won: { label: "Closed Won", color: "#52c41a" },
    closed_lost: { label: "Closed Lost", color: "#ff4d4f" },
};
const STAGE_ORDER = ["prospecting", "qualification", "proposal", "negotiation", "closed_won"];
const PRIORITY_COLORS: Record<string, string> = { low: "default", medium: "blue", high: "orange", critical: "red" };
const CASE_STATUS_COLORS: Record<string, string> = { new: "blue", working: "orange", escalated: "red", closed: "default" };
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    call: <PhoneOutlined />, email: <MailOutlined />, meeting: <TeamOutlined />,
    task: <CheckCircleOutlined />, default: <CalendarOutlined />,
};

/* ── queries ────────────────────────────────────── */
const GET_ACCOUNT = `query($tenantId: String!, $id: ID!) { accounts(tenantId: $tenantId) { id companyName industry type rating website phone billingAddress shippingAddress revenue employees parentAccountId ownerId description createdAt updatedAt } }`;
const GET_CONTACTS = `query($tenantId: String!) { contacts(tenantId: $tenantId) { id firstName lastName email phone title role accountId } }`;
const GET_DEALS = `query($tenantId: String!) { deals(tenantId: $tenantId) { id dealName amount probability stage closeDate accountId priority status createdAt } }`;
const GET_ACTIVITIES = `query($tenantId: String!) { crmActivities(tenantId: $tenantId) { id subject type status priority dueDate relatedToId relatedToType completedAt description createdAt } }`;
const GET_CASES = `query($tenantId: String!) { cases(tenantId: $tenantId) { id caseNumber subject status priority origin type accountId resolution closedAt createdAt } }`;

/* ── helpers ────────────────────────────────────── */
const fmtMoney = (v: number) => {
    if (!v) return "$0";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toLocaleString()}`;
};
const ratingStars = (r: string) => {
    const map: Record<string, number> = { hot: 5, warm: 3, cold: 1 };
    return map[r] ?? 0;
};
const ratingColor = (r: string) => {
    const map: Record<string, string> = { hot: "red", warm: "orange", cold: "blue" };
    return map[r] ?? "default";
};
const typeLabel = (t: string) => {
    const map: Record<string, string> = { customer: "Customer", partner: "Partner", vendor: "Vendor", prospect: "Prospect" };
    return map[t] || t;
};

/* ── component ──────────────────────────────────── */
export default function AccountDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const glassCard = {
        background: isDark ? "rgba(30,30,40,0.65)" : "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.45)",
        borderRadius: 14,
    };

    const [loading, setLoading] = useState(true);
    const [account, setAccount] = useState<Account | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [cases, setCases] = useState<SupportCase[]>([]);
    const [activityFilter, setActivityFilter] = useState("all");

    /* ── load all data ─────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [accData, conData, dealData, actData, caseData] = await Promise.all([
                gql(GET_ACCOUNT, { tenantId: DEFAULT_TENANT_ID, id }),
                gql(GET_CONTACTS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_DEALS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_ACTIVITIES, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_CASES, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            const found = (accData.accounts || []).find((a: Account) => a.id === id);
            setAccount(found || null);
            setContacts((conData.contacts || []).filter((c: Contact) => c.accountId === id));
            setDeals((dealData.deals || []).filter((d: Deal) => d.accountId === id));
            setActivities((actData.crmActivities || []).filter((a: Activity) => a.relatedToId === id));
            setCases((caseData.cases || []).filter((c: SupportCase) => c.accountId === id));
        } catch (err: any) {
            message.error("Failed to load account: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── computed KPIs ─────────────────────────── */
    const wonDeals = useMemo(() => deals.filter(d => d.stage === "closed_won"), [deals]);
    const wonRevenue = useMemo(() => wonDeals.reduce((s, d) => s + (d.amount || 0), 0), [wonDeals]);
    const openDeals = useMemo(() => deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)), [deals]);
    const openPipeline = useMemo(() => openDeals.reduce((s, d) => s + (d.amount || 0), 0), [openDeals]);
    const weightedPipeline = useMemo(() => openDeals.reduce((s, d) => s + (d.amount || 0) * (d.probability || 0) / 100, 0), [openDeals]);
    const openCases = useMemo(() => cases.filter(c => c.status !== "closed").length, [cases]);
    const closedCases = useMemo(() => cases.filter(c => c.status === "closed").length, [cases]);
    const monthActivities = useMemo(() => activities.filter(a => dayjs(a.createdAt).isAfter(dayjs().startOf("month"))).length, [activities]);
    const winRate = useMemo(() => {
        const closedTotal = deals.filter(d => ["closed_won", "closed_lost"].includes(d.stage)).length;
        return closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : 0;
    }, [deals, wonDeals]);

    /* ── health score ──────────────────────────── */
    const healthScore = useMemo(() => {
        let score = 50;
        if (deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).length > 0) score += 15;
        if (wonRevenue > 0) score += 10;
        if (openCases === 0) score += 10; else if (openCases > 3) score -= 15;
        const recentActivity = activities.find(a => dayjs(a.createdAt).isAfter(dayjs().subtract(14, "day")));
        if (recentActivity) score += 15; else score -= 10;
        return Math.max(0, Math.min(100, score));
    }, [deals, wonRevenue, openCases, activities]);

    const healthLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Churning";
    const healthColor = healthScore >= 70 ? "#52c41a" : healthScore >= 40 ? "#fa8c16" : "#ff4d4f";

    /* ── timeline feed ─────────────────────────── */
    const timelineFeed = useMemo(() => {
        const items: { date: string; icon: React.ReactNode; color: string; desc: string; entity: string }[] = [];
        deals.forEach(d => items.push({ date: d.createdAt, icon: <DollarOutlined />, color: "#1677ff", desc: `Deal "${d.dealName}" created — ${fmtMoney(d.amount)}`, entity: "deal" }));
        contacts.forEach(c => items.push({ date: "", icon: <UserOutlined />, color: "#722ed1", desc: `Contact ${c.firstName} ${c.lastName} linked`, entity: "contact" }));
        activities.forEach(a => items.push({ date: a.createdAt, icon: ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.default, color: a.completedAt ? "#52c41a" : "#fa8c16", desc: `${a.type?.charAt(0).toUpperCase()}${a.type?.slice(1) || "Activity"}: ${a.subject}`, entity: "activity" }));
        cases.forEach(c => items.push({ date: c.createdAt, icon: <BugOutlined />, color: "#ff4d4f", desc: `Case ${c.caseNumber}: ${c.subject}`, entity: "case" }));
        return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }, [deals, contacts, activities, cases]);

    /* ── filtered activities ───────────────────── */
    const filteredActivities = useMemo(() =>
        activityFilter === "all" ? activities : activities.filter(a => a.type === activityFilter),
    [activities, activityFilter]);

    /* ── columns ───────────────────────────────── */
    const contactCols: ColumnsType<Contact> = [
        { title: "Name", key: "name", render: (_, r) => <Space><Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: themeColor }} /><Text strong>{r.firstName} {r.lastName}</Text></Space> },
        { title: "Email", dataIndex: "email", key: "email", render: v => v ? <a href={`mailto:${v}`}>{v}</a> : "—" },
        { title: "Phone", dataIndex: "phone", key: "phone", render: v => v || "—" },
        { title: "Title", dataIndex: "title", key: "title", render: v => v || "—" },
        { title: "Role", dataIndex: "role", key: "role", render: v => v ? <Tag>{v}</Tag> : "—" },
    ];

    const dealCols: ColumnsType<Deal> = [
        { title: "Deal", dataIndex: "dealName", key: "name", render: v => <Text strong>{v}</Text> },
        { title: "Stage", key: "stage", width: 130, render: (_, r) => {
            const s = STAGES[r.stage];
            return <><Tag color={s?.color}>{s?.label || r.stage}</Tag><div style={{ display: "flex", gap: 3, marginTop: 4 }}>{STAGE_ORDER.map(st => <Tooltip key={st} title={STAGES[st]?.label}><div style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_ORDER.indexOf(r.stage) >= STAGE_ORDER.indexOf(st) ? (STAGES[st]?.color || "#d9d9d9") : (isDark ? "rgba(255,255,255,0.12)" : "#e8e8e8") }} /></Tooltip>)}</div></>;
        }},
        { title: "Amount", dataIndex: "amount", key: "amount", width: 110, align: "right", render: v => <Text strong>{fmtMoney(v)}</Text> },
        { title: "Probability", dataIndex: "probability", key: "prob", width: 90, align: "right", render: v => `${v || 0}%` },
        { title: "Close Date", key: "close", width: 120, render: (_, r) => r.closeDate ? dayjs(r.closeDate).format("MMM D, YYYY") : "—" },
        { title: "Priority", key: "priority", width: 90, render: (_, r) => <Tag color={PRIORITY_COLORS[r.priority]}>{r.priority || "—"}</Tag> },
    ];

    const caseCols: ColumnsType<SupportCase> = [
        { title: "Case #", dataIndex: "caseNumber", key: "num", width: 100, render: v => <Text code>{v}</Text> },
        { title: "Subject", dataIndex: "subject", key: "subject" },
        { title: "Status", key: "status", width: 100, render: (_, r) => <Tag color={CASE_STATUS_COLORS[r.status]}>{r.status}</Tag> },
        { title: "Priority", key: "priority", width: 90, render: (_, r) => <Tag color={PRIORITY_COLORS[r.priority]}>{r.priority}</Tag> },
        { title: "Created", key: "created", width: 110, render: (_, r) => dayjs(r.createdAt).format("MMM D, YYYY") },
        { title: "Resolved", key: "resolved", width: 110, render: (_, r) => r.closedAt ? dayjs(r.closedAt).format("MMM D, YYYY") : "—" },
    ];

    if (loading && !account) {
        return <CMSLayout title="Loading..."><div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div></CMSLayout>;
    }
    if (!account) {
        return <CMSLayout title="Account Not Found"><div style={{ textAlign: "center", padding: 80 }}><Text type="secondary">No account found with this ID.</Text><br /><Button type="link" onClick={() => router.push("/admin/crm/accounts")}>Back to Accounts</Button></div></CMSLayout>;
    }

    /* ── render ─────────────────────────────────── */
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>{account.companyName}</AuroraText>}
            breadcrumb={[
                { title: "CRM" },
                { title: "Accounts" },
                { title: account.companyName },
            ]}
        >
            {/* ─── 1. Account Header Card ─────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Card style={{ ...glassCard, marginBottom: 16 }}>
                    <Row gutter={[24, 16]} align="middle">
                        <Col xs={24} md={16}>
                            <Space size="large" align="start" wrap>
                                <Avatar size={64} icon={<BankOutlined />} style={{ backgroundColor: themeColor, fontSize: 28 }} />
                                <div>
                                    <Title level={3} style={{ margin: 0 }}>{account.companyName}</Title>
                                    <Space wrap style={{ marginTop: 6 }}>
                                        {account.industry && <Tag icon={<FireOutlined />} color="purple">{account.industry}</Tag>}
                                        {account.type && <Tag color={account.type === "customer" ? "green" : account.type === "prospect" ? "blue" : "default"}>{account.type}</Tag>}
                                        {account.rating && <Rate disabled value={ratingStars(account.rating)} style={{ fontSize: 14 }} />}
                                    </Space>
                                    <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
                                        {account.revenue > 0 && <Text><DollarOutlined style={{ color: "#52c41a" }} /> {fmtMoney(account.revenue)}</Text>}
                                        {account.employees > 0 && <Text><TeamOutlined style={{ color: "#1677ff" }} /> {account.employees.toLocaleString()} employees</Text>}
                                        {account.phone && <Text><PhoneOutlined /> {account.phone}</Text>}
                                        {account.website && <a href={account.website.startsWith("http") ? account.website : `https://${account.website}`} target="_blank" rel="noreferrer"><GlobalOutlined /> {account.website}</a>}
                                    </div>
                                    {account.billingAddress && (
                                        <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                                            <EnvironmentOutlined /> {account.billingAddress}
                                        </Text>
                                    )}
                                    {account.shippingAddress && account.shippingAddress !== account.billingAddress && (
                                        <Text type="secondary" style={{ display: "block", marginTop: 2, fontSize: 12 }}>
                                            <EnvironmentOutlined /> Shipping: {account.shippingAddress}
                                        </Text>
                                    )}
                                    {account.description && (
                                        <Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 12, maxWidth: 500 }}>
                                            {account.description}
                                        </Text>
                                    )}
                                    <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 11 }}>
                                        Account since {dayjs(account.createdAt).format("MMM D, YYYY")}
                                        {account.updatedAt && ` · Last updated ${dayjs(account.updatedAt).fromNow()}`}
                                    </Text>
                                </div>
                            </Space>
                        </Col>
                        <Col xs={24} md={8} style={{ textAlign: "right" }}>
                            <Space wrap>
                                <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/crm/accounts")}>Back to Accounts</Button>
                                <Button type="primary" icon={<EditOutlined />}>Quick Edit</Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </motion.div>

            {/* ─── 2. KPI Stats Row ───────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: "Won Revenue", value: wonRevenue, icon: <TrophyOutlined />, color: "#52c41a", fmt: fmtMoney },
                    { title: "Open Pipeline", value: openPipeline, icon: <FunnelPlotOutlined />, color: "#1677ff", fmt: fmtMoney },
                    { title: "Active Contacts", value: contacts.length, icon: <TeamOutlined />, color: "#722ed1" },
                    { title: "Open Cases", value: openCases, icon: <BugOutlined />, color: openCases > 0 ? "#ff4d4f" : "#52c41a" },
                    { title: "Activities (Month)", value: monthActivities, icon: <CalendarOutlined />, color: "#fa8c16" },
                ].map((kpi, i) => (
                    <Col xs={12} sm={8} md={4} lg={4} key={kpi.title}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${kpi.color}` }}>
                                <Statistic title={kpi.title} value={kpi.fmt ? kpi.fmt(kpi.value) : kpi.value} prefix={kpi.icon} valueStyle={{ color: kpi.color, fontSize: 20 }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── 3 & 4. Main Content + Sidebar ─────── */}
            <Row gutter={[16, 16]}>
                {/* Main Tabbed Content */}
                <Col xs={24} lg={18}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card style={glassCard}>
                            <Tabs defaultActiveKey="contacts" items={[
                                /* ── Tab: Contacts ──────── */
                                { key: "contacts", label: <><TeamOutlined /> Contacts ({contacts.length})</>, children: (
                                    <Table dataSource={contacts.map(c => ({ ...c, key: c.id }))} columns={contactCols}
                                        pagination={{ pageSize: 10 }} size="small" scroll={{ x: 600 }} locale={{ emptyText: "No contacts linked to this account" }} />
                                )},
                                /* ── Tab: Deals ─────────── */
                                { key: "deals", label: <><DollarOutlined /> Deals ({deals.length})</>, children: (
                                    <>
                                        {/* Deal Summary Stats */}
                                        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                                            <Col xs={8}>
                                                <Card size="small" style={{ background: isDark ? "rgba(82,196,26,0.08)" : "#f6ffed", borderRadius: 10, textAlign: "center" }}>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Won</Text>
                                                    <div><Text strong style={{ color: "#52c41a" }}>{wonDeals.length} deals · {fmtMoney(wonRevenue)}</Text></div>
                                                </Card>
                                            </Col>
                                            <Col xs={8}>
                                                <Card size="small" style={{ background: isDark ? "rgba(22,119,255,0.08)" : "#e6f7ff", borderRadius: 10, textAlign: "center" }}>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Open Pipeline</Text>
                                                    <div><Text strong style={{ color: "#1677ff" }}>{openDeals.length} deals · {fmtMoney(openPipeline)}</Text></div>
                                                </Card>
                                            </Col>
                                            <Col xs={8}>
                                                <Card size="small" style={{ background: isDark ? "rgba(250,140,22,0.08)" : "#fff7e6", borderRadius: 10, textAlign: "center" }}>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Win Rate</Text>
                                                    <div><Text strong style={{ color: "#fa8c16" }}>{winRate}%</Text></div>
                                                    <Progress percent={winRate} size="small" showInfo={false} strokeColor="#fa8c16" style={{ marginTop: 4 }} />
                                                </Card>
                                            </Col>
                                        </Row>
                                        <Table dataSource={deals.map(d => ({ ...d, key: d.id }))} columns={dealCols}
                                            pagination={{ pageSize: 10 }} size="small" scroll={{ x: 700 }} locale={{ emptyText: "No deals for this account" }} />
                                    </>
                                )},
                                /* ── Tab: Activities ────── */
                                { key: "activities", label: <><CalendarOutlined /> Activities ({activities.length})</>, children: (
                                    <>
                                        <Space style={{ marginBottom: 16 }}>
                                            {["all", "call", "email", "meeting", "task"].map(f => (
                                                <Button key={f} size="small" type={activityFilter === f ? "primary" : "default"}
                                                    onClick={() => setActivityFilter(f)} style={{ textTransform: "capitalize" }}>
                                                    {f === "all" ? "All" : f}
                                                </Button>
                                            ))}
                                        </Space>
                                        <Timeline items={filteredActivities.length > 0 ? filteredActivities.map(a => ({
                                            dot: a.completedAt
                                                ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
                                                : (ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.default),
                                            color: a.completedAt ? "green" : "blue",
                                            children: (
                                                <div style={{ opacity: a.completedAt ? 0.6 : 1 }}>
                                                    <Text strong>{a.subject}</Text>
                                                    {a.completedAt && <CheckCircleOutlined style={{ marginLeft: 6, color: "#52c41a" }} />}
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        <Tag style={{ fontSize: 10 }}>{a.type}</Tag>
                                                        {a.dueDate && <><CalendarOutlined /> {dayjs(a.dueDate).format("MMM D, YYYY")} </>}
                                                        {a.status && <Tag color={a.status === "completed" ? "green" : "blue"} style={{ fontSize: 10 }}>{a.status}</Tag>}
                                                    </Text>
                                                    {a.description && <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>{a.description}</Text>}
                                                </div>
                                            ),
                                        })) : [{ children: <Text type="secondary">No activities recorded</Text> }]} />
                                    </>
                                )},
                                /* ── Tab: Cases ─────────── */
                                { key: "cases", label: <><BugOutlined /> Cases ({cases.length})</>, children: (
                                    <Table dataSource={cases.map(c => ({ ...c, key: c.id }))} columns={caseCols}
                                        pagination={{ pageSize: 10 }} size="small" scroll={{ x: 650 }} locale={{ emptyText: "No support cases for this account" }} />
                                )},
                                /* ── Tab: Timeline ──────── */
                                { key: "timeline", label: <><ClockCircleOutlined /> Timeline</>, children: (
                                    <Timeline mode="alternate" items={timelineFeed.length > 0 ? timelineFeed.slice(0, 30).map((item, i) => ({
                                        dot: <div style={{ fontSize: 16, color: item.color }}>{item.icon}</div>,
                                        color: item.color,
                                        children: (
                                            <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                                <Text>{item.desc}</Text><br />
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {item.date ? dayjs(item.date).format("MMM D, YYYY HH:mm") : "—"}
                                                    {item.date && ` · ${dayjs(item.date).fromNow()}`}
                                                </Text>
                                            </motion.div>
                                        ),
                                    })) : [{ children: <Text type="secondary">No timeline events</Text> }]} />
                                )},
                            ]} />
                        </Card>
                    </motion.div>
                </Col>

                {/* ─── Relationship Summary Sidebar ────── */}
                <Col xs={24} lg={6}>
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                        <Space direction="vertical" style={{ width: "100%" }} size={12}>
                            {/* Health Score */}
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${healthColor}` }}>
                                <div style={{ textAlign: "center", padding: "8px 0" }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Account Health</Text>
                                    <div style={{
                                        position: "relative", width: 80, height: 80,
                                        margin: "8px auto", borderRadius: "50%",
                                        background: `conic-gradient(${healthColor} ${healthScore * 3.6}deg, ${isDark ? "rgba(255,255,255,0.08)" : "#f0f0f0"} 0deg)`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <div style={{
                                            width: 60, height: 60, borderRadius: "50%",
                                            background: isDark ? "rgba(30,30,40,0.9)" : "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            <Text strong style={{ fontSize: 18, color: healthColor }}>{healthScore}</Text>
                                        </div>
                                    </div>
                                    <Tag color={healthColor} style={{ fontWeight: 600 }}>{healthLabel}</Tag>
                                    <div style={{ marginTop: 8, fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "#999" }}>
                                        {openDeals.length > 0 && <div>✓ {openDeals.length} open deal{openDeals.length > 1 ? "s" : ""}</div>}
                                        {openCases > 0 && <div>⚠ {openCases} open case{openCases > 1 ? "s" : ""}</div>}
                                        {openCases === 0 && <div>✓ No open cases</div>}
                                        {monthActivities > 0
                                            ? <div>✓ {monthActivities} activities this month</div>
                                            : <div>⚠ No recent activity</div>
                                        }
                                    </div>
                                </div>
                            </Card>

                            {/* Account Summary */}
                            <Card size="small" title={<><FileTextOutlined /> Account Summary</>} style={glassCard}>
                                <Descriptions column={1} size="small" colon={false}>
                                    <Descriptions.Item label="Type">
                                        <Tag color={account.type === "customer" ? "green" : account.type === "prospect" ? "blue" : "default"}>
                                            {typeLabel(account.type)}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Industry">{account.industry || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Rating">
                                        {account.rating ? <Tag color={ratingColor(account.rating)}>{account.rating}</Tag> : "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Revenue">{account.revenue ? fmtMoney(account.revenue) : "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Employees">{account.employees?.toLocaleString() || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Created">{dayjs(account.createdAt).format("MMM D, YYYY")}</Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {/* Key Contacts */}
                            <Card size="small" title={<><UserOutlined /> Key Contacts</>} style={glassCard}>
                                {contacts.slice(0, 3).map(c => (
                                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f5f5f5" }}>
                                        <Avatar size="small" style={{ backgroundColor: themeColor }}>{c.firstName?.[0]}{c.lastName?.[0]}</Avatar>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>{c.firstName} {c.lastName}</Text>
                                            <br /><Text type="secondary" style={{ fontSize: 11 }}>{c.title || c.role || "—"}</Text>
                                        </div>
                                    </div>
                                ))}
                                {contacts.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No contacts</Text>}
                            </Card>

                            {/* Recent Activity */}
                            <Card size="small" title={<><ClockCircleOutlined /> Recent Activity</>} style={glassCard}>
                                {activities.slice(0, 3).map(a => (
                                    <div key={a.id} style={{ padding: "6px 0", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f5f5f5" }}>
                                        <Space>
                                            {ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.default}
                                            <Text style={{ fontSize: 12 }}>{a.subject}</Text>
                                        </Space>
                                        <br /><Text type="secondary" style={{ fontSize: 11 }}>{a.createdAt ? dayjs(a.createdAt).fromNow() : "—"}</Text>
                                    </div>
                                ))}
                                {activities.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No recent activity</Text>}
                            </Card>

                            {/* Deal Pipeline Mini */}
                            {deals.length > 0 && (
                                <Card size="small" title={<><FunnelPlotOutlined /> Deal Pipeline</>} style={glassCard}>
                                    {STAGE_ORDER.map(stage => {
                                        const count = deals.filter(d => d.stage === stage).length;
                                        const stageInfo = STAGES[stage];
                                        return (
                                            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: "50%",
                                                    background: count > 0 ? stageInfo.color : (isDark ? "rgba(255,255,255,0.12)" : "#e8e8e8"),
                                                }} />
                                                <Text style={{ fontSize: 11, flex: 1 }}>{stageInfo.label}</Text>
                                                <Badge count={count} style={{
                                                    backgroundColor: count > 0 ? stageInfo.color : (isDark ? "rgba(255,255,255,0.12)" : "#e8e8e8"),
                                                    fontSize: 10,
                                                }} />
                                            </div>
                                        );
                                    })}
                                    <Divider style={{ margin: "8px 0" }} />
                                    <div style={{ textAlign: "center" }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Weighted Pipeline</Text>
                                        <div><Text strong style={{ color: themeColor }}>{fmtMoney(weightedPipeline)}</Text></div>
                                    </div>
                                </Card>
                            )}

                            {/* Quick Actions */}
                            <Card size="small" title={<><ThunderboltOutlined /> Quick Actions</>} style={glassCard}>
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    <Button block icon={<DollarOutlined />} onClick={() => router.push("/admin/crm/deals")}>Create Deal</Button>
                                    <Button block icon={<CalendarOutlined />} onClick={() => router.push("/admin/crm/activities")}>Log Activity</Button>
                                    <Button block icon={<ExclamationCircleOutlined />} onClick={() => router.push("/admin/crm/cases")}>Open Case</Button>
                                </Space>
                            </Card>
                        </Space>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
