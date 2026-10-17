'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Progress, Timeline, Table, Badge, Button } from 'antd';
import { AuditOutlined, SafetyOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined, FileSearchOutlined, DatabaseOutlined, EyeOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const COMPLIANCE_SCORE = 87;
const RECENT_ACTIONS = [
    { user: 'admin@nusantarasoft.com', action: 'Updated user role', module: 'users', ip: '192.168.1.10', time: new Date(Date.now() - 120000).toISOString(), severity: 'medium' },
    { user: 'hr.manager@nusantarasoft.com', action: 'Exported payroll report', module: 'hr', ip: '192.168.1.25', time: new Date(Date.now() - 300000).toISOString(), severity: 'low' },
    { user: 'admin@nusantarasoft.com', action: 'Deleted 3 records', module: 'crm', ip: '192.168.1.10', time: new Date(Date.now() - 600000).toISOString(), severity: 'high' },
    { user: 'ops@nusantarasoft.com', action: 'Created playbook', module: 'ops', ip: '192.168.1.15', time: new Date(Date.now() - 900000).toISOString(), severity: 'low' },
    { user: 'finance@nusantarasoft.com', action: 'Modified journal entry', module: 'accounting', ip: '192.168.1.30', time: new Date(Date.now() - 1200000).toISOString(), severity: 'medium' },
    { user: 'admin@nusantarasoft.com', action: 'Changed system settings', module: 'settings', ip: '192.168.1.10', time: new Date(Date.now() - 1800000).toISOString(), severity: 'high' },
];

const MODULE_ACTIVITY = [
    { module: 'CRM', actions: 342, users: 8, color: '#3b82f6' }, { module: 'HR', actions: 189, users: 5, color: '#8b5cf6' },
    { module: 'Accounting', actions: 267, users: 4, color: '#10b981' }, { module: 'Inventory', actions: 156, users: 6, color: '#f59e0b' },
    { module: 'ITSM', actions: 98, users: 3, color: '#06b6d4' }, { module: 'Settings', actions: 45, users: 2, color: '#ef4444' },
];

const SEVERITY_CFG: Record<string, { color: string; label: string }> = {
    high: { color: '#ef4444', label: 'High' }, medium: { color: '#f59e0b', label: 'Medium' }, low: { color: '#10b981', label: 'Low' },
};

const CHECKLIST = [
    { item: 'Data encryption at rest', status: 'pass' }, { item: 'HTTPS enforced', status: 'pass' },
    { item: 'Password policy (min 8 chars)', status: 'pass' }, { item: 'MFA enabled for admins', status: 'warning' },
    { item: 'Audit log retention (90 days)', status: 'pass' }, { item: 'GDPR consent forms', status: 'warning' },
    { item: 'Data backup schedule', status: 'pass' }, { item: 'Access review (quarterly)', status: 'fail' },
];

export default function AuditDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const maxActions = Math.max(...MODULE_ACTIVITY.map(m => m.actions));
    const passCount = CHECKLIST.filter(c => c.status === 'pass').length;
    const warnCount = CHECKLIST.filter(c => c.status === 'warning').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b']}>Audit & Compliance</AuroraText>} subTitle={<DecryptedText text="Cross-module audit trail, compliance scoring & security posture" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Compliance Score', v: `${COMPLIANCE_SCORE}%`, c: COMPLIANCE_SCORE >= 80 ? '#10b981' : '#f59e0b', i: <SafetyOutlined /> }, { t: 'Total Actions (30d)', v: MODULE_ACTIVITY.reduce((s, m) => s + m.actions, 0), c: '#3b82f6', i: <AuditOutlined /> }, { t: 'Active Users', v: MODULE_ACTIVITY.reduce((s, m) => s + m.users, 0), c: '#8b5cf6', i: <UserOutlined /> }, { t: 'High Severity', v: RECENT_ACTIONS.filter(a => a.severity === 'high').length, c: '#ef4444', i: <WarningOutlined /> }, { t: 'Checks Passed', v: `${passCount}/${CHECKLIST.length}`, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Warnings', v: warnCount, c: '#f59e0b', i: <WarningOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><SafetyOutlined style={{ color: '#10b981' }} /><Text strong>Compliance Score</Text></Space>}>
                            <div style={{ textAlign: 'center', padding: 16 }}>
                                <Progress type="dashboard" percent={COMPLIANCE_SCORE} strokeColor={{ '0%': '#ef4444', '50%': '#f59e0b', '100%': '#10b981' }} size={160} format={pct => <span style={{ fontSize: 28, fontWeight: 700 }}>{pct}%</span>} />
                                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{passCount} of {CHECKLIST.length} checks passed</Text>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><SafetyCertificateOutlined style={{ color: '#3b82f6' }} /><Text strong>Security Checklist</Text></Space>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {CHECKLIST.map((c, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: c.status === 'fail' ? '#ef444408' : 'transparent' }}>
                                        <Text style={{ fontSize: 12 }}>{c.item}</Text>
                                        <Tag color={c.status === 'pass' ? 'green' : c.status === 'warning' ? 'orange' : 'red'} style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>{c.status === 'pass' ? '✓' : c.status === 'warning' ? '⚠' : '✗'}</Tag>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><DatabaseOutlined style={{ color: '#8b5cf6' }} /><Text strong>Module Activity (30d)</Text></Space>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {MODULE_ACTIVITY.map((m, i) => (
                                    <motion.div key={m.module} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Space size={6}><div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} /><Text style={{ fontSize: 12 }}>{m.module}</Text></Space>
                                            <Space size={8}><Tag style={{ fontSize: 9 }}>{m.users} users</Tag><Text style={{ fontSize: 11, fontWeight: 600, color: m.color }}>{m.actions}</Text></Space>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${(m.actions / maxActions) * 100}%` }} transition={{ delay: 0.4 + i * 0.08 }} style={{ height: '100%', borderRadius: 3, background: m.color }} /></div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card style={glass} title={<Space><ClockCircleOutlined style={{ color: themeColor }} /><Text strong>Recent Actions</Text><Badge count={RECENT_ACTIONS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={RECENT_ACTIONS} rowKey={(_, i) => `${i}`} size="small" pagination={{ pageSize: 10 }} columns={[
                        { title: 'User', dataIndex: 'user', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Action', dataIndex: 'action', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Module', dataIndex: 'module', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 10, textTransform: 'capitalize' }}>{v}</Tag> },
                        { title: 'IP', dataIndex: 'ip', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Severity', dataIndex: 'severity', width: 90, render: (v: string) => <Tag color={SEVERITY_CFG[v]?.color} style={{ borderRadius: 10, fontSize: 10 }}>{SEVERITY_CFG[v]?.label}</Tag> },
                        { title: 'Time', dataIndex: 'time', width: 120, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
