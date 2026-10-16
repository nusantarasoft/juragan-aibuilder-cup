'use client';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Table, Badge, Button, Input, Select, Tooltip, DatePicker } from 'antd';
import { SafetyOutlined, AuditOutlined, UserOutlined, WarningOutlined, ExportOutlined, LoginOutlined, DeleteOutlined, LockOutlined, CloudDownloadOutlined, ReloadOutlined, SearchOutlined, AlertOutlined, ClockCircleOutlined, CheckCircleOutlined, SecurityScanOutlined, DatabaseOutlined, FileProtectOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, LineChart, Line, Legend } from 'recharts';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ACTIONS = ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import'] as const;
const MODULES = ['hr', 'itsm', 'pm', 'crm', 'ecommerce', 'accounting', 'inventory', 'settings'] as const;
const SEVERITIES = ['info', 'warning', 'critical'] as const;
const USERS = [
    { id: 'u1', name: 'Adi Prasetyo', email: 'adi@nusantarasoft.com' },
    { id: 'u2', name: 'Siti Nurhaliza', email: 'siti@nusantarasoft.com' },
    { id: 'u3', name: 'Budi Hartono', email: 'budi@nusantarasoft.com' },
    { id: 'u4', name: 'Dewi Lestari', email: 'dewi@nusantarasoft.com' },
    { id: 'u5', name: 'Rizky Fauzan', email: 'rizky@nusantarasoft.com' },
    { id: 'u6', name: 'Maya Indah', email: 'maya@nusantarasoft.com' },
    { id: 'u7', name: 'Eko Saputra', email: 'eko@nusantarasoft.com' },
    { id: 'u8', name: 'Putri Amelia', email: 'putri@nusantarasoft.com' },
];
const DESCRIPTIONS = ['Updated employee record', 'Exported payroll report', 'Created new ticket', 'Deleted customer record', 'Modified journal entry', 'Viewed dashboard analytics', 'Changed user permissions', 'Imported bulk contacts', 'Logged in from new device', 'Updated system settings', 'Generated compliance report', 'Bulk deleted archived records'];
const IPS = ['192.168.1.10', '192.168.1.25', '10.0.0.5', '172.16.0.12', '192.168.1.30', '10.0.0.99', '192.168.2.55', '203.0.113.42'];

const ACTION_COLORS: Record<string, string> = { create: '#10b981', read: '#3b82f6', update: '#f59e0b', delete: '#ef4444', login: '#06b6d4', logout: '#94a3b8', export: '#8b5cf6', import: '#14b8a6' };
const SEVERITY_COLORS: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' };
const MODULE_COLORS: Record<string, string> = { hr: '#8b5cf6', itsm: '#3b82f6', pm: '#06b6d4', crm: '#10b981', ecommerce: '#f59e0b', accounting: '#ef4444', inventory: '#14b8a6', settings: '#64748b' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function seedRandom(seed: number) { let s = seed; return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; }; }

function generateMockAuditLogs(count: number) {
    const rng = seedRandom(42);
    const now = Date.now();
    return Array.from({ length: count }, (_, i) => {
        const user = USERS[Math.floor(rng() * USERS.length)];
        const action = ACTIONS[Math.floor(rng() * ACTIONS.length)];
        const isOffHours = rng() < 0.12;
        const isFailed = action === 'login' && rng() < 0.25;
        const hoursAgo = rng() * 720;
        const ts = new Date(now - hoursAgo * 3600000);
        if (isOffHours) { ts.setHours(Math.floor(rng() * 5) + 1); }
        return {
            id: `aud-${String(i).padStart(4, '0')}`, timestamp: ts.toISOString(),
            userId: user.id, userName: user.name, action: isFailed ? 'login' : action,
            module: MODULES[Math.floor(rng() * MODULES.length)],
            resource: `${['record', 'report', 'user', 'ticket', 'invoice'][Math.floor(rng() * 5)]}-${Math.floor(rng() * 9000 + 1000)}`,
            resourceId: `res-${Math.floor(rng() * 9000 + 1000)}`,
            description: isFailed ? 'Failed login attempt — invalid credentials' : DESCRIPTIONS[Math.floor(rng() * DESCRIPTIONS.length)],
            ipAddress: IPS[Math.floor(rng() * IPS.length)],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            metadata: { browser: rng() > 0.5 ? 'Chrome' : 'Firefox', os: 'Windows 10', sessionId: `sess-${Math.floor(rng() * 9999)}`, ...(isFailed ? { failReason: 'invalid_password', attempts: Math.floor(rng() * 5) + 2 } : {}) },
            severity: (isFailed ? 'warning' : action === 'delete' ? (rng() > 0.5 ? 'critical' : 'warning') : 'info') as typeof SEVERITIES[number],
        };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function AuditTrailPage() {
    const { themeColor } = usePreferencesStore();
    const logs = useMemo(() => generateMockAuditLogs(200), []);
    const [search, setSearch] = useState('');
    const [fModule, setFModule] = useState<string | undefined>();
    const [fAction, setFAction] = useState<string | undefined>();
    const [fSeverity, setFSeverity] = useState<string | undefined>();
    const [fUser, setFUser] = useState<string | undefined>();
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const filtered = useMemo(() => {
        let d = [...logs];
        if (fModule) d = d.filter(l => l.module === fModule);
        if (fAction) d = d.filter(l => l.action === fAction);
        if (fSeverity) d = d.filter(l => l.severity === fSeverity);
        if (fUser) d = d.filter(l => l.userName === fUser);
        if (search) { const s = search.toLowerCase(); d = d.filter(l => l.description.toLowerCase().includes(s) || l.userName.toLowerCase().includes(s) || l.resource.toLowerCase().includes(s)); }
        return d;
    }, [logs, fModule, fAction, fSeverity, fUser, search]);

    const todayLogs = useMemo(() => logs.filter(l => dayjs(l.timestamp).isSame(dayjs(), 'day')), [logs]);
    const stats = useMemo(() => ({
        total: todayLogs.length, logins: logs.filter(l => l.action === 'login').length,
        exports: logs.filter(l => l.action === 'export').length,
        permChanges: logs.filter(l => l.description.includes('permission')).length,
        failed: logs.filter(l => l.description.includes('Failed')).length,
    }), [logs, todayLogs]);

    // Compliance scores
    const compliance = { dataAccess: 92, passwordPolicy: 88, sessionMgmt: 95, exportControl: 78 };
    const complianceScore = Math.round((compliance.dataAccess + compliance.passwordPolicy + compliance.sessionMgmt + compliance.exportControl) / 4);

    // Activity Heatmap
    const heatmap = useMemo(() => {
        const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        logs.forEach(l => { const d = new Date(l.timestamp); grid[d.getDay() === 0 ? 6 : d.getDay() - 1][d.getHours()]++; });
        return grid;
    }, [logs]);
    const heatMax = Math.max(...heatmap.flat(), 1);

    // Action distribution
    const actionDist = useMemo(() => {
        const map: Record<string, number> = {};
        logs.forEach(l => { map[l.action] = (map[l.action] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [logs]);

    // Module activity
    const moduleActivity = useMemo(() => {
        const map: Record<string, number> = {};
        logs.forEach(l => { map[l.module] = (map[l.module] || 0) + 1; });
        return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [logs]);

    // Top users
    const topUsers = useMemo(() => {
        const map: Record<string, { events: number; lastAction: string; modules: Record<string, number>; offHours: number; failed: number }> = {};
        logs.forEach(l => {
            if (!map[l.userName]) map[l.userName] = { events: 0, lastAction: '', modules: {}, offHours: 0, failed: 0 };
            const u = map[l.userName]; u.events++; u.lastAction = u.lastAction || l.description;
            u.modules[l.module] = (u.modules[l.module] || 0) + 1;
            const h = new Date(l.timestamp).getHours(); if (h < 6 || h > 22) u.offHours++;
            if (l.description.includes('Failed')) u.failed++;
        });
        return Object.entries(map).map(([name, d]) => {
            const topMod = Object.entries(d.modules).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
            const riskScore = d.failed * 3 + d.offHours * 2 + (d.events > 40 ? 10 : 0);
            return { name, ...d, topModule: topMod, risk: riskScore > 15 ? 'high' : riskScore > 5 ? 'medium' : 'low' };
        }).sort((a, b) => b.events - a.events).slice(0, 15);
    }, [logs]);

    // Security Alerts
    const alerts = useMemo(() => {
        const items: { type: string; severity: string; user: string; time: string; detail: string; action: string }[] = [];
        const failedByIp: Record<string, { count: number; user: string; time: string }> = {};
        logs.forEach(l => {
            if (l.description.includes('Failed')) { const k = l.ipAddress; if (!failedByIp[k]) failedByIp[k] = { count: 0, user: l.userName, time: l.timestamp }; failedByIp[k].count++; }
            const h = new Date(l.timestamp).getHours();
            if (l.action === 'export' && (h < 6 || h > 22)) items.push({ type: 'Off-hours Export', severity: 'warning', user: l.userName, time: l.timestamp, detail: `Data export at ${dayjs(l.timestamp).format('HH:mm')}`, action: 'Review export contents' });
            if (l.action === 'delete' && l.description.includes('Bulk')) items.push({ type: 'Bulk Deletion', severity: 'critical', user: l.userName, time: l.timestamp, detail: l.description, action: 'Verify deletion scope' });
            if (l.description.includes('permission')) items.push({ type: 'Permission Change', severity: 'warning', user: l.userName, time: l.timestamp, detail: l.description, action: 'Audit permission change' });
        });
        Object.entries(failedByIp).forEach(([ip, d]) => { if (d.count >= 2) items.push({ type: 'Multiple Failed Logins', severity: 'critical', user: d.user, time: d.time, detail: `${d.count} failed attempts from ${ip}`, action: 'Block IP or reset credentials' }); });
        return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
    }, [logs]);

    // Login trend (30 days)
    const loginTrend = useMemo(() => {
        const days: Record<string, { success: number; failed: number }> = {};
        for (let i = 29; i >= 0; i--) { const d = dayjs().subtract(i, 'day').format('MMM DD'); days[d] = { success: 0, failed: 0 }; }
        logs.forEach(l => {
            if (l.action !== 'login') return;
            const d = dayjs(l.timestamp).format('MMM DD');
            if (days[d]) { l.description.includes('Failed') ? days[d].failed++ : days[d].success++; }
        });
        return Object.entries(days).map(([date, v]) => ({ date, ...v }));
    }, [logs]);

    const exportCsv = () => {
        const header = 'Timestamp,User,Action,Module,Resource,Description,IP,Severity\n';
        const rows = filtered.map(l => `${l.timestamp},${l.userName},${l.action},${l.module},${l.resource},"${l.description}",${l.ipAddress},${l.severity}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `audit_trail_${dayjs().format('YYYYMMDD')}.csv`; a.click(); URL.revokeObjectURL(url);
    };

    const scoreColor = complianceScore >= 80 ? '#10b981' : complianceScore >= 60 ? '#f59e0b' : '#ef4444';
    const scoreStatus = complianceScore >= 80 ? 'Compliant' : complianceScore >= 60 ? 'At Risk' : 'Non-Compliant';
    const circumference = 2 * Math.PI * 54;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Audit Trail & Compliance</AuroraText>} subTitle={<DecryptedText text="Enterprise security audit logging & compliance dashboard" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="csv" icon={<CloudDownloadOutlined />} size="small" onClick={exportCsv}>Export CSV</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 1. Compliance Score Banner */}
                <Card size="small" style={{ ...glass, borderTop: `3px solid ${scoreColor}` }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                                <svg width={130} height={130} viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
                                    <motion.circle cx="60" cy="60" r="54" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - (complianceScore / 100) * circumference }} transition={{ duration: 1.2, delay: 0.3 }} transform="rotate(-90 60 60)" />
                                    <text x="60" y="56" textAnchor="middle" fontSize="28" fontWeight="700" fill={scoreColor}>{complianceScore}</text>
                                    <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#64748b">/ 100</text>
                                </svg>
                            </motion.div>
                        </Col>
                        <Col xs={24} md={12}>
                            <Row gutter={[8, 8]}>
                                {[{ label: 'Data Access Policy', value: compliance.dataAccess }, { label: 'Password Policy', value: compliance.passwordPolicy }, { label: 'Session Management', value: compliance.sessionMgmt }, { label: 'Export Control', value: compliance.exportControl }].map((p, i) => (
                                    <Col key={i} xs={12}><div style={{ marginBottom: 4 }}><Text style={{ fontSize: 11 }}>{p.label}</Text></div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${p.value}%` }} transition={{ delay: 0.4 + i * 0.1 }} style={{ height: '100%', borderRadius: 3, background: p.value >= 90 ? '#10b981' : p.value >= 70 ? '#f59e0b' : '#ef4444' }} /></div>
                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{p.value}%</Text>
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                        <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                            <Tag color={scoreColor} style={{ fontSize: 13, padding: '4px 14px', borderRadius: 12, fontWeight: 600 }}>{scoreStatus}</Tag>
                            <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 11 }}>Last Audit: {dayjs().subtract(3, 'day').format('MMM D, YYYY')}</Text></div>
                            <div><Text type="secondary" style={{ fontSize: 11 }}>Next Scheduled: {dayjs().add(27, 'day').format('MMM D, YYYY')}</Text></div>
                        </Col>
                    </Row>
                </Card>

                {/* 2. Audit Stats */}
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Events (Today)', v: stats.total, c: '#3b82f6', i: <AuditOutlined /> }, { t: 'Login Attempts', v: stats.logins, c: '#06b6d4', i: <LoginOutlined /> }, { t: 'Data Exports', v: stats.exports, c: '#8b5cf6', i: <ExportOutlined /> }, { t: 'Permission Changes', v: stats.permChanges, c: '#f59e0b', i: <LockOutlined /> }, { t: 'Failed Actions', v: stats.failed, c: '#ef4444', i: <WarningOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={4} lg={4}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                {/* 3. Activity Heatmap */}
                <Card size="small" style={glass} title={<Space><ClockCircleOutlined style={{ color: '#3b82f6' }} /><Text strong>Activity Heatmap (7d × 24h)</Text></Space>}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 2, minWidth: 600 }}>
                            <div />
                            {Array.from({ length: 24 }, (_, h) => <Text key={h} style={{ fontSize: 9, textAlign: 'center', color: '#94a3b8' }}>{h}</Text>)}
                            {heatmap.map((row, d) => (
                                <React.Fragment key={d}>
                                    <Text style={{ fontSize: 10, lineHeight: '20px', color: '#64748b' }}>{DAYS[d]}</Text>
                                    {row.map((count, h) => (
                                        <Tooltip key={h} title={`${DAYS[d]} ${String(h).padStart(2, '0')}:00 — ${count} events`}>
                                            <div style={{ height: 18, borderRadius: 3, background: count === 0 ? 'rgba(0,0,0,0.04)' : `rgba(59,130,246,${0.15 + (count / heatMax) * 0.85})`, cursor: 'pointer', transition: 'transform 0.15s', }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                                        </Tooltip>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* 4. Audit Log Table */}
                <Card size="small" style={{ ...glass, marginBottom: 0 }}>
                    <Space wrap style={{ marginBottom: 12 }}>
                        <Input.Search placeholder="Search description..." size="small" style={{ width: 200 }} value={search} onChange={e => setSearch(e.target.value)} allowClear />
                        <Select placeholder="Module" size="small" style={{ width: 120 }} allowClear value={fModule} onChange={setFModule} options={MODULES.map(m => ({ label: m.toUpperCase(), value: m }))} />
                        <Select placeholder="Action" size="small" style={{ width: 120 }} allowClear value={fAction} onChange={setFAction} options={ACTIONS.map(a => ({ label: a, value: a }))} />
                        <Select placeholder="Severity" size="small" style={{ width: 110 }} allowClear value={fSeverity} onChange={setFSeverity} options={SEVERITIES.map(s => ({ label: s, value: s }))} />
                        <Select placeholder="User" size="small" style={{ width: 160 }} allowClear value={fUser} onChange={setFUser} options={USERS.map(u => ({ label: u.name, value: u.name }))} />
                    </Space>
                    <Table dataSource={filtered} rowKey="id" size="small" pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} entries` }} scroll={{ x: 1000 }}
                        expandable={{ expandedRowKeys: expandedRows, onExpandedRowsChange: keys => setExpandedRows(keys as string[]), expandedRowRender: rec => <pre style={{ fontSize: 11, margin: 0, padding: 8, background: 'rgba(0,0,0,0.03)', borderRadius: 8, maxHeight: 120, overflow: 'auto' }}>{JSON.stringify(rec.metadata, null, 2)}</pre> }}
                        columns={[
                            { title: 'Timestamp', dataIndex: 'timestamp', width: 140, render: (v: string) => <Text style={{ fontSize: 11 }}>{dayjs(v).format('MMM D, HH:mm:ss')}</Text> },
                            { title: 'User', dataIndex: 'userName', width: 130, render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                            { title: 'Action', dataIndex: 'action', width: 90, render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'} style={{ fontSize: 10, borderRadius: 10, textTransform: 'capitalize' }}>{v}</Tag> },
                            { title: 'Module', dataIndex: 'module', width: 100, render: (v: string) => <Tag color={MODULE_COLORS[v]} style={{ fontSize: 10, borderRadius: 10, textTransform: 'uppercase' }}>{v}</Tag> },
                            { title: 'Resource', dataIndex: 'resource', width: 110, render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                            { title: 'Description', dataIndex: 'description', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                            { title: 'IP', dataIndex: 'ipAddress', width: 115, render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                            { title: 'Severity', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={SEVERITY_COLORS[v]} style={{ borderRadius: 10, fontSize: 10, textTransform: 'capitalize' }}>{v}</Tag> },
                        ]}
                    />
                </Card>

                {/* 5 & 6. Charts Row: Action Distribution + Module Activity */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><SecurityScanOutlined style={{ color: '#8b5cf6' }} /><Text strong>Action Distribution</Text></Space>}>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart><Pie data={actionDist} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} style={{ fontSize: 10 }}>
                                    {actionDist.map(d => <Cell key={d.name} fill={ACTION_COLORS[d.name] || '#64748b'} />)}
                                </Pie><RTooltip /></PieChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', marginTop: -20 }}><Text type="secondary" style={{ fontSize: 11 }}>{logs.length} total events</Text></div>
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><DatabaseOutlined style={{ color: '#06b6d4' }} /><Text strong>Module Activity</Text></Space>}>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={moduleActivity} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, textTransform: 'uppercase' } as any} width={80} />
                                    <RTooltip /><Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                                        {moduleActivity.map(d => <Cell key={d.name} fill={MODULE_COLORS[d.name] || '#64748b'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>

                {/* 7. Top Users by Activity */}
                <Card size="small" style={glass} title={<Space><UserOutlined style={{ color: '#8b5cf6' }} /><Text strong>Top Users by Activity</Text><Badge count={topUsers.length} style={{ backgroundColor: '#8b5cf6' }} /></Space>}>
                    <Table dataSource={topUsers} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'User', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Events', dataIndex: 'events', width: 80, sorter: (a: any, b: any) => a.events - b.events, render: (v: number) => <Text style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>{v}</Text> },
                        { title: 'Last Action', dataIndex: 'lastAction', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Top Module', dataIndex: 'topModule', width: 110, render: (v: string) => <Tag color={MODULE_COLORS[v]} style={{ fontSize: 10, borderRadius: 10, textTransform: 'uppercase' }}>{v}</Tag> },
                        { title: 'Risk', dataIndex: 'risk', width: 80, render: (v: string) => <Tag color={v === 'high' ? 'red' : v === 'medium' ? 'orange' : 'green'} style={{ borderRadius: 10, fontSize: 10, textTransform: 'capitalize' }}>{v}</Tag> },
                    ]} />
                </Card>

                {/* 8. Security Alerts */}
                <Card size="small" style={{ ...glass, borderLeft: '3px solid #ef4444' }} title={<Space><AlertOutlined style={{ color: '#ef4444' }} /><Text strong>Security Alerts</Text><Badge count={alerts.length} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {alerts.map((a, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: a.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', flexWrap: 'wrap', gap: 6 }}>
                                <Space size={8}>
                                    <Tag color={a.severity === 'critical' ? 'red' : 'orange'} style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>{a.severity}</Tag>
                                    <Text strong style={{ fontSize: 12 }}>{a.type}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>— {a.user}</Text>
                                </Space>
                                <Space size={8}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(a.time).format('MMM D HH:mm')}</Text>
                                    <Tag style={{ fontSize: 9, borderRadius: 8 }}>{a.action}</Tag>
                                </Space>
                            </motion.div>
                        ))}
                    </div>
                </Card>

                {/* 9. Login Activity Trend */}
                <Card size="small" style={glass} title={<Space><LoginOutlined style={{ color: '#06b6d4' }} /><Text strong>Login Activity (30 Days)</Text></Space>}>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={loginTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Successful" />
                            <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                {/* 10. Data Retention Policy */}
                <Card size="small" style={glass} title={<Space><FileProtectOutlined style={{ color: '#10b981' }} /><Text strong>Data Retention & Compliance</Text></Space>}>
                    <Row gutter={[16, 12]}>
                        {[{ label: 'Log Retention', value: '90 Days', icon: <ClockCircleOutlined />, color: '#3b82f6' }, { label: 'Backup Frequency', value: 'Daily', icon: <DatabaseOutlined />, color: '#8b5cf6' }, { label: 'Encryption', value: 'AES-256', icon: <LockOutlined />, color: '#10b981' }].map((item, i) => (
                            <Col key={i} xs={8}>
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'rgba(0,0,0,0.02)' }}>
                                    <div style={{ color: item.color, fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                                    <Text strong style={{ fontSize: 13, display: 'block' }}>{item.value}</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{item.label}</Text>
                                </motion.div>
                            </Col>
                        ))}
                        <Col xs={24}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                                {['SOC 2', 'GDPR', 'ISO 27001'].map(f => (
                                    <Tag key={f} color="blue" style={{ borderRadius: 12, fontSize: 11, padding: '2px 12px', fontWeight: 600 }}><CheckCircleOutlined /> {f}</Tag>
                                ))}
                            </div>
                        </Col>
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
