'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Statistic, message, Tooltip, Badge, Progress, Drawer, Switch } from 'antd';
import { DeploymentUnitOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, HddOutlined, CloudServerOutlined, ThunderboltOutlined, PlayCircleOutlined, PauseCircleOutlined, FileTextOutlined, SyncOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ContainerInfo {
    id: string; name: string; image: string; status: string; state: string;
    uptime: string; ports: string; cpu: number; memory: number; memoryLimit: number;
    restarts: number; created: string;
}

const GRAPHQL_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL || 'http://localhost:4001/graphql';

async function gql<T>(query: string, variables?: any): Promise<T> {
    try {
        const res = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message);
        return json.data;
    } catch {
        return null as any;
    }
}

function MemoryBar({ used, limit }: { used: number; limit: number }) {
    const pct = Math.round((used / limit) * 100);
    const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';
    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <Text type="secondary">{used}MB / {limit}MB</Text>
                <Text style={{ color, fontWeight: 600, fontSize: 10 }}>{pct}%</Text>
            </div>
            <Progress percent={pct} showInfo={false} strokeColor={color} size="small" style={{ margin: 0 }} />
        </div>
    );
}

export default function DockerHealthPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [containers, setContainers] = useState<ContainerInfo[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [logDrawer, setLogDrawer] = useState(false);
    const [logTarget, setLogTarget] = useState<ContainerInfo | null>(null);
    const [logLines, setLogLines] = useState<string[]>([]);
    const [logLoading, setLogLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const data: any = await gql(`query { dockerContainers { id name image status state uptime ports cpu memory memoryLimit restarts created } }`);
        if (data?.dockerContainers) {
            setContainers(data.dockerContainers);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh every 30s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, load]);

    const handleRestart = async (c: ContainerInfo) => {
        message.loading({ content: `Restarting ${c.name}...`, key: 'restart' });
        const data: any = await gql(`mutation($id: String!) { dockerRestartContainer(containerId: $id) { success } }`, { id: c.id });
        if (data?.dockerRestartContainer?.success) {
            message.success({ content: `${c.name} restarted`, key: 'restart' });
            setTimeout(load, 2000);
        } else {
            message.error({ content: `Failed to restart ${c.name}`, key: 'restart' });
        }
    };

    const handleViewLogs = async (c: ContainerInfo) => {
        setLogTarget(c);
        setLogDrawer(true);
        setLogLoading(true);
        const data: any = await gql(`query($id: String!) { dockerContainerLogs(containerId: $id, tail: 200) { timestamp message } }`, { id: c.id });
        if (data?.dockerContainerLogs) {
            setLogLines(data.dockerContainerLogs.map((l: any) => `[${l.timestamp}] ${l.message}`));
        } else {
            setLogLines(['Docker API not available — log streaming requires Docker Engine API access']);
        }
        setLogLoading(false);
    };

    const running = containers.filter(c => c.state === 'running').length;
    const stopped = containers.filter(c => c.state !== 'running').length;
    const totalCpu = containers.reduce((s, c) => s + c.cpu, 0);
    const totalMem = containers.reduce((s, c) => s + c.memory, 0);
    const totalMemLimit = containers.reduce((s, c) => s + c.memoryLimit, 0);

    if (loading && containers.length === 0) return <CMSLayout title="Docker Health"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#06b6d4', '#3b82f6']}>Docker Health</AuroraText>} subTitle={<DecryptedText text="Live container status, resource utilization & health metrics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Space key="controls" size={8}>
                <Tooltip title="Auto-refresh (30s)"><Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} checkedChildren={<SyncOutlined spin />} unCheckedChildren="Auto" /></Tooltip>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
            </Space>
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[
                        { t: 'Total Containers', v: containers.length, c: '#3b82f6', i: <DeploymentUnitOutlined /> },
                        { t: 'Running', v: running, c: '#10b981', i: <CheckCircleOutlined /> },
                        { t: 'Stopped', v: stopped, c: stopped > 0 ? '#ef4444' : '#94a3b8', i: <CloseCircleOutlined /> },
                        { t: 'CPU Usage', v: `${totalCpu.toFixed(1)}%`, c: '#f59e0b', i: <ThunderboltOutlined /> },
                        { t: 'Memory Used', v: `${(totalMem / 1024).toFixed(1)} GB`, c: '#8b5cf6', i: <HddOutlined /> },
                        { t: 'Memory Limit', v: `${(totalMemLimit / 1024).toFixed(1)} GB`, c: '#06b6d4', i: <CloudServerOutlined /> },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card title={<><DeploymentUnitOutlined style={{ color: themeColor }} /> <Text strong>Container Health</Text> <Badge count={containers.length} style={{ backgroundColor: themeColor }} /></>} style={glass} size="small">
                    <Row gutter={[10, 10]}>
                        {containers.map((c, i) => {
                            const stateColor = c.state === 'running' ? '#10b981' : '#ef4444';
                            return (
                                <Col key={c.id} xs={24} sm={12} md={8} lg={6}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                        <Card size="small" hoverable style={{ borderLeft: `3px solid ${stateColor}`, borderRadius: 10, height: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor, boxShadow: `0 0 6px ${stateColor}60` }} />
                                                <Text strong style={{ fontSize: 12 }}>{c.name}</Text>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 6, fontFamily: 'monospace' }}>{c.image.split(':')[0].split('/').pop()}:{c.image.split(':')[1]?.slice(0, 12)}</Text>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                                                <Text type="secondary">CPU:</Text>
                                                <Text style={{ fontWeight: 600, color: c.cpu > 2 ? '#f59e0b' : '#10b981', fontSize: 10 }}>{c.cpu.toFixed(1)}%</Text>
                                            </div>
                                            <MemoryBar used={c.memory} limit={c.memoryLimit} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                                <Tag color={c.state === 'running' ? 'green' : 'red'} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{c.state}</Tag>
                                                <Space size={2}>
                                                    <Tooltip title="View Logs"><Button type="text" size="small" icon={<FileTextOutlined style={{ fontSize: 11 }} />} onClick={() => handleViewLogs(c)} /></Tooltip>
                                                    <RbacGuard requiredRole="admin"><Tooltip title="Restart"><Button type="text" size="small" icon={<SyncOutlined style={{ fontSize: 11 }} />} onClick={() => handleRestart(c)} /></Tooltip></RbacGuard>
                                                </Space>
                                            </div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            );
                        })}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<><HddOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Cluster Memory Overview</Text></>}>
                    <div style={{ display: 'flex', height: 28, borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.04)' }}>
                        {[...containers].sort((a, b) => b.memory - a.memory).map((c, i) => {
                            const pct = (c.memory / totalMem) * 100;
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#ef4444', '#6366f1', '#84cc16', '#a855f7', '#0ea5e9', '#d946ef', '#f43f5e', '#22d3ee', '#fb923c', '#4ade80'];
                            return (
                                <Tooltip key={c.id} title={`${c.name}: ${c.memory}MB (${pct.toFixed(1)}%)`}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.5 + i * 0.03, duration: 0.4 }} style={{ height: '100%', background: colors[i % colors.length], minWidth: pct > 1.5 ? 3 : 1 }} />
                                </Tooltip>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {[...containers].sort((a, b) => b.memory - a.memory).slice(0, 8).map((c, i) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6'];
                            return <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} /><Text style={{ fontSize: 10 }}>{c.name}: {c.memory}MB</Text></div>;
                        })}
                    </div>
                </Card>
            </motion.div>

            {/* Log Drawer */}
            <Drawer title={`Container Logs — ${logTarget?.name || ''}`} open={logDrawer} onClose={() => setLogDrawer(false)} width={700} extra={<Button size="small" onClick={() => logTarget && handleViewLogs(logTarget)} icon={<ReloadOutlined />}>Refresh</Button>}>
                {logLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
                    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11, lineHeight: 1.7, background: '#0d1117', color: '#c9d1d9', padding: 16, borderRadius: 8, maxHeight: 'calc(100vh - 180px)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {logLines.length === 0 ? <Text style={{ color: '#8b949e' }}>No logs available</Text> : logLines.map((line, i) => (
                            <div key={i} style={{ borderBottom: '1px solid #21262d', padding: '2px 0' }}>
                                <span style={{ color: '#8b949e' }}>{i + 1} </span>
                                {line}
                            </div>
                        ))}
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
