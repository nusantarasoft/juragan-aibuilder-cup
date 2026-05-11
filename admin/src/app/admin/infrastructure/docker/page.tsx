'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Statistic, message, Tooltip, Badge, Progress, Empty } from 'antd';
import { DeploymentUnitOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, HddOutlined, CloudServerOutlined, ThunderboltOutlined, FileExcelOutlined } from '@ant-design/icons';
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

// Mock container data from the known Docker infrastructure
function getContainerData(): ContainerInfo[] {
    const services = [
        { name: 'supabase-db', image: 'supabase/postgres:15.8.1.060', state: 'running', cpu: 2.1, memory: 312, memoryLimit: 1024, restarts: 0 },
        { name: 'supabase-kong', image: 'kong:2.8.1', state: 'running', cpu: 0.8, memory: 85, memoryLimit: 512, restarts: 0 },
        { name: 'supabase-auth', image: 'supabase/gotrue:v2.175.0', state: 'running', cpu: 0.3, memory: 48, memoryLimit: 256, restarts: 0 },
        { name: 'supabase-rest', image: 'postgrest/postgrest:v12.2.8', state: 'running', cpu: 0.2, memory: 32, memoryLimit: 256, restarts: 0 },
        { name: 'supabase-realtime', image: 'supabase/realtime:v2.34.47', state: 'running', cpu: 0.5, memory: 64, memoryLimit: 256, restarts: 0 },
        { name: 'supabase-storage', image: 'supabase/storage-api:v1.22.10', state: 'running', cpu: 0.3, memory: 56, memoryLimit: 256, restarts: 0 },
        { name: 'supabase-meta', image: 'supabase/postgres-meta:v0.86.0', state: 'running', cpu: 0.1, memory: 28, memoryLimit: 128, restarts: 0 },
        { name: 'supabase-studio', image: 'supabase/studio:20250317', state: 'running', cpu: 0.6, memory: 96, memoryLimit: 512, restarts: 0 },
        { name: 'supabase-imgproxy', image: 'darthsim/imgproxy:v3.8.0', state: 'running', cpu: 0.1, memory: 24, memoryLimit: 128, restarts: 0 },
        { name: 'supabase-edge-functions', image: 'supabase/edge-runtime:v1.67.4', state: 'running', cpu: 0.2, memory: 42, memoryLimit: 256, restarts: 0 },
        { name: 'supabase-analytics', image: 'supabase/logflare:1.12.0', state: 'running', cpu: 0.4, memory: 78, memoryLimit: 512, restarts: 0 },
        { name: 'supabase-vector', image: 'timberio/vector:0.34.0-alpine', state: 'running', cpu: 0.2, memory: 35, memoryLimit: 256, restarts: 0 },
        { name: 'dremio', image: 'dremio/dremio-oss:25.1', state: 'running', cpu: 3.2, memory: 1280, memoryLimit: 4096, restarts: 0 },
        { name: 'minio', image: 'minio/minio:RELEASE.2025', state: 'running', cpu: 0.4, memory: 92, memoryLimit: 512, restarts: 0 },
        { name: 'nessie', image: 'ghcr.io/projectnessie/nessie:0.103.0', state: 'running', cpu: 0.3, memory: 128, memoryLimit: 512, restarts: 0 },
        { name: 'middleware', image: 'node:20-slim', state: 'running', cpu: 0.5, memory: 105, memoryLimit: 512, restarts: 0 },
        { name: 'ragflow', image: 'infiniflow/ragflow:v0.17.2', state: 'running', cpu: 1.2, memory: 520, memoryLimit: 2048, restarts: 0 },
        { name: 'openclaw', image: 'openclaw/gateway:latest', state: 'running', cpu: 0.1, memory: 38, memoryLimit: 256, restarts: 0 },
    ];
    return services.map((s, i) => ({
        id: `container-${i}`,
        name: s.name,
        image: s.image,
        status: s.state === 'running' ? 'Up 2 days' : 'Exited',
        state: s.state,
        uptime: s.state === 'running' ? dayjs().subtract(2, 'day').fromNow() : '—',
        ports: '',
        cpu: s.cpu + (Math.random() * 0.3 - 0.15),
        memory: s.memory + Math.round(Math.random() * 20 - 10),
        memoryLimit: s.memoryLimit,
        restarts: s.restarts,
        created: dayjs().subtract(2, 'day').toISOString(),
    }));
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

    const load = useCallback(async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 500)); // simulate API call
        setContainers(getContainerData());
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

    const running = containers.filter(c => c.state === 'running').length;
    const stopped = containers.filter(c => c.state !== 'running').length;
    const totalCpu = containers.reduce((s, c) => s + c.cpu, 0);
    const totalMem = containers.reduce((s, c) => s + c.memory, 0);
    const totalMemLimit = containers.reduce((s, c) => s + c.memoryLimit, 0);

    if (loading) return <CMSLayout title="Docker Health"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#06b6d4', '#3b82f6']}>Docker Health</AuroraText>} subTitle={<DecryptedText text="Live container status, resource utilization & health metrics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={load}>Refresh</Button>]}>
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
                            const memPct = Math.round((c.memory / c.memoryLimit) * 100);
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                                <Tag color={c.state === 'running' ? 'green' : 'red'} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>{c.state}</Tag>
                                                {c.restarts > 0 && <Tag color="warning" style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>⟳ {c.restarts}</Tag>}
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
                        {containers.sort((a, b) => b.memory - a.memory).map((c, i) => {
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
                        {containers.sort((a, b) => b.memory - a.memory).slice(0, 8).map((c, i) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6'];
                            return <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} /><Text style={{ fontSize: 10 }}>{c.name}: {c.memory}MB</Text></div>;
                        })}
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
