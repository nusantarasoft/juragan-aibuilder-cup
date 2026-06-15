"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import RbacGuard from "@/components/common/RbacGuard";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { Badge, Button, Card, Col, Empty, Input, message, Popover, Progress, Row, Segmented, Select, Space, Spin, Statistic, Tag, Tooltip, Typography } from "antd";
import {
    CalendarOutlined, ProjectOutlined, CheckCircleOutlined,
    ClockCircleOutlined, FlagOutlined, ExclamationCircleOutlined,
    AimOutlined, ThunderboltOutlined, FieldTimeOutlined, FileExcelOutlined,
    FilePdfOutlined, ZoomInOutlined, UndoOutlined, DragOutlined,
    SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const { Text, Title } = Typography;

const GET_PROJECTS = `
  query GetProjects($tenantId: String!) {
    pmProjects(tenantId: $tenantId) {
      id name projectNumber status priority startDate endDate budget spent
    }
  }
`;

const GET_PORTFOLIO = `
  query GetPortfolioSummary($tenantId: String!) {
    pmPortfolioSummary(tenantId: $tenantId)
  }
`;

const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdatePmProjectInput!) {
    updatePmProject(id: $id, input: $input) {
      id name status startDate endDate
    }
  }
`;

const STATUS_COLOR: Record<string, string> = {
    active: '#10b981',
    planning: '#6366f1',
    paused: '#f59e0b',
    completed: '#22c55e',
    cancelled: '#ef4444',
};

const PRIORITY_COLOR: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
};

const ZOOM_MONTHS: Record<string, number> = { '3M': 3, '6M': 6, '1Y': 12, 'All': 0 };

const TIMELINE_BAR_TYPE = 'TIMELINE_BAR';

interface TimelineDragItem {
    projectId: string;
    startDate: string;
    endDate: string;
}

// ── DraggableBar Component ──
function DraggableBar({
    project,
    startPct,
    widthPct,
    barColor,
    isOverdue,
    taskPct,
    daysRemaining,
    isDark,
    themeColor,
    timelineRange,
    onNavigate,
}: {
    project: any;
    startPct: number;
    widthPct: number;
    barColor: string;
    isOverdue: boolean;
    taskPct: number;
    daysRemaining: number;
    isDark: boolean;
    themeColor: string;
    timelineRange: { start: dayjs.Dayjs; end: dayjs.Dayjs; totalDays: number };
    onNavigate: () => void;
}): React.ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const pStart = dayjs(project.startDate);
    const pEnd = dayjs(project.endDate);
    const tc = project.taskCounts;

    const [{ isDragging }, drag] = useDrag<TimelineDragItem, void, { isDragging: boolean }>(() => ({
        type: TIMELINE_BAR_TYPE,
        item: { projectId: project.id, startDate: project.startDate, endDate: project.endDate },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [project.id, project.startDate, project.endDate]);

    drag(ref);

    const popoverContent = (
        <div style={{ width: 260, fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{project.name}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <Tag color={barColor} style={{ margin: 0 }}>{project.status}</Tag>
                <Tag color={PRIORITY_COLOR[project.priority] || '#6b7280'} style={{ margin: 0 }}>{project.priority}</Tag>
            </div>
            <div style={{ color: isDark ? '#94a3b8' : '#64748b', marginBottom: 6 }}>
                <CalendarOutlined /> {pStart.format('MMM D, YYYY')} — {pEnd.format('MMM D, YYYY')}
            </div>
            <Progress percent={taskPct} size="small" strokeColor={barColor} style={{ marginBottom: 6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Tasks: {tc.done}/{tc.total}</span>
                <span>{tc.inProgress} in progress</span>
            </div>
            {isOverdue
                ? <div style={{ color: '#ef4444', fontWeight: 600 }}>⚠ Overdue by {Math.abs(daysRemaining)} days</div>
                : project.status !== 'completed' && <div style={{ color: themeColor }}>{daysRemaining} days remaining</div>
            }
            <div style={{ marginTop: 8, color: isDark ? '#94a3b8' : '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <DragOutlined /> Drag to reschedule
            </div>
        </div>
    );

    return (
        <div key={project.id} style={{ position: 'relative', height: 44, marginBottom: 4 }}>
            <Popover content={popoverContent} placement="right" mouseEnterDelay={0.3}>
                <div
                    ref={ref}
                    style={{
                        position: 'absolute',
                        left: `${startPct}%`,
                        width: `${Math.min(widthPct, 100 - startPct)}%`,
                        height: 24, top: 10,
                        borderRadius: 6, cursor: isDragging ? 'grabbing' : 'grab',
                        background: `linear-gradient(135deg, ${barColor}cc, ${barColor}88)`,
                        border: isOverdue ? '2px solid #ef4444' : `1px solid ${barColor}`,
                        display: 'flex', alignItems: 'center', paddingLeft: 8, overflow: 'hidden',
                        transition: isDragging ? 'none' : 'all 0.2s ease',
                        boxShadow: isDragging ? `0 4px 16px ${barColor}44` : `0 2px 8px ${barColor}22`,
                        opacity: isDragging ? 0.5 : 1,
                        zIndex: isDragging ? 20 : 1,
                    }}
                    onClick={(e) => {
                        if (!isDragging) {
                            onNavigate();
                        }
                    }}
                    onMouseEnter={e => {
                        if (!isDragging) {
                            const el = e.currentTarget;
                            el.style.filter = 'brightness(1.2)';
                            el.style.transform = 'scaleY(1.15)';
                            el.style.zIndex = '5';
                        }
                    }}
                    onMouseLeave={e => {
                        if (!isDragging) {
                            const el = e.currentTarget;
                            el.style.filter = 'brightness(1)';
                            el.style.transform = 'scaleY(1)';
                            el.style.zIndex = '1';
                        }
                    }}
                >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${taskPct}%`, background: `${barColor}44`, borderRadius: '6px 0 0 6px' }} />
                    <Text style={{ fontSize: 10, fontWeight: 600, color: '#fff', position: 'relative', zIndex: 2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{taskPct}%</Text>
                    <Tag style={{ fontSize: 9, marginLeft: 4, position: 'relative', zIndex: 2, lineHeight: '14px', height: 16, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{project.status}</Tag>
                </div>
            </Popover>
        </div>
    );
}

// ── TimelineDropZone Component ──
function TimelineDropZone({
    children,
    timelineRange,
    onReschedule,
    minBarWidth,
    isDark,
}: {
    children: React.ReactNode;
    timelineRange: { start: dayjs.Dayjs; end: dayjs.Dayjs; totalDays: number };
    onReschedule: (projectId: string, newStartDate: string, newEndDate: string, oldStartDate: string, oldEndDate: string) => void;
    minBarWidth: number | undefined;
    isDark: boolean;
}): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);

    const [{ isOver }, drop] = useDrop<TimelineDragItem, void, { isOver: boolean }>(() => ({
        accept: TIMELINE_BAR_TYPE,
        drop: (item, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            if (!delta || !containerRef.current) return;

            const containerWidth = containerRef.current.getBoundingClientRect().width;
            const deltaDays = Math.round((delta.x / containerWidth) * timelineRange.totalDays);

            if (deltaDays === 0) return;

            const newStart = dayjs(item.startDate).add(deltaDays, 'day').format('YYYY-MM-DD');
            const newEnd = dayjs(item.endDate).add(deltaDays, 'day').format('YYYY-MM-DD');

            onReschedule(item.projectId, newStart, newEnd, item.startDate, item.endDate);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }), [timelineRange.totalDays, onReschedule]);

    // Combine refs
    const setRef = useCallback((node: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        drop(node);
    }, [drop]);

    return (
        <div
            ref={setRef}
            style={{
                position: 'relative',
                minWidth: minBarWidth,
                outline: isOver ? `2px dashed ${isDark ? 'rgba(139,92,246,0.4)' : 'rgba(99,102,241,0.3)'}` : 'none',
                outlineOffset: -2,
                borderRadius: 8,
                transition: 'outline 0.2s ease',
            }}
        >
            {children}
        </div>
    );
}

export default function TimelinePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [portfolio, setPortfolio] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [zoom, setZoom] = useState<string>('All');
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [projData, portData] = await Promise.all([
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_PORTFOLIO, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setProjects(projData.pmProjects || []);
            setPortfolio(portData.pmPortfolioSummary || []);
        } catch (err: any) {
            messageApi.error("Failed to load timeline data: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const enrichedProjects = useMemo(() => {
        const portMap = new Map<string, any>();
        portfolio.forEach(p => portMap.set(p.id, p));
        return projects
            .filter(p => p.startDate && p.endDate)
            .filter(p => !statusFilter || p.status === statusFilter)
            .filter(p => !priorityFilter || p.priority === priorityFilter)
            .filter(p => !searchQuery.trim() || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.projectNumber?.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix())
            .map(p => ({
                ...p,
                taskCounts: portMap.get(p.id)?.taskCounts || { total: 0, done: 0, inProgress: 0 },
            }));
    }, [projects, portfolio, statusFilter, priorityFilter, searchQuery]);

    const timelineRange = useMemo(() => {
        if (enrichedProjects.length === 0) return { start: dayjs(), end: dayjs().add(6, 'month'), totalDays: 180 };
        const dates = enrichedProjects.map(p => ({ start: dayjs(p.startDate), end: dayjs(p.endDate) }));
        const earliest = dates.reduce((min, d) => d.start.isBefore(min) ? d.start : min, dates[0].start);
        const latest = dates.reduce((max, d) => d.end.isAfter(max) ? d.end : max, dates[0].end);
        const zoomMonths = ZOOM_MONTHS[zoom];
        const start = zoomMonths ? dayjs().subtract(Math.floor(zoomMonths / 3), 'month') : earliest.subtract(7, 'day');
        const end = zoomMonths ? dayjs().add(zoomMonths - Math.floor(zoomMonths / 3), 'month') : latest.add(7, 'day');
        return { start, end, totalDays: Math.max(1, end.diff(start, 'day')) };
    }, [enrichedProjects, zoom]);

    const monthMarkers = useMemo(() => {
        const markers: { label: string; leftPct: number }[] = [];
        let cursor = timelineRange.start.startOf('month');
        while (cursor.isBefore(timelineRange.end)) {
            const dayOffset = cursor.diff(timelineRange.start, 'day');
            const pct = timelineRange.totalDays > 0 ? (dayOffset / timelineRange.totalDays) * 100 : 0;
            if (pct >= 0 && pct <= 100) markers.push({ label: cursor.format('MMM YYYY'), leftPct: pct });
            cursor = cursor.add(1, 'month');
        }
        return markers;
    }, [timelineRange]);

    const todayPct = useMemo(() => {
        const dayOffset = dayjs().diff(timelineRange.start, 'day');
        return timelineRange.totalDays > 0 ? Math.max(0, Math.min(100, (dayOffset / timelineRange.totalDays) * 100)) : 50;
    }, [timelineRange]);

    const withDates = projects.filter(p => p.startDate && p.endDate);
    const overdueProjects = withDates.filter(p => dayjs(p.endDate).isBefore(dayjs()) && p.status !== 'completed' && p.status !== 'cancelled');
    const activeProjects = projects.filter(p => p.status === 'active');
    const upcomingMilestones = withDates.filter(p => {
        const e = dayjs(p.endDate);
        return e.isAfter(dayjs()) && e.diff(dayjs(), 'day') <= 30 && p.status !== 'completed';
    });

    // ── Drag-to-Reschedule handler ──
    const handleReschedule = useCallback(async (
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

        const undoKey = `undo-${projectId}-${Date.now()}`;

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
            // Rollback on failure
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, startDate: oldStartDate, endDate: oldEndDate } : p
            ));
            messageApi.error(`Failed to reschedule: ${err.message}`);
        }
    }, [projects, messageApi]);

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    const minBarWidth = zoom === '3M' ? 1200 : zoom === '6M' ? 900 : zoom === '1Y' ? 800 : undefined;

    const exportCols = [{ header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Start', key: 'startDate' }, { header: 'End', key: 'endDate' }, { header: 'Progress', key: 'progress' }];
    const exportArgs = { fileName: 'pm_timeline', title: 'PM Timeline', dateRange: { start: startDate, end: endDate }, columns: exportCols, data: projects };

    const headerExtra = [<RbacGuard key="exp" requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel(exportArgs)} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf(exportArgs)} /></Tooltip></RbacGuard>];

    if (loading) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Timeline</AuroraText>}
                subTitle={<DecryptedText text="Cross-project Gantt-style timeline view" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={headerExtra}>
                <div style={{ textAlign: 'center', padding: 120 }}><Spin size="large" /></div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Timeline</AuroraText>}
            subTitle={<DecryptedText text="Cross-project Gantt-style timeline view" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={headerExtra}>
            {contextHolder}

            <DndProvider backend={HTML5Backend}>
                {/* ── Stats ── */}
                <BentoGrid className="max-w-full mb-6">
                    {[
                        { label: 'Projects with Timeline', value: withDates.length, suffix: true, icon: <CalendarOutlined />, color: themeColor },
                        { label: 'Active Projects', value: activeProjects.length, icon: <ClockCircleOutlined />, color: '#10b981' },
                        { label: 'Overdue', value: overdueProjects.length, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
                        { label: 'Due in 30 Days', value: upcomingMilestones.length, icon: <FlagOutlined />, color: '#f59e0b' },
                    ].map((s, i) => (
                        <BentoGridItem
                            key={i}
                            title={s.label}
                            description="Timeline metric"
                            icon={React.cloneElement(s.icon as React.ReactElement, { style: { color: s.color } })}
                            header={
                                <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>
                                        {s.value}
                                    </div>
                                    {s.suffix && projects.length > 0 && (
                                        <div className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                                            {Math.round((withDates.length / projects.length) * 100)}% of total
                                        </div>
                                    )}
                                </div>
                            }
                            className="col-span-4 lg:col-span-1"
                        />
                    ))}
                </BentoGrid>

                {/* ── Filters & Zoom ── */}
                <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Space size={12} wrap>
                            <Input
                                prefix={<SearchOutlined style={{ color: isDark ? '#64748b' : '#94a3b8' }} />}
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                                style={{ width: 180, borderRadius: 8 }}
                            />
                            <Select placeholder="Filter by status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}
                                options={[{ label: 'Active', value: 'active' }, { label: 'Planning', value: 'planning' }, { label: 'Paused', value: 'paused' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' }]} />
                            <Select placeholder="Filter by priority" allowClear value={priorityFilter} onChange={setPriorityFilter} style={{ width: 160 }}
                                options={[{ label: '🔴 Critical', value: 'critical' }, { label: '🟡 High', value: 'high' }, { label: '🔵 Medium', value: 'medium' }, { label: '⚪ Low', value: 'low' }]} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Showing {enrichedProjects.length} project{enrichedProjects.length !== 1 ? 's' : ''} with timeline data
                            </Text>
                        </Space>
                        <Space size={8}>
                            <Tooltip title="Refresh timeline">
                                <Button icon={<ReloadOutlined />} size="small" onClick={loadData} />
                            </Tooltip>
                            <Tooltip title="Drag project bars horizontally to reschedule">
                                <Tag icon={<DragOutlined />} color="purple" style={{ fontSize: 11, cursor: 'help' }}>Drag to reschedule</Tag>
                            </Tooltip>
                            <ZoomInOutlined style={{ color: themeColor, fontSize: 14 }} />
                            <Segmented size="small" value={zoom} onChange={v => setZoom(v as string)} options={['3M', '6M', '1Y', 'All']} />
                        </Space>
                    </div>
                </Card>

                {/* ── Timeline Chart ── */}
                <Card
                    title={<Space><FieldTimeOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Project Timeline</span><Tag color="purple">{enrichedProjects.length}</Tag></Space>}
                    style={glassCard}
                >
                    {enrichedProjects.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <Card style={{ ...glassCard, padding: 60, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, margin: '16px 0' }}>
                                <CalendarOutlined style={{ fontSize: 64, color: isDark ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.4)', marginBottom: 24 }} />
                                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: isDark ? '#f8fafc' : '#0f172a' }}>No Timeline Data Available</div>
                                <Text type="secondary" style={{ display: 'block', maxWidth: 420, margin: '0 auto 24px', fontSize: 14 }}>
                                    Set start and end dates on your projects to visualize them here on the Gantt chart. You can also drag project bars to quickly reschedule.
                                </Text>
                                <Button type="primary" size="large" onClick={() => router.push('/admin/pm/projects')} style={{ borderRadius: 12, paddingLeft: 24, paddingRight: 24 }}>
                                    Manage Projects
                                </Button>
                            </Card>
                        </motion.div>
                    ) : (
                        <div style={{ display: 'flex', minHeight: 100 }}>
                            {/* ── Label Column ── */}
                            <div style={{ width: 212, flexShrink: 0 }}>
                                <div style={{ height: 32, marginBottom: 8 }} />
                                {enrichedProjects.map((project) => {
                                    const barColor = STATUS_COLOR[project.status] || '#6b7280';
                                    const isOverdue = dayjs().isAfter(dayjs(project.endDate)) && project.status !== 'completed' && project.status !== 'cancelled';
                                    return (
                                        <div key={project.id} style={{ height: 44, marginBottom: 4, display: 'flex', alignItems: 'center', paddingRight: 8, cursor: 'pointer' }}
                                            onClick={() => router.push(`/admin/pm/dashboard?projectId=${project.id}`)}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Badge color={barColor} style={{ minWidth: 8 }} />
                                                    <Text strong style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.name}>{project.name}</Text>
                                                    {isOverdue && <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 11 }} />}
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 10, marginLeft: 14 }}>{project.projectNumber}</Text>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Bar Area (scrollable, relative container) ── */}
                            <div style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                                <TimelineDropZone
                                    timelineRange={timelineRange}
                                    onReschedule={handleReschedule}
                                    minBarWidth={minBarWidth}
                                    isDark={isDark}
                                >
                                    {/* Month Headers */}
                                    <div style={{ position: 'relative', height: 32, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, marginBottom: 8 }}>
                                        {monthMarkers.map((m, i) => (
                                            <div key={i} style={{ position: 'absolute', left: `${m.leftPct}%`, bottom: 4, fontSize: 10, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                                                {m.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Today Line — pure percentage inside bar area */}
                                    <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, #ef4444, transparent)', zIndex: 10, opacity: 0.7, pointerEvents: 'none' }}>
                                        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap', background: isDark ? '#0f0f17' : '#fff', padding: '1px 4px', borderRadius: 3 }}>
                                            TODAY
                                        </div>
                                    </div>

                                    {/* Milestone Markers */}
                                    {enrichedProjects.filter(p => {
                                        const daysUntilEnd = dayjs(p.endDate).diff(dayjs(), 'day');
                                        return daysUntilEnd >= 0 && daysUntilEnd <= 7 && p.status !== 'completed' && p.status !== 'cancelled';
                                    }).map(p => {
                                        const endPct = timelineRange.totalDays > 0 ? Math.max(0, Math.min(100, (dayjs(p.endDate).diff(timelineRange.start, 'day') / timelineRange.totalDays) * 100)) : 0;
                                        return (
                                            <div key={`ms-${p.id}`} style={{ position: 'absolute', left: `${endPct}%`, top: 32, bottom: 0, width: 0, zIndex: 8, pointerEvents: 'none' }}>
                                                <div style={{ position: 'absolute', top: 0, left: -4, width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', border: '2px solid #fff', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }} />
                                            </div>
                                        );
                                    })}

                                    {/* Month Grid Lines — pure percentage inside bar area */}
                                    {monthMarkers.map((m, i) => (
                                        <div key={`grid-${i}`} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 32, bottom: 0, width: 1, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', zIndex: 0 }} />
                                    ))}

                                    {/* Project Bars (Draggable) */}
                                    {enrichedProjects.map((project, idx) => {
                                        const pStart = dayjs(project.startDate);
                                        const pEnd = dayjs(project.endDate);
                                        const now = dayjs();
                                        const startPct = timelineRange.totalDays > 0 ? Math.max(0, (pStart.diff(timelineRange.start, 'day') / timelineRange.totalDays) * 100) : 0;
                                        const widthPct = timelineRange.totalDays > 0 ? Math.max(1, (pEnd.diff(pStart, 'day') / timelineRange.totalDays) * 100) : 5;
                                        const isOverdue = now.isAfter(pEnd) && project.status !== 'completed' && project.status !== 'cancelled';
                                        const tc = project.taskCounts;
                                        const taskPct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
                                        const barColor = STATUS_COLOR[project.status] || '#6b7280';
                                        const daysRemaining = pEnd.diff(now, 'day');

                                        return (
                                            <DraggableBar
                                                key={project.id}
                                                project={project}
                                                startPct={startPct}
                                                widthPct={widthPct}
                                                barColor={barColor}
                                                isOverdue={isOverdue}
                                                taskPct={taskPct}
                                                daysRemaining={daysRemaining}
                                                isDark={isDark}
                                                themeColor={themeColor}
                                                timelineRange={timelineRange}
                                                onNavigate={() => router.push(`/admin/pm/dashboard?projectId=${project.id}`)}
                                            />
                                        );
                                    })}
                                </TimelineDropZone>
                            </div>
                        </div>
                    )}
                </Card>

                <Card style={{ ...glassCard, marginTop: 16, padding: '12px 16px' }} size="small">
                    <Space size={20} wrap>
                        <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: themeColor }}>Legend</Text>
                        {Object.entries(STATUS_COLOR).map(([status, color]) => (
                            <Space key={status} size={6} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '4px 10px', borderRadius: 20 }}>
                                <div style={{ width: 14, height: 14, borderRadius: 4, background: `linear-gradient(135deg, ${color}dd, ${color}99)`, boxShadow: `0 2px 6px ${color}44` }} />
                                <Text style={{ fontSize: 12, textTransform: 'capitalize', fontWeight: 500 }}>{status}</Text>
                            </Space>
                        ))}
                        <Space size={6} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '4px 10px', borderRadius: 20 }}>
                            <div style={{ width: 3, height: 14, background: '#ef4444', borderRadius: 2, boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
                            <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Today</Text>
                        </Space>
                        <Space size={6} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '4px 10px', borderRadius: 20 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid #fff', boxShadow: '0 0 6px rgba(245,158,11,0.6)' }} />
                            <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>Due this week</Text>
                        </Space>
                        <Space size={6}>
                            <DragOutlined style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }} />
                            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic' }}>Drag bars to reschedule</Text>
                        </Space>
                    </Space>
                </Card>
            </DndProvider>
        </CMSLayout>
    );
}

