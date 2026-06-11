"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Checkbox, Input, Progress, Popconfirm, Tooltip, message, Spin, Empty } from "antd";
import { DeleteOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const GET_SUBTASKS = `
  query($tenantId: String!, $projectId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId) {
      id title status priority type estimatedHours loggedHours parentTaskId
      assignee { firstName lastName }
    }
  }
`;

const CREATE_TASK = `
  mutation($tenantId: String!, $input: CreatePmTaskInput!) {
    createPmTask(tenantId: $tenantId, input: $input) { id title status }
  }
`;

const UPDATE_TASK = `
  mutation($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) { id status }
  }
`;

const DELETE_TASK = `
  mutation($id: ID!) {
    deletePmTask(id: $id)
  }
`;

const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
};

interface SubtasksListProps {
    parentTaskId: string;
    projectId: string;
    onUpdate?: () => void;
}

export default function SubtasksList({ parentTaskId, projectId, onUpdate }: SubtasksListProps) {
    const [messageApi, contextHolder] = message.useMessage();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [adding, setAdding] = useState(false);
    const inputRef = useRef<any>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_SUBTASKS, { tenantId: DEFAULT_TENANT_ID, projectId });
            setTasks(data.pmTasks || []);
        } catch (err: any) { console.error("PM Error", err); } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const subtasks = useMemo(() => tasks.filter(t => t.parentTaskId === parentTaskId), [tasks, parentTaskId]);
    const doneCount = subtasks.filter(t => t.status === 'done').length;
    const total = subtasks.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const progressColor = total === 0 ? '#d1d5db' : doneCount === total ? '#10b981' : '#3b82f6';

    const handleToggle = async (task: any) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            await gql(UPDATE_TASK, { id: task.id, input: { status: newStatus } });
            loadData();
            onUpdate?.();
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error('Failed to update subtask');
        }
    };

    const handleAdd = async () => {
        const title = newTitle.trim();
        if (!title) return;
        setAdding(true);
        try {
            await gql(CREATE_TASK, {
                tenantId: DEFAULT_TENANT_ID,
                input: { title, status: 'todo', projectId, parentTaskId, type: 'task', priority: 'medium' },
            });
            setNewTitle("");
            loadData();
            onUpdate?.();
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error('Failed to add subtask');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_TASK, { id });
            messageApi.success('Subtask deleted');
            loadData();
            onUpdate?.();
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error('Failed to delete subtask');
        }
    };

    const containerStyle: React.CSSProperties = {
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 10,
        padding: 12,
        background: isDark ? 'rgba(15, 15, 23, 0.5)' : 'rgba(255,255,255,0.6)',
    };

    if (loading) {
        return (
            <div style={{ ...containerStyle, textAlign: 'center', padding: 24 }}>
                <Spin size="small" />
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {contextHolder}

            {/* Progress Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: total > 0 ? 10 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#374151', whiteSpace: 'nowrap' }}>
                    {doneCount} / {total} subtasks complete
                </span>
                <Progress
                    percent={pct}
                    size="small"
                    showInfo={false}
                    strokeColor={progressColor}
                    trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                    style={{ flex: 1, margin: 0 }}
                />
            </div>

            {/* Subtask Rows */}
            {total === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No subtasks yet" style={{ margin: '4px 0' }} />
            )}
            <AnimatePresence initial={false}>
                {subtasks.map(task => {
                    const isDone = task.status === 'done';
                    const prioColor = PRIORITY_COLORS[task.priority] || '#6b7280';
                    const initials = task.assignee
                        ? `${(task.assignee.firstName || '')[0] || ''}${(task.assignee.lastName || '')[0] || ''}`.toUpperCase()
                        : null;

                    return (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 28 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: 28,
                                gap: 8,
                                padding: '0 4px',
                                borderRadius: 6,
                                cursor: 'default',
                                transition: 'background 0.15s',
                            }}
                            whileHover={{ backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(0,0,0,0.03)' }}
                        >
                            <Checkbox
                                checked={isDone}
                                onChange={() => handleToggle(task)}
                                style={{ marginRight: 0 }}
                            />
                            <span style={{
                                flex: 1,
                                fontSize: 13,
                                textDecoration: isDone ? 'line-through' : 'none',
                                color: isDone ? (isDark ? '#64748b' : '#9ca3af') : (isDark ? '#e2e8f0' : '#1f2937'),
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {task.title}
                            </span>

                            {/* Priority dot */}
                            <Tooltip title={task.priority} placement="top">
                                <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: prioColor, flexShrink: 0,
                                }} />
                            </Tooltip>

                            {/* Assignee */}
                            {initials ? (
                                <Tooltip title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
                                    <span style={{
                                        width: 20, height: 20, borderRadius: '50%',
                                        background: `${themeColor}22`, color: themeColor,
                                        fontSize: 9, fontWeight: 700, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {initials}
                                    </span>
                                </Tooltip>
                            ) : (
                                <UserOutlined style={{ fontSize: 11, color: isDark ? '#475569' : '#d1d5db', flexShrink: 0 }} />
                            )}

                            {/* Delete */}
                            <Popconfirm
                                title="Delete this subtask?"
                                onConfirm={() => handleDelete(task.id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <DeleteOutlined style={{
                                    fontSize: 11, color: isDark ? '#64748b' : '#9ca3af',
                                    cursor: 'pointer', flexShrink: 0,
                                    transition: 'color 0.15s',
                                }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#64748b' : '#9ca3af')}
                                />
                            </Popconfirm>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Add Subtask Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <PlusOutlined style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }} />
                <Input
                    ref={inputRef}
                    size="small"
                    variant="borderless"
                    placeholder="Add subtask..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onPressEnter={handleAdd}
                    disabled={adding}
                    style={{
                        flex: 1, fontSize: 13, padding: '2px 4px',
                        background: 'transparent',
                        color: isDark ? '#e2e8f0' : '#1f2937',
                    }}
                />
            </div>
        </div>
    );
}

