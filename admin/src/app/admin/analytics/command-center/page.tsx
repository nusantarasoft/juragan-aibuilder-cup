"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, Table, Tag, Tooltip, theme, Progress, Badge } from "antd";
import {
    DashboardOutlined, ThunderboltOutlined, TeamOutlined, AlertOutlined,
    CloudServerOutlined, DatabaseOutlined, AppstoreOutlined, DesktopOutlined,
    MobileOutlined, TabletOutlined, WarningOutlined, CheckCircleOutlined,
    ClockCircleOutlined, FireOutlined, RiseOutlined, ApiOutlined,
    BugOutlined, GlobalOutlined, BarChartOutlined, PieChartOutlined,
    SafetyCertificateOutlined, FundOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell,
    LineChart, Line,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#14b8a6', '#a855f7'];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Mock Data Generators ─────────────────────────────────
function generateTrafficData() {
    const data: { time: string; rps: number }[] = [];
    let base = 210;
    for (let i = 0; i < 300; i++) {
        base += rand(-15, 18);
        if (base < 80) base = 100;
        if (base > 420) base = 380;
        const sec = 300 - i;
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        data.push({ time: `-${m}:${s.toString().padStart(2, '0')}`, rps: base });
    }
    return data.reverse();
}

function generateHeatmap() {
    const modules = ['PM', 'ITSM', 'CRM', 'HR', 'E-Commerce', 'Inventory', 'Accounting'];
    return modules.map(mod => {
        const hours: number[] = [];
        for (let h = 0; h < 24; h++) {
            const isWork = h >= 8 && h <= 18;
            hours.push(isWork ? rand(200, 2800) : rand(10, 300));
        }
        return { module: mod, hours };
    });
}

function generateAlerts() {
    const severities = ['critical', 'warning', 'info', 'warning', 'info', 'info', 'critical', 'warning', 'info', 'info',
        'warning', 'info', 'info', 'warning', 'critical', 'info', 'warning', 'info', 'info', 'warning'] as const;
    const messages = [
        'CPU utilization exceeded 90% on node-3', 'Memory usage above 85% on middleware',
        'Auto-scaling triggered for e-commerce service', 'SSL certificate expires in 14 days',
        'Database replication lag: 2.3s', 'Rate limit threshold reached on /api/v1/search',
        'Disk space below 10% on storage-02', 'Unusual login pattern detected from 103.x.x.x',
        'GraphQL query complexity exceeded limit', 'Backup completed successfully for prod-db',
        'Container restart detected: itsm-worker-3', 'CDN cache hit rate dropped to 82%',
        'New deployment detected: crm-service v2.14.1', 'Response time P99 exceeded 1s on /graphql',
        'Connection pool exhausted on primary DB', 'Health check passed for all 24 services',
        'Queue depth exceeded 1000 on notification-queue', 'Scheduled maintenance window in 2h',
        'API key rotation completed', 'High error rate detected on payment gateway',
    ];
    const sources = ['Infrastructure', 'Middleware', 'E-Commerce', 'Security', 'Database', 'API Gateway',
        'Infrastructure', 'Security', 'Middleware', 'Database', 'ITSM', 'CDN', 'CRM', 'Middleware',
        'Database', 'Health Monitor', 'Messaging', 'Scheduler', 'Security', 'Payments'];
    return messages.map((msg, i) => ({
        key: `${i}`, severity: severities[i], message: msg, source: sources[i],
        timestamp: `${rand(0, 23).toString().padStart(2, '0')}:${rand(0, 59).toString().padStart(2, '0')}:${rand(0, 59).toString().padStart(2, '0')}`,
    }));
}

const REGIONS = [
    { region: 'Jakarta', flag: '🇮🇩', pct: 34.2, sessions: 2890 },
    { region: 'Singapore', flag: '🇸🇬', pct: 18.5, sessions: 1567 },
    { region: 'Surabaya', flag: '🇮🇩', pct: 11.8, sessions: 999 },
    { region: 'Bandung', flag: '🇮🇩', pct: 8.4, sessions: 711 },
    { region: 'Medan', flag: '🇮🇩', pct: 6.2, sessions: 525 },
    { region: 'Bali', flag: '🇮🇩', pct: 5.1, sessions: 432 },
    { region: 'Kuala Lumpur', flag: '🇲🇾', pct: 4.3, sessions: 364 },
    { region: 'Makassar', flag: '🇮🇩', pct: 3.8, sessions: 322 },
    { region: 'Semarang', flag: '🇮🇩', pct: 3.2, sessions: 271 },
    { region: 'Yogyakarta', flag: '🇮🇩', pct: 2.7, sessions: 229 },
];

const WATERFALL = [
    { stage: 'DNS Lookup', ms: 5, color: '#06b6d4' },
    { stage: 'TCP Connect', ms: 12, color: '#3b82f6' },
    { stage: 'TLS Handshake', ms: 18, color: '#8b5cf6' },
    { stage: 'Server Processing', ms: 45, color: '#f59e0b' },
    { stage: 'Content Transfer', ms: 8, color: '#10b981' },
];

const ERROR_TYPES = [
    { name: '4xx Client', value: 1245, color: '#f59e0b' },
    { name: '5xx Server', value: 342, color: '#ef4444' },
    { name: 'Timeout', value: 189, color: '#8b5cf6' },
    { name: 'Connection Reset', value: 67, color: '#06b6d4' },
];

const ERROR_ENDPOINTS = [
    { key: '1', endpoint: '/api/v1/payments/process', count: 89, rate: 2.4, last: '2 min ago' },
    { key: '2', endpoint: '/api/v1/inventory/sync', count: 67, rate: 1.8, last: '5 min ago' },
    { key: '3', endpoint: '/api/v1/auth/refresh', count: 54, rate: 1.2, last: '1 min ago' },
    { key: '4', endpoint: '/graphql (mutation)', count: 48, rate: 0.9, last: '8 min ago' },
    { key: '5', endpoint: '/api/v1/search/products', count: 41, rate: 0.7, last: '3 min ago' },
    { key: '6', endpoint: '/api/v1/crm/contacts', count: 35, rate: 0.6, last: '12 min ago' },
    { key: '7', endpoint: '/api/v1/reports/export', count: 28, rate: 0.5, last: '15 min ago' },
    { key: '8', endpoint: '/api/v1/notifications/push', count: 22, rate: 0.4, last: '7 min ago' },
    { key: '9', endpoint: '/api/v1/itsm/tickets', count: 18, rate: 0.3, last: '20 min ago' },
    { key: '10', endpoint: '/api/v1/hr/attendance', count: 12, rate: 0.2, last: '30 min ago' },
];

const SLOW_QUERIES = [
    { key: '1', query: 'SELECT * FROM orders WHERE status IN (...) JOIN...', duration: '2.4s', table: 'orders', count: 142 },
    { key: '2', query: 'SELECT COUNT(*) FROM inventory_movements GR...', duration: '1.8s', table: 'inventory_movements', count: 89 },
    { key: '3', query: 'UPDATE tickets SET assigned_to = $1 WHERE...', duration: '1.2s', table: 'tickets', count: 67 },
    { key: '4', query: 'SELECT p.*, c.name FROM products p JOIN cat...', duration: '980ms', table: 'products', count: 234 },
    { key: '5', query: 'INSERT INTO audit_logs (event, user_id, ...) ...', duration: '850ms', table: 'audit_logs', count: 1820 },
];

const FEATURES = [
    { feature: 'Create Ticket', module: 'ITSM', usage: 2450 },
    { feature: 'Search Products', module: 'E-Commerce', usage: 1890 },
    { feature: 'View Dashboard', module: 'PM', usage: 1740 },
    { feature: 'Update Contact', module: 'CRM', usage: 1620 },
    { feature: 'Submit Timesheet', module: 'HR', usage: 1480 },
    { feature: 'Check Inventory', module: 'Inventory', usage: 1350 },
    { feature: 'Generate Invoice', module: 'Accounting', usage: 1220 },
    { feature: 'Assign Task', module: 'PM', usage: 1180 },
    { feature: 'Process Order', module: 'E-Commerce', usage: 1090 },
    { feature: 'Resolve Incident', module: 'ITSM', usage: 980 },
    { feature: 'Export Report', module: 'Accounting', usage: 920 },
    { feature: 'Send Campaign', module: 'CRM', usage: 870 },
    { feature: 'Approve Leave', module: 'HR', usage: 810 },
    { feature: 'Stock Transfer', module: 'Inventory', usage: 760 },
    { feature: 'Create Deal', module: 'CRM', usage: 720 },
];

const SESSION_DEVICES = [
    { name: 'Desktop', value: 5420, color: '#3b82f6' },
    { name: 'Mobile', value: 2890, color: '#10b981' },
    { name: 'Tablet', value: 940, color: '#f59e0b' },
];

const SESSION_DURATION = [
    { range: '<1min', count: 420 }, { range: '1-5min', count: 1890 },
    { range: '5-15min', count: 3240 }, { range: '15-30min', count: 2180 }, { range: '30min+', count: 1520 },
];

export default function CommandCenterPage() {
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const trafficData = useMemo(() => generateTrafficData(), []);
    const heatmap = useMemo(() => generateHeatmap(), []);
    const alerts = useMemo(() => generateAlerts(), []);
    const heatmapMax = Math.max(...heatmap.flatMap(r => r.hours));
    const totalWaterfall = WATERFALL.reduce((s, w) => s + w.ms, 0);
    const totalSessions = REGIONS.reduce((s, r) => s + r.sessions, 0);
    const maxFeatureUsage = FEATURES[0]?.usage || 1;
    const deviceTotal = SESSION_DEVICES.reduce((s, d) => s + d.value, 0);

    // Fetch real data
    const [userCount, setUserCount] = useState<number | null>(null);
    const [containerCount, setContainerCount] = useState<number | null>(null);
    const [systemInfo, setSystemInfo] = useState<any>(null);

    useEffect(() => {
        (async () => {
            try {
                const [uData, cData, sData] = await Promise.all([
                    gql(`query($tenantId: String!) { users(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { dockerContainers(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { systemInfo(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                ]);
                if (Array.isArray((uData as any).users)) setUserCount((uData as any).users.length);
                if (Array.isArray((cData as any).dockerContainers)) setContainerCount((cData as any).dockerContainers.length);
                if ((sData as any).systemInfo) setSystemInfo((sData as any).systemInfo);
            } catch { /* use mock data */ }
            finally { setLoading(false); }
        })();
    }, []);

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = {
        background: isDark ? 'rgba(30,30,30,0.95)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
        borderRadius: 8, fontSize: 12,
    };

    if (loading) return (
        <CMSLayout title="Command Center" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#06b6d4', '#8b5cf6']}>Command Center</AuroraText>}
            subTitle={<DecryptedText text="Unified platform analytics — real-time overview of the entire Nusantarasoft ecosystem" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 1. Platform Vital Signs Banner (BENTO GRID) */}
            <BentoGrid className="max-w-full">
                <BentoGridItem
                    title="Platform Uptime"
                    description="Last 30 days"
                    icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                    header={
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-emerald-500/10">
                            <div className="flex items-center gap-2">
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981', animation: 'pulse 2s infinite' }} />
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>99.97%</div>
                            </div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Active Users Now"
                    description="Real-time online users"
                    icon={<TeamOutlined style={{ color: '#3b82f6' }} />}
                    header={
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-500/10">
                            <div className="flex items-center gap-2">
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 12px #3b82f6', animation: 'pulse 2s infinite' }} />
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>{userCount ? userCount.toLocaleString() : '847'}</div>
                            </div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="API Calls/min"
                    description="Current request volume"
                    icon={<ApiOutlined style={{ color: '#8b5cf6' }} />}
                    header={
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-purple-500/10">
                            <div className="flex items-center gap-2">
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 12px #8b5cf6', animation: 'pulse 2s infinite' }} />
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6', fontFamily: 'monospace' }}>12,450</div>
                            </div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Error Rate"
                    description="Server 5xx errors"
                    icon={<SafetyCertificateOutlined style={{ color: '#06b6d4' }} />}
                    header={
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-cyan-500/10">
                            <div className="flex items-center gap-2">
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 12px #06b6d4', animation: 'pulse 2s infinite' }} />
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace' }}>0.03%</div>
                            </div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
            </BentoGrid>

            {/* 2. Real-Time Traffic */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card size="small" style={glassCard} title={<><ThunderboltOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Real-Time API Traffic</Text> <Tag color="green" style={{ fontSize: 9, borderRadius: 8 }}>LIVE</Tag></>}>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer>
                            <AreaChart data={trafficData}>
                                <defs>
                                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={themeColor} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="time" tick={tickStyle} interval={29} />
                                <YAxis tick={tickStyle} />
                                <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} req/s`, 'Traffic']} />
                                <Area type="monotone" dataKey="rps" stroke={themeColor} fill="url(#trafficGrad)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* 3. Module Activity Heatmap */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard} title={<><AppstoreOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Module Activity Heatmap (24h)</Text></>}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(24, 1fr)', gap: 2, minWidth: 650 }}>
                            <div />
                            {Array.from({ length: 24 }, (_, h) => (
                                <Text key={h} type="secondary" style={{ fontSize: 8, textAlign: 'center' }}>{h}</Text>
                            ))}
                            {heatmap.map(row => (
                                <React.Fragment key={row.module}>
                                    <Text style={{ fontSize: 10, lineHeight: '22px', fontWeight: 600 }}>{row.module}</Text>
                                    {row.hours.map((v, h) => {
                                        const intensity = heatmapMax > 0 ? v / heatmapMax : 0;
                                        return (
                                            <Tooltip key={h} title={`${row.module} @ ${h}:00 — ${v.toLocaleString()} calls`}>
                                                <div style={{
                                                    height: 22, borderRadius: 3,
                                                    background: `rgba(${isDark ? '245,158,11' : '217,119,6'}, ${0.06 + intensity * 0.88})`,
                                                    cursor: 'pointer', transition: 'transform 0.15s',
                                                }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                                            </Tooltip>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                            <Text type="secondary" style={{ fontSize: 9 }}>Low</Text>
                            {[0.1, 0.3, 0.55, 0.8, 1].map((o, i) => (
                                <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(${isDark ? '245,158,11' : '217,119,6'}, ${o})` }} />
                            ))}
                            <Text type="secondary" style={{ fontSize: 9 }}>High</Text>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* 4. Geographic Distribution + 5. Performance Waterfall */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><GlobalOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Geographic Distribution</Text></>}
                            extra={<Tag color="blue" style={{ fontSize: 9, borderRadius: 8 }}>{totalSessions.toLocaleString()} sessions</Tag>}>
                            {REGIONS.map((r, i) => (
                                <motion.div key={r.region} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.03 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <Text style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{r.flag}</Text>
                                    <Text style={{ fontSize: 11, width: 90, fontWeight: 500 }}>{r.region}</Text>
                                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', overflow: 'hidden' }}>
                                        <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, #3b82f6, #06b6d4)` }} />
                                    </div>
                                    <Text style={{ fontSize: 10, fontFamily: 'monospace', width: 40, textAlign: 'right', color: '#3b82f6' }}>{r.pct}%</Text>
                                </motion.div>
                            ))}
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><ClockCircleOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Performance Waterfall</Text></>}
                            extra={<Tag color="purple" style={{ fontSize: 9, borderRadius: 8 }}>Total: {totalWaterfall}ms</Tag>}>
                            {WATERFALL.map((w, i) => (
                                <motion.div key={w.stage} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                                    style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={{ fontSize: 11 }}>{w.stage}</Text>
                                        <Text strong style={{ fontSize: 11, color: w.color, fontFamily: 'monospace' }}>{w.ms}ms</Text>
                                    </div>
                                    <div style={{ height: 10, borderRadius: 5, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(w.ms / totalWaterfall) * 100}%` }} transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                                            style={{ height: '100%', borderRadius: 5, background: w.color }} />
                                    </div>
                                </motion.div>
                            ))}
                            <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>Latency Percentiles</Text>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {[{ p: 'P50', v: '68ms', c: '#10b981' }, { p: 'P95', v: '142ms', c: '#f59e0b' }, { p: 'P99', v: '310ms', c: '#ef4444' }].map(p => (
                                        <div key={p.p} style={{ flex: 1, textAlign: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 9 }}>{p.p}</Text>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: p.c, fontFamily: 'monospace' }}>{p.v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 6. Error Distribution */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><BugOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Error Types</Text></>}>
                            <div style={{ height: 240, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#fff' : '#1f2937' }}>{ERROR_TYPES.reduce((s, e) => s + e.value, 0).toLocaleString()}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>total errors</Text>
                                </div>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={ERROR_TYPES} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                            {ERROR_TYPES.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={16}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={glassCard} title={<><AlertOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Top Error Endpoints</Text> <Badge count={ERROR_ENDPOINTS.length} style={{ backgroundColor: '#ef4444' }} /></>}>
                            <Table dataSource={ERROR_ENDPOINTS} pagination={false} size="small" columns={[
                                { title: 'Endpoint', dataIndex: 'endpoint', key: 'endpoint', render: (v: string) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Count', dataIndex: 'count', key: 'count', width: 60, align: 'center' as const, render: (v: number) => <Text strong style={{ fontSize: 11, color: v > 50 ? '#ef4444' : '#f59e0b' }}>{v}</Text> },
                                { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 55, align: 'center' as const, render: (v: number) => <Tag color={v > 1.5 ? 'red' : v > 0.5 ? 'orange' : 'green'} style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{v}%</Tag> },
                                { title: 'Last', dataIndex: 'last', key: 'last', width: 80, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 7. Database Performance */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                <Card size="small" style={glassCard} title={<><DatabaseOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Database Performance</Text></>}>
                    <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                        {[
                            { label: 'Queries/sec', value: '3,847', color: '#3b82f6', icon: <ThunderboltOutlined /> },
                            { label: 'Avg Latency', value: '4.2ms', color: '#10b981', icon: <ClockCircleOutlined /> },
                            { label: 'Active Conns', value: containerCount ? `${containerCount * 4}` : '96', color: '#8b5cf6', icon: <ApiOutlined /> },
                            { label: 'Cache Hit Rate', value: '97.3%', color: '#f59e0b', icon: <FireOutlined /> },
                        ].map((s, i) => (
                            <Col key={i} xs={12} md={6}>
                                <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{s.icon} {s.label}</Text>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                    <Row gutter={[16, 12]}>
                        <Col xs={24} md={16}>
                            <Text type="secondary" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Slow Queries (last hour)</Text>
                            <Table dataSource={SLOW_QUERIES} pagination={false} size="small" columns={[
                                { title: 'Query', dataIndex: 'query', key: 'query', render: (v: string) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v.slice(0, 45)}...</Text> },
                                { title: 'Duration', dataIndex: 'duration', key: 'duration', width: 70, render: (v: string) => <Tag color="orange" style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{v}</Tag> },
                                { title: 'Table', dataIndex: 'table', key: 'table', width: 120, render: (v: string) => <Tag style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{v}</Tag> },
                                { title: 'Count', dataIndex: 'count', key: 'count', width: 60, align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                            ]} />
                        </Col>
                        <Col xs={24} md={8}>
                            <Text type="secondary" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Connection Pool Utilization</Text>
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <Progress type="dashboard" percent={72} size={120} strokeColor={{ '0%': '#10b981', '100%': '#f59e0b' }}
                                    format={() => <><div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#fff' : '#1f2937' }}>72%</div><Text type="secondary" style={{ fontSize: 9 }}>96 / 132</Text></>} />
                            </div>
                        </Col>
                    </Row>
                </Card>
            </motion.div>

            {/* 8. Feature Usage Rankings */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <Card size="small" style={glassCard} title={<><BarChartOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Feature Usage Rankings</Text></>}>
                    <Row gutter={[16, 4]}>
                        {FEATURES.map((f, i) => (
                            <Col key={f.feature} xs={24} md={12}>
                                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.02 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                                    <Text type="secondary" style={{ fontSize: 10, width: 20, textAlign: 'right', fontFamily: 'monospace' }}>#{i + 1}</Text>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Text style={{ fontSize: 11 }}>{f.feature} <Tag style={{ fontSize: 8, borderRadius: 6, margin: 0 }}>{f.module}</Tag></Text>
                                            <Text strong style={{ fontSize: 11, fontFamily: 'monospace', color: themeColor }}>{f.usage.toLocaleString()}</Text>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', overflow: 'hidden' }}>
                                            <div style={{ width: `${(f.usage / maxFeatureUsage) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${themeColor}, ${COLORS[i % COLORS.length]})` }} />
                                        </div>
                                    </div>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>

            {/* 9. User Session Analytics */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><PieChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Sessions by Device</Text></>}>
                            <div style={{ height: 220, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#fff' : '#1f2937' }}>{deviceTotal.toLocaleString()}</div>
                                    <Text type="secondary" style={{ fontSize: 9 }}>total</Text>
                                </div>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={SESSION_DEVICES} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                                            {SESSION_DEVICES.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4 }}>
                                {SESSION_DEVICES.map(d => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                                        <Text type="secondary" style={{ fontSize: 10 }}>{d.name}</Text>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><FundOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Session Duration</Text></>}>
                            <div style={{ height: 240 }}>
                                <ResponsiveContainer>
                                    <BarChart data={SESSION_DURATION}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="range" tick={tickStyle} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" name="Sessions" radius={[6, 6, 0, 0]} barSize={32}>
                                            {SESSION_DURATION.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><RiseOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Bounce Rate</Text></>}>
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <Progress type="dashboard" percent={23.4} size={110}
                                    strokeColor={{ '0%': '#10b981', '50%': '#f59e0b', '100%': '#ef4444' }}
                                    format={() => <><div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>23.4%</div><Text type="secondary" style={{ fontSize: 9 }}>Good</Text></>} />
                                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    {[{ l: 'Desktop', v: '18%' }, { l: 'Mobile', v: '31%' }, { l: 'Tablet', v: '22%' }].map(b => (
                                        <div key={b.l} style={{ textAlign: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>{b.l}</Text>
                                            <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{b.v}</Text>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 10. System Alerts Feed */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <Card size="small" style={glassCard} title={<><WarningOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>System Alerts Feed</Text> <Badge count={alerts.filter(a => a.severity === 'critical').length} style={{ backgroundColor: '#ef4444' }} /></>}>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {alerts.map((a, i) => (
                            <motion.div key={a.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.02 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                                    background: i % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') : 'transparent',
                                    borderLeft: `3px solid ${a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                                }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                                    boxShadow: a.severity === 'critical' ? '0 0 6px #ef4444' : 'none',
                                }} />
                                <Tag color={a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'orange' : 'blue'}
                                    style={{ fontSize: 8, borderRadius: 6, margin: 0, textTransform: 'uppercase', minWidth: 52, textAlign: 'center' }}>{a.severity}</Tag>
                                <Text style={{ fontSize: 11, flex: 1 }}>{a.message}</Text>
                                <Tag style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{a.source}</Tag>
                                <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace', minWidth: 60 }}>{a.timestamp}</Text>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </motion.div>

        </div>
        </CMSLayout>
    );
}
