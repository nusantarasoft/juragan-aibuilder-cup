"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Select, Button, Tag, Popconfirm, Tooltip, message, Spin, Empty } from "antd";
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ArrowRightOutlined, WarningOutlined, LinkOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const GET_DEPENDENCIES = `
  query($projectId: String!) {
    pmTaskDependencies(projectId: $projectId) {
      id projectId taskId dependsOnTaskId type lag createdAt
    }
  }
`;
const GET_TASKS = `
  query($tenantId: String!, $projectId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId) {
      id title status priority type
    }
  }
`;
const CREATE_DEPENDENCY = `
  mutation($tenantId: String!, $input: CreatePmTaskDependencyInput!) {
    createPmTaskDependency(tenantId: $tenantId, input: $input) { id }
  }
`;
const DELETE_DEPENDENCY = `
  mutation($id: ID!) {
    deletePmTaskDependency(id: $id)
  }
`;

const PRIORITY_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' };
const STATUS_COLORS: Record<string, string> = { done: '#10b981', in_progress: '#3b82f6', todo: '#6b7280', review: '#f59e0b' };
const DEP_TYPE_LABELS: Record<string, string> = {
    finish_to_start: 'FS', start_to_start: 'SS', finish_to_finish: 'FF', start_to_finish: 'SF',
};

interface TaskDependenciesProps {
    taskId: string;
    projectId: string;
    onUpdate?: () => void;
}

export default function TaskDependencies({ taskId, projectId, onUpdate }: TaskDependenciesProps) {
    const [messageApi, contextHolder] = message.useMessage();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [deps, setDeps] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState('finish_to_start');
    const [formTarget, setFormTarget] = useState<string | undefined>();
    const [formDir, setFormDir] = useState<'depends_on' | 'blocks'>('depends_on');
    const [adding, setAdding] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [dData, tData] = await Promise.all([
                gql(GET_DEPENDENCIES, { projectId }),
                gql(GET_TASKS, { tenantId: DEFAULT_TENANT_ID, projectId }),
            ]);
            setDeps(dData.pmTaskDependencies || []);
            setTasks(tData.pmTasks || []);
        } catch (err: any) { console.error("PM Error", err); } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
    const blockedBy = useMemo(() => deps.filter(d => d.taskId === taskId), [deps, taskId]);
    const blocks = useMemo(() => deps.filter(d => d.dependsOnTaskId === taskId), [deps, taskId]);
    const linkedIds = useMemo(() => new Set([
        ...blockedBy.map(d => d.dependsOnTaskId), ...blocks.map(d => d.taskId), taskId,
    ]), [blockedBy, blocks, taskId]);

    // Cycle detection via DFS
    const wouldCreateCycle = useCallback((fromId: string, toId: string) => {
        const adj = new Map<string, string[]>();
        deps.forEach(d => { adj.set(d.taskId, [...(adj.get(d.taskId) || []), d.dependsOnTaskId]); });
        adj.set(fromId, [...(adj.get(fromId) || []), toId]);
        const visited = new Set<string>(), stack = new Set<string>();
        const dfs = (node: string): boolean => {
            if (stack.has(node)) return true;
            if (visited.has(node)) return false;
            visited.add(node); stack.add(node);
            for (const n of adj.get(node) || []) { if (dfs(n)) return true; }
            stack.delete(node);
            return false;
        };
        return dfs(fromId);
    }, [deps]);

    const handleAdd = async () => {
        if (!formTarget) return;
        const src = formDir === 'depends_on' ? taskId : formTarget;
        const dep = formDir === 'depends_on' ? formTarget : taskId;
        if (wouldCreateCycle(src, dep)) { messageApi.warning('This dependency would create a circular chain!'); return; }
        setAdding(true);
        try {
            await gql(CREATE_DEPENDENCY, {
                tenantId: DEFAULT_TENANT_ID,
                input: { projectId, taskId: src, dependsOnTaskId: dep, type: formType },
            });
            setShowForm(false); setFormTarget(undefined);
            loadData(); onUpdate?.();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error('Failed to add dependency'); } finally { setAdding(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_DEPENDENCY, { id });
            messageApi.success('Dependency removed');
            loadData(); onUpdate?.();
        } catch (err: any) { console.error("PM Error", err);  messageApi.error('Failed to remove dependency'); }
    };

    const glass: React.CSSProperties = {
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 10, padding: 12,
        background: isDark ? 'rgba(15,15,23,0.5)' : 'rgba(255,255,255,0.6)',
    };

    const renderItem = (dep: any, dir: 'in' | 'out') => {
        const tid = dir === 'in' ? dep.dependsOnTaskId : dep.taskId;
        const t = taskMap.get(tid);
        if (!t) return null;
        const arrowColor = t.status === 'done' ? '#10b981' : '#ef4444';
        return (
            <motion.div key={dep.id} initial={{ opacity: 0, x: dir === 'in' ? -12 : 12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6,
                    background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(0,0,0,0.02)', marginBottom: 4 }}>
                {dir === 'in'
                    ? <ArrowLeftOutlined style={{ fontSize: 10, color: arrowColor }} />
                    : <ArrowRightOutlined style={{ fontSize: 10, color: arrowColor }} />}
                <span style={{ flex: 1, fontSize: 12, color: isDark ? '#e2e8f0' : '#1f2937', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                <Tooltip title={t.priority}><span style={{ width: 6, height: 6, borderRadius: '50%',
                    background: PRIORITY_COLORS[t.priority] || '#6b7280', flexShrink: 0 }} /></Tooltip>
                <Tag color={STATUS_COLORS[t.status]} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px',
                    borderRadius: 4, border: 'none' }}>{t.status?.replace('_', ' ')}</Tag>
                <Tag style={{ margin: 0, fontSize: 9, lineHeight: '14px', padding: '0 3px', borderRadius: 3,
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: 'none',
                    color: isDark ? '#94a3b8' : '#6b7280' }}>{DEP_TYPE_LABELS[dep.type] || dep.type}</Tag>
                <Popconfirm title="Remove dependency?" onConfirm={() => handleDelete(dep.id)} okText="Yes" cancelText="No">
                    <DeleteOutlined style={{ fontSize: 10, color: isDark ? '#64748b' : '#9ca3af', cursor: 'pointer', flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = isDark ? '#64748b' : '#9ca3af')} />
                </Popconfirm>
            </motion.div>
        );
    };

    // Mini-graph: current task center, blockedBy left, blocks right
    const miniGraph = () => {
        const leftNodes = blockedBy.map(d => taskMap.get(d.dependsOnTaskId)).filter(Boolean).slice(0, 4);
        const rightNodes = blocks.map(d => taskMap.get(d.taskId)).filter(Boolean).slice(0, 4);
        if (!leftNodes.length && !rightNodes.length) return null;
        const nodeStyle = (active?: boolean): React.CSSProperties => ({
            padding: '3px 8px', borderRadius: 6, fontSize: 10, maxWidth: 90, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
            background: active ? `${themeColor}22` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: active ? `1px solid ${themeColor}` : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            color: active ? themeColor : isDark ? '#cbd5e1' : '#374151', fontWeight: active ? 600 : 400,
        });
        const arrow = (color: string) => (
            <svg width="24" height="12" viewBox="0 0 24 12" style={{ flexShrink: 0 }}>
                <line x1="0" y1="6" x2="18" y2="6" stroke={color} strokeWidth="1.5" />
                <polygon points="18,2 24,6 18,10" fill={color} />
            </svg>
        );
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 4px', marginTop: 8, borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            }}>
                {leftNodes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        {leftNodes.map(n => <span key={n.id} style={nodeStyle()}>{n.title}</span>)}
                    </div>
                )}
                {leftNodes.length > 0 && arrow(isDark ? '#64748b' : '#9ca3af')}
                <span style={nodeStyle(true)}>{taskMap.get(taskId)?.title || 'Current'}</span>
                {rightNodes.length > 0 && arrow(isDark ? '#64748b' : '#9ca3af')}
                {rightNodes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {rightNodes.map(n => <span key={n.id} style={nodeStyle()}>{n.title}</span>)}
                    </div>
                )}
            </motion.div>
        );
    };

    if (loading) {
        return <div style={{ ...glass, textAlign: 'center', padding: 24 }}><Spin size="small" /></div>;
    }

    const availableTasks = tasks.filter(t => !linkedIds.has(t.id));
    const sectionLabel = (text: string) => (
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
            color: isDark ? '#94a3b8' : '#6b7280', marginBottom: 4, display: 'block' }}>{text}</span>
    );

    return (
        <div style={glass}>
            {contextHolder}
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LinkOutlined style={{ color: themeColor }} /> Dependencies
                    <Tag style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', borderRadius: 10,
                        background: `${themeColor}18`, color: themeColor, border: 'none' }}>{blockedBy.length + blocks.length}</Tag>
                </span>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="small" type="text" icon={<PlusOutlined />}
                        onClick={() => setShowForm(!showForm)}
                        style={{ fontSize: 11, color: themeColor, borderRadius: 6 }}>Add</Button>
                </motion.div>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        style={{ marginBottom: 10, padding: 8, borderRadius: 8,
                            background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(0,0,0,0.02)',
                            display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                        <Select size="small" value={formDir} onChange={v => setFormDir(v)} style={{ width: '100%' }}
                            options={[{ value: 'depends_on', label: 'This task depends on...' }, { value: 'blocks', label: 'This task blocks...' }]} />
                        <Select size="small" value={formType} onChange={v => setFormType(v)} style={{ width: '100%' }}
                            options={Object.entries(DEP_TYPE_LABELS).map(([k, v]) => ({ value: k, label: `${v} — ${k.replace(/_/g, ' ')}` }))} />
                        <Select size="small" showSearch value={formTarget} onChange={v => setFormTarget(v)}
                            filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                            placeholder="Select target task" style={{ width: '100%' }}
                            options={availableTasks.map(t => ({ value: t.id, label: t.title }))} />
                        <Button size="small" type="primary" loading={adding} onClick={handleAdd} disabled={!formTarget}
                            style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)`, border: 'none', borderRadius: 6, fontSize: 11, alignSelf: 'flex-end' }}>
                            Add Dependency
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Blocked By */}
            {blockedBy.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    {sectionLabel(`← Blocked By (${blockedBy.length})`)}
                    <AnimatePresence initial={false}>{blockedBy.map(d => renderItem(d, 'in'))}</AnimatePresence>
                </div>
            )}

            {/* Blocks */}
            {blocks.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                    {sectionLabel(`→ Blocks (${blocks.length})`)}
                    <AnimatePresence initial={false}>{blocks.map(d => renderItem(d, 'out'))}</AnimatePresence>
                </div>
            )}

            {/* Empty state */}
            {blockedBy.length === 0 && blocks.length === 0 && !showForm && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No dependencies" style={{ margin: '4px 0' }} />
            )}

            {/* Mini Graph */}
            {miniGraph()}
        </div>
    );
}

