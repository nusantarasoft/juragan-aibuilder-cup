'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Table, Timeline, Modal, Tooltip, message, theme } from 'antd';
import {
    DashboardOutlined, ReloadOutlined, CloudServerOutlined, ThunderboltOutlined,
    HddOutlined, WifiOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
    InfoCircleOutlined, SyncOutlined, DeleteOutlined, FileTextOutlined, ExportOutlined,
    PlayCircleOutlined, ClusterOutlined, AlertOutlined, FieldTimeOutlined,
} from '@ant-design/icons';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

const GET_SYSTEM = `query($tenantId: String!) { systemInfo(tenantId: $tenantId) { hostname cpuCount runningCount containerCount } }`;
const GET_CONTAINERS = `query($tenantId: String!) { dockerContainers(tenantId: $tenantId) { id name status state } }`;

/* ═══ Mock data generators ═══ */
const seed = (i: number) => Math.abs(Math.sin(i * 9301 + 49297) * 233280) % 1;
const genTimeSeries = () => Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`, cpu: 25 + seed(i) * 40, memory: 55 + seed(i + 50) * 25,
    diskIO: 10 + seed(i + 100) * 30, network: 5 + seed(i + 200) * 50,
}));
const genNetworkData = () => Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`, inbound: 120 + seed(i + 300) * 380, outbound: 80 + seed(i + 400) * 260,
}));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const genHeatmap = () => DAYS.map((d, di) => Array.from({ length: 24 }, (_, h) => {
    const v = 20 + seed(di * 24 + h + 500) * 180;
    return { day: d, hour: h, value: Math.round(v) };
})).flat();

const SERVICES = [
    { name: 'Frontend', status: 'healthy', responseTime: 42, uptime: 99.99,
      errorRate: 0.01, lastCheck: '2 min ago', desc: 'Next.js web application serving the admin panel', deps: ['API Gateway'] },
    { name: 'API Gateway', status: 'healthy', responseTime: 18, uptime: 99.98,
      errorRate: 0.05, lastCheck: '1 min ago', desc: 'Traefik reverse proxy handling routing & TLS', deps: ['Middleware', 'Queue'] },
    { name: 'Middleware', status: 'healthy', responseTime: 65, uptime: 99.95,
      errorRate: 0.12, lastCheck: '3 min ago', desc: 'Node.js GraphQL middleware with business logic', deps: ['Database', 'Cache'] },
    { name: 'Database', status: 'healthy', responseTime: 8, uptime: 99.99,
      errorRate: 0.02, lastCheck: '30 sec ago', desc: 'PostgreSQL primary with streaming replication', deps: [] },
    { name: 'Cache (Redis)', status: 'healthy', responseTime: 3, uptime: 100,
      errorRate: 0, lastCheck: '1 min ago', desc: 'Redis in-memory cache for sessions & queries', deps: [] },
    { name: 'Queue (RabbitMQ)', status: 'degraded', responseTime: 245, uptime: 98.7,
      errorRate: 1.3, lastCheck: '5 min ago', desc: 'Message queue handling async job processing', deps: ['Storage', 'Database'] },
    { name: 'Storage (MinIO)', status: 'healthy', responseTime: 95, uptime: 99.9,
      errorRate: 0.08, lastCheck: '2 min ago', desc: 'S3-compatible object storage for files & backups', deps: [] },
];

const ALERTS = [
    { severity: 'critical', description: 'Queue latency exceeded 500ms threshold', service: 'RabbitMQ', time: '12 min ago', resolved: false },
    { severity: 'warning', description: 'Memory usage above 85% on middleware node', service: 'Middleware', time: '28 min ago', resolved: true },
    { severity: 'info', description: 'SSL certificate renewal completed', service: 'API Gateway', time: '1 hour ago', resolved: true },
    { severity: 'warning', description: 'Disk I/O spike detected on database volume', service: 'Database', time: '2 hours ago', resolved: true },
    { severity: 'critical', description: 'Container OOM killed — auto-restarted', service: 'Middleware', time: '3 hours ago', resolved: true },
    { severity: 'info', description: 'Auto-scaling triggered: +1 API Gateway replica', service: 'API Gateway', time: '4 hours ago', resolved: true },
    { severity: 'warning', description: 'Cache hit ratio dropped below 80%', service: 'Redis', time: '5 hours ago', resolved: true },
    { severity: 'info', description: 'Scheduled maintenance completed', service: 'Database', time: '8 hours ago', resolved: true },
    { severity: 'critical', description: 'DNS resolution failure (3 retries)', service: 'Frontend', time: '12 hours ago', resolved: true },
    { severity: 'warning', description: 'High error rate on storage uploads', service: 'MinIO', time: '14 hours ago', resolved: true },
    { severity: 'info', description: 'New deployment rolled out v2.14.3', service: 'Frontend', time: '18 hours ago', resolved: true },
    { severity: 'info', description: 'Log rotation completed across all nodes', service: 'All', time: '1 day ago', resolved: true },
    { severity: 'warning', description: 'Network latency spike to external APIs', service: 'API Gateway', time: '1 day ago', resolved: true },
    { severity: 'critical', description: 'Database replication lag > 10s', service: 'Database', time: '2 days ago', resolved: true },
    { severity: 'info', description: 'Backup completed: 24.3 GB archived', service: 'Storage', time: '2 days ago', resolved: true },
];

const TOPOLOGY_NODES = [
    { id: 'users', label: 'Users', x: 280, y: 10, status: 'healthy', rt: '' },
    { id: 'frontend', label: 'Frontend', x: 280, y: 80, status: 'healthy', rt: '42ms' },
    { id: 'gateway', label: 'API Gateway', x: 280, y: 150, status: 'healthy', rt: '18ms' },
    { id: 'middleware', label: 'Middleware', x: 140, y: 230, status: 'healthy', rt: '65ms' },
    { id: 'database', label: 'Database', x: 60, y: 320, status: 'healthy', rt: '8ms' },
    { id: 'cache', label: 'Cache', x: 220, y: 320, status: 'healthy', rt: '3ms' },
    { id: 'queue', label: 'Queue', x: 380, y: 230, status: 'degraded', rt: '245ms' },
    { id: 'storage', label: 'Storage', x: 380, y: 320, status: 'healthy', rt: '95ms' },
];
const TOPOLOGY_EDGES: [string, string][] = [
    ['users', 'frontend'],
    ['frontend', 'gateway'],
    ['gateway', 'middleware'],
    ['gateway', 'queue'],
    ['middleware', 'database'],
    ['middleware', 'cache'],
    ['queue', 'storage'],
    ['queue', 'database'],
];

/* ═══ SVG Circular Gauge ═══ */
function CircularGauge({ value, max, color, label, unit, trend }: { value: number; max: number; color: string; label: string; unit: string; trend: 'up' | 'down' | 'flat' }) {
    const pct = Math.min((value / max) * 100, 100);
    const r = 38; const circ = 2 * Math.PI * r; const offset = circ - (pct / 100) * circ;
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    const trendColor = trend === 'up' ? '#ef4444' : trend === 'down' ? '#10b981' : '#94a3b8';
    return (
        <div style={{ textAlign: 'center' }}>
            <svg width={90} height={90} viewBox="0 0 90 90">
                <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(150,150,150,0.15)" strokeWidth={7} />
                <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={circ}
                    strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                <text x={45} y={42} textAnchor="middle" fontSize={16} fontWeight={700} fill={color}>{Math.round(value)}</text>
                <text x={45} y={56} textAnchor="middle" fontSize={9} fill="#888">{unit}</text>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{label}</div>
            <span style={{ fontSize: 10, color: trendColor, fontWeight: 600 }}>{trendIcon} {trend}</span>
        </div>
    );
}

/* ═══ Heatmap cell color ═══ */
function heatColor(v: number): string {
    if (v < 60) return '#10b981';
    if (v < 120) return '#f59e0b';
    return '#ef4444';
}

export default function InfrastructureMonitoringPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark ? glassDark : glass;

    const [loading, setLoading] = useState(true);
    const [containers, setContainers] = useState<any[]>([]);
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<string | null>(null);
    const [visibleLines, setVisibleLines] = useState({ cpu: true, memory: true, diskIO: true, network: true });
    const metricsData = useMemo(genTimeSeries, []);
    const networkData = useMemo(genNetworkData, []);
    const heatmapData = useMemo(genHeatmap, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sysRes, cntRes] = await Promise.all([
                gql<any>(GET_SYSTEM, { tenantId: DEFAULT_TENANT_ID }).catch(() => null),
                gql<any>(GET_CONTAINERS, { tenantId: DEFAULT_TENANT_ID }).catch(() => null),
            ]);
            if (sysRes?.systemInfo) setSystemInfo(sysRes.systemInfo);
            if (cntRes?.dockerContainers) setContainers(cntRes.dockerContainers);
        } catch { /* fallback to current state */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    /* ── Computed metrics from live container data ── */
    const runningCount = containers.filter((c: any) => c.state === 'running').length;
    const stoppedCount = containers.filter((c: any) => c.state !== 'running').length;
    const overallStatus = containers.length > 0 && containers.every((c: any) => c.state === 'running')
        ? 'Healthy' : containers.some((c: any) => c.state === 'running') ? 'Degraded' : 'Down';
    const statusColor = overallStatus === 'Healthy'
        ? '#10b981' : overallStatus === 'Degraded' ? '#f59e0b' : '#ef4444';
    const uptimePct = containers.length > 0
        ? ((runningCount / containers.length) * 100).toFixed(1) : '99.9';
    const cpuAvg = containers.length > 0
        ? containers.reduce((s: number, c: any) => s + (c.cpu || 0), 0) / containers.length : 32;
    const memTotal = containers.reduce((s: number, c: any) => s + (c.memory || 0), 0);
    const memLimitTotal = containers.reduce((s: number, c: any) => s + (c.memoryLimit || 1), 0);
    const memAvg = containers.length > 0
        ? (memTotal / Math.max(memLimitTotal, 1)) * 100 : 67;
    const totalCpu = containers.reduce((s: number, c: any) => s + (c.cpu || 0), 0);
    const chartStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const chartText = isDark ? '#999' : '#666';

    if (loading && containers.length === 0) return <CMSLayout title="Infrastructure Monitor"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#06b6d4', '#8b5cf6']}>Infrastructure Monitor</AuroraText>}
            subTitle={<DecryptedText text="Unified infrastructure health, metrics & service topology" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ═══ 1. System Health Banner ═══ */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card size="small" style={{
                        ...glassCard,
                        borderTop: `3px solid ${statusColor}`,
                        background: isDark
                            ? `linear-gradient(135deg, rgba(12,12,30,0.95), ${statusColor}15)`
                            : `linear-gradient(135deg, rgba(255,255,255,0.8), ${statusColor}12)`,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: 14, height: 14, borderRadius: '50%',
                                        background: statusColor,
                                        boxShadow: `0 0 12px ${statusColor}80`,
                                    }} />
                                    <motion.div
                                        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{
                                            position: 'absolute', top: 0, left: 0,
                                            width: 14, height: 14, borderRadius: '50%',
                                            background: statusColor,
                                        }}
                                    />
                                </div>
                                <div>
                                    <Text strong style={{ fontSize: 20, color: statusColor }}>
                                        {overallStatus}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                                        System Status
                                    </Text>
                                </div>
                            </div>
                            <Space size={24} wrap>
                                <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: 22, color: themeColor }}>
                                        {uptimePct}%
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>
                                        Uptime
                                    </Text>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: 14, color: '#10b981' }}>
                                        {runningCount}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>
                                        Running
                                    </Text>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: 14, color: stoppedCount > 0 ? '#ef4444' : '#94a3b8' }}>
                                        {stoppedCount}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>
                                        Stopped
                                    </Text>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: 13 }}>
                                        {totalCpu.toFixed(1)}%
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>
                                        Total CPU
                                    </Text>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: 13 }}>
                                        {(memTotal / 1024).toFixed(1)} GB
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>
                                        Memory Used
                                    </Text>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {dayjs().format('HH:mm:ss')}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>
                                        Last Check
                                    </Text>
                                </div>
                            </Space>
                        </div>
                    </Card>
                </motion.div>

                {/* ═══ 2. Resource Utilization Gauges ═══ */}
                <Row gutter={[12, 12]}>
                    {[
                        { label: 'CPU Usage', value: cpuAvg, max: 100, color: '#3b82f6', unit: '%', trend: 'up' as const },
                        { label: 'Memory Usage', value: memAvg, max: 100, color: '#8b5cf6', unit: '%', trend: 'flat' as const },
                        { label: 'Disk Usage', value: 54, max: 100, color: '#f59e0b', unit: '%', trend: 'up' as const },
                        { label: 'Network I/O', value: 342, max: 1000, color: '#06b6d4', unit: 'MB/s', trend: 'down' as const },
                    ].map((g, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glassCard, textAlign: 'center' }}>
                                    <CircularGauge {...g} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* ═══ 3. Service Topology + Container Grid ═══ */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} lg={12}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <Card size="small" style={glassCard} title={<Space><ClusterOutlined style={{ color: '#8b5cf6' }} /><Text strong>Service Topology</Text></Space>}>
                                <svg width="100%" viewBox="0 0 520 370" style={{ maxHeight: 370 }}>
                                    <defs><linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={themeColor} stopOpacity={0.5} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} /></linearGradient></defs>
                                    {TOPOLOGY_EDGES.map(([from, to], i) => {
                                        const a = TOPOLOGY_NODES.find(n => n.id === from)!;
                                        const b = TOPOLOGY_NODES.find(n => n.id === to)!;
                                        return <line key={i} x1={a.x + 55} y1={a.y + 22} x2={b.x + 55} y2={b.y + 22} stroke="url(#edgeGrad)" strokeWidth={1.5} strokeDasharray="4 3" />;
                                    })}
                                    {TOPOLOGY_NODES.map(n => {
                                        const sc = n.status === 'healthy' ? '#10b981' : n.status === 'degraded' ? '#f59e0b' : '#ef4444';
                                        const sel = selectedNode === n.id;
                                        return (
                                            <g key={n.id} onClick={() => setSelectedNode(sel ? null : n.id)} style={{ cursor: 'pointer' }}>
                                                <rect x={n.x} y={n.y} width={110} height={44} rx={10} fill={isDark ? 'rgba(20,20,40,0.85)' : 'rgba(255,255,255,0.8)'}
                                                    stroke={sel ? themeColor : 'rgba(150,150,150,0.2)'} strokeWidth={sel ? 2 : 1} />
                                                <circle cx={n.x + 14} cy={n.y + 22} r={5} fill={sc} />
                                                <text x={n.x + 24} y={n.y + 19} fontSize={10} fontWeight={600} fill={isDark ? '#e5e7eb' : '#1f2937'}>{n.label}</text>
                                                {n.rt && <text x={n.x + 24} y={n.y + 33} fontSize={9} fill="#888">{n.rt}</text>}
                                            </g>
                                        );
                                    })}
                                </svg>
                                {selectedNode && (() => {
                                    const n = TOPOLOGY_NODES.find(nd => nd.id === selectedNode);
                                    const svc = SERVICES.find(s =>
                                        s.name.toLowerCase().includes(selectedNode)
                                    );
                                    if (!n) return null;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                marginTop: 8, padding: 10, borderRadius: 10,
                                                background: isDark
                                                    ? 'rgba(255,255,255,0.04)'
                                                    : 'rgba(0,0,0,0.02)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: n.status === 'healthy' ? '#10b981' : '#f59e0b',
                                                }} />
                                                <Text strong style={{ fontSize: 12 }}>{n.label}</Text>
                                                <Tag color={svc?.status === 'healthy' ? 'green' : 'orange'}
                                                    style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>
                                                    {svc?.status ?? n.status}
                                                </Tag>
                                            </div>
                                            {svc && (
                                                <>
                                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
                                                        {svc.desc}
                                                    </Text>
                                                    <Space size={12} wrap>
                                                        <Text style={{ fontSize: 10 }}>
                                                            <Text type="secondary" style={{ fontSize: 10 }}>Response: </Text>
                                                            <Text strong style={{
                                                                fontSize: 10,
                                                                color: svc.responseTime < 100 ? '#10b981' : svc.responseTime < 500 ? '#f59e0b' : '#ef4444',
                                                            }}>{svc.responseTime}ms</Text>
                                                        </Text>
                                                        <Text style={{ fontSize: 10 }}>
                                                            <Text type="secondary" style={{ fontSize: 10 }}>Uptime: </Text>
                                                            <Text strong style={{ fontSize: 10 }}>{svc.uptime}%</Text>
                                                        </Text>
                                                        <Text style={{ fontSize: 10 }}>
                                                            <Text type="secondary" style={{ fontSize: 10 }}>Errors: </Text>
                                                            <Text strong style={{ fontSize: 10, color: svc.errorRate > 1 ? '#ef4444' : '#10b981' }}>{svc.errorRate}%</Text>
                                                        </Text>
                                                    </Space>
                                                    {svc.deps.length > 0 && (
                                                        <div style={{ marginTop: 4 }}>
                                                            <Text type="secondary" style={{ fontSize: 9 }}>Dependencies: </Text>
                                                            {svc.deps.map(d => (
                                                                <Tag key={d} style={{ fontSize: 8, borderRadius: 4, margin: '0 2px' }}>{d}</Tag>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </motion.div>
                                    );
                                })()}
                            </Card>
                        </motion.div>
                    </Col>
                    {/* ═══ 4. Container Status Grid ═══ */}
                    <Col xs={24} lg={12}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card size="small" style={glassCard} title={<Space><CloudServerOutlined style={{ color: '#3b82f6' }} /><Text strong>Container Status</Text><Tag style={{ borderRadius: 8 }}>{containers.length}</Tag></Space>}>
                                <div style={{ maxHeight: 370, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                                    {containers.map((c: any, i: number) => {
                                        const sc = c.state === 'running'
                                            ? '#10b981'
                                            : c.state === 'restarting' ? '#f59e0b' : '#ef4444';
                                        const memPct = c.memoryLimit > 0
                                            ? Math.round((c.memory / c.memoryLimit) * 100) : 0;
                                        const memColor = memPct > 80
                                            ? '#ef4444' : memPct > 60 ? '#f59e0b' : '#10b981';
                                        return (
                                            <motion.div
                                                key={c.id || i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.02 }}
                                                style={{
                                                    padding: 10, borderRadius: 10,
                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                                    borderLeft: `3px solid ${sc}`,
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex', alignItems: 'center',
                                                    gap: 6, marginBottom: 4,
                                                }}>
                                                    <div style={{
                                                        width: 7, height: 7, borderRadius: '50%',
                                                        background: sc,
                                                        boxShadow: `0 0 6px ${sc}60`,
                                                    }} />
                                                    <Text strong style={{ fontSize: 10 }}>
                                                        {c.name}
                                                    </Text>
                                                </div>
                                                <div style={{ fontSize: 9, color: '#888', marginBottom: 2 }}>
                                                    CPU: {(c.cpu || 0).toFixed(1)}% · Mem: {memPct}%
                                                </div>
                                                {c.uptime && (
                                                    <div style={{ fontSize: 8, color: '#888', marginBottom: 3 }}>
                                                        Uptime: {c.uptime}
                                                    </div>
                                                )}
                                                <div style={{
                                                    height: 4, borderRadius: 2,
                                                    background: 'rgba(150,150,150,0.15)',
                                                    overflow: 'hidden', marginBottom: 4,
                                                }}>
                                                    <div style={{
                                                        height: '100%', width: `${memPct}%`,
                                                        background: memColor,
                                                        transition: 'width 0.5s',
                                                    }} />
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                }}>
                                                    <Tag
                                                        color={c.state === 'running' ? 'green' : c.state === 'restarting' ? 'orange' : 'red'}
                                                        style={{ fontSize: 8, borderRadius: 6, margin: 0 }}
                                                    >
                                                        {c.state}
                                                    </Tag>
                                                    <Tooltip title="Restart container">
                                                        <Button
                                                            type="text" size="small"
                                                            icon={<SyncOutlined style={{ fontSize: 10 }} />}
                                                            onClick={() => message.info(`Restarting ${c.name}…`)}
                                                        />
                                                    </Tooltip>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {containers.length === 0 && (
                                        <Text type="secondary" style={{
                                            fontSize: 11, gridColumn: '1 / -1',
                                            textAlign: 'center', padding: 24,
                                        }}>
                                            No containers found — Docker API not available
                                        </Text>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* ═══ 5. Response Time Heatmap ═══ */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card size="small" style={glassCard} title={<Space><FieldTimeOutlined style={{ color: '#f59e0b' }} /><Text strong>Response Time Heatmap</Text><Text type="secondary" style={{ fontSize: 10 }}>24h × 7 days</Text></Space>}>
                        <div style={{ overflowX: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 2, minWidth: 600 }}>
                                <div />
                                {Array.from({ length: 24 }, (_, h) => <Text key={h} type="secondary" style={{ fontSize: 8, textAlign: 'center' }}>{h}</Text>)}
                                {DAYS.map(day => (
                                    <React.Fragment key={day}>
                                        <Text type="secondary" style={{ fontSize: 9, lineHeight: '18px' }}>{day}</Text>
                                        {Array.from({ length: 24 }, (_, h) => {
                                            const cell = heatmapData.find(c => c.day === day && c.hour === h);
                                            const v = cell?.value ?? 50;
                                            return (
                                                <Tooltip key={h} title={`${day} ${String(h).padStart(2, '0')}:00 — ${v}ms`}>
                                                    <div style={{ height: 18, borderRadius: 3, background: heatColor(v), opacity: 0.3 + (v / 200) * 0.7, cursor: 'pointer' }} />
                                                </Tooltip>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 6, justifyContent: 'center' }}>
                                {[{ c: '#10b981', l: '<60ms' }, { c: '#f59e0b', l: '60-120ms' }, { c: '#ef4444', l: '>120ms' }].map(lg => (
                                    <div key={lg.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: lg.c }} /><Text type="secondary" style={{ fontSize: 9 }}>{lg.l}</Text></div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* ═══ 6. Metrics Trends + 9. Network Traffic ═══ */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} lg={14}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card size="small" style={glassCard} title={<Space><DashboardOutlined style={{ color: '#3b82f6' }} /><Text strong>Metrics Trends</Text><Text type="secondary" style={{ fontSize: 10 }}>24h</Text></Space>}
                                extra={<Space size={4}>{[{ k: 'cpu', c: '#3b82f6', l: 'CPU' }, { k: 'memory', c: '#8b5cf6', l: 'Mem' }, { k: 'diskIO', c: '#f59e0b', l: 'Disk' }, { k: 'network', c: '#06b6d4', l: 'Net' }].map(ln => (
                                    <Tag key={ln.k} style={{ cursor: 'pointer', fontSize: 9, borderRadius: 6, opacity: visibleLines[ln.k as keyof typeof visibleLines] ? 1 : 0.35, borderColor: ln.c, color: ln.c }}
                                        onClick={() => setVisibleLines(v => ({ ...v, [ln.k]: !v[ln.k as keyof typeof v] }))}>{ln.l}</Tag>
                                ))}</Space>}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={metricsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={chartStroke} />
                                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: chartText }} interval={3} />
                                        <YAxis tick={{ fontSize: 9, fill: chartText }} />
                                        <RTooltip contentStyle={{ background: isDark ? '#1a1a2e' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }} />
                                        {visibleLines.cpu && <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPU %" />}
                                        {visibleLines.memory && <Line type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Memory %" />}
                                        {visibleLines.diskIO && <Line type="monotone" dataKey="diskIO" stroke="#f59e0b" strokeWidth={2} dot={false} name="Disk I/O" />}
                                        {visibleLines.network && <Line type="monotone" dataKey="network" stroke="#06b6d4" strokeWidth={2} dot={false} name="Network" />}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        </motion.div>
                    </Col>
                    <Col xs={24} lg={10}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                            <Card size="small" style={glassCard} title={<Space><WifiOutlined style={{ color: '#06b6d4' }} /><Text strong>Network Traffic</Text></Space>}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={networkData}>
                                        <defs>
                                            <linearGradient id="inG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient>
                                            <linearGradient id="outG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={chartStroke} />
                                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: chartText }} interval={3} />
                                        <YAxis tick={{ fontSize: 9, fill: chartText }} />
                                        <RTooltip contentStyle={{ background: isDark ? '#1a1a2e' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }} />
                                        <Area type="monotone" dataKey="inbound" stroke="#3b82f6" fill="url(#inG)" strokeWidth={2} name="Inbound (MB/s)" />
                                        <Area type="monotone" dataKey="outbound" stroke="#8b5cf6" fill="url(#outG)" strokeWidth={2} name="Outbound (MB/s)" />
                                        <Legend wrapperStyle={{ fontSize: 10 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* ═══ 7. Alert History + 8. Service Health ═══ */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} lg={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card size="small" style={{ ...glassCard, maxHeight: 420, overflowY: 'auto' }} title={<Space><AlertOutlined style={{ color: '#ef4444' }} /><Text strong>Alert History</Text><Tag color="red" style={{ borderRadius: 8 }}>{ALERTS.filter(a => !a.resolved).length} active</Tag></Space>}>
                                <Timeline items={ALERTS.map(a => ({
                                    color: a.severity === 'critical' ? 'red' : a.severity === 'warning' ? '#f59e0b' : 'blue',
                                    dot: a.severity === 'critical' ? <CloseCircleOutlined style={{ color: '#ef4444' }} /> : a.severity === 'warning' ? <WarningOutlined style={{ color: '#f59e0b' }} /> : <InfoCircleOutlined style={{ color: '#3b82f6' }} />,
                                    children: (
                                        <div>
                                            <Text strong style={{ fontSize: 11 }}>{a.description}</Text><br />
                                            <Text type="secondary" style={{ fontSize: 10 }}>{a.service} · {a.time}</Text>{' '}
                                            <Tag color={a.resolved ? 'green' : 'red'} style={{ fontSize: 8, borderRadius: 6, margin: 0 }}>{a.resolved ? 'Resolved' : 'Active'}</Tag>
                                        </div>
                                    ),
                                }))} />
                            </Card>
                        </motion.div>
                    </Col>
                    <Col xs={24} lg={16}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                            <Card size="small" style={glassCard} title={<Space><CheckCircleOutlined style={{ color: '#10b981' }} /><Text strong>Service Health</Text></Space>}>
                                <Table dataSource={SERVICES} rowKey="name" size="small" pagination={false}
                                    columns={[
                                        { title: 'Service', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, sorter: (a: any, b: any) => a.status.localeCompare(b.status),
                                            render: (v: string) => <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                                                    style={{ width: 8, height: 8, borderRadius: '50%', background: v === 'healthy' ? '#10b981' : v === 'degraded' ? '#f59e0b' : '#ef4444' }} />
                                                <Text style={{ fontSize: 11 }}>{v}</Text></div> },
                                        { title: 'Response', dataIndex: 'responseTime', key: 'rt', width: 90, sorter: (a: any, b: any) => a.responseTime - b.responseTime,
                                            render: (v: number) => <Text style={{ fontSize: 11, color: v < 100 ? '#10b981' : v < 500 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{v}ms</Text> },
                                        { title: 'Uptime', dataIndex: 'uptime', key: 'up', width: 80, sorter: (a: any, b: any) => a.uptime - b.uptime,
                                            render: (v: number) => <Text style={{ fontSize: 11 }}>{v}%</Text> },
                                        { title: 'Errors', dataIndex: 'errorRate', key: 'err', width: 75, sorter: (a: any, b: any) => a.errorRate - b.errorRate,
                                            render: (v: number) => <Tag color={v > 1 ? 'red' : v > 0.5 ? 'orange' : 'green'} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{v}%</Tag> },
                                        { title: 'Last Check', dataIndex: 'lastCheck', key: 'lc', width: 90,
                                            render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                                    ]}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* ═══ 10. Quick Actions ═══ */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card size="small" style={glassCard}
                        title={
                            <Space>
                                <ThunderboltOutlined style={{ color: '#f59e0b' }} />
                                <Text strong>Quick Actions</Text>
                            </Space>
                        }
                    >
                        <Row gutter={[10, 10]}>
                            {[
                                {
                                    label: 'Restart All Services',
                                    icon: <SyncOutlined />,
                                    color: '#ef4444',
                                    desc: 'Rolling restart of all containers',
                                    destructive: true,
                                },
                                {
                                    label: 'Run Health Check',
                                    icon: <CheckCircleOutlined />,
                                    color: '#10b981',
                                    desc: 'Trigger a full health check',
                                },
                                {
                                    label: 'Clear Caches',
                                    icon: <DeleteOutlined />,
                                    color: '#f59e0b',
                                    desc: 'Flush Redis & CDN caches',
                                    destructive: true,
                                },
                                {
                                    label: 'View Logs',
                                    icon: <FileTextOutlined />,
                                    color: '#3b82f6',
                                    desc: 'Open centralized log viewer',
                                },
                                {
                                    label: 'Export Report',
                                    icon: <ExportOutlined />,
                                    color: '#8b5cf6',
                                    desc: 'Download infrastructure report',
                                },
                            ].map((a, i) => (
                                <Col key={i} xs={12} sm={8} md={4} lg={4} xl={4}
                                    style={{ flex: '1 1 0' }}>
                                    <Button
                                        block
                                        style={{
                                            height: 'auto', padding: '12px 8px',
                                            borderRadius: 10, borderColor: `${a.color}44`,
                                            textAlign: 'center', whiteSpace: 'normal',
                                        }}
                                        onClick={() => a.destructive
                                            ? setConfirmAction(a.label)
                                            : message.info(`${a.label}…`)
                                        }
                                    >
                                        <div style={{ color: a.color, fontSize: 18, marginBottom: 4 }}>
                                            {a.icon}
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 600 }}>
                                            {a.label}
                                        </div>
                                        <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
                                            {a.desc}
                                        </div>
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

                {/* ═══ Resource Summary Footer ═══ */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                    <Card size="small" style={glassCard}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-around',
                            flexWrap: 'wrap', gap: 12, textAlign: 'center',
                        }}>
                            {[
                                { label: 'Active Services', value: `${SERVICES.filter(s => s.status === 'healthy').length}/${SERVICES.length}`, color: '#10b981' },
                                { label: 'Avg Response Time', value: `${Math.round(SERVICES.reduce((s, sv) => s + sv.responseTime, 0) / SERVICES.length)}ms`, color: '#3b82f6' },
                                { label: 'Active Alerts', value: String(ALERTS.filter(a => !a.resolved).length), color: '#ef4444' },
                                { label: 'Containers Running', value: `${runningCount}/${containers.length || '—'}`, color: '#8b5cf6' },
                                { label: 'System Uptime', value: `${uptimePct}%`, color: themeColor },
                                { label: 'Memory Utilization', value: `${memAvg.toFixed(1)}%`, color: '#f59e0b' },
                            ].map(stat => (
                                <div key={stat.label} style={{ minWidth: 100 }}>
                                    <Text strong style={{ fontSize: 16, color: stat.color, display: 'block' }}>
                                        {stat.value}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                        {stat.label}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>

            </motion.div>
            <Modal title="Confirm Action" open={!!confirmAction} onOk={() => { message.success(`${confirmAction} initiated`); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} okText="Confirm" okButtonProps={{ danger: true }}>
                <Text>Are you sure you want to <Text strong>{confirmAction}</Text>? This is a destructive action and cannot be undone.</Text>
            </Modal>
        </CMSLayout>
    );
}
