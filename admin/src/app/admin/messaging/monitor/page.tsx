'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { motion } from 'framer-motion';
import {
    Card, Row, Col, Table, Space, Tag, Typography,
    Segmented, Badge, Progress, Button, Tooltip, theme,
} from 'antd';
import {
    ThunderboltOutlined, DatabaseOutlined, TeamOutlined, AlertOutlined,
    ReloadOutlined, WarningOutlined, DeleteOutlined,
    CheckCircleOutlined, SwapOutlined, InboxOutlined, BarChartOutlined,
    ClockCircleOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer,
    LineChart, Line, BarChart, Bar, ReferenceLine, Legend,
} from 'recharts';

const { Text } = Typography;

/* ── GraphQL Queries ──────────────────────────────────────── */
const GET_TOPICS = `query($tenantId: String!) { messagingTopics(tenantId: $tenantId) }`;
const GET_QUEUES = `query($tenantId: String!) { messagingQueues(tenantId: $tenantId) }`;
const GET_EVENTS = `query($tenantId: String!) { messagingEvents(tenantId: $tenantId) }`;

/* ── Mock time-series generators ──────────────────────────── */
const genThroughput = () =>
    Array.from({ length: 60 }, (_, i) => {
        const t = new Date(Date.now() - (59 - i) * 60000);
        const produced = 800 + Math.floor(Math.random() * 400 + Math.sin(i / 8) * 200);
        const consumed = produced - Math.floor(Math.random() * 80);
        return {
            time: `${t.getHours()}:${t.getMinutes().toString().padStart(2, '0')}`,
            Produced: produced,
            Consumed: Math.max(0, consumed),
        };
    });

const CONSUMER_GROUPS_LAG = [
    'order-processor',
    'analytics-worker',
    'notification-svc',
    'audit-archiver',
];

const genLagTrend = () =>
    Array.from({ length: 30 }, (_, i) => {
        const t = new Date(Date.now() - (29 - i) * 120000);
        const row: any = {
            time: `${t.getHours()}:${t.getMinutes().toString().padStart(2, '0')}`,
        };
        CONSUMER_GROUPS_LAG.forEach((g, gi) => {
            row[g] = Math.max(
                0,
                Math.floor(300 + Math.sin(i / 5 + gi) * 500 + Math.random() * 200),
            );
        });
        return row;
    });

const genErrorTrend = () =>
    Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        errors: Math.floor(Math.random() * 30 + 5 + (i > 9 && i < 14 ? 20 : 0)),
    }));

/* ── Static mock data ─────────────────────────────────────── */
const KAFKA_TOPICS = [
    { key: '1', name: 'user-events', partitions: 6, messages: 452300, prodRate: 120, consRate: 118, replication: 3, retention: '7d', status: 'healthy' },
    { key: '2', name: 'order-events', partitions: 12, messages: 1245000, prodRate: 450, consRate: 380, replication: 3, retention: '30d', status: 'lagging' },
    { key: '3', name: 'audit-logs', partitions: 3, messages: 891200, prodRate: 200, consRate: 200, replication: 2, retention: '90d', status: 'healthy' },
    { key: '4', name: 'notifications', partitions: 4, messages: 56700, prodRate: 35, consRate: 35, replication: 2, retention: '3d', status: 'healthy' },
    { key: '5', name: 'analytics-stream', partitions: 8, messages: 2345000, prodRate: 890, consRate: 420, replication: 3, retention: '14d', status: 'stalled' },
    { key: '6', name: 'payment-events', partitions: 6, messages: 678900, prodRate: 310, consRate: 305, replication: 3, retention: '60d', status: 'healthy' },
    { key: '7', name: 'inventory-sync', partitions: 4, messages: 123400, prodRate: 55, consRate: 42, replication: 2, retention: '7d', status: 'lagging' },
];

const RMQ_QUEUES = [
    { key: '1', name: 'email.send', ready: 23, unacked: 5, consumers: 2, publishRate: 12, deliverRate: 11, state: 'running', memory: '2.4 MB' },
    { key: '2', name: 'notifications.push', ready: 5, unacked: 1, consumers: 3, publishRate: 8, deliverRate: 8, state: 'running', memory: '1.1 MB' },
    { key: '3', name: 'reports.generate', ready: 0, unacked: 0, consumers: 1, publishRate: 2, deliverRate: 2, state: 'idle', memory: '0.3 MB' },
    { key: '4', name: 'webhooks.dispatch', ready: 142, unacked: 34, consumers: 2, publishRate: 45, deliverRate: 18, state: 'draining', memory: '8.7 MB' },
    { key: '5', name: 'audit.process', ready: 0, unacked: 0, consumers: 1, publishRate: 5, deliverRate: 5, state: 'idle', memory: '0.5 MB' },
    { key: '6', name: 'sms.outbound', ready: 8, unacked: 2, consumers: 2, publishRate: 6, deliverRate: 6, state: 'running', memory: '0.8 MB' },
];

const DLQ_ITEMS = [
    { key: '1', source: 'order-events', count: 34, oldest: '2h ago', reason: 'Deserialization failure', type: 'kafka' },
    { key: '2', source: 'webhooks.dispatch', count: 12, oldest: '45m ago', reason: 'Connection timeout', type: 'rabbitmq' },
    { key: '3', source: 'analytics-stream', count: 156, oldest: '6h ago', reason: 'Schema mismatch v3→v4', type: 'kafka' },
    { key: '4', source: 'email.send', count: 3, oldest: '10m ago', reason: 'Invalid recipient address', type: 'rabbitmq' },
    { key: '5', source: 'payment-events', count: 7, oldest: '1h ago', reason: 'Insufficient funds handler error', type: 'kafka' },
];

const CONSUMER_HEALTH = [
    { name: 'order-processor', topics: ['order-events'], members: 4, lag: 4200, state: 'stable', assignedPartitions: [0, 1, 2, 3] },
    { name: 'analytics-worker', topics: ['analytics-stream', 'user-events'], members: 6, lag: 15800, state: 'rebalancing', assignedPartitions: [0, 1, 2, 3, 4, 5] },
    { name: 'notification-svc', topics: ['notifications'], members: 2, lag: 0, state: 'stable', assignedPartitions: [0, 1] },
    { name: 'audit-archiver', topics: ['audit-logs'], members: 1, lag: 12, state: 'stable', assignedPartitions: [0, 1, 2] },
    { name: 'search-indexer', topics: ['user-events', 'order-events'], members: 3, lag: 890, state: 'stable', assignedPartitions: [0, 1, 2] },
    { name: 'dead-letter-handler', topics: ['dlq-events'], members: 1, lag: 205, state: 'dead', assignedPartitions: [0] },
];

const ERROR_REASONS = [
    { reason: 'Schema mismatch', count: 156 },
    { reason: 'Connection timeout', count: 89 },
    { reason: 'Deserialization error', count: 67 },
    { reason: 'Auth failure', count: 34 },
    { reason: 'Rate limit exceeded', count: 22 },
];

const RECENT_ERRORS = [
    { key: '1', ts: '22:14:02', source: 'analytics-stream', message: 'Schema v3 incompatible with consumer v4', consumer: 'analytics-worker' },
    { key: '2', ts: '22:12:45', source: 'webhooks.dispatch', message: 'Connection refused: downstream timeout after 30s', consumer: 'webhook-relay' },
    { key: '3', ts: '22:10:18', source: 'order-events', message: 'Failed to deserialize OrderCreated payload', consumer: 'order-processor' },
    { key: '4', ts: '22:08:33', source: 'email.send', message: 'SMTP relay rejected: invalid recipient address', consumer: 'email-worker' },
    { key: '5', ts: '22:05:12', source: 'payment-events', message: 'Handler threw InsufficientFundsException', consumer: 'payment-processor' },
    { key: '6', ts: '22:02:50', source: 'inventory-sync', message: 'Partition 3 consumer lagging behind leader', consumer: 'inventory-worker' },
];

/* ── Constants & Helpers ──────────────────────────────────── */
const PLATFORM_OPTS = ['All', 'Kafka', 'RabbitMQ'];
const LAG_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

const stateColor = (s: string) =>
    s === 'stable' ? '#10b981' : s === 'rebalancing' ? '#f59e0b' : '#ef4444';
const statusColor = (s: string) =>
    s === 'healthy' ? 'green' : s === 'lagging' ? 'gold' : 'red';
const rmqStateColor = (s: string) =>
    s === 'running' ? 'green' : s === 'idle' ? 'default' : 'orange';

/* ── Pipeline flow definition ─────────────────────────────── */
const PIPELINE_NODES = [
    { x: 30, y: 50, label: 'Producers', sub: '1.7k/s', color: '#3b82f6' },
    { x: 200, y: 25, label: 'Kafka Topics', sub: '7 topics', color: '#06b6d4' },
    { x: 200, y: 80, label: 'RMQ Queues', sub: '6 queues', color: '#8b5cf6' },
    { x: 400, y: 50, label: 'Consumers', sub: '6 groups', color: '#10b981' },
    { x: 580, y: 50, label: 'Services', sub: '12 active', color: '#f59e0b' },
];
const PIPELINE_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];

/* ═══════════════════════════════════════════════════════════ */
export default function QueueMonitorPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark =
        antToken.colorBgContainer === '#141414' ||
        antToken.colorBgBase?.includes('14');

    const glass = {
        background: isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.45)'}`,
        borderRadius: 14,
    };

    const chartText = isDark ? 'rgba(255,255,255,0.65)' : '#666';
    const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const ttStyle = {
        borderRadius: 10,
        fontSize: 12,
        background: isDark ? '#1f1f1f' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eee'}`,
    };

    const [platform, setPlatform] = useState('All');
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const throughput = useMemo(() => genThroughput(), []);
    const lagTrend = useMemo(() => genLagTrend(), []);
    const errorTrend = useMemo(() => genErrorTrend(), []);

    const dlqTotal = DLQ_ITEMS.reduce((s, d) => s + d.count, 0);
    const totalLag = CONSUMER_HEALTH.reduce((s, c) => s + c.lag, 0);
    const errorRate = 2.4;

    /* ── GraphQL fetch (graceful fallback to mock) ──────────── */
    useEffect(() => {
        gql(GET_TOPICS, { tenantId: DEFAULT_TENANT_ID }).catch(() => {});
        gql(GET_QUEUES, { tenantId: DEFAULT_TENANT_ID }).catch(() => {});
        gql(GET_EVENTS, { tenantId: DEFAULT_TENANT_ID }).catch(() => {});
    }, []);

    /* ── KPI Stats ─────────────────────────────────────────── */
    const stats = [
        { t: 'Kafka Topics', v: KAFKA_TOPICS.length, c: '#3b82f6', i: <DatabaseOutlined /> },
        { t: 'RMQ Queues', v: RMQ_QUEUES.length, c: '#8b5cf6', i: <InboxOutlined /> },
        { t: 'Messages/sec', v: '1,690', c: '#10b981', i: <ThunderboltOutlined /> },
        { t: 'Consumer Groups', v: CONSUMER_HEALTH.length, c: '#06b6d4', i: <TeamOutlined /> },
        {
            t: 'Consumer Lag',
            v: totalLag.toLocaleString(),
            c: totalLag > 10000 ? '#f59e0b' : '#10b981',
            i: <AlertOutlined />,
        },
        {
            t: 'Error Rate',
            v: `${errorRate}%`,
            c: errorRate > 5 ? '#ef4444' : '#f59e0b',
            i: <WarningOutlined />,
        },
    ];

    return (
        <CMSLayout
            title={
                <AuroraText colors={[themeColor, '#3b82f6', '#8b5cf6']}>
                    Queue Monitor
                </AuroraText>
            }
            subTitle={
                <DecryptedText
                    text="Real-time message queue monitoring — Kafka & RabbitMQ"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={15}
                    sequential
                />
            }
            extra={[<Button key="r" icon={<ReloadOutlined />} />]}
        >
            {/* ─── 1. Platform Tabs ──────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 16 }}
            >
                <Segmented
                    options={PLATFORM_OPTS}
                    value={platform}
                    onChange={v => setPlatform(v as string)}
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
                        borderRadius: 10,
                    }}
                />
                <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                    {platform === 'All'
                        ? `${KAFKA_TOPICS.length} topics · ${RMQ_QUEUES.length} queues`
                        : platform === 'Kafka'
                        ? `${KAFKA_TOPICS.length} topics monitored`
                        : `${RMQ_QUEUES.length} queues monitored`}
                </Text>
            </motion.div>

            {/* ─── 2. Stats Cards ────────────────────── */}
            <BentoGrid className="max-w-full mb-4">
                {stats.map((st, i) => (
                    <BentoGridItem
                        key={i}
                        title={st.t}
                        description="Monitor metric"
                        icon={React.cloneElement(st.i as React.ReactElement<any>, { style: { color: st.c } })}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl" style={{ backgroundColor: `${st.c}15` }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: st.c }}>{st.v}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                ))}
            </BentoGrid>

            {/* ─── 3. Message Throughput Chart ───────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card
                            size="small"
                            title={<Space><RiseOutlined style={{ color: '#3b82f6' }} /> Message Throughput (1h)</Space>}
                            style={{ ...glass, height: '100%' }}
                        >
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={throughput}>
                                    <defs>
                                        <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="gCons" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartText }} interval={9} />
                                    <YAxis tick={{ fontSize: 10, fill: chartText }} />
                                    <RTooltip contentStyle={ttStyle} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Area type="monotone" dataKey="Produced" stroke="#3b82f6" strokeWidth={2} fill="url(#gProd)" />
                                    <Area type="monotone" dataKey="Consumed" stroke="#10b981" strokeWidth={2} fill="url(#gCons)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>

                {/* ─── 4. Consumer Lag Trend ─────────── */}
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Card
                            size="small"
                            title={<Space><FallOutlined style={{ color: '#8b5cf6' }} /> Consumer Lag Trend</Space>}
                            style={{ ...glass, height: '100%' }}
                        >
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={lagTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartText }} interval={5} />
                                    <YAxis tick={{ fontSize: 10, fill: chartText }} />
                                    <RTooltip contentStyle={ttStyle} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <ReferenceLine
                                        y={1000}
                                        stroke="#ef4444"
                                        strokeDasharray="5 3"
                                        label={{
                                            value: 'Threshold',
                                            fill: '#ef4444',
                                            fontSize: 10,
                                            position: 'right',
                                        }}
                                    />
                                    {CONSUMER_GROUPS_LAG.map((g, i) => (
                                        <Line
                                            key={g}
                                            type="monotone"
                                            dataKey={g}
                                            stroke={LAG_COLORS[i]}
                                            strokeWidth={1.5}
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 5. Kafka Topics Table ─────────────── */}
            {(platform === 'All' || platform === 'Kafka') && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 16 }}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <DatabaseOutlined style={{ color: '#3b82f6' }} />
                                <Text strong>Kafka Topics</Text>
                                <Badge count={KAFKA_TOPICS.length} style={{ backgroundColor: themeColor }} />
                            </Space>
                        }
                        style={glass}
                    >
                        <Table
                            dataSource={KAFKA_TOPICS}
                            rowKey="key"
                            size="small"
                            pagination={false}
                            scroll={{ x: 800 }}
                            expandable={{
                                expandedRowRender: (r: any) => (
                                    <div style={{ padding: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                                            Partition distribution for <strong>{r.name}</strong>:
                                        </Text>
                                        {Array.from({ length: r.partitions }, (_, i) => (
                                            <Tag key={i} style={{ margin: 2, fontSize: 10, borderRadius: 6 }}>
                                                P{i}: {Math.floor(r.messages / r.partitions).toLocaleString()} msgs
                                            </Tag>
                                        ))}
                                    </div>
                                ),
                            }}
                            columns={[
                                {
                                    title: 'Topic', dataIndex: 'name',
                                    render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
                                },
                                { title: 'Partitions', dataIndex: 'partitions', width: 80 },
                                {
                                    title: 'Messages', dataIndex: 'messages',
                                    render: (v: number) => <Text strong style={{ color: '#10b981' }}>{v.toLocaleString()}</Text>,
                                    sorter: (a: any, b: any) => a.messages - b.messages,
                                },
                                {
                                    title: 'Prod /s', dataIndex: 'prodRate', width: 80,
                                    render: (v: number) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>,
                                },
                                {
                                    title: 'Cons /s', dataIndex: 'consRate', width: 80,
                                    render: (v: number) => <Tag color="cyan" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>,
                                },
                                { title: 'RF', dataIndex: 'replication', width: 50 },
                                {
                                    title: 'Retention', dataIndex: 'retention', width: 80,
                                    render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>,
                                },
                                {
                                    title: 'Status', dataIndex: 'status', width: 90,
                                    render: (v: string) => <Tag color={statusColor(v)} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag>,
                                    defaultSortOrder: 'descend' as const,
                                    sorter: (a: any, b: any) => (a.prodRate - a.consRate) - (b.prodRate - b.consRate),
                                },
                            ]}
                        />
                    </Card>
                </motion.div>
            )}

            {/* ─── 6. RabbitMQ Queues Table ──────────── */}
            {(platform === 'All' || platform === 'RabbitMQ') && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ marginBottom: 16 }}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <InboxOutlined style={{ color: '#8b5cf6' }} />
                                <Text strong>RabbitMQ Queues</Text>
                                <Badge count={RMQ_QUEUES.length} style={{ backgroundColor: '#8b5cf6' }} />
                            </Space>
                        }
                        style={glass}
                    >
                        <Table
                            dataSource={RMQ_QUEUES}
                            rowKey="key"
                            size="small"
                            pagination={false}
                            scroll={{ x: 800 }}
                            expandable={{
                                expandedRowRender: (r: any) => (
                                    <div style={{ padding: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            Bindings: events.topic → {r.name} (routing_key: {r.name}.#)
                                        </Text>
                                    </div>
                                ),
                            }}
                            columns={[
                                {
                                    title: 'Queue', dataIndex: 'name',
                                    render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
                                },
                                {
                                    title: 'Ready', dataIndex: 'ready', width: 70,
                                    render: (v: number) => <Text strong style={{ color: v > 100 ? '#f59e0b' : '#10b981' }}>{v}</Text>,
                                },
                                {
                                    title: 'Unacked', dataIndex: 'unacked', width: 70,
                                    render: (v: number) => <Text style={{ color: v > 20 ? '#ef4444' : chartText }}>{v}</Text>,
                                },
                                { title: 'Consumers', dataIndex: 'consumers', width: 80 },
                                {
                                    title: 'Pub /s', dataIndex: 'publishRate', width: 70,
                                    render: (v: number) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>,
                                },
                                {
                                    title: 'Del /s', dataIndex: 'deliverRate', width: 70,
                                    render: (v: number) => <Tag color="cyan" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>,
                                },
                                {
                                    title: 'State', dataIndex: 'state', width: 90,
                                    render: (v: string) => <Tag color={rmqStateColor(v)} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag>,
                                },
                                {
                                    title: 'Memory', dataIndex: 'memory', width: 80,
                                    render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text>,
                                },
                            ]}
                        />
                    </Card>
                </motion.div>
            )}

            {/* ─── 7. Dead Letter Queue Monitor ──────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginBottom: 16 }}>
                <Card
                    size="small"
                    title={
                        <Space>
                            <WarningOutlined style={{ color: '#ef4444' }} />
                            <Text strong>Dead Letter Queues</Text>
                            <Badge count={dlqTotal} overflowCount={999} style={{ backgroundColor: '#ef4444' }} />
                        </Space>
                    }
                    style={{ ...glass, borderTop: dlqTotal > 0 ? '3px solid #ef4444' : undefined }}
                >
                    <Table
                        dataSource={DLQ_ITEMS}
                        rowKey="key"
                        size="small"
                        pagination={false}
                        columns={[
                            {
                                title: 'Source', dataIndex: 'source',
                                render: (v: string, r: any) => (
                                    <Space>
                                        <Tag color={r.type === 'kafka' ? 'blue' : 'purple'} style={{ fontSize: 9, borderRadius: 6 }}>{r.type}</Tag>
                                        <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>
                                    </Space>
                                ),
                            },
                            {
                                title: 'Count', dataIndex: 'count', width: 80,
                                render: (v: number) => <Text strong style={{ color: '#ef4444', fontSize: 14 }}>{v}</Text>,
                            },
                            {
                                title: 'Oldest', dataIndex: 'oldest', width: 90,
                                render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text>,
                            },
                            { title: 'Error Reason', dataIndex: 'reason', ellipsis: true },
                            {
                                title: 'Action', width: 160,
                                render: () => (
                                    <Space>
                                        <Button size="small" type="primary" icon={<ReloadOutlined />} style={{ fontSize: 10, borderRadius: 6 }}>
                                            Retry
                                        </Button>
                                        <Button size="small" danger icon={<DeleteOutlined />} style={{ fontSize: 10, borderRadius: 6 }}>
                                            Purge
                                        </Button>
                                    </Space>
                                ),
                            },
                        ]}
                    />
                </Card>
            </motion.div>

            {/* ─── 8. Consumer Group Health ───────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ marginBottom: 16 }}>
                <Card
                    size="small"
                    title={<Space><TeamOutlined style={{ color: '#06b6d4' }} /><Text strong>Consumer Group Health</Text></Space>}
                    style={glass}
                >
                    <Row gutter={[12, 12]}>
                        {CONSUMER_HEALTH.map((cg, i) => (
                            <Col xs={12} sm={8} md={4} key={cg.name}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + i * 0.04 }}
                                >
                                    <Card
                                        size="small"
                                        hoverable
                                        onClick={() => setExpandedGroup(expandedGroup === cg.name ? null : cg.name)}
                                        style={{
                                            borderRadius: 10,
                                            borderLeft: `3px solid ${stateColor(cg.state)}`,
                                            cursor: 'pointer',
                                        }}
                                        styles={{ body: { padding: '10px 12px' } }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            <motion.div
                                                animate={{ scale: cg.state === 'rebalancing' ? [1, 1.3, 1] : 1 }}
                                                transition={{ repeat: Infinity, duration: 1.2 }}
                                                style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: stateColor(cg.state),
                                                }}
                                            />
                                            <Text strong style={{ fontSize: 11 }}>{cg.name}</Text>
                                        </div>
                                        <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>
                                            <div>Topics: {cg.topics.length} · Members: {cg.members}</div>
                                            <div style={{ marginTop: 2 }}>
                                                Lag:{' '}
                                                <Text
                                                    strong
                                                    style={{
                                                        color: cg.lag > 5000 ? '#ef4444' : cg.lag > 500 ? '#f59e0b' : '#10b981',
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    {cg.lag.toLocaleString()}
                                                </Text>
                                            </div>
                                        </div>
                                        <Tag
                                            color={cg.state === 'stable' ? 'green' : cg.state === 'rebalancing' ? 'orange' : 'red'}
                                            style={{ fontSize: 9, borderRadius: 8, marginTop: 4 }}
                                        >
                                            {cg.state}
                                        </Tag>
                                        {expandedGroup === cg.name && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                style={{ marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 6 }}
                                            >
                                                <Text style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.4)' : '#aaa' }}>
                                                    Partitions: {cg.assignedPartitions.map(p => `P${p}`).join(', ')}
                                                </Text>
                                                <br />
                                                <Text style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.4)' : '#aaa' }}>
                                                    Topics: {cg.topics.join(', ')}
                                                </Text>
                                            </motion.div>
                                        )}
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>

            {/* ─── 9. Event Processing Pipeline ──────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ marginBottom: 16 }}>
                <Card
                    size="small"
                    title={<Space><SwapOutlined style={{ color: '#10b981' }} /><Text strong>Event Processing Pipeline</Text></Space>}
                    style={glass}
                >
                    <svg width="100%" viewBox="0 0 700 110" style={{ maxHeight: 130 }}>
                        <defs>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* Edge lines with animated dots */}
                        {PIPELINE_EDGES.map(([from, to], ei) => {
                            const a = PIPELINE_NODES[from];
                            const b = PIPELINE_NODES[to];
                            return (
                                <g key={ei}>
                                    <line
                                        x1={a.x + 70} y1={a.y}
                                        x2={b.x - 10} y2={b.y}
                                        stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}
                                        strokeWidth={2}
                                    />
                                    <circle r={3} fill={themeColor} filter="url(#glow)">
                                        <animateMotion
                                            dur={`${1.5 + ei * 0.3}s`}
                                            repeatCount="indefinite"
                                            path={`M${a.x + 70},${a.y} L${b.x - 10},${b.y}`}
                                        />
                                    </circle>
                                    <circle r={2} fill={themeColor} opacity={0.5}>
                                        <animateMotion
                                            dur={`${2.0 + ei * 0.2}s`}
                                            repeatCount="indefinite"
                                            path={`M${a.x + 70},${a.y} L${b.x - 10},${b.y}`}
                                        />
                                    </circle>
                                </g>
                            );
                        })}
                        {/* Nodes */}
                        {PIPELINE_NODES.map((n, i) => (
                            <g key={i}>
                                <rect
                                    x={n.x - 10} y={n.y - 18}
                                    width={130} height={36} rx={10}
                                    fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}
                                    stroke={n.color} strokeWidth={1.5}
                                />
                                <text
                                    x={n.x + 55} y={n.y - 3}
                                    textAnchor="middle"
                                    style={{ fontSize: 10, fontWeight: 700, fill: isDark ? '#fff' : '#333' }}
                                >
                                    {n.label}
                                </text>
                                <text
                                    x={n.x + 55} y={n.y + 11}
                                    textAnchor="middle"
                                    style={{ fontSize: 9, fill: n.color }}
                                >
                                    {n.sub}
                                </text>
                            </g>
                        ))}
                    </svg>
                </Card>
            </motion.div>

            {/* ─── 10. Error & Retry Dashboard ────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                        <Card
                            size="small"
                            title={<Space><AlertOutlined style={{ color: '#ef4444' }} /> Error Rate (24h)</Space>}
                            style={{ ...glass, height: '100%' }}
                        >
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={errorTrend}>
                                    <defs>
                                        <linearGradient id="gErr" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: chartText }} interval={3} />
                                    <YAxis tick={{ fontSize: 9, fill: chartText }} />
                                    <RTooltip contentStyle={ttStyle} />
                                    <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} fill="url(#gErr)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Card
                            size="small"
                            title={<Space><BarChartOutlined style={{ color: '#f59e0b' }} /> Top Error Reasons</Space>}
                            style={{ ...glass, height: '100%' }}
                        >
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={ERROR_REASONS} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 9, fill: chartText }} />
                                    <YAxis dataKey="reason" type="category" tick={{ fontSize: 9, fill: chartText }} width={110} />
                                    <RTooltip contentStyle={ttStyle} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 9, fill: chartText }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                        <Card
                            size="small"
                            title={<Space><CheckCircleOutlined style={{ color: '#10b981' }} /> Retry Success Rate</Space>}
                            style={{ ...glass, height: '100%', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                                <Progress
                                    type="dashboard"
                                    percent={87.5}
                                    size={130}
                                    strokeColor={{ '0%': '#10b981', '100%': '#3b82f6' }}
                                    format={p => (
                                        <>
                                            <Text strong style={{ fontSize: 26, color: '#10b981' }}>{p}%</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 10 }}>success</Text>
                                        </>
                                    )}
                                />
                                <div style={{ marginTop: 12, textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        1,247 retried · 1,091 succeeded
                                    </Text>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── Recent Errors Table ────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <Card
                    size="small"
                    title={<Space><ClockCircleOutlined style={{ color: '#ef4444' }} /><Text strong>Recent Errors</Text></Space>}
                    style={glass}
                >
                    <Table
                        dataSource={RECENT_ERRORS}
                        rowKey="key"
                        size="small"
                        pagination={false}
                        columns={[
                            {
                                title: 'Time', dataIndex: 'ts', width: 80,
                                render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text>,
                            },
                            {
                                title: 'Source', dataIndex: 'source', width: 140,
                                render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
                            },
                            {
                                title: 'Error', dataIndex: 'message', ellipsis: true,
                                render: (v: string) => <Text type="danger" style={{ fontSize: 11 }}>{v}</Text>,
                            },
                            {
                                title: 'Consumer', dataIndex: 'consumer', width: 140,
                                render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>,
                            },
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
