"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, Table, Tag, Progress, theme } from "antd";
import {
    SendOutlined, CheckCircleOutlined, WarningOutlined, BugOutlined,
    EyeOutlined, LinkOutlined, ClockCircleOutlined, SafetyCertificateOutlined,
    ThunderboltOutlined, BarChartOutlined, RiseOutlined, FallOutlined,
    MailOutlined, DashboardOutlined,
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
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Mock Data ────────────────────────────────────────────
function generateMailFlow() {
    const data: any[] = [];
    for (let i = 29; i >= 0; i--) {
        const sent = rand(1200, 2800);
        const delivered = Math.round(sent * (0.92 + Math.random() * 0.06));
        const bounced = Math.round(sent * (0.01 + Math.random() * 0.03));
        const spam = Math.round(sent * Math.random() * 0.008);
        data.push({ day: dayjs().subtract(i, 'day').format('MMM DD'), sent, delivered, bounced, spam });
    }
    return data;
}

const DELIVERY_DATA = [
    { name: 'Delivered', value: 45230, color: '#10b981' },
    { name: 'Soft Bounce', value: 890, color: '#f59e0b' },
    { name: 'Hard Bounce', value: 340, color: '#ef4444' },
    { name: 'Deferred', value: 520, color: '#8b5cf6' },
    { name: 'Spam', value: 180, color: '#ec4899' },
];

const BOUNCE_REASONS = [
    { reason: 'Mailbox full', count: 342 }, { reason: 'Invalid address', count: 287 },
    { reason: 'DNS failure', count: 156 }, { reason: 'Blocked by recipient', count: 124 },
    { reason: 'Rate limited', count: 89 }, { reason: 'Other', count: 62 },
];

const QUEUE_AGE = [
    { label: '<1 min', count: 42 }, { label: '1-5 min', count: 28 },
    { label: '5-30 min', count: 15 }, { label: '30m-1hr', count: 6 }, { label: '1hr+', count: 3 },
];

function generateQueueTrend() {
    return Array.from({ length: 12 }, (_, i) => ({
        time: dayjs().subtract(55 - i * 5, 'minute').format('HH:mm'),
        queued: rand(60, 130),
    }));
}

const THREAT_LOG = [
    { key: '1', time: '2 min ago', event: 'SPF soft-fail from 45.33.21.8', severity: 'warning', domain: 'nusantarasoft.local' },
    { key: '2', time: '18 min ago', event: 'DMARC reject for spoofed sender', severity: 'critical', domain: 'mail.nusantarasoft.id' },
    { key: '3', time: '1 hr ago', event: 'TLS downgrade attempt blocked', severity: 'warning', domain: 'notify.nusantarasoft.io' },
    { key: '4', time: '3 hr ago', event: 'Bulk spam originating from compromised alias', severity: 'critical', domain: 'nusantarasoft.local' },
    { key: '5', time: '5 hr ago', event: 'DKIM signature mismatch detected', severity: 'info', domain: 'mail.nusantarasoft.id' },
];

const ENGAGEMENT_BY_DAY = [
    { day: 'Mon', rate: 28.4 }, { day: 'Tue', rate: 32.1 }, { day: 'Wed', rate: 30.5 },
    { day: 'Thu', rate: 29.8 }, { day: 'Fri', rate: 26.2 }, { day: 'Sat', rate: 18.7 }, { day: 'Sun', rate: 15.3 },
];

const CTR_BY_TYPE = [
    { type: 'Transactional', rate: 12.4 }, { type: 'Marketing', rate: 3.8 },
    { type: 'Notification', rate: 8.2 }, { type: 'Alert', rate: 22.1 },
];

function generateHourlySend() {
    return Array.from({ length: 24 }, (_, h) => {
        const isPeak = h >= 9 && h <= 11 || h >= 14 && h <= 16;
        return { hour: `${h}:00`, volume: isPeak ? rand(180, 320) : rand(20, 120), isPeak };
    });
}

export default function EmailAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const mailFlow = useMemo(() => generateMailFlow(), []);
    const hourlySend = useMemo(() => generateHourlySend(), []);
    const queueTrend = useMemo(() => generateQueueTrend(), []);

    const [domainCount, setDomainCount] = useState<number | null>(null);
    const [accountCount, setAccountCount] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [accData, domData, aliasData] = await Promise.all([
                    gql(`query($tenantId: String!) { emailAccounts(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { emailDomains(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { emailAliases(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                ]);
                if (Array.isArray((accData as any).emailAccounts)) setAccountCount((accData as any).emailAccounts.length);
                if (Array.isArray((domData as any).emailDomains)) setDomainCount((domData as any).emailDomains.length);
            } catch { /* fallback to mock */ }
            finally { setLoading(false); }
        })();
    }, []);

    const deliveryTotal = DELIVERY_DATA.reduce((s, d) => s + d.value, 0);
    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    const kpis = [
        { title: 'Emails Sent', value: '2,847', icon: <SendOutlined />, color: '#3b82f6', trend: 12, sub: 'today' },
        { title: 'Delivery Rate', value: '97.2%', icon: <CheckCircleOutlined />, color: '#10b981', trend: 0.8, sub: 'vs yesterday' },
        { title: 'Bounce Rate', value: '2.1%', icon: <WarningOutlined />, color: '#ef4444', trend: -0.3, sub: 'improving' },
        { title: 'Spam Score', value: '0.4', icon: <BugOutlined />, color: '#f59e0b', trend: -5, sub: 'out of 10' },
        { title: 'Open Rate', value: '34.7%', icon: <EyeOutlined />, color: '#8b5cf6', trend: 2.1, sub: 'this week' },
        { title: 'Click Rate', value: '8.3%', icon: <LinkOutlined />, color: '#06b6d4', trend: 1.4, sub: 'this week' },
    ];

    const MOCK_DOMAINS = [
        { key: '1', domain: 'nusantarasoft.local', sent: 18420, deliveryRate: 98.1, bounceRate: 1.2, spf: true, dkim: true, dmarc: true },
        { key: '2', domain: 'mail.nusantarasoft.id', sent: 12840, deliveryRate: 96.8, bounceRate: 2.4, spf: true, dkim: true, dmarc: false },
        { key: '3', domain: 'notify.nusantarasoft.io', sent: 8920, deliveryRate: 97.5, bounceRate: 1.8, spf: true, dkim: false, dmarc: false },
    ];

    const MOCK_SENDERS = [
        { key: '1', email: 'noreply@nusantarasoft.local', sent: 4280, delivery: 98.5, openRate: 42.3, lastActive: '2 min ago' },
        { key: '2', email: 'marketing@nusantarasoft.local', sent: 3150, delivery: 96.2, openRate: 28.7, lastActive: '15 min ago' },
        { key: '3', email: 'alerts@nusantarasoft.local', sent: 2890, delivery: 99.1, openRate: 67.4, lastActive: '1 min ago' },
        { key: '4', email: 'support@nusantarasoft.local', sent: 2340, delivery: 97.8, openRate: 35.2, lastActive: '1 hr ago' },
        { key: '5', email: 'hr@nusantarasoft.local', sent: 1870, delivery: 98.9, openRate: 51.6, lastActive: '30 min ago' },
        { key: '6', email: 'billing@nusantarasoft.local', sent: 1540, delivery: 97.3, openRate: 44.8, lastActive: '45 min ago' },
        { key: '7', email: 'admin@nusantarasoft.local', sent: 1220, delivery: 99.4, openRate: 38.1, lastActive: '3 hr ago' },
        { key: '8', email: 'dev@nusantarasoft.local', sent: 980, delivery: 98.7, openRate: 22.5, lastActive: '5 hr ago' },
        { key: '9', email: 'info@nusantarasoft.local', sent: 760, delivery: 96.9, openRate: 31.4, lastActive: '2 hr ago' },
        { key: '10', email: 'sales@nusantarasoft.local', sent: 640, delivery: 97.1, openRate: 33.9, lastActive: '4 hr ago' },
    ];

    const queueStats = [
        { label: 'Queued', value: 94, color: '#3b82f6' }, { label: 'Processing', value: 23, color: '#10b981' },
        { label: 'Deferred', value: 12, color: '#f59e0b' }, { label: 'Failed', value: 3, color: '#ef4444' },
    ];

    const securityGauges = [
        { label: 'SPF Pass', value: 98.4, color: '#10b981' }, { label: 'DKIM Pass', value: 96.7, color: '#3b82f6' },
        { label: 'DMARC Pass', value: 91.2, color: '#8b5cf6' }, { label: 'TLS Rate', value: 99.1, color: '#06b6d4' },
        { label: 'Spam Reports', value: 0.12, color: '#ef4444', suffix: '%' },
    ];

    if (loading) return (
        <CMSLayout title="Email Analytics" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#06b6d4', '#10b981']}>Email Analytics</AuroraText>}
            subTitle={<DecryptedText text="Delivery metrics, engagement tracking & compliance monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 1. KPI Cards */}
            <Row gutter={[12, 12]}>
                {kpis.map((k, i) => (
                    <Col key={i} xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${k.color}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{k.title}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace', lineHeight: 1.3 }}>{k.value}</div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: 16 }}>
                                        {k.icon}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    {k.trend > 0 ? <RiseOutlined style={{ color: '#10b981', fontSize: 10 }} /> : <FallOutlined style={{ color: '#ef4444', fontSize: 10 }} />}
                                    <Text style={{ fontSize: 10, color: k.trend > 0 ? '#10b981' : '#ef4444' }}>{Math.abs(k.trend)}%</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{k.sub}</Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* 2. Mail Flow Trend + 3. Delivery Donut */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={16}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={glassCard} title={<><BarChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Mail Flow Trend (30 Days)</Text></>}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={mailFlow}>
                                        <defs>
                                            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="delivGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="day" tick={tickStyle} interval={4} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Area type="monotone" dataKey="sent" stroke="#3b82f6" fill="url(#sentGrad)" strokeWidth={2} name="Sent" />
                                        <Area type="monotone" dataKey="delivered" stroke="#10b981" fill="url(#delivGrad)" strokeWidth={2} name="Delivered" />
                                        <Area type="monotone" dataKey="bounced" stroke="#ef4444" fill="none" strokeWidth={1.5} name="Bounced" strokeDasharray="4 2" />
                                        <Area type="monotone" dataKey="spam" stroke="#f59e0b" fill="none" strokeWidth={1.5} name="Spam" strokeDasharray="4 2" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><DashboardOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Delivery Performance</Text></>}>
                            <div style={{ height: 260, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#fff' : '#1f2937' }}>{deliveryTotal.toLocaleString()}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>total emails</Text>
                                </div>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={DELIVERY_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`} labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                            {DELIVERY_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 4. Domain Performance Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                <Card size="small" style={glassCard} title={<><SafetyCertificateOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Domain Performance</Text> <Tag style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{domainCount ?? MOCK_DOMAINS.length} domains</Tag></>}>
                    <Table size="small" dataSource={MOCK_DOMAINS} pagination={false} columns={[
                        { title: 'Domain', dataIndex: 'domain', key: 'domain', render: (v: string) => <Text strong style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Emails Sent', dataIndex: 'sent', key: 'sent', align: 'right' as const, sorter: (a: any, b: any) => a.sent - b.sent, defaultSortOrder: 'descend' as const, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v.toLocaleString()}</Text> },
                        { title: 'Delivery %', dataIndex: 'deliveryRate', key: 'deliveryRate', align: 'center' as const, render: (v: number) => <Tag color={v > 97 ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}%</Tag> },
                        { title: 'Bounce %', dataIndex: 'bounceRate', key: 'bounceRate', align: 'center' as const, render: (v: number) => <Tag color={v < 2 ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}%</Tag> },
                        { title: 'SPF', dataIndex: 'spf', key: 'spf', align: 'center' as const, width: 60, render: (v: boolean) => <Tag color={v ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v ? '✓' : '✗'}</Tag> },
                        { title: 'DKIM', dataIndex: 'dkim', key: 'dkim', align: 'center' as const, width: 60, render: (v: boolean) => <Tag color={v ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v ? '✓' : '✗'}</Tag> },
                        { title: 'DMARC', dataIndex: 'dmarc', key: 'dmarc', align: 'center' as const, width: 70, render: (v: boolean) => <Tag color={v ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v ? '✓' : '✗'}</Tag> },
                    ]} />
                </Card>
            </motion.div>

            {/* 5. Hourly Send Distribution + 6. Top Senders */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><ClockCircleOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Hourly Send Distribution</Text></>}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={hourlySend}>
                                        <defs>
                                            <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={themeColor} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="hour" tick={tickStyle} interval={3} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="volume" name="Emails" radius={[4, 4, 0, 0]} barSize={14}>
                                            {hourlySend.map((h, i) => <Cell key={i} fill={h.isPeak ? themeColor : (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1')} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                                {[{ c: themeColor, l: 'Peak hours' }, { c: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1', l: 'Off-peak' }].map(x => (
                                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
                                        <Text type="secondary" style={{ fontSize: 10 }}>{x.l}</Text>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                        <Card size="small" style={glassCard} title={<><MailOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Top Senders</Text> <Tag style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{accountCount ?? 10} accounts</Tag></>}>
                            <Table size="small" dataSource={MOCK_SENDERS} pagination={false} columns={[
                                { title: 'Email Address', dataIndex: 'email', key: 'email', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Sent', dataIndex: 'sent', key: 'sent', align: 'right' as const, sorter: (a: any, b: any) => a.sent - b.sent, defaultSortOrder: 'descend' as const, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v.toLocaleString()}</Text> },
                                { title: 'Delivery %', dataIndex: 'delivery', key: 'delivery', width: 130, render: (v: number) => (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', overflow: 'hidden' }}>
                                            <div style={{ width: `${v}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, #10b981, #06b6d4)` }} />
                                        </div>
                                        <Text style={{ fontSize: 10, minWidth: 32 }}>{v}%</Text>
                                    </div>
                                )},
                                { title: 'Open Rate', dataIndex: 'openRate', key: 'openRate', align: 'center' as const, render: (v: number) => <Tag color={v > 40 ? 'green' : v > 25 ? 'blue' : 'default'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}%</Tag> },
                                { title: 'Last Active', dataIndex: 'lastActive', key: 'lastActive', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 7. Bounce Analysis + 8. Mail Queue Monitor */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><WarningOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Bounce Analysis</Text></>}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer>
                                    <BarChart data={BOUNCE_REASONS} layout="vertical" margin={{ left: 20 }}>
                                        <defs>
                                            <linearGradient id="bounceGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7} />
                                                <stop offset="100%" stopColor="#f87171" stopOpacity={0.9} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis type="number" tick={tickStyle} />
                                        <YAxis dataKey="reason" type="category" tick={tickStyle} width={120} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" name="Bounces" fill="url(#bounceGrad)" radius={[0, 6, 6, 0]} barSize={18} label={{ position: 'right', style: { fontSize: 10, fill: isDark ? '#ccc' : '#666' } }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><ThunderboltOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Mail Queue Monitor</Text></>}>
                            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                                {queueStats.map((q, i) => (
                                    <Col key={i} xs={12} md={6}>
                                        <div style={{ padding: '8px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{q.label}</Text>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: q.color, fontFamily: 'monospace' }}>{q.value}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                            <Row gutter={[12, 12]}>
                                <Col xs={24} md={14}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Queue Age Distribution</Text>
                                    <div style={{ height: 160 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={QUEUE_AGE}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                                <XAxis dataKey="label" tick={tickStyle} />
                                                <YAxis tick={tickStyle} />
                                                <RTooltip contentStyle={tooltipStyle} />
                                                <Bar dataKey="count" name="Messages" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                                <Col xs={24} md={10}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Queue Trend (1 hr)</Text>
                                    <div style={{ height: 160 }}>
                                        <ResponsiveContainer>
                                            <LineChart data={queueTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                                <XAxis dataKey="time" tick={tickStyle} interval={2} />
                                                <YAxis tick={tickStyle} />
                                                <RTooltip contentStyle={tooltipStyle} />
                                                <Line type="monotone" dataKey="queued" stroke="#f59e0b" strokeWidth={2} dot={false} name="Queued" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 9. Engagement Analytics */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><EyeOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Open Rate by Day of Week</Text></>}>
                            <div style={{ height: 240 }}>
                                <ResponsiveContainer>
                                    <BarChart data={ENGAGEMENT_BY_DAY}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="day" tick={tickStyle} />
                                        <YAxis tick={tickStyle} unit="%" />
                                        <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Open Rate']} />
                                        <Bar dataKey="rate" name="Open Rate" radius={[4, 4, 0, 0]} barSize={28}>
                                            {ENGAGEMENT_BY_DAY.map((d, i) => <Cell key={i} fill={d.rate > 30 ? '#8b5cf6' : (isDark ? 'rgba(255,255,255,0.12)' : '#c4b5fd')} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ThunderboltOutlined style={{ color: '#8b5cf6', fontSize: 12 }} />
                                <Text style={{ fontSize: 11, color: '#8b5cf6' }}>Best send time: <strong>Tuesday 10:00 AM</strong></Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><LinkOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Click-Through by Email Type</Text></>}>
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer>
                                    <BarChart data={CTR_BY_TYPE} layout="vertical" margin={{ left: 10 }}>
                                        <defs>
                                            <linearGradient id="ctrGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.7} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.9} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis type="number" tick={tickStyle} unit="%" />
                                        <YAxis dataKey="type" type="category" tick={tickStyle} width={100} />
                                        <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'CTR']} />
                                        <Bar dataKey="rate" name="CTR" fill="url(#ctrGrad)" radius={[0, 6, 6, 0]} barSize={22} label={{ position: 'right', style: { fontSize: 10, fill: isDark ? '#ccc' : '#666' }, formatter: (v: number) => `${v}%` }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: isDark ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RiseOutlined style={{ color: '#06b6d4', fontSize: 12 }} />
                                <Text style={{ fontSize: 11, color: '#06b6d4' }}>Alert emails have the highest engagement at <strong>22.1%</strong></Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 10. Security & Compliance */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <Card size="small" style={glassCard} title={<><SafetyCertificateOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Security & Compliance</Text></>}>
                    <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
                        {securityGauges.map((g, i) => (
                            <Col key={i} xs={12} md={4}>
                                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                                    <Progress type="dashboard" percent={g.label === 'Spam Reports' ? 100 - g.value * 10 : g.value} size={80}
                                        strokeColor={g.color} format={() => <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.value}{g.suffix || '%'}</span>} />
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{g.label}</Text>
                                </div>
                            </Col>
                        ))}
                        <Col xs={24} md={4}>
                            <div style={{ padding: '16px 12px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Text type="secondary" style={{ fontSize: 10 }}>Compliance</Text>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {['CAN-SPAM', 'GDPR'].map(badge => (
                                        <Tag key={badge} color="green" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>✓ {badge}</Tag>
                                    ))}
                                </div>
                            </div>
                        </Col>
                    </Row>
                    <Text type="secondary" style={{ fontSize: 10, marginBottom: 8, display: 'block' }}>Recent Threat Events</Text>
                    <Table size="small" dataSource={THREAT_LOG} pagination={false} columns={[
                        { title: 'Time', dataIndex: 'time', key: 'time', width: 100, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Event', dataIndex: 'event', key: 'event', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Domain', dataIndex: 'domain', key: 'domain', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 90, align: 'center' as const,
                            render: (v: string) => <Tag color={v === 'critical' ? 'red' : v === 'warning' ? 'orange' : 'blue'}
                                style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>

        </div>
        </CMSLayout>
    );
}
