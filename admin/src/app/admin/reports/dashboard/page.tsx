'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress, Tabs } from 'antd';
import { BarChartOutlined, FileTextOutlined, ClockCircleOutlined, PlusOutlined, DownloadOutlined, CalendarOutlined, ReloadOutlined, CheckCircleOutlined, ExperimentOutlined, PieChartOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const SAVED_REPORTS = [
    { id: 'RPT-001', name: 'Monthly Revenue Summary', type: 'Financial', format: 'PDF', lastRun: '2025-05-19T08:30:00Z', schedule: 'Monthly', status: 'active', rows: 1240 },
    { id: 'RPT-002', name: 'Employee Headcount Report', type: 'HR', format: 'Excel', lastRun: '2025-05-18T14:00:00Z', schedule: 'Weekly', status: 'active', rows: 85 },
    { id: 'RPT-003', name: 'Inventory Valuation', type: 'Inventory', format: 'PDF', lastRun: '2025-05-17T06:00:00Z', schedule: 'Daily', status: 'active', rows: 3200 },
    { id: 'RPT-004', name: 'Sales Pipeline Analysis', type: 'CRM', format: 'Excel', lastRun: '2025-05-15T10:00:00Z', schedule: 'On-demand', status: 'paused', rows: 520 },
    { id: 'RPT-005', name: 'ITSM SLA Compliance', type: 'ITSM', format: 'PDF', lastRun: '2025-05-19T12:00:00Z', schedule: 'Weekly', status: 'active', rows: 340 },
    { id: 'RPT-006', name: 'Audit Trail Export', type: 'Compliance', format: 'CSV', lastRun: '2025-05-16T09:00:00Z', schedule: 'Monthly', status: 'active', rows: 15600 },
];

const RECENT_EXPORTS = [
    { name: 'Monthly Revenue Summary', format: 'PDF', size: '2.4 MB', time: '2 hours ago', status: 'completed' },
    { name: 'Employee Headcount Report', format: 'Excel', size: '840 KB', time: '1 day ago', status: 'completed' },
    { name: 'Inventory Valuation', format: 'PDF', size: '5.1 MB', time: '3 days ago', status: 'completed' },
    { name: 'Audit Trail Export', format: 'CSV', size: '12.8 MB', time: '4 days ago', status: 'completed' },
];

export default function ReportsDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const activeReports = SAVED_REPORTS.filter(r => r.status === 'active').length;
    const scheduledReports = SAVED_REPORTS.filter(r => r.schedule !== 'On-demand').length;
    const totalRows = SAVED_REPORTS.reduce((s, r) => s + r.rows, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Reporting Engine</AuroraText>} subTitle={<DecryptedText text="Build, schedule & export reports across all modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="n" icon={<PlusOutlined />} type="primary">New Report</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Saved Reports', v: SAVED_REPORTS.length, c: '#3b82f6', i: <FileTextOutlined /> }, { t: 'Active', v: activeReports, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Scheduled', v: scheduledReports, c: '#8b5cf6', i: <CalendarOutlined /> }, { t: 'Total Records', v: totalRows.toLocaleString(), c: '#f59e0b', i: <BarChartOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><FileTextOutlined style={{ color: '#3b82f6' }} /><Text strong>Saved Reports</Text><Badge count={SAVED_REPORTS.length} style={{ backgroundColor: '#3b82f6' }} /></Space>}>
                            <Table dataSource={SAVED_REPORTS} rowKey="id" size="small" pagination={false} columns={[
                                { title: 'ID', dataIndex: 'id', width: 80, render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Report Name', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Format', dataIndex: 'format', width: 70, render: (v: string) => <Tag color={v === 'PDF' ? 'red' : v === 'Excel' ? 'green' : 'blue'} style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Schedule', dataIndex: 'schedule', width: 90, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Status', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'orange'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                                { title: '', width: 40, render: () => <Button type="text" size="small" icon={<DownloadOutlined style={{ fontSize: 12 }} />} /> },
                            ]} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><ClockCircleOutlined style={{ color: '#10b981' }} /><Text strong>Recent Exports</Text></Space>}>
                            {RECENT_EXPORTS.map((e, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6 }}>
                                    <div>
                                        <Text strong style={{ fontSize: 11 }}>{e.name}</Text><br />
                                        <Text type="secondary" style={{ fontSize: 9 }}>{e.format} • {e.size} • {e.time}</Text>
                                    </div>
                                    <Tag color="green" style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{e.status}</Tag>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><PieChartOutlined style={{ color: '#8b5cf6' }} /><Text strong>Reports by Module</Text></Space>}>
                    <Row gutter={[10, 10]}>
                        {[{ name: 'Financial', count: 8, color: '#3b82f6' }, { name: 'HR', count: 5, color: '#10b981' }, { name: 'CRM', count: 6, color: '#f59e0b' }, { name: 'Inventory', count: 4, color: '#8b5cf6' }, { name: 'ITSM', count: 3, color: '#06b6d4' }, { name: 'Compliance', count: 2, color: '#ef4444' }].map((m, i) => (
                            <Col key={m.name} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}><Card size="small" hoverable style={{ textAlign: 'center', borderRadius: 10, borderTop: `3px solid ${m.color}` }}><Text strong style={{ fontSize: 20, color: m.color, display: 'block' }}>{m.count}</Text><Text type="secondary" style={{ fontSize: 10 }}>{m.name}</Text></Card></motion.div></Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
