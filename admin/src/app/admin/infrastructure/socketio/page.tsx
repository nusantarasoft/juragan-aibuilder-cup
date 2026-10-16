'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { WifiOutlined, TeamOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, ThunderboltOutlined, CloudServerOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const NAMESPACES = [
    { name: '/', connections: 12, rooms: 5, events: 4520, color: '#3b82f6' },
    { name: '/admin', connections: 3, rooms: 2, events: 890, color: '#8b5cf6' },
    { name: '/notifications', connections: 8, rooms: 3, events: 2340, color: '#10b981' },
];
const CLIENTS = [
    { id: 'abc123', namespace: '/', transport: 'websocket', ip: '192.168.1.10', connected: '2h ago', events: 234 },
    { id: 'def456', namespace: '/', transport: 'websocket', ip: '192.168.1.25', connected: '1h ago', events: 156 },
    { id: 'ghi789', namespace: '/admin', transport: 'polling', ip: '192.168.1.30', connected: '30m ago', events: 45 },
    { id: 'jkl012', namespace: '/notifications', transport: 'websocket', ip: '192.168.1.15', connected: '15m ago', events: 89 },
];
const ROOMS = [
    { name: 'dashboard-updates', namespace: '/', members: 8 },
    { name: 'inventory-sync', namespace: '/', members: 4 },
    { name: 'admin-alerts', namespace: '/admin', members: 3 },
    { name: 'push-channel', namespace: '/notifications', members: 8 },
];

export default function SocketIOPage() {
    const { themeColor } = usePreferencesStore();
    const totalConn = NAMESPACES.reduce((s, n) => s + n.connections, 0);
    const totalEvents = NAMESPACES.reduce((s, n) => s + n.events, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#010101', '#10b981']}>Socket.IO</AuroraText>} subTitle={<DecryptedText text="Realtime communication — clients, rooms & events" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:8088', '_blank')}>Open Admin UI</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Namespaces', v: NAMESPACES.length, c: '#3b82f6', i: <NodeIndexOutlined /> }, { t: 'Connections', v: totalConn, c: '#10b981', i: <WifiOutlined /> }, { t: 'Rooms', v: ROOMS.length, c: '#8b5cf6', i: <TeamOutlined /> }, { t: 'Events (1h)', v: totalEvents.toLocaleString(), c: '#f59e0b', i: <ThunderboltOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><NodeIndexOutlined style={{ color: '#3b82f6' }} /><Text strong>Namespaces</Text></Space>}>
                            {NAMESPACES.map((n, i) => (
                                <motion.div key={n.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: `3px solid ${n.color}` }}>
                                    <div><Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{n.name}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{n.rooms} rooms · {n.events} events</Text></div>
                                    <Badge count={n.connections} style={{ backgroundColor: n.color }} />
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><WifiOutlined style={{ color: '#10b981' }} /><Text strong>Connected Clients</Text><Badge count={CLIENTS.length} style={{ backgroundColor: '#10b981' }} /></Space>}>
                            <Table dataSource={CLIENTS} rowKey="id" size="small" pagination={false} columns={[
                                { title: 'Socket ID', dataIndex: 'id', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Namespace', dataIndex: 'namespace', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Transport', dataIndex: 'transport', render: (v: string) => <Tag color={v === 'websocket' ? 'green' : 'orange'} style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'IP', dataIndex: 'ip', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Events', dataIndex: 'events', width: 60, render: (v: number) => <Text strong style={{ color: '#3b82f6' }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><TeamOutlined style={{ color: '#8b5cf6' }} /><Text strong>Rooms</Text></Space>}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ROOMS.map((r, i) => (
                            <motion.div key={r.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.04 }}>
                                <Tag style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10, background: `${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i % 4]}15`, border: `1px solid ${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i % 4]}40` }}>{r.name} <Badge count={r.members} size="small" style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i % 4], marginLeft: 6 }} /></Tag>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
