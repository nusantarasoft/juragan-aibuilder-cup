"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { Card, Col, Empty, Input, message, Progress, Row, Segmented, Select, Space, Spin, Statistic, Tag, Tooltip, Typography, Button } from "antd";
import {
    ProjectOutlined, CheckCircleOutlined, FlagOutlined,
    LeftOutlined, RightOutlined, SearchOutlined,
    AimOutlined, CalendarOutlined, RocketOutlined,
    DragOutlined, UndoOutlined, ReloadOutlined,
    FileExcelOutlined, FilePdfOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRouter } from "next/navigation";
import RbacGuard from "@/components/common/RbacGuard";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

const { Text } = Typography;

const GET_PROJECTS = `
  query($tenantId: String!) {
    pmProjects(tenantId: $tenantId) {
      id name projectNumber status methodology startDate endDate budget description
    }
  }
`;

const GET_TASKS = `
  query($tenantId: String!) {
    pmTasks(tenantId: $tenantId) {
      id projectId title status priority type estimatedHours dueDate startDate
    }
  }
`;

const GET_MILESTONES = `
  query($projectId: String!) {
    pmMilestones(projectId: $projectId) {
      id name projectId targetDate status description
    }
  }
`;

const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdatePmProjectInput!) {
    updatePmProject(id: $id, input: $input) {
      id name status startDate endDate
    }
  }
`;

const UPDATE_TASK = `
  mutation UpdateTask($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) {
      id title status startDate dueDate
    }
  }
`;

const STATUS_BAR_COLOR: Record<string, string> = {
    active: 'var(--theme-color, #8b5cf6)',
    completed: '#22c55e',
    planning: '#6b7280',
    on_hold: '#f59e0b',
    paused: '#f59e0b',
    cancelled: '#ef4444',
};

const MILESTONE_COLOR: Record<string, string> = {
    completed: '#22c55e',
    pending: '#f59e0b',
    overdue: '#ef4444',
};

const PRIORITY_COLOR: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
};

const ROADMAP_PROJECT_BAR = 'ROADMAP_PROJECT_BAR';
const ROADMAP_EPIC_BAR = 'ROADMAP_EPIC_BAR';

interface RoadmapDragItem {
    id: string;
    type: 'project' | 'epic';
    startDate: string;
    endDate: string;
    projectId?: string; // for epics
}

// ── DraggableProjectBar ──
function DraggableProjectBar({
    project,
    leftPct,
    widthPct,
    barColor,
    taskPct,
    isDark,
    themeColor,
    onExpand,
    isExpanded,
}: {
    project: any;
    leftPct: number;
    widthPct: number;
    barColor: string;
    taskPct: number;
    isDark: boolean;
    themeColor: string;
    onExpand: () => void;
    isExpanded: boolean;
}): React.ReactElement {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag<RoadmapDragItem, void, { isDragging: boolean }>(() => ({
        type: ROADMAP_PROJECT_BAR,
        item: {
            id: project.id,
            type: 'project' as const,
            startDate: project.startDate,
            endDate: project.endDate,
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [project.id, project.startDate, project.endDate]);

    drag(ref);

    // unused tc removed

    return (
        <Tooltip title={
            <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{project.name}</div>
                <div>{dayjs(project.startDate).format('MMM D, YYYY')} — {dayjs(project.endDate).format('MMM D, YYYY')}</div>
                <div>Tasks: ({taskPct}%)</div>
                {project.methodology && <div>Methodology: {project.methodology}</div>}
                <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DragOutlined /> Drag to reschedule
                </div>
            </div>
        }>
            <div
                ref={ref}
                style={{
                    position: 'absolute',
                    left: `${leftPct}%`, width: `${widthPct}%`,
                    height: 24, top: 10, borderRadius: 6, cursor: isDragging ? 'grabbing' : 'grab',
                    background: `linear-gradient(135deg, ${barColor}cc, ${barColor}88)`,
                    border: `1px solid ${barColor}`,
                    display: 'flex', alignItems: 'center', paddingLeft: 8, overflow: 'hidden',
                    transition: isDragging ? 'none' : 'all 0.2s ease',
                    boxShadow: isDragging ? `0 4px 16px ${barColor}44` : `0 2px 8px ${barColor}22`,
                    opacity: isDragging ? 0.5 : 1,
                    zIndex: isDragging ? 20 : 1,
                }}
                onClick={() => onExpand()}
                onMouseEnter={e => {
                    if (!isDragging) {
                        e.currentTarget.style.filter = 'brightness(1.2)';
                        e.currentTarget.style.transform = 'scaleY(1.15)';
                        e.currentTarget.style.zIndex = '5';
                    }
                }}
                onMouseLeave={e => {
                    if (!isDragging) {
                        e.currentTarget.style.filter = 'brightness(1)';
                        e.currentTarget.style.transform = 'scaleY(1)';
                        e.currentTarget.style.zIndex = '1';
                    }
                }}
            >
                {/* Progress fill */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${taskPct}%`, background: `${barColor}44`, borderRadius: '6px 0 0 6px' }} />
                <Text style={{ fontSize: 10, fontWeight: 600, color: '#fff', position: 'relative', zIndex: 2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{taskPct}%</Text>
            </div>
        </Tooltip>
    );
}

// ── DraggableEpicBar ──
function DraggableEpicBar({
    epic,
    ePct,
    eW,
    epicColor,
    projectStartDate,
    projectEndDate,
}: {
    epic: any;
    ePct: number;
    eW: number;
    epicColor: string;
    projectStartDate: string;
    projectEndDate: string;
}): React.ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const epicStart = epic.startDate || projectStartDate;
    const epicEnd = epic.dueDate || projectEndDate;

    const [{ isDragging }, drag] = useDrag<RoadmapDragItem, void, { isDragging: boolean }>(() => ({
        type: ROADMAP_EPIC_BAR,
        item: {
            id: epic.id,
            type: 'epic' as const,
            startDate: epicStart,
            endDate: epicEnd,
            projectId: epic.projectId,
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [epic.id, epicStart, epicEnd]);

    drag(ref);

    return (
        <Tooltip title={
            <div>
                <div style={{ fontWeight: 600 }}>{epic.title}</div>
                <div>Priority: {epic.priority}</div>
                <div>Status: {epic.status}</div>
                <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DragOutlined /> Drag to reschedule
                </div>
            </div>
        }>
            <div
                ref={ref}
                style={{
                    position: 'absolute', left: `${ePct}%`, width: `${eW}%`,
                    height: 16, top: 8, borderRadius: 4, cursor: isDragging ? 'grabbing' : 'grab',
                    background: `linear-gradient(135deg, ${epicColor}aa, ${epicColor}66)`,
                    border: `1px solid ${epicColor}88`,
                    transition: isDragging ? 'none' : 'all 0.2s ease',
                    opacity: isDragging ? 0.5 : 1,
                    boxShadow: isDragging ? `0 3px 12px ${epicColor}44` : 'none',
                    zIndex: isDragging ? 20 : 1,
                }}
            />
        </Tooltip>
    );
}

// ── RoadmapDropZone ──
function RoadmapDropZone({
    children,
    totalDays,
    onRescheduleProject,
    onRescheduleEpic,
    minWidth,
    isDark,
}: {
    children: React.ReactNode;
    totalDays: number;
    onRescheduleProject: (id: string, newStart: string, newEnd: string, oldStart: string, oldEnd: string) => void;
    onRescheduleEpic: (id: string, newStart: string, newEnd: string, oldStart: string, oldEnd: string) => void;
    minWidth: number;
    isDark: boolean;
}): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);

    const [{ isOver: isOverProject }, dropProject] = useDrop<RoadmapDragItem, void, { isOver: boolean }>(() => ({
        accept: [ROADMAP_PROJECT_BAR, ROADMAP_EPIC_BAR],
        drop: (item, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            if (!delta || !containerRef.current) return;

            const containerWidth = containerRef.current.getBoundingClientRect().width;
            const deltaDays = Math.round((delta.x / containerWidth) * totalDays);

            if (deltaDays === 0) return;

            const newStart = dayjs(item.startDate).add(deltaDays, 'day').format('YYYY-MM-DD');
            const newEnd = dayjs(item.endDate).add(deltaDays, 'day').format('YYYY-MM-DD');

            if (item.type === 'project') {
                onRescheduleProject(item.id, newStart, newEnd, item.startDate, item.endDate);
            } else {
                onRescheduleEpic(item.id, newStart, newEnd, item.startDate, item.endDate);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }), [totalDays, onRescheduleProject, onRescheduleEpic]);

    const setRef = useCallback((node: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        dropProject(node);
    }, [dropProject]);

    return (
        <div
            ref={setRef}
            style={{
                position: 'relative',
                minWidth,
                outline: isOverProject ? `2px dashed ${isDark ? 'rgba(139,92,246,0.4)' : 'rgba(99,102,241,0.3)'}` : 'none',
                outlineOffset: -2,
                borderRadius: 8,
                transition: 'outline 0.2s ease',
            }}
        >
            {children}
        </div>
    );
}


export default function RoadmapPage() {
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [methodologyFilter, setMethodologyFilter] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [zoom, setZoom] = useState<string>('Quarter');
    const [quarterOffset, setQuarterOffset] = useState(0);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [projData, taskData] = await Promise.all([
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_TASKS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            const projs = projData.pmProjects || [];
            setProjects(projs);
            setTasks(taskData.pmTasks || []);
            // Load milestones for all projects
            const msResults = await Promise.all(
                projs.map((p: any) => gql(GET_MILESTONES, { projectId: p.id }).catch((e: any) => {
                    console.error(`Failed to load milestones for project ${p.id}:`, e);
                    return { pmMilestones: [] };
                }))
            );
            setMilestones(msResults.flatMap((r: any) => r.pmMilestones || []));
        } catch (err: any) {
            messageApi.error("Failed to load roadmap data: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Filtered projects ──
    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => p.startDate && p.endDate)
            .filter(p => !statusFilter || p.status === statusFilter)
            .filter(p => !methodologyFilter || p.methodology === methodologyFilter)
            .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix());
    }, [projects, statusFilter, methodologyFilter, search]);

    // ── Task counts per project ──
    const tasksByProject = useMemo(() => {
        const map = new Map<string, { total: number; done: number }>();
        tasks.forEach(t => {
            const entry = map.get(t.projectId) || { total: 0, done: 0 };
            entry.total++;
            if (t.status === 'done' || t.status === 'completed') entry.done++;
            map.set(t.projectId, entry);
        });
        return map;
    }, [tasks]);

    // ── Timeline range based on zoom ──
    const timelineRange = useMemo(() => {
        const now = dayjs();
        const qStart = now.startOf('quarter').add(quarterOffset * 3, 'month');
        if (zoom === 'Month') {
            const start = qStart;
            const end = start.add(1, 'month');
            return { start, end, months: 1 };
        }
        if (zoom === 'Year') {
            const start = qStart.startOf('year');
            const end = start.add(1, 'year');
            return { start, end, months: 12 };
        }
        // Quarter default
        return { start: qStart, end: qStart.add(3, 'month'), months: 3 };
    }, [zoom, quarterOffset]);

    // ── Month columns ──
    const monthColumns = useMemo(() => {
        const cols: { label: string; start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
        let cursor = timelineRange.start;
        while (cursor.isBefore(timelineRange.end)) {
            const next = cursor.add(1, 'month');
            cols.push({ label: cursor.format('MMM YYYY'), start: cursor, end: next.isBefore(timelineRange.end) ? next : timelineRange.end });
            cursor = next;
        }
        return cols;
    }, [timelineRange]);

    const totalDays = useMemo(() => Math.max(1, timelineRange.end.diff(timelineRange.start, 'day')), [timelineRange]);

    const todayPct = useMemo(() => {
        const offset = dayjs().diff(timelineRange.start, 'day');
        return Math.max(0, Math.min(100, (offset / totalDays) * 100));
    }, [timelineRange, totalDays]);

    // ── Stats ──
    const activeCount = projects.filter(p => p.status === 'active').length;
    const upcomingMs = milestones.filter(m => {
        const d = dayjs(m.targetDate);
        return d.isAfter(dayjs()) && d.diff(dayjs(), 'day') <= 30 && m.status !== 'completed';
    }).length;
    const completionRate = useMemo(() => {
        let total = 0, done = 0;
        tasksByProject.forEach(v => { total += v.total; done += v.done; });
        return total > 0 ? Math.round((done / total) * 100) : 0;
    }, [tasksByProject]);

    // ── Epics for expanded project ──
    const getEpics = (projectId: string) => tasks.filter(t => t.projectId === projectId && t.type === 'epic');
    const getProjectMilestones = (projectId: string) => milestones.filter(m => m.projectId === projectId);

    const calcBarPosition = (startDate: string, endDate: string) => {
        const s = dayjs(startDate);
        const e = dayjs(endDate);
        const leftPct = Math.max(0, (s.diff(timelineRange.start, 'day') / totalDays) * 100);
        const widthPct = Math.max(1, (e.diff(s, 'day') / totalDays) * 100);
        return { leftPct: Math.min(leftPct, 100), widthPct: Math.min(widthPct, 100 - Math.min(leftPct, 100)) };
    };

    // ── Drag-to-Reschedule: Project ──
    const handleRescheduleProject = useCallback(async (
        projectId: string,
        newStartDate: string,
        newEndDate: string,
        oldStartDate: string,
        oldEndDate: string
    ) => {
        // Optimistic update
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, startDate: newStartDate, endDate: newEndDate } : p
        ));

        const undoKey = `undo-project-${projectId}-${Date.now()}`;
        try {
            await gql(UPDATE_PROJECT, {
                id: projectId,
                input: { startDate: newStartDate, endDate: newEndDate },
            });

            const projectName = projects.find(p => p.id === projectId)?.name || 'Project';
            messageApi.success({
                content: (
                    <span>
                        {projectName} rescheduled to {dayjs(newStartDate).format('MMM D')} — {dayjs(newEndDate).format('MMM D, YYYY')}{' '}
                        <Button
                            type="link"
                            size="small"
                            icon={<UndoOutlined />}
                            onClick={async () => {
                                try {
                                    await gql(UPDATE_PROJECT, {
                                        id: projectId,
                                        input: { startDate: oldStartDate, endDate: oldEndDate },
                                    });
                                    setProjects(prev => prev.map(p =>
                                        p.id === projectId ? { ...p, startDate: oldStartDate, endDate: oldEndDate } : p
                                    ));
                                    messageApi.success('Reschedule undone');
                                } catch (err: any) { console.error("PM Error", err); 
                                    messageApi.error('Failed to undo reschedule');
                                }
                            }}
                            style={{ padding: '0 4px' }}
                        >
                            Undo
                        </Button>
                    </span>
                ),
                key: undoKey,
                duration: 6,
            });
        } catch (err: any) {
            // Rollback
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, startDate: oldStartDate, endDate: oldEndDate } : p
            ));
            messageApi.error(`Failed to reschedule: ${err.message}`);
        }
    }, [projects, messageApi]);

    // ── Drag-to-Reschedule: Epic (task) ──
    const handleRescheduleEpic = useCallback(async (
        taskId: string,
        newStartDate: string,
        newEndDate: string,
        oldStartDate: string,
        oldEndDate: string
    ) => {
        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, startDate: newStartDate, dueDate: newEndDate } : t
        ));

        const undoKey = `undo-epic-${taskId}-${Date.now()}`;
        try {
            await gql(UPDATE_TASK, {
                id: taskId,
                input: { startDate: newStartDate, dueDate: newEndDate },
            });

            const epicTitle = tasks.find(t => t.id === taskId)?.title || 'Epic';
            messageApi.success({
                content: (
                    <span>
                        {epicTitle} rescheduled to {dayjs(newStartDate).format('MMM D')} — {dayjs(newEndDate).format('MMM D, YYYY')}{' '}
                        <Button
                            type="link"
                            size="small"
                            icon={<UndoOutlined />}
                            onClick={async () => {
                                try {
                                    await gql(UPDATE_TASK, {
                                        id: taskId,
                                        input: { startDate: oldStartDate, dueDate: oldEndDate },
                                    });
                                    setTasks(prev => prev.map(t =>
                                        t.id === taskId ? { ...t, startDate: oldStartDate, dueDate: oldEndDate } : t
                                    ));
                                    messageApi.success('Reschedule undone');
                                } catch (err: any) { console.error("PM Error", err); 
                                    messageApi.error('Failed to undo reschedule');
                                }
                            }}
                            style={{ padding: '0 4px' }}
                        >
                            Undo
                        </Button>
                    </span>
                ),
                key: undoKey,
                duration: 6,
            });
        } catch (err: any) {
            // Rollback
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, startDate: oldStartDate, dueDate: oldEndDate } : t
            ));
            messageApi.error(`Failed to reschedule: ${err.message}`);
        }
    }, [tasks, messageApi]);

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    if (loading) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Roadmap</AuroraText>}
                subTitle={<DecryptedText text="Strategic quarterly timeline of projects and epics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
                <div style={{ textAlign: 'center', padding: 120 }}><Spin size="large" /></div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Roadmap</AuroraText>}
            subTitle={<DecryptedText text="Strategic quarterly timeline of projects and epics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <RbacGuard key="exp" requiredRole="manager">
                    <Tooltip title="Export to Excel">
                        <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({
                            fileName: 'pm_roadmap',
                            title: 'PM Roadmap',
                            dateRange: { start: timelineRange.start.format('YYYY-MM-DD'), end: timelineRange.end.format('YYYY-MM-DD') },
                            columns: [{ header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Start', key: 'startDate' }, { header: 'End', key: 'endDate' }, { header: 'Methodology', key: 'methodology' }],
                            data: filteredProjects,
                        })} />
                    </Tooltip>
                    <Tooltip title="Export to PDF">
                        <Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({
                            fileName: 'pm_roadmap',
                            title: 'PM Roadmap',
                            dateRange: { start: timelineRange.start.format('YYYY-MM-DD'), end: timelineRange.end.format('YYYY-MM-DD') },
                            columns: [{ header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Start', key: 'startDate' }, { header: 'End', key: 'endDate' }, { header: 'Methodology', key: 'methodology' }],
                            data: filteredProjects,
                        })} />
                    </Tooltip>
                </RbacGuard>
            ]}>
            {contextHolder}

            <DndProvider backend={HTML5Backend}>
                {/* ── Summary Stats ── */}
                <BentoGrid className="max-w-full mb-6">
                    {[
                        { label: 'Active Projects', value: activeCount, icon: <RocketOutlined />, color: themeColor },
                        { label: 'Upcoming Milestones', value: upcomingMs, icon: <FlagOutlined />, color: '#f59e0b' },
                        { label: 'Completion Rate', value: completionRate, icon: <CheckCircleOutlined />, color: '#10b981', suffix: "%" },
                    ].map((s, i) => (
                        <BentoGridItem
                            key={i}
                            title={s.label}
                            description="Roadmap summary"
                            icon={React.cloneElement(s.icon as React.ReactElement, { style: { color: s.color } })}
                            header={
                                <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>
                                        {s.value}
                                        {s.suffix && <span style={{ fontSize: 20 }}>{s.suffix}</span>}
                                    </div>
                                    {s.label === 'Completion Rate' && (
                                        <div className="mt-2 w-1/2">
                                            <Progress percent={completionRate} size="small" showInfo={false} strokeColor={{ '0%': '#10b981', '100%': '#34d399' }} />
                                        </div>
                                    )}
                                </div>
                            }
                            className="col-span-3 lg:col-span-1"
                        />
                    ))}
                </BentoGrid>

                {/* ── Filters & Navigation ── */}
                <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Space size={12} wrap>
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}
                                options={[{ label: 'Active', value: 'active' }, { label: 'Planning', value: 'planning' }, { label: 'Completed', value: 'completed' }, { label: 'On Hold', value: 'on_hold' }]} />
                            <Select placeholder="Methodology" allowClear value={methodologyFilter} onChange={setMethodologyFilter} style={{ width: 140 }}
                                options={[{ label: 'Agile', value: 'agile' }, { label: 'Waterfall', value: 'waterfall' }, { label: 'Hybrid', value: 'hybrid' }]} />
                            <Input placeholder="Search projects..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180 }} allowClear />
                        </Space>
                        <Space size={8}>
                            <Tooltip title="Refresh roadmap">
                                <Button icon={<ReloadOutlined />} size="small" onClick={loadData} />
                            </Tooltip>
                            <Tooltip title="Drag project & epic bars horizontally to reschedule">
                                <Tag icon={<DragOutlined />} color="purple" style={{ fontSize: 11, cursor: 'help' }}>Drag to reschedule</Tag>
                            </Tooltip>
                            <div style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                                onClick={() => setQuarterOffset(o => o - 1)}>
                                <LeftOutlined style={{ fontSize: 12 }} />
                            </div>
                            <Tooltip title="Jump to today">
                                <Button size="small" onClick={() => setQuarterOffset(0)} disabled={quarterOffset === 0}
                                    style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                    Today
                                </Button>
                            </Tooltip>
                            <Text strong style={{ fontSize: 13, minWidth: 120, textAlign: 'center' }}>
                                {timelineRange.start.format('MMM YYYY')} — {timelineRange.end.subtract(1, 'day').format('MMM YYYY')}
                            </Text>
                            <div style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                                onClick={() => setQuarterOffset(o => o + 1)}>
                                <RightOutlined style={{ fontSize: 12 }} />
                            </div>
                            <Segmented size="small" value={zoom} onChange={v => setZoom(v as string)} options={['Month', 'Quarter', 'Year']} />
                        </Space>
                    </div>
                </Card>

                {/* ── Timeline Chart ── */}
                <Card
                    title={<Space><CalendarOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Project Roadmap</span><Tag color="purple">{filteredProjects.length}</Tag></Space>}
                    style={glassCard}
                >
                    {filteredProjects.length === 0 ? (
                        <Empty description="No projects match current filters. Adjust filters or add projects with dates." />
                    ) : (
                        <div style={{ display: 'flex', minHeight: 100 }}>
                            {/* ── Label Column ── */}
                            <div style={{ width: 220, flexShrink: 0 }}>
                                <div style={{ height: 36, marginBottom: 4 }} />
                                {filteredProjects.map(project => {
                                    const barColor = project.status === 'active' ? themeColor : (STATUS_BAR_COLOR[project.status] || '#6b7280');
                                    return (
                                        <React.Fragment key={project.id}>
                                            <div style={{ height: 44, display: 'flex', alignItems: 'center', paddingRight: 8, cursor: 'pointer' }}
                                                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: barColor, flexShrink: 0 }} />
                                                        <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={project.name}>{project.name}</Text>
                                                        <Tooltip title="Open project">
                                                            <RocketOutlined
                                                                style={{ fontSize: 11, color: themeColor, cursor: 'pointer', opacity: 0.7 }}
                                                                onClick={(e) => { e.stopPropagation(); router.push(`/admin/pm/dashboard?projectId=${project.id}`); }}
                                                            />
                                                        </Tooltip>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 4, marginLeft: 14, marginTop: 2 }}>
                                                        <Tag style={{ fontSize: 9, lineHeight: '14px', height: 16, padding: '0 4px', margin: 0, borderRadius: 4 }} color={barColor}>{project.status}</Tag>
                                                        {project.methodology && <Tag style={{ fontSize: 9, lineHeight: '14px', height: 16, padding: '0 4px', margin: 0, borderRadius: 4 }}>{project.methodology}</Tag>}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Epic labels when expanded */}
                                            {expandedProject === project.id && getEpics(project.id).map(epic => (
                                                <div key={epic.id} style={{ height: 32, display: 'flex', alignItems: 'center', paddingLeft: 22 }}>
                                                    <Text type="secondary" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{epic.title}</Text>
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* ── Bar Area ── */}
                            <div style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                                <RoadmapDropZone
                                    totalDays={totalDays}
                                    onRescheduleProject={handleRescheduleProject}
                                    onRescheduleEpic={handleRescheduleEpic}
                                    minWidth={zoom === 'Year' ? 900 : zoom === 'Month' ? 400 : 600}
                                    isDark={isDark}
                                >
                                    {/* Month Headers Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${monthColumns.length}, 1fr)`,
                                        height: 36,
                                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                        marginBottom: 4,
                                    }}>
                                        {monthColumns.map((col, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                                                paddingBottom: 6, fontSize: 11, fontWeight: 600,
                                                color: isDark ? '#94a3b8' : '#64748b',
                                                borderRight: i < monthColumns.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                                            }}>
                                                {col.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Today Line */}
                                    {todayPct > 0 && todayPct < 100 && (
                                        <div style={{
                                            position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                            width: 2, background: 'linear-gradient(to bottom, #ef4444, transparent)',
                                            zIndex: 10, opacity: 0.7, pointerEvents: 'none',
                                        }}>
                                            <div style={{
                                                position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                                                fontSize: 9, fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap',
                                                background: isDark ? '#0f0f17' : '#fff', padding: '1px 4px', borderRadius: 3,
                                            }}>TODAY</div>
                                        </div>
                                    )}

                                    {/* Month Grid Lines */}
                                    {monthColumns.map((_, i) => {
                                        const pct = (i / monthColumns.length) * 100;
                                        return i > 0 ? <div key={`grid-${i}`} style={{
                                            position: 'absolute', left: `${pct}%`, top: 36, bottom: 0,
                                            width: 1, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', zIndex: 0,
                                        }} /> : null;
                                    })}

                                    {/* Project Bars + Milestones + Epics */}
                                    {filteredProjects.map(project => {
                                        const { leftPct, widthPct } = calcBarPosition(project.startDate, project.endDate);
                                        const barColor = project.status === 'active' ? themeColor : (STATUS_BAR_COLOR[project.status] || '#6b7280');
                                        const tc = tasksByProject.get(project.id) || { total: 0, done: 0 };
                                        const taskPct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
                                        const projMilestones = getProjectMilestones(project.id);

                                        return (
                                            <React.Fragment key={project.id}>
                                                {/* Project bar row */}
                                                <div style={{ position: 'relative', height: 44 }}>
                                                    <DraggableProjectBar
                                                        project={project}
                                                        leftPct={leftPct}
                                                        widthPct={widthPct}
                                                        barColor={barColor}
                                                        taskPct={taskPct}
                                                        isDark={isDark}
                                                        themeColor={themeColor}
                                                        onExpand={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                                                        isExpanded={expandedProject === project.id}
                                                    />

                                                    {/* Milestone diamonds (non-draggable) */}
                                                    {projMilestones.map(ms => {
                                                        const msDay = dayjs(ms.targetDate);
                                                        const msPct = (msDay.diff(timelineRange.start, 'day') / totalDays) * 100;
                                                        if (msPct < 0 || msPct > 100) return null;
                                                        const msStatus = ms.status === 'completed' ? 'completed' : msDay.isBefore(dayjs()) ? 'overdue' : 'pending';
                                                        const msColor = MILESTONE_COLOR[msStatus] || '#f59e0b';
                                                        return (
                                                            <Tooltip key={ms.id} title={<div><div style={{ fontWeight: 600 }}>{ms.name}</div><div>{msDay.format('MMM D, YYYY')}</div><Tag color={msColor} style={{ marginTop: 4 }}>{msStatus}</Tag></div>}>
                                                                <div style={{
                                                                    position: 'absolute', left: `${msPct}%`, top: 6,
                                                                    width: 12, height: 12, transform: 'translateX(-50%) rotate(45deg)',
                                                                    background: msColor, border: `2px solid ${isDark ? '#0f0f17' : '#fff'}`,
                                                                    zIndex: 8, cursor: 'pointer', boxShadow: `0 2px 8px ${msColor}66`,
                                                                    transition: 'all 0.2s ease',
                                                                }} className="hover:scale-125 hover:shadow-lg hover:z-10" />
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </div>

                                                {/* Expanded epic rows (draggable) */}
                                                {expandedProject === project.id && getEpics(project.id).map(epic => {
                                                    const epicStart = epic.startDate || project.startDate;
                                                    const epicEnd = epic.dueDate || project.endDate;
                                                    const { leftPct: ePct, widthPct: eW } = calcBarPosition(epicStart, epicEnd);
                                                    const epicColor = PRIORITY_COLOR[epic.priority] || '#3b82f6';
                                                    return (
                                                        <div key={epic.id} style={{ position: 'relative', height: 32 }}>
                                                            <DraggableEpicBar
                                                                epic={epic}
                                                                ePct={ePct}
                                                                eW={eW}
                                                                epicColor={epicColor}
                                                                projectStartDate={project.startDate}
                                                                projectEndDate={project.endDate}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </RoadmapDropZone>
                            </div>
                        </div>
                    )}
                </Card>

                {/* ── Legend ── */}
                <Card style={{ ...glassCard, marginTop: 16 }} size="small">
                    <Space size={16} wrap>
                        <Text strong style={{ fontSize: 12 }}>Legend:</Text>
                        {[
                            { label: 'Active', color: themeColor },
                            { label: 'Completed', color: '#22c55e' },
                            { label: 'Planning', color: '#6b7280' },
                            { label: 'On Hold', color: '#f59e0b' },
                        ].map(s => (
                            <Space key={s.label} size={4}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(135deg, ${s.color}cc, ${s.color}88)` }} />
                                <Text style={{ fontSize: 11 }}>{s.label}</Text>
                            </Space>
                        ))}
                        <Space size={4}>
                            <div style={{ width: 10, height: 10, transform: 'rotate(45deg)', background: '#f59e0b', borderRadius: 1 }} />
                            <Text style={{ fontSize: 11 }}>Milestone</Text>
                        </Space>
                        <Space size={4}>
                            <div style={{ width: 2, height: 12, background: '#ef4444', borderRadius: 1 }} />
                            <Text style={{ fontSize: 11, color: '#ef4444' }}>Today</Text>
                        </Space>
                        <Space size={4}>
                            <DragOutlined style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }} />
                            <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>Drag bars to reschedule</Text>
                        </Space>
                    </Space>
                </Card>
            </DndProvider>
        </CMSLayout>
    );
}

