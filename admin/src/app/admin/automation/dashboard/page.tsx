'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Tabs } from 'antd';
import { ThunderboltOutlined, RocketOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, LinkOutlined, ClockCircleOutlined, ScheduleOutlined, PlayCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const N8N_WORKFLOWS = [
    { name: 'Email Notification Pipeline', status: 'active', executions: 1234, lastRun: '5m ago', success: 98.5, nodes: 8 },
    { name: 'Data Sync CRM → Accounting', status: 'active', executions: 567, lastRun: '1h ago', success: 99.2, nodes: 12 },
    { name: 'Backup Database Nightly', status: 'active', executions: 90, lastRun: '8h ago', success: 100, nodes: 5 },
    { name: 'Slack Alert on Error', status: 'inactive', executions: 45, lastRun: '3d ago', success: 95.6, nodes: 4 },
];
const JENKINS_JOBS = [
    { name: 'admin-build', status: 'success', duration: '8m 32s', lastBuild: '#234', triggered: '2h ago' },
    { name: 'middleware-build', status: 'success', duration: '5m 12s', lastBuild: '#189', triggered: '5h ago' },
    { name: 'landing-page-build', status: 'success', duration: '3m 45s', lastBuild: '#156', triggered: '1d ago' },
    { name: 'e2e-tests', status: 'failed', duration: '12m 08s', lastBuild: '#89', triggered: '3d ago' },
];
const AWX_PLAYBOOKS = [
    { name: 'deploy-production', template: 'Production Deploy', status: 'successful', duration: '4m 23s', lastRun: '1d ago' },
    { name: 'security-scan', template: 'Security Audit', status: 'successful', duration: '15m 32s', lastRun: '7d ago' },
    { name: 'backup-restore-test', template: 'DR Test', status: 'successful', duration: '8m 56s', lastRun: '14d ago' },
];

export default function AutomationDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const totalExecs = N8N_WORKFLOWS.reduce((s, w) => s + w.executions, 0);
    const activeWorkflows = N8N_WORKFLOWS.filter(w => w.status === 'active').length;
    const passedJobs = JENKINS_JOBS.filter(j => j.status === 'success').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ff6d5a', '#10b981']}>Workflow Automation</AuroraText>} subTitle={<DecryptedText text="n8n workflows, Jenkins pipelines & AWX playbooks" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Active Workflows', v: activeWorkflows, c: '#10b981', i: <PlayCircleOutlined /> }, { t: 'Total Executions', v: totalExecs.toLocaleString(), c: '#3b82f6', i: <ThunderboltOutlined /> }, { t: 'Jenkins Jobs', v: `${passedJobs}/${JENKINS_JOBS.length}`, c: '#8b5cf6', i: <RocketOutlined /> }, { t: 'AWX Playbooks', v: AWX_PLAYBOOKS.length, c: '#f59e0b', i: <ToolOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Tabs items={[
                    { key: 'n8n', label: <Space><ThunderboltOutlined />n8n Workflows</Space>, children: (
                        <Card size="small" style={glass} extra={<Button size="small" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:5678', '_blank')}>Open n8n</Button>}>
                            <Table dataSource={N8N_WORKFLOWS} rowKey="name" size="small" pagination={false} columns={[
                                { title: 'Workflow', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Executions', dataIndex: 'executions', width: 90, render: (v: number) => <Text strong style={{ color: '#3b82f6' }}>{v}</Text> },
                                { title: 'Success', dataIndex: 'success', width: 70, render: (v: number) => <Text style={{ color: v >= 99 ? '#10b981' : '#f59e0b' }}>{v}%</Text> },
                                { title: 'Nodes', dataIndex: 'nodes', width: 60 },
                                { title: 'Last Run', dataIndex: 'lastRun', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    )},
                    { key: 'jenkins', label: <Space><RocketOutlined />Jenkins</Space>, children: (
                        <Card size="small" style={glass} extra={<Button size="small" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:8084', '_blank')}>Open Jenkins</Button>}>
                            <Table dataSource={JENKINS_JOBS} rowKey="name" size="small" pagination={false} columns={[
                                { title: 'Job', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Build', dataIndex: 'lastBuild', width: 60, render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Duration', dataIndex: 'duration' },
                                { title: 'Triggered', dataIndex: 'triggered', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    )},
                    { key: 'awx', label: <Space><ToolOutlined />AWX Playbooks</Space>, children: (
                        <Card size="small" style={glass} extra={<Button size="small" icon={<LinkOutlined />} onClick={() => window.open('http://localhost:8085', '_blank')}>Open AWX</Button>}>
                            <Table dataSource={AWX_PLAYBOOKS} rowKey="name" size="small" pagination={false} columns={[
                                { title: 'Playbook', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Template', dataIndex: 'template', render: (v: string) => <Tag style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Duration', dataIndex: 'duration' },
                                { title: 'Last Run', dataIndex: 'lastRun', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]} />
                        </Card>
                    )},
                ]} />
            </motion.div>
        </CMSLayout>
    );
}
