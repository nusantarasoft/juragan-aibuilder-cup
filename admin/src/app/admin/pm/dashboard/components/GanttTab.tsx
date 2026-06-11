"use client";

import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { ProCard, ModalForm, ProFormSelect } from "@ant-design/pro-components";
import { Empty, Input, Tag, Tooltip, Typography, Select, Space, Spin, theme, message, Button } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

dayjs.extend(weekOfYear);

const { Text } = Typography;

const GET_ALL_TASKS = `
  query GetAllTasksForGantt($tenantId: String!, $projectId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId) {
      id title status priority type estimatedHours loggedHours startDate dueDate sprintId isArchived
      assignee { firstName lastName avatarUrl }
    }
  }
`;

const GET_DEPENDENCIES = `
  query GetDeps($projectId: String!) {
    pmTaskDependencies(projectId: $projectId) {
      id taskId dependsOnTaskId type
    }
  }
`;

const UPDATE_TASK = `
  mutation($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) { id startDate dueDate estimatedHours }
  }
`;

const CREATE_DEPENDENCY = `
  mutation($tenantId: String!, $input: CreatePmTaskDependencyInput!) {
    createPmTaskDependency(tenantId: $tenantId, input: $input) { id }
  }
`;

interface GanttTabProps {
    sprints: any[];
    tasks: any[];
    projectId: string;
}

const STATUS_COLORS: Record<string, string> = {
    done: "#52c41a",
    in_progress: "#1890ff",
    review: "#faad14",
    todo: "#d9d9d9",
    active: "#1890ff",
    completed: "#52c41a",
    planned: "#d9d9d9",
};

const PRIORITY_COLORS: Record<string, string> = {
    high: "#ff4d4f",
    medium: "#faad14",
    low: "#52c41a",
};

type ViewMode = "day" | "week" | "month";

function getDateRange(items: { start: dayjs.Dayjs; end: dayjs.Dayjs }[]) {
    if (items.length === 0) {
        const now = dayjs();
        return { start: now.subtract(7, "day"), end: now.add(30, "day") };
    }
    let earliest = items[0].start;
    let latest = items[0].end;
    items.forEach((item) => {
        if (item.start.isBefore(earliest)) earliest = item.start;
        if (item.end.isAfter(latest)) latest = item.end;
    });
    return {
        start: earliest.subtract(3, "day"),
        end: latest.add(7, "day"),
    };
}

function generateTimeline(start: dayjs.Dayjs, end: dayjs.Dayjs, mode: ViewMode) {
    const units: dayjs.Dayjs[] = [];
    let current = start.startOf(mode === "month" ? "month" : mode === "week" ? "week" : "day");
    const finish = end.endOf(mode === "month" ? "month" : mode === "week" ? "week" : "day");

    while (current.isBefore(finish) || current.isSame(finish, "day")) {
        units.push(current);
        current = current.add(1, mode === "month" ? "month" : mode === "week" ? "week" : "day");
    }
    return units;
}

function getBarPosition(
    itemStart: dayjs.Dayjs,
    itemEnd: dayjs.Dayjs,
    timelineStart: dayjs.Dayjs,
    timelineEnd: dayjs.Dayjs,
    totalWidth: number
) {
    const totalDays = timelineEnd.diff(timelineStart, "day") || 1;
    const leftDays = itemStart.diff(timelineStart, "day");
    const widthDays = Math.max(1, itemEnd.diff(itemStart, "day"));
    const left = (leftDays / totalDays) * totalWidth;
    const width = (widthDays / totalDays) * totalWidth;
    return { left: Math.max(0, left), width: Math.max(20, width) };
}

export default function GanttTab({ sprints, tasks: _parentTasks, projectId }: GanttTabProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    const [searchQuery, setSearchQuery] = useState('');
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase === '#000000' || antToken.colorBgContainer === '#1f1f1f';
    const colors = {
        bg: isDark ? 'rgba(15, 15, 23, 0.7)' : '#fff',
        bgAlt: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa',
        bgHover: isDark ? 'rgba(255,255,255,0.06)' : '#f5f7fa',
        bgWeekend: isDark ? 'rgba(255,255,255,0.02)' : '#f8f9fb',
        border: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
        borderLight: isDark ? 'rgba(255,255,255,0.04)' : '#f0f0f0',
        text: isDark ? '#e2e8f0' : '#333',
        textSecondary: isDark ? '#94a3b8' : '#666',
        textMuted: isDark ? '#64748b' : '#999',
        headerBg: isDark ? 'rgba(139,92,246,0.08)' : '#f0f5ff',
        sprintBg: isDark ? 'rgba(139,92,246,0.06)' : '#f0f5ff',
    };
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [deps, setDeps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [depModalOpen, setDepModalOpen] = useState(false);

    // Fetch ALL tasks for this project (not sprint-filtered)
    const loadAllTasks = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const [data, depData] = await Promise.all([
                gql(GET_ALL_TASKS, { tenantId: DEFAULT_TENANT_ID, projectId }),
                gql(GET_DEPENDENCIES, { projectId }).catch(() => ({ pmTaskDependencies: [] })),
            ]);
            setAllTasks(data.pmTasks || []);
            setDeps(depData.pmTaskDependencies || []);
        } catch (e) {
            console.error("Gantt: Failed to load tasks", e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadAllTasks();
    }, [loadAllTasks]);

    const handleAddDep = async (values: any) => {
        try {
            await gql(CREATE_DEPENDENCY, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    projectId,
                    taskId: values.taskId,
                    dependsOnTaskId: values.dependsOnTaskId,
                    type: values.type || 'finish_to_start'
                }
            });
            message.success("Dependency added");
            setDepModalOpen(false);
            loadAllTasks();
            return true;
        } catch (e: any) {
            message.error("Failed to add dependency");
            return false;
        }
    };

    // Update task dates on drag
    const handleTaskDragEnd = async (taskId: string, daysMoved: number, originalTask: any) => {
        if (daysMoved === 0) return;
        const newStart = originalTask.startDate ? dayjs(originalTask.startDate).add(daysMoved, "day").format("YYYY-MM-DD") : dayjs().add(daysMoved, "day").format("YYYY-MM-DD");
        const newEnd = originalTask.dueDate ? dayjs(originalTask.dueDate).add(daysMoved, "day").format("YYYY-MM-DD") : undefined;
        
        try {
            await gql(UPDATE_TASK, { id: taskId, input: { startDate: newStart, dueDate: newEnd } });
            message.success("Task dates updated");
            loadAllTasks();
        } catch (e: any) {
            message.error("Failed to update task dates");
            console.error(e);
        }
    };

    // Build rows: sprints as group headers + their tasks, then backlog tasks
    const rows = useMemo(() => {
        const result: {
            id: string;
            label: string;
            type: "sprint" | "task";
            status: string;
            priority?: string;
            assignee?: string;
            start: dayjs.Dayjs;
            end: dayjs.Dayjs;
            isSummary: boolean;
        }[] = [];

        sprints.forEach((sprint: any) => {
            const start = sprint.startDate ? dayjs(sprint.startDate) : dayjs();
            const end = sprint.endDate ? dayjs(sprint.endDate) : start.add(14, "day");

            result.push({
                id: sprint.id,
                label: sprint.name,
                type: "sprint",
                status: sprint.status,
                start,
                end,
                isSummary: true,
            });

            // Add tasks belonging to this sprint
            allTasks
                .filter((t: any) => t.sprintId === sprint.id)
                .forEach((task: any) => {
                    const taskStart = task.startDate
                        ? dayjs(task.startDate)
                        : task.dueDate
                            ? dayjs(task.dueDate).subtract(Math.ceil((task.estimatedHours || 8) / 8), "day")
                            : dayjs();
                    const taskEnd = task.dueDate
                        ? dayjs(task.dueDate)
                        : taskStart.add(Math.ceil((task.estimatedHours || 8) / 8), "day");

                    result.push({
                        id: task.id,
                        label: task.title,
                        type: "task",
                        status: task.status,
                        priority: task.priority,
                        assignee: task.assignee
                            ? `${task.assignee.firstName} ${task.assignee.lastName}`
                            : undefined,
                        start: taskStart,
                        end: taskEnd,
                        isSummary: false,
                    });
                });
        });

        // Backlog tasks
        const backlog = allTasks.filter((t: any) => !t.sprintId);
        if (backlog.length > 0) {
            result.push({
                id: "backlog",
                label: "Backlog",
                type: "sprint",
                status: "planned",
                start: dayjs(),
                end: dayjs().add(14, "day"),
                isSummary: true,
            });
            backlog.forEach((task: any) => {
                const taskStart = task.startDate ? dayjs(task.startDate) : dayjs();
                const taskEnd = task.dueDate
                    ? dayjs(task.dueDate)
                    : taskStart.add(Math.ceil((task.estimatedHours || 8) / 8), "day");

                result.push({
                    id: task.id,
                    label: task.title,
                    type: "task",
                    status: task.status,
                    priority: task.priority,
                    assignee: task.assignee
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : undefined,
                    start: taskStart,
                    end: taskEnd,
                    isSummary: false,
                });
            });
        }

        return result;
    }, [sprints, allTasks]);

    // Filter rows based on search query
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const query = searchQuery.toLowerCase();
        // Find matching task IDs
        const matchingTaskIds = new Set<string>();
        const sprintsWithMatchingChildren = new Set<string>();
        let currentSprintId: string | null = null;
        rows.forEach((row) => {
            if (row.type === 'sprint') {
                currentSprintId = row.id;
            } else {
                if (row.label.toLowerCase().includes(query) ||
                    row.status?.toLowerCase().includes(query) ||
                    row.assignee?.toLowerCase().includes(query)) {
                    matchingTaskIds.add(row.id);
                    if (currentSprintId) {
                        sprintsWithMatchingChildren.add(currentSprintId);
                    }
                }
            }
        });
        return rows.filter((row) => {
            if (row.type === 'sprint') return sprintsWithMatchingChildren.has(row.id);
            return matchingTaskIds.has(row.id);
        });
    }, [rows, searchQuery]);

    const { start: timelineStart, end: timelineEnd } = useMemo(
        () => getDateRange(rows),
        [rows]
    );
    const timeline = useMemo(
        () => generateTimeline(timelineStart, timelineEnd, viewMode),
        [timelineStart, timelineEnd, viewMode]
    );

    const cellWidth = viewMode === "day" ? 40 : viewMode === "week" ? 100 : 120;
    const totalWidth = timeline.length * cellWidth;
    const ROW_HEIGHT = 40;
    const LABEL_WIDTH = 280;

    // Scroll to today on mount
    useEffect(() => {
        if (scrollRef.current) {
            const todayOffset = dayjs().diff(timelineStart, "day");
            const offset = viewMode === "day" ? todayOffset * cellWidth : todayOffset * (cellWidth / 7);
            scrollRef.current.scrollLeft = Math.max(0, offset - 200);
        }
    }, [timelineStart, cellWidth, viewMode]);

    if (loading) {
        return (
            <ProCard bordered bodyStyle={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" tip="Loading Gantt timeline..." />
            </ProCard>
        );
    }

    if (rows.length === 0) {
        return (
            <ProCard bordered>
                <Empty description="No tasks or sprints to display. Create sprints and tasks first." />
            </ProCard>
        );
    }

    const isToday = (date: dayjs.Dayjs) => date.isSame(dayjs(), "day");

    const formatHeader = (date: dayjs.Dayjs) => {
        if (viewMode === "day") return date.format("D");
        if (viewMode === "week") return `W${date.week()}`;
        return date.format("MMM");
    };

    const formatSubHeader = (date: dayjs.Dayjs) => {
        if (viewMode === "day") return date.format("ddd");
        if (viewMode === "week") return date.format("MMM D");
        return date.format("YYYY");
    };

    return (
        <ProCard
            title="Project Timeline"
            bordered
            extra={
                <Space>
                    <Input
                        prefix={<SearchOutlined style={{ color: colors.textMuted, fontSize: 12 }} />}
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        allowClear
                        size="small"
                        style={{ width: 160, borderRadius: 6 }}
                    />
                    <Button icon={<LinkOutlined />} onClick={() => setDepModalOpen(true)} size="small">
                        Link
                    </Button>
                    <Text type="secondary">View:</Text>
                    <Select
                        value={viewMode}
                        onChange={setViewMode}
                        size="small"
                        options={[
                            { value: "day", label: "Day" },
                            { value: "week", label: "Week" },
                            { value: "month", label: "Month" },
                        ]}
                        style={{ width: 90 }}
                    />
                </Space>
            }
            bodyStyle={{ padding: 0, overflow: "hidden" }}
        >
            <div style={{ display: "flex", height: filteredRows.length * ROW_HEIGHT + 60, minHeight: 300 }}>
                {/* Fixed Label Column */}
                <div
                    style={{
                        width: LABEL_WIDTH,
                        flexShrink: 0,
                        borderRight: `2px solid ${colors.border}`,
                        background: colors.bgAlt,
                        zIndex: 2,
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            height: 60,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 12px",
                            borderBottom: `2px solid ${colors.border}`,
                            fontWeight: 600,
                            fontSize: 13,
                            color: colors.textSecondary,
                        }}
                    >
                        Task / Sprint
                    </div>
                    {/* Row Labels */}
                    {filteredRows.map((row) => (
                        <div
                            key={row.id}
                            style={{
                                height: ROW_HEIGHT,
                                display: "flex",
                                alignItems: "center",
                                padding: row.isSummary ? "0 12px" : "0 12px 0 28px",
                                borderBottom: `1px solid ${colors.borderLight}`,
                                background: row.isSummary ? colors.sprintBg : colors.bg,
                                gap: 8,
                            }}
                        >
                            {row.isSummary ? (
                                <Text strong style={{ fontSize: 13, color: colors.text }}>
                                    {row.label}
                                </Text>
                            ) : (
                                <>
                                    <Tag
                                        color={STATUS_COLORS[row.status] || "#d9d9d9"}
                                        style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
                                    >
                                        {row.status?.replace("_", " ").toUpperCase()}
                                    </Tag>
                                    <Text
                                        ellipsis
                                        style={{ fontSize: 12, flex: 1, color: colors.text }}
                                        title={row.label}
                                    >
                                        {row.label}
                                    </Text>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Scrollable Timeline */}
                <div
                    ref={scrollRef}
                    style={{
                        flex: 1,
                        overflowX: "auto",
                        overflowY: "hidden",
                        position: "relative",
                    }}
                >
                    <div style={{ width: totalWidth, position: "relative" }}>
                        {/* Timeline Header */}
                        <div
                            style={{
                                height: 60,
                                display: "flex",
                                borderBottom: `2px solid ${colors.border}`,
                                position: "sticky",
                                top: 0,
                                zIndex: 1,
                                background: colors.bg,
                            }}
                        >
                            {timeline.map((date, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: cellWidth,
                                        flexShrink: 0,
                                        textAlign: "center",
                                        borderRight: `1px solid ${colors.borderLight}`,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        background: isToday(date)
                                            ? "rgba(24, 144, 255, 0.08)"
                                            : date.day() === 0 || date.day() === 6
                                                ? colors.bgWeekend
                                                : colors.bg,
                                    }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 600, color: isToday(date) ? "#1890ff" : colors.text }}>
                                        {formatHeader(date)}
                                    </div>
                                    <div style={{ fontSize: 10, color: colors.textMuted }}>
                                        {formatSubHeader(date)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Grid Lines + Bars */}
                        {filteredRows.map((row, rowIdx) => {
                            const { left, width } = getBarPosition(
                                row.start,
                                row.end,
                                timelineStart,
                                timelineEnd,
                                totalWidth
                            );

                            const barColor = row.isSummary
                                ? "#722ed1"
                                : STATUS_COLORS[row.status] || "#1890ff";

                            return (
                                <div
                                    key={row.id}
                                    style={{
                                        height: ROW_HEIGHT,
                                        position: "relative",
                                        borderBottom: `1px solid ${colors.borderLight}`,
                                        background: row.isSummary ? colors.sprintBg : colors.bg,
                                    }}
                                >
                                    {/* Grid cells */}
                                    <div style={{ display: "flex", height: "100%", position: "absolute", width: totalWidth }}>
                                        {timeline.map((date, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: cellWidth,
                                                    flexShrink: 0,
                                                    borderRight: `1px solid ${colors.borderLight}`,
                                                    background:
                                                        isToday(date)
                                                            ? "rgba(24, 144, 255, 0.04)"
                                                            : (date.day() === 0 || date.day() === 6)
                                                                ? colors.bgWeekend
                                                                : "transparent",
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Bar */}
                                    <Tooltip
                                        title={
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{row.label}</div>
                                                <div style={{ color: colors.textSecondary }}>
                                                    {row.start.format("MMM D")} - {row.end.format("MMM D, YYYY")}
                                                </div>
                                                {row.assignee && <div>Assignee: {row.assignee}</div>}
                                                {row.priority && (
                                                    <div>Priority: {row.priority.toUpperCase()}</div>
                                                )}
                                            </div>
                                        }
                                    >
                                        <motion.div
                                            drag={!row.isSummary ? "x" : false}
                                            dragMomentum={false}
                                            onDragEnd={(e, info) => {
                                                const daysMoved = Math.round(info.offset.x / cellWidth);
                                                if (!row.isSummary) {
                                                    const task = allTasks.find(t => t.id === row.id);
                                                    if (task) handleTaskDragEnd(row.id, daysMoved, task);
                                                }
                                            }}
                                            style={{
                                                position: "absolute",
                                                left,
                                                top: row.isSummary ? 12 : 10,
                                                width,
                                                height: row.isSummary ? 16 : 20,
                                                background: row.isSummary
                                                    ? `repeating-linear-gradient(45deg, ${barColor}, ${barColor} 4px, rgba(114, 46, 209, 0.7) 4px, rgba(114, 46, 209, 0.7) 8px)`
                                                    : barColor,
                                                borderRadius: row.isSummary ? 2 : 4,
                                                cursor: row.isSummary ? "default" : "grab",
                                                transition: "box-shadow 0.2s",
                                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: width > 60 ? "flex-start" : "center",
                                                padding: "0 6px",
                                                zIndex: 1,
                                                overflow: "hidden",
                                            }}
                                            whileDrag={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", cursor: "grabbing" }}
                                            onClick={row.isSummary ? undefined : () => router.push(`/admin/pm/tasks/${row.id}`)}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
                                            }}
                                        >
                                            {/* Progress fill */}
                                            {!row.isSummary && (row.status === 'in_progress' || row.status === 'in_review') ? (
                                                <div style={{
                                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                                    width: row.status === 'in_review' ? '80%' : '40%',
                                                    background: 'rgba(255,255,255,0.2)',
                                                    borderRadius: 'inherit',
                                                }} />
                                            ) : null}
                                            {width > 60 && !row.isSummary && (
                                                <span
                                                    style={{
                                                        color: "white",
                                                        fontSize: 10,
                                                        fontWeight: 500,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        position: "relative",
                                                        zIndex: 1,
                                                    }}
                                                >
                                                    {row.label}
                                                </span>
                                            )}
                                        </motion.div>
                                    </Tooltip>
                                </div>
                            );
                        })}

                        {/* Dependency Arrows (SVG overlay) */}
                        {deps.length > 0 && (() => {
                            // Build row index map for positioning
                            const rowIndexMap = new Map<string, number>();
                            filteredRows.forEach((r, i) => rowIndexMap.set(r.id, i));

                            return (
                                <svg
                                    style={{
                                        position: 'absolute',
                                        top: 60, // below header
                                        left: 0,
                                        width: totalWidth,
                                        height: filteredRows.length * ROW_HEIGHT,
                                        pointerEvents: 'none',
                                        zIndex: 2,
                                    }}
                                >
                                    <defs>
                                        <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                            <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                                        </marker>
                                        <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                            <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                                        </marker>
                                        <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                            <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
                                        </marker>
                                    </defs>
                                    {deps.map((dep: any) => {
                                        const fromIdx = rowIndexMap.get(dep.dependsOnTaskId);
                                        const toIdx = rowIndexMap.get(dep.taskId);
                                        if (fromIdx === undefined || toIdx === undefined) return null;

                                        const fromRow = rows[fromIdx];
                                        const toRow = rows[toIdx];
                                        if (!fromRow || !toRow) return null;

                                        const fromPos = getBarPosition(fromRow.start, fromRow.end, timelineStart, timelineEnd, totalWidth);
                                        const toPos = getBarPosition(toRow.start, toRow.end, timelineStart, timelineEnd, totalWidth);

                                        // Arrow from end of 'from' bar to start of 'to' bar
                                        const x1 = fromPos.left + fromPos.width;
                                        const y1 = fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                                        const x2 = toPos.left;
                                        const y2 = toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                                        // Determine color based on dependency status
                                        const fromStatus = fromRow.status;
                                        const arrowColor = fromStatus === 'done' ? '#10b981' : fromStatus === 'in_progress' ? '#3b82f6' : '#ef4444';
                                        const markerId = fromStatus === 'done' ? 'arrowGreen' : fromStatus === 'in_progress' ? 'arrowBlue' : 'arrowRed';

                                        // Bezier curve control points
                                        const midX = (x1 + x2) / 2;
                                        const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

                                        return (
                                            <path
                                                key={dep.id}
                                                d={path}
                                                fill="none"
                                                stroke={arrowColor}
                                                strokeWidth={1.5}
                                                strokeDasharray={fromStatus === 'done' ? 'none' : '4 2'}
                                                markerEnd={`url(#${markerId})`}
                                                opacity={0.7}
                                            />
                                        );
                                    })}
                                </svg>
                            );
                        })()}

                        {/* Today marker line */}
                        {(() => {
                            const todayPos = getBarPosition(
                                dayjs(),
                                dayjs().add(1, "day"),
                                timelineStart,
                                timelineEnd,
                                totalWidth
                            );
                            return (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: todayPos.left,
                                        top: 0,
                                        bottom: 0,
                                        width: 2,
                                        background: "#ff4d4f",
                                        zIndex: 3,
                                        pointerEvents: "none",
                                    }}
                                />
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Dependency Modal */}
            <ModalForm
                title="Add Dependency"
                open={depModalOpen}
                onOpenChange={setDepModalOpen}
                onFinish={handleAddDep}
                modalProps={{ destroyOnClose: true }}
                width={400}
            >
                <ProFormSelect
                    name="dependsOnTaskId"
                    label="Predecessor (Depends On)"
                    rules={[{ required: true }]}
                    options={allTasks.map(t => ({ value: t.id, label: t.title }))}
                    showSearch
                />
                <ProFormSelect
                    name="taskId"
                    label="Successor (Task)"
                    rules={[{ required: true }]}
                    options={allTasks.map(t => ({ value: t.id, label: t.title }))}
                    showSearch
                />
                <ProFormSelect
                    name="type"
                    label="Dependency Type"
                    initialValue="finish_to_start"
                    options={[
                        { value: 'finish_to_start', label: 'Finish to Start (FS)' },
                        { value: 'start_to_start', label: 'Start to Start (SS)' },
                    ]}
                />
            </ModalForm>
        </ProCard>
    );
}
