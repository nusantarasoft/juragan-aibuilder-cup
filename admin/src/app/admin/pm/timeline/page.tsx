"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Typography, Space, Spin, Tag, Card, Row, Col, Statistic, Select,
    Tooltip, Progress, Empty, Badge
} from "antd";
import {
    CalendarOutlined, ProjectOutlined, CheckCircleOutlined,
    ClockCircleOutlined, FlagOutlined, ExclamationCircleOutlined,
    AimOutlined, ThunderboltOutlined, FieldTimeOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const GET_PROJECTS = `
  query GetProjects($tenantId: String!) {
    pmProjects(tenantId: $tenantId) {
      id name projectNumber status priority startDate endDate budget spent
    }
  }
`;

const GET_PORTFOLIO = `
  query GetPortfolioSummary($tenantId: String!) {
    pmPortfolioSummary(tenantId: $tenantId)
  }
`;

const STATUS_COLOR: Record<string, string> = {
    active: '#10b981',
    planning: '#6366f1',
    paused: '#f59e0b',
    completed: '#22c55e',
    cancelled: '#ef4444',
};

const PRIORITY_COLOR: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
};

export default function TimelinePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [portfolio, setPortfolio] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [projData, portData] = await Promise.all([
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_PORTFOLIO, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setProjects(projData.pmProjects || []);
            setPortfolio(portData.pmPortfolioSummary || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Merge project data with portfolio enrichment
    const enrichedProjects = useMemo(() => {
        const portMap = new Map<string, any>();
        portfolio.forEach(p => portMap.set(p.id, p));

        return projects
            .filter(p => p.startDate && p.endDate)
            .filter(p => !statusFilter || p.status === statusFilter)
            .sort((a, b) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix())
            .map(p => ({
                ...p,
                taskCounts: portMap.get(p.id)?.taskCounts || { total: 0, done: 0, inProgress: 0 },
            }));
    }, [projects, portfolio, statusFilter]);

    // Timeline range computation
    const timelineRange = useMemo(() => {
        if (enrichedProjects.length === 0) return { start: dayjs(), end: dayjs().add(6, 'month'), totalDays: 180 };
        const dates = enrichedProjects.map(p => ({ start: dayjs(p.startDate), end: dayjs(p.endDate) }));
        const start = dates.reduce((min, d) => d.start.isBefore(min) ? d.start : min, dates[0].start);
        const end = dates.reduce((max, d) => d.end.isAfter(max) ? d.end : max, dates[0].end);
        const paddedStart = start.subtract(7, 'day');
        const paddedEnd = end.add(7, 'day');
        return {
            start: paddedStart,
            end: paddedEnd,
            totalDays: paddedEnd.diff(paddedStart, 'day'),
        };
    }, [enrichedProjects]);

    // Generate month markers
    const monthMarkers = useMemo(() => {
        const markers: { label: string; leftPct: number }[] = [];
        let cursor = timelineRange.start.startOf('month');
        while (cursor.isBefore(timelineRange.end)) {
            const dayOffset = cursor.diff(timelineRange.start, 'day');
            const pct = timelineRange.totalDays > 0 ? (dayOffset / timelineRange.totalDays) * 100 : 0;
            if (pct >= 0 && pct <= 100) {
                markers.push({ label: cursor.format('MMM YYYY'), leftPct: pct });
            }
            cursor = cursor.add(1, 'month');
        }
        return markers;
    }, [timelineRange]);

    // Today marker
    const todayPct = useMemo(() => {
        const dayOffset = dayjs().diff(timelineRange.start, 'day');
        return timelineRange.totalDays > 0 ? Math.max(0, Math.min(100, (dayOffset / timelineRange.totalDays) * 100)) : 50;
    }, [timelineRange]);

    // Stats
    const withDates = projects.filter(p => p.startDate && p.endDate);
    const overdueProjects = withDates.filter(p => dayjs(p.endDate).isBefore(dayjs()) && p.status !== 'completed' && p.status !== 'cancelled');
    const activeProjects = projects.filter(p => p.status === 'active');
    const upcomingMilestones = withDates.filter(p => {
        const end = dayjs(p.endDate);
        return end.isAfter(dayjs()) && end.diff(dayjs(), 'day') <= 30 && p.status !== 'completed';
    });

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    if (loading) {
        return (
            <CMSLayout title="Timeline" subTitle="Cross-project Gantt-style timeline view">
                <div style={{ textAlign: 'center', padding: 120 }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title="Timeline" subTitle="Cross-project Gantt-style timeline view">
            {/* ── Stats ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #8b5cf6' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Projects with Timeline</span>}
                            value={withDates.length}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {projects.length}</Text>}
                            prefix={<CalendarOutlined style={{ color: '#8b5cf6' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #10b981' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Active Projects</span>}
                            value={activeProjects.length}
                            prefix={<ClockCircleOutlined style={{ color: '#10b981' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #ef4444' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Overdue</span>}
                            value={overdueProjects.length}
                            prefix={<ExclamationCircleOutlined style={{ color: '#ef4444' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #f59e0b' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Due in 30 Days</span>}
                            value={upcomingMilestones.length}
                            prefix={<FlagOutlined style={{ color: '#f59e0b' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── Filter ── */}
            <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                <Space size={12} wrap>
                    <Select
                        placeholder="Filter by status"
                        allowClear
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 180 }}
                        options={[
                            { label: 'Active', value: 'active' },
                            { label: 'Planning', value: 'planning' },
                            { label: 'Paused', value: 'paused' },
                            { label: 'Completed', value: 'completed' },
                            { label: 'Cancelled', value: 'cancelled' },
                        ]}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Showing {enrichedProjects.length} project{enrichedProjects.length !== 1 ? 's' : ''} with timeline data
                    </Text>
                </Space>
            </Card>

            {/* ── Timeline Chart ── */}
            <Card
                title={
                    <Space>
                        <FieldTimeOutlined style={{ color: '#8b5cf6' }} />
                        <span style={{ fontWeight: 600 }}>Project Timeline</span>
                        <Tag color="purple">{enrichedProjects.length}</Tag>
                    </Space>
                }
                style={glassCard}
            >
                {enrichedProjects.length === 0 ? (
                    <Empty description="No projects with timeline data. Set start and end dates on your projects." />
                ) : (
                    <div style={{ position: 'relative', minHeight: 100 }}>
                        {/* ── Month Headers ── */}
                        <div style={{
                            position: 'relative',
                            height: 32,
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                            marginBottom: 8,
                            marginLeft: 220,
                        }}>
                            {monthMarkers.map((m, i) => (
                                <div
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        left: `${m.leftPct}%`,
                                        bottom: 4,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: isDark ? '#94a3b8' : '#64748b',
                                        transform: 'translateX(-50%)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {m.label}
                                </div>
                            ))}
                        </div>

                        {/* ── Today Line ── */}
                        <div style={{
                            position: 'absolute',
                            left: `calc(220px + ${todayPct}% * (100% - 220px) / 100%)`,
                            top: 32,
                            bottom: 0,
                            width: 2,
                            background: 'linear-gradient(to bottom, #ef4444, transparent)',
                            zIndex: 10,
                            opacity: 0.7,
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#ef4444',
                                whiteSpace: 'nowrap',
                                background: isDark ? '#0f0f17' : '#fff',
                                padding: '1px 4px',
                                borderRadius: 3,
                            }}>
                                TODAY
                            </div>
                        </div>

                        {/* ── Project Bars ── */}
                        {enrichedProjects.map((project, idx) => {
                            const start = dayjs(project.startDate);
                            const end = dayjs(project.endDate);
                            const now = dayjs();
                            const startPct = timelineRange.totalDays > 0
                                ? Math.max(0, (start.diff(timelineRange.start, 'day') / timelineRange.totalDays) * 100)
                                : 0;
                            const widthPct = timelineRange.totalDays > 0
                                ? Math.max(1, (end.diff(start, 'day') / timelineRange.totalDays) * 100)
                                : 5;
                            const isOverdue = now.isAfter(end) && project.status !== 'completed' && project.status !== 'cancelled';
                            const tc = project.taskCounts;
                            const taskPct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
                            const barColor = STATUS_COLOR[project.status] || '#6b7280';
                            const daysRemaining = end.diff(now, 'day');

                            return (
                                <div
                                    key={project.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        height: 44,
                                        marginBottom: 4,
                                        cursor: 'pointer',
                                        borderRadius: 6,
                                        transition: 'background 0.15s ease',
                                        padding: '0 4px',
                                    }}
                                    onClick={() => router.push(`/admin/pm/dashboard?projectId=${project.id}`)}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLDivElement).style.background = isDark
                                            ? 'rgba(139,92,246,0.06)' : 'rgba(99,102,241,0.04)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                                    }}
                                >
                                    {/* Project label */}
                                    <div style={{ width: 212, flexShrink: 0, paddingRight: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Badge
                                                color={barColor}
                                                style={{ minWidth: 8 }}
                                            />
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: 12,
                                                    maxWidth: 150,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                title={project.name}
                                            >
                                                {project.name}
                                            </Text>
                                            {isOverdue && (
                                                <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 11 }} />
                                            )}
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 14 }}>
                                            {project.projectNumber}
                                        </Text>
                                    </div>

                                    {/* Bar area */}
                                    <div style={{ flex: 1, position: 'relative', height: 28 }}>
                                        <Tooltip
                                            title={
                                                <div style={{ fontSize: 12 }}>
                                                    <div><strong>{project.name}</strong></div>
                                                    <div>{start.format('MMM D, YYYY')} — {end.format('MMM D, YYYY')}</div>
                                                    <div>Status: {project.status} | Priority: {project.priority}</div>
                                                    <div>Tasks: {tc.done}/{tc.total} ({taskPct}%)</div>
                                                    {isOverdue
                                                        ? <div style={{ color: '#ef4444' }}>⚠ Overdue by {Math.abs(daysRemaining)} days</div>
                                                        : project.status !== 'completed' && <div>{daysRemaining} days remaining</div>
                                                    }
                                                </div>
                                            }
                                        >
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: `${startPct}%`,
                                                    width: `${Math.min(widthPct, 100 - startPct)}%`,
                                                    height: 24,
                                                    top: 2,
                                                    borderRadius: 6,
                                                    background: `linear-gradient(135deg, ${barColor}cc, ${barColor}88)`,
                                                    border: isOverdue ? '2px solid #ef4444' : `1px solid ${barColor}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    paddingLeft: 8,
                                                    overflow: 'hidden',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: `0 2px 8px ${barColor}22`,
                                                }}
                                            >
                                                {/* Progress fill */}
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: `${taskPct}%`,
                                                        background: `${barColor}44`,
                                                        borderRadius: '6px 0 0 6px',
                                                    }}
                                                />
                                                <Text
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        color: '#fff',
                                                        position: 'relative',
                                                        zIndex: 2,
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                    }}
                                                >
                                                    {taskPct}%
                                                </Text>
                                                <Tag
                                                    style={{
                                                        fontSize: 9,
                                                        marginLeft: 4,
                                                        position: 'relative',
                                                        zIndex: 2,
                                                        lineHeight: '14px',
                                                        height: 16,
                                                        border: 'none',
                                                        background: 'rgba(255,255,255,0.2)',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    {project.status}
                                                </Tag>
                                            </div>
                                        </Tooltip>
                                    </div>
                                </div>
                            );
                        })}

                        {/* ── Month grid lines ── */}
                        {monthMarkers.map((m, i) => (
                            <div
                                key={`grid-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: `calc(220px + ${m.leftPct}% * (100% - 220px) / 100%)`,
                                    top: 32,
                                    bottom: 0,
                                    width: 1,
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    zIndex: 0,
                                }}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {/* ── Legend ── */}
            <Card style={{ ...glassCard, marginTop: 16 }} size="small">
                <Space size={16} wrap>
                    <Text strong style={{ fontSize: 12 }}>Legend:</Text>
                    {Object.entries(STATUS_COLOR).map(([status, color]) => (
                        <Space key={status} size={4}>
                            <div style={{
                                width: 12, height: 12, borderRadius: 3,
                                background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
                            }} />
                            <Text style={{ fontSize: 11, textTransform: 'capitalize' }}>{status}</Text>
                        </Space>
                    ))}
                    <Space size={4}>
                        <div style={{
                            width: 2, height: 12, background: '#ef4444', borderRadius: 1,
                        }} />
                        <Text style={{ fontSize: 11, color: '#ef4444' }}>Today</Text>
                    </Space>
                </Space>
            </Card>
        </CMSLayout>
    );
}
