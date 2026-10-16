'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { MonitorOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, ReloadOutlined, LinkOutlined, CloudServerOutlined, AlertOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const HOSTS = [
    { name: 'docker-host', ip: '192.168.1.100', status: 'monitored', cpu: 34, memory: 62, disk: 45, uptime: '42d 5h', color: '#10b981' },
];
const TRIGGERS = [
    { name: 'High CPU on docker-host', severity: 'warning', status: 'PROBLEM', value: '92%', since: '15m ago' },
    { name: 'Disk space low on /var/lib/docker', severity: 'average', status: 'PROBLEM', value: '85%', since: '2h ago' },
    { name: 'PostgreSQL connections high', severity: 'information', status: 'OK', value: '45', since: '-' },
    { name: 'Swap usage', severity: 'information', status: 'OK', value: '12%', since: '-' },
];
const ITEMS = [
    { name: 'CPU idle time', key: 'system.cpu.util[,idle]', lastValue: '66%', updated: '30s ago' },
    { name: 'Available memory', key: 'vm.memory.size[available]', lastValue: '12.4 GB', updated: '30s ago' },
    { name: 'Free disk space /', key: 'vfs.fs.size[/,free]', lastValue: '128 GB', updated: '1m ago' },
    { name: 'Network in (eth0)', key: 'net.if.in[eth0]', lastValue: '45 MB/s', updated: '30s ago' },
    { name: 'Network out (eth0)', key: 'net.if.out[eth0]', lastValue: '12 MB/s', updated: '30s ago' },
    { name: 'System uptime', key: 'system.uptime', lastValue: '42d 5h 23m', updated: '1m ago' },
];

export default function ZabbixPage() {
    const { themeColor } = usePreferencesStore();
    const problems = TRIGGERS.filter(t => t.status === 'PROBLEM').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#d40000', '#f59e0b']}>Zabbix Monitoring</AuroraText>} subTitle={<DecryptedText text="Infrastructure monitoring, triggers & performance metrics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8086', '_blank')}>Open Zabbix</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Hosts', v: HOSTS.length, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Problems', v: problems, c: problems > 0 ? '#ef4444' : '#10b981', i: <AlertOutlined /> }, { t: 'Triggers', v: TRIGGERS.length, c: '#8b5cf6', i: <MonitorOutlined /> }, { t: 'Items', v: ITEMS.length, c: '#f59e0b', i: <CheckCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                {HOSTS.map((h, i) => (
                    <Card key={h.name} size="small" style={{ ...glass, borderLeft: `3px solid ${h.color}` }} title={<Space><CloudServerOutlined style={{ color: h.color }} /><Text strong>{h.name}</Text><Tag style={{ fontSize: 9, borderRadius: 8 }}>{h.ip}</Tag><Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{h.status}</Tag></Space>}>
                        <Row gutter={12}>
                            <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>CPU</Text><Progress percent={h.cpu} size="small" strokeColor={h.cpu > 80 ? '#ef4444' : '#10b981'} /></Col>
                            <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Memory</Text><Progress percent={h.memory} size="small" strokeColor={h.memory > 80 ? '#ef4444' : h.memory > 60 ? '#f59e0b' : '#10b981'} /></Col>
                            <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Disk</Text><Progress percent={h.disk} size="small" strokeColor={h.disk > 80 ? '#ef4444' : '#10b981'} /></Col>
                            <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Uptime</Text><br /><Text strong style={{ fontSize: 14, color: '#3b82f6' }}>{h.uptime}</Text></Col>
                        </Row>
                    </Card>
                ))}

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><AlertOutlined style={{ color: '#ef4444' }} /><Text strong>Triggers</Text><Badge count={problems} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                            <Table dataSource={TRIGGERS} rowKey="name" size="small" pagination={false} columns={[
                                { title: 'Trigger', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'PROBLEM' ? 'red' : 'green'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Severity', dataIndex: 'severity', width: 90, render: (v: string) => <Tag color={v === 'warning' ? 'orange' : v === 'average' ? 'gold' : 'blue'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Value', dataIndex: 'value', width: 60 },
                            ]} />
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><MonitorOutlined style={{ color: '#8b5cf6' }} /><Text strong>Latest Data</Text></Space>}>
                            <Table dataSource={ITEMS} rowKey="key" size="small" pagination={false} columns={[
                                { title: 'Item', dataIndex: 'name', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Value', dataIndex: 'lastValue', render: (v: string) => <Text strong style={{ fontSize: 12, color: '#3b82f6' }}>{v}</Text> },
                                { title: 'Updated', dataIndex: 'updated', width: 70, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
