"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import {
    Card, Row, Col, Statistic, Typography, Select, Input, Tag, Table, Collapse,
    message, Space, Segmented, Spin, Badge, Empty, theme,
} from "antd";
import {
    DollarOutlined, FunnelPlotOutlined, TeamOutlined, BarChartOutlined,
    SearchOutlined, AppstoreOutlined, UnorderedListOutlined, ReloadOutlined,
    TrophyOutlined, CloseCircleOutlined, CalendarOutlined, FilterOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import dayjs from "dayjs";

const { Text } = Typography;

const glass = { 
    background: 'rgba(255, 255, 255, 0.4)', 
    backdropFilter: 'blur(16px)', 
    border: '1px solid rgba(255, 255, 255, 0.5)', 
    borderRadius: 14,
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
};

const gradientBorder = (color: string) => ({
    background: `linear-gradient(135deg, ${color}08, ${color}03)`,
    borderImage: `linear-gradient(135deg, ${color}, ${color}40) 1`,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderRadius: 14,
    backdropFilter: 'blur(12px)',
});

interface Deal {
    id: string; name: string; dealName?: string; amount: number; probability: number; stage: string;
    closeDate: string; accountId: string; contactId: string; ownerId: string;
    priority: string; status: string; lostReason: string; wonReason: string;
    nextStep: string; notes: string; createdAt: string; updatedAt: string;
    account?: { companyName: string }; contact?: { firstName: string; lastName: string };
}

const STAGES = [
    { value: "prospecting", label: "Prospecting", prob: 10, color: "#3b82f6" },
    { value: "qualification", label: "Qualification", prob: 20, color: "#6366f1" },
    { value: "needs_analysis", label: "Needs Analysis", prob: 40, color: "#8b5cf6" },
    { value: "proposal", label: "Proposal", prob: 60, color: "#f59e0b" },
    { value: "negotiation", label: "Negotiation", prob: 80, color: "#f97316" },
    { value: "closed_won", label: "Closed Won", prob: 100, color: "#10b981" },
    { value: "closed_lost", label: "Closed Lost", prob: 0, color: "#ef4444" },
];

const PRIORITIES = [
    { value: "low", label: "Low", color: "#94a3b8" },
    { value: "medium", label: "Medium", color: "#3b82f6" },
    { value: "high", label: "High", color: "#f59e0b" },
    { value: "critical", label: "Critical", color: "#ef4444" },
];

const fmt = (v: number) => {
    if (!v) return "$0";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
};

const fmtShort = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
};

export default function PipelinePage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<string>("board");
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
    const [ownerFilter, setOwnerFilter] = useState<string | undefined>();
    const [dateRange, setDateRange] = useState<string | undefined>();
    const [sortBy, setSortBy] = useState<string>("amount_desc");
    const [funnelStageFilter, setFunnelStageFilter] = useState<string | undefined>();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql<{ deals: Deal[] }>(`query($tenantId: String!) { deals(tenantId: $tenantId) { id name amount probability stage closeDate accountId contactId ownerId priority status lostReason wonReason nextStep notes createdAt updatedAt } }`, { tenantId: DEFAULT_TENANT_ID });
            setDeals((data.deals || []).map((d) => ({ ...d, dealName: d.dealName || d.name })));
        } catch (err: any) { message.error("Failed to load deals: " + err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleStageChange = async (dealId: string, newStage: string) => {
        try {
            const prob = STAGES.find(s => s.value === newStage)?.prob ?? 10;
            await gql(`mutation($id: ID!, $input: UpdateDealInput!) { updateDeal(id: $id, input: $input) { id stage } }`, { id: dealId, input: { stage: newStage, probability: prob } });
            message.success("Stage updated");
            loadData();
        } catch (err: any) { message.error(err.message); }
    };

    // ─── Computed data ────────────────────────────────────
    const openStages = STAGES.filter(s => s.value !== "closed_won" && s.value !== "closed_lost");
    const openDeals = useMemo(() => deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost"), [deals]);
    const totalPipeline = useMemo(() => openDeals.reduce((s, d) => s + (d.amount || 0), 0), [openDeals]);
    const weightedPipeline = useMemo(() => openDeals.reduce((s, d) => s + (d.amount || 0) * (d.probability || 0) / 100, 0), [openDeals]);
    const avgDealSize = openDeals.length > 0 ? totalPipeline / openDeals.length : 0;

    // Pipeline velocity: avg deal size × win rate × number of deals / avg sales cycle
    const avgCycleDays = useMemo(() => {
        const closedWithDates = deals.filter(d => d.stage === "closed_won" && d.createdAt && d.closeDate);
        if (closedWithDates.length === 0) return 30;
        const totalDays = closedWithDates.reduce((s, d) => s + Math.max(dayjs(d.closeDate).diff(dayjs(d.createdAt), "day"), 1), 0);
        return Math.round(totalDays / closedWithDates.length);
    }, [deals]);

    // Stage distribution percentage for progress bar
    const stageDistribution = useMemo(() => {
        const total = openDeals.length || 1;
        return openStages.map(stage => ({
            ...stage,
            count: openDeals.filter(d => d.stage === stage.value).length,
            pct: Math.round(openDeals.filter(d => d.stage === stage.value).length / total * 100),
        }));
    }, [openDeals, openStages]);

    const owners = useMemo(() => {
        const set = new Set<string>();
        deals.forEach(d => { if (d.ownerId) set.add(d.ownerId); });
        return Array.from(set);
    }, [deals]);

    const filteredDeals = useMemo(() => {
        let filtered = [...deals];
        if (search) filtered = filtered.filter(d => d.dealName?.toLowerCase().includes(search.toLowerCase()));
        if (priorityFilter) filtered = filtered.filter(d => d.priority === priorityFilter);
        if (ownerFilter) filtered = filtered.filter(d => d.ownerId === ownerFilter);
        if (funnelStageFilter) filtered = filtered.filter(d => d.stage === funnelStageFilter);
        if (dateRange) {
            const now = dayjs();
            filtered = filtered.filter(d => {
                if (!d.closeDate) return false;
                const cd = dayjs(d.closeDate);
                if (dateRange === "month") return cd.isSame(now, "month");
                if (dateRange === "quarter") return cd.quarter() === now.quarter() && cd.year() === now.year();
                return cd.year() === now.year();
            });
        }
        // Sort
        if (sortBy === "amount_desc") filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        else if (sortBy === "close_asc") filtered.sort((a, b) => (a.closeDate || "").localeCompare(b.closeDate || ""));
        else if (sortBy === "prob_desc") filtered.sort((a, b) => (b.probability || 0) - (a.probability || 0));
        return filtered;
    }, [deals, search, priorityFilter, ownerFilter, dateRange, sortBy, funnelStageFilter]);

    const allWonDeals = deals.filter(d => d.stage === "closed_won");
    const allLostDeals = deals.filter(d => d.stage === "closed_lost");
    const wonDeals = allWonDeals.slice(0, 10);
    const lostDeals = allLostDeals.slice(0, 10);
    const totalWonAmount = allWonDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const totalLostAmount = allLostDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const winRate = (allWonDeals.length + allLostDeals.length) > 0
        ? Math.round(allWonDeals.length / (allWonDeals.length + allLostDeals.length) * 100) : 0;

    // ─── Summary cards ───────────────────────────────────
    const summaryCards = [
        { label: "Total Pipeline", value: totalPipeline, prefix: <DollarOutlined />, color: "#3b82f6", formatter: fmt },
        { label: "Weighted Pipeline", value: weightedPipeline, prefix: <FunnelPlotOutlined />, color: "#8b5cf6", formatter: fmt },
        { label: "Deals in Pipeline", value: openDeals.length, prefix: <TeamOutlined />, color: themeColor, formatter: undefined },
        { label: "Avg Deal Size", value: avgDealSize, prefix: <BarChartOutlined />, color: "#f59e0b", formatter: fmt },
    ];

    // ─── Funnel data ─────────────────────────────────────
    const funnelData = STAGES.filter(s => s.value !== "closed_lost").map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage.value);
        return { ...stage, count: stageDeals.length, total: stageDeals.reduce((s, d) => s + (d.amount || 0), 0) };
    });
    const maxFunnelCount = Math.max(...funnelData.map(d => d.count), 1);

    // ─── Bar chart data ──────────────────────────────────
    const barData = STAGES.filter(s => s.value !== "closed_lost").map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage.value);
        return { name: stage.label, value: stageDeals.reduce((s, d) => s + (d.amount || 0), 0), count: stageDeals.length, fill: stage.color };
    });

    // ─── Close date badge color ──────────────────────────
    const closeDateColor = (dateStr: string) => {
        if (!dateStr) return undefined;
        const d = dayjs(dateStr);
        if (d.isBefore(dayjs(), "day")) return "#ef4444";
        if (d.diff(dayjs(), "day") <= 7) return "#f59e0b";
        return "#10b981";
    };

    const priorityBorderColor = (p: string) => PRIORITIES.find(pr => pr.value === p)?.color || "#94a3b8";

    // ─── Kanban Board ────────────────────────────────────
    const renderBoard = () => {
        const boardStages = STAGES.filter(s => s.value !== "closed_lost");
        return (
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                {boardStages.map((stage, si) => {
                    const stageDeals = filteredDeals.filter(d => d.stage === stage.value);
                    const stageTotal = stageDeals.reduce((s, d) => s + (d.amount || 0), 0);
                    return (
                        <motion.div key={stage.value} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}
                            style={{ minWidth: 260, maxWidth: 280, flex: "0 0 auto", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)", borderRadius: 10, padding: 12, borderTop: `3px solid ${stage.color}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                                <div>
                                    <Text strong style={{ fontSize: 13 }}>{stage.label}</Text><br />
                                    <Text type="secondary" style={{ fontSize: 11 }}>{stageDeals.length} deals · {fmtShort(stageTotal)}</Text>
                                </div>
                                <Badge count={stageDeals.length} style={{ backgroundColor: stage.color }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
                                {stageDeals.length === 0 && <Text type="secondary" style={{ fontSize: 12, textAlign: "center", padding: 20 }}>No deals</Text>}
                                {stageDeals.map(deal => (
                                    <motion.div key={deal.id}
                                        whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        style={{
                                            borderRadius: 8, padding: 12,
                                            background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                                            border: "1px solid rgba(0,0,0,0.06)",
                                            borderLeft: `3px solid ${priorityBorderColor(deal.priority)}`,
                                            cursor: "default",
                                        }}>
                                        {/* Deal name + account */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                            <Text strong style={{ fontSize: 13 }}>{deal.dealName}</Text>
                                            {deal.account?.companyName && (
                                                <Tag style={{ fontSize: 9, margin: 0, borderRadius: 10 }}>
                                                    {deal.account.companyName}
                                                </Tag>
                                            )}
                                        </div>

                                        {/* Amount + probability */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                                            <Text style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>
                                                {fmt(deal.amount)}
                                            </Text>
                                            <Tag color={stage.color} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>
                                                {deal.probability}%
                                            </Tag>
                                        </div>

                                        {/* Close date + owner avatar */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                                            {deal.closeDate ? (
                                                <Text style={{ fontSize: 11, color: closeDateColor(deal.closeDate) }}>
                                                    <CalendarOutlined style={{ marginRight: 3 }} />
                                                    {dayjs(deal.closeDate).format("MMM D")}
                                                    {dayjs(deal.closeDate).isBefore(dayjs(), "day") && " (overdue)"}
                                                </Text>
                                            ) : <span />}
                                            {deal.ownerId && (
                                                <div style={{
                                                    width: 24, height: 24, borderRadius: "50%",
                                                    background: `${themeColor}20`, color: themeColor,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: 10, fontWeight: 700,
                                                }}>
                                                    {deal.ownerId.slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Contact + next step */}
                                        {(deal.contact || deal.nextStep) && (
                                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(0,0,0,0.06)" }}>
                                                {deal.contact && (
                                                    <Text type="secondary" style={{ fontSize: 10, display: "block" }}>
                                                        👤 {deal.contact.firstName} {deal.contact.lastName}
                                                    </Text>
                                                )}
                                                {deal.nextStep && (
                                                    <Text type="secondary" style={{ fontSize: 10, display: "block" }}>
                                                        📋 {deal.nextStep}
                                                    </Text>
                                                )}
                                            </div>
                                        )}

                                        {/* Stage move dropdown */}
                                        <Select size="small" placeholder="Move to…"
                                            style={{ width: "100%", marginTop: 8 }} value={undefined}
                                            onChange={(v) => { if (v) handleStageChange(deal.id, v); }}
                                            options={STAGES.filter(s => s.value !== deal.stage).map(s => ({
                                                value: s.value, label: `→ ${s.label}`,
                                            }))} />
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    // ─── List view columns ───────────────────────────────
    const columns: ColumnsType<Deal> = [
        { title: "Deal", key: "deal", render: (_, r) => <div><Text strong>{r.dealName}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.account?.companyName || "—"}</Text></div>, sorter: (a, b) => (a.dealName || "").localeCompare(b.dealName || "") },
        { title: "Amount", key: "amount", width: 120, align: "right", render: (_, r) => <Text strong style={{ color: "#10b981" }}>{fmt(r.amount)}</Text>, sorter: (a, b) => (a.amount || 0) - (b.amount || 0) },
        { title: "Stage", key: "stage", width: 140, render: (_, r) => { const s = STAGES.find(s => s.value === r.stage); return <Tag color={s?.color}>{s?.label || r.stage}</Tag>; } },
        { title: "Probability", key: "prob", width: 90, align: "right", render: (_, r) => `${r.probability || 0}%`, sorter: (a, b) => (a.probability || 0) - (b.probability || 0) },
        { title: "Priority", key: "priority", width: 90, render: (_, r) => <Tag color={priorityBorderColor(r.priority)}>{r.priority || "—"}</Tag> },
        { title: "Close Date", key: "close", width: 110, render: (_, r) => r.closeDate ? <Text style={{ color: closeDateColor(r.closeDate) }}>{dayjs(r.closeDate).format("MMM D, YYYY")}</Text> : "—", sorter: (a, b) => (a.closeDate || "").localeCompare(b.closeDate || "") },
        { title: "Contact", key: "contact", width: 140, render: (_, r) => r.contact ? `${r.contact.firstName} ${r.contact.lastName}` : "—" },
        { title: "Move Stage", key: "action", width: 150, render: (_, r) => <Select size="small" placeholder="Move…" style={{ width: "100%" }} value={undefined} onChange={(v) => { if (v) handleStageChange(r.id, v); }} options={STAGES.filter(s => s.value !== r.stage).map(s => ({ value: s.value, label: s.label }))} /> },
    ];

    if (loading) return <CMSLayout title="Sales Pipeline" subTitle="Loading…"><div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Sales Pipeline</AuroraText>}
            subTitle={<DecryptedText text="Visualize and manage your deal pipeline" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Segmented key="view" options={[{ value: "board", icon: <AppstoreOutlined /> }, { value: "list", icon: <UnorderedListOutlined /> }]} value={viewMode} onChange={(v) => setViewMode(v as string)} />,
                <button key="reload" onClick={loadData} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16 }}><ReloadOutlined /></button>,
            ]}
        >
            {/* ── Summary Cards ─────────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {summaryCards.map((c, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card style={{
                                ...gradientBorder(c.color),
                                borderTop: `3px solid ${c.color}`,
                                background: isDark ? `rgba(255,255,255,0.04)` : `linear-gradient(135deg, ${c.color}06, rgba(255,255,255,0.65))`,
                                backdropFilter: 'blur(12px)',
                            }} styles={{ body: { padding: "14px 16px" } }}>
                                <Statistic title={<Text style={{ fontSize: 11 }}>{c.label}</Text>} value={c.value} prefix={c.prefix}
                                    valueStyle={{ color: c.color, fontSize: 20, fontFamily: "monospace" }}
                                    formatter={c.formatter ? (v) => c.formatter!(Number(v)) : undefined} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ── Pipeline Stage Progress ───────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <Card size="small" style={{ marginBottom: 16, background: isDark ? "rgba(255,255,255,0.04)" : glass.background }}
                    styles={{ body: { padding: "12px 16px" } }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 12 }}>Stage Distribution</Text>
                        <Space size={12}>
                            <Text type="secondary" style={{ fontSize: 10 }}>Avg Cycle: {avgCycleDays}d</Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>Win Rate: {winRate}%</Text>
                        </Space>
                    </div>
                    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                        {stageDistribution.map(s => (
                            <motion.div key={s.value} initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                title={`${s.label}: ${s.count} deals (${s.pct}%)`}
                                style={{ background: s.color, minWidth: s.count > 0 ? 4 : 0, borderRadius: 2, cursor: "pointer" }}
                                onClick={() => setFunnelStageFilter(funnelStageFilter === s.value ? undefined : s.value)} />
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                        {stageDistribution.filter(s => s.count > 0).map(s => (
                            <Text key={s.value} style={{ fontSize: 10 }}>
                                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color, marginRight: 4 }} />
                                {s.label}: {s.count}
                            </Text>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* ── Funnel Visualization ──────────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card size="small" style={{ marginBottom: 16, background: isDark ? "rgba(255,255,255,0.04)" : glass.background }} styles={{ body: { padding: "16px 20px" } }}>
                    <Text strong style={{ fontSize: 13, display: "block", marginBottom: 12 }}>Pipeline Funnel</Text>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                        {funnelData.map((stage, i) => {
                            const widthPct = Math.max(stage.count / maxFunnelCount * 100, 18);
                            const isActive = funnelStageFilter === stage.value;
                            const conversionRate = i > 0 && funnelData[i - 1].count > 0
                                ? Math.round(stage.count / funnelData[i - 1].count * 100) : null;
                            return (
                                <div key={stage.value} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: `0 0 ${widthPct}%`, minWidth: 75 }}>
                                    {conversionRate !== null && (
                                        <Text style={{ fontSize: 9, color: isDark ? "#aaa" : "#888", marginBottom: 2 }}>
                                            {conversionRate}% →
                                        </Text>
                                    )}
                                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.25 + i * 0.07 }}
                                        onClick={() => setFunnelStageFilter(isActive ? undefined : stage.value)}
                                        style={{
                                            width: "100%", height: 60, borderRadius: 6, cursor: "pointer",
                                            background: `linear-gradient(135deg, ${stage.color}, ${stage.color}cc)`,
                                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                            opacity: funnelStageFilter && !isActive ? 0.4 : 1, transition: "all 0.2s",
                                            border: isActive ? "2px solid #fff" : "1px solid transparent",
                                            boxShadow: isActive ? `0 0 14px ${stage.color}60` : "0 2px 6px rgba(0,0,0,0.08)",
                                            clipPath: i === funnelData.length - 1
                                                ? undefined
                                                : "polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%, 8% 50%)",
                                        }}>
                                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: 600, lineHeight: 1 }}>{stage.label}</Text>
                                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>{stage.count}</Text>
                                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 9 }}>{fmtShort(stage.total)}</Text>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>
                    {funnelStageFilter && <Tag closable onClose={() => setFunnelStageFilter(undefined)} color={STAGES.find(s => s.value === funnelStageFilter)?.color} style={{ marginTop: 8 }}>Filtering: {STAGES.find(s => s.value === funnelStageFilter)?.label}</Tag>}
                </Card>
            </motion.div>

            {/* ── Filters & Controls ───────────────────── */}
            <Card size="small" style={{ marginBottom: 16, background: isDark ? "rgba(255,255,255,0.04)" : glass.background }} styles={{ body: { padding: "10px 14px" } }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search deals…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} allowClear />
                    <Select placeholder="Priority" value={priorityFilter} onChange={setPriorityFilter} allowClear style={{ width: 120 }} options={PRIORITIES.map(p => ({ value: p.value, label: p.label }))} />
                    <Select placeholder="Owner" value={ownerFilter} onChange={setOwnerFilter} allowClear style={{ width: 140 }}
                        options={owners.map(o => ({ value: o, label: o.slice(0, 8) + "…" }))} />
                    <Select placeholder="Close Date" value={dateRange} onChange={setDateRange} allowClear style={{ width: 130 }}
                        options={[{ value: "month", label: "This Month" }, { value: "quarter", label: "This Quarter" }, { value: "year", label: "This Year" }]} />
                    <Select placeholder="Sort" value={sortBy} onChange={setSortBy} style={{ width: 155 }}
                        options={[{ value: "amount_desc", label: "Amount ↓" }, { value: "close_asc", label: "Close Date ↑" }, { value: "prob_desc", label: "Probability ↓" }]} />
                    <FilterOutlined style={{ opacity: 0.4 }} />
                </Space>
            </Card>

            {/* ── Main View (Kanban / List) ────────────── */}
            {viewMode === "board" ? renderBoard() : (
                <Card style={{ background: isDark ? "rgba(255,255,255,0.04)" : glass.background }} styles={{ body: { padding: 0 } }}>
                    <Table scroll={{ x: 1000 }} columns={columns} dataSource={filteredDeals.filter(d => d.stage !== "closed_lost").map(d => ({ ...d, key: d.id }))}
                        pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" />
                </Card>
            )}

            {/* ── Stage Value Bar Chart ────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card size="small" title={<Space><BarChartOutlined style={{ color: themeColor }} /> Deal Value by Stage</Space>} style={{ marginTop: 16, background: isDark ? "rgba(255,255,255,0.04)" : glass.background }}>
                    <div style={{ height: 260 }}>
                        {barData.some(d => d.value > 0) ? (
                            <ResponsiveContainer>
                                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0"} />
                                    <XAxis type="number" tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                                    <RTooltip formatter={(v: number) => fmt(v)} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Deal Value">
                                        {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                        <LabelList dataKey="count" position="right" formatter={(v: number) => `${v} deals`} style={{ fontSize: 10, fill: isDark ? "#ccc" : "#666" }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <Empty description="No deal data" />}
                    </div>
                </Card>
            </motion.div>

            {/* ── Closed Deals Section ─────────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <Collapse ghost style={{ marginTop: 16 }} items={[
                    {
                        key: "closed",
                        label: (
                            <Space wrap>
                                <TrophyOutlined /> Closed Deals
                                <Tag color="green">{allWonDeals.length} Won ({fmt(totalWonAmount)})</Tag>
                                <Tag color="red">{allLostDeals.length} Lost ({fmt(totalLostAmount)})</Tag>
                                <Tag color={winRate >= 50 ? "green" : winRate >= 25 ? "orange" : "red"}>Win Rate: {winRate}%</Tag>
                            </Space>
                        ),
                        children: (
                            <Row gutter={[16, 16]}>
                                {/* Win/Loss ratio visual bar */}
                                <Col span={24}>
                                    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                                        <div style={{ width: `${winRate}%`, background: "#10b981", transition: "width 0.6s" }} />
                                        <div style={{ width: `${100 - winRate}%`, background: "#ef4444", transition: "width 0.6s" }} />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small"
                                        title={
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <Text style={{ color: "#10b981" }}><TrophyOutlined /> Won Deals</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Total: {fmt(totalWonAmount)}</Text>
                                            </div>
                                        }
                                        style={{ borderTop: "3px solid #10b981", background: isDark ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.04)" }}>
                                        {wonDeals.length === 0 ? <Empty description="No won deals yet" /> : wonDeals.map((d, i) => (
                                            <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>{d.dealName}</Text>
                                                    {d.account?.companyName && <Text type="secondary" style={{ fontSize: 10, display: "block" }}>{d.account.companyName}</Text>}
                                                    <Text type="secondary" style={{ fontSize: 10, display: "block" }}>{d.wonReason || "No reason recorded"}</Text>
                                                </div>
                                                <div style={{ textAlign: "right", minWidth: 80 }}>
                                                    <Text style={{ color: "#10b981", fontWeight: 600, fontSize: 12 }}>{fmt(d.amount)}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                                        {d.closeDate ? dayjs(d.closeDate).format("MMM D, YYYY") : ""}
                                                    </Text>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small"
                                        title={
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <Text style={{ color: "#ef4444" }}><CloseCircleOutlined /> Lost Deals</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Total: {fmt(totalLostAmount)}</Text>
                                            </div>
                                        }
                                        style={{ borderTop: "3px solid #ef4444", background: isDark ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.04)" }}>
                                        {lostDeals.length === 0 ? <Empty description="No lost deals" /> : lostDeals.map((d, i) => (
                                            <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>{d.dealName}</Text>
                                                    {d.account?.companyName && <Text type="secondary" style={{ fontSize: 10, display: "block" }}>{d.account.companyName}</Text>}
                                                    <Text type="secondary" style={{ fontSize: 10, display: "block" }}>{d.lostReason || "No reason recorded"}</Text>
                                                </div>
                                                <div style={{ textAlign: "right", minWidth: 80 }}>
                                                    <Text style={{ color: "#ef4444", fontWeight: 600, fontSize: 12 }}>{fmt(d.amount)}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                                        {d.closeDate ? dayjs(d.closeDate).format("MMM D, YYYY") : ""}
                                                    </Text>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                ]} />
            </motion.div>
        </CMSLayout>
    );
}
