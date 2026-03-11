"use client";

import React, { useMemo } from "react";
import { Gantt } from "wx-react-gantt";
import { ProCard } from "@ant-design/pro-components";
import { Empty } from "antd";

interface GanttTabProps {
    sprints: any[];
    tasks: any[];
    projectId: string;
}

export default function GanttTab({ sprints, tasks, projectId }: GanttTabProps) {
    const { ganttTasks, scales } = useMemo(() => {
        const now = new Date();
        const items: any[] = [];

        // Map sprints as summary (parent) rows
        sprints.forEach((sprint: any) => {
            const start = sprint.startDate ? new Date(sprint.startDate) : now;
            const end = sprint.endDate ? new Date(sprint.endDate) : new Date(start.getTime() + 14 * 86400000);
            const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

            items.push({
                id: sprint.id,
                text: `🏃 ${sprint.name}`,
                start,
                duration,
                progress: sprint.status === "completed" ? 100 : sprint.status === "active" ? 50 : 0,
                type: "summary",
                open: true,
            });
        });

        // Map tasks as child rows
        tasks.forEach((task: any) => {
            const start = task.startDate
                ? new Date(task.startDate)
                : task.dueDate
                    ? new Date(new Date(task.dueDate).getTime() - (task.estimatedHours || 8) * 3600000)
                    : now;

            const durationHours = task.estimatedHours || 8;
            const durationDays = Math.max(1, Math.ceil(durationHours / 8));

            let progress = 0;
            if (task.status === "done") progress = 100;
            else if (task.status === "review") progress = 80;
            else if (task.status === "in_progress") progress = 40;
            else if (task.status === "todo") progress = 0;

            items.push({
                id: task.id,
                text: task.title,
                start,
                duration: durationDays,
                progress,
                parent: task.sprintId || 0,
                type: "task",
            });
        });

        // Backlog tasks (no sprint) — group them
        const backlogTasks = tasks.filter((t: any) => !t.sprintId);
        if (backlogTasks.length > 0) {
            items.push({
                id: "backlog-summary",
                text: "📋 Backlog",
                start: now,
                duration: 14,
                progress: 0,
                type: "summary",
                open: true,
            });
            // Re-parent backlog tasks
            backlogTasks.forEach((t: any) => {
                const existing = items.find((item: any) => item.id === t.id);
                if (existing) existing.parent = "backlog-summary";
            });
        }

        const ganttScales = [
            { unit: "month", step: 1, format: "%F %Y" },
            { unit: "week", step: 1, format: "Week %W" },
            { unit: "day", step: 1, format: "%j" },
        ];

        return { ganttTasks: items, scales: ganttScales };
    }, [sprints, tasks]);

    const columns = [
        { id: "text", header: "Task name", flexgrow: 3 },
        { id: "start", header: "Start", flexgrow: 1, align: "center" },
        { id: "duration", header: "Days", flexgrow: 1, align: "center" },
    ];

    if (ganttTasks.length === 0) {
        return (
            <ProCard bordered>
                <Empty description="No tasks or sprints to display on the Gantt chart. Create sprints and tasks first." />
            </ProCard>
        );
    }

    return (
        <ProCard
            title="Project Timeline"
            bordered
            bodyStyle={{ padding: 0, height: 600, overflow: "hidden" }}
        >
            <Gantt
                tasks={ganttTasks}
                scales={scales}
                columns={columns}
            />
        </ProCard>
    );
}
