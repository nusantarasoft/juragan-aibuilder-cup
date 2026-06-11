"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, Empty, Table, Tag, theme } from "antd";
import {
    DollarOutlined, RiseOutlined, FallOutlined, BankOutlined,
    WalletOutlined, SwapOutlined, PieChartOutlined, BarChartOutlined,
    FundOutlined, AuditOutlined, TeamOutlined, ShopOutlined,
    DashboardOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell,
    ReferenceLine, Legend,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const fmt = (v: number) => v ? `Rp ${v.toLocaleString('id-ID')}` : 'Rp 0';
const fmtShort = (v: number) => { if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}B`; if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}M`; if (Math.abs(v) >= 1e3) return `Rp ${(v / 1e3).toFixed(0)}K`; return `Rp ${Math.round(v)}`; };

// ─── GraphQL Queries ───────────────────────────────────────
const GET_DASHBOARD = `query($tenantId: String!) { accountingDashboard(tenantId: $tenantId) }`;
const GET_JOURNALS = `query($tenantId: String!) { accountingJournalEntries(tenantId: $tenantId) { id entryNumber date description status totalDebit totalCredit lines { id accountId accountName debit credit description } createdAt } }`;
const GET_ACCOUNTS = `query($tenantId: String!) { accountingChartOfAccounts(tenantId: $tenantId) { id code name type normalBalance parentId isActive } }`;
const GET_INVOICES_AP = `query($tenantId: String!) { accountingInvoices(tenantId: $tenantId, type: "payable") { id invoiceNumber contactId contactName type status issueDate dueDate totalAmount paidAmount balanceDue createdAt } }`;
const GET_INVOICES_AR = `query($tenantId: String!) { accountingInvoices(tenantId: $tenantId, type: "receivable") { id invoiceNumber contactId contactName type status issueDate dueDate totalAmount paidAmount balanceDue createdAt } }`;

interface Account { id: string; code: string; name: string; type: string; normalBalance: string; parentId: string; isActive: boolean; }
interface JournalLine { id: string; accountId: string; accountName: string; debit: number; credit: number; description: string; }
interface Journal { id: string; entryNumber: string; date: string; description: string; status: string; totalDebit: number; totalCredit: number; lines: JournalLine[]; createdAt: string; }
interface Invoice { id: string; invoiceNumber: string; contactId: string; contactName: string; type: string; status: string; issueDate: string; dueDate: string; totalAmount: number; paidAmount: number; balanceDue: number; createdAt: string; }

export default function FinancialAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<any>(null);
    const [journals, setJournals] = useState<Journal[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [invoicesAR, setInvoicesAR] = useState<Invoice[]>([]);
    const [invoicesAP, setInvoicesAP] = useState<Invoice[]>([]);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => {
        const vars = { tenantId: DEFAULT_TENANT_ID };
        Promise.allSettled([
            gql(GET_DASHBOARD, vars), gql(GET_JOURNALS, vars), gql(GET_ACCOUNTS, vars),
            gql(GET_INVOICES_AR, vars), gql(GET_INVOICES_AP, vars),
        ]).then(([d, j, a, ar, ap]) => {
            if (d.status === 'fulfilled') setDashboard((d.value as any).accountingDashboard);
            if (j.status === 'fulfilled') setJournals((j.value as any).accountingJournalEntries || []);
            if (a.status === 'fulfilled') setAccounts((a.value as any).accountingChartOfAccounts || []);
            if (ar.status === 'fulfilled') setInvoicesAR((ar.value as any).accountingInvoices || []);
            if (ap.status === 'fulfilled') setInvoicesAP((ap.value as any).accountingInvoices || []);
        }).finally(() => setLoading(false));
    }, []);

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    // ─── Derived data ──────────────────────────────────────
    const dash = dashboard ? (typeof dashboard === 'string' ? JSON.parse(dashboard) : dashboard) : {};
    const totalRevenue = dash.totalRevenue || dash.total_revenue || 0;
    const totalExpenses = dash.totalExpenses || dash.total_expenses || 0;
    const netIncome = totalRevenue - totalExpenses;
    const totalAssets = dash.totalAssets || dash.total_assets || 0;
    const totalLiabilities = dash.totalLiabilities || dash.total_liabilities || 0;
    const totalEquity = dash.totalEquity || dash.total_equity || 0;
    const arOutstanding = invoicesAR.reduce((s, i) => s + (i.balanceDue || 0), 0);
    const apOutstanding = invoicesAP.reduce((s, i) => s + (i.balanceDue || 0), 0);
    const cashRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities) : 0;

    // ─── 1. KPI Cards ───────────────────────────────────────
    const kpis = [
        { title: 'Revenue', value: totalRevenue, icon: <RiseOutlined />, color: '#10b981', sub: 'Total income' },
        { title: 'Expenses', value: totalExpenses, icon: <FallOutlined />, color: '#ef4444', sub: 'Total costs' },
        { title: 'Net Income', value: netIncome, icon: <DollarOutlined />, color: netIncome >= 0 ? '#3b82f6' : '#ef4444', sub: `Margin: ${totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0'}%` },
        { title: 'AR Outstanding', value: arOutstanding, icon: <WalletOutlined />, color: '#06b6d4', sub: `${invoicesAR.filter(i => i.balanceDue > 0).length} invoices` },
        { title: 'AP Outstanding', value: apOutstanding, icon: <SwapOutlined />, color: '#f59e0b', sub: `${invoicesAP.filter(i => i.balanceDue > 0).length} bills` },
        { title: 'Cash Ratio', value: cashRatio, icon: <BankOutlined />, color: '#8b5cf6', sub: cashRatio >= 1 ? 'Healthy' : 'Low liquidity', isCurrency: false },
    ];

    // ─── 2. Revenue vs Expenses Trend ──────────────────────
    const revExpTrend = useMemo(() => {
        const map: Record<string, { revenue: number; expenses: number }> = {};
        const months = Array.from({ length: 12 }, (_, i) => dayjs().subtract(11 - i, 'month').format('YYYY-MM'));
        months.forEach(m => { map[m] = { revenue: 0, expenses: 0 }; });
        journals.filter(j => j.status === 'posted').forEach(j => {
            const m = dayjs(j.date || j.createdAt).format('YYYY-MM');
            if (!map[m]) return;
            (j.lines || []).forEach(l => {
                const acct = accounts.find(a => a.id === l.accountId);
                if (acct?.type === 'revenue' || acct?.type === 'income') map[m].revenue += (l.credit || 0) - (l.debit || 0);
                if (acct?.type === 'expense' || acct?.type === 'expenses') map[m].expenses += (l.debit || 0) - (l.credit || 0);
            });
        });
        return months.map(m => ({ month: dayjs(m).format('MMM YY'), revenue: Math.abs(map[m].revenue), expenses: Math.abs(map[m].expenses), net: Math.abs(map[m].revenue) - Math.abs(map[m].expenses) }));
    }, [journals, accounts]);

    // ─── 3. Account Type Distribution ──────────────────────
    const acctTypeDist = useMemo(() => {
        const typeMap: Record<string, number> = {};
        accounts.filter(a => a.isActive).forEach(a => {
            const t = (a.type || 'other').charAt(0).toUpperCase() + (a.type || 'other').slice(1);
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        return Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [accounts]);

    // ─── 4. Aging Analysis ─────────────────────────────────
    const agingData = useMemo(() => {
        const buckets = ['Current', '1-30d', '31-60d', '61-90d', '90+d'];
        const calcBucket = (inv: Invoice) => {
            if (inv.balanceDue <= 0) return -1;
            const days = dayjs().diff(dayjs(inv.dueDate), 'day');
            if (days <= 0) return 0; if (days <= 30) return 1; if (days <= 60) return 2; if (days <= 90) return 3; return 4;
        };
        return buckets.map((name, idx) => ({
            bucket: name,
            ar: invoicesAR.filter(i => calcBucket(i) === idx).reduce((s, i) => s + i.balanceDue, 0),
            ap: invoicesAP.filter(i => calcBucket(i) === idx).reduce((s, i) => s + i.balanceDue, 0),
        }));
    }, [invoicesAR, invoicesAP]);

    // ─── 5. Monthly Cash Flow ──────────────────────────────
    const cashFlowData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => dayjs().subtract(11 - i, 'month').format('YYYY-MM'));
        const map: Record<string, { inflow: number; outflow: number }> = {};
        months.forEach(m => { map[m] = { inflow: 0, outflow: 0 }; });
        invoicesAR.forEach(i => { const m = dayjs(i.issueDate || i.createdAt).format('YYYY-MM'); if (map[m]) map[m].inflow += i.paidAmount || 0; });
        invoicesAP.forEach(i => { const m = dayjs(i.issueDate || i.createdAt).format('YYYY-MM'); if (map[m]) map[m].outflow += i.paidAmount || 0; });
        return months.map(m => ({ month: dayjs(m).format('MMM'), inflow: map[m].inflow, outflow: -map[m].outflow }));
    }, [invoicesAR, invoicesAP]);

    // ─── 6. Top Customers by Revenue ───────────────────────
    const topCustomers = useMemo(() => {
        const map: Record<string, { name: string; total: number }> = {};
        invoicesAR.forEach(i => {
            const key = i.contactId || i.contactName || 'Unknown';
            if (!map[key]) map[key] = { name: i.contactName || 'Unknown', total: 0 };
            map[key].total += i.totalAmount || 0;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
    }, [invoicesAR]);

    // ─── 7. Top Vendors by Expense ─────────────────────────
    const topVendors = useMemo(() => {
        const map: Record<string, { name: string; total: number }> = {};
        invoicesAP.forEach(i => {
            const key = i.contactId || i.contactName || 'Unknown';
            if (!map[key]) map[key] = { name: i.contactName || 'Unknown', total: 0 };
            map[key].total += i.totalAmount || 0;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
    }, [invoicesAP]);

    // ─── 8. Invoice Status ─────────────────────────────────
    const invoiceStatusData = useMemo(() => {
        const calc = (items: Invoice[]) => {
            const map: Record<string, number> = {};
            items.forEach(i => { const s = i.status || 'unknown'; map[s] = (map[s] || 0) + 1; });
            return Object.entries(map).map(([name, value]) => ({ name, value }));
        };
        return { ar: calc(invoicesAR), ap: calc(invoicesAP) };
    }, [invoicesAR, invoicesAP]);
    const arTotal = invoicesAR.reduce((s, i) => s + (i.balanceDue || 0), 0);
    const apTotal = invoicesAP.reduce((s, i) => s + (i.balanceDue || 0), 0);

    // ─── 9. Expense by Category ────────────────────────────
    const expenseByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        journals.filter(j => j.status === 'posted').forEach(j => {
            (j.lines || []).forEach(l => {
                const acct = accounts.find(a => a.id === l.accountId);
                if (acct?.type === 'expense' || acct?.type === 'expenses') {
                    const name = acct.name || 'Other';
                    map[name] = (map[name] || 0) + Math.abs((l.debit || 0) - (l.credit || 0));
                }
            });
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [journals, accounts]);

    // ─── 10. Financial Ratios ──────────────────────────────
    const currentAssets = totalAssets * 0.6;
    const currentLiabilities = totalLiabilities * 0.5;
    const quickAssets = currentAssets * 0.8;
    const dailySales = totalRevenue / 365;
    const dailyPurchases = totalExpenses / 365;
    const ratios = [
        { name: 'Current Ratio', value: currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : 'N/A', threshold: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0, good: 1.5, warn: 1.0 },
        { name: 'Quick Ratio', value: currentLiabilities > 0 ? (quickAssets / currentLiabilities).toFixed(2) : 'N/A', threshold: currentLiabilities > 0 ? quickAssets / currentLiabilities : 0, good: 1.0, warn: 0.5 },
        { name: 'Debt-to-Equity', value: totalEquity > 0 ? (totalLiabilities / totalEquity).toFixed(2) : 'N/A', threshold: totalEquity > 0 ? totalLiabilities / totalEquity : 99, good: 0.5, warn: 1.5, invert: true },
        { name: 'Gross Margin', value: totalRevenue > 0 ? `${((netIncome / totalRevenue) * 100).toFixed(1)}%` : 'N/A', threshold: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0, good: 30, warn: 15 },
        { name: 'Net Margin', value: totalRevenue > 0 ? `${((netIncome / totalRevenue) * 100).toFixed(1)}%` : 'N/A', threshold: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0, good: 10, warn: 5 },
        { name: 'DSO (Days)', value: dailySales > 0 ? Math.round(arOutstanding / dailySales).toString() : 'N/A', threshold: dailySales > 0 ? arOutstanding / dailySales : 99, good: 30, warn: 60, invert: true },
        { name: 'DPO (Days)', value: dailyPurchases > 0 ? Math.round(apOutstanding / dailyPurchases).toString() : 'N/A', threshold: dailyPurchases > 0 ? apOutstanding / dailyPurchases : 0, good: 45, warn: 30 },
    ];
    const getTraffic = (r: typeof ratios[0]) => {
        if (r.value === 'N/A') return 'default';
        if (r.invert) return r.threshold <= r.good ? 'green' : r.threshold <= r.warn ? 'gold' : 'red';
        return r.threshold >= r.good ? 'green' : r.threshold >= r.warn ? 'gold' : 'red';
    };

    if (loading) return (
        <CMSLayout title="Financial Analytics" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#8b5cf6', '#10b981', themeColor]} className="text-[22px] font-bold tracking-tight">Financial Analytics</AuroraText>}
            subTitle={<DecryptedText text="Deep financial analytics — performance, trends & insights" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ─── 1. KPI Cards ──────────────────────────────── */}
            <Row gutter={[12, 12]}>
                {kpis.map((k, i) => (
                    <Col key={i} xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${k.color}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{k.title}</Text>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: 'monospace', lineHeight: 1.3 }}>
                                            {(k as any).isCurrency === false ? Number(k.value).toFixed(2) : fmtShort(k.value)}
                                        </div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: 16 }}>{k.icon}</div>
                                </div>
                                <Text type="secondary" style={{ fontSize: 10 }}>{k.sub}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── 2. Revenue vs Expenses Trend ─────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard} title={<><FundOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Revenue vs Expenses (12 Months)</Text></>}>
                    <div style={{ height: 300 }}>
                        {revExpTrend.some(d => d.revenue > 0 || d.expenses > 0) ? (
                            <ResponsiveContainer>
                                <AreaChart data={revExpTrend}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.02} /></linearGradient>
                                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} /></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="month" tick={tickStyle} />
                                    <YAxis tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                    <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
                                    <Area type="monotone" dataKey="net" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="6 3" name="Net Income" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <Empty description="No trend data available" />}
                    </div>
                </Card>
            </motion.div>

            {/* ─── 3. Account Type + 4. Aging Analysis ──────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><PieChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Account Type Distribution</Text></>}>
                            <div style={{ height: 280 }}>
                                {acctTypeDist.length > 0 ? (
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={acctTypeDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: isDark ? '#666' : '#999', strokeWidth: 1 }}>
                                                {acctTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <RTooltip contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No account data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><BarChartOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Aging Analysis (AR vs AP)</Text></>}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer>
                                    <BarChart data={agingData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="bucket" tick={tickStyle} />
                                        <YAxis tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                        <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="ar" name="Receivables" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} />
                                        <Bar dataKey="ap" name="Payables" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 5. Monthly Cash Flow ─────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <Card size="small" style={glassCard} title={<><DashboardOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Monthly Cash Flow</Text></>}>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart data={cashFlowData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="month" tick={tickStyle} />
                                <YAxis tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                <RTooltip formatter={(v: number) => fmt(Math.abs(v))} contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <ReferenceLine y={0} stroke={isDark ? '#555' : '#ccc'} />
                                <Bar dataKey="inflow" name="Inflows" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="outflow" name="Outflows" fill="#ef4444" radius={[0, 0, 4, 4]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* ─── 6 & 7. Top Customers + Vendors ───────────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><TeamOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Top 10 Customers by Revenue</Text></>}>
                            <div style={{ height: 300 }}>
                                {topCustomers.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={topCustomers} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                            <YAxis dataKey="name" type="category" tick={tickStyle} width={100} />
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                            <Bar dataKey="total" name="Revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No customer data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><ShopOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Top 10 Vendors by Expense</Text></>}>
                            <div style={{ height: 300 }}>
                                {topVendors.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={topVendors} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={tickStyle} />
                                            <YAxis dataKey="name" type="category" tick={tickStyle} width={100} />
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                            <Bar dataKey="total" name="Expense" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No vendor data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 8. Invoice Status (AR + AP Donuts) ───────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><AuditOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>AR Invoice Status</Text></>}>
                            <div style={{ height: 260, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#06b6d4' }}>{fmtShort(arTotal)}</div>
                                    <Text type="secondary" style={{ fontSize: 9 }}>Outstanding</Text>
                                </div>
                                {invoiceStatusData.ar.length > 0 ? (
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={invoiceStatusData.ar} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: isDark ? '#666' : '#999', strokeWidth: 1 }}>
                                                {invoiceStatusData.ar.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <RTooltip contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No AR invoices" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><AuditOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>AP Invoice Status</Text></>}>
                            <div style={{ height: 260, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{fmtShort(apTotal)}</div>
                                    <Text type="secondary" style={{ fontSize: 9 }}>Outstanding</Text>
                                </div>
                                {invoiceStatusData.ap.length > 0 ? (
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={invoiceStatusData.ap} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: isDark ? '#666' : '#999', strokeWidth: 1 }}>
                                                {invoiceStatusData.ap.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                                            </Pie>
                                            <RTooltip contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No AP invoices" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 9. Expense by Category ───────────────────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><PieChartOutlined style={{ color: '#ec4899' }} /> <Text strong style={{ fontSize: 13 }}>Expense by Category</Text></>}>
                            <div style={{ height: 280 }}>
                                {expenseByCategory.length > 0 ? (
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={95} paddingAngle={2} dataKey="value"
                                                label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + '…' : name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: isDark ? '#666' : '#999', strokeWidth: 1 }}>
                                                {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <RTooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Empty description="No expense data" />}
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                {/* ─── 10. Financial Ratios Table ───────────── */}
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><BarChartOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Financial Ratios</Text></>}>
                            <Table dataSource={ratios} pagination={false} size="small" rowKey="name"
                                columns={[
                                    { title: 'Ratio', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                    { title: 'Value', dataIndex: 'value', key: 'value', align: 'right' as const, render: (v: string) => <Text style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{v}</Text> },
                                    {
                                        title: 'Status', key: 'status', width: 80, align: 'center' as const,
                                        render: (_: any, r: typeof ratios[0]) => {
                                            const color = getTraffic(r);
                                            const label = color === 'green' ? 'Good' : color === 'gold' ? 'Fair' : color === 'red' ? 'Poor' : '—';
                                            return <Tag color={color} style={{ borderRadius: 8, margin: 0, fontSize: 10 }}>{label}</Tag>;
                                        },
                                    },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </div>
        </CMSLayout>
    );
}
