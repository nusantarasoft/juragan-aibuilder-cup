"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { motion } from "framer-motion";
import {
    Badge, Button, Card, Col, Empty, Input, message, Progress, Row, Select, Space, Spin,
    Table, Tag, Tooltip, Typography
} from "antd";
import {
    ProjectOutlined, DashboardOutlined, FundProjectionScreenOutlined,
    CheckCircleOutlined, PauseCircleOutlined,
    ExclamationCircleOutlined, DollarOutlined, BarChartOutlined, SearchOutlined,
    ThunderboltOutlined, RocketOutlined, ReloadOutlined, BulbOutlined,
    FireOutlined, SafetyCertificateOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";

const { Text } = Typography;

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
    critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280',
};

interface PortfolioDashboardProps {
    onSelectProject: (projectId: string) => void;
}

export default function PortfolioDashboard({ onSelectProject }: PortfolioDashboardProps) {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [tableStatusFilter, setTableStatusFilter] = useState<string | null>(null);
    const [messageApi, contextHolder] = message.useMessage();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_PORTFOLIO, { tenantId: DEFAULT_TENANT_ID });
            setProjects(data.pmPortfolioSummary || []);
        } catch (err: any) { console.error("PM Error", err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerateAnalysis = async () => {
        setAiLoading(true);
        try {
            const data = await gql(GENERATE_PORTFOLIO_ANALYSIS, { tenantId: DEFAULT_TENANT_ID });
            setAiAnalysis(data.generatePortfolioAnalysis);
            messageApi.success("Portfolio analysis generated!");
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("AI analysis failed."); }
        finally { setAiLoading(false); }
    };

    // ── Computed ──
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const totalTasks = projects.reduce((sum, p) => sum + (p.taskCounts?.total || 0), 0);
    const totalDone = projects.reduce((sum, p) => sum + (p.taskCounts?.done || 0), 0);
    const taskCompletion = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    const statusBuckets = ['active', 'planning', 'paused', 'completed', 'cancelled'].map(s => ({
        status: s, count: projects.filter(p => p.status === s).length,
        ...(STATUS_CONFIG[s] || { color: '#6b7280', gradient: '', label: s }),
    }));

    const priorityBuckets = ['critical', 'high', 'medium', 'low'].map(p => ({
        priority: p, count: projects.filter(pr => pr.priority === p).length,
    }));

    // ── Risk Data ──
    const riskData = useMemo(() => {
        return projects.map(p => {
            const tc = p.taskCounts || {};
            const progress = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
            const budgetPct = p.budget > 0 ? Math.round(((p.spent || 0) / p.budget) * 100) : 0;
            const isOverdue = p.end_date && dayjs(p.end_date).isBefore(dayjs()) && p.status === 'active';
            const timelinePct = (() => {
                if (!p.start_date || !p.end_date) return 0;
                const start = dayjs(p.start_date); const end = dayjs(p.end_date);
                const total = end.diff(start, 'day'); const elapsed = dayjs().diff(start, 'day');
                return total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
            })();
            let riskScore = 0;
            if (isOverdue) riskScore += 40;
            if (budgetPct > 90) riskScore += 30; else if (budgetPct > 70) riskScore += 15;
            if (timelinePct > 80 && progress < 60) riskScore += 20;
            if (p.priority === 'critical') riskScore += 10;
            if (p.priority === 'high') riskScore += 5;
            riskScore = Math.min(100, riskScore);
            const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 30 ? 'elevated' : 'low';
            return { ...p, progress, budgetPct, isOverdue, timelinePct, riskScore, riskLevel };
        }).filter(p => p.status === 'active' || p.status === 'planning');
    }, [projects]);

    // Sprint summary
    const sprintSummary = useMemo(() => {
        const activeOnly = projects.filter(p => p.status === 'active');
        const inProgressTasks = activeOnly.reduce((s, p) => s + (p.taskCounts?.inProgress || 0), 0);
        const todoTasks = activeOnly.reduce((s, p) => s + (p.taskCounts?.todo || 0), 0);
        const doneTasks = activeOnly.reduce((s, p) => s + (p.taskCounts?.done || 0), 0);
        const totalActiveTasks = inProgressTasks + todoTasks + doneTasks;
        const velocity = totalActiveTasks > 0 ? Math.round((doneTasks / Math.max(1, activeOnly.length))) : 0;
        return { inProgressTasks, todoTasks, doneTasks, totalActiveTasks, velocity, projectCount: activeOnly.length };
    }, [projects]);

    // ── Roadmap Data ──
    const roadmapProjects = useMemo(() => {
        return projects.filter(p => (p.status === 'active' || p.status === 'planning') && p.start_date && p.end_date)
            .map(p => ({
                ...p,
                start: dayjs(p.start_date),
                end: dayjs(p.end_date)
            }))
            .sort((a, b) => a.start.valueOf() - b.start.valueOf());
    }, [projects]);

    const roadmapRange = useMemo(() => {
        if (roadmapProjects.length === 0) return { start: dayjs().startOf('month'), end: dayjs().add(5, 'month').endOf('month'), months: [] };
        let minStart = roadmapProjects[0].start;
        let maxEnd = roadmapProjects[0].end;
        roadmapProjects.forEach(p => {
            if (p.start.isBefore(minStart)) minStart = p.start;
            if (p.end.isAfter(maxEnd)) maxEnd = p.end;
        });
        
        const start = minStart.startOf('month');
        let end = maxEnd.endOf('month');
        // Limit to max 12 months for UI simplicity
        if (end.diff(start, 'month') > 12) end = start.add(11, 'month').endOf('month');
        
        const months = [];
        let current = start.clone();
        while (current.isBefore(end) || current.isSame(end, 'month')) {
            months.push(current.clone());
            current = current.add(1, 'month');
        }
        return { start, end, months };
    }, [roadmapProjects]);

    const getRoadmapPosition = (pStart: dayjs.Dayjs, pEnd: dayjs.Dayjs) => {
        const totalDays = Math.max(1, roadmapRange.end.diff(roadmapRange.start, 'day'));
        const leftDays = pStart.diff(roadmapRange.start, 'day');
        const widthDays = pEnd.diff(pStart, 'day');
        
        const left = Math.max(0, (leftDays / totalDays) * 100);
        const width = Math.min(100 - left, (widthDays / totalDays) * 100);
        return { left: `${left}%`, width: `${width}%` };
    };

    const filteredTableProjects = useMemo(() => {
        let result = projects;
        if (tableStatusFilter) result = result.filter(p => p.status === tableStatusFilter);
        if (tableSearch.trim()) {
            const q = tableSearch.toLowerCase();
            result = result.filter(p => p.name?.toLowerCase().includes(q) || p.project_number?.toLowerCase().includes(q));
        }
        return result;
    }, [projects, tableStatusFilter, tableSearch]);

    const getRiskCellColor = (score: number) => {
        if (score >= 60) return { bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', border: '#ef4444', text: '#ef4444' };
        if (score >= 30) return { bg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)', border: '#f59e0b', text: '#f59e0b' };
        return { bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)', border: '#10b981', text: '#10b981' };
    };

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
    };

    const StatCard = ({ title, value, suffix, icon, gradient, extra }: {
        title: string; value: number | string; suffix?: string;
        icon: React.ReactNode; gradient: string; extra?: React.ReactNode;
    }) => (
        <Card size="small" style={{ ...glassCard, overflow: 'hidden', position: 'relative' }} styles={{ body: { padding: '18px 14px', position: 'relative', zIndex: 1 } }} hoverable>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginTop: 2, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {value}{suffix && <span style={{ fontSize: 16 }}>{suffix}</span>}
                    </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', opacity: 0.85 }}>
                    {icon}
                </div>
            </div>
            {extra && <div style={{ marginTop: 8 }}>{extra}</div>}
        </Card>
    );

    const columns = [
        {
            title: 'Project', dataIndex: 'name', key: 'name',
            render: (_: any, r: any) => (
                <div>
                    <a onClick={() => onSelectProject(r.id)} style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</a>
                    <div style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#888' }}>{r.project_number}</div>
                </div>
            ),
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 100,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status] || { color: '#6b7280', label: status };
                return <Tag color={cfg.color}>{cfg.label.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Priority', dataIndex: 'priority', key: 'priority', width: 90,
            render: (p: string) => <Tag color={PRIORITY_COLORS[p] || '#6b7280'}>{(p || 'medium').toUpperCase()}</Tag>,
        },
        {
            title: 'Task Progress', key: 'tasks', width: 170,
            render: (_: any, r: any) => {
                const tc = r.taskCounts || {};
                const pct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
                return (
                    <div>
                        <Progress percent={pct} size="small" strokeColor={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1'} trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} />
                        <Text type="secondary" style={{ fontSize: 10 }}>{tc.done}/{tc.total} tasks</Text>
                    </div>
                );
            },
        },
        {
            title: 'Budget', key: 'budget', width: 150,
            render: (_: any, r: any) => {
                if (!r.budget) return <Text type="secondary">—</Text>;
                const pct = Math.min(100, Math.round(((r.spent || 0) / r.budget) * 100));
                return (
                    <div>
                        <Progress percent={pct} size="small" strokeColor={pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'} trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} />
                        <Text type="secondary" style={{ fontSize: 10 }}>${(r.spent || 0).toLocaleString()} / ${r.budget.toLocaleString()}</Text>
                    </div>
                );
            },
        },
        {
            title: '', key: 'action', width: 80,
            render: (_: any, r: any) => (
                <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => onSelectProject(r.id)}>Open</Button>
            ),
        },
    ];

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            {contextHolder}

            {/* ── Hero Stats ── */}
            {/* ── Hero Stats ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
                <BentoGrid className="max-w-full">
                    <BentoGridItem
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black">{totalProjects}</span>
                                <span>Total Projects</span>
                            </div>
                        }
                        description={
                            <div className="flex gap-2 flex-wrap">
                                {statusBuckets.filter(s => s.count > 0).map(s => (
                                    <Tag key={s.status} style={{ borderRadius: 10, fontSize: 10, background: s.color + '18', color: s.color, border: `1px solid ${s.color}33`, margin: 0 }}>
                                        {s.count} {s.label}
                                    </Tag>
                                ))}
                            </div>
                        }
                        header={<div className="flex h-full w-full flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10"><ProjectOutlined style={{ fontSize: 64, color: themeColor, opacity: 0.8 }} /></div>}
                        className="md:col-span-1"
                        icon={<FundProjectionScreenOutlined style={{ color: themeColor }} />}
                    />
                    <BentoGridItem
                        title={<div className="text-xl font-bold">Task Completion</div>}
                        description={`${totalDone} of ${totalTasks} tasks done`}
                        header={
                            <div className="flex h-full w-full flex-1 items-center justify-center rounded-xl bg-emerald-500/5">
                                <AnimatedCircularProgressBar
                                    max={100}
                                    min={0}
                                    value={taskCompletion}
                                    gaugePrimaryColor="#10b981"
                                    gaugeSecondaryColor="rgba(16, 185, 129, 0.15)"
                                    className="scale-90"
                                />
                            </div>
                        }
                        className="md:col-span-1"
                        icon={<CheckCircleOutlined className="text-emerald-500" />}
                    />
                    <BentoGridItem
                        title={<div className="text-xl font-bold">Budget Used</div>}
                        description={`$${totalSpent.toLocaleString()} / $${totalBudget.toLocaleString()}`}
                        header={
                            <div className="flex h-full w-full flex-1 items-center justify-center rounded-xl bg-amber-500/5">
                                <AnimatedCircularProgressBar
                                    max={100}
                                    min={0}
                                    value={budgetUtilization}
                                    gaugePrimaryColor={budgetUtilization > 90 ? "#ef4444" : "#f59e0b"}
                                    gaugeSecondaryColor={budgetUtilization > 90 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)"}
                                    className="scale-90"
                                />
                            </div>
                        }
                        className="md:col-span-1"
                        icon={<DollarOutlined className={budgetUtilization > 90 ? "text-red-500" : "text-amber-500"} />}
                    />
                </BentoGrid>
            </motion.div>

            {/* ── Sprint Summary + Risk Heat Map ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
                    {/* Sprint Summary */}
                    <Col xs={24} lg={10}>
                        <Card title={<Space><ThunderboltOutlined style={{ color: '#f59e0b' }} /> Sprint Summary</Space>} size="small" style={glassCard} extra={<Tag color="blue">{sprintSummary.projectCount} projects</Tag>}>
                            <Row gutter={[10, 10]}>
                                {[
                                    { label: 'In Progress', value: sprintSummary.inProgressTasks, color: themeColor, bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.15)' },
                                    { label: 'To Do', value: sprintSummary.todoTasks, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.15)' },
                                    { label: 'Done', value: sprintSummary.doneTasks, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.15)' },
                                ].map(item => (
                                    <Col span={8} key={item.label}>
                                        <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: isDark ? item.bg : item.bg.replace('0.1', '0.05'), border: `1px solid ${item.border}` }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{item.label}</Text>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            {/* Progress bar */}
                            <div style={{ marginTop: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <Text style={{ fontSize: 11, fontWeight: 600 }}>Sprint Progress</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {sprintSummary.totalActiveTasks > 0 ? Math.round((sprintSummary.doneTasks / sprintSummary.totalActiveTasks) * 100) : 0}%
                                    </Text>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', display: 'flex' }}>
                                    <div style={{ width: `${sprintSummary.totalActiveTasks > 0 ? (sprintSummary.doneTasks / sprintSummary.totalActiveTasks) * 100 : 0}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '3px 0 0 3px', transition: 'width 0.5s ease' }} />
                                    <div style={{ width: `${sprintSummary.totalActiveTasks > 0 ? (sprintSummary.inProgressTasks / sprintSummary.totalActiveTasks) * 100 : 0}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>

                            {/* Velocity */}
                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)' }}>
                                <Text style={{ fontSize: 11 }}>Avg. tasks done per project</Text>
                                <Text strong style={{ fontSize: 14, color: themeColor }}>{sprintSummary.velocity}</Text>
                            </div>
                        </Card>
                    </Col>

                    {/* Risk Heat Map */}
                    <Col xs={24} lg={14}>
                        <Card
                            title={<Space><FireOutlined style={{ color: '#ef4444' }} /> Risk Heat Map</Space>} size="small" style={glassCard}
                            extra={
                                <Space size={8}>
                                    <Badge color="#10b981" text={<Text style={{ fontSize: 10 }}>Low</Text>} />
                                    <Badge color="#f59e0b" text={<Text style={{ fontSize: 10 }}>Elevated</Text>} />
                                    <Badge color="#ef4444" text={<Text style={{ fontSize: 10 }}>Critical</Text>} />
                                </Space>
                            }
                        >
                            {riskData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 20 }}>
                                    <SafetyCertificateOutlined style={{ fontSize: 28, color: '#10b981', opacity: 0.5 }} />
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>No active projects to assess</Text></div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                                    {riskData.sort((a, b) => b.riskScore - a.riskScore).map(project => {
                                        const rs = getRiskCellColor(project.riskScore);
                                        return (
                                            <div key={project.id} onClick={() => onSelectProject(project.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
                                                    background: rs.bg, border: `1px solid ${rs.border}22`, cursor: 'pointer', transition: 'all 0.2s ease',
                                                }}>
                                                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: rs.border, minHeight: 24 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{project.name}</Text>
                                                        <Tag style={{ borderRadius: 8, fontSize: 9, lineHeight: '14px', padding: '0 5px', margin: 0, background: rs.bg, color: rs.text, border: `1px solid ${rs.border}33`, fontWeight: 600 }}>
                                                            {project.riskLevel === 'critical' ? '🔴' : project.riskLevel === 'elevated' ? '🟡' : '🟢'} {project.riskScore}
                                                        </Tag>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>📊 {project.progress}%</Text>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>💰 {project.budgetPct}%</Text>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>⏱ {project.timelinePct}%</Text>
                                                        {project.isOverdue && <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>OVERDUE</Text>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </motion.div>

            {/* ── Charts Row: Status + Priority + AI ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={8}>
                        <Card size="small" title={<Space><BarChartOutlined style={{ color: themeColor }} />Status</Space>} style={glassCard}>
                            <div style={{ height: 160 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={statusBuckets.filter(s => s.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} strokeWidth={0}>
                                            {statusBuckets.filter(s => s.count > 0).map((s, i) => <Cell key={i} fill={s.color} />)}
                                        </Pie>
                                        <RTooltip formatter={(v: number, n: string) => [`${v}`, n]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                {statusBuckets.filter(s => s.count > 0).map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                                        <Text type="secondary">{s.label} ({s.count})</Text>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card title={<Space><ExclamationCircleOutlined style={{ color: '#ef4444' }} />Priority</Space>} size="small" style={glassCard}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                                {priorityBuckets.map(p => {
                                    const color = PRIORITY_COLORS[p.priority] || '#6b7280';
                                    const pct = totalProjects > 0 ? Math.round((p.count / totalProjects) * 100) : 0;
                                    return (
                                        <div key={p.priority} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ width: 55, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{p.priority}</Text>
                                            <Progress percent={pct} size="small" strokeColor={color} trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} style={{ flex: 1 }} format={() => `${p.count}`} />
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card title={<Space><BulbOutlined style={{ color: '#f59e0b' }} />AI Insights</Space>} size="small" style={glassCard}
                            extra={<Button size="small" icon={<BulbOutlined />} loading={aiLoading} onClick={handleGenerateAnalysis} style={{ borderRadius: 8 }}>Analyze</Button>}
                        >
                            {aiAnalysis ? (
                                <div>
                                    {aiAnalysis.overallHealthScore !== undefined && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <Progress type="circle" percent={aiAnalysis.overallHealthScore} size={48}
                                                strokeColor={aiAnalysis.overallHealthScore >= 70 ? '#10b981' : aiAnalysis.overallHealthScore >= 40 ? '#f59e0b' : '#ef4444'}
                                                format={(pct) => <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}</span>}
                                            />
                                            <div>
                                                <Text strong style={{ fontSize: 12 }}>Health Score</Text>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>{aiAnalysis.healthSummary || 'Analysis complete.'}</Text></div>
                                            </div>
                                        </div>
                                    )}
                                    {aiAnalysis.recommendations?.slice(0, 3).map((rec: any, i: number) => (
                                        <div key={i} style={{ padding: '6px 8px', marginBottom: 4, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)' }}>
                                            <Text style={{ fontSize: 11 }}>
                                                <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'} style={{ fontSize: 9, borderRadius: 6 }}>{(rec.priority || 'info').toUpperCase()}</Tag>
                                                {rec.recommendation || rec.title}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <BulbOutlined style={{ fontSize: 28, color: '#f59e0b', opacity: 0.4 }} />
                                    <div><Text type="secondary" style={{ fontSize: 11 }}>Click Analyze for AI insights</Text></div>
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </motion.div>

            {/* ── Portfolio Roadmap ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card 
                    title={<Space><ProjectOutlined style={{ color: themeColor }} /> <span style={{ fontWeight: 600 }}>Portfolio Roadmap</span></Space>} 
                    size="small" style={{ ...glassCard, marginBottom: 20 }}
                >
                    {roadmapProjects.length === 0 ? (
                        <Empty description="No projects with dates found for roadmap" style={{ padding: 20 }} />
                    ) : (
                        <div style={{ padding: '10px 0', overflowX: 'auto' }}>
                            <div style={{ minWidth: 600, position: 'relative' }}>
                                {/* Months Header */}
                                <div style={{ display: 'flex', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', marginBottom: 8, paddingBottom: 4 }}>
                                    <div style={{ width: 140, flexShrink: 0 }} /> {/* Label column spacer */}
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        {roadmapRange.months.map((m, i) => (
                                            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase', borderLeft: i > 0 ? (isDark ? '1px dashed rgba(255,255,255,0.05)' : '1px dashed rgba(0,0,0,0.05)') : 'none' }}>
                                                {m.format('MMM YYYY')}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Project Bars */}
                                <div style={{ position: 'relative' }}>
                                    {/* Vertical grid lines */}
                                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 140, right: 0, display: 'flex', zIndex: 0, pointerEvents: 'none' }}>
                                        {roadmapRange.months.map((m, i) => (
                                            <div key={i} style={{ flex: 1, borderLeft: i > 0 ? (isDark ? '1px dashed rgba(255,255,255,0.05)' : '1px dashed rgba(0,0,0,0.05)') : 'none' }} />
                                        ))}
                                    </div>

                                    {/* Rows */}
                                    {roadmapProjects.map(p => {
                                        const pos = getRoadmapPosition(p.start, p.end);
                                        const cfg = STATUS_CONFIG[p.status] || { color: '#6b7280' };
                                        
                                        return (
                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, position: 'relative', zIndex: 1, height: 28 }}>
                                                {/* Label */}
                                                <div style={{ width: 140, flexShrink: 0, paddingRight: 8, display: 'flex', alignItems: 'center' }}>
                                                    <Text ellipsis style={{ fontSize: 11, fontWeight: 500, cursor: 'pointer' }} onClick={() => onSelectProject(p.id)} title={p.name}>
                                                        {p.name}
                                                    </Text>
                                                </div>
                                                
                                                {/* Timeline Track */}
                                                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                                                    <Tooltip title={`${p.name} (${p.start.format('MMM D')} - ${p.end.format('MMM D')})`}>
                                                        <div onClick={() => onSelectProject(p.id)} style={{
                                                            position: 'absolute',
                                                            left: pos.left,
                                                            width: pos.width,
                                                            height: 20,
                                                            top: 4,
                                                            background: cfg.color,
                                                            borderRadius: 4,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '0 6px',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                            opacity: 0.9,
                                                        }}>
                                                            {parseFloat(pos.width) > 10 && (
                                                                <span style={{ fontSize: 9, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {p.status.toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </motion.div>

            {/* ── Project Table ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card
                    title={<Space><ProjectOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>All Projects</span><Tag color="blue">{totalProjects}</Tag></Space>}
                    style={glassCard} size="small"
                    extra={
                        <Space>
                            <Input prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} placeholder="Search..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} allowClear style={{ width: 180, borderRadius: 8 }} size="small" />
                            <Select placeholder="Status" allowClear value={tableStatusFilter} onChange={setTableStatusFilter} style={{ width: 120 }} size="small"
                                options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))} />
                            <Button icon={<ReloadOutlined />} onClick={loadData} size="small" />
                        </Space>
                    }
                >
                    {projects.length === 0 ? (
                        <Empty description="No projects found. Create one from the Projects page." />
                    ) : (
                        <Table scroll={{ x: 800 }} dataSource={filteredTableProjects} columns={columns} rowKey="id"
                            pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total: number) => `${total} projects` }} size="small" />
                    )}
                </Card>
            </motion.div>
        </div>
    );
}

