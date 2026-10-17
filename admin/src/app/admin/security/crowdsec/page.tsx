'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { SafetyOutlined, StopOutlined, AlertOutlined, CheckCircleOutlined, ReloadOutlined, LinkOutlined, GlobalOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const DECISIONS = [
    { ip: '45.33.32.156', reason: 'crowdsecurity/http-probing', type: 'ban', scope: 'ip', duration: '4h', since: '15m ago', country: 'US' },
    { ip: '185.220.101.34', reason: 'crowdsecurity/ssh-bf', type: 'ban', scope: 'ip', duration: '24h', since: '2h ago', country: 'DE' },
    { ip: '103.152.220.12', reason: 'crowdsecurity/http-crawl-non_statics', type: 'captcha', scope: 'ip', duration: '1h', since: '30m ago', country: 'CN' },
    { ip: '198.51.100.0/24', reason: 'manual-ban', type: 'ban', scope: 'range', duration: 'permanent', since: '7d ago', country: '-' },
];
const BOUNCERS = [
    { name: 'traefik-bouncer', type: 'traefik', lastPull: '30s ago', version: '0.5.1', status: 'active' },
    { name: 'nginx-bouncer', type: 'nginx', lastPull: '45s ago', version: '1.0.3', status: 'active' },
];
const PARSERS = [
    { name: 'syslog-logs', events: 12450, status: 'ok', color: '#10b981' },
    { name: 'nginx-logs', events: 34200, status: 'ok', color: '#3b82f6' },
    { name: 'traefik-logs', events: 8920, status: 'ok', color: '#8b5cf6' },
    { name: 'ssh-logs', events: 1230, status: 'ok', color: '#f59e0b' },
];

export default function CrowdSecPage() {
    const { themeColor } = usePreferencesStore();
    const bans = DECISIONS.filter(d => d.type === 'ban').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b']}>CrowdSec</AuroraText>} subTitle={<DecryptedText text="Threat detection, banned IPs & bouncer status" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:8083', '_blank')}>Open Console</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Bans', v: bans, c: '#ef4444', i: <StopOutlined /> }, { t: 'Decisions', v: DECISIONS.length, c: '#f59e0b', i: <AlertOutlined /> }, { t: 'Bouncers', v: BOUNCERS.length, c: '#10b981', i: <SafetyOutlined /> }, { t: 'Parsed Events', v: PARSERS.reduce((s, p) => s + p.events, 0).toLocaleString(), c: '#3b82f6', i: <GlobalOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><StopOutlined style={{ color: '#ef4444' }} /><Text strong>Active Decisions</Text><Badge count={DECISIONS.length} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                    <Table dataSource={DECISIONS} rowKey="ip" size="small" pagination={false} columns={[
                        { title: 'IP / Range', dataIndex: 'ip', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Country', dataIndex: 'country', width: 60, render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Reason', dataIndex: 'reason', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Type', dataIndex: 'type', width: 80, render: (v: string) => <Tag color={v === 'ban' ? 'red' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Duration', dataIndex: 'duration', width: 80 },
                        { title: 'Since', dataIndex: 'since', width: 80, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                    ]} />
                </Card>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><SafetyOutlined style={{ color: '#10b981' }} /><Text strong>Bouncers</Text></Space>}>
                            {BOUNCERS.map((b, i) => (
                                <motion.div key={b.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 8, borderLeft: '3px solid #10b981' }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{b.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>Type: {b.type} | v{b.version}</Text></div>
                                    <Space><Text type="secondary" style={{ fontSize: 10 }}>Last pull: {b.lastPull}</Text><Tag color="green" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{b.status}</Tag></Space>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><ClockCircleOutlined style={{ color: '#3b82f6' }} /><Text strong>Parser Stats</Text></Space>}>
                            {PARSERS.map((p, i) => (
                                <motion.div key={p.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                                    <Space size={6}><div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} /><Text style={{ fontSize: 12 }}>{p.name}</Text></Space>
                                    <Space><Text strong style={{ fontSize: 12, color: p.color }}>{p.events.toLocaleString()}</Text><Tag color="green" style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{p.status}</Tag></Space>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
