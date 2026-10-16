'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Input } from 'antd';
import { FileSearchOutlined, DatabaseOutlined, ReloadOutlined, LinkOutlined, ClockCircleOutlined, CloudServerOutlined, AlertOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const STREAMS = [
    { job: 'admin', container: 'admin', lines: 12450, rate: '23/s', level: 'info', color: '#3b82f6' },
    { job: 'middleware', container: 'middleware', lines: 8920, rate: '15/s', level: 'info', color: '#8b5cf6' },
    { job: 'supabase-auth', container: 'supabase-auth', lines: 5670, rate: '8/s', level: 'warn', color: '#f59e0b' },
    { job: 'supabase-kong', container: 'supabase-kong', lines: 34200, rate: '45/s', level: 'info', color: '#06b6d4' },
    { job: 'postgres', container: 'postgres', lines: 2340, rate: '3/s', level: 'info', color: '#10b981' },
    { job: 'landing-page', container: 'landing-page', lines: 1890, rate: '2/s', level: 'info', color: '#ec4899' },
];

const RECENT_LOGS = [
    { ts: '12:41:23', level: 'INFO', job: 'middleware', msg: 'GraphQL query dockerContainers completed in 45ms' },
    { ts: '12:41:22', level: 'WARN', job: 'supabase-auth', msg: 'Rate limit approaching for IP 192.168.1.15 (45/50 requests)' },
    { ts: '12:41:20', level: 'INFO', job: 'kong', msg: 'POST /rest/v1/rpc/get_media 200 12ms' },
    { ts: '12:41:18', level: 'ERROR', job: 'middleware', msg: 'Dremio connection timeout after 5000ms — retrying...' },
    { ts: '12:41:15', level: 'INFO', job: 'postgres', msg: 'checkpoint complete: wrote 234 buffers (1.4%)' },
    { ts: '12:41:12', level: 'INFO', job: 'admin', msg: 'Compiled /admin/dashboard in 234ms' },
    { ts: '12:41:10', level: 'DEBUG', job: 'kong', msg: 'Upstream healthcheck ok: middleware:4001' },
    { ts: '12:41:08', level: 'WARN', job: 'storage', msg: 'Large file upload: 48MB to bucket documents' },
];

const LEVEL_COLOR: Record<string, string> = { INFO: '#10b981', WARN: '#f59e0b', ERROR: '#ef4444', DEBUG: '#6b7280' };

export default function LoggingPage() {
    const { themeColor } = usePreferencesStore();
    const [query, setQuery] = useState('');
    const totalLines = STREAMS.reduce((s, st) => s + st.lines, 0);
    const errors = RECENT_LOGS.filter(l => l.level === 'ERROR').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f3b61f', '#10b981']}>Log Explorer</AuroraText>} subTitle={<DecryptedText text="Loki log streams, search & live tail" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:3004/explore', '_blank')}>Open in Grafana</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Log Streams', v: STREAMS.length, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Total Lines (1h)', v: totalLines.toLocaleString(), c: '#8b5cf6', i: <DatabaseOutlined /> }, { t: 'Errors', v: errors, c: errors > 0 ? '#ef4444' : '#10b981', i: <AlertOutlined /> }, { t: 'Retention', v: '30 days', c: '#06b6d4', i: <ClockCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><CloudServerOutlined style={{ color: '#3b82f6' }} /><Text strong>Log Streams</Text></Space>}>
                    <Row gutter={[10, 10]}>
                        {STREAMS.map((s, i) => (
                            <Col key={s.job} xs={12} sm={8} md={4}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${s.color}`, borderRadius: 10, textAlign: 'center' }}>
                                        <Text strong style={{ fontSize: 12 }}>{s.container}</Text><br />
                                        <Text style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{(s.lines / 1000).toFixed(1)}k</Text><br />
                                        <Tag style={{ fontSize: 9, borderRadius: 8, margin: '4px 0 0' }}>{s.rate}</Tag>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><FileSearchOutlined style={{ color: themeColor }} /><Text strong>Recent Logs</Text><Badge count={RECENT_LOGS.length} style={{ backgroundColor: themeColor }} /></Space>} extra={<Input.Search placeholder="Search logs..." style={{ width: 260 }} value={query} onChange={e => setQuery(e.target.value)} size="small" />}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.7, background: '#0d1117', color: '#c9d1d9', padding: 14, borderRadius: 8, maxHeight: 400, overflow: 'auto' }}>
                        {RECENT_LOGS.filter(l => !query || l.msg.toLowerCase().includes(query.toLowerCase()) || l.job.toLowerCase().includes(query.toLowerCase())).map((l, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.03 }} style={{ borderBottom: '1px solid #21262d', padding: '3px 0' }}>
                                <span style={{ color: '#8b949e' }}>{l.ts} </span>
                                <span style={{ color: LEVEL_COLOR[l.level], fontWeight: 600 }}>[{l.level}] </span>
                                <span style={{ color: '#79c0ff' }}>{l.job}: </span>
                                <span>{l.msg}</span>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
