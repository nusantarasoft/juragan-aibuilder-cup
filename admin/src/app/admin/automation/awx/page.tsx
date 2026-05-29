'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { CodeOutlined, CheckCircleOutlined, DatabaseOutlined, CloudServerOutlined, ReloadOutlined, LinkOutlined, PlayCircleOutlined, RocketOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TEMPLATES = [
    { name: 'Deploy Production', playbook: 'deploy.yml', inventory: 'production', lastRun: '2h ago', successRate: 95, color: '#3b82f6' },
    { name: 'Database Backup', playbook: 'backup-db.yml', inventory: 'all-servers', lastRun: '6h ago', successRate: 100, color: '#10b981' },
    { name: 'Security Patch', playbook: 'security-update.yml', inventory: 'production', lastRun: '3d ago', successRate: 88, color: '#8b5cf6' },
    { name: 'Config Rollout', playbook: 'config-sync.yml', inventory: 'staging', lastRun: '1d ago', successRate: 92, color: '#f59e0b' },
];
const HISTORY = [
    { template: 'Deploy Production', status: 'successful', type: 'playbook_run', started: '11:23:00', finished: '11:25:34', launched: 'admin' },
    { template: 'Database Backup', status: 'successful', type: 'playbook_run', started: '06:00:00', finished: '06:12:45', launched: 'schedule' },
    { template: 'Security Patch', status: 'failed', type: 'playbook_run', started: '2d ago', finished: '2d ago', launched: 'admin' },
    { template: 'Config Rollout', status: 'successful', type: 'playbook_run', started: '1d ago', finished: '1d ago', launched: 'admin' },
];

export default function AWXPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#1d1d1d', '#e74c3c']}>AWX Ansible</AuroraText>} subTitle={<DecryptedText text="Playbook automation — inventories, templates & job history" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8085', '_blank')}>Open AWX</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Job Templates', v: 6, c: '#3b82f6', i: <CodeOutlined /> }, { t: 'Inventories', v: 3, c: '#10b981', i: <DatabaseOutlined /> }, { t: 'Projects', v: 4, c: '#8b5cf6', i: <CloudServerOutlined /> }, { t: 'Running', v: 1, c: '#f59e0b', i: <RocketOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><CodeOutlined style={{ color: '#3b82f6' }} /><Text strong>Job Templates</Text><Badge count={TEMPLATES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {TEMPLATES.map((t, i) => (
                            <Col key={t.name} xs={24} sm={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}><Card size="small" hoverable style={{ borderTop: `3px solid ${t.color}`, borderRadius: 10 }}><Text strong style={{ fontSize: 12 }}>{t.name}</Text><br /><Tag style={{ fontSize: 9, borderRadius: 8, marginTop: 4 }}>{t.playbook}</Tag><br /><Tag color="blue" style={{ fontSize: 9, borderRadius: 8 }}>{t.inventory}</Tag><Row gutter={4} style={{ marginTop: 6 }}><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Last</Text><br /><Text style={{ fontSize: 11 }}>{t.lastRun}</Text></Col><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Success</Text><br /><Progress type="circle" percent={t.successRate} size={24} strokeColor={t.color} /></Col></Row></Card></motion.div></Col>
                        ))}
                    </Row>
                </Card>
                <Card size="small" style={glass} title={<Space><PlayCircleOutlined style={{ color: '#10b981' }} /><Text strong>Job History</Text></Space>}>
                    <Table dataSource={HISTORY} rowKey={(_, i) => `h${i}`} size="small" pagination={false} columns={[
                        { title: 'Template', dataIndex: 'template', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'successful' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Started', dataIndex: 'started', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Launched By', dataIndex: 'launched', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
