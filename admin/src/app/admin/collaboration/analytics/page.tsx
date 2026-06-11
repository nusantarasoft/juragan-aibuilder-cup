"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Spin, message, Table, Tag, Tooltip, theme } from "antd";
import {
    TeamOutlined, MessageOutlined, VideoCameraOutlined, FileOutlined,
    ClockCircleOutlined, ThunderboltOutlined, BarChartOutlined,
    PieChartOutlined, RadarChartOutlined, CrownOutlined, RiseOutlined, FallOutlined,
} from "@ant-design/icons";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell,
    LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Legend,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

// ── Mock Data Generators ─────────────────────────────────
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateHeatmap() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => {
        const hours: number[] = [];
        for (let h = 0; h < 24; h++) {
            const isWork = h >= 8 && h <= 18 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day);
            hours.push(isWork ? rand(15, 120) : rand(0, 20));
        }
        return { day, hours };
    });
}

function generateChannels() {
    const channels = [
        { name: '#general', type: 'public' }, { name: '#engineering', type: 'public' },
        { name: '#design', type: 'public' }, { name: '#marketing', type: 'public' },
        { name: '#product', type: 'public' }, { name: '#devops', type: 'public' },
        { name: '#random', type: 'public' }, { name: '#announcements', type: 'public' },
        { name: '🔒 leadership', type: 'private' }, { name: '🔒 hr-team', type: 'private' },
        { name: '🔒 finance', type: 'private' }, { name: '🔒 security', type: 'private' },
        { name: 'DM: Alice↔Bob', type: 'direct' }, { name: 'DM: Carol↔Dave', type: 'direct' },
        { name: 'DM: Eve↔Frank', type: 'direct' },
    ];
    return channels.map(c => ({ ...c, messages: rand(80, 2400) })).sort((a, b) => b.messages - a.messages);
}

function generateMessageTrend() {
    const data: { day: string; messages: number }[] = [];
    let base = 320;
    for (let i = 29; i >= 0; i--) {
        base += rand(-40, 50);
        if (base < 100) base = 150;
        const day = dayjs().subtract(i, 'day').format('MMM DD');
        data.push({ day, messages: base });
    }
    // compute 7-day moving average
    return data.map((d, i) => {
        const window = data.slice(Math.max(0, i - 6), i + 1);
        const avg = Math.round(window.reduce((s, w) => s + w.messages, 0) / window.length);
        return { ...d, avg };
    });
}

const MOCK_PLATFORM = [
    { name: 'Mattermost', value: 4820 },
    { name: 'Nextcloud', value: 1930 },
    { name: 'Jitsi', value: 870 },
];

const MOCK_MEETINGS = {
    total: 247, avgDuration: 38, totalParticipants: 1842, recurringPct: 34,
    distribution: [
        { label: '15 min', count: 42 }, { label: '30 min', count: 78 },
        { label: '1 hr', count: 84 }, { label: '1.5 hr', count: 29 }, { label: '2 hr+', count: 14 },
    ],
    organizers: [
        { key: '1', name: 'Sarah Chen', meetings: 34, avgDuration: 42 },
        { key: '2', name: 'Marcus Lee', meetings: 28, avgDuration: 35 },
        { key: '3', name: 'Priya Patel', meetings: 24, avgDuration: 51 },
        { key: '4', name: 'James Wilson', meetings: 21, avgDuration: 30 },
        { key: '5', name: 'Ana Rodriguez', meetings: 18, avgDuration: 44 },
    ],
};

const MOCK_FILES = {
    totalShared: 1284, storageUsed: '14.7 GB', avgSize: '2.3 MB',
    types: [
        { name: 'Documents', value: 420, color: '#3b82f6' }, { name: 'Spreadsheets', value: 280, color: '#10b981' },
        { name: 'Images', value: 240, color: '#f59e0b' }, { name: 'Videos', value: 120, color: '#ef4444' },
        { name: 'Archives', value: 130, color: '#8b5cf6' }, { name: 'Other', value: 94, color: '#94a3b8' },
    ],
    topFiles: [
        { key: '1', name: 'Q2 Strategy Deck.pptx', type: 'Document', shares: 47, lastShared: '2 hours ago' },
        { key: '2', name: 'Sprint Retro Notes.md', type: 'Document', shares: 38, lastShared: '5 hours ago' },
        { key: '3', name: 'Brand Assets.zip', type: 'Archive', shares: 32, lastShared: '1 day ago' },
        { key: '4', name: 'Revenue Dashboard.xlsx', type: 'Spreadsheet', shares: 29, lastShared: '3 hours ago' },
        { key: '5', name: 'Product Demo.mp4', type: 'Video', shares: 24, lastShared: '2 days ago' },
    ],
};

const MOCK_RADAR = [
    { dimension: 'Chat Activity', Engineering: 92, Marketing: 78, Design: 85, Product: 88 },
    { dimension: 'File Collab', Engineering: 80, Marketing: 65, Design: 90, Product: 72 },
    { dimension: 'Meeting Part.', Engineering: 70, Marketing: 88, Design: 60, Product: 95 },
    { dimension: 'Response Speed', Engineering: 85, Marketing: 72, Design: 78, Product: 80 },
    { dimension: 'Cross-Team', Engineering: 65, Marketing: 82, Design: 75, Product: 90 },
];

const MOCK_LEADERBOARD = [
    { key: '1', rank: 1, user: 'Alice Nguyen', messages: 842, files: 56, meetings: 38, score: 96 },
    { key: '2', rank: 2, user: 'Bob Martinez', messages: 790, files: 48, meetings: 42, score: 93 },
    { key: '3', rank: 3, user: 'Carol Tanaka', messages: 735, files: 62, meetings: 31, score: 91 },
    { key: '4', rank: 4, user: 'David Park', messages: 698, files: 41, meetings: 35, score: 87 },
    { key: '5', rank: 5, user: 'Emma Fischer', messages: 654, files: 39, meetings: 40, score: 85 },
    { key: '6', rank: 6, user: 'Frank Osei', messages: 612, files: 35, meetings: 28, score: 82 },
    { key: '7', rank: 7, user: 'Grace Liu', messages: 580, files: 44, meetings: 22, score: 79 },
    { key: '8', rank: 8, user: 'Henry Kumar', messages: 545, files: 30, meetings: 33, score: 76 },
    { key: '9', rank: 9, user: 'Iris Johansson', messages: 510, files: 28, meetings: 29, score: 73 },
    { key: '10', rank: 10, user: 'Jack Robinson', messages: 488, files: 25, meetings: 26, score: 70 },
];

function generateResponseTimes() {
    return Array.from({ length: 24 }, (_, h) => {
        const isBiz = h >= 9 && h <= 17;
        return { hour: `${h}:00`, avgMinutes: isBiz ? rand(2, 8) : rand(15, 45), isBusiness: isBiz };
    });
}

export default function CollaborationAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    // Mock data (seeded on mount)
    const heatmap = useMemo(() => generateHeatmap(), []);
    const channels = useMemo(() => generateChannels(), []);
    const messageTrend = useMemo(() => generateMessageTrend(), []);
    const responseTimes = useMemo(() => generateResponseTimes(), []);

    // Attempt to fetch real channel/message counts from backend
    const [realChannelCount, setRealChannelCount] = useState<number | null>(null);
    const [realMessageCount, setRealMessageCount] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [chData, msgData] = await Promise.all([
                    gql(`query($tenantId: String!) { collaborationChannels(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                    gql(`query($tenantId: String!) { collaborationMessages(tenantId: $tenantId) }`, { tenantId: DEFAULT_TENANT_ID }),
                ]);
                if (Array.isArray((chData as any).collaborationChannels)) setRealChannelCount((chData as any).collaborationChannels.length);
                if (Array.isArray((msgData as any).collaborationMessages)) setRealMessageCount((msgData as any).collaborationMessages.length);
            } catch { /* use mock data */ }
            finally { setLoading(false); }
        })();
    }, []);

    // KPI values (prefer real data, fallback to mock)
    const totalMessages = realMessageCount ?? 12847;
    const kpis = [
        { title: 'Active Users', value: '184', icon: <TeamOutlined />, color: '#10b981', trend: 12, sub: 'daily active' },
        { title: 'Total Messages', value: totalMessages.toLocaleString(), icon: <MessageOutlined />, color: '#3b82f6', trend: 8, sub: 'this month' },
        { title: 'Meetings Held', value: '247', icon: <VideoCameraOutlined />, color: '#8b5cf6', trend: -3, sub: 'this month' },
        { title: 'Files Shared', value: '1,284', icon: <FileOutlined />, color: '#f59e0b', trend: 15, sub: 'this month' },
        { title: 'Avg Response', value: '4.2m', icon: <ClockCircleOutlined />, color: '#06b6d4', trend: -18, sub: 'during work hours' },
        { title: 'Engagement Score', value: '87%', icon: <ThunderboltOutlined />, color: '#ec4899', trend: 5, sub: 'team average' },
    ];

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

    const channelTypeColor: Record<string, string> = { public: '#3b82f6', private: '#8b5cf6', direct: '#10b981' };
    const platformTotal = MOCK_PLATFORM.reduce((s, p) => s + p.value, 0);
    const heatmapMax = Math.max(...heatmap.flatMap(r => r.hours));
    const maxLeaderScore = MOCK_LEADERBOARD[0]?.score || 1;
    const badgeColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    if (loading) return (
        <CMSLayout title="Collaboration Analytics" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Collaboration Analytics</AuroraText>}
            subTitle={<DecryptedText text="Team engagement and collaboration metrics dashboard" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
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

            {/* 2. Communication Heatmap */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard} title={<><ClockCircleOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Communication Heatmap</Text></>}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(24, 1fr)', gap: 2, minWidth: 600 }}>
                            <div />
                            {Array.from({ length: 24 }, (_, h) => (
                                <Text key={h} type="secondary" style={{ fontSize: 8, textAlign: 'center' }}>{h}</Text>
                            ))}
                            {heatmap.map(row => (
                                <React.Fragment key={row.day}>
                                    <Text style={{ fontSize: 10, lineHeight: '22px' }}>{row.day}</Text>
                                    {row.hours.map((v, h) => {
                                        const intensity = heatmapMax > 0 ? v / heatmapMax : 0;
                                        return (
                                            <Tooltip key={h} title={`${row.day} ${h}:00 — ${v} messages`}>
                                                <div style={{
                                                    height: 22, borderRadius: 3,
                                                    background: `rgba(${isDark ? '99,102,241' : '59,130,246'}, ${0.08 + intensity * 0.85})`,
                                                    cursor: 'pointer', transition: 'transform 0.15s',
                                                }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                                            </Tooltip>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                            <Text type="secondary" style={{ fontSize: 9 }}>Less</Text>
                            {[0.1, 0.3, 0.55, 0.8, 1].map((o, i) => (
                                <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(${isDark ? '99,102,241' : '59,130,246'}, ${o})` }} />
                            ))}
                            <Text type="secondary" style={{ fontSize: 9 }}>More</Text>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* 3. Channel Activity + 4. Message Volume */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><BarChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Channel Activity</Text></>}>
                            <div style={{ height: 360 }}>
                                <ResponsiveContainer>
                                    <BarChart data={channels} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis type="number" tick={tickStyle} />
                                        <YAxis dataKey="name" type="category" tick={tickStyle} width={110} />
                                        <RTooltip contentStyle={tooltipStyle} formatter={(v: number, _: string, props: any) => [`${v} messages`, props.payload.type]} />
                                        <Bar dataKey="messages" name="Messages" radius={[0, 6, 6, 0]} barSize={16}>
                                            {channels.map((c, i) => <Cell key={i} fill={channelTypeColor[c.type] || '#94a3b8'} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                                {Object.entries(channelTypeColor).map(([t, c]) => (
                                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                                        <Text type="secondary" style={{ fontSize: 10 }}>{t}</Text>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card size="small" style={glassCard} title={<><MessageOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Message Volume Trend (30 days)</Text></>}>
                            <div style={{ height: 360 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={messageTrend}>
                                        <defs>
                                            <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                        <XAxis dataKey="day" tick={tickStyle} interval={4} />
                                        <YAxis tick={tickStyle} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                        <Area type="monotone" dataKey="messages" stroke="#10b981" fill="url(#msgGrad)" strokeWidth={2} name="Daily Messages" />
                                        <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} dot={false} name="7-Day Avg" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 5. Platform Usage + 6. Meeting Analytics */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><PieChartOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Platform Usage</Text></>}>
                            <div style={{ height: 260, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#fff' : '#1f2937' }}>{platformTotal.toLocaleString()}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>interactions</Text>
                                </div>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={MOCK_PLATFORM} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                            {MOCK_PLATFORM.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
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
                        <Card size="small" style={glassCard} title={<><VideoCameraOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Meeting Analytics</Text></>}>
                            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                                {[
                                    { label: 'Total Meetings', value: MOCK_MEETINGS.total, color: '#8b5cf6' },
                                    { label: 'Avg Duration', value: `${MOCK_MEETINGS.avgDuration}m`, color: '#3b82f6' },
                                    { label: 'Participants', value: MOCK_MEETINGS.totalParticipants.toLocaleString(), color: '#10b981' },
                                    { label: 'Recurring', value: `${MOCK_MEETINGS.recurringPct}%`, color: '#f59e0b' },
                                ].map((s, i) => (
                                    <Col key={i} xs={12} md={6}>
                                        <div style={{ padding: '8px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{s.label}</Text>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                            <Row gutter={[16, 12]}>
                                <Col xs={24} md={12}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Duration Distribution</Text>
                                    <div style={{ height: 160 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={MOCK_MEETINGS.distribution}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                                <XAxis dataKey="label" tick={tickStyle} />
                                                <YAxis tick={tickStyle} />
                                                <RTooltip contentStyle={tooltipStyle} />
                                                <Bar dataKey="count" name="Meetings" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Top Organizers</Text>
                                    <Table size="small" dataSource={MOCK_MEETINGS.organizers} pagination={false}
                                        columns={[
                                            { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                            { title: 'Meetings', dataIndex: 'meetings', key: 'meetings', align: 'center' as const, render: (v: number) => <Tag color="purple" style={{ borderRadius: 10, margin: 0 }}>{v}</Tag> },
                                            { title: 'Avg Dur.', dataIndex: 'avgDuration', key: 'avgDuration', align: 'right' as const, render: (v: number) => <Text type="secondary" style={{ fontSize: 11 }}>{v}m</Text> },
                                        ]}
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 7. File Sharing Insights */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                <Card size="small" style={glassCard} title={<><FileOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>File Sharing Insights</Text></>}>
                    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                        {[
                            { label: 'Files Shared', value: MOCK_FILES.totalShared.toLocaleString(), color: '#f59e0b' },
                            { label: 'Storage Used', value: MOCK_FILES.storageUsed, color: '#3b82f6' },
                            { label: 'Avg File Size', value: MOCK_FILES.avgSize, color: '#10b981' },
                        ].map((s, i) => (
                            <Col key={i} xs={8}>
                                <div style={{ padding: '8px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{s.label}</Text>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                    <Row gutter={[16, 12]}>
                        <Col xs={24} md={10}>
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={MOCK_FILES.types} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                            {MOCK_FILES.types.map((t, i) => <Cell key={i} fill={t.color} />)}
                                        </Pie>
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Col>
                        <Col xs={24} md={14}>
                            <Table size="small" dataSource={MOCK_FILES.topFiles} pagination={false}
                                columns={[
                                    { title: 'File', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{v}</Tag> },
                                    { title: 'Shares', dataIndex: 'shares', key: 'shares', align: 'center' as const, render: (v: number) => <Text strong style={{ fontSize: 11, color: '#f59e0b' }}>{v}</Text> },
                                    { title: 'Last Shared', dataIndex: 'lastShared', key: 'lastShared', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                                ]}
                            />
                        </Col>
                    </Row>
                </Card>
            </motion.div>

            {/* 8. Team Engagement Radar + 9. User Leaderboard */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><RadarChartOutlined style={{ color: '#ec4899' }} /> <Text strong style={{ fontSize: 13 }}>Team Engagement Radar</Text></>}>
                            <div style={{ height: 320 }}>
                                <ResponsiveContainer>
                                    <RadarChart data={MOCK_RADAR}>
                                        <PolarGrid stroke={gridStroke} />
                                        <PolarAngleAxis dataKey="dimension" tick={tickStyle} />
                                        <PolarRadiusAxis tick={tickStyle} domain={[0, 100]} />
                                        <Radar name="Engineering" dataKey="Engineering" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                                        <Radar name="Marketing" dataKey="Marketing" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} strokeWidth={2} />
                                        <Radar name="Design" dataKey="Design" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                                        <Radar name="Product" dataKey="Product" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                        <Card size="small" style={glassCard} title={<><CrownOutlined style={{ color: '#FFD700' }} /> <Text strong style={{ fontSize: 13 }}>User Activity Leaderboard</Text></>}>
                            <Table size="small" dataSource={MOCK_LEADERBOARD} pagination={false}
                                columns={[
                                    { title: '#', dataIndex: 'rank', key: 'rank', width: 40, render: (v: number) => v <= 3
                                        ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: badgeColors[v - 1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>{v}</div>
                                        : <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text>
                                    },
                                    { title: 'User', dataIndex: 'user', key: 'user', render: (v: string) => <Text style={{ fontSize: 11, fontWeight: 500 }}>{v}</Text> },
                                    { title: 'Messages', dataIndex: 'messages', key: 'messages', align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                    { title: 'Files', dataIndex: 'files', key: 'files', align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                    { title: 'Meetings', dataIndex: 'meetings', key: 'meetings', align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                    { title: 'Score', dataIndex: 'score', key: 'score', width: 120, render: (v: number) => (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0', overflow: 'hidden' }}>
                                                <div style={{ width: `${(v / maxLeaderScore) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${themeColor}, #8b5cf6)` }} />
                                            </div>
                                            <Text strong style={{ fontSize: 11, color: themeColor, minWidth: 20 }}>{v}</Text>
                                        </div>
                                    )},
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* 10. Response Time Analysis */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <Card size="small" style={glassCard} title={<><ClockCircleOutlined style={{ color: '#06b6d4' }} /> <Text strong style={{ fontSize: 13 }}>Response Time by Hour of Day</Text></>}>
                    <div style={{ height: 260 }}>
                        <ResponsiveContainer>
                            <AreaChart data={responseTimes}>
                                <defs>
                                    <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="hour" tick={tickStyle} interval={2} />
                                <YAxis tick={tickStyle} label={{ value: 'minutes', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: isDark ? '#aaa' : '#666' } }} />
                                <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} min`, 'Avg Response']} />
                                {/* Business hours highlight */}
                                <Area type="monotone" dataKey="avgMinutes" stroke="#06b6d4" fill="url(#rtGrad)" strokeWidth={2} name="Avg Response Time" dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    return <circle cx={cx} cy={cy} r={3} fill={payload.isBusiness ? '#06b6d4' : '#ef4444'} stroke="none" />;
                                }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} />
                            <Text type="secondary" style={{ fontSize: 10 }}>Business hours (9–17)</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                            <Text type="secondary" style={{ fontSize: 10 }}>Off-hours</Text>
                        </div>
                    </div>
                </Card>
            </motion.div>

        </div>
        </CMSLayout>
    );
}
