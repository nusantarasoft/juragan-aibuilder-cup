"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { Card, Row, Col, Statistic, Tag, Table, Space, message, Typography, Button, Tooltip, Badge, Collapse, InputNumber, Input } from "antd";
import {
    AlertOutlined, ArrowRightOutlined, ClockCircleOutlined,
    WarningOutlined, ReloadOutlined, ThunderboltOutlined,
    FireOutlined, SettingOutlined, UserOutlined, TeamOutlined,
    CrownOutlined, SafetyCertificateOutlined, UndoOutlined, SaveOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Legend,
} from "recharts";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_SLA_POLICIES = `query { itsmSlaPolicies { id name priority responseTimeMinutes resolutionTimeMinutes escalationAfterMinutes } }`;
const GET_TICKETS = `query { itsmTickets { id ticketNumber title status priority slaResponseDue slaResolutionDue slaBreached assignedTo assignedTeam createdAt } }`;
const GET_AGENTS = `query { itsmAgents { id data } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };

/* ── escalation level definitions ──────────────── */
const LEVELS = [
    { level: 0, label: 'Auto-assign', role: 'System', icon: <SafetyCertificateOutlined />, color: '#52c41a', pct: 0 },
    { level: 1, label: 'Agent', role: 'First Responder', icon: <UserOutlined />, color: '#fadb14', pct: 0 },
    { level: 2, label: 'Team Lead', role: 'Team Lead', icon: <TeamOutlined />, color: '#fa8c16', pct: 50 },
    { level: 3, label: 'Manager', role: 'Manager', icon: <CrownOutlined />, color: '#f5222d', pct: 75 },
    { level: 4, label: 'Director', role: 'Director', icon: <FireOutlined />, color: '#820014', pct: 100 },
];

function getEscalationLevel(ticket: any, policies: any[]): number {
    if (['resolved', 'closed'].includes(ticket.status)) return -1;
    const policy = policies.find(p => p.priority === ticket.priority);
    if (!policy) return 0;
    const elapsed = dayjs().diff(dayjs(ticket.createdAt), 'minute');
    const resMin = policy.resolutionTimeMinutes || 480;
    if (ticket.slaBreached || elapsed >= resMin) return 4;
    if (elapsed >= resMin * 0.75) return 3;
    if (elapsed >= resMin * 0.50) return 2;
    if (elapsed >= (policy.responseTimeMinutes || 60)) return 1;
    return 0;
}

function fmtMinutes(m: number): string {
    if (!m || m <= 0) return '—';
    if (m < 60) return `${Math.round(m)}m`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

const DEFAULT_RULES: Record<string, { l1: number; l2: number; targets: string }> = {
    critical: { l1: 15, l2: 30, targets: 'manager@company.com' },
    high: { l1: 30, l2: 60, targets: 'teamlead@company.com' },
    medium: { l1: 120, l2: 240, targets: 'teamlead@company.com' },
    low: { l1: 480, l2: 960, targets: 'agent@company.com' },
};

const LS_KEY = 'itsm_escalation_rules';

function loadRules(): typeof DEFAULT_RULES {
    if (typeof window === 'undefined') return DEFAULT_RULES;
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : DEFAULT_RULES; } catch { return DEFAULT_RULES; }
}

/* ── component ────────────────────────────────── */
export default function EscalationMatrixPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [rules, setRules] = useState<typeof DEFAULT_RULES>(DEFAULT_RULES);

    useEffect(() => { setRules(loadRules()); }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, p, a] = await Promise.all([gql(GET_TICKETS), gql(GET_SLA_POLICIES), gql(GET_AGENTS)]);
            setTickets(t.itsmTickets || []);
            setPolicies(p.itsmSlaPolicies || []);
            setAgents(a.itsmAgents || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── computed: active escalations ────────────── */
    const escalatedTickets = useMemo(() => {
        return tickets
            .map(t => ({ ...t, escLevel: getEscalationLevel(t, policies) }))
            .filter(t => t.escLevel >= 1)
            .sort((a, b) => b.escLevel - a.escLevel);
    }, [tickets, policies]);

    /* ── computed: escalation history (4 weeks) ──── */
    const historyData = useMemo(() => {
        const weeks: { week: string; L1: number; L2: number; L3: number; L4: number }[] = [];
        for (let w = 3; w >= 0; w--) {
            const start = dayjs().subtract(w, 'week').startOf('week');
            const end = start.endOf('week');
            const label = start.format('MMM DD');
            const inRange = tickets.filter(t => {
                const d = dayjs(t.createdAt);
                return d.isAfter(start) && d.isBefore(end);
            });
            const counts = { L1: 0, L2: 0, L3: 0, L4: 0 };
            inRange.forEach(t => {
                const lv = getEscalationLevel(t, policies);
                if (lv === 1) counts.L1++;
                else if (lv === 2) counts.L2++;
                else if (lv === 3) counts.L3++;
                else if (lv >= 4) counts.L4++;
            });
            weeks.push({ week: label, ...counts });
        }
        return weeks;
    }, [tickets, policies]);

    /* ── stats ───────────────────────────────────── */
    const avgLevel = escalatedTickets.length > 0
        ? +(escalatedTickets.reduce((s, t) => s + t.escLevel, 0) / escalatedTickets.length).toFixed(1)
        : 0;
    const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status));
    const escalationRate = openTickets.length > 0
        ? Math.round((escalatedTickets.length / openTickets.length) * 100)
        : 0;
    const priorityCounts = escalatedTickets.reduce<Record<string, number>>((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1; return acc;
    }, {});
    const mostEscalated = Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const stats = [
        { title: 'Active Escalations', value: escalatedTickets.length, icon: <AlertOutlined />, color: '#f5222d' },
        { title: 'Avg Escalation Level', value: avgLevel, icon: <ThunderboltOutlined />, color: '#fa8c16' },
        { title: 'Most Escalated', value: (mostEscalated || '').charAt(0).toUpperCase() + (mostEscalated || '').slice(1), icon: <FireOutlined />, color: '#722ed1' },
        { title: 'Escalation Rate', value: `${escalationRate}%`, icon: <WarningOutlined />, color: '#1890ff' },
    ];

    /* ── rules handlers ─────────────────────────── */
    const saveRules = () => { localStorage.setItem(LS_KEY, JSON.stringify(rules)); messageApi.success('Escalation rules saved'); };
    const resetRules = () => { setRules(DEFAULT_RULES); localStorage.removeItem(LS_KEY); messageApi.info('Rules reset to defaults'); };
    const updateRule = (prio: string, field: string, val: any) => setRules(prev => ({ ...prev, [prio]: { ...prev[prio], [field]: val } }));

    /* ── table columns ──────────────────────────── */
    const escColumns = [
        { title: 'Ticket #', dataIndex: 'ticketNumber', width: 110, render: (v: string) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (v: string) => <Tag color={priorityColors[v]}>{(v || '').toUpperCase()}</Tag> },
        {
            title: 'Level', dataIndex: 'escLevel', width: 100, render: (v: number) => {
                const lv = LEVELS[v] || LEVELS[4];
                return <Tag color={lv.color} style={v >= 3 ? { animation: 'pulse-esc 1.5s infinite' } : undefined}>{lv.icon} L{v}</Tag>;
            },
        },
        {
            title: 'Time in Level', key: 'elapsed', width: 120, render: (_: any, r: any) => {
                const elapsed = dayjs().diff(dayjs(r.createdAt), 'minute');
                return <Text style={{ fontSize: 12 }}>{fmtMinutes(elapsed)}</Text>;
            },
        },
        { title: 'Assigned To', dataIndex: 'assignedTo', width: 130, render: (v: string) => v || <Text type="secondary">Unassigned</Text> },
        { title: 'Team', dataIndex: 'assignedTeam', width: 120, render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
    ];

    const policyColumns = [
        { title: 'Priority', dataIndex: 'priority', width: 100, render: (v: string) => <Tag color={priorityColors[v]} style={{ fontWeight: 600 }}>{(v || '').toUpperCase()}</Tag> },
        { title: 'Response Time', dataIndex: 'responseTimeMinutes', width: 130, render: (v: number) => <Space><ClockCircleOutlined style={{ color: '#1890ff' }} />{fmtMinutes(v)}</Space> },
        { title: 'Resolution Time', dataIndex: 'resolutionTimeMinutes', width: 140, render: (v: number) => <Space><ClockCircleOutlined style={{ color: '#52c41a' }} />{fmtMinutes(v)}</Space> },
        { title: 'Escalation After', dataIndex: 'escalationAfterMinutes', width: 140, render: (v: number) => v ? <Space><WarningOutlined style={{ color: '#fa8c16' }} />{fmtMinutes(v)}</Space> : '—' },
        {
            title: 'Time Bar', key: 'bar', width: 200, render: (_: any, r: any) => {
                const max = r.resolutionTimeMinutes || 1;
                const respPct = Math.min(((r.responseTimeMinutes || 0) / max) * 100, 100);
                const escPct = Math.min(((r.escalationAfterMinutes || 0) / max) * 100, 100);
                return (
                    <div style={{ height: 10, borderRadius: 5, background: '#f0f0f0', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #52c41a, #fadb14, #fa8c16, #f5222d)' }} />
                        <Tooltip title={`Response: ${fmtMinutes(r.responseTimeMinutes)}`}>
                            <div style={{ position: 'absolute', left: `${respPct}%`, top: -2, width: 2, height: 14, background: '#1890ff' }} />
                        </Tooltip>
                        {r.escalationAfterMinutes > 0 && (
                            <Tooltip title={`Escalation: ${fmtMinutes(r.escalationAfterMinutes)}`}>
                                <div style={{ position: 'absolute', left: `${escPct}%`, top: -2, width: 2, height: 14, background: '#f5222d' }} />
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
    ];

    /* ── render ───────────────────────────────────── */
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#f5222d", "#fa8c16"]}>Escalation Matrix</AuroraText>}
            subTitle={<DecryptedText text="Visual escalation path configuration & monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="refresh" icon={<ReloadOutlined spin={loading} />} onClick={loadData}>Refresh</Button>]}
        >
            {ctx}
            <style>{`@keyframes pulse-esc { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

            {/* ─── 1. Escalation Pipeline Visualization ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card size="small" title={<Space><ThunderboltOutlined style={{ color: themeColor }} /> Escalation Path</Space>} style={{ ...glass, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
                        {LEVELS.map((lv, i) => (
                            <React.Fragment key={lv.level}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    style={{
                                        minWidth: 130, padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                                        background: `${lv.color}12`, border: `2px solid ${lv.color}40`,
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ fontSize: 22, color: lv.color, marginBottom: 4 }}>{lv.icon}</div>
                                    <Text strong style={{ fontSize: 13, display: 'block' }}>L{lv.level}: {lv.label}</Text>
                                    <Text style={{ fontSize: 10, color: '#888', display: 'block' }}>{lv.role}</Text>
                                    <Tag color={lv.color} style={{ marginTop: 6, fontSize: 10 }}>
                                        {lv.level === 0 ? 'On Create' : lv.level === 1 ? 'Response SLA' : `${lv.pct}% Resolution`}
                                    </Tag>
                                    <Badge count={escalatedTickets.filter(t => t.escLevel === lv.level).length} style={{ backgroundColor: lv.color, position: 'absolute', top: -6, right: -6 }} />
                                </motion.div>
                                {i < LEVELS.length - 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                                        <div style={{ width: 32, height: 3, background: `linear-gradient(90deg, ${lv.color}, ${LEVELS[i + 1].color})`, borderRadius: 2 }} />
                                        <ArrowRightOutlined style={{ color: LEVELS[i + 1].color, fontSize: 12 }} />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* ─── 2. Stats Cards ────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {stats.map((s, i) => (
                    <Col xs={12} sm={6} key={s.title}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                <Statistic title={<Text style={{ fontSize: 10 }}>{s.title}</Text>} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 22 }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── 3. SLA Policy Matrix ──────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card size="small" title={<Space><SettingOutlined style={{ color: themeColor }} /> SLA Policy Matrix <Badge count={policies.length} style={{ backgroundColor: themeColor }} /></Space>} style={{ ...glass, marginBottom: 16 }}>
                    <Table dataSource={policies} columns={policyColumns} rowKey="id" size="small" pagination={false} loading={loading} scroll={{ x: 700 }} />
                </Card>
            </motion.div>

            {/* ─── 4. Active Escalations ─────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card
                    size="small"
                    title={<Space><FireOutlined style={{ color: '#f5222d' }} /> Active Escalations <Badge count={escalatedTickets.length} style={{ backgroundColor: '#f5222d' }} /></Space>}
                    style={{ ...glass, marginBottom: 16 }}
                >
                    <Table
                        dataSource={escalatedTickets.slice(0, 20)}
                        columns={escColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        loading={loading}
                        scroll={{ x: 900 }}
                        onRow={(r) => ({ style: { cursor: 'pointer' }, onClick: () => router.push(`/admin/itsm/tickets/${r.id}`) })}
                    />
                </Card>
            </motion.div>

            {/* ─── 5. Escalation History Chart ────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card size="small" title={<Space><WarningOutlined style={{ color: '#fa8c16' }} /> Escalation History (Last 4 Weeks)</Space>} style={{ ...glass, marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={historyData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="L1" stackId="a" fill="#fadb14" name="Level 1" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="L2" stackId="a" fill="#fa8c16" name="Level 2" />
                            <Bar dataKey="L3" stackId="a" fill="#f5222d" name="Level 3" />
                            <Bar dataKey="L4" stackId="a" fill="#820014" name="Level 4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </motion.div>

            {/* ─── 6. Escalation Rules Config ─────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card
                    size="small"
                    title={<Space><SettingOutlined style={{ color: '#722ed1' }} /> Escalation Rules Configuration</Space>}
                    extra={<Space><Button size="small" icon={<UndoOutlined />} onClick={resetRules}>Reset</Button><Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveRules}>Save</Button></Space>}
                    style={{ ...glass, marginBottom: 16 }}
                >
                    <Collapse
                        accordion
                        items={['critical', 'high', 'medium', 'low'].map(prio => ({
                            key: prio,
                            label: <Space><Tag color={priorityColors[prio]} style={{ fontWeight: 600 }}>{prio.toUpperCase()}</Tag> Escalation Rules</Space>,
                            children: (
                                <Row gutter={16}>
                                    <Col xs={24} sm={8}>
                                        <Text style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Level 1 After (min)</Text>
                                        <InputNumber min={1} value={rules[prio]?.l1} onChange={v => updateRule(prio, 'l1', v || 15)} style={{ width: '100%' }} />
                                    </Col>
                                    <Col xs={24} sm={8}>
                                        <Text style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Level 2 After (min)</Text>
                                        <InputNumber min={1} value={rules[prio]?.l2} onChange={v => updateRule(prio, 'l2', v || 60)} style={{ width: '100%' }} />
                                    </Col>
                                    <Col xs={24} sm={8}>
                                        <Text style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Notification Targets</Text>
                                        <Input value={rules[prio]?.targets} onChange={e => updateRule(prio, 'targets', e.target.value)} placeholder="email or role" />
                                    </Col>
                                </Row>
                            ),
                        }))}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
