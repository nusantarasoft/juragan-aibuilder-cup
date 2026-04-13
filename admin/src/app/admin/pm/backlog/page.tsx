"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Typography, Space, Spin, Tag, Card, Row, Col, Statistic, Input,
    Table, Empty, Select, Tooltip, Progress, Badge, Button, Drawer, Descriptions
} from "antd";
import {
    UnorderedListOutlined, SearchOutlined, FilterOutlined,
    ProjectOutlined, ClockCircleOutlined, CheckCircleOutlined,
    ExclamationCircleOutlined, UserOutlined, FireOutlined,
    ThunderboltOutlined, CalendarOutlined, DashboardOutlined,
    ArrowUpOutlined, MinusOutlined, ArrowDownOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";

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
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
    const [projectFilter, setProjectFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [viewingTask, setViewingTask] = useState<any>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [taskData, projData] = await Promise.all([
                gql(GET_ALL_TASKS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setTasks(taskData.pmTasks || []);
            setProjects(projData.pmProjects || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

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
        return result;
    }, [tasks, search, statusFilter, priorityFilter, projectFilter, typeFilter]);

    // ── Computed stats ──
    const totalTasks = tasks.length;
    const todoCount = tasks.filter(t => t.status === 'todo').length;
    const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
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

    const columns = [
        {
            title: 'Task',
            dataIndex: 'title',
            key: 'title',
            render: (_: any, record: any) => {
                const proj = projectMap.get(record.projectId);
                return (
                    <div>
                        <a onClick={() => setViewingTask(record)} style={{ fontWeight: 600, fontSize: 14 }}>
                            {record.title}
                        </a>
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
            width: 120,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status] || { color: '#6b7280', icon: null, label: status };
                return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
            },
            filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
            onFilter: (value: any, record: any) => record.status === value,
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (priority: string) => {
                const cfg = PRIORITY_CONFIG[priority] || { color: '#6b7280', icon: null };
                return <Tag color={cfg.color} icon={cfg.icon} style={{ textTransform: 'capitalize' as const }}>{priority}</Tag>;
            },
            sorter: (a: any, b: any) => {
                const order: Record<string,number> = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
            },
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 90,
            render: (type: string) => {
                const c = type === 'bug' ? 'red' : type === 'story' ? 'green' : type === 'epic' ? 'purple' : 'default';
                return <Tag color={c} style={{ textTransform: 'capitalize' as const }}>{type}</Tag>;
            },
        },
        {
            title: 'Assignee',
            key: 'assignee',
            width: 130,
            render: (_: any, record: any) => record.assignee ? (
                <Space size={4}>
                    <UserOutlined style={{ color: themeColor }} />
                    <Text style={{ fontSize: 12 }}>{record.assignee.firstName} {record.assignee.lastName}</Text>
                </Space>
            ) : <Text type="secondary" style={{ fontSize: 11 }}>Unassigned</Text>,
        },
        {
            title: 'Hours',
            key: 'hours',
            width: 100,
            render: (_: any, record: any) => {
                const est = record.estimatedHours || 0;
                const log = record.loggedHours || 0;
                if (est === 0 && log === 0) return <Text type="secondary">—</Text>;
                const pct = est > 0 ? Math.min(100, Math.round((log / est) * 100)) : 0;
                return (
                    <Tooltip title={`${log}h logged / ${est}h estimated`}>
                        <Progress
                            percent={pct}
                            size="small"
                            strokeColor={pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'}
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                            format={() => `${log}/${est}h`}
                            style={{ width: 80 }}
                        />
                    </Tooltip>
                );
            },
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            width: 110,
            sorter: (a: any, b: any) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix();
            },
            render: (date: string, record: any) => {
                if (!date) return <Text type="secondary">—</Text>;
                const isOverdue = dayjs(date).isBefore(dayjs()) && record.status !== 'done';
                return (
                    <Text style={{ fontSize: 11, color: isOverdue ? '#ef4444' : undefined }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {dayjs(date).format('MMM D')}
                        {isOverdue && <Tag color="red" style={{ fontSize: 9, marginLeft: 4 }}>LATE</Tag>}
                    </Text>
                );
            },
        },
    ];

    if (loading) {
        return (
            <CMSLayout title="Backlog" subTitle="All tasks across all projects">
                <div style={{ textAlign: 'center', padding: 120 }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title="Backlog" subTitle="All tasks across all projects">
            {/* ── Stats Row ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #6366f1' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Total Tasks</span>}
                            value={totalTasks}
                            prefix={<UnorderedListOutlined style={{ color: themeColor }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #64748b' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>To Do</span>}
                            value={todoCount}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#64748b' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #3b82f6' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>In Progress</span>}
                            value={inProgressCount}
                            prefix={<ClockCircleOutlined style={{ color: '#3b82f6' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #10b981' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Done</span>}
                            value={doneCount}
                            prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #ef4444' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Overdue</span>}
                            value={overdueCount}
                            prefix={<ExclamationCircleOutlined style={{ color: '#ef4444' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #f59e0b' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Unassigned</span>}
                            value={unassignedCount}
                            prefix={<UserOutlined style={{ color: '#f59e0b' }} />}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}
                        />
                    </Card>
                </Col>
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
                </Row>
            </Card>

            {/* ── Search & Filters ── */}
            <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                <Space size={12} wrap style={{ width: '100%' }}>
                    <Input
                        placeholder="Search tasks, tags..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        style={{ width: 280 }}
                    />
                    <Select
                        placeholder="Status"
                        allowClear
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 140 }}
                        options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))}
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
                    />
                    {(search || statusFilter || priorityFilter || projectFilter || typeFilter) && (
                        <Tag color="blue">{filtered.length} results</Tag>
                    )}
                </Space>
            </Card>

            {/* ── Tasks Table ── */}
            <Card
                title={
                    <Space>
                        <UnorderedListOutlined style={{ color: themeColor }} />
                        <span style={{ fontWeight: 600 }}>All Tasks</span>
                        <Tag color="purple">{filtered.length}</Tag>
                    </Space>
                }
                style={glassCard}
            >
                {filtered.length === 0 ? (
                    <Empty
                        description={
                            tasks.length === 0
                                ? "No tasks found. Create tasks from individual project dashboards."
                                : "No tasks match your current filters."
                        }
                    />
                ) : (
                    <Table
                        dataSource={filtered}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} tasks` }}
                        size="small"
                        style={{ fontSize: 13 }}
                        onRow={(record) => ({
                            onClick: () => setViewingTask(record),
                            style: { cursor: 'pointer' },
                        })}
                    />
                )}
            </Card>

            {/* ── Detail Drawer ── */}
            <Drawer
                title={
                    <Space>
                        <UnorderedListOutlined style={{ color: themeColor }} />
                        <span>Task Details</span>
                    </Space>
                }
                width={560}
                open={!!viewingTask}
                onClose={() => setViewingTask(null)}
                extra={
                    viewingTask && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<DashboardOutlined />}
                            onClick={() => router.push(`/admin/pm/dashboard?projectId=${viewingTask.projectId}`)}
                        >
                            Open Project
                        </Button>
                    )
                }
            >
                {viewingTask && (
                    <div>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Title">
                                <Text strong>{viewingTask.title}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Project">
                                {(() => {
                                    const proj = projectMap.get(viewingTask.projectId);
                                    return proj ? (
                                        <Tag icon={<ProjectOutlined />} color="geekblue">{proj.name}</Tag>
                                    ) : '—';
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                {(() => {
                                    const cfg = STATUS_CONFIG[viewingTask.status] || { color: '#6b7280', label: viewingTask.status };
                                    return <Tag color={cfg.color}>{cfg.label}</Tag>;
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Priority">
                                <Tag color={PRIORITY_CONFIG[viewingTask.priority]?.color || '#6b7280'} style={{ textTransform: 'capitalize' }}>
                                    {viewingTask.priority}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Type">
                                <Tag style={{ textTransform: 'capitalize' }}>{viewingTask.type}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Assignee">
                                {viewingTask.assignee
                                    ? `${viewingTask.assignee.firstName} ${viewingTask.assignee.lastName}`
                                    : 'Unassigned'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Hours">
                                {viewingTask.loggedHours || 0}h logged / {viewingTask.estimatedHours || 0}h estimated
                            </Descriptions.Item>
                            <Descriptions.Item label="Due Date">
                                {viewingTask.dueDate ? dayjs(viewingTask.dueDate).format('MMMM D, YYYY') : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created">
                                {dayjs(viewingTask.createdAt).format('MMMM D, YYYY')}
                            </Descriptions.Item>
                        </Descriptions>

                        {viewingTask.description && (
                            <Card size="small" title="Description" style={{ marginTop: 16, borderLeft: `3px solid ${themeColor}` }}>
                                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{viewingTask.description}</div>
                            </Card>
                        )}

                        {(viewingTask.tags || []).length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Tags</Text>
                                <Space size={4} wrap>
                                    {viewingTask.tags.map((tag: string) => (
                                        <Tag key={tag} color="cyan">{tag}</Tag>
                                    ))}
                                </Space>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
