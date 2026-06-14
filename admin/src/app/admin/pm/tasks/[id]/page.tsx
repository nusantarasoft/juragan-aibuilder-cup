"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import {
    Card, Row, Col, Tag, Space, Select, Typography, Tooltip, Spin, message,
    Input, Progress, Breadcrumb, Popconfirm, DatePicker, Button,
} from "antd";
import {
    ArrowLeftOutlined, CopyOutlined, DeleteOutlined, LinkOutlined,
    ProjectOutlined, ClockCircleOutlined, CheckCircleOutlined,
    ExclamationCircleOutlined, UserOutlined, FireOutlined,
    ThunderboltOutlined, CalendarOutlined, RobotOutlined,
    ArrowUpOutlined, MinusOutlined, ArrowDownOutlined,
    EditOutlined, TagsOutlined, FieldTimeOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import SubtasksList from "../../components/SubtasksList";
import TaskCommentsPanel from "../../components/TaskCommentsPanel";
import TaskDependencies from "../../components/TaskDependencies";
import TimeTracker from "../../components/TimeTracker";

dayjs.extend(relativeTime);
const { Text } = Typography;

/* ── GraphQL ─────────────────────────────────────── */
const GET_TASK = `
  query($tenantId: String!, $id: String!) {
    pmTask(tenantId: $tenantId, id: $id) {
      id title description status priority type assigneeId reporterId
      projectId sprintId estimatedHours loggedHours dueDate tags
      assignee { id firstName lastName }
      reporter { id firstName lastName }
      createdAt updatedAt
    }
  }
`;
const GET_PROJECTS = `
  query($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
  }
`;
const GET_SPRINTS = `
  query($tenantId: String!) {
    pmSprints(tenantId: $tenantId) { id name status projectId }
  }
`;
const UPDATE_TASK = `
  mutation($tenantId: String!, $id: String!, $input: UpdatePmTaskInput!) {
    updatePmTask(tenantId: $tenantId, id: $id, input: $input) { id title status }
  }
`;
const DELETE_TASK = `
  mutation($tenantId: String!, $id: String!) {
    deletePmTask(tenantId: $tenantId, id: $id)
  }
`;
const GENERATE_DESC = `
  mutation($tenantId: String!, $title: String!) {
    generateTaskDescription(tenantId: $tenantId, title: $title)
  }
`;

/* ── Constants ───────────────────────────────────── */
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    todo: { color: '#64748b', icon: <MinusOutlined />, label: 'To Do' },
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
const TYPE_ICONS: Record<string, string> = {
    bug: '🐛', story: '📖', task: '✅', epic: '🏔️', spike: '⚡',
};
const STATUS_ORDER = ['todo', 'in_progress', 'in_review', 'done', 'blocked'];
const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'];

/* ── Component ───────────────────────────────────── */
export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [task, setTask] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [sprints, setSprints] = useState<any[]>([]);

    // Inline editing states
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');
    const [editingDesc, setEditingDesc] = useState(false);
    const [descDraft, setDescDraft] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [editingTags, setEditingTags] = useState(false);
    const [tagsDraft, setTagsDraft] = useState('');
    const titleRef = useRef<any>(null);

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    /* ── Data Loading ──────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [taskData, projData, sprintData] = await Promise.all([
                gql(GET_TASK, { tenantId: DEFAULT_TENANT_ID, id }),
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_SPRINTS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setTask(taskData.pmTask || null);
            setProjects(projData.pmProjects || []);
            setSprints(sprintData.pmSprints || []);
        } catch {
            messageApi.error('Failed to load task');
        } finally {
            setLoading(false);
        }
    }, [id, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Derived ──────────────────────────────── */
    const projectMap = useMemo(() => {
        const m = new Map<string, any>();
        projects.forEach(p => m.set(p.id, p));
        return m;
    }, [projects]);

    const project = task ? projectMap.get(task.projectId) : null;
    const projectSprints = useMemo(() =>
        sprints.filter(s => !task?.projectId || s.projectId === task.projectId),
    [sprints, task]);

    /* ── Auto-save field ─────────────────────── */
    const updateField = async (field: string, value: any) => {
        try {
            await gql(UPDATE_TASK, { tenantId: DEFAULT_TENANT_ID, id, input: { [field]: value } });
            messageApi.success({ content: `Updated ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, duration: 1.5 });
            loadData();
        } catch {
            messageApi.error(`Failed to update ${field}`);
        }
    };

    /* ── Status / Priority Cycling ───────────── */
    const cycleStatus = () => {
        if (!task) return;
        const idx = STATUS_ORDER.indexOf(task.status);
        const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
        updateField('status', next);
    };
    const cyclePriority = () => {
        if (!task) return;
        const idx = PRIORITY_ORDER.indexOf(task.priority);
        const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
        updateField('priority', next);
    };

    /* ── Title Editing ───────────────────────── */
    const startEditTitle = () => {
        setTitleDraft(task?.title || '');
        setEditingTitle(true);
        setTimeout(() => titleRef.current?.focus(), 50);
    };
    const saveTitle = () => {
        setEditingTitle(false);
        if (titleDraft.trim() && titleDraft.trim() !== task?.title) {
            updateField('title', titleDraft.trim());
        }
    };

    /* ── Description Editing ─────────────────── */
    const startEditDesc = () => { setDescDraft(task?.description || ''); setEditingDesc(true); };
    const saveDesc = () => {
        setEditingDesc(false);
        if (descDraft !== (task?.description || '')) updateField('description', descDraft);
    };
    const handleAiGenerate = async () => {
        if (!task?.title) return;
        setAiGenerating(true);
        try {
            const data = await gql(GENERATE_DESC, { tenantId: DEFAULT_TENANT_ID, title: task.title });
            const generated = data.generateTaskDescription;
            if (generated) { setDescDraft(generated); setEditingDesc(true); messageApi.success('AI generated description!'); }
        } catch { messageApi.error('AI generation failed'); }
        finally { setAiGenerating(false); }
    };

    /* ── Tags Editing ────────────────────────── */
    const startEditTags = () => { setTagsDraft((task?.tags || []).join(', ')); setEditingTags(true); };
    const saveTags = () => {
        setEditingTags(false);
        const newTags = tagsDraft.split(',').map(t => t.trim()).filter(Boolean);
        updateField('tags', newTags);
    };

    /* ── Delete ──────────────────────────────── */
    const handleDelete = async () => {
        try {
            await gql(DELETE_TASK, { tenantId: DEFAULT_TENANT_ID, id });
            messageApi.success('Task deleted');
            router.push('/admin/pm/backlog');
        } catch { messageApi.error('Failed to delete task'); }
    };

    /* ── Copy Link ───────────────────────────── */
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        messageApi.success({ content: 'Link copied!', duration: 1.5 });
    };
    const copyId = () => {
        navigator.clipboard.writeText(id);
        messageApi.success({ content: 'ID copied!', duration: 1.5 });
    };

    /* ── Computed ─────────────────────────────── */
    const est = task?.estimatedHours || 0;
    const logged = task?.loggedHours || 0;
    const hoursPct = est > 0 ? Math.min(100, Math.round((logged / est) * 100)) : 0;

    /* ── Sidebar field component ─────────────── */
    const SidebarField = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: 12, minWidth: 80 }}>{label}</Text>
            <div style={{ flex: 1, textAlign: 'right' }}>{children}</div>
        </div>
    );

    /* ── Loading / Not found ─────────────────── */
    if (loading && !task) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Task</AuroraText>}>
                <div style={{ textAlign: 'center', padding: 120 }}><Spin size="large" /></div>
            </CMSLayout>
        );
    }
    if (!task) {
        return (
            <CMSLayout title="Task Not Found">
                <div style={{ textAlign: 'center', padding: 80 }}>
                    <Text type="secondary">No task found with this ID.</Text><br />
                    <Button type="link" onClick={() => router.push('/admin/pm/backlog')}>Back to Backlog</Button>
                </div>
            </CMSLayout>
        );
    }

    const statusCfg = STATUS_CONFIG[task.status] || { color: '#6b7280', label: task.status, icon: <MinusOutlined /> };
    const prioCfg = PRIORITY_CONFIG[task.priority] || { color: '#6b7280', icon: <MinusOutlined /> };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>{task.title?.slice(0, 30) || 'Task'}</AuroraText>}
            subTitle={<DecryptedText text={`Task Detail · ${id.slice(0, 8)}`} animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            {contextHolder}

            {/* ── Top Actions Bar ──────────────────── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card size="small" style={{ ...glassCard, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <Space size={8}>
                            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} size="small" aria-label="Go back">Back</Button>
                            <Breadcrumb items={[
                                { title: <a onClick={() => router.push('/admin/pm/projects')}>Projects</a> },
                                { title: project ? <a onClick={() => router.push(`/admin/pm/dashboard?projectId=${task.projectId}`)}>{project.name}</a> : 'Unknown' },
                                { title: task.title?.slice(0, 40) },
                            ]} />
                        </Space>
                        <Space size={8}>
                            <Tooltip title="Copy link"><Button icon={<LinkOutlined />} size="small" onClick={copyLink} aria-label="Copy link" /></Tooltip>
                            {project && (
                                <Button icon={<ProjectOutlined />} size="small"
                                    onClick={() => router.push(`/admin/pm/dashboard?projectId=${task.projectId}`)}>
                                    Open in Project
                                </Button>
                            )}
                            <Popconfirm title="Delete this task?" description="This action cannot be undone." onConfirm={handleDelete} okText="Delete" okType="danger">
                                <Button danger icon={<DeleteOutlined />} size="small">Delete</Button>
                            </Popconfirm>
                        </Space>
                    </div>
                </Card>
            </motion.div>

            {/* ── Two-Column Layout ────────────────── */}
            <Row gutter={[16, 16]}>
                {/* ── Left Column (Main Content) ─────── */}
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                        role="article" aria-label={`Task: ${task.title}`}>

                        {/* Task Header */}
                        <Card style={glassCard}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <span style={{ fontSize: 28, lineHeight: 1 }}>{TYPE_ICONS[task.type] || '✅'}</span>
                                <div style={{ flex: 1 }}>
                                    {/* Title — inline editable */}
                                    {editingTitle ? (
                                        <Input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                                            onBlur={saveTitle} onPressEnter={saveTitle}
                                            style={{ fontSize: 22, fontWeight: 700, padding: '4px 8px', borderColor: themeColor }} />
                                    ) : (
                                        <div onClick={startEditTitle} style={{ cursor: 'pointer', fontSize: 22, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', lineHeight: 1.3 }}>
                                            {task.title}
                                            <EditOutlined style={{ fontSize: 14, marginLeft: 8, opacity: 0.3 }} />
                                        </div>
                                    )}
                                    <Space size={8} style={{ marginTop: 10 }} wrap>
                                        <Tooltip title="Click to cycle status">
                                            <Tag color={statusCfg.color} icon={statusCfg.icon}
                                                style={{ cursor: 'pointer', fontWeight: 600 }} onClick={cycleStatus}>
                                                {statusCfg.label}
                                            </Tag>
                                        </Tooltip>
                                        <Tooltip title="Click to cycle priority">
                                            <Tag color={prioCfg.color} icon={prioCfg.icon}
                                                style={{ cursor: 'pointer', textTransform: 'capitalize', fontWeight: 600 }} onClick={cyclePriority}>
                                                {task.priority}
                                            </Tag>
                                        </Tooltip>
                                        <Tag style={{ textTransform: 'capitalize' }}>{TYPE_ICONS[task.type] || ''} {task.type}</Tag>
                                    </Space>
                                </div>
                            </div>
                        </Card>

                        {/* Description */}
                        <Card title={<Space><EditOutlined style={{ color: themeColor }} /> Description</Space>}
                            size="small" style={glassCard}
                            extra={
                                <Button size="small" icon={<RobotOutlined />} loading={aiGenerating} onClick={handleAiGenerate}
                                    style={{ borderRadius: 6 }}>AI Generate</Button>
                            }>
                            {editingDesc ? (
                                <Input.TextArea value={descDraft} onChange={e => setDescDraft(e.target.value)}
                                    onBlur={saveDesc} autoSize={{ minRows: 3, maxRows: 12 }} autoFocus
                                    style={{ borderColor: themeColor, fontSize: 13 }} />
                            ) : (
                                <div onClick={startEditDesc} style={{
                                    cursor: 'pointer', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7,
                                    minHeight: 60, padding: 8, borderRadius: 8,
                                    color: task.description ? (isDark ? '#e2e8f0' : '#1f2937') : (isDark ? '#64748b' : '#9ca3af'),
                                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                }}>
                                    {task.description || 'Click to add description...'}
                                </div>
                            )}
                        </Card>

                        {/* Subtasks */}
                        <Card title={<Space><CheckCircleOutlined style={{ color: themeColor }} /> Subtasks</Space>}
                            size="small" style={glassCard}>
                            <SubtasksList parentTaskId={id} projectId={task.projectId} onUpdate={loadData} />
                        </Card>

                        {/* Comments & Activity */}
                        <TaskCommentsPanel taskId={id} projectId={task.projectId} />
                    </motion.div>
                </Col>

                {/* ── Right Column (Sidebar) ──────────── */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Details Card */}
                        <Card title={<Space><ProjectOutlined style={{ color: themeColor }} /> Details</Space>}
                            size="small" style={glassCard}>
                            <SidebarField label="Status">
                                <Select size="small" value={task.status} variant="borderless" style={{ width: 140 }}
                                    onChange={v => updateField('status', v)}
                                    aria-label="Task status"
                                    options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                                        label: <Tag color={v.color} icon={v.icon} style={{ margin: 0 }}>{v.label}</Tag>, value: k,
                                    }))} />
                            </SidebarField>
                            <SidebarField label="Priority">
                                <Select size="small" value={task.priority} variant="borderless" style={{ width: 120 }}
                                    onChange={v => updateField('priority', v)}
                                    aria-label="Task priority"
                                    options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({
                                        label: <Tag color={v.color} icon={v.icon} style={{ margin: 0, textTransform: 'capitalize' as const }}>{k}</Tag>, value: k,
                                    }))} />
                            </SidebarField>
                            <SidebarField label="Type">
                                <Select size="small" value={task.type} variant="borderless" style={{ width: 120 }}
                                    onChange={v => updateField('type', v)}
                                    aria-label="Task type"
                                    options={['task', 'bug', 'story', 'epic', 'spike'].map(t => ({
                                        label: <span>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</span>, value: t,
                                    }))} />
                            </SidebarField>
                            <SidebarField label="Assignee">
                                <Space size={4}>
                                    <UserOutlined style={{ color: themeColor, fontSize: 12 }} />
                                    <Text style={{ fontSize: 12 }}>
                                        {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
                                    </Text>
                                </Space>
                            </SidebarField>
                            <SidebarField label="Reporter">
                                <Text style={{ fontSize: 12 }} type="secondary">
                                    {task.reporter ? `${task.reporter.firstName} ${task.reporter.lastName}` : '—'}
                                </Text>
                            </SidebarField>
                            <SidebarField label="Sprint">
                                <Select size="small" value={task.sprintId || undefined} variant="borderless"
                                    style={{ width: 140 }} allowClear placeholder="No sprint"
                                    onChange={v => updateField('sprintId', v || null)}
                                    options={projectSprints.map(s => ({ label: s.name, value: s.id }))} />
                            </SidebarField>
                            <SidebarField label="Due Date">
                                <DatePicker size="small" variant="borderless"
                                    value={task.dueDate ? dayjs(task.dueDate) : null}
                                    onChange={d => updateField('dueDate', d ? d.format('YYYY-MM-DD') : null)}
                                    style={{ width: 130 }}
                                    suffixIcon={<CalendarOutlined style={{ color: themeColor }} />} />
                            </SidebarField>
                            <SidebarField label="Tags">
                                {editingTags ? (
                                    <Input size="small" value={tagsDraft} onChange={e => setTagsDraft(e.target.value)}
                                        onBlur={saveTags} onPressEnter={saveTags} autoFocus
                                        placeholder="tag1, tag2" style={{ width: 150, fontSize: 11 }} />
                                ) : (
                                    <div onClick={startEditTags} style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                                        {(task.tags || []).length > 0
                                            ? (task.tags || []).map((tag: string) => <Tag key={tag} color="cyan" style={{ fontSize: 10, margin: 0 }}>{tag}</Tag>)
                                            : <Text type="secondary" style={{ fontSize: 11 }}><TagsOutlined /> Add tags</Text>
                                        }
                                    </div>
                                )}
                            </SidebarField>
                        </Card>

                        {/* Time Tracking Card */}
                        <Card title={<Space><FieldTimeOutlined style={{ color: themeColor }} /> Time Tracking</Space>}
                            size="small" style={glassCard}>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 12 }}>
                                        <ClockCircleOutlined /> {logged}h logged
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {est}h estimated
                                    </Text>
                                </div>
                                <Progress
                                    percent={hoursPct}
                                    size="small"
                                    strokeColor={hoursPct > 100 ? '#ef4444' : hoursPct > 80 ? '#f59e0b' : themeColor}
                                    trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                    format={() => `${hoursPct}%`}
                                />
                            </div>
                            <TimeTracker taskId={id} projectId={task.projectId} compact onTimeLogged={() => loadData()} />
                        </Card>

                        {/* Dependencies Card */}
                        <Card title={<Space><LinkOutlined style={{ color: themeColor }} /> Dependencies</Space>}
                            size="small" style={glassCard}>
                            <TaskDependencies taskId={id} projectId={task.projectId} onUpdate={loadData} />
                        </Card>

                        {/* Meta Info Card */}
                        <Card title={<Space><CalendarOutlined style={{ color: themeColor }} /> Meta</Space>}
                            size="small" style={glassCard}>
                            <SidebarField label="Created">
                                <Tooltip title={dayjs(task.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                                    <Text style={{ fontSize: 12 }}>{dayjs(task.createdAt).format('MMM D, YYYY')} · {dayjs(task.createdAt).fromNow()}</Text>
                                </Tooltip>
                            </SidebarField>
                            <SidebarField label="Updated">
                                <Tooltip title={dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm:ss')}>
                                    <Text style={{ fontSize: 12 }}>{dayjs(task.updatedAt).format('MMM D, YYYY')} · {dayjs(task.updatedAt).fromNow()}</Text>
                                </Tooltip>
                            </SidebarField>
                            <SidebarField label="ID">
                                <Tooltip title="Click to copy">
                                    <Text code style={{ fontSize: 11, cursor: 'pointer' }} onClick={copyId}>
                                        {id.slice(0, 12)}… <CopyOutlined style={{ fontSize: 10 }} />
                                    </Text>
                                </Tooltip>
                            </SidebarField>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
