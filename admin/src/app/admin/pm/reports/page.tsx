"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Typography, Space, Spin, Tag, Card, Row, Col, Statistic, Table,
    Empty, Select, Tooltip, Progress, Divider, Button, message
} from "antd";
import {
    BarChartOutlined, ProjectOutlined, CheckCircleOutlined,
    ClockCircleOutlined, ExclamationCircleOutlined, DollarOutlined,
    TeamOutlined, FundProjectionScreenOutlined, DashboardOutlined,
    FireOutlined, AimOutlined, TrophyOutlined, WarningOutlined,
    RiseOutlined, FallOutlined, BulbOutlined, ThunderboltOutlined,
    NodeIndexOutlined, FileTextOutlined, SafetyCertificateOutlined,
    AlertOutlined, RocketOutlined, ForkOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title } = Typography;

const GET_PORTFOLIO = `
  query GetPortfolioSummary($tenantId: String!) {
    pmPortfolioSummary(tenantId: $tenantId)
  }
`;

const GET_ALL_TASKS = `
  query GetAllTasks($tenantId: String!) {
    pmTasks(tenantId: $tenantId) {
      id projectId status priority type assigneeId
      assignee { id firstName lastName }
      estimatedHours loggedHours dueDate createdAt
    }
  }
`;

const GENERATE_STATUS_REPORT = `
  query GenerateStatusReport($projectId: String!) {
    generateStatusReport(projectId: $projectId)
  }
`;

const GENERATE_CRITICAL_PATH = `
  query GenerateCriticalPath($projectId: String!) {
    generateCriticalPath(projectId: $projectId)
  }
`;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    active: { color: '#10b981', label: 'Active' },
    planning: { color: '#6366f1', label: 'Planning' },
    paused: { color: '#f59e0b', label: 'Paused' },
    completed: { color: '#22c55e', label: 'Completed' },
    cancelled: { color: '#ef4444', label: 'Cancelled' },
};

export default function ReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    // ── AI Feature State ──
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [statusReport, setStatusReport] = useState<any>(null);
    const [statusReportLoading, setStatusReportLoading] = useState(false);
    const [criticalPath, setCriticalPath] = useState<any>(null);
    const [criticalPathLoading, setCriticalPathLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [portData, taskData] = await Promise.all([
                gql(GET_PORTFOLIO, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_ALL_TASKS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setProjects(portData.pmPortfolioSummary || []);
            setTasks(taskData.pmTasks || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Computed Metrics ──
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;

    const totalTasks = tasks.length;
    const tasksDone = tasks.filter(t => t.status === 'done').length;
    const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;
    const tasksTodo = tasks.filter(t => t.status === 'todo').length;
    const tasksBlocked = tasks.filter(t => t.status === 'blocked').length;
    const tasksOverdue = tasks.filter(t =>
        t.dueDate && dayjs(t.dueDate).isBefore(dayjs()) && t.status !== 'done'
    ).length;

    const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((s, t) => s + (t.loggedHours || 0), 0);
    const effortVariance = totalEstimated > 0 ? Math.round(((totalLogged - totalEstimated) / totalEstimated) * 100) : 0;

    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0);
    const budgetVariance = totalBudget > 0 ? Math.round(((totalSpent - totalBudget) / totalBudget) * 100) : 0;

    // ── Priority Distribution ──
    const priorityDist = useMemo(() => {
        const buckets: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
        tasks.forEach(t => { if (buckets[t.priority] !== undefined) buckets[t.priority]++; });
        return buckets;
    }, [tasks]);

    // ── Type Distribution ──
    const typeDist = useMemo(() => {
        const buckets: Record<string, number> = {};
        tasks.forEach(t => { buckets[t.type] = (buckets[t.type] || 0) + 1; });
        return buckets;
    }, [tasks]);

    // ── Team Workload ──
    const teamWorkload = useMemo(() => {
        const map = new Map<string, { name: string; total: number; done: number; inProgress: number; hours: number }>();
        tasks.forEach(t => {
            const key = t.assigneeId || '__unassigned__';
            const name = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned';
            if (!map.has(key)) map.set(key, { name, total: 0, done: 0, inProgress: 0, hours: 0 });
            const entry = map.get(key)!;
            entry.total++;
            if (t.status === 'done') entry.done++;
            if (t.status === 'in_progress') entry.inProgress++;
            entry.hours += t.loggedHours || 0;
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [tasks]);

    // ── Project Health Scores ──
    const projectHealth = useMemo(() => {
        return projects
            .filter(p => p.status === 'active' || p.status === 'planning')
            .map(p => {
                const tc = p.taskCounts || { total: 0, done: 0, inProgress: 0 };
                const taskPct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;

                // Timeline health
                let timelineScore = 100;
                if (p.start_date && p.end_date) {
                    const totalDays = dayjs(p.end_date).diff(dayjs(p.start_date), 'day');
                    const elapsed = dayjs().diff(dayjs(p.start_date), 'day');
                    const timelinePct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
                    const gap = timelinePct - taskPct;
                    if (gap > 20) timelineScore = 40;
                    else if (gap > 10) timelineScore = 70;
                }

                // Budget health
                let budgetScore = 100;
                if (p.budget && p.budget > 0) {
                    const budgetPct = Math.round(((p.spent || 0) / p.budget) * 100);
                    if (budgetPct > 100) budgetScore = 20;
                    else if (budgetPct > 85) budgetScore = 60;
                }

                const overallScore = Math.round((taskPct * 0.4 + timelineScore * 0.3 + budgetScore * 0.3));

                return {
                    id: p.id,
                    name: p.name,
                    project_number: p.project_number,
                    status: p.status,
                    priority: p.priority,
                    taskPct,
                    timelineScore,
                    budgetScore,
                    overallScore,
                    taskCounts: tc,
                };
            })
            .sort((a, b) => a.overallScore - b.overallScore);
    }, [projects]);

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    // ── AI Handlers ──
    const handleGenerateStatusReport = async () => {
        if (!selectedProjectId) { messageApi.warning('Select a project first'); return; }
        setStatusReportLoading(true);
        try {
            const data = await gql(GENERATE_STATUS_REPORT, { projectId: selectedProjectId });
            setStatusReport(data.generateStatusReport);
            messageApi.success('Status report generated!');
        } catch {
            messageApi.error('AI status report failed. Check your AI service.');
        } finally {
            setStatusReportLoading(false);
        }
    };

    const handleGenerateCriticalPath = async () => {
        if (!selectedProjectId) { messageApi.warning('Select a project first'); return; }
        setCriticalPathLoading(true);
        try {
            const data = await gql(GENERATE_CRITICAL_PATH, { projectId: selectedProjectId });
            setCriticalPath(data.generateCriticalPath);
            messageApi.success('Critical path analysis generated!');
        } catch {
            messageApi.error('AI critical path failed. Check your AI service.');
        } finally {
            setCriticalPathLoading(false);
        }
    };

    const selectedProjectName = selectedProjectId
        ? projects.find(p => p.id === selectedProjectId)?.name || 'Selected Project'
        : null;

    const healthColumns = [
        {
            title: 'Project',
            dataIndex: 'name',
            key: 'name',
            render: (_: any, record: any) => (
                <div>
                    <a
                        onClick={() => router.push(`/admin/pm/dashboard?projectId=${record.id}`)}
                        style={{ fontWeight: 600, fontSize: 13 }}
                    >
                        {record.name}
                    </a>
                    <div style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#888' }}>
                        {record.project_number}
                    </div>
                </div>
            ),
        },
        {
            title: 'Health Score',
            dataIndex: 'overallScore',
            key: 'overallScore',
            width: 130,
            sorter: (a: any, b: any) => a.overallScore - b.overallScore,
            render: (score: number) => {
                const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Progress
                            type="circle"
                            percent={score}
                            size={36}
                            strokeColor={color}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                            format={() => (
                                <span style={{ fontSize: 10, fontWeight: 700, color }}>{score}</span>
                            )}
                        />
                    </div>
                );
            },
        },
        {
            title: 'Tasks',
            key: 'tasks',
            width: 120,
            render: (_: any, record: any) => (
                <div>
                    <Progress
                        percent={record.taskPct}
                        size="small"
                        strokeColor={record.taskPct >= 75 ? '#10b981' : record.taskPct >= 40 ? '#f59e0b' : '#6366f1'}
                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                    />
                    <Text type="secondary" style={{ fontSize: 10 }}>
                        {record.taskCounts.done}/{record.taskCounts.total}
                    </Text>
                </div>
            ),
        },
        {
            title: 'Timeline',
            key: 'timeline',
            width: 90,
            render: (_: any, record: any) => {
                const color = record.timelineScore >= 75 ? '#10b981' : record.timelineScore >= 50 ? '#f59e0b' : '#ef4444';
                const icon = record.timelineScore >= 75 ? <CheckCircleOutlined /> : record.timelineScore >= 50 ? <ClockCircleOutlined /> : <WarningOutlined />;
                return <Tag color={color} icon={icon} style={{ fontSize: 10 }}>{record.timelineScore}%</Tag>;
            },
        },
        {
            title: 'Budget',
            key: 'budget',
            width: 90,
            render: (_: any, record: any) => {
                const color = record.budgetScore >= 75 ? '#10b981' : record.budgetScore >= 50 ? '#f59e0b' : '#ef4444';
                const icon = record.budgetScore >= 75 ? <CheckCircleOutlined /> : record.budgetScore >= 50 ? <ClockCircleOutlined /> : <WarningOutlined />;
                return <Tag color={color} icon={icon} style={{ fontSize: 10 }}>{record.budgetScore}%</Tag>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 90,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status] || { color: '#6b7280', label: status };
                return <Tag color={cfg.color} style={{ textTransform: 'capitalize' as const, fontSize: 10 }}>{cfg.label}</Tag>;
            },
        },
    ];

    if (loading) {
        return (
            <CMSLayout title="Reports" subTitle="Portfolio analytics & insights">
                <div style={{ textAlign: 'center', padding: 120 }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title="Reports" subTitle="Portfolio analytics & insights">
            {contextHolder}

            {/* ── Executive Summary ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #6366f1' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 11 }}>Total Projects</span>}
                            value={totalProjects}
                            prefix={<ProjectOutlined style={{ color: themeColor }} />}
                            valueStyle={{ fontSize: 22, fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #10b981' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 11 }}>Task Completion</span>}
                            value={totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0}
                            suffix="%"
                            prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                            valueStyle={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #f59e0b' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 11 }}>Budget Used</span>}
                            value={totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}
                            suffix="%"
                            prefix={<DollarOutlined style={{ color: '#f59e0b' }} />}
                            valueStyle={{ fontSize: 22, fontWeight: 700, color: totalSpent > totalBudget ? '#ef4444' : '#f59e0b' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #ef4444' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 11 }}>Overdue Tasks</span>}
                            value={tasksOverdue}
                            prefix={<ExclamationCircleOutlined style={{ color: '#ef4444' }} />}
                            valueStyle={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: `3px solid ${themeColor}` }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 11 }}>Effort Variance</span>}
                            value={effortVariance}
                            suffix="%"
                            prefix={effortVariance > 0 ? <RiseOutlined style={{ color: '#ef4444' }} /> : <FallOutlined style={{ color: '#10b981' }} />}
                            valueStyle={{ fontSize: 22, fontWeight: 700, color: effortVariance > 0 ? '#ef4444' : '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #3b82f6' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 11 }}>Team Members</span>}
                            value={teamWorkload.filter(t => t.name !== 'Unassigned').length}
                            prefix={<TeamOutlined style={{ color: '#3b82f6' }} />}
                            valueStyle={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── Task Flow & Priority Distribution ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={14}>
                    <Card
                        title={<Space><BarChartOutlined style={{ color: themeColor }} /> Task Status Flow</Space>}
                        size="small"
                        style={glassCard}
                    >
                        <div style={{ display: 'flex', gap: 0, height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                            {[
                                { key: 'todo', count: tasksTodo, color: '#64748b', label: 'To Do' },
                                { key: 'in_progress', count: tasksInProgress, color: '#3b82f6', label: 'In Progress' },
                                { key: 'blocked', count: tasksBlocked, color: '#ef4444', label: 'Blocked' },
                                { key: 'done', count: tasksDone, color: '#10b981', label: 'Done' },
                            ].map(item => {
                                const pct = totalTasks > 0 ? (item.count / totalTasks) * 100 : 0;
                                if (pct === 0) return null;
                                return (
                                    <Tooltip key={item.key} title={`${item.label}: ${item.count} (${Math.round(pct)}%)`}>
                                        <div style={{
                                            width: `${pct}%`,
                                            background: item.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'width 0.3s ease',
                                        }}>
                                            {pct > 8 && (
                                                <Text style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>
                                                    {Math.round(pct)}%
                                                </Text>
                                            )}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                        </div>
                        <Space size={16} wrap>
                            {[
                                { label: 'To Do', count: tasksTodo, color: '#64748b' },
                                { label: 'In Progress', count: tasksInProgress, color: '#3b82f6' },
                                { label: 'Blocked', count: tasksBlocked, color: '#ef4444' },
                                { label: 'Done', count: tasksDone, color: '#10b981' },
                            ].map(item => (
                                <Space key={item.label} size={4}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                                    <Text style={{ fontSize: 11 }}>{item.label}: <strong>{item.count}</strong></Text>
                                </Space>
                            ))}
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card
                        title={<Space><FireOutlined style={{ color: '#ef4444' }} /> Priority Distribution</Space>}
                        size="small"
                        style={glassCard}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { key: 'critical', label: 'Critical', color: '#ef4444' },
                                { key: 'high', label: 'High', color: '#f59e0b' },
                                { key: 'medium', label: 'Medium', color: '#3b82f6' },
                                { key: 'low', label: 'Low', color: '#6b7280' },
                            ].map(item => {
                                const count = priorityDist[item.key] || 0;
                                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                                return (
                                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ width: 60, fontSize: 11, fontWeight: 500 }}>{item.label}</Text>
                                        <Progress
                                            percent={pct}
                                            size="small"
                                            strokeColor={item.color}
                                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                            style={{ flex: 1 }}
                                            format={() => `${count}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ── Effort & Budget Analytics ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><ClockCircleOutlined style={{ color: themeColor }} /> Effort Analytics</Space>}
                        size="small"
                        style={glassCard}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Statistic
                                    title={<span style={{ fontSize: 11 }}>Estimated Hours</span>}
                                    value={totalEstimated}
                                    suffix="h"
                                    valueStyle={{ fontSize: 20, fontWeight: 600 }}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title={<span style={{ fontSize: 11 }}>Logged Hours</span>}
                                    value={totalLogged}
                                    suffix="h"
                                    valueStyle={{ fontSize: 20, fontWeight: 600, color: totalLogged > totalEstimated ? '#ef4444' : '#10b981' }}
                                />
                            </Col>
                        </Row>
                        <Progress
                            percent={totalEstimated > 0 ? Math.min(100, Math.round((totalLogged / totalEstimated) * 100)) : 0}
                            strokeColor={totalLogged > totalEstimated ? '#ef4444' : { '0%': 'var(--theme-color, #8b5cf6)', '100%': 'var(--theme-secondary, #6366f1)' }}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                            style={{ marginTop: 12 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><DollarOutlined style={{ color: '#f59e0b' }} /> Budget Analytics</Space>}
                        size="small"
                        style={glassCard}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Statistic
                                    title={<span style={{ fontSize: 11 }}>Total Budget</span>}
                                    value={totalBudget}
                                    prefix="$"
                                    valueStyle={{ fontSize: 20, fontWeight: 600 }}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title={<span style={{ fontSize: 11 }}>Total Spent</span>}
                                    value={totalSpent}
                                    prefix="$"
                                    valueStyle={{ fontSize: 20, fontWeight: 600, color: totalSpent > totalBudget ? '#ef4444' : '#10b981' }}
                                />
                            </Col>
                        </Row>
                        <Progress
                            percent={totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0}
                            strokeColor={totalSpent > totalBudget ? '#ef4444' : { '0%': '#f59e0b', '100%': '#10b981' }}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                            style={{ marginTop: 12 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── Team Workload ── */}
            <Card
                title={<Space><TeamOutlined style={{ color: '#3b82f6' }} /> Team Workload</Space>}
                size="small"
                style={{ ...glassCard, marginBottom: 24 }}
            >
                {teamWorkload.length === 0 ? (
                    <Empty description="No tasks assigned yet." />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {teamWorkload.slice(0, 10).map((member, i) => {
                            const donePct = member.total > 0 ? Math.round((member.done / member.total) * 100) : 0;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Text style={{ width: 140, fontSize: 12, fontWeight: 500 }}>
                                        {member.name === 'Unassigned' ? (
                                            <Text type="secondary" style={{ fontSize: 12 }}>Unassigned</Text>
                                        ) : member.name}
                                    </Text>
                                    <Progress
                                        percent={donePct}
                                        size="small"
                                        strokeColor={donePct >= 80 ? '#10b981' : donePct >= 40 ? '#f59e0b' : '#6366f1'}
                                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                        style={{ flex: 1 }}
                                    />
                                    <Text type="secondary" style={{ fontSize: 10, width: 100, textAlign: 'right' }}>
                                        {member.done}/{member.total} tasks • {member.hours}h
                                    </Text>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* ── Project Health Scorecard ── */}
            <Card
                title={
                    <Space>
                        <AimOutlined style={{ color: themeColor }} />
                        <span style={{ fontWeight: 600 }}>Project Health Scorecard</span>
                        <Tag color="purple">{projectHealth.length}</Tag>
                    </Space>
                }
                style={glassCard}
            >
                {projectHealth.length === 0 ? (
                    <Empty description="No active projects to score." />
                ) : (
                    <Table
                        dataSource={projectHealth}
                        columns={healthColumns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        style={{ fontSize: 13 }}
                        onRow={(record) => ({
                            onClick: () => router.push(`/admin/pm/dashboard?projectId=${record.id}`),
                            style: { cursor: 'pointer' },
                        })}
                    />
                )}
            </Card>

            {/* ── Type Distribution ── */}
            {Object.keys(typeDist).length > 0 && (
                <Card
                    title={<Space><FundProjectionScreenOutlined style={{ color: themeColor }} /> Task Type Distribution</Space>}
                    size="small"
                    style={{ ...glassCard, marginTop: 16 }}
                >
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {Object.entries(typeDist).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                            const color = type === 'bug' ? '#ef4444' : type === 'story' ? '#10b981' : type === 'epic' ? 'var(--theme-color, #8b5cf6)' : '#3b82f6';
                            const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                            return (
                                <Card key={type} size="small" hoverable style={{
                                    flex: '1 1 120px', maxWidth: 160, textAlign: 'center',
                                    borderTop: `3px solid ${color}`,
                                }}>
                                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
                                    <Text style={{ fontSize: 12, textTransform: 'capitalize' }}>{type}</Text>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 10 }}>{pct}% of total</Text>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* ─── AI-POWERED INSIGHTS ─────────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════ */}

            <Divider style={{ borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.06)' }}>
                <Space>
                    <BulbOutlined style={{ color: '#f59e0b' }} />
                    <Text strong style={{ fontSize: 14, letterSpacing: 0.5 }}>AI-Powered Insights</Text>
                </Space>
            </Divider>

            {/* ── Project Selector for AI ── */}
            <Card
                size="small"
                style={{ ...glassCard, marginBottom: 20, borderTop: `3px solid ${themeColor}` }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <BulbOutlined style={{ fontSize: 18, color: '#f59e0b' }} />
                    <Text strong style={{ fontSize: 13 }}>Select a project for AI analysis:</Text>
                    <Select
                        placeholder="Choose a project…"
                        value={selectedProjectId}
                        onChange={(val) => {
                            setSelectedProjectId(val);
                            setStatusReport(null);
                            setCriticalPath(null);
                        }}
                        style={{ minWidth: 260 }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={projects.filter(p => p.status === 'active' || p.status === 'planning').map(p => ({
                            value: p.id,
                            label: `${p.name} (${p.project_number})`,
                        }))}
                    />
                    <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        loading={statusReportLoading}
                        onClick={handleGenerateStatusReport}
                        disabled={!selectedProjectId}
                        style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
                    >
                        Generate Status Report
                    </Button>
                    <Button
                        icon={<ForkOutlined />}
                        loading={criticalPathLoading}
                        onClick={handleGenerateCriticalPath}
                        disabled={!selectedProjectId}
                        style={{ borderRadius: 8 }}
                    >
                        Analyze Critical Path
                    </Button>
                </div>
            </Card>

            {/* ── AI Status Report ── */}
            {statusReport && (
                <Card
                    title={
                        <Space>
                            <FileTextOutlined style={{ color: themeColor }} />
                            <span style={{ fontWeight: 600 }}>AI Status Report</span>
                            {selectedProjectName && (
                                <Tag color="purple" style={{ fontSize: 10, borderRadius: 8 }}>{selectedProjectName}</Tag>
                            )}
                        </Space>
                    }
                    size="small"
                    style={{ ...glassCard, marginBottom: 20 }}
                    extra={
                        statusReport.reportDate && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{statusReport.reportDate}</Text>
                        )
                    }
                >
                    {/* Health Score + Executive Summary */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
                        borderRadius: 14, marginBottom: 16,
                        background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
                        border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                        <Progress
                            type="circle" percent={statusReport.healthScore || 0} size={64}
                            strokeColor={
                                (statusReport.healthScore || 0) >= 70 ? '#10b981'
                                    : (statusReport.healthScore || 0) >= 40 ? '#f59e0b' : '#ef4444'
                            }
                            format={(pct) => <span style={{ fontSize: 16, fontWeight: 700 }}>{pct}</span>}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 14 }}>Project Health</Text>
                                {statusReport.overallHealth && (
                                    <Tag color={
                                        statusReport.overallHealth === 'green' ? 'green'
                                            : statusReport.overallHealth === 'yellow' ? 'orange' : 'red'
                                    } style={{ fontSize: 10, borderRadius: 8, textTransform: 'uppercase' }}>
                                        {statusReport.overallHealth}
                                    </Tag>
                                )}
                                {statusReport.scheduleAssessment && (
                                    <Tag color={
                                        statusReport.scheduleAssessment === 'on_track' ? 'green'
                                            : statusReport.scheduleAssessment === 'at_risk' ? 'orange' : 'red'
                                    } style={{ fontSize: 10, borderRadius: 8 }}>
                                        Schedule: {statusReport.scheduleAssessment?.replace('_', ' ')}
                                    </Tag>
                                )}
                                {statusReport.budgetAssessment && (
                                    <Tag color={
                                        statusReport.budgetAssessment === 'on_track' ? 'green'
                                            : statusReport.budgetAssessment === 'at_risk' ? 'orange' : 'red'
                                    } style={{ fontSize: 10, borderRadius: 8 }}>
                                        Budget: {statusReport.budgetAssessment?.replace('_', ' ')}
                                    </Tag>
                                )}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {statusReport.executiveSummary}
                            </Text>
                        </div>
                    </div>

                    <Row gutter={[16, 16]}>
                        {/* Accomplishments */}
                        {statusReport.accomplishments && statusReport.accomplishments.length > 0 && (
                            <Col xs={24} md={12}>
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.03)',
                                    border: '1px solid rgba(16,185,129,0.12)',
                                    height: '100%',
                                }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#10b981' }}>
                                        <CheckCircleOutlined style={{ marginRight: 6 }} />
                                        Accomplishments
                                    </Text>
                                    {statusReport.accomplishments.map((item: string, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: 11 }}>✓</span>
                                            <Text style={{ fontSize: 11 }}>{item}</Text>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        )}

                        {/* Next Period Goals */}
                        {statusReport.nextPeriodGoals && statusReport.nextPeriodGoals.length > 0 && (
                            <Col xs={24} md={12}>
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)',
                                    border: '1px solid rgba(99,102,241,0.12)',
                                    height: '100%',
                                }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: themeColor }}>
                                        <RocketOutlined style={{ marginRight: 6 }} />
                                        Next Period Goals
                                    </Text>
                                    {statusReport.nextPeriodGoals.map((item: string, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                                            <span style={{ color: themeColor, fontWeight: 700, fontSize: 11 }}>→</span>
                                            <Text style={{ fontSize: 11 }}>{item}</Text>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        )}

                        {/* Blockers */}
                        {statusReport.blockers && statusReport.blockers.length > 0 && (
                            <Col xs={24} md={12}>
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)',
                                    border: '1px solid rgba(239,68,68,0.12)',
                                    height: '100%',
                                }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#ef4444' }}>
                                        <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                                        Blockers
                                    </Text>
                                    {statusReport.blockers.map((item: string, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>⚠</span>
                                            <Text style={{ fontSize: 11 }}>{item}</Text>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        )}

                        {/* Risk Highlights */}
                        {statusReport.riskHighlights && statusReport.riskHighlights.length > 0 && (
                            <Col xs={24} md={12}>
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.03)',
                                    border: '1px solid rgba(245,158,11,0.12)',
                                    height: '100%',
                                }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#f59e0b' }}>
                                        <WarningOutlined style={{ marginRight: 6 }} />
                                        Risk Highlights
                                    </Text>
                                    {statusReport.riskHighlights.map((risk: any, idx: number) => (
                                        <div key={idx} style={{
                                            padding: '6px 10px', marginBottom: 4, borderRadius: 8,
                                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Tag
                                                    color={risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'orange' : 'blue'}
                                                    style={{ fontSize: 9, borderRadius: 6, margin: 0 }}
                                                >
                                                    {(risk.severity || 'info').toUpperCase()}
                                                </Tag>
                                                <Text style={{ fontSize: 11 }}>{risk.risk}</Text>
                                            </div>
                                            {risk.mitigation && (
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2, paddingLeft: 4 }}>
                                                    Mitigation: {risk.mitigation}
                                                </Text>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        )}
                    </Row>

                    {/* Recommendations */}
                    {statusReport.recommendations && statusReport.recommendations.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                <BulbOutlined style={{ color: '#f59e0b', marginRight: 6 }} />
                                Recommendations
                            </Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {statusReport.recommendations.map((rec: string, idx: number) => (
                                    <div key={idx} style={{
                                        padding: '8px 12px', borderRadius: 8,
                                        background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)',
                                        border: '1px solid rgba(139,92,246,0.1)',
                                        display: 'flex', gap: 8, alignItems: 'flex-start',
                                    }}>
                                        <span style={{ color: themeColor, fontWeight: 700, fontSize: 11 }}>💡</span>
                                        <Text style={{ fontSize: 11 }}>{rec}</Text>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* ── AI Critical Path Analysis ── */}
            {criticalPath && (
                <Card
                    title={
                        <Space>
                            <ForkOutlined style={{ color: themeColor }} />
                            <span style={{ fontWeight: 600 }}>Critical Path Analysis</span>
                            {selectedProjectName && (
                                <Tag color="purple" style={{ fontSize: 10, borderRadius: 8 }}>{selectedProjectName}</Tag>
                            )}
                        </Space>
                    }
                    size="small"
                    style={{ ...glassCard, marginBottom: 20 }}
                >
                    {/* Summary + Risk to Timeline */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
                        borderRadius: 14, marginBottom: 16, flexWrap: 'wrap',
                        background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)',
                        border: '1px solid rgba(139,92,246,0.15)',
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: (() => {
                                const r = criticalPath.riskToTimeline;
                                return r === 'high' ? 'linear-gradient(135deg, #ef4444, #f87171)'
                                    : r === 'medium' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                                        : 'linear-gradient(135deg, #10b981, #34d399)';
                            })(),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 22, fontWeight: 700,
                        }}>
                            <NodeIndexOutlined />
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 14 }}>Schedule Analysis</Text>
                                {criticalPath.riskToTimeline && (
                                    <Tag color={
                                        criticalPath.riskToTimeline === 'high' ? 'red'
                                            : criticalPath.riskToTimeline === 'medium' ? 'orange' : 'green'
                                    } style={{ fontSize: 10, borderRadius: 8, textTransform: 'uppercase' }}>
                                        Risk: {criticalPath.riskToTimeline}
                                    </Tag>
                                )}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{criticalPath.summary}</Text>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {criticalPath.totalCriticalPathDuration !== undefined && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: themeColor }}>
                                        {criticalPath.totalCriticalPathDuration}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Critical Days</Text>
                                </div>
                            )}
                            {criticalPath.scheduleVariance !== undefined && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 20, fontWeight: 800,
                                        color: criticalPath.scheduleVariance > 0 ? '#ef4444' : '#10b981',
                                    }}>
                                        {criticalPath.scheduleVariance > 0 ? '+' : ''}{criticalPath.scheduleVariance}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Variance (days)</Text>
                                </div>
                            )}
                            {criticalPath.expectedCompletionDate && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                        {dayjs(criticalPath.expectedCompletionDate).format('MMM D, YYYY')}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Expected Completion</Text>
                                </div>
                            )}
                        </div>
                    </div>

                    <Row gutter={[16, 16]}>
                        {/* Critical Path Tasks */}
                        {criticalPath.criticalPathTasks && criticalPath.criticalPathTasks.length > 0 && (
                            <Col xs={24} lg={14}>
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.02)',
                                    border: '1px solid rgba(239,68,68,0.1)',
                                }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 10, color: '#ef4444' }}>
                                        <FireOutlined style={{ marginRight: 6 }} />
                                        Critical Path Tasks ({criticalPath.criticalPathTasks.length})
                                    </Text>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {criticalPath.criticalPathTasks.map((task: any, idx: number) => (
                                            <div key={idx} style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '8px 12px', borderRadius: 10,
                                                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                                                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.03)',
                                            }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8,
                                                    background: task.isCritical ? 'linear-gradient(135deg, #ef4444, #f87171)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>
                                                        {task.taskTitle}
                                                    </Text>
                                                    <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            ⏱ {task.estimatedDays} days
                                                        </Text>
                                                        {task.slack !== undefined && (
                                                            <Text type="secondary" style={{
                                                                fontSize: 10,
                                                                color: task.slack === 0 ? '#ef4444' : undefined,
                                                            }}>
                                                                Slack: {task.slack}d
                                                            </Text>
                                                        )}
                                                        {task.earliestStart && (
                                                            <Text type="secondary" style={{ fontSize: 10 }}>
                                                                {dayjs(task.earliestStart).format('MMM D')} → {dayjs(task.latestFinish).format('MMM D')}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </div>
                                                {task.isCritical && (
                                                    <Tag color="red" style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>CRITICAL</Tag>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Col>
                        )}

                        {/* Non Critical + Bottlenecks + Recommendations */}
                        <Col xs={24} lg={10}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Non-Critical Tasks */}
                                {criticalPath.nonCriticalTasks && criticalPath.nonCriticalTasks.length > 0 && (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: 12,
                                        background: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.02)',
                                        border: '1px solid rgba(16,185,129,0.1)',
                                    }}>
                                        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#10b981' }}>
                                            <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                                            Non-Critical Tasks (with Float)
                                        </Text>
                                        {criticalPath.nonCriticalTasks.slice(0, 5).map((task: any, idx: number) => (
                                            <div key={idx} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '4px 0', borderBottom: idx < criticalPath.nonCriticalTasks.length - 1
                                                    ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}` : 'none',
                                            }}>
                                                <Text style={{ fontSize: 11 }}>{task.taskTitle}</Text>
                                                <Tag style={{ fontSize: 9, borderRadius: 6, margin: 0 }} color="green">
                                                    +{task.totalFloat}d float
                                                </Tag>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Bottlenecks */}
                                {criticalPath.bottlenecks && criticalPath.bottlenecks.length > 0 && (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: 12,
                                        background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.03)',
                                        border: '1px solid rgba(245,158,11,0.12)',
                                    }}>
                                        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#f59e0b' }}>
                                            <AlertOutlined style={{ marginRight: 6 }} />
                                            Bottlenecks
                                        </Text>
                                        {criticalPath.bottlenecks.map((item: string, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                                                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11 }}>⚠</span>
                                                <Text style={{ fontSize: 11 }}>{item}</Text>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Recommendations */}
                                {criticalPath.recommendations && criticalPath.recommendations.length > 0 && (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: 12,
                                        background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)',
                                        border: '1px solid rgba(139,92,246,0.1)',
                                    }}>
                                        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: themeColor }}>
                                            <BulbOutlined style={{ marginRight: 6 }} />
                                            Schedule Optimization
                                        </Text>
                                        {criticalPath.recommendations.map((rec: string, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                                                <span style={{ color: themeColor, fontWeight: 700, fontSize: 11 }}>💡</span>
                                                <Text style={{ fontSize: 11 }}>{rec}</Text>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* ── Empty state when no AI results ── */}
            {!statusReport && !criticalPath && selectedProjectId && (
                <Card
                    size="small"
                    style={{ ...glassCard, marginBottom: 20, textAlign: 'center' }}
                >
                    <div style={{ padding: 32 }}>
                        <BulbOutlined style={{ fontSize: 40, color: '#f59e0b', opacity: 0.4 }} />
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Click "Generate Status Report" or "Analyze Critical Path" above to get AI-powered insights for {selectedProjectName}.
                            </Text>
                        </div>
                    </div>
                </Card>
            )}
        </CMSLayout>
    );
}
