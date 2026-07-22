'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import {
    Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Switch, Badge,
    Modal, Input, Select, Form, Drawer, Popconfirm, Skeleton, message, theme, Tooltip, Avatar,
} from 'antd';
import {
    CalendarOutlined, ClockCircleOutlined, MailOutlined, CheckCircleOutlined,
    PlusOutlined, ReloadOutlined, PauseCircleOutlined, EditOutlined, CopyOutlined,
    DeleteOutlined, PlayCircleOutlined, FieldTimeOutlined, UserOutlined,
} from '@ant-design/icons';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = {
    background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14,
};
const glassDark = {
    background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
};
const LS_KEY = 'nusantarasoft_scheduled_reports';

/* ═══ Schedule type ═══ */
interface Schedule {
    id: string; name: string; reportName: string; frequency: string;
    cronExpression: string; recipients: string[]; status: 'active' | 'paused';
    nextRun: string; lastRun: string; successCount: number; failCount: number; format: string;
}

/* ═══ Demo fallback — realistic schedules shown when backend is empty ═══ */
const _nr = (h: number) => new Date(Date.now() + h).toISOString();
const _lr = (h: number) => new Date(Date.now() - h).toISOString();
const D = 86400_000;
const DEMO_SCHEDULES: Schedule[] = [
    { id: 'SCH-001', name: 'Daily Revenue Summary', reportName: 'Revenue Summary', frequency: 'daily', cronExpression: '0 8 * * *', format: 'pdf', recipients: ['cfo@company.com', 'finance@company.com'], status: 'active', nextRun: _nr(3600_000 * 14), lastRun: _lr(D), successCount: 45, failCount: 1 },
    { id: 'SCH-002', name: 'Weekly Sales Pipeline', reportName: 'Sales Pipeline Analysis', frequency: 'weekly', cronExpression: '0 9 * * MON', format: 'excel', recipients: ['sales-lead@company.com', 'vp-sales@company.com', 'crm@company.com'], status: 'active', nextRun: _nr(D * 2), lastRun: _lr(D * 5), successCount: 20, failCount: 0 },
    { id: 'SCH-003', name: 'Monthly HR Headcount', reportName: 'HR Headcount Report', frequency: 'monthly', cronExpression: '0 7 1 * *', format: 'pdf', recipients: ['hr-director@company.com', 'ceo@company.com'], status: 'active', nextRun: _nr(D * 15), lastRun: _lr(D * 28), successCount: 12, failCount: 0 },
    { id: 'SCH-004', name: 'Bi-Weekly Inventory Report', reportName: 'Inventory Valuation', frequency: 'bi-weekly', cronExpression: '0 6 */14 * *', format: 'csv', recipients: ['warehouse@company.com', 'ops@company.com', 'procurement@company.com', 'logistics@company.com'], status: 'active', nextRun: _nr(D * 5), lastRun: _lr(D * 9), successCount: 8, failCount: 2 },
    { id: 'SCH-005', name: 'Weekly SLA Compliance', reportName: 'SLA Compliance Dashboard', frequency: 'weekly', cronExpression: '0 17 * * FRI', format: 'pdf', recipients: ['itsm-manager@company.com', 'cto@company.com'], status: 'paused', nextRun: _nr(D * 4), lastRun: _lr(D * 12), successCount: 18, failCount: 3 },
    { id: 'SCH-006', name: 'Monthly Audit Trail', reportName: 'Audit Trail Export', frequency: 'monthly', cronExpression: '0 23 L * *', format: 'excel', recipients: ['compliance@company.com'], status: 'active', nextRun: _nr(D * 25), lastRun: _lr(D * 3), successCount: 11, failCount: 0 },
];

/* ═══ Countdown hook — live ticker for next-run display ═══ */
function useCountdown(target: string | null) {
    const [diff, setDiff] = useState('');
    useEffect(() => {
        if (!target) return;
        const tick = () => {
            const ms = new Date(target).getTime() - Date.now();
            if (ms <= 0) { setDiff('now'); return; }
            const h = Math.floor(ms / 3600_000);
            const m = Math.floor((ms % 3600_000) / 60_000);
            setDiff(h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`);
        };
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [target]);
    return diff;
}

/* ═══ Color maps ═══ */
const FREQ_COLORS: Record<string, string> = {
    daily: 'blue', weekly: 'cyan', 'bi-weekly': 'geekblue', monthly: 'purple', quarterly: 'magenta',
};
const FMT_COLORS: Record<string, string> = { pdf: 'red', excel: 'green', csv: 'orange' };

/* ═══ Scheduled Reports Page ═══ */
export default function ScheduledReportsPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark ? glassDark : glass;
    const [messageApi, ctxHolder] = message.useMessage();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [drawerSchedule, setDrawerSchedule] = useState<Schedule | null>(null);
    const editRef = useRef<Schedule | null>(null);

    /* ── Load data: backend → localStorage → demo fallback ── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await gql<{ reportSchedules: any }>(
                `query($tenantId: String!) { reportSchedules(tenantId: $tenantId) }`,
                { tenantId: DEFAULT_TENANT_ID },
            ).catch(() => ({ reportSchedules: null }));
            const live = Array.isArray(res.reportSchedules) ? res.reportSchedules : [];
            if (live.length > 0) { setSchedules(live); setLoading(false); return; }
        } catch { /* fall through */ }
        const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
        setSchedules(saved ? JSON.parse(saved) : DEMO_SCHEDULES);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Persist helper ── */
    const persist = useCallback((data: Schedule[]) => {
        setSchedules(data);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
    }, []);

    /* ── Next upcoming schedule for countdown banner ── */
    const nextSchedule = useMemo(() => {
        const active = schedules
            .filter(s => s.status === 'active' && s.nextRun)
            .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime());
        return active[0] || null;
    }, [schedules]);

    const countdown = useCountdown(nextSchedule?.nextRun ?? null);
    const drawerCountdown = useCountdown(drawerSchedule?.nextRun ?? null);

    /* ── Computed stats ── */
    const stats = useMemo(() => {
        const total = schedules.length;
        const active = schedules.filter(s => s.status === 'active').length;
        const paused = total - active;
        const recipients = new Set(schedules.flatMap(s => s.recipients)).size;
        const totalS = schedules.reduce((a, s) => a + s.successCount, 0);
        const totalF = schedules.reduce((a, s) => a + s.failCount, 0);
        const rate = totalS + totalF > 0 ? Math.round((totalS / (totalS + totalF)) * 100) : 100;
        return { total, active, paused, recipients, rate };
    }, [schedules]);

    const kpiCards = [
        { t: 'Total Schedules', v: stats.total, c: '#3b82f6', i: <CalendarOutlined /> },
        { t: 'Active', v: stats.active, c: '#10b981', i: <CheckCircleOutlined /> },
        { t: 'Paused', v: stats.paused, c: '#f59e0b', i: <PauseCircleOutlined /> },
        { t: 'Total Recipients', v: stats.recipients, c: '#8b5cf6', i: <MailOutlined /> },
        { t: 'Success Rate', v: `${stats.rate}%`, c: '#06b6d4', i: <FieldTimeOutlined /> },
    ];

    /* ── Toggle active / paused ── */
    const toggleStatus = (id: string) => {
        const updated = schedules.map(s =>
            s.id === id ? { ...s, status: (s.status === 'active' ? 'paused' : 'active') as 'active' | 'paused' } : s,
        );
        persist(updated);
        messageApi.success('Schedule status updated');
    };

    /* ── Duplicate ── */
    const duplicateSchedule = (s: Schedule) => {
        const dup: Schedule = { ...s, id: `SCH-${Date.now()}`, name: `${s.name} (Copy)`, successCount: 0, failCount: 0 };
        persist([...schedules, dup]);
        messageApi.success('Schedule duplicated');
    };

    /* ── Delete ── */
    const deleteSchedule = (id: string) => {
        persist(schedules.filter(s => s.id !== id));
        if (drawerSchedule?.id === id) setDrawerSchedule(null);
        messageApi.success('Schedule deleted');
    };

    /* ── Save (create or edit) ── */
    const handleSave = () => {
        form.validateFields().then(vals => {
            if (editRef.current) {
                persist(schedules.map(s => s.id === editRef.current!.id ? { ...s, ...vals } : s));
                messageApi.success('Schedule updated');
            } else {
                const newS: Schedule = {
                    id: `SCH-${Date.now()}`, ...vals,
                    nextRun: new Date(Date.now() + 86400_000).toISOString(),
                    lastRun: '', successCount: 0, failCount: 0,
                };
                persist([...schedules, newS]);
                messageApi.success('Schedule created');
            }
            setModalOpen(false);
            form.resetFields();
            editRef.current = null;
        });
    };

    const openEdit = (s: Schedule) => {
        editRef.current = s;
        form.setFieldsValue(s);
        setModalOpen(true);
    };

    /* ── Demo run history for drawer ── */
    const fakeHistory = (s: Schedule) =>
        Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() - 86400_000 * (i + 1) * (s.frequency === 'daily' ? 1 : 7)).toLocaleString(),
            status: i === 2 && s.failCount > 0 ? 'failed' : 'success',
            duration: `${(Math.random() * 8 + 1).toFixed(1)}s`,
        }));

    /* ═══ Table columns ═══ */
    const cronBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const columns = [
        { title: 'Report Name', dataIndex: 'name', key: 'name', render: (v: string, r: Schedule) => (
            <div><Text strong style={{ fontSize: 12 }}>{v}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{r.reportName}</Text></div>
        )},
        { title: 'Frequency', dataIndex: 'frequency', key: 'freq', width: 100, render: (v: string) => (
            <Tag color={FREQ_COLORS[v] || 'default'} style={{ fontSize: 10, borderRadius: 8, textTransform: 'capitalize' } as any}>{v}</Tag>
        )},
        { title: 'Cron', dataIndex: 'cronExpression', key: 'cron', width: 130, render: (v: string) => (
            <Text style={{ fontSize: 10, fontFamily: 'monospace', background: cronBg, padding: '2px 6px', borderRadius: 4 }}>{v}</Text>
        )},
        { title: 'Format', dataIndex: 'format', key: 'fmt', width: 70, render: (v: string) => (
            <Tag color={FMT_COLORS[v] || 'default'} style={{ fontSize: 10, borderRadius: 8, textTransform: 'uppercase' } as any}>{v}</Tag>
        )},
        { title: 'Recipients', dataIndex: 'recipients', key: 'recip', width: 110, render: (v: string[]) => (
            <Avatar.Group max={{ count: 3, style: { backgroundColor: '#8b5cf6', fontSize: 10 } }} size="small">
                {v.map(e => <Tooltip key={e} title={e}><Avatar size="small" style={{ backgroundColor: '#8b5cf6', fontSize: 9 }} icon={<UserOutlined />} /></Tooltip>)}
            </Avatar.Group>
        )},
        { title: 'Next Run', dataIndex: 'nextRun', key: 'next', width: 105,
          sorter: (a: Schedule, b: Schedule) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime(),
          render: (v: string) => <Text style={{ fontSize: 10, color: '#3b82f6' }}>{v ? new Date(v).toLocaleDateString() : '—'}</Text> },
        { title: 'Last Run', dataIndex: 'lastRun', key: 'last', width: 105,
          render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v ? new Date(v).toLocaleDateString() : '—'}</Text> },
        {
            title: '✓ / ✗', key: 'sf', width: 80,
            render: (_: any, r: Schedule) => (
                <Space size={4}>
                    <Tag color="green" style={{ fontSize: 9, borderRadius: 6 }}>{r.successCount}</Tag>
                    <Tag color={r.failCount > 0 ? 'red' : 'default'} style={{ fontSize: 9, borderRadius: 6 }}>{r.failCount}</Tag>
                </Space>
            ),
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 70,
            render: (_: any, r: Schedule) => (
                <Switch size="small" checked={r.status === 'active'} onChange={() => toggleStatus(r.id)} />
            ),
        },
        {
            title: 'Actions', key: 'actions', width: 145,
            render: (_: any, r: Schedule) => (
                <Space size={2}>
                    <Tooltip title="Edit">
                        <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 12, color: '#f59e0b' }} />}
                            onClick={e => { e.stopPropagation(); openEdit(r); }} />
                    </Tooltip>
                    <Tooltip title="Duplicate">
                        <Button type="text" size="small" icon={<CopyOutlined style={{ fontSize: 12, color: '#8b5cf6' }} />}
                            onClick={e => { e.stopPropagation(); duplicateSchedule(r); }} />
                    </Tooltip>
                    <Tooltip title="Run Now">
                        <Button type="text" size="small" icon={<PlayCircleOutlined style={{ fontSize: 12, color: '#10b981' }} />}
                            onClick={e => { e.stopPropagation(); messageApi.info(`Running "${r.name}" now…`); }} />
                    </Tooltip>
                    <Popconfirm title="Delete this schedule?" onConfirm={() => deleteSchedule(r.id)}
                        okText="Yes" cancelText="No">
                        <Button type="text" size="small" icon={<DeleteOutlined style={{ fontSize: 12, color: '#ef4444' }} />}
                            onClick={e => e.stopPropagation()} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    /* ═══ Render ═══ */
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6']}>Scheduled Reports</AuroraText>}
            subTitle={
                <DecryptedText text="Automated report delivery — cron scheduling & email distribution"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />
            }
            extra={[
                <Button key="n" icon={<PlusOutlined />} type="primary"
                    onClick={() => { editRef.current = null; form.resetFields(); setModalOpen(true); }}>
                    New Schedule
                </Button>,
                <Button key="r" icon={<ReloadOutlined />} loading={loading} onClick={loadData} />,
            ]}
        >
            {ctxHolder}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ═══ 1. Next Run Countdown Banner ═══ */}
                {nextSchedule && countdown && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card size="small" style={{
                            ...glassCard, borderLeft: `4px solid ${themeColor}`,
                            background: isDark
                                ? `linear-gradient(135deg, rgba(12,12,30,0.92) 0%, ${themeColor}18 100%)`
                                : `linear-gradient(135deg, rgba(255,255,255,0.8) 0%, ${themeColor}12 100%)`,
                        }}>
                            <Space>
                                <ClockCircleOutlined style={{ fontSize: 18, color: themeColor }} />
                                <Text style={{ fontSize: 13 }}>
                                    Next Report: <Text strong>{nextSchedule.name}</Text>{' '}
                                    in <Text strong style={{ color: themeColor }}>{countdown}</Text>
                                </Text>
                            </Space>
                        </Card>
                    </motion.div>
                )}

                {/* ═══ 2. Stats Row — 5 glassmorphism KPI cards ═══ */}
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4} lg={Math.floor(24 / 5)}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{
                                    ...glassCard, borderTop: `3px solid ${s.c}`,
                                    background: isDark
                                        ? `linear-gradient(135deg, rgba(12,12,30,0.92) 0%, ${s.c}11 100%)`
                                        : `linear-gradient(135deg, rgba(255,255,255,0.65) 0%, ${s.c}11 100%)`,
                                }}>
                                    {loading
                                        ? <Skeleton.Input active size="small" style={{ width: '100%' }} />
                                        : <Statistic title={s.t} value={s.v} prefix={s.i}
                                            valueStyle={{ color: s.c, fontSize: 20, fontWeight: 700 }} />
                                    }
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* ═══ 3. Schedules Table ═══ */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}>
                    <Card size="small" style={glassCard}
                        title={
                            <Space>
                                <CalendarOutlined style={{ color: '#3b82f6' }} />
                                <Text strong>Schedule List</Text>
                                <Badge count={schedules.length} style={{ backgroundColor: '#3b82f6' }} />
                            </Space>
                        }>
                        <Table dataSource={schedules} columns={columns} rowKey="id" size="small"
                            loading={loading}
                            pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
                            onRow={record => ({
                                onClick: () => setDrawerSchedule(record),
                                style: { cursor: 'pointer' },
                            })}
                        />
                    </Card>
                </motion.div>
            </motion.div>

            {/* ═══ 4. Create / Edit Schedule Modal ═══ */}
            <Modal title={editRef.current ? 'Edit Schedule' : 'New Schedule'}
                open={modalOpen} onOk={handleSave} okText="Save" width={520}
                onCancel={() => { setModalOpen(false); form.resetFields(); editRef.current = null; }}>
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}
                    initialValues={{ status: 'active', format: 'pdf', frequency: 'daily', recipients: [] }}>
                    <Form.Item name="name" label="Schedule Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Daily Revenue Summary" />
                    </Form.Item>
                    <Form.Item name="reportName" label="Report Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Revenue Summary" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="frequency" label="Frequency" rules={[{ required: true }]}>
                                <Select options={['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'].map(v => ({
                                    label: v.charAt(0).toUpperCase() + v.slice(1), value: v,
                                }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="format" label="Format" rules={[{ required: true }]}>
                                <Select options={[
                                    { label: 'PDF', value: 'pdf' },
                                    { label: 'Excel', value: 'excel' },
                                    { label: 'CSV', value: 'csv' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="cronExpression" label="Cron Expression" rules={[{ required: true }]}
                        help="e.g. 0 8 * * * (daily at 8 AM)">
                        <Input placeholder="0 8 * * *" style={{ fontFamily: 'monospace' }} />
                    </Form.Item>
                    <Form.Item name="recipients" label="Recipients" rules={[{ required: true }]}>
                        <Select mode="tags" placeholder="Enter email addresses" tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item name="status" label="Status" valuePropName="checked"
                        getValueFromEvent={(checked: boolean) => checked ? 'active' : 'paused'}
                        getValueProps={(v: string) => ({ checked: v === 'active' })}>
                        <Switch checkedChildren="Active" unCheckedChildren="Paused" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* ═══ 5. Schedule Detail Drawer ═══ */}
            <Drawer title={drawerSchedule?.name || 'Schedule Details'}
                open={!!drawerSchedule} onClose={() => setDrawerSchedule(null)} size={420}
                extra={
                    <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => {
                            if (drawerSchedule) { openEdit(drawerSchedule); setDrawerSchedule(null); }
                        }}>Edit</Button>
                        <Popconfirm title="Delete this schedule?"
                            onConfirm={() => { if (drawerSchedule) deleteSchedule(drawerSchedule.id); }}>
                            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
                        </Popconfirm>
                    </Space>
                }
            >
                {drawerSchedule && (() => {
                    const s = drawerSchedule;
                    const history = fakeHistory(s);
                    return (
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            {/* Detail grid */}
                            <Card size="small" style={{ borderRadius: 10 }}>
                                <Row gutter={[8, 12]}>
                                    {([
                                        ['Report', s.reportName], ['Frequency', s.frequency],
                                        ['Cron', s.cronExpression], ['Format', s.format.toUpperCase()],
                                        ['Status', s.status], ['Success / Fail', `${s.successCount} / ${s.failCount}`],
                                    ] as [string, string][]).map(([label, val]) => (
                                        <Col span={12} key={label}>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{label}</Text>
                                            <Text strong style={{
                                                fontSize: 12, ...(label === 'Cron' ? { fontFamily: 'monospace' } : {}),
                                            }}>{val}</Text>
                                        </Col>
                                    ))}
                                </Row>
                            </Card>

                            {/* Countdown */}
                            <Card size="small" style={{ borderRadius: 10 }}
                                title={<Text strong style={{ fontSize: 12 }}>⏱ Next Run Countdown</Text>}>
                                <Text style={{ fontSize: 16, fontWeight: 700, color: themeColor }}>
                                    {drawerCountdown || '—'}
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    {new Date(s.nextRun).toLocaleString()}
                                </Text>
                            </Card>

                            {/* Recipients list */}
                            <Card size="small" style={{ borderRadius: 10 }}
                                title={<Text strong style={{ fontSize: 12 }}>📧 Recipients ({s.recipients.length})</Text>}>
                                <Space size={4} wrap>
                                    {s.recipients.map(e => (
                                        <Tag key={e} style={{ fontSize: 10, borderRadius: 8 }}>{e}</Tag>
                                    ))}
                                </Space>
                            </Card>

                            {/* Run history */}
                            <Card size="small" style={{ borderRadius: 10 }}
                                title={<Text strong style={{ fontSize: 12 }}>📜 Run History (Last 5)</Text>}>
                                {history.map((h, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                                        borderBottom: i < 4 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                    }}>
                                        <Text style={{ fontSize: 10 }}>{h.date}</Text>
                                        <Space size={4}>
                                            <Tag color={h.status === 'success' ? 'green' : 'red'}
                                                style={{ fontSize: 9, borderRadius: 6 }}>{h.status}</Tag>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{h.duration}</Text>
                                        </Space>
                                    </div>
                                ))}
                            </Card>
                        </Space>
                    );
                })()}
            </Drawer>
        </CMSLayout>
    );
}
