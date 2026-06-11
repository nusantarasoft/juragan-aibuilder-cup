"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion, AnimatePresence } from "framer-motion";
import RbacGuard from "@/components/common/RbacGuard";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Badge, Button, Card, Col, DatePicker, Empty, Input, InputNumber, message, Modal, Progress, Row, Segmented, Select, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import {
    UnorderedListOutlined, SearchOutlined, FilterOutlined,
    ProjectOutlined, ClockCircleOutlined, CheckCircleOutlined,
    ExclamationCircleOutlined, UserOutlined, FireOutlined,
    ThunderboltOutlined, CalendarOutlined, DashboardOutlined,
    ArrowUpOutlined, MinusOutlined, ArrowDownOutlined, FileExcelOutlined, FilePdfOutlined,
    ReloadOutlined, AppstoreOutlined, EditOutlined, CloseOutlined, SaveOutlined, PlusOutlined, EyeOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import KanbanBoard from "../components/KanbanBoard";

const { Text } = Typography;

const GET_ALL_TASKS = `
  query GetAllTasks($tenantId: String!) {
    pmTasks(tenantId: $tenantId) {
      id
      projectId
      sprintId
      title
      description
      status
      priority
      type
      assigneeId
      assignee { id firstName lastName }
      estimatedHours
      loggedHours
      startDate
      dueDate
      tags
      createdAt
    }
  }
`;

const GET_PROJECTS = `
  query GetProjects($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
  }
`;

const UPDATE_TASK = `
  mutation UpdateTask($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) { id status priority type title }
  }
`;

const GET_MEMBERS = `
  query GetMembers($tenantId: String!) {
    pmMembers(tenantId: $tenantId) { id userId user { id firstName lastName email } role }
  }
`;

const CREATE_TASK = `
  mutation CreateTask($tenantId: String!, $input: CreatePmTaskInput!) {
    createPmTask(tenantId: $tenantId, input: $input) { id title status }
  }
`;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    todo: { color: '#64748b', icon: <UnorderedListOutlined />, label: 'To Do' },
    in_progress: { color: '#3b82f6', icon: <ClockCircleOutlined />, label: 'In Progress' },
    in_review: { color: 'var(--theme-color, #8b5cf6)', icon: <ThunderboltOutlined />, label: 'In Review' },
    done: { color: '#10b981', icon: <CheckCircleOutlined />, label: 'Done' },
    blocked: { color: '#ef4444', icon: <ExclamationCircleOutlined />, label: 'Blocked' },
};

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    critical: { color: '#ef4444', icon: <FireOutlined /> },
    high: { color: '#f59e0b', icon: <ArrowUpOutlined /> },
    medium: { color: '#3b82f6', icon: <MinusOutlined /> },
    low: { color: '#6b7280', icon: <ArrowDownOutlined /> },
};

export default function BacklogPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
    const [projectFilter, setProjectFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
    const [sprintFilter, setSprintFilter] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    // ── New interactive state ──
    const [messageApi, contextHolder] = message.useMessage();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [viewMode, setViewMode] = useState<string>('table');

    // ── Quick-create state ──
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickProject, setQuickProject] = useState<string | null>(null);
    const [quickType, setQuickType] = useState('task');
    const [quickPriority, setQuickPriority] = useState('medium');
    const [quickCreating, setQuickCreating] = useState(false);

    // ── Saved Views ──
    const [savedViews, setSavedViews] = useState<{ name: string; filters: any }[]>([]);
    const [saveViewModalOpen, setSaveViewModalOpen] = useState(false);
    const [newViewName, setNewViewName] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [taskData, projData, memberData] = await Promise.all([
                gql(GET_ALL_TASKS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_MEMBERS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({ pmMembers: [] })),
            ]);
            setTasks(taskData.pmTasks || []);
            setProjects(projData.pmProjects || []);
            setMembers(memberData.pmMembers || []);
        } catch (err: any) {
            messageApi.error("Failed to load backlog data: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Load saved views from localStorage ──
    useEffect(() => {
        const saved = localStorage.getItem('nusantarasoft-pm-saved-views');
        if (saved) setSavedViews(JSON.parse(saved));
    }, []);

    const handleSaveView = () => {
        if (!newViewName.trim()) return;
        const view = {
            name: newViewName.trim(),
            filters: { search, statusFilter, priorityFilter, projectFilter, typeFilter, assigneeFilter, sprintFilter, viewMode },
        };
        const updated = [...savedViews.filter(v => v.name !== view.name), view];
        setSavedViews(updated);
        localStorage.setItem('nusantarasoft-pm-saved-views', JSON.stringify(updated));
        setSaveViewModalOpen(false);
        setNewViewName('');
        messageApi.success(`View "${view.name}" saved`);
    };

    const handleLoadView = (view: any) => {
        setSearch(view.filters.search || '');
        setStatusFilter(view.filters.statusFilter || null);
        setPriorityFilter(view.filters.priorityFilter || null);
        setProjectFilter(view.filters.projectFilter || null);
        setTypeFilter(view.filters.typeFilter || null);
        setAssigneeFilter(view.filters.assigneeFilter || null);
        setSprintFilter(view.filters.sprintFilter || null);
        if (view.filters.viewMode) setViewMode(view.filters.viewMode);
        messageApi.info(`Loaded view "${view.name}"`);
    };

    const handleDeleteView = (name: string) => {
        const updated = savedViews.filter(v => v.name !== name);
        setSavedViews(updated);
        localStorage.setItem('nusantarasoft-pm-saved-views', JSON.stringify(updated));
        messageApi.success(`View deleted`);
    };

    // ── Project map ──
    const projectMap = useMemo(() => {
        const m = new Map<string, any>();
        projects.forEach(p => m.set(p.id, p));
        return m;
    }, [projects]);

    // ── Filters ──
    const filtered = useMemo(() => {
        let result = [...tasks];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(t =>
                (t.title || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q) ||
                (t.tags || []).some((tag: string) => tag.toLowerCase().includes(q))
            );
        }
        if (statusFilter) result = result.filter(t => t.status === statusFilter);
        if (priorityFilter) result = result.filter(t => t.priority === priorityFilter);
        if (projectFilter) result = result.filter(t => t.projectId === projectFilter);
        if (typeFilter) result = result.filter(t => t.type === typeFilter);
        if (assigneeFilter) {
            if (assigneeFilter === '__unassigned__') result = result.filter(t => !t.assigneeId);
            else result = result.filter(t => t.assigneeId === assigneeFilter || t.assignee?.id === assigneeFilter || t.assignee?.userId === assigneeFilter);
        }
        if (sprintFilter) {
            if (sprintFilter === 'assigned') result = result.filter(t => t.sprintId);
            else result = result.filter(t => !t.sprintId);
        }
        return result;
    }, [tasks, search, statusFilter, priorityFilter, projectFilter, typeFilter, assigneeFilter, sprintFilter]);

    // ── Computed stats ──
    const totalTasks = tasks.length;
    const todoCount = tasks.filter(t => t.status === 'todo').length;
    const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
    const inReviewCount = tasks.filter(t => t.status === 'in_review').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const blockedCount = tasks.filter(t => t.status === 'blocked').length;
    const overdueCount = tasks.filter(t => t.dueDate && dayjs(t.dueDate).isBefore(dayjs()) && t.status !== 'done').length;
    const unassignedCount = tasks.filter(t => !t.assigneeId).length;
    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    // ── Inline update handler ──
    const handleInlineUpdate = async (id: string, field: string, value: string) => {
        try {
            const parsedValue = field === 'estimatedHours' ? parseFloat(value) || 0 : value;
            await gql(UPDATE_TASK, { id, input: { [field]: parsedValue } });
            messageApi.success(`Task ${field === 'estimatedHours' ? 'hours' : field === 'assigneeId' ? 'assignee' : field} updated`);
            loadData();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error(`Failed to update ${field}`); }
    };

    // ── Quick-create handler ──
    const handleQuickCreate = async () => {
        if (!quickTitle.trim() || !quickProject) {
            messageApi.warning('Task title and project are required');
            return;
        }
        setQuickCreating(true);
        try {
            await gql(CREATE_TASK, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    projectId: quickProject,
                    title: quickTitle.trim(),
                    type: quickType,
                    priority: quickPriority,
                    status: 'todo',
                },
            });
            messageApi.success(`Task "${quickTitle.trim()}" created`);
            setQuickTitle('');
            loadData();
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error('Failed to create task');
        } finally {
            setQuickCreating(false);
        }
    };

    // ── Bulk action handler ──
    const handleBulkUpdate = async (field: string, value: string) => {
        if (selectedRowKeys.length === 0) return;
        try {
            await Promise.all(selectedRowKeys.map(id => gql(UPDATE_TASK, { id, input: { [field]: value } })));
            messageApi.success(`Updated ${selectedRowKeys.length} tasks`);
            setSelectedRowKeys([]);
            loadData();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error('Bulk update failed'); }
    };

    // ── Kanban task update handler ──
    const handleKanbanUpdate = async (taskId: string, updates: Record<string, any>) => {
        try {
            await gql(UPDATE_TASK, { id: taskId, input: updates });
            messageApi.success('Task updated');
            loadData();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error('Failed to update task'); }
    };

    const columns = [
        {
            title: 'Task',
            dataIndex: 'title',
            key: 'title',
            render: (_: any, record: any) => {
                const proj = projectMap.get(record.projectId);
                return (
                    <div>
                        <Tooltip title={record.description ? <div style={{ maxWidth: 300, fontSize: 11 }}>{record.description.slice(0, 200)}{record.description.length > 200 ? '...' : ''}</div> : 'No description'} placement="topLeft">
                            <a onClick={(e) => { e.stopPropagation(); router.push(`/admin/pm/tasks/${record.id}`); }} style={{ fontWeight: 600, fontSize: 14 }}>
                                {record.title}
                            </a>
                        </Tooltip>
                        <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#888', marginTop: 2 }}>
                            {proj && (
                                <Tag
                                    icon={<ProjectOutlined />}
                                    color="geekblue"
                                    style={{ fontSize: 10, cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/admin/pm/dashboard?projectId=${record.projectId}`);
                                    }}
                                >
                                    {proj.name}
                                </Tag>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status: string, record: any) => (
                <Select size="small" value={status} style={{ width: 130 }} variant="borderless"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(val) => handleInlineUpdate(record.id, 'status', val)}
                    options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                        label: <Tag color={v.color} icon={v.icon} style={{ margin: 0 }}>{v.label}</Tag>, value: k,
                    }))}
                />
            ),
            filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
            onFilter: (value: any, record: any) => record.status === value,
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 120,
            render: (priority: string, record: any) => (
                <Select size="small" value={priority} style={{ width: 110 }} variant="borderless"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(val) => handleInlineUpdate(record.id, 'priority', val)}
                    options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({
                        label: <Tag color={v.color} icon={v.icon} style={{ margin: 0, textTransform: 'capitalize' as const }}>{k}</Tag>, value: k,
                    }))}
                />
            ),
            sorter: (a: any, b: any) => {
                const order: Record<string,number> = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
            },
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string, record: any) => (
                <Select size="small" value={type} style={{ width: 90 }} variant="borderless"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(val) => handleInlineUpdate(record.id, 'type', val)}
                    options={['task', 'bug', 'story', 'epic'].map(t => ({
                        label: <Tag color={t === 'bug' ? 'red' : t === 'story' ? 'green' : t === 'epic' ? 'purple' : 'default'} style={{ margin: 0, textTransform: 'capitalize' as const }}>{t}</Tag>,
                        value: t,
                    }))}
                />
            ),
        },
        {
            title: 'Assignee',
            key: 'assignee',
            width: 150,
            render: (_: any, record: any) => (
                <Select
                    size="small"
                    value={record.assigneeId || undefined}
                    placeholder="Unassigned"
                    style={{ width: 140 }}
                    variant="borderless"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(val) => handleInlineUpdate(record.id, 'assigneeId', val || '')}
                    options={members.map(m => ({
                        value: m.userId || m.user?.id || m.id,
                        label: m.user ? `${m.user.firstName} ${m.user.lastName}` : m.id,
                    }))}
                />
            ),
        },
        {
            title: 'Hours',
            key: 'hours',
            width: 110,
            render: (_: any, record: any) => {
                const est = record.estimatedHours || 0;
                const log = record.loggedHours || 0;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <InputNumber
                            size="small"
                            min={0}
                            max={999}
                            step={0.5}
                            value={est}
                            style={{ width: 55, fontSize: 11 }}
                            variant="borderless"
                            onChange={(val) => {
                                if (val !== null && val !== est) handleInlineUpdate(record.id, 'estimatedHours', String(val));
                            }}
                        />
                        {est > 0 && (
                            <Tooltip title={`${log}h logged / ${est}h estimated`}>
                                <Progress
                                    percent={est > 0 ? Math.min(100, Math.round((log / est) * 100)) : 0}
                                    size="small"
                                    strokeColor={log > est ? '#ef4444' : log > est * 0.8 ? '#f59e0b' : '#10b981'}
                                    trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                    format={() => `${log}h`}
                                    style={{ width: 40 }}
                                />
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            width: 140,
            sorter: (a: any, b: any) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix();
            },
            render: (date: string, record: any) => {
                const isOverdue = date && dayjs(date).isBefore(dayjs()) && record.status !== 'done';
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <DatePicker
                            size="small"
                            value={date ? dayjs(date) : null}
                            variant="borderless"
                            format="MMM D"
                            style={{ width: 100 }}
                            onChange={(d) => handleInlineUpdate(record.id, 'dueDate', d ? d.format('YYYY-MM-DD') : '')}
                            status={isOverdue ? 'error' : undefined}
                            suffixIcon={isOverdue ? <Tag color="red" style={{ fontSize: 8, padding: '0 3px', margin: 0 }}>LATE</Tag> : <CalendarOutlined style={{ fontSize: 11 }} />}
                        />
                    </div>
                );
            },
        },
    ];



    // ── Row selection config ──
    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    };

    // ── Shared CMSLayout props ──
    const layoutExtra = [<Segmented key="view" aria-label="Switch view mode" options={[{ value: 'table', icon: <UnorderedListOutlined /> }, { value: 'board', icon: <AppstoreOutlined /> }]} value={viewMode} onChange={(v) => setViewMode(v as string)} />, <RbacGuard key="exports" requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button aria-label="Export to Excel" icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'pm_backlog', title: 'PM Backlog Tasks', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Status', key: 'status' }, { header: 'Priority', key: 'priority' }, { header: 'Project', key: 'projectName' }], data: tasks })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button aria-label="Export to PDF" icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'pm_backlog', title: 'PM Backlog Tasks', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Status', key: 'status' }, { header: 'Priority', key: 'priority' }, { header: 'Project', key: 'projectName' }], data: tasks })} /></Tooltip></RbacGuard>];

    if (loading) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Backlog</AuroraText>}
            subTitle={<DecryptedText text="All tasks across all projects" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={layoutExtra}>
                {contextHolder}
                <div style={{ textAlign: 'center', padding: 120 }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Backlog</AuroraText>}
            subTitle={<DecryptedText text="All tasks across all projects" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={layoutExtra}>
            {contextHolder}

            {/* ── Stats Row ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { title: 'Total Tasks', value: totalTasks, icon: <ProjectOutlined style={{ color: themeColor }} />, color: themeColor },
                    { title: 'To Do', value: todoCount, icon: <ClockCircleOutlined style={{ color: '#6366f1' }} />, color: '#6366f1' },
                    { title: 'In Progress', value: inProgressCount, icon: <ThunderboltOutlined style={{ color: '#3b82f6' }} />, color: '#3b82f6' },
                    { title: 'In Review', value: inReviewCount, icon: <EyeOutlined style={{ color: '#8b5cf6' }} />, color: '#8b5cf6' },
                    { title: 'Done', value: doneCount, icon: <CheckCircleOutlined style={{ color: '#10b981' }} />, color: '#10b981' },
                    { title: 'Overdue', value: overdueCount, icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />, color: '#ef4444' },
                ].map((s, i) => (
                    <Col key={i} xs={24} sm={12} lg={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card style={{ ...glassCard, borderTop: `3px solid ${s.color}` }} size="small">
                                <Statistic title={<span style={{ fontSize: 12 }}>{s.title}</span>} value={s.value} prefix={s.icon} valueStyle={{ fontSize: 24, fontWeight: 700, color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ── Effort Summary ── */}
            <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                <Row gutter={24} align="middle">
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>Total Effort: </Text>
                        <Text strong>{totalLogged}h</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}> / {totalEstimated}h estimated</Text>
                    </Col>
                    <Col flex={1} style={{ maxWidth: 300 }}>
                        <Progress
                            percent={totalEstimated > 0 ? Math.round((totalLogged / totalEstimated) * 100) : 0}
                            size="small"
                            strokeColor={{ '0%': 'var(--theme-color, #8b5cf6)', '100%': 'var(--theme-secondary, #6366f1)' }}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                        />
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {projects.length} projects • {blockedCount} blocked
                        </Text>
                    </Col>
                    <Col>
                        <Button type="text" size="small" icon={<ReloadOutlined />} onClick={loadData} aria-label="Reload data" />
                    </Col>
                </Row>
            </Card>

            {/* ── Search & Filters ── */}
            <Card style={{ ...glassCard, marginBottom: 16 }} size="small" role="region" aria-label="Task filters">
                <Space size={12} wrap style={{ width: '100%' }}>
                    <Input
                        placeholder="Search tasks, tags..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        style={{ width: 280 }}
                        aria-label="Search tasks"
                    />
                    <Select
                        placeholder="Status"
                        allowClear
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 160 }}
                        options={[
                            { label: `To Do (${tasks.filter(t => t.status === 'todo').length})`, value: 'todo' },
                            { label: `In Progress (${tasks.filter(t => t.status === 'in_progress').length})`, value: 'in_progress' },
                            { label: `In Review (${tasks.filter(t => t.status === 'in_review').length})`, value: 'in_review' },
                            { label: `Done (${tasks.filter(t => t.status === 'done').length})`, value: 'done' },
                            { label: `Blocked (${tasks.filter(t => t.status === 'blocked').length})`, value: 'blocked' },
                        ]}
                        aria-label="Status filter"
                    />
                    <Select
                        placeholder="Priority"
                        allowClear
                        value={priorityFilter}
                        onChange={setPriorityFilter}
                        style={{ width: 130 }}
                        options={['critical', 'high', 'medium', 'low'].map(p => ({
                            label: p.charAt(0).toUpperCase() + p.slice(1), value: p
                        }))}
                        aria-label="Priority filter"
                    />
                    <Select
                        placeholder="Project"
                        allowClear
                        value={projectFilter}
                        onChange={setProjectFilter}
                        style={{ width: 200 }}
                        options={projects.map(p => ({ label: p.name, value: p.id }))}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        aria-label="Project filter"
                    />
                    <Select
                        placeholder="Type"
                        allowClear
                        value={typeFilter}
                        onChange={setTypeFilter}
                        style={{ width: 120 }}
                        options={['task', 'bug', 'story', 'epic'].map(t => ({
                            label: t.charAt(0).toUpperCase() + t.slice(1), value: t
                        }))}
                        aria-label="Type filter"
                    />
                    <Select
                        placeholder="Assignee"
                        allowClear
                        value={assigneeFilter}
                        onChange={setAssigneeFilter}
                        style={{ width: 160 }}
                        showSearch
                        filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                        options={[
                            { label: 'Unassigned', value: '__unassigned__' },
                            ...members.map(m => ({
                                label: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || 'Unknown',
                                value: m.userId || m.user?.id || m.id,
                            })),
                        ]}
                        aria-label="Assignee filter"
                    />
                    <Select
                        placeholder="Sprint"
                        allowClear
                        value={sprintFilter}
                        onChange={setSprintFilter}
                        style={{ width: 140 }}
                        options={[
                            { label: 'Has Sprint', value: 'assigned' },
                            { label: 'No Sprint (Backlog)', value: 'unassigned' },
                        ]}
                        aria-label="Sprint filter"
                    />
                    {(search || statusFilter || priorityFilter || projectFilter || typeFilter || assigneeFilter || sprintFilter) && (
                        <Tag color="blue">{filtered.length} results</Tag>
                    )}
                </Space>

                {/* Saved Views Row */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Views:</Text>
                    {savedViews.map(view => (
                        <Tag
                            key={view.name}
                            closable
                            onClose={(e) => { e.preventDefault(); handleDeleteView(view.name); }}
                            onClick={() => handleLoadView(view)}
                            style={{ cursor: 'pointer', fontSize: 11, borderRadius: 6 }}
                            color="purple"
                        >
                            {view.name}
                        </Tag>
                    ))}
                    <Button
                        size="small"
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => setSaveViewModalOpen(true)}
                        style={{ fontSize: 11, borderRadius: 6 }}
                    >
                        Save Current
                    </Button>
                </div>
            </Card>

            {/* ── Bulk Actions Bar ── */}
            <AnimatePresence>
                {selectedRowKeys.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <Card size="small" style={{ ...glassCard, marginBottom: 16, borderLeft: `3px solid ${themeColor}` }}>
                            <Space size={12} wrap align="center">
                                <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px' }}>{selectedRowKeys.length} selected</Tag>
                                <Select placeholder="Set Status" size="small" style={{ width: 150 }}
                                    onChange={(val) => handleBulkUpdate('status', val)}
                                    options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))}
                                />
                                <Select placeholder="Set Priority" size="small" style={{ width: 140 }}
                                    onChange={(val) => handleBulkUpdate('priority', val)}
                                    options={['critical', 'high', 'medium', 'low'].map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))}
                                />
                                <Button size="small" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])}>Clear</Button>
                            </Space>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Tasks Table / Board ── */}
            <Card
                title={
                    <Space>
                        <UnorderedListOutlined style={{ color: themeColor }} />
                        <span style={{ fontWeight: 600 }}>All Tasks</span>
                        <Tag color="purple">{filtered.length}</Tag>
                    </Space>
                }
                extra={
                    <Button
                        type={quickCreateOpen ? 'default' : 'primary'}
                        size="small"
                        icon={quickCreateOpen ? <CloseOutlined /> : <PlusOutlined />}
                        onClick={() => setQuickCreateOpen(!quickCreateOpen)}
                        style={quickCreateOpen ? {} : {
                            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`,
                            border: 'none',
                            borderRadius: 8,
                        }}
                        aria-label={quickCreateOpen ? 'Close quick create' : 'Quick create task'}
                    >
                        {quickCreateOpen ? 'Cancel' : 'New Task'}
                    </Button>
                }
                style={glassCard}
                role="region"
                aria-label="Task list"
            >
                {/* Quick-Create Bar */}
                <AnimatePresence>
                    {quickCreateOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', marginBottom: 16 }}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                                padding: '16px',
                                background: isDark ? 'rgba(139,92,246,0.08)' : 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(139,92,246,0.02))',
                                border: isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.2)',
                                borderRadius: 12,
                                boxShadow: isDark ? '0 4px 20px rgba(139,92,246,0.1)' : '0 4px 20px rgba(139,92,246,0.05)',
                                transition: 'all 0.3s ease',
                            }} className="hover:border-[color:var(--theme-color)] hover:shadow-md">
                                <PlusOutlined style={{ color: themeColor, fontSize: 16 }} />
                                <Input
                                    placeholder="Task title... (press Enter to create)"
                                    value={quickTitle}
                                    onChange={e => setQuickTitle(e.target.value)}
                                    onPressEnter={handleQuickCreate}
                                    size="small"
                                    style={{ flex: 1, minWidth: 200, borderRadius: 8 }}
                                    autoFocus
                                    aria-label="New task title"
                                />
                                <Select
                                    size="small"
                                    placeholder="Project *"
                                    value={quickProject}
                                    onChange={setQuickProject}
                                    style={{ width: 160 }}
                                    showSearch
                                    optionFilterProp="label"
                                    options={projects.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.name }))}
                                    aria-label="Select project for new task"
                                />
                                <Select
                                    size="small"
                                    value={quickType}
                                    onChange={setQuickType}
                                    style={{ width: 90 }}
                                    options={['task', 'bug', 'story', 'epic'].map(t => ({
                                        label: <Tag color={t === 'bug' ? 'red' : t === 'story' ? 'green' : t === 'epic' ? 'purple' : 'default'} style={{ margin: 0, textTransform: 'capitalize' as const }}>{t}</Tag>,
                                        value: t,
                                    }))}
                                    aria-label="Task type"
                                />
                                <Select
                                    size="small"
                                    value={quickPriority}
                                    onChange={setQuickPriority}
                                    style={{ width: 110 }}
                                    options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({
                                        label: <Tag color={v.color} icon={v.icon} style={{ margin: 0, textTransform: 'capitalize' as const }}>{k}</Tag>,
                                        value: k,
                                    }))}
                                    aria-label="Task priority"
                                />
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={handleQuickCreate}
                                    loading={quickCreating}
                                    disabled={!quickTitle.trim() || !quickProject}
                                    style={{
                                        background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`,
                                        border: 'none',
                                        borderRadius: 8,
                                    }}
                                    aria-label="Create task"
                                >
                                    Create
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card style={{ ...glassCard, padding: 40, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, marginTop: 16 }}>
                            <Empty
                                description={
                                    <span style={{ fontSize: 16, fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b' }}>
                                        {tasks.length === 0
                                            ? "No tasks found across your projects."
                                            : "No tasks match your current filters."}
                                    </span>
                                }
                            />
                        </Card>
                    </motion.div>
                ) : viewMode === 'board' ? (
                    <KanbanBoard
                        tasks={filtered}
                        onTaskUpdate={handleKanbanUpdate}
                        onTaskClick={(task: any) => router.push(`/admin/pm/tasks/${task.id}`)}
                        themeColor={themeColor}
                        isDark={isDark}
                    />
                ) : (
                    <Table scroll={{ x: 900 }}
                        dataSource={filtered}
                        columns={columns}
                        rowKey="id"
                        rowSelection={rowSelection}
                        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} tasks` }}
                        size="small"
                        style={{ fontSize: 13 }}
                        onRow={(record) => ({
                            onClick: () => router.push(`/admin/pm/tasks/${record.id}`),
                            style: { cursor: 'pointer' },
                        })}
                    />
                )}
            </Card>


            {/* ── Save View Modal ── */}
            <Modal
                title="Save View"
                open={saveViewModalOpen}
                onCancel={() => setSaveViewModalOpen(false)}
                onOk={handleSaveView}
                okText="Save"
                okButtonProps={{ disabled: !newViewName.trim() }}
            >
                <Input
                    placeholder="View name (e.g. 'My High Priority Bugs')"
                    value={newViewName}
                    onChange={e => setNewViewName(e.target.value)}
                    onPressEnter={handleSaveView}
                    autoFocus
                />
            </Modal>

        </CMSLayout>
    );
}

