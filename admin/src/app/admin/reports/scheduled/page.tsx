'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Switch } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, MailOutlined, CheckCircleOutlined, PlusOutlined, ReloadOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const SCHEDULES = [
    { id: 'SCH-001', report: 'Monthly Revenue Summary', cron: '0 8 1 * *', frequency: 'Monthly', recipients: 3, format: 'PDF', lastRun: '2025-05-01', nextRun: '2025-06-01', status: 'active', success: 12, failed: 0 },
    { id: 'SCH-002', report: 'Employee Headcount', cron: '0 14 * * MON', frequency: 'Weekly', recipients: 2, format: 'Excel', lastRun: '2025-05-19', nextRun: '2025-05-26', status: 'active', success: 8, failed: 1 },
    { id: 'SCH-003', report: 'Inventory Valuation', cron: '0 6 * * *', frequency: 'Daily', recipients: 5, format: 'PDF', lastRun: '2025-05-20', nextRun: '2025-05-21', status: 'active', success: 30, failed: 0 },
    { id: 'SCH-004', report: 'SLA Compliance Report', cron: '0 12 * * FRI', frequency: 'Weekly', recipients: 4, format: 'PDF', lastRun: '2025-05-16', nextRun: '2025-05-23', status: 'active', success: 20, failed: 2 },
    { id: 'SCH-005', report: 'CRM Pipeline Report', cron: '0 9 15 * *', frequency: 'Monthly', recipients: 1, format: 'Excel', lastRun: '2025-05-15', nextRun: '2025-06-15', status: 'paused', success: 6, failed: 0 },
];

export default function ScheduledReportsPage() {
    const { themeColor } = usePreferencesStore();
    const active = SCHEDULES.filter(s => s.status === 'active').length;
    const totalRecipients = SCHEDULES.reduce((s, r) => s + r.recipients, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6']}>Scheduled Reports</AuroraText>} subTitle={<DecryptedText text="Automated report delivery — cron scheduling & email distribution" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="n" icon={<PlusOutlined />} type="primary">New Schedule</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Schedules', v: SCHEDULES.length, c: '#3b82f6', i: <CalendarOutlined /> }, { t: 'Active', v: active, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Recipients', v: totalRecipients, c: '#8b5cf6', i: <MailOutlined /> }, { t: 'Total Runs', v: SCHEDULES.reduce((s, r) => s + r.success + r.failed, 0), c: '#f59e0b', i: <ClockCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={glass} title={<Space><CalendarOutlined style={{ color: '#3b82f6' }} /><Text strong>Schedule List</Text><Badge count={SCHEDULES.length} style={{ backgroundColor: '#3b82f6' }} /></Space>}>
                    <Table dataSource={SCHEDULES} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Report', dataIndex: 'report', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Frequency', dataIndex: 'frequency', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Cron', dataIndex: 'cron', render: (v: string) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Format', dataIndex: 'format', width: 60, render: (v: string) => <Tag color={v === 'PDF' ? 'red' : 'green'} style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Recipients', dataIndex: 'recipients', width: 80, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#8b5cf6' }} /> },
                        { title: 'Last Run', dataIndex: 'lastRun', width: 90, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Next Run', dataIndex: 'nextRun', width: 90, render: (v: string) => <Text style={{ fontSize: 10, color: '#3b82f6' }}>{v}</Text> },
                        { title: 'Success/Fail', width: 90, render: (_: any, r: any) => <Space size={4}><Tag color="green" style={{ fontSize: 9, borderRadius: 6 }}>{r.success}</Tag><Tag color={r.failed > 0 ? 'red' : 'default'} style={{ fontSize: 9, borderRadius: 6 }}>{r.failed}</Tag></Space> },
                        { title: 'Active', dataIndex: 'status', width: 60, render: (v: string) => <Switch size="small" checked={v === 'active'} /> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
