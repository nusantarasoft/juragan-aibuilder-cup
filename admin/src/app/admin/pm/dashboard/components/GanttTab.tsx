"use client";

import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Empty, Tag, Tooltip, Typography, Select, Space, Spin } from "antd";
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch ALL tasks for this project (not sprint-filtered)
    const loadAllTasks = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await gql(GET_ALL_TASKS, {
                tenantId: DEFAULT_TENANT_ID,
                projectId,
            });
            setAllTasks(data.pmTasks || []);
        } catch (e) {
            console.error("Gantt: Failed to load tasks", e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadAllTasks();
    }, [loadAllTasks]);

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
            <div style={{ display: "flex", height: rows.length * ROW_HEIGHT + 60, minHeight: 300 }}>
                {/* Fixed Label Column */}
                <div
                    style={{
                        width: LABEL_WIDTH,
                        flexShrink: 0,
                        borderRight: "2px solid #e8e8e8",
                        background: "#fafafa",
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
                            borderBottom: "2px solid #e8e8e8",
                            fontWeight: 600,
                            fontSize: 13,
                            color: "#595959",
                        }}
                    >
                        Task / Sprint
                    </div>
                    {/* Row Labels */}
                    {rows.map((row) => (
                        <div
                            key={row.id}
                            style={{
                                height: ROW_HEIGHT,
                                display: "flex",
                                alignItems: "center",
                                padding: row.isSummary ? "0 12px" : "0 12px 0 28px",
                                borderBottom: "1px solid #f0f0f0",
                                background: row.isSummary ? "#f5f7fa" : "white",
                                gap: 8,
                            }}
                        >
                            {row.isSummary ? (
                                <Text strong style={{ fontSize: 13 }}>
                                    🏃 {row.label}
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
                                        style={{ fontSize: 12, flex: 1 }}
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
                                borderBottom: "2px solid #e8e8e8",
                                position: "sticky",
                                top: 0,
                                zIndex: 1,
                                background: "white",
                            }}
                        >
                            {timeline.map((date, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: cellWidth,
                                        flexShrink: 0,
                                        textAlign: "center",
                                        borderRight: "1px solid #f0f0f0",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        background: isToday(date)
                                            ? "rgba(24, 144, 255, 0.08)"
                                            : date.day() === 0 || date.day() === 6
                                                ? "#fafafa"
                                                : "white",
                                    }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 600, color: isToday(date) ? "#1890ff" : "#262626" }}>
                                        {formatHeader(date)}
                                    </div>
                                    <div style={{ fontSize: 10, color: "#8c8c8c" }}>
                                        {formatSubHeader(date)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Grid Lines + Bars */}
                        {rows.map((row, rowIdx) => {
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
                                        borderBottom: "1px solid #f0f0f0",
                                        background: row.isSummary ? "#f5f7fa" : "white",
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
                                                    borderRight: "1px solid #f5f5f5",
                                                    background:
                                                        isToday(date)
                                                            ? "rgba(24, 144, 255, 0.04)"
                                                            : (date.day() === 0 || date.day() === 6)
                                                                ? "rgba(0,0,0,0.015)"
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
                                                <div>
                                                    {row.start.format("MMM D")} → {row.end.format("MMM D, YYYY")}
                                                </div>
                                                {row.assignee && <div>👤 {row.assignee}</div>}
                                                {row.priority && (
                                                    <div>Priority: {row.priority.toUpperCase()}</div>
                                                )}
                                            </div>
                                        }
                                    >
                                        <div
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
                                                cursor: "pointer",
                                                transition: "box-shadow 0.2s",
                                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: width > 60 ? "flex-start" : "center",
                                                padding: "0 6px",
                                                zIndex: 1,
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.target as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.target as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
                                            }}
                                        >
                                            {width > 60 && !row.isSummary && (
                                                <span
                                                    style={{
                                                        color: "white",
                                                        fontSize: 10,
                                                        fontWeight: 500,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {row.label}
                                                </span>
                                            )}
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        })}

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
        </ProCard>
    );
}
