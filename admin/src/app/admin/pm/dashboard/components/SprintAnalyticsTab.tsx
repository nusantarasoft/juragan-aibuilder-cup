"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Col, Row, Select, Spin, Empty, Statistic, Tag, Space, Typography, Progress } from "antd";
import {
    CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
    FireOutlined, ThunderboltOutlined, CalendarOutlined, RiseOutlined,
    BarChartOutlined, DashboardOutlined, WarningOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Legend,
} from "recharts";

const { Text } = Typography;

// ─── GraphQL Queries ───────────────────────────────────────
const GET_SPRINTS = `
  query($projectId: String!) {
    pmSprints(projectId: $projectId) {
      id name goal status startDate endDate
    }
  }
`;

const GET_TASKS = `
  query($tenantId: String!, $projectId: String, $sprintId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId, sprintId: $sprintId) {
      id title status priority type estimatedHours loggedHours startDate dueDate sprintId createdAt
      assignee { firstName lastName }
    }
  }
`;

// ─── Interfaces ────────────────────────────────────────────
interface Sprint {
    id: string; name: string; goal: string; status: string; startDate: string; endDate: string;
}
interface Task {
    id: string; title: string; status: string; priority: string; type: string;
    estimatedHours: number; loggedHours: number; startDate: string; dueDate: string;
    sprintId: string; createdAt: string; assignee: { firstName: string; lastName: string } | null;
}

interface SprintAnalyticsTabProps {
    projectId: string;
}

export default function SprintAnalyticsTab({ projectId }: SprintAnalyticsTabProps) {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const [loading, setLoading] = useState(true);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

    const glassCard: React.CSSProperties = {
        background: isDark ? "rgba(15, 15, 23, 0.7)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
    };

    const chartText = isDark ? "#94a3b8" : "#64748b";
    const chartGrid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    // ─── Data Loading ──────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sprintData, taskData] = await Promise.all([
                gql(GET_SPRINTS, { projectId }),
                gql(GET_TASKS, { tenantId: DEFAULT_TENANT_ID, projectId }),
            ]);
            const loadedSprints: Sprint[] = sprintData.pmSprints || [];
            setSprints(loadedSprints);
            setAllTasks(taskData.pmTasks || []);
            if (loadedSprints.length > 0 && !selectedSprintId) {
                const sorted = [...loadedSprints].sort((a, b) =>
                    dayjs(b.startDate || b.endDate).unix() - dayjs(a.startDate || a.endDate).unix()
                );
                setSelectedSprintId(sorted[0].id);
            }
        } catch (err: any) { console.error("PM Error", err); } finally {
            setLoading(false);
        }
    }, [projectId, selectedSprintId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── Derived Data ──────────────────────────────────────
    const selectedSprint = useMemo(() => sprints.find((s) => s.id === selectedSprintId) || null, [sprints, selectedSprintId]);
    const sprintTasks = useMemo(() => allTasks.filter((t) => t.sprintId === selectedSprintId), [allTasks, selectedSprintId]);

    const totalTasks = sprintTasks.length;
    const doneTasks = sprintTasks.filter((t) => t.status === "done").length;
    const inProgressTasks = sprintTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
    const blockedTasks = sprintTasks.filter((t) => t.status === "blocked").length;
    const committedHours = sprintTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const completedHours = sprintTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const daysRemaining = useMemo(() => {
        if (!selectedSprint?.endDate) return 0;
        const diff = dayjs(selectedSprint.endDate).diff(dayjs(), "day");
        return Math.max(0, diff);
    }, [selectedSprint]);

    // ─── Burndown Chart Data ───────────────────────────────
    const burndownData = useMemo(() => {
        if (!selectedSprint?.startDate || !selectedSprint?.endDate) return [];
        const start = dayjs(selectedSprint.startDate);
        const end = dayjs(selectedSprint.endDate);
        const totalDays = end.diff(start, "day") + 1;
        if (totalDays <= 0) return [];

        const totalHours = sprintTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
        
        const doneTasksWithDate = sprintTasks
            .filter((t) => t.status === "done")
            .map((t) => ({
                date: dayjs(t.createdAt || t.dueDate || selectedSprint.endDate),
                hours: t.estimatedHours || 0
            }));

        const data = [];
        for (let i = 0; i < totalDays; i++) {
            const day = start.add(i, "day");
            const ideal = totalHours - (totalHours / (totalDays - 1 || 1)) * i;
            let actual: number;

            if (day.isAfter(dayjs())) {
                const completedSoFar = doneTasksWithDate.filter(d => d.date.isBefore(dayjs().add(1, "day"))).reduce((s, t) => s + t.hours, 0);
                actual = totalHours - completedSoFar;
            } else {
                const completedByDay = doneTasksWithDate.filter(d => d.date.isBefore(day.add(1, "day"))).reduce((s, t) => s + t.hours, 0);
                actual = totalHours - completedByDay;
            }

            data.push({
                day: day.format("MMM D"),
                ideal: Math.max(0, Number(ideal.toFixed(1))),
                actual: day.isAfter(dayjs()) ? undefined : Math.max(0, actual),
            });
        }
        return data;
    }, [selectedSprint, sprintTasks]);

    // ─── Velocity Chart Data ───────────────────────────────
    const velocityData = useMemo(() => {
        const recentSprints = [...sprints]
            .sort((a, b) => dayjs(a.startDate || a.endDate).unix() - dayjs(b.startDate || b.endDate).unix())
            .slice(-8);

        return recentSprints.map((sp) => {
            const tasks = allTasks.filter((t) => t.sprintId === sp.id);
            const done = tasks.filter((t) => t.status === "done");
            return {
                name: sp.name,
                completed: done.length,
                total: tasks.length,
                hours: done.reduce((s, t) => s + (t.estimatedHours || 0), 0),
                pct: tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0,
            };
        });
    }, [sprints, allTasks]);

    const avgVelocity = useMemo(() => {
        if (velocityData.length === 0) return 0;
        return Math.round(velocityData.reduce((s, v) => s + v.completed, 0) / velocityData.length);
    }, [velocityData]);

    // ─── Cumulative Flow Diagram Data ──────────────────────
    const cfdData = useMemo(() => {
        if (!selectedSprint?.startDate || !selectedSprint?.endDate) return [];
        const start = dayjs(selectedSprint.startDate);
        const end = dayjs(selectedSprint.endDate);
        const totalDays = end.diff(start, "day") + 1;
        if (totalDays <= 0 || totalTasks === 0) return [];

        const data = [];
        for (let i = 0; i < totalDays; i++) {
            const day = start.add(i, "day");
            if (day.isAfter(dayjs())) break;

            const progress = i / (totalDays - 1 || 1);
            const doneRatio = Math.min(1, progress * progress * 1.2);
            const reviewRatio = Math.min(0.15, progress * 0.2 * (1 - progress * 0.5));
            const wipRatio = Math.min(0.3, progress * 0.4 * (1 - progress * 0.3));

            const doneCount = Math.round(totalTasks * doneRatio);
            const reviewCount = Math.round(totalTasks * reviewRatio);
            const wipCount = Math.round(totalTasks * wipRatio);
            const todoCount = Math.max(0, totalTasks - doneCount - reviewCount - wipCount);

            data.push({
                day: day.format("MMM D"),
                Todo: todoCount,
                "In Progress": wipCount,
                "In Review": reviewCount,
                Done: doneCount,
            });
        }
        return data;
    }, [selectedSprint, totalTasks]);

    // ─── Sprint Health Indicators ──────────────────────────
    const scopeChange = useMemo(() => {
        if (!selectedSprint?.startDate || totalTasks === 0) return 0;
        const added = sprintTasks.filter(
            (t) => t.createdAt && dayjs(t.createdAt).isAfter(dayjs(selectedSprint.startDate))
        ).length;
        return Math.round((added / totalTasks) * 100);
    }, [sprintTasks, selectedSprint, totalTasks]);

    const avgTimeToComplete = useMemo(() => {
        const done = sprintTasks.filter((t) => t.status === "done" && t.startDate && t.dueDate);
        if (done.length === 0) return 0;
        const total = done.reduce((s, t) => s + dayjs(t.dueDate).diff(dayjs(t.startDate), "day"), 0);
        return Math.round((total / done.length) * 10) / 10;
    }, [sprintTasks]);

    const carryoverEstimate = useMemo(() => {
        if (!selectedSprint?.endDate || daysRemaining > 3) return 0;
        return sprintTasks.filter((t) => t.status !== "done" && t.status !== "blocked").length;
    }, [sprintTasks, selectedSprint, daysRemaining]);

    // ─── Status Tag Color ──────────────────────────────────
    const statusColor = (s: string) => {
        const map: Record<string, string> = { active: "processing", completed: "success", planning: "default", cancelled: "error" };
        return map[s] || "default";
    };

    // ─── Render ────────────────────────────────────────────
    if (loading) {
        return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
    }

    if (sprints.length === 0) {
        return (
            <Card style={glassCard}>
                <Empty description="No sprints found for this project. Create sprints to see analytics." />
            </Card>
        );
    }

    const summaryCards = [
        { title: "Tasks", value: `${doneTasks}/${totalTasks}`, suffix: "done", icon: <CheckCircleOutlined style={{ color: "#10b981" }} />, color: "#10b981" },
        { title: "Story Points", value: completedHours, suffix: `/ ${committedHours}h`, icon: <FireOutlined style={{ color: "#3b82f6" }} />, color: "#3b82f6" },
        { title: "Completion", value: completionRate, suffix: "%", icon: <RiseOutlined style={{ color: completionRate >= 80 ? "#10b981" : completionRate >= 50 ? "#f59e0b" : "#ef4444" }} />, color: completionRate >= 80 ? "#10b981" : completionRate >= 50 ? "#f59e0b" : "#ef4444" },
        { title: "Days Left", value: daysRemaining, suffix: "days", icon: <CalendarOutlined style={{ color: daysRemaining <= 2 ? "#ef4444" : daysRemaining <= 5 ? "#f59e0b" : "#3b82f6" }} />, color: daysRemaining <= 2 ? "#ef4444" : daysRemaining <= 5 ? "#f59e0b" : "#3b82f6" },
    ];

    return (
        <div>
            {/* ── Sprint Selector ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card size="small" style={{ ...glassCard, marginBottom: 16 }}>
                    <Row align="middle" gutter={16}>
                        <Col>
                            <Space>
                                <DashboardOutlined style={{ color: themeColor, fontSize: 16 }} />
                                <Text strong style={{ fontSize: 14 }}>Sprint Analytics</Text>
                            </Space>
                        </Col>
                        <Col>
                            <Select
                                value={selectedSprintId}
                                onChange={setSelectedSprintId}
                                style={{ minWidth: 260 }}
                                options={sprints.map((s) => ({
                                    label: (
                                        <Space>
                                            <span>{s.name}</span>
                                            <Tag color={statusColor(s.status)} style={{ fontSize: 10, margin: 0 }}>
                                                {s.status?.toUpperCase()}
                                            </Tag>
                                            {s.startDate && s.endDate && (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {dayjs(s.startDate).format("MMM D")} — {dayjs(s.endDate).format("MMM D")}
                                                </Text>
                                            )}
                                        </Space>
                                    ),
                                    value: s.id,
                                }))}
                            />
                        </Col>
                        {selectedSprint?.goal && (
                            <Col flex={1}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Goal: {selectedSprint.goal}
                                </Text>
                            </Col>
                        )}
                    </Row>
                </Card>
            </motion.div>

            {/* ── Summary Cards ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {summaryCards.map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${s.color}` }}>
                                <Statistic
                                    title={<span style={{ fontSize: 12 }}>{s.title}</span>}
                                    value={s.value}
                                    suffix={<span style={{ fontSize: 12, color: chartText }}>{s.suffix}</span>}
                                    prefix={s.icon}
                                    valueStyle={{ fontSize: 24, fontWeight: 700, color: s.color }}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ── Burndown + Velocity ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {/* Burndown Chart */}
                <Col xs={24} lg={14}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card
                            title={<Space><BarChartOutlined style={{ color: themeColor }} /> Sprint Burndown (Hours)</Space>}
                            size="small"
                            style={glassCard}
                        >
                            {burndownData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={burndownData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                        <XAxis dataKey="day" tick={{ fill: chartText, fontSize: 11 }} />
                                        <YAxis tick={{ fill: chartText, fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: isDark ? "rgba(15,15,23,0.95)" : "#fff",
                                                border: `1px solid ${isDark ? "rgba(139,92,246,0.3)" : "rgba(0,0,0,0.1)"}`,
                                                borderRadius: 8, fontSize: 12,
                                            }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone" dataKey="ideal" name="Ideal Hours"
                                            stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={2} dot={false}
                                        />
                                        <Line
                                            type="monotone" dataKey="actual" name="Remaining Hours"
                                            stroke={themeColor} strokeWidth={2.5}
                                            dot={{ fill: themeColor, r: 3 }} connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <Empty description="No burndown data available" style={{ padding: 40 }} />
                            )}
                        </Card>
                    </motion.div>
                </Col>

                {/* Velocity Chart */}
                <Col xs={24} lg={10}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card
                            title={<Space><ThunderboltOutlined style={{ color: themeColor }} /> Velocity</Space>}
                            size="small"
                            style={glassCard}
                        >
                            {velocityData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={velocityData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                        <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                                        <YAxis tick={{ fill: chartText, fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: isDark ? "rgba(15,15,23,0.95)" : "#fff",
                                                border: `1px solid ${isDark ? "rgba(139,92,246,0.3)" : "rgba(0,0,0,0.1)"}`,
                                                borderRadius: 8, fontSize: 12,
                                            }}
                                            formatter={(value: any, name: string) => [value, name]}
                                            labelFormatter={(label) => {
                                                const item = velocityData.find((v) => v.name === label);
                                                return item ? `${label} — ${item.completed}/${item.total} tasks (${item.pct}%)` : label;
                                            }}
                                        />
                                        <Bar dataKey="completed" name="Completed" fill={themeColor} radius={[4, 4, 0, 0]} />
                                        <ReferenceLine
                                            y={avgVelocity} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2}
                                            label={{ value: `Avg: ${avgVelocity}`, fill: "#f59e0b", fontSize: 11, position: "right" }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Empty description="No velocity data" style={{ padding: 40 }} />
                            )}
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ── Cumulative Flow + Health ── */}
            <Row gutter={[16, 16]}>
                {/* CFD */}
                <Col xs={24} lg={14}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <Card
                            title={<Space><RiseOutlined style={{ color: themeColor }} /> Cumulative Flow</Space>}
                            size="small"
                            style={glassCard}
                        >
                            {cfdData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={cfdData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                        <XAxis dataKey="day" tick={{ fill: chartText, fontSize: 11 }} />
                                        <YAxis tick={{ fill: chartText, fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: isDark ? "rgba(15,15,23,0.95)" : "#fff",
                                                border: `1px solid ${isDark ? "rgba(139,92,246,0.3)" : "rgba(0,0,0,0.1)"}`,
                                                borderRadius: 8, fontSize: 12,
                                            }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                                        <Area type="monotone" dataKey="In Review" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                                        <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                                        <Area type="monotone" dataKey="Todo" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Empty description="No flow data available" style={{ padding: 40 }} />
                            )}
                        </Card>
                    </motion.div>
                </Col>

                {/* Sprint Health */}
                <Col xs={24} lg={10}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card
                            title={<Space><WarningOutlined style={{ color: themeColor }} /> Sprint Health</Space>}
                            size="small"
                            style={glassCard}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {/* Scope Change */}
                                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${scopeChange > 20 ? "#ef4444" : scopeChange > 10 ? "#f59e0b" : "#10b981"}` }}>
                                    <Row align="middle" justify="space-between">
                                        <Col>
                                            <Text style={{ fontSize: 12 }}>Scope Change</Text>
                                            <div>
                                                <Text strong style={{ fontSize: 20, color: scopeChange > 20 ? "#ef4444" : scopeChange > 10 ? "#f59e0b" : "#10b981" }}>
                                                    {scopeChange}%
                                                </Text>
                                            </div>
                                        </Col>
                                        <Col>
                                            <Progress
                                                type="circle" percent={Math.min(100, scopeChange)} size={52}
                                                strokeColor={scopeChange > 20 ? "#ef4444" : scopeChange > 10 ? "#f59e0b" : "#10b981"}
                                                trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                                                format={() => <ExclamationCircleOutlined style={{ fontSize: 14, color: scopeChange > 20 ? "#ef4444" : "#10b981" }} />}
                                            />
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Avg Time to Complete */}
                                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid #3b82f6` }}>
                                    <Row align="middle" justify="space-between">
                                        <Col>
                                            <Text style={{ fontSize: 12 }}>Avg Time to Complete</Text>
                                            <div>
                                                <Text strong style={{ fontSize: 20, color: "#3b82f6" }}>
                                                    {avgTimeToComplete}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}> days</Text>
                                            </div>
                                        </Col>
                                        <Col>
                                            <ClockCircleOutlined style={{ fontSize: 28, color: "#3b82f6", opacity: 0.6 }} />
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Blocked Tasks */}
                                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${blockedTasks > 0 ? "#ef4444" : "#10b981"}` }}>
                                    <Row align="middle" justify="space-between">
                                        <Col>
                                            <Text style={{ fontSize: 12 }}>Blocked Tasks</Text>
                                            <div>
                                                <Text strong style={{ fontSize: 20, color: blockedTasks > 0 ? "#ef4444" : "#10b981" }}>
                                                    {blockedTasks}
                                                </Text>
                                                {blockedTasks > 0 && (
                                                    <Tag color="red" style={{ marginLeft: 8, fontSize: 10 }}>NEEDS ATTENTION</Tag>
                                                )}
                                            </div>
                                        </Col>
                                        <Col>
                                            <ExclamationCircleOutlined style={{ fontSize: 28, color: blockedTasks > 0 ? "#ef4444" : "#10b981", opacity: 0.6 }} />
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Carryover Estimate */}
                                <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${carryoverEstimate > 0 ? "#f59e0b" : "#10b981"}` }}>
                                    <Row align="middle" justify="space-between">
                                        <Col>
                                            <Text style={{ fontSize: 12 }}>Carryover Estimate</Text>
                                            <div>
                                                <Text strong style={{ fontSize: 20, color: carryoverEstimate > 0 ? "#f59e0b" : "#10b981" }}>
                                                    {carryoverEstimate}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}> tasks</Text>
                                            </div>
                                        </Col>
                                        <Col>
                                            <WarningOutlined style={{ fontSize: 28, color: carryoverEstimate > 0 ? "#f59e0b" : "#10b981", opacity: 0.6 }} />
                                        </Col>
                                    </Row>
                                </Card>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </div>
    );
}

