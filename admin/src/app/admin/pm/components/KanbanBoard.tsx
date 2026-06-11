"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Badge, Tag, Tooltip, message } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

// ── Types ────────────────────────────────────────────────
interface ColumnDef {
    key: string;
    title: string;
    color: string;
}

interface KanbanBoardProps {
    tasks: any[];
    onTaskUpdate: (taskId: string, updates: Record<string, any>) => Promise<void>;
    onTaskClick: (task: any) => void;
    columns?: ColumnDef[];
    groupBy?: "status" | "priority" | "assignee";
    themeColor: string;
    isDark: boolean;
}

// ── Constants ────────────────────────────────────────────
const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "todo", title: "Todo", color: "#94a3b8" },
    { key: "in_progress", title: "In Progress", color: "#3b82f6" },
    { key: "in_review", title: "In Review", color: "#8b5cf6" },
    { key: "blocked", title: "Blocked", color: "#ef4444" },
    { key: "done", title: "Done", color: "#10b981" },
];

const PRIORITY_COLUMNS: ColumnDef[] = [
    { key: "critical", title: "Critical", color: "#ef4444" },
    { key: "high", title: "High", color: "#f59e0b" },
    { key: "medium", title: "Medium", color: "#3b82f6" },
    { key: "low", title: "Low", color: "#6b7280" },
];

const TYPE_EMOJI: Record<string, string> = {
    bug: "🐛", story: "📖", task: "✅", epic: "🏔️", spike: "⚡",
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#6b7280",
};

const STATUS_FLOW = ["todo", "in_progress", "in_review", "blocked", "done"];
const PRIORITY_FLOW = ["low", "medium", "high", "critical"];

const GROUP_OPTIONS: { key: "status" | "priority" | "assignee"; label: string }[] = [
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "assignee", label: "Assignee" },
];

// ── Component ────────────────────────────────────────────
export default function KanbanBoard({
    tasks,
    onTaskUpdate,
    onTaskClick,
    columns: customColumns,
    groupBy: initialGroupBy = "status",
    themeColor,
    isDark,
}: KanbanBoardProps) {
    const [messageApi, contextHolder] = message.useMessage();
    const [groupBy, setGroupBy] = useState<"status" | "priority" | "assignee">(initialGroupBy);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());

    // ── Dynamic columns based on groupBy ─────────────────
    const activeColumns = useMemo<ColumnDef[]>(() => {
        if (customColumns && groupBy === "status") return customColumns;
        if (groupBy === "priority") return PRIORITY_COLUMNS;
        if (groupBy === "assignee") {
            const names = new Set<string>();
            tasks.forEach(t => {
                const name = t.assignee
                    ? `${t.assignee.firstName || ""} ${t.assignee.lastName || ""}`.trim()
                    : "";
                names.add(name || "__unassigned__");
            });
            const cols: ColumnDef[] = [];
            names.forEach(n => {
                if (n === "__unassigned__") {
                    cols.push({ key: "__unassigned__", title: "Unassigned", color: "#94a3b8" });
                } else {
                    cols.push({ key: n, title: n, color: themeColor });
                }
            });
            return cols.length > 0 ? cols : [{ key: "__unassigned__", title: "Unassigned", color: "#94a3b8" }];
        }
        return DEFAULT_COLUMNS;
    }, [customColumns, groupBy, tasks, themeColor]);

    // ── Group tasks into columns ─────────────────────────
    const tasksByColumn = useMemo(() => {
        const map: Record<string, any[]> = {};
        activeColumns.forEach(c => (map[c.key] = []));
        tasks.forEach(t => {
            let key: string;
            if (groupBy === "status") key = t.status || "todo";
            else if (groupBy === "priority") key = t.priority || "medium";
            else {
                const name = t.assignee
                    ? `${t.assignee.firstName || ""} ${t.assignee.lastName || ""}`.trim()
                    : "";
                key = name || "__unassigned__";
            }
            if (map[key]) map[key].push(t);
            else if (map[activeColumns[0]?.key]) map[activeColumns[0].key].push(t);
        });
        return map;
    }, [tasks, activeColumns, groupBy]);

    // ── Collapse toggle ──────────────────────────────────
    const toggleCollapse = useCallback((key: string) => {
        setCollapsedCols(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);

    // ── Drag handlers (HTML5 native) ─────────────────────
    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("text/plain", taskId);
        e.dataTransfer.effectAllowed = "move";
        setDraggingId(taskId);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggingId(null);
        setDragOverCol(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const handleDragEnter = useCallback((colKey: string) => {
        setDragOverCol(colKey);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent, colKey: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const { clientX: x, clientY: y } = e;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setDragOverCol(prev => (prev === colKey ? null : prev));
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, colKey: string) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData("text/plain");
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const fieldMap: Record<string, string> = { status: "status", priority: "priority", assignee: "assigneeId" };
        const field = fieldMap[groupBy] || "status";

        // Skip if same column
        const currentVal = groupBy === "assignee"
            ? (task.assignee ? `${task.assignee.firstName || ""} ${task.assignee.lastName || ""}`.trim() || "__unassigned__" : "__unassigned__")
            : task[field];
        if (currentVal === colKey) return;

        try {
            const updateVal = groupBy === "assignee" ? (colKey === "__unassigned__" ? null : colKey) : colKey;
            await onTaskUpdate(taskId, { [field]: updateVal });
            const col = activeColumns.find(c => c.key === colKey);
            messageApi.success(`Moved to ${col?.title || colKey}`);
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error("Failed to move task");
        }
    }, [tasks, groupBy, onTaskUpdate, activeColumns, messageApi]);

    // ── Quick actions ────────────────────────────────────
    const cycleStatus = useCallback(async (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        const idx = STATUS_FLOW.indexOf(task.status);
        const next = STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
        try {
            await onTaskUpdate(task.id, { status: next });
        } catch (err: any) { console.error("PM Error", err); }
    }, [onTaskUpdate]);

    const cyclePriority = useCallback(async (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        const idx = PRIORITY_FLOW.indexOf(task.priority);
        const next = PRIORITY_FLOW[(idx + 1) % PRIORITY_FLOW.length];
        try {
            await onTaskUpdate(task.id, { priority: next });
        } catch (err: any) { console.error("PM Error", err); }
    }, [onTaskUpdate]);

    // ── Render task card ─────────────────────────────────
    const renderCard = (task: any, index: number) => {
        const isBeingDragged = draggingId === task.id;
        const prioColor = PRIORITY_COLORS[task.priority] || "#6b7280";
        const typeEmoji = TYPE_EMOJI[task.type] || "📋";
        const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day") && task.status !== "done";
        const assigneeInitial = task.assignee
            ? `${(task.assignee.firstName || "")[0] || ""}${(task.assignee.lastName || "")[0] || ""}`.toUpperCase()
            : null;
        const tags: string[] = task.tags || [];

        return (
            <motion.div
                key={task.id}
                role="listitem"
                aria-label={`Task: ${task.title}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isBeingDragged ? 0.4 : 1, y: 0, scale: isBeingDragged ? 0.97 : 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                draggable
                onDragStart={(e: any) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onTaskClick(task)}
                whileHover={{ y: -2, boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.4)" : "0 6px 20px rgba(0,0,0,0.1)" }}
                style={{
                    background: isDark ? "rgba(30, 30, 44, 0.8)" : "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(8px)",
                    border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginBottom: 8,
                    cursor: "grab",
                    transition: "box-shadow 0.2s, opacity 0.2s",
                    boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
                }}
            >
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>{typeEmoji}</span>
                    <span style={{
                        flex: 1, fontSize: 13, fontWeight: 600, lineHeight: "18px",
                        color: isDark ? "#e2e8f0" : "#1f2937",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {task.title}
                    </span>
                </div>

                {/* Priority + Tags row */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    <Tag style={{
                        fontSize: 10, borderRadius: 6, padding: "0 6px", margin: 0,
                        background: `${prioColor}18`, color: prioColor, border: `1px solid ${prioColor}33`,
                        textTransform: "capitalize", fontWeight: 600,
                    }}>
                        {task.priority}
                    </Tag>
                    {tags.slice(0, 2).map((tag: string) => (
                        <Tag key={tag} style={{ fontSize: 10, borderRadius: 6, padding: "0 5px", margin: 0 }} color="cyan">
                            {tag}
                        </Tag>
                    ))}
                    {tags.length > 2 && (
                        <span style={{ fontSize: 10, color: isDark ? "#64748b" : "#94a3b8" }}>+{tags.length - 2}</span>
                    )}
                </div>

                {/* Subtask progress (if subtasks exist) */}
                {task.subtasksDone != null && task.subtasksTotal > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{
                            height: 4, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            overflow: "hidden",
                        }}>
                            <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${Math.round((task.subtasksDone / task.subtasksTotal) * 100)}%`,
                                background: task.subtasksDone === task.subtasksTotal ? "#10b981" : themeColor,
                                transition: "width 0.3s",
                            }} />
                        </div>
                        <span style={{ fontSize: 10, color: isDark ? "#64748b" : "#94a3b8" }}>
                            {task.subtasksDone}/{task.subtasksTotal} subtasks
                        </span>
                    </div>
                )}

                {/* Bottom row: assignee, due date, quick actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* Assignee */}
                        {assigneeInitial ? (
                            <Tooltip title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
                                <span style={{
                                    width: 22, height: 22, borderRadius: "50%", fontSize: 9, fontWeight: 700,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: `${themeColor}22`, color: themeColor, flexShrink: 0,
                                }}>
                                    {assigneeInitial}
                                </span>
                            </Tooltip>
                        ) : (
                            <span style={{
                                fontSize: 10, color: isDark ? "#475569" : "#d1d5db",
                                fontStyle: "italic",
                            }}>
                                Unassigned
                            </span>
                        )}

                        {/* Due date */}
                        {task.dueDate && (
                            <span style={{
                                fontSize: 10, fontWeight: 500,
                                color: isOverdue ? "#ef4444" : (isDark ? "#94a3b8" : "#888"),
                                background: isOverdue ? "rgba(239,68,68,0.1)" : "transparent",
                                padding: isOverdue ? "1px 5px" : 0,
                                borderRadius: 4,
                            }}>
                                📅 {dayjs(task.dueDate).format("MMM D")}
                            </span>
                        )}
                    </div>

                    {/* Quick action buttons */}
                    <div style={{ display: "flex", gap: 4 }}>
                        <Tooltip title="Cycle status">
                            <span
                                onClick={(e) => cycleStatus(e, task)}
                                style={{
                                    width: 20, height: 20, borderRadius: 4, fontSize: 11,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", transition: "background 0.15s",
                                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    color: isDark ? "#94a3b8" : "#64748b",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = `${themeColor}22`)}
                                onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                            >
                                ▶
                            </span>
                        </Tooltip>
                        <Tooltip title="Cycle priority">
                            <span
                                onClick={(e) => cyclePriority(e, task)}
                                style={{
                                    width: 20, height: 20, borderRadius: 4, fontSize: 11,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", transition: "background 0.15s",
                                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    color: prioColor,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = `${prioColor}22`)}
                                onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                            >
                                ⚡
                            </span>
                        </Tooltip>
                    </div>
                </div>
            </motion.div>
        );
    };

    // ── Render ────────────────────────────────────────────
    return (
        <div>
            {contextHolder}

            {/* Group By toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }} role="group" aria-label="Group by options">
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>Group by:</span>
                {GROUP_OPTIONS.map(opt => (
                    <span
                        key={opt.key}
                        role="button"
                        tabIndex={0}
                        aria-label={`Group by ${opt.label}`}
                        aria-pressed={groupBy === opt.key}
                        onClick={() => setGroupBy(opt.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGroupBy(opt.key); } }}
                        style={{
                            fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 6,
                            cursor: "pointer", transition: "all 0.2s",
                            background: groupBy === opt.key
                                ? `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`
                                : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            color: groupBy === opt.key ? "#fff" : (isDark ? "#cbd5e1" : "#374151"),
                            border: groupBy === opt.key ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                        }}
                    >
                        {opt.label}
                    </span>
                ))}
            </div>

            {/* Columns */}
            <div style={{
                display: "flex", gap: 14, overflowX: "auto",
                padding: "4px 2px 8px 2px",
            }}>
                {activeColumns.map(col => {
                    const colTasks = tasksByColumn[col.key] || [];
                    const isOver = dragOverCol === col.key;
                    const isCollapsed = collapsedCols.has(col.key);

                    return (
                        <div
                            key={col.key}
                            role="region"
                            aria-label={`${col.title} column`}
                            onDragOver={handleDragOver}
                            onDragEnter={() => handleDragEnter(col.key)}
                            onDragLeave={(e) => handleDragLeave(e, col.key)}
                            onDrop={(e) => handleDrop(e, col.key)}
                            style={{
                                flex: "0 0 auto",
                                minWidth: 280,
                                width: 280,
                                display: "flex",
                                flexDirection: "column",
                                background: isDark
                                    ? `rgba(15, 15, 23, ${isOver ? 0.85 : 0.6})`
                                    : `rgba(255,255,255, ${isOver ? 0.75 : 0.5})`,
                                backdropFilter: "blur(12px)",
                                border: isOver
                                    ? `2px dashed ${col.color}`
                                    : isDark
                                        ? "1px solid rgba(139,92,246,0.12)"
                                        : "1px solid rgba(0,0,0,0.06)",
                                borderRadius: 12,
                                padding: 12,
                                transition: "all 0.25s ease",
                                boxShadow: isOver ? `0 0 20px ${col.color}22` : "none",
                            }}
                        >
                            {/* Column header */}
                            <div
                                onClick={() => toggleCollapse(col.key)}
                                style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    marginBottom: 12, padding: "6px 10px",
                                    background: `${col.color}12`, borderRadius: 8,
                                    cursor: "pointer", userSelect: "none",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        background: col.color, flexShrink: 0,
                                    }} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>
                                        {col.title}
                                    </span>
                                    <Badge
                                        count={colTasks.length}
                                        style={{ backgroundColor: col.color, fontSize: 10 }}
                                        size="small"
                                    />
                                </div>
                                <span style={{
                                    fontSize: 10, color: isDark ? "#64748b" : "#94a3b8",
                                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s",
                                }}>
                                    ▼
                                </span>
                            </div>

                            {/* Drop indicator */}
                            {isOver && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        textAlign: "center", padding: "6px 0", marginBottom: 8,
                                        fontSize: 11, fontWeight: 600, color: col.color,
                                        borderRadius: 6,
                                        background: `${col.color}10`,
                                        border: `1px dashed ${col.color}44`,
                                    }}
                                >
                                    ↓ Drop here
                                </motion.div>
                            )}

                            {/* Task cards */}
                            <AnimatePresence mode="popLayout">
                                {!isCollapsed && colTasks.map((task, i) => renderCard(task, i))}
                            </AnimatePresence>

                            {/* Empty state */}
                            {!isCollapsed && colTasks.length === 0 && !isOver && (
                                <div style={{
                                    flex: 1, minHeight: 120,
                                    display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center",
                                    opacity: 0.35, fontSize: 12,
                                    color: isDark ? "#64748b" : "#94a3b8",
                                }}>
                                    <span style={{ fontSize: 24, marginBottom: 4 }}>📭</span>
                                    No tasks
                                </div>
                            )}

                            {/* Collapsed indicator */}
                            {isCollapsed && (
                                <div style={{
                                    textAlign: "center", padding: "12px 0",
                                    fontSize: 11, color: isDark ? "#64748b" : "#94a3b8",
                                }}>
                                    {colTasks.length} task{colTasks.length !== 1 ? "s" : ""} hidden
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

