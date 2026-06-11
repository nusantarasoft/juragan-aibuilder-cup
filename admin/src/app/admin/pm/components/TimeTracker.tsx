"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Select, Button, Modal, Input, message, Typography, Empty } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined, ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import dayjs from "dayjs";

const { Text } = Typography;

const LOG_TIME = `
  mutation LogTime($tenantId: String!, $input: CreatePmTimeLogInput!) {
    logPmTime(tenantId: $tenantId, input: $input) { id hours logDate description }
  }
`;
const GET_TIME_LOGS = `
  query($taskId: String!) {
    pmTimeLogs(taskId: $taskId) { id taskId userId hours logDate description createdAt }
  }
`;
const GET_MY_TASKS = `
  query($tenantId: String!) {
    pmTasks(tenantId: $tenantId) { id title projectId status assignee { firstName lastName } }
  }
`;
const HR_CLOCK_IN = `
  mutation($tenantId: String!, $employeeId: String!) {
    hrClockIn(tenantId: $tenantId, employeeId: $employeeId) { id clockIn }
  }
`;
const HR_CLOCK_OUT = `
  mutation($id: ID!) { hrClockOut(id: $id) { id clockOut workHours } }
`;

const LS = { taskId: "pm_timer_taskId", startTime: "pm_timer_startTime", elapsed: "pm_timer_elapsed", running: "pm_timer_running" };

const fmt = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => String(v).padStart(2, "0")).join(":");

const PULSE_CSS = `@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }`;
const btnMotion = { whileHover: { scale: 1.06 }, whileTap: { scale: 0.94 } };

interface TimeTrackerProps {
    taskId?: string;
    projectId?: string;
    compact?: boolean;
    onTimeLogged?: (hours: number) => void;
}

export default function TimeTracker({ taskId, projectId, compact, onTimeLogged }: TimeTrackerProps) {
    const [messageApi, ctx] = message.useMessage();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const [tasks, setTasks] = useState<any[]>([]);
    const [selTask, setSelTask] = useState<string | undefined>(taskId);
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const [timeLogs, setTimeLogs] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [desc, setDesc] = useState("");
    const [logging, setLogging] = useState(false);
    const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hrRef = useRef<string | null>(null);

    // Load tasks
    const loadTasks = useCallback(async () => {
        try {
            const data = await gql(GET_MY_TASKS, { tenantId: DEFAULT_TENANT_ID });
            setTasks(data.pmTasks || []);
        } catch (err: any) { console.error("PM Error", err); }
    }, []);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    // Load time logs for selected task
    const loadLogs = useCallback(async () => {
        if (!selTask) return;
        try {
            const data = await gql(GET_TIME_LOGS, { taskId: selTask });
            setTimeLogs(data.pmTimeLogs || []);
        } catch (err: any) { console.error("PM Error", err); }
    }, [selTask]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    // Restore from localStorage
    useEffect(() => {
        try {
            const wasRunning = localStorage.getItem(LS.running) === "true";
            const saved = parseInt(localStorage.getItem(LS.elapsed) || "0", 10);
            const savedTask = localStorage.getItem(LS.taskId);
            const start = localStorage.getItem(LS.startTime);
            if (savedTask && !taskId) setSelTask(savedTask);
            if (wasRunning && start) {
                setElapsed(saved + Math.floor((Date.now() - parseInt(start, 10)) / 1000));
                setRunning(true);
            } else setElapsed(saved);
        } catch (err: any) { console.error("PM Error", err); }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Timer tick
    useEffect(() => {
        if (running) {
            localStorage.setItem(LS.startTime, String(Date.now()));
            localStorage.setItem(LS.running, "true");
            ivRef.current = setInterval(() => {
                setElapsed(prev => {
                    const next = prev + 1;
                    localStorage.setItem(LS.elapsed, String(next));
                    return next;
                });
            }, 1000);
        } else {
            if (ivRef.current) clearInterval(ivRef.current);
            localStorage.setItem(LS.running, "false");
        }
        return () => { if (ivRef.current) clearInterval(ivRef.current); };
    }, [running]);

    useEffect(() => { if (selTask) localStorage.setItem(LS.taskId, selTask); }, [selTask]);

    const filteredTasks = useMemo(() => projectId ? tasks.filter(t => t.projectId === projectId) : tasks, [tasks, projectId]);
    const selTaskObj = useMemo(() => tasks.find(t => t.id === selTask), [tasks, selTask]);
    const todayStr = dayjs().format("YYYY-MM-DD");
    const todayLogs = useMemo(() => timeLogs.filter(l => dayjs(l.logDate || l.createdAt).format("YYYY-MM-DD") === todayStr), [timeLogs, todayStr]);
    const todayTotal = useMemo(() => todayLogs.reduce((s, l) => s + (l.hours || 0), 0), [todayLogs]);

    // Actions
    const handleStart = async () => {
        if (!selTask) {
            messageApi.warning("Select a task first");
            return;
        }
        // HR clock-in attempt (silent fail if no HR module)
        try {
            const d = await gql(HR_CLOCK_IN, { tenantId: DEFAULT_TENANT_ID, employeeId: "current" });
            hrRef.current = d.hrClockIn?.id || null;
        } catch (err: any) { console.error("PM Error", err); }
        setRunning(true);
        localStorage.setItem(LS.elapsed, String(elapsed));
    };

    const handlePause = () => setRunning(false);

    const handleStop = () => {
        setRunning(false);
        if (elapsed > 0) setShowModal(true);
    };

    const handleLog = async () => {
        const hours = Math.round((elapsed / 3600) * 100) / 100;
        setLogging(true);
        try {
            await gql(LOG_TIME, { tenantId: DEFAULT_TENANT_ID, input: { taskId: selTask, hours, logDate: dayjs().format("YYYY-MM-DD"), description: desc.trim() || undefined } });
            if (hrRef.current) { try { await gql(HR_CLOCK_OUT, { id: hrRef.current }); } catch (err: any) { console.error("PM Error", err); } hrRef.current = null; }
            setElapsed(0); setDesc(""); setShowModal(false);
            Object.values(LS).forEach(k => localStorage.removeItem(k));
            messageApi.success(`Logged ${hours}h successfully`);
            onTimeLogged?.(hours);
            loadLogs();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to log time"); } finally { setLogging(false); }
    };

    // Shared styles
    const glass: React.CSSProperties = {
        background: isDark ? "rgba(15,15,23,0.7)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12, padding: compact ? "6px 12px" : 20,
    };
    const timerStyle: React.CSSProperties = {
        fontFamily: "monospace", fontSize: compact ? 16 : 32, fontWeight: 700,
        color: isDark ? "#e2e8f0" : "#1f2937", letterSpacing: compact ? 1 : 2,
    };
    const dot = (size: number): React.CSSProperties => ({
        width: size, height: size, borderRadius: "50%", background: "#22c55e",
        animation: "pulse-dot 1.5s ease-in-out infinite", flexShrink: 0,
    });
    const inputStyle: React.CSSProperties = {
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        borderColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 13,
    };

    // Log modal content
    const modalBody = () => {
        const hours = Math.round((elapsed / 3600) * 100) / 100;
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                    <Text style={{ fontSize: 28, fontFamily: "monospace", fontWeight: 700 }}>{fmt(elapsed)}</Text>
                    <div><Text type="secondary">{hours} hours</Text></div>
                </div>
                <Input.TextArea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What did you work on? (optional)"
                    autoSize={{ minRows: 2, maxRows: 4 }} style={inputStyle} />
                <motion.div {...btnMotion}>
                    <Button type="primary" block loading={logging} onClick={handleLog} icon={<CheckCircleOutlined />}
                        style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)`, border: "none", borderRadius: 8, height: 40 }}>
                        Log Time
                    </Button>
                </motion.div>
            </div>
        );
    };

    const logModal = <Modal open={showModal} onCancel={() => setShowModal(false)} title="Log Time" footer={null} destroyOnClose>{modalBody()}</Modal>;

    // Compact mode
    if (compact) {
        return (
            <div style={{ ...glass, display: "flex", alignItems: "center", gap: 10, height: 40 }}>
                {ctx}<style>{PULSE_CSS}</style>
                {running && <span style={dot(8)} />}
                <span style={timerStyle}>{fmt(elapsed)}</span>
                {selTaskObj && <Text ellipsis style={{ fontSize: 12, maxWidth: 140, color: isDark ? "#94a3b8" : "#6b7280" }}>{selTaskObj.title}</Text>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {!running ? (
                        <motion.div {...btnMotion}><Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}
                            style={{ background: "#22c55e", border: "none", borderRadius: 6 }} /></motion.div>
                    ) : (
                        <motion.div {...btnMotion}><Button size="small" danger icon={<StopOutlined />} onClick={handleStop}
                            style={{ borderRadius: 6 }} /></motion.div>
                    )}
                </div>
                {logModal}
            </div>
        );
    }

    // Full mode
    return (
        <div style={glass}>
            {ctx}<style>{PULSE_CSS}</style>

            {/* Timer */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    {running && <span style={dot(10)} />}
                    <span style={timerStyle}>{fmt(elapsed)}</span>
                </div>
            </div>

            {/* Task Selector */}
            <div style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#6b7280", marginBottom: 6, display: "block" }}>
                    <ClockCircleOutlined /> Task
                </Text>
                <Select value={selTask} onChange={setSelTask} placeholder="Select a task to track" showSearch
                    filterOption={(input, opt) => (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
                    options={filteredTasks.map(t => ({ value: t.id, label: `${t.title}${t.projectId ? ` · ${t.projectId.slice(0, 6)}` : ""}` }))}
                    style={{ width: "100%" }} disabled={running} />
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                {!running ? (
                    <motion.div {...btnMotion} style={{ flex: 1 }}>
                        <Button type="primary" block icon={<PlayCircleOutlined />} onClick={handleStart} size="large"
                            style={{ background: "#22c55e", border: "none", borderRadius: 8, fontWeight: 600 }}>Start</Button>
                    </motion.div>
                ) : (<>
                    <motion.div {...btnMotion} style={{ flex: 1 }}>
                        <Button block icon={<PauseCircleOutlined />} onClick={handlePause} size="large"
                            style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600 }}>Pause</Button>
                    </motion.div>
                    <motion.div {...btnMotion} style={{ flex: 1 }}>
                        <Button danger block icon={<StopOutlined />} onClick={handleStop} size="large"
                            style={{ borderRadius: 8, fontWeight: 600 }}>Stop</Button>
                    </motion.div>
                </>)}
            </div>

            {/* Today's Summary */}
            <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13, color: isDark ? "#cbd5e1" : "#374151" }}>Today&apos;s Logged Time</Text>
                    <Text style={{ fontSize: 13, fontWeight: 700, color: themeColor }}>{todayTotal.toFixed(1)}h</Text>
                </div>
                {todayLogs.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No time logged today" style={{ margin: "4px 0", padding: "8px 0" }} />
                ) : todayLogs.map((log, i) => (
                    <motion.div key={log.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 6, marginBottom: 4,
                            background: isDark ? "rgba(139,92,246,0.06)" : "rgba(0,0,0,0.02)" }}>
                        <Text style={{ fontSize: 12, color: isDark ? "#cbd5e1" : "#374151" }}>{log.description || "No description"}</Text>
                        <Text style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: themeColor }}>{log.hours}h</Text>
                    </motion.div>
                ))}
            </div>
            {logModal}
        </div>
    );
}

