'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { VideoCameraOutlined, TeamOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ROOMS = [
    { name: 'standup-daily', participants: 8, duration: '25m', status: 'active', created: '10:00', codec: 'VP9' },
    { name: 'sprint-review', participants: 12, duration: '1h 15m', status: 'active', created: '09:30', codec: 'VP8' },
    { name: 'client-meeting', participants: 0, duration: '-', status: 'ended', created: '08:00', codec: '-' },
    { name: 'training-session', participants: 5, duration: '45m', status: 'active', created: '11:00', codec: 'VP9' },
];
const STATS = { totalMeetings: 234, totalParticipants: 1890, avgDuration: '38m', peakConcurrent: 45 };

export default function JitsiPage() {
    const { themeColor } = usePreferencesStore();
    const activeRooms = ROOMS.filter(r => r.status === 'active').length;
    const totalParticipants = ROOMS.reduce((s, r) => s + r.participants, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#oebb00', '#3b82f6']}>Jitsi Meet</AuroraText>} subTitle={<DecryptedText text="Video conferencing, active rooms & participant stats" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('https://localhost:8443', '_blank')}>Open Jitsi</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Rooms', v: activeRooms, c: '#10b981', i: <VideoCameraOutlined /> }, { t: 'Participants Now', v: totalParticipants, c: '#3b82f6', i: <TeamOutlined /> }, { t: 'Meetings (30d)', v: STATS.totalMeetings, c: '#8b5cf6', i: <CheckCircleOutlined /> }, { t: 'Avg Duration', v: STATS.avgDuration, c: '#f59e0b', i: <ClockCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><VideoCameraOutlined style={{ color: themeColor }} /><Text strong>Meeting Rooms</Text><Badge count={activeRooms} style={{ backgroundColor: '#10b981' }} /></Space>}>
                    <Table dataSource={ROOMS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Room', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v === 'active' ? '● Live' : 'Ended'}</Tag> },
                        { title: 'Participants', dataIndex: 'participants', width: 90, render: (v: number) => <Text strong style={{ fontSize: 12, color: v > 0 ? '#3b82f6' : '#6b7280' }}>{v}</Text> },
                        { title: 'Duration', dataIndex: 'duration' },
                        { title: 'Started', dataIndex: 'created' },
                        { title: 'Codec', dataIndex: 'codec', render: (v: string) => <Tag style={{ fontSize: 9, borderRadius: 8 }}>{v}</Tag> },
                    ]} />
                </Card>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><SafetyCertificateOutlined style={{ color: '#06b6d4' }} /><Text strong>Infrastructure</Text></Space>}>
                            {[{ k: 'SRTP Status', v: 'Enabled', c: '#10b981' }, { k: 'SRTP Encryption', v: 'AES-128-CM', c: '#3b82f6' }, { k: 'OWASP Compliance', v: 'Pass', c: '#10b981' }, { k: 'Max Participants', v: '100', c: '#8b5cf6' }, { k: 'Recording', v: 'Jibri Active', c: '#f59e0b' }].map((item, i) => (
                                <motion.div key={item.k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                    <Text style={{ fontSize: 12 }}>{item.k}</Text>
                                    <Text strong style={{ fontSize: 12, color: item.c }}>{item.v}</Text>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Text strong>Monthly Stats</Text>}>
                            {[{ k: 'Total Meetings', v: STATS.totalMeetings, c: '#3b82f6' }, { k: 'Total Participants', v: STATS.totalParticipants, c: '#8b5cf6' }, { k: 'Peak Concurrent', v: STATS.peakConcurrent, c: '#f59e0b' }, { k: 'Avg Duration', v: STATS.avgDuration, c: '#10b981' }].map((item, i) => (
                                <motion.div key={item.k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                    <Text style={{ fontSize: 12 }}>{item.k}</Text>
                                    <Text strong style={{ fontSize: 14, color: item.c }}>{item.v}</Text>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
