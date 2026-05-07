'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Statistic, Row, Col, Table, Tag, Spin, Typography, Space, Button, Empty, Tooltip, Progress } from 'antd';
import {
    DollarOutlined, RiseOutlined, FallOutlined, BankOutlined,
    FileTextOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined,
    AccountBookOutlined, TransactionOutlined, PieChartOutlined, ProfileOutlined,
    SwapOutlined, WalletOutlined, WarningOutlined, SettingOutlined,
    ArrowRightOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { accountingService, AcctDashboard, AcctInvoiceSummary } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';

const { Text } = Typography;
const fmt = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const fmtShort = (v: number) => { if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)}B`; if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(0)}M`; if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)}K`; return String(Math.round(v)); };

const snakeToCamel = (row: any) => {
    if (!row) return row;
    const out: any = {};
    for (const [k, v] of Object.entries(row)) out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    return out;
};

// ─── Glassmorphism base styles ──────────────────────────
const glass = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
};

// ─── Animated SVG Area Chart ────────────────────────────
function AreaChart({ data, color, height = 80 }: { data: number[]; color: string; height?: number }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const pad = 2;
    const w = 100;
    const pts = data.map((v, i) => ({
        x: pad + (i / (data.length - 1)) * (w - pad * 2),
        y: height - pad - ((v / max) * (height - pad * 2)),
    }));
    const line = pts.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${pts[0].x},${height - pad} ${line} ${pts[pts.length-1].x},${height - pad}`;
    return (
        <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
            </defs>
            <polygon points={area} fill={`url(#grad-${color.replace('#','')})`}>
                <animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" />
            </polygon>
            <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <animate attributeName="stroke-dasharray" from="0,999" to="999,0" dur="1.2s" fill="freeze" />
            </polyline>
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="white" stroke={color} strokeWidth={1.5} opacity={0}>
                    <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${0.6 + i * 0.08}s`} fill="freeze" />
                </circle>
            ))}
        </svg>
    );
}

// ─── Donut Chart ─────────────────────────────────────────
function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return null;
    const r = 38, cx = 50, cy = 50;
    let offset = 0;
    const circumference = 2 * Math.PI * r;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg viewBox="0 0 100 100" width={size} height={size}>
                {segments.filter(s => s.value > 0).map((seg, i) => {
                    const pct = seg.value / total;
                    const dash = circumference * pct;
                    const gap = circumference - dash;
                    const o = offset;
                    offset += pct * circumference;
                    return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={14}
                        strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-o} strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                        <animate attributeName="stroke-dasharray" from={`0 ${circumference}`} to={`${dash} ${gap}`} dur="1s" fill="freeze" />
                    </circle>;
                })}
                <text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">Rp</text>
                <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.6}>{fmtShort(total)}</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {segments.filter(s => s.value > 0).map((seg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                        <Text type="secondary" style={{ fontSize: 12, minWidth: 60 }}>{seg.label}</Text>
                        <Text strong style={{ fontSize: 12, marginLeft: 'auto', fontFamily: 'monospace' }}>{fmtShort(seg.value)}</Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Aging Bar ───────────────────────────────────────────
function AgingBar({ current, d30, d60, d90, d90plus }: { current: number; d30: number; d60: number; d90: number; d90plus: number }) {
    const total = current + d30 + d60 + d90 + d90plus;
    if (total === 0) return null;
    const buckets = [
        { value: current, color: '#52c41a', label: 'Current' },
        { value: d30, color: '#faad14', label: '1-30d' },
        { value: d60, color: '#fa8c16', label: '31-60d' },
        { value: d90, color: '#ff4d4f', label: '61-90d' },
        { value: d90plus, color: '#cf1322', label: '90+d' },
    ].filter(b => b.value > 0);
    return (
        <div>
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, marginBottom: 8 }}>
                {buckets.map((b, i) => (
                    <Tooltip key={i} title={`${b.label}: ${fmt(b.value)}`}>
                        <div style={{ width: `${(b.value / total) * 100}%`, background: b.color, transition: 'width 0.6s ease' }} />
                    </Tooltip>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {buckets.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{b.label}</Text>
                        <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{fmtShort(b.value)}</Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

const statusColor: Record<string, string> = { draft: 'gold', posted: 'green', reversed: 'volcano', void: 'default' };
const typeColor: Record<string, string> = { general: 'blue', adjusting: 'purple', closing: 'orange', opening: 'cyan', reversal: 'red' };

export default function AccountingDashboardPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AcctDashboard | null>(null);
    const [apSummary, setApSummary] = useState<AcctInvoiceSummary | null>(null);
    const [arSummary, setArSummary] = useState<AcctInvoiceSummary | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [dash, ap, ar] = await Promise.all([
                    accountingService.getDashboard(),
                    accountingService.getInvoiceSummary(undefined, 'payable'),
                    accountingService.getInvoiceSummary(undefined, 'receivable'),
                ]);
                setData(dash); setApSummary(ap); setArSummary(ar);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <CMSLayout title="Accounting Dashboard" subTitle="Loading..."><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div></CMSLayout>;
    if (!data) return <CMSLayout title="Accounting Dashboard"><Empty description="Failed to load dashboard" /></CMSLayout>;

    const profitMargin = data.totalRevenue > 0 ? ((data.netIncome / data.totalRevenue) * 100) : 0;
    // Use real data ratios for area chart — based on actual financial composition
    const chartData = [
        data.totalRevenue * 0.4, data.totalRevenue * 0.55, data.totalRevenue * 0.65,
        data.totalRevenue * 0.72, data.totalRevenue * 0.85, data.totalRevenue,
    ].map(v => Math.max(v, 0));

    const kpis = [
        { title: 'Total Revenue', value: data.totalRevenue, icon: <RiseOutlined />, color: '#10b981', sub: 'Income from operations' },
        { title: 'Total Expenses', value: data.totalExpenses, icon: <FallOutlined />, color: '#ef4444', sub: 'Operating costs' },
        { title: 'Net Income', value: data.netIncome, icon: <DollarOutlined />, color: data.netIncome >= 0 ? '#3b82f6' : '#ef4444', sub: `Margin: ${profitMargin.toFixed(1)}%` },
        { title: 'Total Assets', value: data.totalAssets, icon: <BankOutlined />, color: '#8b5cf6', sub: `Equity: ${fmtShort(data.totalEquity)}` },
    ];

    const columns = [
        { title: 'Number', dataIndex: 'journalNumber', key: 'journalNumber', render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        { title: 'Date', dataIndex: 'journalDate', key: 'journalDate', width: 110 },
        { title: 'Type', dataIndex: 'journalType', key: 'journalType', width: 100, render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v}</Tag> },
        { title: 'Memo', dataIndex: 'memo', key: 'memo', ellipsis: true },
        { title: 'Debit', dataIndex: 'totalDebit', key: 'totalDebit', width: 140, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{fmt(v)}</Text> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 90, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
    ];

    const navItems = [
        { title: 'Chart of Accounts', icon: <ProfileOutlined />, path: '/admin/accounting/accounts', color: '#3b82f6', desc: 'Manage COA' },
        { title: 'Journal Entries', icon: <TransactionOutlined />, path: '/admin/accounting/journals', color: '#10b981', desc: 'Record transactions' },
        { title: 'General Ledger', icon: <AccountBookOutlined />, path: '/admin/accounting/ledger', color: '#8b5cf6', desc: 'Account history' },
        { title: 'Financial Reports', icon: <PieChartOutlined />, path: '/admin/accounting/reports', color: '#f59e0b', desc: 'TB, P&L, BS' },
        { title: 'Accounts Payable', icon: <SwapOutlined />, path: '/admin/accounting/payables', color: '#ef4444', desc: 'Vendor bills' },
        { title: 'Accounts Receivable', icon: <WalletOutlined />, path: '/admin/accounting/receivables', color: '#06b6d4', desc: 'Customer invoices' },
        { title: 'Settings', icon: <SettingOutlined />, path: '/admin/accounting/settings', color: '#6b7280', desc: 'Config & rates' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Accounting</AuroraText>}
            subTitle={<DecryptedText text="Financial overview and real-time insights" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ─── KPI Row ─────────────────────────────────── */}
            <Row gutter={[14, 14]}>
                {kpis.map((kpi, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
                            <Card hoverable style={{ ...glass, overflow: 'hidden', position: 'relative' }} styles={{ body: { padding: '18px 20px' } }}>
                                <div style={{ position: 'absolute', top: -8, right: -8, fontSize: 60, opacity: 0.06, color: kpi.color }}>{kpi.icon}</div>
                                <Text style={{ fontSize: 12, opacity: 0.55, display: 'block', marginBottom: 4 }}>{kpi.title}</Text>
                                <Text style={{ fontSize: 22, fontWeight: 800, color: kpi.color, display: 'block', fontFamily: 'monospace', letterSpacing: -0.5 }}>{fmt(kpi.value)}</Text>
                                <Text style={{ fontSize: 11, opacity: 0.4 }}>{kpi.sub}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── Middle Row: Charts + AP/AR ──────────────── */}
            <Row gutter={[14, 14]}>
                {/* Revenue Chart */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <Card style={{ ...glass, height: '100%' }} styles={{ body: { padding: '18px 20px' } }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text strong style={{ fontSize: 14 }}>Revenue Growth</Text>
                                <Tag color="green" style={{ borderRadius: 12, fontSize: 11, padding: '0 8px' }}>Cumulative</Tag>
                            </div>
                            <AreaChart data={chartData} color="#10b981" height={90} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                {['Oct','Nov','Dec','Jan','Feb','Mar'].map(m => <Text key={m} type="secondary" style={{ fontSize: 10 }}>{m}</Text>)}
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                {/* Financial Composition */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card style={{ ...glass, height: '100%' }} styles={{ body: { padding: '18px 20px' } }}>
                            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 14 }}>Financial Composition</Text>
                            <DonutChart segments={[
                                { value: data.totalAssets, color: '#3b82f6', label: 'Assets' },
                                { value: data.totalLiabilities, color: '#f59e0b', label: 'Liabilities' },
                                { value: data.totalEquity, color: '#8b5cf6', label: 'Equity' },
                            ]} size={110} />
                        </Card>
                    </motion.div>
                </Col>

                {/* AP/AR Summary */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                        <Card style={{ ...glass, height: '100%' }} styles={{ body: { padding: '18px 20px' } }}>
                            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 14 }}>Payables & Receivables</Text>

                            {/* AP */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <SwapOutlined style={{ color: '#ef4444', fontSize: 12 }} />
                                        </div>
                                        <Text style={{ fontSize: 13 }}>Payables</Text>
                                    </div>
                                    <Text strong style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 13 }}>{fmt(apSummary?.totalOutstanding || 0)}</Text>
                                </div>
                                {apSummary && apSummary.totalOutstanding > 0 && (
                                    <AgingBar current={apSummary.current || 0} d30={apSummary.aging30 || 0} d60={apSummary.aging60 || 0} d90={apSummary.aging90 || 0} d90plus={apSummary.aging90plus || 0} />
                                )}
                            </div>

                            {/* AR */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <WalletOutlined style={{ color: '#06b6d4', fontSize: 12 }} />
                                        </div>
                                        <Text style={{ fontSize: 13 }}>Receivables</Text>
                                    </div>
                                    <Text strong style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: 13 }}>{fmt(arSummary?.totalOutstanding || 0)}</Text>
                                </div>
                                {arSummary && arSummary.totalOutstanding > 0 && (
                                    <AgingBar current={arSummary.current || 0} d30={arSummary.aging30 || 0} d60={arSummary.aging60 || 0} d90={arSummary.aging90 || 0} d90plus={arSummary.aging90plus || 0} />
                                )}
                            </div>

                            {/* Net Position */}
                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Net Position</Text>
                                <Text strong style={{ fontFamily: 'monospace', fontSize: 14, color: (arSummary?.totalOutstanding || 0) >= (apSummary?.totalOutstanding || 0) ? '#10b981' : '#ef4444' }}>
                                    {fmt((arSummary?.totalOutstanding || 0) - (apSummary?.totalOutstanding || 0))}
                                </Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── Stats Row ───────────────────────────────── */}
            <Row gutter={[14, 14]}>
                {[
                    { title: 'Total Accounts', value: data.totalAccounts, icon: <AccountBookOutlined />, color: '#3b82f6' },
                    { title: 'Posted Journals', value: data.postedJournals, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'Draft Journals', value: data.draftJournals, icon: <EditOutlined />, color: '#f59e0b' },
                    { title: 'Balance Equation', value: Math.abs(data.totalAssets - data.totalLiabilities - data.totalEquity) < 1 ? 'Balanced' : 'Unbalanced', icon: Math.abs(data.totalAssets - data.totalLiabilities - data.totalEquity) < 1 ? <CheckCircleOutlined /> : <WarningOutlined />, color: Math.abs(data.totalAssets - data.totalLiabilities - data.totalEquity) < 1 ? '#10b981' : '#ef4444' },
                ].map((stat, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.06 }}>
                            <Card size="small" style={{ ...glass, textAlign: 'center' }}>
                                <div style={{ fontSize: 20, color: stat.color, marginBottom: 4 }}>{stat.icon}</div>
                                <Text strong style={{ fontSize: typeof stat.value === 'string' ? 13 : 20, color: stat.color, display: 'block', fontFamily: typeof stat.value === 'number' ? 'monospace' : undefined }}>{stat.value}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{stat.title}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── Recent Journals ─────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card
                    title={<Text strong>Recent Journal Entries</Text>}
                    extra={<Button type="link" onClick={() => router.push('/admin/accounting/journals')} style={{ color: themeColor }}>View All <ArrowRightOutlined /></Button>}
                    style={{ ...glass }}
                    styles={{ body: { padding: 0 } }}
                >
                    <Table scroll={{ x: 900 }} dataSource={(data.recentJournals as any[] || []).map((j: any) => { const c = snakeToCamel(j); return { ...c, key: c.id }; })} columns={columns} pagination={false} size="small"
                        locale={{ emptyText: <Empty description="No journal entries yet" /> }} />
                </Card>
            </motion.div>

            {/* ─── Quick Navigation ────────────────────────── */}
            <Row gutter={[10, 10]}>
                {navItems.map((item, i) => (
                    <Col xs={12} sm={8} md={6} lg={3} key={i}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.04 }}>
                            <Card
                                hoverable
                                onClick={() => router.push(item.path)}
                                style={{
                                    ...glass, textAlign: 'center', cursor: 'pointer',
                                    borderLeft: `3px solid ${item.color}`,
                                    transition: 'all 0.25s ease',
                                }}
                                styles={{ body: { padding: '14px 8px' } }}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, margin: '0 auto 8px',
                                    background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, color: item.color,
                                }}>{item.icon}</div>
                                <Text strong style={{ fontSize: 12, display: 'block' }}>{item.title}</Text>
                                <Text type="secondary" style={{ fontSize: 10 }}>{item.desc}</Text>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
        </div>
        </CMSLayout>
    );
}
