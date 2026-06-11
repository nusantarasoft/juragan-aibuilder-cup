"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import {
    Badge, Button, Card, Col, Collapse, Empty, Input, InputNumber, message,
    Modal, Progress, Row, Select, Space, Spin, Statistic, Tag, Tooltip, Typography
} from "antd";
import {
    CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
    FireOutlined, UserOutlined, CalendarOutlined, ProjectOutlined,
    ThunderboltOutlined, RocketOutlined, PlusOutlined, ReloadOutlined,
    CarryOutOutlined, FieldTimeOutlined, ArrowUpOutlined, MinusOutlined,
    ArrowDownOutlined, SmileOutlined, SearchOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell } from "recharts";
import TimeTracker from "../components/TimeTracker";

const { Text, Title } = Typography;

// ── GraphQL ──────────────────────────────────────────────
const GET_ME = `query { me { id email fullName role } }`;

const GET_MY_TASKS = `
  query($tenantId: String!, $assigneeId: String) {
    pmTasks(tenantId: $tenantId, assigneeId: $assigneeId) {
      id projectId sprintId title description status priority type
      assigneeId estimatedHours loggedHours startDate dueDate tags createdAt
      assignee { id firstName lastName }
    }
  }
`;

const GET_PROJECTS = `
  query($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
  }
`;

const UPDATE_TASK = `
  mutation UpdateTask($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) { id status }
  }
`;

const LOG_TIME = `
  mutation LogTime($tenantId: String!, $input: CreatePmTimeLogInput!) {
    logPmTime(tenantId: $tenantId, input: $input) { id hours }
  }
`;

const STATUS_FLOW = ["todo", "in_progress", "in_review", "done"] as const;
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    todo: { color: "#64748b", icon: <CarryOutOutlined />, label: "To Do" },
    in_progress: { color: "#3b82f6", icon: <ClockCircleOutlined />, label: "In Progress" },
    in_review: { color: "var(--theme-color, #8b5cf6)", icon: <ThunderboltOutlined />, label: "In Review" },
    done: { color: "#10b981", icon: <CheckCircleOutlined />, label: "Done" },
};

const PRIORITY_ICON: Record<string, React.ReactNode> = {
    critical: <FireOutlined style={{ color: "#ef4444" }} />,
    high: <ArrowUpOutlined style={{ color: "#f59e0b" }} />,
    medium: <MinusOutlined style={{ color: "#3b82f6" }} />,
    low: <ArrowDownOutlined style={{ color: "#6b7280" }} />,
};

const DEMO_USER = { id: "demo", email: "demo@nusantarasoft.com", fullName: "Demo User", role: "member" };

export default function MyWorkPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    // Quick log time
    const [logModal, setLogModal] = useState(false);
    const [logTask, setLogTask] = useState<string | null>(null);
    const [logHours, setLogHours] = useState<number>(1);
    const [logDesc, setLogDesc] = useState("");
    const [logSaving, setLogSaving] = useState(false);
    const [taskSearch, setTaskSearch] = useState("");

    const glassCard = {
        background: isDark ? "rgba(15, 15, 23, 0.7)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
    };

    // ── Data Loading ─────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        let currentUser = DEMO_USER;
        try {
            const meData = await gql(GET_ME, {});
            if (meData?.me) currentUser = meData.me;
        } catch (err: any) { console.error("PM Error", err); }
        setUser(currentUser);

        try {
            const [taskData, projData] = await Promise.all([
                gql(GET_MY_TASKS, { tenantId: DEFAULT_TENANT_ID, assigneeId: currentUser.id }),
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setTasks(taskData.pmTasks || []);
            setProjects(projData.pmProjects || []);
        } catch (err: any) { console.error("PM Error", err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Project Map ──────────────────────────────────────────
    const projectMap = useMemo(() => {
        const m = new Map<string, any>();
        projects.forEach(p => m.set(p.id, p));
        return m;
    }, [projects]);

    // ── Time-of-day greeting ─────────────────────────────────
    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    }, []);

    // ── Computed data ────────────────────────────────────────
    const today = dayjs().startOf("day");

    const overdueTasks = useMemo(() =>
        tasks.filter(t => t.dueDate && dayjs(t.dueDate).isBefore(today) && t.status !== "done"),
    [tasks, today]);

    const dueTodayTasks = useMemo(() =>
        tasks.filter(t => t.dueDate && dayjs(t.dueDate).isSame(today, "day") && t.status !== "done"),
    [tasks, today]);

    const inProgressCount = tasks.filter(t => t.status === "in_progress").length;

    const tasksByStatus = useMemo(() => {
        const map: Record<string, any[]> = { todo: [], in_progress: [], in_review: [], done: [] };
        tasks.forEach(t => {
            // For "done", only show tasks completed today (by createdAt or if status is done today)
            if (t.status === "done") {
                map.done.push(t);
            } else if (map[t.status]) {
                map[t.status].push(t);
            }
        });
        return map;
    }, [tasks]);

    // -- Filtered by search --
    const filteredTasksByStatus = useMemo(() => {
        if (!taskSearch.trim()) return tasksByStatus;
        const q = taskSearch.toLowerCase();
        const filtered: Record<string, any[]> = { todo: [], in_progress: [], in_review: [], done: [] };
        Object.entries(tasksByStatus).forEach(([status, items]) => {
            filtered[status] = items.filter((t: any) =>
                t.title?.toLowerCase().includes(q) ||
                projectMap.get(t.projectId)?.name?.toLowerCase().includes(q)
            );
        });
        return filtered;
    }, [tasksByStatus, taskSearch, projectMap]);

    // -- Recently completed (last 5 done tasks) --
    const recentlyCompleted = useMemo(() =>
        tasks
            .filter(t => t.status === "done")
            .sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix())
            .slice(0, 5),
    [tasks]);

    // -- Productivity streak --
    const streak = useMemo(() => {
        let count = 0;
        for (let i = 0; i < 30; i++) {
            const day = dayjs().subtract(i, "day");
            const hasDone = tasks.some(t =>
                t.status === "done" && t.createdAt && dayjs(t.createdAt).isSame(day, "day")
            );
            if (hasDone) count++;
            else if (i > 0) break;
        }
        return count;
    }, [tasks]);

    // ── Weekly summary ───────────────────────────────────────
    const weeklyData = useMemo(() => {
        const startOfWeek = dayjs().startOf("week").add(1, "day"); // Monday
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
        return days.map((name, i) => {
            const day = startOfWeek.add(i, "day");
            const count = tasks.filter(t =>
                t.status === "done" && t.createdAt && dayjs(t.createdAt).isSame(day, "day")
            ).length;
            return { name, count };
        });
    }, [tasks]);

    const weeklyDone = weeklyData.reduce((s, d) => s + d.count, 0);
    const weeklyHours = useMemo(() =>
        tasks.filter(t => t.status === "done").reduce((s, t) => s + (t.loggedHours || 0), 0),
    [tasks]);

    // ── Active projects (that I have tasks in) ───────────────
    const activeProjects = useMemo(() => {
        const counts = new Map<string, { total: number; done: number }>();
        tasks.forEach(t => {
            if (!counts.has(t.projectId)) counts.set(t.projectId, { total: 0, done: 0 });
            const c = counts.get(t.projectId)!;
            c.total++;
            if (t.status === "done") c.done++;
        });
        return Array.from(counts.entries())
            .map(([pid, c]) => ({ project: projectMap.get(pid), ...c }))
            .filter(p => p.project)
            .sort((a, b) => b.total - a.total);
    }, [tasks, projectMap]);

    // ── Handlers ─────────────────────────────────────────────
    const cycleStatus = async (task: any) => {
        const idx = STATUS_FLOW.indexOf(task.status);
        const next = STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
        try {
            await gql(UPDATE_TASK, { id: task.id, input: { status: next } });
            messageApi.success(`Moved to ${STATUS_CONFIG[next]?.label}`);
            loadData();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to update status"); }
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await gql(UPDATE_TASK, { id: taskId, input: { status: newStatus } });
            messageApi.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label}`);
            loadData();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to update status"); }
    };

    const handleLogTime = async () => {
        if (!logTask || !logHours) { messageApi.warning("Select task and hours"); return; }
        setLogSaving(true);
        try {
            await gql(LOG_TIME, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    taskId: logTask,
                    userId: user?.id || "demo",
                    hours: logHours,
                    logDate: dayjs().format("YYYY-MM-DD"),
                    description: logDesc || undefined,
                },
            });
            messageApi.success("Time logged!");
            setLogModal(false);
            setLogTask(null);
            setLogHours(1);
            setLogDesc("");
            loadData();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to log time"); }
        finally { setLogSaving(false); }
    };

    // ── Task Row Renderer ────────────────────────────────────
    const renderTaskRow = (t: any, accent?: string) => {
        const proj = projectMap.get(t.projectId);
        const isOverdue = t.dueDate && dayjs(t.dueDate).isBefore(today) && t.status !== "done";
        return (
            <motion.div
                key={t.id}
                role="button"
                aria-label={`Task: ${t.title}`}
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/admin/pm/tasks/${t.id}`); } }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4 }}
                style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderRadius: 10, marginBottom: 6, cursor: "pointer",
                    background: isDark ? "rgba(30,30,44,0.6)" : "rgba(255,255,255,0.7)",
                    border: isDark ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(0,0,0,0.04)",
                    borderLeft: `3px solid ${accent || STATUS_CONFIG[t.status]?.color || "#64748b"}`,
                }}
                onClick={() => router.push(`/admin/pm/tasks/${t.id}`)}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>{t.title}</Text>
                    <Space size={4} style={{ marginTop: 4 }}>
                        {proj && <Tag color="geekblue" style={{ fontSize: 10, borderRadius: 6, padding: "0 6px", margin: 0 }}>{proj.name}</Tag>}
                        {t.priority && PRIORITY_ICON[t.priority]}
                        {t.type && <Tag color={t.type === "bug" ? "red" : t.type === "story" ? "green" : "purple"} style={{ fontSize: 10, borderRadius: 6, padding: "0 6px", margin: 0 }}>{t.type}</Tag>}
                    </Space>
                </div>
                {t.dueDate && (
                    <Text style={{ fontSize: 11, color: isOverdue ? "#ef4444" : isDark ? "#94a3b8" : "#888", whiteSpace: "nowrap" }}>
                        <CalendarOutlined style={{ marginRight: 3 }} />
                        {dayjs(t.dueDate).format("MMM D")}
                    </Text>
                )}
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    <ClockCircleOutlined style={{ marginRight: 3 }} />
                    {t.loggedHours || 0}h
                </Text>
                <Select
                    size="small" value={t.status} variant="borderless"
                    style={{ width: 120 }}
                    onClick={e => e.stopPropagation()}
                    onChange={val => handleStatusChange(t.id, val)}
                    options={STATUS_FLOW.map(s => ({ label: <Tag color={STATUS_CONFIG[s].color} style={{ margin: 0, fontSize: 10 }}>{STATUS_CONFIG[s].label}</Tag>, value: s }))}
                    aria-label={`Change status for ${t.title}`}
                />
            </motion.div>
        );
    };

    // ── Loading State ────────────────────────────────────────
    if (loading) {
        return (
            <CMSLayout
                title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>My Work</AuroraText>}
                subTitle={<DecryptedText text="Your personal task dashboard" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            >
                <div style={{ textAlign: "center", padding: 120 }}><Spin size="large" /></div>
            </CMSLayout>
        );
    }

    const userName = user?.fullName || user?.email?.split("@")[0] || "there";

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>My Work</AuroraText>}
            subTitle={<DecryptedText text="Your personal task dashboard" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="log" type="primary" icon={<FieldTimeOutlined />} onClick={() => setLogModal(true)}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 8 }}
                    aria-label="Log Time">
                    Log Time
                </Button>,
                <Button key="reload" type="text" icon={<ReloadOutlined />} onClick={loadData} aria-label="Reload data" />,
            ]}
        >
            {contextHolder}

            {/* ── Welcome Header ── */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card style={{ ...glassCard, marginBottom: 20, borderLeft: `4px solid ${themeColor}` }} size="small" role="region" aria-label="Welcome summary">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>
                                {greeting}, <span style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{userName}</span> 👋
                            </Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>{dayjs().format("dddd, MMMM D, YYYY")}</Text>
                        </div>
                        <Space size={24}>
                            <Statistic title={<span style={{ fontSize: 11 }}>Due Today</span>} value={dueTodayTasks.length} valueStyle={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }} prefix={<CalendarOutlined />} />
                            <Statistic title={<span style={{ fontSize: 11 }}>Overdue</span>} value={overdueTasks.length} valueStyle={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }} prefix={<ExclamationCircleOutlined />} />
                            <Statistic title={<span style={{ fontSize: 11 }}>In Progress</span>} value={inProgressCount} valueStyle={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }} prefix={<ClockCircleOutlined />} />
                        </Space>
                    </div>
                </Card>
            </motion.div>

            {/* ── Time Tracker ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card size="small" style={{ ...glassCard, marginBottom: 20 }} role="region" aria-label="Time tracker">
                    <TimeTracker compact onTimeLogged={loadData} />
                </Card>
            </motion.div>

            <Row gutter={[20, 20]}>
                {/* ── Main Content Column ── */}
                <Col xs={24} lg={18}>
                    {/* ── Focus: Due Today / Overdue ── */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card
                            title={<Space><ExclamationCircleOutlined style={{ color: "#ef4444" }} /><span style={{ fontWeight: 600 }}>Focus — Needs Attention</span><Badge count={overdueTasks.length + dueTodayTasks.length} style={{ backgroundColor: "#ef4444" }} /></Space>}
                            size="small"
                            style={{ ...glassCard, marginBottom: 20 }}
                            role="region"
                            aria-label="Tasks needing attention"
                        >
                            {overdueTasks.length === 0 && dueTodayTasks.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "30px 0" }}>
                                    <SmileOutlined style={{ fontSize: 36, color: "#10b981", marginBottom: 8 }} />
                                    <div><Text strong style={{ fontSize: 15, color: "#10b981" }}>All caught up! 🎉</Text></div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>No overdue or urgent tasks. Great job!</Text>
                                </div>
                            ) : (
                                <>
                                    {overdueTasks.length > 0 && (
                                        <div style={{ marginBottom: overdueTasks.length > 0 && dueTodayTasks.length > 0 ? 12 : 0 }}>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" }}>
                                                🔴 Overdue ({overdueTasks.length})
                                            </Text>
                                            {overdueTasks.map(t => renderTaskRow(t, "#ef4444"))}
                                        </div>
                                    )}
                                    {dueTodayTasks.length > 0 && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" }}>
                                                🟠 Due Today ({dueTodayTasks.length})
                                            </Text>
                                            {dueTodayTasks.map(t => renderTaskRow(t, "#f59e0b"))}
                                        </div>
                                    )}
                                </>
                            )}
                        </Card>
                    </motion.div>

                    {/* ── Tasks Grouped by Status ── */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <Space><CarryOutOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>My Tasks</span><Tag color="purple">{tasks.length}</Tag></Space>
                                    <Input
                                        prefix={<SearchOutlined style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }} />}
                                        placeholder="Filter tasks..."
                                        value={taskSearch}
                                        onChange={e => setTaskSearch(e.target.value)}
                                        allowClear
                                        style={{ width: 180, borderRadius: 8 }}
                                        size="small"
                                    />
                                </div>
                            }
                            size="small"
                            style={{ ...glassCard, marginBottom: 20 }}
                            role="region"
                            aria-label="My tasks grouped by status"
                        >
                            {tasks.length === 0 ? (
                                <Empty description="No tasks assigned yet. Check back soon!" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <Collapse
                                    ghost
                                    defaultActiveKey={["todo", "in_progress", "in_review"]}
                                    items={STATUS_FLOW.map(status => {
                                        const items = filteredTasksByStatus[status] || [];
                                        const cfg = STATUS_CONFIG[status];
                                        return {
                                            key: status,
                                            label: (
                                                <Space>
                                                    {cfg.icon}
                                                    <Text strong style={{ color: cfg.color }}>{cfg.label}</Text>
                                                    <Badge count={items.length} style={{ backgroundColor: cfg.color }} size="small" />
                                                </Space>
                                            ),
                                            children: items.length === 0
                                                ? <Text type="secondary" style={{ fontSize: 12, padding: "8px 0", display: "block" }}>No tasks in this status</Text>
                                                : items.map(t => renderTaskRow(t)),
                                        };
                                    })}
                                />
                            )}
                        </Card>
                    </motion.div>

                    {/* -- Recently Completed -- */}
                    {recentlyCompleted.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                            <Card
                                title={<Space><CheckCircleOutlined style={{ color: "#10b981" }} /><span style={{ fontWeight: 600 }}>Recently Completed</span><Tag color="green">{recentlyCompleted.length}</Tag></Space>}
                                size="small"
                                style={{ ...glassCard, marginBottom: 20, borderLeft: '4px solid #10b981' }}
                            >
                                {recentlyCompleted.map((t, i) => {
                                    const proj = projectMap.get(t.projectId);
                                    return (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                                                background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
                                                border: isDark ? '1px solid rgba(16,185,129,0.1)' : '1px solid rgba(16,185,129,0.08)',
                                            }}
                                        >
                                            <Space size={8}>
                                                <CheckCircleOutlined style={{ color: '#10b981', fontSize: 14 }} />
                                                <div>
                                                    <Text style={{ fontSize: 12, textDecoration: 'line-through', opacity: 0.7 }}>{t.title}</Text>
                                                    {proj && <Tag style={{ fontSize: 9, borderRadius: 6, padding: '0 5px', margin: '0 0 0 6px' }}>{proj.name}</Tag>}
                                                </div>
                                            </Space>
                                            <Text type="secondary" style={{ fontSize: 10 }}>
                                                {t.createdAt ? dayjs(t.createdAt).fromNow() : ''}
                                            </Text>
                                        </motion.div>
                                    );
                                })}
                            </Card>
                        </motion.div>
                    )}

                    {/* ── Weekly Summary ── */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card
                            title={<Space><RocketOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Weekly Summary</span></Space>}
                            size="small"
                            style={glassCard}
                            role="region"
                            aria-label="Weekly summary"
                        >
                            <Row gutter={24} align="middle">
                                <Col xs={24} md={14}>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={weeklyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={isDark ? "#64748b" : "#94a3b8"} />
                                            <YAxis tick={{ fontSize: 11 }} stroke={isDark ? "#64748b" : "#94a3b8"} allowDecimals={false} />
                                            <RTooltip contentStyle={{ background: isDark ? "#1e1e2c" : "#fff", border: "none", borderRadius: 8, fontSize: 12 }} />
                                            <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Completed">
                                                {weeklyData.map((_, i) => (
                                                    <Cell key={i} fill={`${themeColor}${i === dayjs().day() - 1 ? "ff" : "88"}`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Col>
                                <Col xs={24} md={10}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 8px" }}>
                                        <Statistic
                                            title={<span style={{ fontSize: 11 }}>Tasks Completed This Week</span>}
                                            value={weeklyDone}
                                            prefix={<CheckCircleOutlined style={{ color: "#10b981" }} />}
                                            valueStyle={{ fontSize: 28, fontWeight: 700, color: "#10b981" }}
                                        />
                                        <Statistic
                                            title={<span style={{ fontSize: 11 }}>Hours Logged (Completed)</span>}
                                            value={weeklyHours}
                                            suffix="h"
                                            prefix={<ClockCircleOutlined style={{ color: themeColor }} />}
                                            valueStyle={{ fontSize: 28, fontWeight: 700 }}
                                        />
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>

                {/* ── Sidebar: Active Projects ── */}
                <Col xs={24} lg={6}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                        <Card
                            title={<Space><ProjectOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600, fontSize: 13 }}>My Projects</span></Space>}
                            size="small"
                            style={{ ...glassCard, marginBottom: 20 }}
                            role="region"
                            aria-label="My projects"
                        >
                            {activeProjects.length === 0 ? (
                                <Empty description="No active projects" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {activeProjects.map(({ project, total, done }) => {
                                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                        return (
                                            <motion.div
                                                key={project.id}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => router.push(`/admin/pm/dashboard?projectId=${project.id}`)}
                                                style={{
                                                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                                                    background: isDark ? "rgba(30,30,44,0.5)" : "rgba(245,243,255,0.6)",
                                                    border: isDark ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(139,92,246,0.08)",
                                                }}
                                            >
                                                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>{project.name}</Text>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                                    <Text type="secondary" style={{ fontSize: 10 }}>{done}/{total} tasks</Text>
                                                    <Tag color={project.status === "active" ? "green" : "default"} style={{ fontSize: 9, borderRadius: 6, padding: "0 5px", margin: 0 }}>
                                                        {project.status?.toUpperCase()}
                                                    </Tag>
                                                </div>
                                                <Progress
                                                    percent={pct} size="small"
                                                    strokeColor={pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : themeColor}
                                                    trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </motion.div>

                    {/* ── Quick Stats Sidebar Card ── */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                        <Card
                            title={<Space><ThunderboltOutlined style={{ color: "#f59e0b" }} /><span style={{ fontWeight: 600, fontSize: 13 }}>Quick Stats</span></Space>}
                            size="small"
                            style={glassCard}
                            role="region"
                            aria-label="Quick stats"
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {[
                                    { label: "Total Tasks", value: tasks.length, color: themeColor },
                                    { label: "Completed", value: tasksByStatus.done.length, color: "#10b981" },
                                    { label: "In Progress", value: tasksByStatus.in_progress.length, color: "#3b82f6" },
                                    { label: "To Do", value: tasksByStatus.todo.length, color: "#64748b" },
                                    { label: "In Review", value: tasksByStatus.in_review.length, color: "var(--theme-color, #8b5cf6)" },
                                ].map(s => (
                                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Space size={6}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                                            <Text style={{ fontSize: 12 }}>{s.label}</Text>
                                        </Space>
                                        <Text strong style={{ fontSize: 14, color: s.color }}>{s.value}</Text>
                                    </div>
                                ))}
                            </div>
                            {tasks.length > 0 && (
                                <Progress
                                    percent={tasks.length > 0 ? Math.round((tasksByStatus.done.length / tasks.length) * 100) : 0}
                                    size="small"
                                    strokeColor={{ "0%": themeColor, "100%": "#10b981" }}
                                    trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                                    style={{ marginTop: 14 }}
                                    format={p => <span style={{ fontSize: 11 }}>{p}% done</span>}
                                />
                            )}
                        </Card>
                    </motion.div>

                    {/* -- Productivity Streak -- */}
                    {streak > 0 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                            <Card
                                size="small"
                                style={{ ...glassCard, marginTop: 20, borderTop: `3px solid ${streak >= 5 ? '#f59e0b' : '#10b981'}`, textAlign: 'center' }}
                            >
                                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, background: `linear-gradient(135deg, ${streak >= 5 ? '#f59e0b' : '#10b981'}, ${streak >= 5 ? '#ef4444' : '#3b82f6'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {streak}
                                </div>
                                <Text strong style={{ fontSize: 12 }}>Day Streak</Text>
                                <div><Text type="secondary" style={{ fontSize: 10 }}>{streak >= 5 ? 'On fire! Keep it up!' : 'Great progress!'}</Text></div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 8 }}>
                                    {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                                        <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: streak >= 5 ? '#f59e0b' : '#10b981' }} />
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </Col>
            </Row>

            {/* ── Quick Log Time Modal ── */}
            <Modal
                title={<Space><FieldTimeOutlined style={{ color: themeColor }} /> Quick Log Time</Space>}
                open={logModal}
                onCancel={() => setLogModal(false)}
                onOk={handleLogTime}
                confirmLoading={logSaving}
                okText="Log Time"
                okButtonProps={{ style: { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 8 } }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
                    <div>
                        <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Task</Text>
                        <Select
                            placeholder="Select a task..."
                            value={logTask}
                            onChange={setLogTask}
                            style={{ width: "100%" }}
                            showSearch
                            optionFilterProp="label"
                            options={tasks.filter(t => t.status !== "done").map(t => ({
                                value: t.id,
                                label: `${t.title} (${projectMap.get(t.projectId)?.name || "—"})`,
                            }))}
                        />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Hours</Text>
                        <InputNumber min={0.25} max={24} step={0.25} value={logHours} onChange={v => setLogHours(v || 1)} style={{ width: "100%" }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Description (optional)</Text>
                        <Input.TextArea rows={2} value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="What did you work on?" />
                    </div>
                </div>
            </Modal>
        </CMSLayout>
    );
}

