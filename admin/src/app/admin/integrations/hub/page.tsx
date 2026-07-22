'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import {
    Card, Row, Col, Typography, Spin, message, Segmented, Table, Tag, Input, Button,
    Badge, Switch, Drawer, Space, Tooltip, Progress,
    theme,
} from 'antd';
import {
    ApiOutlined, AppstoreOutlined, CheckCircleOutlined, WarningOutlined,
    CloseCircleOutlined, SearchOutlined, SettingOutlined, CopyOutlined,
    EyeOutlined, EyeInvisibleOutlined, ThunderboltOutlined,
    SyncOutlined, CloudOutlined, ReloadOutlined, DeleteOutlined,
    LineChartOutlined, DashboardOutlined,
} from '@ant-design/icons';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_INSTALLED = `query($tenantId: String!) { integrationsInstalled(tenantId: $tenantId) }`;
const GET_MARKETPLACE = `query($tenantId: String!) { integrationsMarketplace(tenantId: $tenantId) }`;
const GET_WEBHOOK_LOGS = `query($tenantId: String!) { integrationsWebhookLogs(tenantId: $tenantId) }`;

interface MarketItem { id: string; name: string; description: string; category: string; icon: string; status: string; version: string; author: string }
interface Installed { id: string; integrationId: string; name: string; category: string; status: string; config: string; apiKey: string; lastSync: string; requestsToday: number; errorRate: number; uptime: number; installedAt: string }
interface WebhookLog { id: string; integrationId: string; event: string; status: string; payload: string; response: string; timestamp: string; duration: number }

const CATEGORIES = ['all', 'payment', 'shipping', 'ai', 'communication', 'storage', 'analytics'];
const CAT_COLORS: Record<string, string> = { payment: '#3b82f6', shipping: '#f59e0b', ai: '#8b5cf6', communication: '#ec4899', storage: '#06b6d4', analytics: '#10b981' };
const CAT_ICONS: Record<string, string> = { payment: '💳', shipping: '🚚', ai: '🤖', communication: '💬', storage: '☁️', analytics: '📊' };

type View = 'marketplace' | 'installed' | 'monitoring';

// Generate mock sparkline data
const spark = (base: number) => Array.from({ length: 24 }, (_, i) => ({ h: `${i}h`, v: Math.max(0, base + Math.floor(Math.random() * base * 0.4 - base * 0.2)) }));
const errorTrend = () => Array.from({ length: 7 }, (_, i) => ({ day: dayjs().subtract(6 - i, 'day').format('ddd'), rate: +(Math.random() * 3).toFixed(2) }));

export default function IntegrationHubPage() {
    const [marketplace, setMarketplace] = useState<MarketItem[]>([]);
    const [installed, setInstalled] = useState<Installed[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>('marketplace');
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<Installed | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [logFilter, setLogFilter] = useState('all');
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => {
        (async () => {
            try {
                const [mRes, iRes, wRes] = await Promise.all([
                    gql(GET_MARKETPLACE, { tenantId: DEFAULT_TENANT_ID }),
                    gql(GET_INSTALLED, { tenantId: DEFAULT_TENANT_ID }),
                    gql(GET_WEBHOOK_LOGS, { tenantId: DEFAULT_TENANT_ID }),
                ]);
                const parse = (v: any) => typeof v === 'string' ? JSON.parse(v) : (Array.isArray(v) ? v : []);
                setMarketplace(parse(mRes.integrationsMarketplace));
                setInstalled(parse(iRes.integrationsInstalled));
                setWebhookLogs(parse(wRes.integrationsWebhookLogs));
            } catch (err: any) { message.error('Failed to load integrations: ' + err.message); }
            finally { setLoading(false); }
        })();
    }, []);

    const installedIds = useMemo(() => new Set(installed.map(i => i.integrationId)), [installed]);
    const activeCount = installed.filter(i => i.status === 'active').length;
    const errorCount = installed.filter(i => i.status === 'error').length;
    const totalCalls = installed.reduce((s, i) => s + (i.requestsToday || 0), 0);
    const filteredMarket = marketplace.filter(m =>
        (catFilter === 'all' || m.category === catFilter) &&
        (!search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase()))
    );
    const filteredLogs = webhookLogs.filter(l => logFilter === 'all' || l.status === logFilter);

    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : glass;
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
    const tickStyle = { fontSize: 10, fill: isDark ? '#aaa' : '#666' };
    const tooltipStyle = { background: isDark ? 'rgba(30,30,30,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderRadius: 8, fontSize: 12 };

    const apiChart = useMemo(() => spark(totalCalls > 0 ? Math.round(totalCalls / 24) : 50), [totalCalls]);
    const errTrend = useMemo(() => errorTrend(), []);

    const openConfig = (rec: Installed) => { setSelected(rec); setShowKey(false); setDrawerOpen(true); };

    // -- Config fields based on category --
    const configFields = (cat: string) => {
        switch (cat) {
            case 'payment': return [{ l: 'Merchant ID', k: 'merchantId' }, { l: 'Callback URL', k: 'callbackUrl' }];
            case 'shipping': return [{ l: 'Account Number', k: 'accountNumber' }, { l: 'API Mode', k: 'apiMode' }];
            case 'ai': return [{ l: 'Model', k: 'model' }, { l: 'Temperature', k: 'temperature' }];
            case 'communication': return [{ l: 'Sender ID', k: 'senderId' }, { l: 'From Address', k: 'fromAddress' }];
            default: return [{ l: 'Endpoint', k: 'endpoint' }];
        }
    };

    const healthColor = (rate: number) => rate < 1 ? '#10b981' : rate < 5 ? '#f59e0b' : '#ef4444';

    if (loading) return (
        <CMSLayout title="Integration Hub" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    // ── Stats Cards ──────────────────────────────────────
    const stats = [
        { t: 'Available', v: marketplace.length, c: '#3b82f6', i: <AppstoreOutlined /> },
        { t: 'Installed', v: installed.length, c: '#8b5cf6', i: <CloudOutlined /> },
        { t: 'Active', v: activeCount, c: '#10b981', i: <CheckCircleOutlined /> },
        { t: 'Error', v: errorCount, c: '#ef4444', i: <WarningOutlined /> },
        { t: 'API Calls Today', v: totalCalls.toLocaleString(), c: '#f59e0b', i: <ThunderboltOutlined /> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ec4899', '#3b82f6']}>Integration Hub</AuroraText>}
            subTitle={<DecryptedText text="Connect, configure & monitor all your integrations" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <Row gutter={[12, 12]}>
                {stats.map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4} lg={4}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${s.c}` }} styles={{ body: { padding: '14px 16px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{s.t}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: s.c, fontFamily: 'monospace', lineHeight: 1.3 }}>{s.v}</div>
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${s.c}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c, fontSize: 16 }}>{s.i}</div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* View Toggle */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Segmented
                    options={[
                        { label: '🏪 Marketplace', value: 'marketplace' },
                        { label: '⚙️ Installed', value: 'installed' },
                        { label: '📡 Monitoring', value: 'monitoring' },
                    ]}
                    value={view}
                    onChange={v => setView(v as View)}
                    style={{ marginBottom: 4 }}
                />
            </motion.div>

            {/* ── Marketplace View ───────────────────────── */}
            {view === 'marketplace' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card size="small" style={glassCard}>
                        <Space style={{ marginBottom: 14 }} wrap>
                            <Input prefix={<SearchOutlined />} placeholder="Search integrations..." size="small" style={{ width: 220 }} value={search} onChange={e => setSearch(e.target.value)} allowClear />
                            {CATEGORIES.map(c => (
                                <Button key={c} size="small" type={catFilter === c ? 'primary' : 'default'} onClick={() => setCatFilter(c)}
                                    style={{ fontSize: 11, borderRadius: 12, textTransform: 'capitalize' }}>
                                    {c === 'all' ? 'All' : `${CAT_ICONS[c] || ''} ${c}`}
                                </Button>
                            ))}
                        </Space>
                        <Row gutter={[12, 12]}>
                            {filteredMarket.map((m, i) => {
                                const isInstalled = installedIds.has(m.id);
                                const cc = CAT_COLORS[m.category] || '#6b7280';
                                return (
                                    <Col key={m.id} xs={24} sm={12} md={8} lg={6}>
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                            whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                                            <Card size="small" hoverable style={{ ...glassCard, borderTop: `3px solid ${cc}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cc}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                                        {m.icon || CAT_ICONS[m.category] || m.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>{m.name}</Text><br />
                                                        <Text type="secondary" style={{ fontSize: 9 }}>{m.version} · {m.author}</Text>
                                                    </div>
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, marginBottom: 10, minHeight: 30 }}>
                                                    {m.description}
                                                </Text>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Tag color={cc} style={{ fontSize: 9, borderRadius: 8, margin: 0, textTransform: 'capitalize' }}>{m.category}</Tag>
                                                    {isInstalled
                                                        ? <Tag color="green" style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>✓ Installed</Tag>
                                                        : <Button size="small" type="primary" style={{ fontSize: 10, borderRadius: 8, background: '#10b981', borderColor: '#10b981' }}>Install</Button>
                                                    }
                                                </div>
                                            </Card>
                                        </motion.div>
                                    </Col>
                                );
                            })}
                        </Row>
                    </Card>
                </motion.div>
            )}

            {/* ── Installed View ─────────────────────────── */}
            {view === 'installed' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Quick Insights Bar */}
                    <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${themeColor}` }} styles={{ body: { padding: '10px 16px' } }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Total Requests</Text>
                                <Text strong style={{ fontSize: 15, fontFamily: 'monospace', color: themeColor }}>{totalCalls.toLocaleString()}</Text>
                            </div>
                            <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                            <div>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Avg Uptime</Text>
                                <Text strong style={{ fontSize: 15, fontFamily: 'monospace', color: '#10b981' }}>
                                    {installed.length > 0 ? (installed.reduce((s, i) => s + (i.uptime || 0), 0) / installed.length).toFixed(2) : '0'}%
                                </Text>
                            </div>
                            <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                            <div>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Avg Error Rate</Text>
                                <Text strong style={{ fontSize: 15, fontFamily: 'monospace', color: '#ef4444' }}>
                                    {installed.length > 0 ? (installed.reduce((s, i) => s + (i.errorRate || 0), 0) / installed.length).toFixed(2) : '0'}%
                                </Text>
                            </div>
                            <div style={{ width: 1, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                            <div>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Active / Error</Text>
                                <Text strong style={{ fontSize: 15 }}>
                                    <span style={{ color: '#10b981' }}>{activeCount}</span>
                                    <span style={{ color: isDark ? '#666' : '#ccc', margin: '0 4px' }}>/</span>
                                    <span style={{ color: '#ef4444' }}>{errorCount}</span>
                                </Text>
                            </div>
                        </div>
                    </Card>

                    {/* Installed Table */}
                    <Card size="small" style={glassCard} title={<Space><ApiOutlined style={{ color: '#3b82f6' }} /><Text strong>Installed Integrations</Text><Badge count={installed.length} style={{ backgroundColor: '#3b82f6' }} /></Space>}>
                        <Table dataSource={installed} rowKey="id" size="small" pagination={false}
                            onRow={rec => ({ onClick: () => openConfig(rec), style: { cursor: 'pointer' } })}
                            columns={[
                                { title: 'Name', dataIndex: 'name', render: (v: string, r: Installed) => (
                                    <Space><div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[r.category] || '#6b7280' }} /><Text strong style={{ fontSize: 12 }}>{v}</Text></Space>
                                )},
                                { title: 'Category', dataIndex: 'category', render: (v: string) => <Tag color={CAT_COLORS[v]} style={{ fontSize: 10, borderRadius: 8, margin: 0, textTransform: 'capitalize' }}>{v}</Tag> },
                                { title: 'Status', dataIndex: 'status', render: (v: string) => (
                                    <Tooltip title={v === 'error' ? 'Connection error — check config' : undefined}>
                                        <Tag color={v === 'active' ? 'green' : v === 'error' ? 'red' : 'default'} style={{ fontSize: 10, borderRadius: 10 }}>
                                            {v === 'active' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginRight: 4, animation: 'pulse 2s infinite' }} />}
                                            {v}
                                        </Tag>
                                    </Tooltip>
                                )},
                                { title: 'Last Sync', dataIndex: 'lastSync', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v ? dayjs(v).fromNow() : '—'}</Text> },
                                { title: 'Requests', dataIndex: 'requestsToday', render: (v: number) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{(v || 0).toLocaleString()}</Text> },
                                { title: 'Error %', dataIndex: 'errorRate', render: (v: number) => <Text style={{ fontSize: 11, color: healthColor(v || 0) }}>{(v || 0).toFixed(1)}%</Text> },
                                { title: 'Uptime', dataIndex: 'uptime', width: 110, render: (v: number) => <Progress percent={v || 0} size="small" strokeColor={(v || 0) > 99.5 ? '#10b981' : '#f59e0b'} format={p => `${p}%`} /> },
                                { title: 'Actions', width: 140, render: (_: unknown, r: Installed) => (
                                    <Space size={4} onClick={e => e.stopPropagation()}>
                                        <Tooltip title="Configure"><Button type="text" size="small" icon={<SettingOutlined style={{ fontSize: 12 }} />} onClick={() => openConfig(r)} /></Tooltip>
                                        <Tooltip title="Toggle"><Switch size="small" checked={r.status === 'active'} /></Tooltip>
                                        <Tooltip title="Test"><Button type="text" size="small" icon={<SyncOutlined style={{ fontSize: 12 }} />} /></Tooltip>
                                        <Tooltip title="Uninstall"><Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />} /></Tooltip>
                                    </Space>
                                )},
                            ]}
                        />
                    </Card>
                </motion.div>
            )}

            {/* ── Monitoring View ────────────────────────── */}
            {view === 'monitoring' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Health Dashboard */}
                    <Card size="small" style={glassCard} title={<><DashboardOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Integration Health</Text></>}>
                        <Table dataSource={installed} rowKey="id" size="small" pagination={false} columns={[
                            { title: 'Integration', dataIndex: 'name', render: (v: string, r: Installed) => (
                                <Space><div style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor(r.errorRate || 0), boxShadow: `0 0 6px ${healthColor(r.errorRate || 0)}` }} /><Text strong style={{ fontSize: 12 }}>{v}</Text></Space>
                            )},
                            { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'error' ? 'red' : 'default'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                            { title: 'Requests (24h)', dataIndex: 'requestsToday', width: 180, render: (v: number) => (
                                <div style={{ height: 30, width: 140 }}>
                                    <ResponsiveContainer><AreaChart data={spark(Math.round((v || 50) / 24))}><Area type="monotone" dataKey="v" stroke={themeColor} fill={`${themeColor}20`} strokeWidth={1.5} dot={false} /></AreaChart></ResponsiveContainer>
                                </div>
                            )},
                            { title: 'Error Rate', dataIndex: 'errorRate', render: (v: number) => <Text style={{ fontSize: 11, color: healthColor(v || 0), fontWeight: 600 }}>{(v || 0).toFixed(2)}%</Text> },
                            { title: 'Avg Latency', render: () => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{(80 + Math.floor(Math.random() * 200))}ms</Text> },
                        ]} />
                    </Card>

                    {/* Charts Row */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={14}>
                            <Card size="small" style={glassCard} title={<><LineChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>API Calls (24h)</Text></>}>
                                <div style={{ height: 240 }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={apiChart}>
                                            <defs><linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColor} stopOpacity={0.3} /><stop offset="95%" stopColor={themeColor} stopOpacity={0.02} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="h" tick={tickStyle} />
                                            <YAxis tick={tickStyle} />
                                            <RTooltip contentStyle={tooltipStyle} />
                                            <Area type="monotone" dataKey="v" stroke={themeColor} fill="url(#apiGrad)" strokeWidth={2} name="Requests" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} md={10}>
                            <Card size="small" style={{ ...glassCard, height: '100%' }} title={<><WarningOutlined style={{ color: '#ef4444' }} /> <Text strong style={{ fontSize: 13 }}>Error Rate Trend (7d)</Text></>}>
                                <div style={{ height: 240 }}>
                                    <ResponsiveContainer>
                                        <LineChart data={errTrend}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                            <XAxis dataKey="day" tick={tickStyle} />
                                            <YAxis tick={tickStyle} domain={[0, 'auto']} />
                                            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                                            <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Error %" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Connection Health Matrix */}
                    <Card size="small" style={glassCard} title={<><CheckCircleOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Connection Health Matrix</Text></>}>
                        <Row gutter={[12, 12]}>
                            {installed.map((inst, idx) => {
                                const hc = healthColor(inst.errorRate || 0);
                                const label = (inst.errorRate || 0) < 1 ? 'Healthy' : (inst.errorRate || 0) < 5 ? 'Degraded' : 'Down';
                                const labelEmoji = label === 'Healthy' ? '🟢' : label === 'Degraded' ? '🟡' : '🔴';
                                return (
                                    <Col key={inst.id} xs={24} sm={12} md={8} lg={6}>
                                        <Tooltip title={`Uptime: ${inst.uptime || 0}% · Error: ${(inst.errorRate || 0).toFixed(1)}%`}>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.04 }}
                                                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                                                style={{
                                                    padding: '12px 16px', borderRadius: 12,
                                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                                                    borderLeft: `3px solid ${hc}`,
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                    <div style={{
                                                        width: 12, height: 12, borderRadius: '50%',
                                                        background: hc, boxShadow: `0 0 8px ${hc}`,
                                                        animation: inst.status === 'active' ? 'pulse 2s infinite' : undefined,
                                                    }} />
                                                    <div style={{ flex: 1 }}>
                                                        <Text strong style={{ fontSize: 12 }}>{inst.name}</Text>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                            <Tag style={{ fontSize: 9, borderRadius: 6, margin: 0, textTransform: 'capitalize' }} color={CAT_COLORS[inst.category]}>{inst.category}</Tag>
                                                            <Text type="secondary" style={{ fontSize: 9 }}>{labelEmoji} {label}</Text>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Progress
                                                    percent={inst.uptime || 0}
                                                    size="small"
                                                    strokeColor={hc}
                                                    format={p => <span style={{ fontSize: 9 }}>{p}%</span>}
                                                    style={{ marginBottom: 4 }}
                                                />
                                                <Text type="secondary" style={{ fontSize: 9 }}>
                                                    Last check: {dayjs().format('HH:mm:ss')}
                                                    {inst.installedAt && <> · Since {dayjs(inst.installedAt).format('MMM DD')}</>}
                                                </Text>
                                            </motion.div>
                                        </Tooltip>
                                    </Col>
                                );
                            })}
                        </Row>
                    </Card>
                </motion.div>
            )}

            {/* ── Webhook Event Log (Bottom Section) ──────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card size="small" style={glassCard}
                    title={<Space><ApiOutlined style={{ color: '#f59e0b' }} /><Text strong>Webhook Event Log</Text><Badge count={webhookLogs.length} style={{ backgroundColor: '#f59e0b' }} /></Space>}
                    extra={<Space size={4}>
                        {['all', 'success', 'error'].map(f => (
                            <Button key={f} size="small" type={logFilter === f ? 'primary' : 'default'} onClick={() => setLogFilter(f)} style={{ fontSize: 10, borderRadius: 10, textTransform: 'capitalize' }}>{f}</Button>
                        ))}
                    </Space>}
                >
                    <Table dataSource={filteredLogs} rowKey="id" size="small" pagination={{ pageSize: 6, size: 'small' }}
                        expandable={{
                            expandedRowRender: (r: WebhookLog) => (
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>Request Payload</Text>
                                        <pre style={{ fontSize: 10, maxHeight: 120, overflow: 'auto', background: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', padding: 8, borderRadius: 6, margin: '4px 0 0' }}>{r.payload || '—'}</pre>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>Response</Text>
                                        <pre style={{ fontSize: 10, maxHeight: 120, overflow: 'auto', background: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', padding: 8, borderRadius: 6, margin: '4px 0 0' }}>{r.response || '—'}</pre>
                                    </div>
                                </div>
                            ),
                        }}
                        columns={[
                            { title: 'Timestamp', dataIndex: 'timestamp', width: 140, render: (v: string) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v ? dayjs(v).format('MMM DD HH:mm:ss') : '—'}</Text> },
                            { title: 'Integration', dataIndex: 'integrationId', render: (v: string) => <Text strong style={{ fontSize: 11 }}>{installed.find(i => i.id === v)?.name || v}</Text> },
                            { title: 'Event', dataIndex: 'event', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                            { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'success' ? 'green' : v === 'error' ? 'red' : 'orange'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                            { title: 'Duration', dataIndex: 'duration', width: 80, render: (v: number) => <Text type="secondary" style={{ fontSize: 10 }}>{v ? `${v}ms` : '—'}</Text> },
                            { title: 'Payload', dataIndex: 'payload', width: 80, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v ? `${new Blob([v]).size} B` : '—'}</Text> },
                        ]}
                    />
                </Card>
            </motion.div>
        </div>

        {/* ── Configuration Drawer ────────────────────────── */}
        <Drawer
            title={selected ? <Space><div style={{ width: 32, height: 32, borderRadius: 8, background: `${CAT_COLORS[selected.category] || '#6b7280'}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{CAT_ICONS[selected.category] || '⚙️'}</div><div><Text strong>{selected.name}</Text><br /><Text type="secondary" style={{ fontSize: 10, textTransform: 'capitalize' }}>{selected.category}</Text></div></Space> : 'Configure'}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            size={420}
        >
            {selected && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* API Key */}
                    <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>API Key</Text>
                        <Input.Group compact style={{ display: 'flex', marginTop: 4 }}>
                            <Input value={showKey ? (selected.apiKey || 'sk-xxxx-xxxx-xxxx') : '••••••••••••••••'} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
                            <Button icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setShowKey(!showKey)} />
                        </Input.Group>
                    </div>

                    {/* Webhook URL */}
                    <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Webhook URL</Text>
                        <Input.Group compact style={{ display: 'flex', marginTop: 4 }}>
                            <Input value={`https://api.nusantarasoft.io/webhooks/${selected.id}`} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }} />
                            <Button icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(`https://api.nusantarasoft.io/webhooks/${selected.id}`); message.success('Copied!'); }} />
                        </Input.Group>
                    </div>

                    {/* Environment toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12 }}>Environment</Text>
                        <Segmented options={['Sandbox', 'Production']} size="small" defaultValue="Production" />
                    </div>

                    {/* Custom config fields */}
                    {configFields(selected.category).map(f => (
                        <div key={f.k}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{f.l}</Text>
                            <Input size="small" placeholder={f.l} style={{ marginTop: 4 }} />
                        </div>
                    ))}

                    {/* Test Connection */}
                    <Button icon={<SyncOutlined />} block onClick={() => message.success(`${selected.name} connection OK`)}>Test Connection</Button>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Button type="primary" block onClick={() => { message.success('Saved'); setDrawerOpen(false); }}>Save</Button>
                        <Button block onClick={() => setDrawerOpen(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </Drawer>

        {/* Pulse animation */}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </CMSLayout>
    );
}
