"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import {
    Card, Row, Col, Statistic, Tag, Table, Space, Progress, message,
    Typography, Button, Tooltip, Badge, Avatar, Select, Collapse,
} from "antd";
import {
    TeamOutlined, UserOutlined, ClockCircleOutlined, WarningOutlined,
    ReloadOutlined, DashboardOutlined, CheckCircleOutlined,
    SortAscendingOutlined, InboxOutlined, CaretRightOutlined,
    ThunderboltOutlined, FireOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, Legend,
} from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const REFRESH_MS = 30_000;
const priorityColors: Record<string, string> = {
    critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a',
};
const DONUT_COLORS = [
    '#1890ff', '#52c41a', '#fa8c16', '#722ed1',
    '#13c2c2', '#f5222d', '#9254de', '#eb2f96',
];
const roleColors: Record<string, string> = {
    team_lead: 'gold', senior_agent: 'blue', agent: 'green',
    specialist: 'purple', manager: 'red',
};
const shiftIcons: Record<string, string> = {
    day: '☀️', night: '🌙', swing: '🔄', flexible: '📍',
};

/* ── GraphQL queries ──────────────────────────────── */
const GET_TICKETS = `
  query {
    itsmTickets {
      id ticketNumber title status priority impact
      assignedTo assignedTeam
      slaResponseDue slaResolutionDue slaBreached
      createdAt resolvedAt
    }
  }
`;

const GET_AGENTS = `
  query {
    itsmAgents {
      id data
    }
  }
`;

const GET_AGENT_WORKLOAD = `
  query {
    itsmAgentWorkload {
      id data
    }
  }
`;

const UPDATE_TICKET = `
  mutation($id: ID!, $input: UpdateItsmTicketInput!) {
    updateItsmTicket(id: $id, input: $input) { id assignedTo }
  }
`;

/* ── helpers ──────────────────────────────────────── */
function hashColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = name.charCodeAt(i) + ((h << 5) - h);
    }
    const palette = [
        '#1890ff', '#52c41a', '#fa8c16', '#722ed1',
        '#13c2c2', '#eb2f96', '#9254de', '#f5222d',
    ];
    return palette[Math.abs(h) % palette.length];
}

function initials(name: string): string {
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function parseAgent(rec: any): any {
    const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data || {};
    return {
        id: rec.id,
        name: d.name || 'Unknown',
        email: d.email,
        role: d.role || 'agent',
        team: d.team || 'General',
        status: d.status || 'offline',
        skills: d.skills || [],
        shift: d.shift || 'day',
        capacity: d.capacity || d.max_tickets || 10,
        currentLoad: d.currentLoad ?? d.current_ticket_count ?? 0,
        slaCompliance: d.sla_compliance_pct ?? d.slaCompliance ?? 0,
        avgResolutionHours: d.avg_resolution_hours ?? 0,
        totalResolved: d.total_tickets_resolved ?? 0,
        csat: d.customer_satisfaction_score ?? 0,
    };
}

function utilColor(pct: number): string {
    if (pct > 80) return '#f5222d';
    if (pct > 60) return '#fa8c16';
    return '#52c41a';
}

/* ── component ────────────────────────────────────── */
export default function AgentWorkloadPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const glassCard = {
        background: isDark ? 'rgba(30,30,40,0.65)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.45)',
        borderRadius: 14,
    };

    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [sortMode, setSortMode] = useState<'most' | 'least' | 'alpha'>('most');
    const [filterTeam, setFilterTeam] = useState<string | undefined>(undefined);

    /* ── data fetch ──────────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, a, w] = await Promise.all([
                gql(GET_TICKETS),
                gql(GET_AGENTS).catch(() => ({ itsmAgents: [] })),
                gql(GET_AGENT_WORKLOAD).catch(() => ({ itsmAgentWorkload: [] })),
            ]);
            setTickets(t.itsmTickets || []);
            // Merge agents from both queries, dedup by id
            const raw = [...(a.itsmAgents || []), ...(w.itsmAgentWorkload || [])];
            const seen = new Set<string>();
            const parsed: any[] = [];
            raw.forEach(r => {
                if (!seen.has(r.id)) {
                    seen.add(r.id);
                    parsed.push(parseAgent(r));
                }
            });
            setAgents(parsed);
            setLastRefresh(Date.now());
        } catch (err: any) {
            messageApi.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    /* auto-refresh every 30s */
    useEffect(() => {
        const id = setInterval(loadData, REFRESH_MS);
        return () => clearInterval(id);
    }, [loadData]);

    /* "last updated X seconds ago" ticker */
    useEffect(() => {
        const id = setInterval(
            () => setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000)),
            1000,
        );
        return () => clearInterval(id);
    }, [lastRefresh]);

    /* ── quick assign mutation ───────────────────── */
    const handleAssign = async (ticketId: string, agentName: string) => {
        try {
            await gql(UPDATE_TICKET, { id: ticketId, input: { assignedTo: agentName } });
            messageApi.success(`Assigned to ${agentName}`);
            loadData();
        } catch (err: any) {
            messageApi.error(err.message);
        }
    };

    /* ── computed values ─────────────────────────── */
    const openTickets = useMemo(
        () => tickets.filter(t => !['resolved', 'closed'].includes(t.status)),
        [tickets],
    );

    const onlineAgents = useMemo(
        () => agents.filter(a => a.status === 'online' || a.status === 'active'),
        [agents],
    );

    const avgUtil = onlineAgents.length > 0
        ? Math.round(
            onlineAgents.reduce(
                (s, a) => s + (a.capacity > 0 ? (a.currentLoad / a.capacity) * 100 : 0), 0,
            ) / onlineAgents.length,
        )
        : 0;

    const unassigned = useMemo(
        () => openTickets.filter(t => !t.assignedTo),
        [openTickets],
    );

    const slaAtRisk = useMemo(() => openTickets.filter(t => {
        if (t.slaBreached) return true;
        const due = t.slaResolutionDue || t.slaResponseDue;
        if (!due) return false;
        const mins = dayjs(due).diff(dayjs(), 'minute');
        return mins > 0 && mins < 60;
    }).length, [openTickets]);

    const teams = useMemo(
        () => [...new Set(agents.map(a => a.team).filter(Boolean))],
        [agents],
    );

    /* filtered & sorted agent list */
    const filteredAgents = useMemo(() => {
        let list = filterTeam ? agents.filter(a => a.team === filterTeam) : agents;
        if (sortMode === 'most') {
            list = [...list].sort((a, b) =>
                (b.currentLoad / (b.capacity || 1)) - (a.currentLoad / (a.capacity || 1)),
            );
        } else if (sortMode === 'least') {
            list = [...list].sort((a, b) =>
                (a.currentLoad / (a.capacity || 1)) - (b.currentLoad / (b.capacity || 1)),
            );
        } else {
            list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        }
        return list;
    }, [agents, sortMode, filterTeam]);

    /* workload heatmap: stacked bars by priority */
    const heatmapData = useMemo(() => {
        return filteredAgents.map(a => {
            const at = openTickets.filter(t => t.assignedTo === a.name);
            return {
                name: a.name.split(' ')[0],
                critical: at.filter(t => t.priority === 'critical').length,
                high: at.filter(t => t.priority === 'high').length,
                medium: at.filter(t => t.priority === 'medium').length,
                low: at.filter(t => t.priority === 'low').length,
                capacity: a.capacity,
            };
        });
    }, [filteredAgents, openTickets]);

    /* ticket distribution by team (donut chart) */
    const teamDistribution = useMemo(() => {
        const map: Record<string, number> = {};
        openTickets.forEach(t => {
            const team = t.assignedTeam || 'Unassigned';
            map[team] = (map[team] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [openTickets]);

    /* agent performance table data */
    const perfData = useMemo(() => {
        const thisWeekStart = dayjs().startOf('week');
        return agents.map(a => {
            const agentOpen = openTickets.filter(t => t.assignedTo === a.name).length;
            const agentResolved = tickets.filter(
                t => t.assignedTo === a.name && t.resolvedAt && dayjs(t.resolvedAt).isAfter(thisWeekStart),
            ).length;
            const resolvedTickets = tickets.filter(t => t.assignedTo === a.name && t.resolvedAt);
            const avgRes = resolvedTickets.length > 0
                ? +(resolvedTickets.reduce(
                    (s, t) => s + dayjs(t.resolvedAt).diff(dayjs(t.createdAt), 'hour', true), 0,
                ) / resolvedTickets.length).toFixed(1)
                : 0;
            const util = a.capacity > 0 ? Math.round((a.currentLoad / a.capacity) * 100) : 0;
            return { ...a, agentOpen, agentResolved, avgRes, util };
        });
    }, [agents, tickets, openTickets]);

    /* team capacity summary */
    const teamSummary = useMemo(() => {
        return teams.map(team => {
            const tAgents = agents.filter(a => a.team === team);
            const online = tAgents.filter(a => a.status === 'online' || a.status === 'active').length;
            const totalCap = tAgents.reduce((s, a) => s + a.capacity, 0);
            const totalLoad = tAgents.reduce((s, a) => s + a.currentLoad, 0);
            const pct = totalCap > 0 ? Math.round((totalLoad / totalCap) * 100) : 0;
            return { team, agents: tAgents.length, online, totalCap, totalLoad, pct };
        });
    }, [agents, teams]);

    /* ── KPI stat cards ──────────────────────────── */
    const kpis = [
        { title: 'Agents Online', value: onlineAgents.length, icon: <TeamOutlined />, color: '#3b82f6' },
        { title: 'Avg Utilization', value: `${avgUtil}%`, icon: <DashboardOutlined />, color: utilColor(avgUtil) },
        { title: 'Unassigned', value: unassigned.length, icon: <InboxOutlined />, color: unassigned.length > 0 ? '#fa8c16' : '#52c41a' },
        { title: 'SLA At Risk', value: slaAtRisk, icon: <WarningOutlined />, color: slaAtRisk > 0 ? '#f5222d' : '#52c41a' },
    ];

    /* ── performance table columns ───────────────── */
    const perfColumns = [
        {
            title: 'Agent', dataIndex: 'name',
            render: (v: string) => (
                <Space>
                    <Avatar size="small" style={{ backgroundColor: hashColor(v) }}>{initials(v)}</Avatar>
                    <Text strong>{v}</Text>
                </Space>
            ),
        },
        { title: 'Team', dataIndex: 'team', width: 120, render: (v: string) => <Tag>{v}</Tag> },
        {
            title: 'Open', dataIndex: 'agentOpen', width: 70,
            sorter: (a: any, b: any) => a.agentOpen - b.agentOpen,
        },
        {
            title: 'Resolved (wk)', dataIndex: 'agentResolved', width: 115,
            sorter: (a: any, b: any) => a.agentResolved - b.agentResolved,
        },
        {
            title: 'Avg Res (h)', dataIndex: 'avgRes', width: 105,
            sorter: (a: any, b: any) => a.avgRes - b.avgRes,
            render: (v: number) => v > 0 ? `${v}h` : '—',
        },
        {
            title: 'SLA %', dataIndex: 'slaCompliance', width: 110,
            sorter: (a: any, b: any) => a.slaCompliance - b.slaCompliance,
            render: (v: number) => (
                <Progress
                    percent={v} size="small"
                    strokeColor={v >= 95 ? '#52c41a' : v >= 85 ? '#fa8c16' : '#f5222d'}
                    format={p => `${p}%`}
                />
            ),
        },
        {
            title: 'Utilization', dataIndex: 'util', width: 120,
            sorter: (a: any, b: any) => a.util - b.util,
            render: (v: number) => (
                <Progress
                    percent={v} size="small"
                    status={v > 80 ? 'exception' : v > 60 ? 'active' : 'success'}
                />
            ),
        },
        {
            title: 'CSAT', dataIndex: 'csat', width: 80,
            sorter: (a: any, b: any) => a.csat - b.csat,
            render: (v: number) => v > 0
                ? <Tag color={v >= 4.5 ? 'green' : v >= 4 ? 'blue' : 'orange'}>⭐{v}</Tag>
                : '—',
        },
    ];

    /* ── unassigned ticket queue columns ──────────── */
    const unassignedCols = [
        {
            title: 'Ticket #', dataIndex: 'ticketNumber', width: 110,
            render: (v: string) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{v}</Tag>,
        },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        {
            title: 'Priority', dataIndex: 'priority', width: 90,
            render: (v: string) => <Tag color={priorityColors[v]}>{(v || '').toUpperCase()}</Tag>,
        },
        {
            title: 'Created', dataIndex: 'createdAt', width: 130,
            render: (v: string) => v ? dayjs(v).format('MMM DD HH:mm') : '—',
        },
        {
            title: 'Waiting', key: 'wait', width: 100,
            render: (_: any, r: any) => (
                <Text type="secondary">{dayjs(r.createdAt).fromNow(true)}</Text>
            ),
        },
        {
            title: 'Quick Assign', key: 'assign', width: 190,
            render: (_: any, r: any) => (
                <Select
                    size="small"
                    placeholder="Assign..."
                    style={{ width: '100%' }}
                    onChange={(v: string) => handleAssign(r.id, v)}
                    options={onlineAgents.map(a => ({
                        value: a.name,
                        label: `${a.name} (${a.currentLoad}/${a.capacity})`,
                    }))}
                />
            ),
        },
    ];

    /* ── render ───────────────────────────────────── */
    return (
        <CMSLayout
            title={
                <AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>
                    Agent Workload
                </AuroraText>
            }
            subTitle={
                <DecryptedText
                    text="Real-time agent capacity, ticket distribution & performance"
                    animateOn="view" revealDirection="center" speed={40}
                    maxIterations={15} sequential
                />
            }
            extra={[
                <Tooltip key="ago" title="Auto-refreshes every 30 seconds">
                    <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                        <ClockCircleOutlined /> Updated {secondsAgo}s ago
                    </Text>
                </Tooltip>,
                <Button key="refresh" icon={<ReloadOutlined spin={loading} />} onClick={loadData}>
                    Refresh
                </Button>,
            ]}
        >
            {ctx}

            {/* ─── 1. Team Overview Stats ─────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {kpis.map((k, i) => (
                    <Col xs={12} sm={6} key={k.title}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${k.color}` }}>
                                <Statistic
                                    title={k.title}
                                    value={k.value}
                                    prefix={k.icon}
                                    valueStyle={{ color: k.color }}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ─── Team Capacity Summary ──────────────── */}
            {teamSummary.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {teamSummary.map((ts, i) => (
                            <Col xs={12} sm={8} md={6} key={ts.team}>
                                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${utilColor(ts.pct)}` }}
                                    bodyStyle={{ padding: '10px 14px' }}>
                                    <Text strong style={{ fontSize: 13 }}>{ts.team}</Text>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{ts.online}/{ts.agents} online</Text>
                                        <Text style={{ fontSize: 11, color: utilColor(ts.pct) }}>{ts.totalLoad}/{ts.totalCap}</Text>
                                    </div>
                                    <Progress percent={ts.pct} size="small" strokeColor={utilColor(ts.pct)} showInfo={false} />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </motion.div>
            )}

            {/* ─── 2. Agent Capacity Grid ─────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card
                    size="small"
                    style={{ ...glassCard, marginBottom: 16 }}
                    title={
                        <Space>
                            <TeamOutlined style={{ color: themeColor }} />
                            Agent Capacity
                            <Badge count={agents.length} style={{ backgroundColor: themeColor }} />
                        </Space>
                    }
                    extra={
                        <Space>
                            <Select size="small" placeholder="Team" allowClear style={{ width: 140 }}
                                value={filterTeam} onChange={setFilterTeam}
                                options={teams.map(t => ({ value: t, label: t }))} />
                            <Select size="small" value={sortMode} style={{ width: 150 }}
                                onChange={setSortMode} prefix={<SortAscendingOutlined />}
                                options={[
                                    { value: 'most', label: 'Most Loaded' },
                                    { value: 'least', label: 'Least Loaded' },
                                    { value: 'alpha', label: 'Alphabetical' },
                                ]} />
                        </Space>
                    }
                >
                    <Row gutter={[12, 12]}>
                        {filteredAgents.map((a, i) => {
                            const pct = a.capacity > 0 ? Math.round((a.currentLoad / a.capacity) * 100) : 0;
                            const barColor = utilColor(pct);
                            const statusColor = (a.status === 'online' || a.status === 'active')
                                ? '#52c41a' : a.status === 'busy' ? '#fa8c16' : '#bfbfbf';
                            const agentTickets = openTickets.filter(t => t.assignedTo === a.name).length;

                            return (
                                <Col xs={24} sm={12} md={8} lg={6} key={a.id}>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        whileHover={{ scale: 1.02 }}
                                        style={{ height: '100%' }}
                                    >
                                        <Card
                                            size="small"
                                            style={{ ...glassCard, height: '100%', borderLeft: `3px solid ${barColor}` }}
                                            bodyStyle={{ padding: '12px 14px' }}
                                        >
                                            {/* Agent header */}
                                            <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                                                <Space>
                                                    <Badge dot color={statusColor} offset={[-4, 28]}>
                                                        <Avatar size={32} style={{ backgroundColor: hashColor(a.name), fontSize: 13 }}>
                                                            {initials(a.name)}
                                                        </Avatar>
                                                    </Badge>
                                                    <div>
                                                        <Text strong style={{ fontSize: 13 }}>{a.name}</Text>
                                                        <div>
                                                            <Tag color={roleColors[a.role] || 'blue'}
                                                                style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                                                                {(a.role || '').replace(/_/g, ' ')}
                                                            </Tag>{' '}
                                                            <Tag style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                                                                {a.team}
                                                            </Tag>
                                                        </div>
                                                    </div>
                                                </Space>
                                                <div style={{ textAlign: 'right' }}>
                                                    {a.slaCompliance > 0 && (
                                                        <Tag color={a.slaCompliance >= 95 ? 'green' : a.slaCompliance >= 85 ? 'orange' : 'red'}
                                                            style={{ fontSize: 10, marginBottom: 2 }}>
                                                            {a.slaCompliance}%
                                                        </Tag>
                                                    )}
                                                    <div style={{ fontSize: 10, color: '#999' }}>
                                                        {shiftIcons[a.shift] || '📍'} {a.shift}
                                                    </div>
                                                </div>
                                            </Space>

                                            {/* Capacity bar */}
                                            <Progress
                                                percent={pct} size="small" strokeColor={barColor}
                                                format={() => `${a.currentLoad}/${a.capacity}`}
                                            />

                                            {/* Tags */}
                                            <Space size={4} style={{ marginTop: 6, flexWrap: 'wrap' }}>
                                                <Tag style={{ fontSize: 10, margin: 0 }}>
                                                    <ThunderboltOutlined /> {agentTickets} active
                                                </Tag>
                                                {(a.skills || []).slice(0, 3).map((s: string) => (
                                                    <Tag key={s} color="default"
                                                        style={{ fontSize: 9, margin: 0, padding: '0 3px', lineHeight: '16px' }}>
                                                        {s}
                                                    </Tag>
                                                ))}
                                            </Space>
                                        </Card>
                                    </motion.div>
                                </Col>
                            );
                        })}
                        {filteredAgents.length === 0 && (
                            <Col span={24}>
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 32 }}>
                                    No agents found
                                </Text>
                            </Col>
                        )}
                    </Row>
                </Card>
            </motion.div>

            {/* ─── 3 & 4. Heatmap + Donut Charts ─────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {/* Workload Heatmap */}
                <Col xs={24} md={14}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Card size="small"
                            title={<Space><FireOutlined style={{ color: '#fa8c16' }} /> Workload Heatmap</Space>}
                            style={{ ...glassCard, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={Math.max(280, heatmapData.length * 38)}>
                                <BarChart data={heatmapData} layout="vertical" barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                                    <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="critical" stackId="a" fill="#f5222d" name="Critical" />
                                    <Bar dataKey="high" stackId="a" fill="#fa8c16" name="High" />
                                    <Bar dataKey="medium" stackId="a" fill="#1890ff" name="Medium" />
                                    <Bar dataKey="low" stackId="a" fill="#52c41a" name="Low" radius={[0, 4, 4, 0]} />
                                    {heatmapData.length > 0 && (
                                        <ReferenceLine
                                            x={heatmapData[0]?.capacity || 10}
                                            stroke="#f5222d" strokeDasharray="4 4"
                                            label={{ value: 'Capacity', fill: '#f5222d', fontSize: 10 }}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>

                {/* Ticket Distribution Donut */}
                <Col xs={24} md={10}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card size="small"
                            title={<Space><DashboardOutlined style={{ color: '#722ed1' }} /> Tickets by Team</Space>}
                            style={{ ...glassCard, height: '100%' }}>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={teamDistribution} dataKey="value" nameKey="name"
                                        cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                                        paddingAngle={3}
                                        label={({ name, value }) => `${name} (${value})`}
                                    >
                                        {teamDistribution.map((_, i) => (
                                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central"
                                        style={{ fontSize: 22, fontWeight: 700, fill: themeColor }}>
                                        {openTickets.length}
                                    </text>
                                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central"
                                        style={{ fontSize: 10, fill: '#999' }}>
                                        Total
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── 5. Agent Performance Table ─────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card size="small"
                    title={<Space><CheckCircleOutlined style={{ color: '#1890ff' }} /> Agent Performance</Space>}
                    style={{ ...glassCard, marginBottom: 16 }}>
                    <Table
                        dataSource={perfData}
                        columns={perfColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ x: 900 }}
                        loading={loading}
                        onRow={() => ({
                            style: { cursor: 'pointer' },
                            onClick: () => router.push('/admin/itsm/agents'),
                        })}
                    />
                </Card>
            </motion.div>

            {/* ─── 6. Unassigned Ticket Queue ─────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Collapse
                    ghost
                    expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                    items={[{
                        key: '1',
                        label: (
                            <Space>
                                <InboxOutlined style={{ color: '#fa8c16' }} />
                                <Text strong>Unassigned Ticket Queue</Text>
                                <Badge
                                    count={unassigned.length}
                                    style={{ backgroundColor: unassigned.length > 0 ? '#fa8c16' : '#52c41a' }}
                                />
                            </Space>
                        ),
                        children: (
                            <Card size="small" style={{ ...glassCard }}>
                                <Table
                                    dataSource={unassigned}
                                    columns={unassignedCols}
                                    rowKey="id"
                                    size="small"
                                    pagination={{ pageSize: 5, size: 'small' }}
                                    scroll={{ x: 800 }}
                                    loading={loading}
                                />
                            </Card>
                        ),
                    }]}
                    defaultActiveKey={unassigned.length > 0 ? ['1'] : []}
                    style={{ marginBottom: 16 }}
                />
            </motion.div>
        </CMSLayout>
    );
}
