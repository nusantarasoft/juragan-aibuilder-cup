"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
    Select, Typography, Avatar, Badge, Tag, Space, Input, Empty, Tooltip, message,
} from "antd";
import {
    FireOutlined, ClockCircleOutlined, UserOutlined, SearchOutlined,
    DownOutlined, RightOutlined, HolderOutlined, PlusOutlined
} from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const { Text } = Typography;

// ─── GraphQL ───────────────────────────────────────────────
const UPDATE_TASK = `
  mutation($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) { id status }
  }
`;

const CREATE_TASK = `
  mutation CreateTask($tenantId: String!, $input: CreatePmTaskInput!) {
    createPmTask(tenantId: $tenantId, input: $input) { id title status }
  }
`;

// ─── Constants ─────────────────────────────────────────────
type GroupBy = "none" | "assignee" | "priority" | "type" | "sprint";
type StatusKey = "todo" | "in_progress" | "review" | "done";

const STATUS_COLUMNS: { key: StatusKey; title: string; color: string }[] = [
    { key: "todo", title: "To Do", color: "#8b5cf6" },
    { key: "in_progress", title: "In Progress", color: "#3b82f6" },
    { key: "review", title: "In Review", color: "#f59e0b" },
    { key: "done", title: "Done", color: "#10b981" },
];

const PRIORITY_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    high: { icon: <FireOutlined style={{ color: "#ef4444", fontSize: 12 }} />, color: "#ef4444", label: "High" },
    medium: { icon: <FireOutlined style={{ color: "#f59e0b", fontSize: 12 }} />, color: "#f59e0b", label: "Medium" },
    low: { icon: <FireOutlined style={{ color: "#10b981", fontSize: 12 }} />, color: "#10b981", label: "Low" },
};

const TYPE_TAG: Record<string, { color: string; label: string }> = {
    bug: { color: "error", label: "Bug" },
    story: { color: "success", label: "Story" },
    task: { color: "purple", label: "Task" },
    epic: { color: "blue", label: "Epic" },
};

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: "none", label: "None" },
    { value: "assignee", label: "Assignee" },
    { value: "priority", label: "Priority" },
    { value: "type", label: "Type" },
    { value: "sprint", label: "Sprint" },
];

// ─── Interfaces ────────────────────────────────────────────
interface KanbanBoardProps {
    tasks: any[];
    sprints: any[];
    projectId: string;
    onRefresh: () => void;
}

// ─── Component ─────────────────────────────────────────────
export default function KanbanBoard({ tasks, sprints, projectId, onRefresh }: KanbanBoardProps) {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";
    const [messageApi, contextHolder] = message.useMessage();
    const router = useRouter();

    // ─── Local State ───────────────────────────────────────
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [sprintFilter, setSprintFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [changingTaskId, setChangingTaskId] = useState<string | null>(null);
    const [quickAddTitle, setQuickAddTitle] = useState("");
    const [addingGroupKey, setAddingGroupKey] = useState<string | null>(null);

    const handleQuickAdd = async (groupKey: string) => {
        if (!quickAddTitle.trim()) {
            setAddingGroupKey(null);
            return;
        }
        
        let sprintId = sprintFilter !== "all" && sprintFilter !== "none" ? sprintFilter : null;
        if (groupBy === "sprint" && groupKey !== "none" && groupKey !== "Backlog") {
            const sp = sprints.find((s: any) => s.name === groupKey);
            if (sp) sprintId = sp.id;
        }

        try {
            await gql(CREATE_TASK, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    projectId,
                    title: quickAddTitle,
                    status: "todo",
                    sprintId,
                    type: "task",
                    priority: "medium",
                }
            });
            messageApi.success("Task added");
            setQuickAddTitle("");
            setAddingGroupKey(null);
            onRefresh();
        } catch (e) {
            messageApi.error("Failed to add task");
            console.error(e);
        }
    };

    // ─── Styles ────────────────────────────────────────────
    const glassCard: React.CSSProperties = {
        background: isDark ? "rgba(15, 15, 23, 0.7)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
    };

    // ─── Filtering ─────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        let list = tasks.filter((t: any) => !t.isArchived);
        if (sprintFilter !== "all") {
            list = list.filter((t: any) =>
                sprintFilter === "none" ? !t.sprintId : t.sprintId === sprintFilter
            );
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((t: any) => t.title?.toLowerCase().includes(q));
        }
        return list;
    }, [tasks, sprintFilter, search]);

    // ─── Grouping Logic ────────────────────────────────────
    const groups = useMemo(() => {
        if (groupBy === "none") return [{ key: "none", label: "All Tasks", tasks: filteredTasks }];

        const map = new Map<string, any[]>();
        filteredTasks.forEach((t: any) => {
            let key: string;
            switch (groupBy) {
                case "assignee":
                    key = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned";
                    break;
                case "priority":
                    key = t.priority || "none";
                    break;
                case "type":
                    key = t.type || "other";
                    break;
                case "sprint": {
                    const sp = sprints.find((s: any) => s.id === t.sprintId);
                    key = sp ? sp.name : "Backlog";
                    break;
                }
                default:
                    key = "Other";
            }
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        });

        const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        return entries.map(([key, tasks]) => ({
            key,
            label: groupBy === "priority" ? (PRIORITY_META[key]?.label || key) : key,
            tasks,
        }));
    }, [filteredTasks, groupBy, sprints]);

    // ─── Status Change ─────────────────────────────────────
    const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
        setChangingTaskId(taskId);
        try {
            await gql(UPDATE_TASK, { id: taskId, input: { status: newStatus } });
            messageApi.success(`Moved to ${STATUS_COLUMNS.find(c => c.key === newStatus)?.title}`);
            onRefresh();
        } catch (err: any) { 
            console.error("PM Error", err); 
            messageApi.error("Failed to update task status.");
        } finally {
            setChangingTaskId(null);
        }
    }, [onRefresh, messageApi]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const newStatus = destination.droppableId.split("___")[1];
        const task = tasks.find(t => t.id === draggableId);
        if (task && task.status !== newStatus) {
            handleStatusChange(draggableId, newStatus);
        }
    };

    // ─── Toggle Swimlane ───────────────────────────────────
    const toggleCollapse = (key: string) =>
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    const getPriorityBorder = (p: string) =>
        p === "high" ? "#ef4444" : p === "medium" ? "#f59e0b" : p === "low" ? "#10b981" : "transparent";

    // ─── Main Render ───────────────────────────────────────
    if (!mounted) return null;

    return (
        <div>
            {contextHolder}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

            {/* ── Toolbar ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{
                    ...glassCard,
                    padding: "10px 16px",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                }}>
                    <Tooltip title="Drag cards between columns to change status">
                        <Tag bordered={false} style={{
                            borderRadius: 6, fontSize: 10, padding: '0 8px', margin: 0,
                            background: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
                            color: '#3b82f6', cursor: 'help',
                        }}>
                            <HolderOutlined style={{ marginRight: 4 }} />
                            Drag & Drop
                        </Tag>
                    </Tooltip>

                    <Space size={6}>
                        <Text style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#a78bfa" : themeColor }}>Group by:</Text>
                        <Select size="small" value={groupBy} onChange={(v) => { setGroupBy(v); setCollapsed({}); }} options={GROUP_OPTIONS} style={{ width: 120 }} popupMatchSelectWidth={false} />
                    </Space>

                    <Space size={6}>
                        <Text style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#a78bfa" : themeColor }}>Sprint:</Text>
                        <Select size="small" value={sprintFilter} onChange={setSprintFilter} style={{ width: 160 }} popupMatchSelectWidth={false} options={[{ value: "all", label: "All Sprints" }, { value: "none", label: "Backlog (No Sprint)" }, ...sprints.map((s: any) => ({ value: s.id, label: s.name }))]} />
                    </Space>

                    <Input size="small" placeholder="Search tasks..." prefix={<SearchOutlined style={{ color: isDark ? "#64748b" : "#94a3b8" }} />} value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ width: 180, borderRadius: 8, background: isDark ? "rgba(30,30,44,0.6)" : "rgba(255,255,255,0.8)" }} />

                    <div style={{ marginLeft: "auto" }}>
                        <Tag bordered={false} style={{ borderRadius: 8, fontSize: 11, fontWeight: 600, background: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)", color: themeColor }}>
                            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                        </Tag>
                    </div>
                </div>
            </motion.div>

            {/* ── Board ── */}
            <div style={{
                background: isDark ? "rgba(15, 15, 23, 0.35)" : "rgba(245,243,255,0.4)",
                borderRadius: 12,
                padding: 14,
                border: "1px solid rgba(139,92,246,0.08)",
            }}>
                {filteredTasks.length === 0 ? (
                    <Empty description="No tasks match your filters" style={{ padding: 60 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        {groups.map((group, groupIdx) => {
                            const isCollapsed = collapsed[group.key] || false;
                            const swimlaneContent = (
                                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                                    {STATUS_COLUMNS.map(col => {
                                        const colTasks = group.tasks.filter((t: any) => t.status === col.key);
                                        const droppableId = `${group.key}___${col.key}`;
                                        
                                        return (
                                            <div key={col.key} style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column" }}>
                                                <div style={{
                                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                                    marginBottom: 10, padding: "5px 8px",
                                                    background: `linear-gradient(135deg, ${col.color}18, ${col.color}08)`,
                                                    borderRadius: 8,
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.color }} />
                                                        <Text strong style={{ fontSize: 11, color: col.color }}>{col.title}</Text>
                                                    </div>
                                                    <Badge count={colTasks.length} style={{ backgroundColor: col.color, fontSize: 10, boxShadow: "none" }} size="small" />
                                                </div>
                                                
                                                <Droppable droppableId={droppableId}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                            style={{
                                                                flex: 1, minHeight: 120, maxHeight: 'calc(100vh - 380px)', overflowY: 'auto',
                                                                background: snapshot.isDraggingOver ? (isDark ? `rgba(255,255,255,0.05)` : `rgba(0,0,0,0.02)`) : "transparent",
                                                                borderRadius: 10, transition: "background 0.2s ease"
                                                            }}
                                                        >
                                                            {colTasks.map((t: any, idx: number) => {
                                                                const isChanging = changingTaskId === t.id;
                                                                return (
                                                                    <Draggable key={t.id} draggableId={t.id} index={idx} isDragDisabled={isChanging}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                style={{
                                                                                    ...provided.draggableProps.style,
                                                                                    marginBottom: 8,
                                                                                    opacity: isChanging ? 0.5 : 1,
                                                                                }}
                                                                            >
                                                                                <div style={{
                                                                                    background: isDark ? "rgba(30, 30, 44, 0.8)" : "rgba(255,255,255,0.9)",
                                                                                    backdropFilter: "blur(8px)", padding: 12, borderRadius: 10,
                                                                                    border: isDark ? "1px solid rgba(139,92,246,0.12)" : "1px solid rgba(0,0,0,0.06)",
                                                                                    borderLeft: `3px solid ${getPriorityBorder(t.priority)}`,
                                                                                    boxShadow: snapshot.isDragging 
                                                                                        ? (isDark ? "0 12px 28px rgba(139,92,246,0.3)" : "0 12px 28px rgba(0,0,0,0.15)")
                                                                                        : (isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.06)"),
                                                                                    transform: snapshot.isDragging ? "rotate(2deg) scale(1.02)" : "scale(1)",
                                                                                    transition: snapshot.isDragging ? "none" : "all 0.2s ease",
                                                                                }}>
                                                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                                                                                        <HolderOutlined style={{ fontSize: 10, color: isDark ? "#475569" : "#cbd5e1", marginTop: 2, flexShrink: 0 }} />
                                                                                        <Text strong style={{ fontSize: 12, lineHeight: 1.3, flex: 1, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); router.push(`/admin/pm/tasks/${t.id}`); }}>
                                                                                            {t.title}
                                                                                        </Text>
                                                                                    </div>
                                                                                    <Space size={4} wrap style={{ marginBottom: 6, marginLeft: 16 }}>
                                                                                        {TYPE_TAG[t.type] && (
                                                                                            <Tag color={TYPE_TAG[t.type].color} style={{ borderRadius: 6, fontSize: 10, padding: "0 5px", margin: 0 }}>
                                                                                                {TYPE_TAG[t.type].label}
                                                                                            </Tag>
                                                                                        )}
                                                                                        {PRIORITY_META[t.priority] && PRIORITY_META[t.priority].icon}
                                                                                    </Space>
                                                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginLeft: 16 }}>
                                                                                        <span style={{ fontSize: 10, color: isDark ? "#94a3b8" : "#888", display: "flex", alignItems: "center", gap: 3 }}>
                                                                                            <ClockCircleOutlined /> {t.estimatedHours || 0}h
                                                                                        </span>
                                                                                        <Tooltip title={t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned"}>
                                                                                            <Avatar size={22} icon={<UserOutlined />} src={t.assignee?.avatarUrl} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, fontSize: 10 }} />
                                                                                        </Tooltip>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}

                                                            {/* Quick Add Input in To Do column */}
                                                            {col.key === "todo" && (
                                                                <div style={{ padding: "0 4px", marginTop: 8 }}>
                                                                    {addingGroupKey === group.key ? (
                                                                        <Input
                                                                            autoFocus
                                                                            placeholder="Task title & press Enter"
                                                                            value={quickAddTitle}
                                                                            onChange={e => setQuickAddTitle(e.target.value)}
                                                                            onPressEnter={() => handleQuickAdd(group.key)}
                                                                            onBlur={() => {
                                                                                if (!quickAddTitle.trim()) setAddingGroupKey(null);
                                                                            }}
                                                                            size="small"
                                                                            style={{ borderRadius: 6, background: isDark ? "rgba(255,255,255,0.05)" : "#fff" }}
                                                                        />
                                                                    ) : (
                                                                        <div 
                                                                            onClick={() => { setAddingGroupKey(group.key); setQuickAddTitle(""); }}
                                                                            style={{
                                                                                padding: "6px", display: "flex", alignItems: "center", gap: 6,
                                                                                color: isDark ? "#94a3b8" : "#64748b", cursor: "pointer",
                                                                                fontSize: 11, fontWeight: 500, borderRadius: 6,
                                                                                transition: "all 0.2s",
                                                                            }}
                                                                            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)")}
                                                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                                        >
                                                                            <PlusOutlined /> Add Task
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        );
                                    })}
                                </div>
                            );

                            if (groupBy === "none") {
                                return <div key={group.key}>{swimlaneContent}</div>;
                            }

                            return (
                                <div key={group.key} style={{ marginBottom: 12 }}>
                                    <div
                                        onClick={() => toggleCollapse(group.key)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", marginBottom: 8,
                                            background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)", borderRadius: 10,
                                            cursor: "pointer", border: isDark ? "1px solid rgba(139,92,246,0.12)" : "1px solid rgba(139,92,246,0.08)",
                                        }}
                                    >
                                        {isCollapsed ? <RightOutlined style={{ fontSize: 10, color: themeColor }} /> : <DownOutlined style={{ fontSize: 10, color: themeColor }} />}
                                        <Text strong style={{ fontSize: 13 }}>{group.label}</Text>
                                        <Badge count={group.tasks.length} style={{ backgroundColor: themeColor, fontSize: 10, boxShadow: "none" }} size="small" />
                                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                            {STATUS_COLUMNS.map(col => {
                                                const cnt = group.tasks.filter((t: any) => t.status === col.key).length;
                                                return cnt > 0 ? (
                                                    <span key={col.key} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: `${col.color}18`, color: col.color, fontWeight: 600 }}>{cnt}</span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                    {!isCollapsed && swimlaneContent}
                                </div>
                            );
                        })}
                    </DragDropContext>
                )}
            </div>
        </div>
    );
}
