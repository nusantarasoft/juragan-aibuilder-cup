"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Badge, Button, Card, Col, Empty, message, Progress, Row, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import {
    ProjectOutlined, DashboardOutlined, FundProjectionScreenOutlined,
    CheckCircleOutlined, ClockCircleOutlined, PauseCircleOutlined,
    ExclamationCircleOutlined, DollarOutlined, BarChartOutlined,
    TeamOutlined, ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined,
    RocketOutlined, ReloadOutlined, BulbOutlined, AimOutlined,
    FireOutlined, WarningOutlined, SafetyCertificateOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

const { Text, Title } = Typography;

const GET_PORTFOLIO = `
  query GetPortfolioSummary($tenantId: String!) {
    pmPortfolioSummary(tenantId: $tenantId)
  }
`;

const GENERATE_PORTFOLIO_ANALYSIS = `
  query GeneratePortfolioAnalysis($tenantId: String!) {
    generatePortfolioAnalysis(tenantId: $tenantId)
  }
`;

const STATUS_CONFIG: Record<string, { color: string; gradient: string; icon: React.ReactNode; label: string }> = {
    active: { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)', icon: <RocketOutlined />, label: 'Active' },
    planning: { color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', icon: <ProjectOutlined />, label: 'Planning' },
    paused: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', icon: <PauseCircleOutlined />, label: 'Paused' },
    completed: { color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #4ade80)', icon: <CheckCircleOutlined />, label: 'Completed' },
    cancelled: { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f87171)', icon: <ExclamationCircleOutlined />, label: 'Cancelled' },
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
};

export default function PortfolioOverviewPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_PORTFOLIO, { tenantId: DEFAULT_TENANT_ID });
            setProjects(data.pmPortfolioSummary || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerateAnalysis = async () => {
        setAiLoading(true);
        try {
            const data = await gql(GENERATE_PORTFOLIO_ANALYSIS, { tenantId: DEFAULT_TENANT_ID });
            setAiAnalysis(data.generatePortfolioAnalysis);
            messageApi.success("Portfolio analysis generated!");
        } catch {
            messageApi.error("AI analysis failed. Check your AI service.");
        } finally {
            setAiLoading(false);
        }
    };

    // â”€â”€ Computed stats â”€â”€
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const totalTasks = projects.reduce((sum, p) => sum + (p.taskCounts?.total || 0), 0);
    const totalDone = projects.reduce((sum, p) => sum + (p.taskCounts?.done || 0), 0);
    const totalInProgress = projects.reduce((sum, p) => sum + (p.taskCounts?.inProgress || 0), 0);
    const taskCompletion = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    // â”€â”€ Status distribution â”€â”€
    const statusBuckets = ['active', 'planning', 'paused', 'completed', 'cancelled'].map(s => ({
        status: s,
        count: projects.filter(p => p.status === s).length,
        ...(STATUS_CONFIG[s] || { color: '#6b7280', gradient: '', label: s }),
    }));

    // â”€â”€ Priority distribution â”€â”€
    const priorityBuckets = ['critical', 'high', 'medium', 'low'].map(p => ({
        priority: p,
        count: projects.filter(pr => pr.priority === p).length,
    }));

    // â”€â”€ Risk Heat Map Data â”€â”€
    const riskData = useMemo(() => {
        return projects.map(p => {
            const tc = p.taskCounts || {};
            const progress = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
            const budgetPct = p.budget > 0 ? Math.round(((p.spent || 0) / p.budget) * 100) : 0;
            const isOverdue = p.end_date && dayjs(p.end_date).isBefore(dayjs()) && p.status === 'active';
            const timelinePct = (() => {
                if (!p.start_date || !p.end_date) return 0;
                const start = dayjs(p.start_date);
                const end = dayjs(p.end_date);
                const total = end.diff(start, 'day');
                const elapsed = dayjs().diff(start, 'day');
                return total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
            })();

            // Risk score: 0 = low risk, 100 = critical risk
            let riskScore = 0;
            if (isOverdue) riskScore += 40;
            if (budgetPct > 90) riskScore += 30;
            else if (budgetPct > 70) riskScore += 15;
            if (timelinePct > 80 && progress < 60) riskScore += 20;
            if (p.priority === 'critical') riskScore += 10;
            if (p.priority === 'high') riskScore += 5;
            riskScore = Math.min(100, riskScore);

            const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 30 ? 'elevated' : 'low';

            return {
                ...p,
                progress,
                budgetPct,
                isOverdue,
                timelinePct,
                riskScore,
                riskLevel,
            };
        }).filter(p => p.status === 'active' || p.status === 'planning');
    }, [projects]);

    // â”€â”€ Active Sprint Summary (tasks in active projects) â”€â”€
    const sprintSummary = useMemo(() => {
        const activeOnly = projects.filter(p => p.status === 'active');
        const inProgressTasks = activeOnly.reduce((sum, p) => sum + (p.taskCounts?.inProgress || 0), 0);
        const todoTasks = activeOnly.reduce((sum, p) => sum + (p.taskCounts?.todo || 0), 0);
        const doneTasks = activeOnly.reduce((sum, p) => sum + (p.taskCounts?.done || 0), 0);
        const totalActiveTasks = inProgressTasks + todoTasks + doneTasks;
        const velocity = totalActiveTasks > 0 ? Math.round((doneTasks / Math.max(1, activeOnly.length))) : 0;

        return { inProgressTasks, todoTasks, doneTasks, totalActiveTasks, velocity, projectCount: activeOnly.length };
    }, [projects]);

    const glassCard = useMemo(() => ({
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
    }), [isDark]);

    // â”€â”€ Risk Cell Color â”€â”€
    const getRiskCellColor = (score: number) => {
        if (score >= 60) return { bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', border: '#ef4444', text: '#ef4444' };
        if (score >= 30) return { bg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)', border: '#f59e0b', text: '#f59e0b' };
        return { bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)', border: '#10b981', text: '#10b981' };
    };

    // â”€â”€ Stat Card â”€â”€
    const StatCard = ({ title, value, suffix, icon, gradient, extra }: {
        title: string; value: number | string; suffix?: string;
        icon: React.ReactNode; gradient: string; extra?: React.ReactNode;
    }) => (
        <Card
            size="small"
            style={{ ...glassCard, overflow: 'hidden', position: 'relative', transition: 'transform 0.2s ease' }}
            styles={{ body: { padding: '20px 16px', position: 'relative', zIndex: 1 } }}
            hoverable
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: gradient, borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
                    <div style={{
                        fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginTop: 4,
                        background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        {value}{suffix && <span style={{ fontSize: 18 }}>{suffix}</span>}
                    </div>
                </div>
                <div style={{
                    width: 44, height: 44, borderRadius: 12, background: gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: '#fff', opacity: 0.85
                }}>
                    {icon}
                </div>
            </div>
            {extra && <div style={{ marginTop: 10 }}>{extra}</div>}
        </Card>
    );

    const columns = [
        {
            title: 'Project',
            dataIndex: 'name',
            key: 'name',
            render: (_: any, record: any) => (
                <div>
                    <a onClick={() => router.push(`/admin/pm/dashboard?projectId=${record.id}`)}
                        style={{ fontWeight: 600, fontSize: 14 }}>
                        {record.name}
                    </a>
                    <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#888' }}>
                        {record.project_number}
                    </div>
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status] || { color: '#6b7280', label: status };
                return <Tag color={cfg.color}>{cfg.label.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 90,
            render: (p: string) => {
                const c = PRIORITY_COLORS[p] || '#6b7280';
                return <Tag color={c}>{(p || 'medium').toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Task Progress',
            key: 'tasks',
            width: 180,
            render: (_: any, record: any) => {
                const tc = record.taskCounts || {};
                const pct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
                return (
                    <div>
                        <Progress percent={pct} size="small"
                            strokeColor={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1'}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            {tc.done}/{tc.total} tasks ({tc.inProgress} in progress)
                        </Text>
                    </div>
                );
            },
        },
        {
            title: 'Budget',
            key: 'budget',
            width: 160,
            render: (_: any, record: any) => {
                if (!record.budget) return <Text type="secondary">â€”</Text>;
                const pct = Math.min(100, Math.round(((record.spent || 0) / record.budget) * 100));
                return (
                    <div>
                        <Progress percent={pct} size="small"
                            strokeColor={pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            ${(record.spent || 0).toLocaleString()} / ${record.budget.toLocaleString()}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: 'Timeline',
            key: 'timeline',
            width: 180,
            render: (_: any, record: any) => {
                if (!record.start_date || !record.end_date) return <Text type="secondary">â€”</Text>;
                const start = dayjs(record.start_date);
                const end = dayjs(record.end_date);
                const now = dayjs();
                const totalDays = end.diff(start, 'day');
                const elapsed = now.diff(start, 'day');
                const pct = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))) : 0;
                const isOverdue = now.isAfter(end);
                return (
                    <div>
                        <Progress percent={pct} size="small"
                            strokeColor={isOverdue ? '#ef4444' : '#6366f1'}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            {start.format('MMM D')} â€” {end.format('MMM D, YYYY')}
                            {isOverdue && <Tag color="red" style={{ fontSize: 9, marginLeft: 4 }}>OVERDUE</Tag>}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: '',
            key: 'action',
            width: 90,
            render: (_: any, record: any) => (
                <Button type="link" size="small" icon={<DashboardOutlined />}
                    onClick={() => router.push(`/admin/pm/dashboard?projectId=${record.id}`)}>
                    Open
                </Button>
            ),
        },
    ];

    if (loading) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Portfolio Overview</AuroraText>}
            subTitle={<DecryptedText text="Aggregate view of all projects" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
                <div style={{ textAlign: 'center', padding: 120 }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Portfolio Overview</AuroraText>}
            subTitle={<DecryptedText text="Aggregate view of all projects" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            {contextHolder}

            {/* â”€â”€ Hero Stats Row â”€â”€ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Total Projects" value={totalProjects}
                        icon={<ProjectOutlined />}
                        gradient={`linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`}
                        extra={
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {statusBuckets.filter(s => s.count > 0).map(s => (
                                    <Tag key={s.status} style={{
                                        borderRadius: 10, fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0,
                                        background: s.color + '18', color: s.color, border: `1px solid ${s.color}33`
                                    }}>
                                        {s.count} {s.label}
                                    </Tag>
                                ))}
                            </div>
                        }
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Task Completion" value={taskCompletion} suffix="%"
                        icon={<CheckCircleOutlined />}
                        gradient="linear-gradient(135deg, #10b981, #34d399)"
                        extra={
                            <div>
                                <Progress percent={taskCompletion} size="small" showInfo={false}
                                    strokeColor={{ '0%': '#10b981', '100%': '#22c55e' }}
                                    trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                />
                                <Text type="secondary" style={{ fontSize: 10 }}>{totalDone} of {totalTasks} tasks done</Text>
                            </div>
                        }
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Budget Utilization" value={budgetUtilization} suffix="%"
                        icon={<DollarOutlined />}
                        gradient={budgetUtilization > 90
                            ? 'linear-gradient(135deg, #ef4444, #f87171)'
                            : 'linear-gradient(135deg, #f59e0b, #fbbf24)'}
                        extra={
                            <div>
                                <Progress percent={budgetUtilization} size="small" showInfo={false}
                                    strokeColor={budgetUtilization > 90 ? '#ef4444' : '#f59e0b'}
                                    trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                />
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    ${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
                                </Text>
                            </div>
                        }
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Active Projects" value={activeProjects}
                        icon={<FundProjectionScreenOutlined />}
                        gradient="linear-gradient(135deg, var(--theme-color, #8b5cf6), #a78bfa)"
                        extra={
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {completedProjects} completed â€¢ {projects.filter(p => p.status === 'paused').length} paused
                            </Text>
                        }
                    />
                </Col>
            </Row>

            {/* â”€â”€ Active Sprints Summary + Risk Heat Map â”€â”€ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Active Sprints Summary */}
                <Col xs={24} lg={10}>
                    <Card
                        title={<Space><ThunderboltOutlined style={{ color: '#f59e0b' }} /> Active Sprints Summary</Space>}
                        size="small"
                        style={glassCard}
                        extra={<Tag color="blue">{sprintSummary.projectCount} projects</Tag>}
                    >
                        <Row gutter={[12, 12]}>
                            <Col span={8}>
                                <div style={{
                                    textAlign: 'center', padding: '12px 8px', borderRadius: 12,
                                    background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: themeColor }}>
                                        {sprintSummary.inProgressTasks}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>In Progress</Text>
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{
                                    textAlign: 'center', padding: '12px 8px', borderRadius: 12,
                                    background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.05)',
                                    border: '1px solid rgba(245,158,11,0.15)',
                                }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
                                        {sprintSummary.todoTasks}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>To Do</Text>
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{
                                    textAlign: 'center', padding: '12px 8px', borderRadius: 12,
                                    background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)',
                                    border: '1px solid rgba(16,185,129,0.15)',
                                }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>
                                        {sprintSummary.doneTasks}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Done</Text>
                                </div>
                            </Col>
                        </Row>

                        {/* Mini progress bar */}
                        <div style={{ marginTop: 12, padding: '8px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 11, fontWeight: 600 }}>Sprint Progress</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {sprintSummary.totalActiveTasks > 0
                                        ? Math.round((sprintSummary.doneTasks / sprintSummary.totalActiveTasks) * 100) : 0}%
                                </Text>
                            </div>
                            <div style={{
                                height: 8, borderRadius: 4, overflow: 'hidden',
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                display: 'flex',
                            }}>
                                <div style={{
                                    width: `${sprintSummary.totalActiveTasks > 0 ? (sprintSummary.doneTasks / sprintSummary.totalActiveTasks) * 100 : 0}%`,
                                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                                    borderRadius: '4px 0 0 4px', transition: 'width 0.5s ease',
                                }} />
                                <div style={{
                                    width: `${sprintSummary.totalActiveTasks > 0 ? (sprintSummary.inProgressTasks / sprintSummary.totalActiveTasks) * 100 : 0}%`,
                                    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#10b981', marginRight: 4 }} />
                                    Done
                                </Text>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#6366f1', marginRight: 4 }} />
                                    In Progress
                                </Text>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', marginRight: 4 }} />
                                    To Do
                                </Text>
                            </div>
                        </div>

                        {/* Velocity */}
                        <div style={{
                            marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', borderRadius: 8,
                            background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)',
                            border: '1px solid rgba(139,92,246,0.12)',
                        }}>
                            <Text style={{ fontSize: 11 }}>Avg. tasks completed per project</Text>
                            <Text strong style={{ fontSize: 14, color: themeColor }}>{sprintSummary.velocity}</Text>
                        </div>
                    </Card>
                </Col>

                {/* Risk Heat Map */}
                <Col xs={24} lg={14}>
                    <Card
                        title={<Space><FireOutlined style={{ color: '#ef4444' }} /> Project Risk Heat Map</Space>}
                        size="small"
                        style={glassCard}
                        extra={
                            <Space size={12}>
                                <Badge color="#10b981" text={<Text style={{ fontSize: 10 }}>Low</Text>} />
                                <Badge color="#f59e0b" text={<Text style={{ fontSize: 10 }}>Elevated</Text>} />
                                <Badge color="#ef4444" text={<Text style={{ fontSize: 10 }}>Critical</Text>} />
                            </Space>
                        }
                    >
                        {riskData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 24 }}>
                                <SafetyCertificateOutlined style={{ fontSize: 32, color: '#10b981', opacity: 0.5 }} />
                                <div><Text type="secondary" style={{ fontSize: 12 }}>No active projects to assess</Text></div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {riskData.sort((a, b) => b.riskScore - a.riskScore).map(project => {
                                    const riskStyle = getRiskCellColor(project.riskScore);
                                    return (
                                        <Tooltip
                                            key={project.id}
                                            title={
                                                <div style={{ fontSize: 12 }}>
                                                    <div><strong>{project.name}</strong></div>
                                                    <div>Risk Score: {project.riskScore}/100</div>
                                                    <div>Timeline: {project.timelinePct}% elapsed</div>
                                                    <div>Task Progress: {project.progress}%</div>
                                                    <div>Budget: {project.budgetPct}% burned</div>
                                                    {project.isOverdue && <div style={{ color: '#ef4444' }}>âš ï¸ OVERDUE</div>}
                                                </div>
                                            }
                                        >
                                            <div
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '8px 12px', borderRadius: 10,
                                                    background: riskStyle.bg,
                                                    border: `1px solid ${riskStyle.border}22`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onClick={() => router.push(`/admin/pm/dashboard?projectId=${project.id}`)}
                                            >
                                                {/* Risk indicator bar */}
                                                <div style={{
                                                    width: 4, alignSelf: 'stretch', borderRadius: 2,
                                                    background: riskStyle.border,
                                                    minHeight: 28,
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                                            {project.name}
                                                        </Text>
                                                        <Tag style={{
                                                            borderRadius: 10, fontSize: 10, lineHeight: '16px', padding: '0 6px',
                                                            margin: 0, background: riskStyle.bg,
                                                            color: riskStyle.text, border: `1px solid ${riskStyle.border}33`,
                                                            fontWeight: 600,
                                                        }}>
                                                            {project.riskLevel === 'critical' ? 'ðŸ”´' : project.riskLevel === 'elevated' ? 'ðŸŸ¡' : 'ðŸŸ¢'} {project.riskScore}
                                                        </Tag>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            ðŸ“Š {project.progress}% done
                                                        </Text>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            ðŸ’° {project.budgetPct}% spent
                                                        </Text>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            â± {project.timelinePct}% elapsed
                                                        </Text>
                                                        {project.isOverdue && (
                                                            <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>
                                                                OVERDUE
                                                            </Text>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* â”€â”€ Status & Priority Distribution â”€â”€ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={14}>
                    <Card
                        title={<Space><BarChartOutlined style={{ color: themeColor }} /> Status Distribution</Space>}
                        size="small"
                        style={glassCard}
                    >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                            {statusBuckets.map(s => {
                                const maxCount = Math.max(1, ...statusBuckets.map(b => b.count));
                                const height = s.count > 0 ? Math.max(16, (s.count / maxCount) * 64) : 8;
                                return (
                                    <Tooltip key={s.status} title={`${s.label}: ${s.count} projects`}>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{
                                                height, background: s.gradient || s.color,
                                                borderRadius: '6px 6px 0 0',
                                                transition: 'height 0.3s ease',
                                                opacity: s.count > 0 ? 1 : 0.2,
                                            }} />
                                            <Text style={{ fontSize: 10, display: 'block', marginTop: 4 }}>{s.label}</Text>
                                            <Text strong style={{ fontSize: 13 }}>{s.count}</Text>
                                        </div>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card
                        title={<Space><ExclamationCircleOutlined style={{ color: '#ef4444' }} /> Priority Breakdown</Space>}
                        size="small"
                        style={glassCard}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {priorityBuckets.map(p => {
                                const color = PRIORITY_COLORS[p.priority] || '#6b7280';
                                const pct = totalProjects > 0 ? Math.round((p.count / totalProjects) * 100) : 0;
                                return (
                                    <div key={p.priority} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ width: 60, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>
                                            {p.priority}
                                        </Text>
                                        <Progress
                                            percent={pct} size="small" strokeColor={color}
                                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                            style={{ flex: 1 }} format={() => `${p.count}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* â”€â”€ AI Portfolio Analysis â”€â”€ */}
            <Card
                title={
                    <Space>
                        <BulbOutlined style={{ color: '#f59e0b' }} />
                        <span style={{ fontWeight: 600 }}>AI Portfolio Analysis</span>
                    </Space>
                }
                size="small"
                style={{ ...glassCard, marginBottom: 24 }}
                extra={
                    <Button
                        type="primary"
                        icon={<BulbOutlined />}
                        loading={aiLoading}
                        onClick={handleGenerateAnalysis}
                        style={{ borderRadius: 8 }}
                    >
                        Generate Analysis
                    </Button>
                }
            >
                {aiAnalysis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Health Score */}
                        {aiAnalysis.overallHealthScore !== undefined && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
                                borderRadius: 12,
                                background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
                                border: '1px solid rgba(99,102,241,0.15)',
                            }}>
                                <Progress
                                    type="circle" percent={aiAnalysis.overallHealthScore} size={56}
                                    strokeColor={aiAnalysis.overallHealthScore >= 70 ? '#10b981' : aiAnalysis.overallHealthScore >= 40 ? '#f59e0b' : '#ef4444'}
                                    format={(pct) => <span style={{ fontSize: 14, fontWeight: 700 }}>{pct}</span>}
                                />
                                <div>
                                    <Text strong style={{ fontSize: 14 }}>Overall Portfolio Health</Text>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{aiAnalysis.healthSummary || 'Analysis complete.'}</Text>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                            <div>
                                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Recommendations</Text>
                                {aiAnalysis.recommendations.map((rec: any, idx: number) => (
                                    <div key={idx} style={{
                                        padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
                                    }}>
                                        <Text style={{ fontSize: 12 }}>
                                            <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}
                                                style={{ fontSize: 10, borderRadius: 8 }}>
                                                {(rec.priority || 'info').toUpperCase()}
                                            </Tag>
                                            {rec.recommendation || rec.title}
                                        </Text>
                                        {rec.impact && (
                                            <div style={{ marginTop: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Impact: {rec.impact}</Text>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Risks */}
                        {aiAnalysis.risks && aiAnalysis.risks.length > 0 && (
                            <div>
                                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Portfolio-Level Risks</Text>
                                {aiAnalysis.risks.map((risk: any, idx: number) => (
                                    <div key={idx} style={{
                                        padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                                        background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.02)',
                                        border: isDark ? '1px solid rgba(239,68,68,0.1)' : '1px solid rgba(239,68,68,0.06)',
                                    }}>
                                        <Text style={{ fontSize: 12 }}>
                                            <WarningOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                                            {risk.description || risk.risk}
                                        </Text>
                                        {risk.mitigation && (
                                            <div style={{ marginTop: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Mitigation: {risk.mitigation}</Text>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <BulbOutlined style={{ fontSize: 36, color: '#f59e0b', opacity: 0.4 }} />
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Click "Generate Analysis" to get AI-powered insights about your project portfolio health,
                                risks, and actionable recommendations.
                            </Text>
                        </div>
                    </div>
                )}
            </Card>

            {/* â”€â”€ Project Table â”€â”€ */}
            <Card
                title={
                    <Space>
                        <ProjectOutlined style={{ color: themeColor }} />
                        <span style={{ fontWeight: 600 }}>All Projects</span>
                        <Tag color="blue">{totalProjects}</Tag>
                    </Space>
                }
                style={glassCard}
                extra={<Space><Button icon={<ReloadOutlined />} onClick={loadData} size="small">Reload</Button><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'pm_portfolio', title: 'PM Portfolio', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Priority', key: 'priority' }, { header: 'Budget', key: 'budget' }, { header: 'Spent', key: 'spent' }], data: projects })} /></Tooltip><Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'pm_portfolio', title: 'PM Portfolio', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Priority', key: 'priority' }, { header: 'Budget', key: 'budget' }, { header: 'Spent', key: 'spent' }], data: projects })} /></Tooltip></Space>}
            >
                {projects.length === 0 ? (
                    <Empty description="No projects found. Create one from the Projects page." />
                ) : (
                    <Table
                        dataSource={projects}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        size="small"
                        style={{ fontSize: 13 }}
                    />
                )}
            </Card>
        </CMSLayout>
    );
}





