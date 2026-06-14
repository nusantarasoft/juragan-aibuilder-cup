"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, Avatar, Segmented, Empty, Typography, Popconfirm, message, Space, Tag, Tooltip } from "antd";
import {
    SendOutlined, DeleteOutlined, MessageOutlined,
    HistoryOutlined, UserOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;

const GET_ACTIVITIES = `
  query($projectId: String!) {
    pmActivities(projectId: $projectId)
  }
`;

const CREATE_ACTIVITY = `
  mutation($tenantId: String!, $input: JSON!) {
    createPmActivity(tenantId: $tenantId, input: $input)
  }
`;

const DELETE_ACTIVITY = `
  mutation($id: ID!) {
    deletePmActivity(id: $id)
  }
`;

// ── Helpers ──

const hashColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (name.slice(0, 2)).toUpperCase();
};

const renderRichText = (text: string, isDark: boolean): React.ReactNode[] => {
    // Replace patterns in order: code, bold, italic, @mentions
    const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(@\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        const m = match[0];
        if (m.startsWith('`')) {
            parts.push(
                <code key={match.index} style={{
                    background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.06)',
                    padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
                }}>{m.slice(1, -1)}</code>
            );
        } else if (m.startsWith('**')) {
            parts.push(<strong key={match.index}>{m.slice(2, -2)}</strong>);
        } else if (m.startsWith('*')) {
            parts.push(<em key={match.index}>{m.slice(1, -1)}</em>);
        } else if (m.startsWith('@')) {
            parts.push(
                <span key={match.index} style={{
                    background: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)',
                    color: '#6366f1', padding: '1px 5px', borderRadius: 4, fontWeight: 600, fontSize: 12,
                }}>{m}</span>
            );
        }
        lastIndex = match.index + m.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    comment: <MessageOutlined style={{ color: '#6366f1' }} />,
    status_change: <HistoryOutlined style={{ color: '#3b82f6' }} />,
    priority_change: <HistoryOutlined style={{ color: '#f59e0b' }} />,
    assignment: <UserOutlined style={{ color: '#10b981' }} />,
};

// ── Component ──

interface TaskCommentsPanelProps {
    taskId: string;
    projectId: string;
}

export default function TaskCommentsPanel({ taskId, projectId }: TaskCommentsPanelProps) {
    const [activities, setActivities] = useState<any[]>([]);
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [tab, setTab] = useState<string>("Comments");
    const [messageApi, contextHolder] = message.useMessage();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const MAX_CHARS = 500;

    const loadActivities = useCallback(async () => {
        try {
            const data = await gql(GET_ACTIVITIES, { projectId });
            const raw = data.pmActivities;
            const parsed: any[] = (typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [])
                .filter((a: any) => a.taskId === taskId);
            setActivities(parsed);
        } catch (err: any) { console.error("PM Error", err); }
    }, [projectId, taskId]);

    useEffect(() => { loadActivities(); }, [loadActivities]);

    const comments = useMemo(() =>
        activities.filter(a => a.type === 'comment').sort((a, b) =>
            dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix()
        ), [activities]);

    const allActivities = useMemo(() =>
        [...activities].sort((a, b) =>
            dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix()
        ), [activities]);

    const handleSubmit = async () => {
        const trimmed = commentText.trim();
        if (!trimmed) return;
        setSubmitting(true);
        try {
            await gql(CREATE_ACTIVITY, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    type: 'comment',
                    taskId,
                    projectId,
                    author: 'System User',
                    text: trimmed,
                    createdAt: new Date().toISOString(),
                },
            });
            setCommentText("");
            messageApi.success("Comment added");
            loadActivities();
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error("Failed to add comment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_ACTIVITY, { id });
            messageApi.success("Comment deleted");
            loadActivities();
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error("Failed to delete comment");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    // ── Render a single comment ──
    const renderComment = (item: any, idx: number) => (
        <motion.div
            key={item.id || idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ delay: idx * 0.04 }}
            style={{
                display: 'flex', gap: 12, padding: '12px 0',
                borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            }}
        >
            <Avatar
                size={34}
                style={{ background: hashColor(item.author || ''), flexShrink: 0, fontSize: 13, fontWeight: 700 }}
            >
                {getInitials(item.author || 'U')}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Space size={8}>
                        <Text strong style={{ fontSize: 13 }}>{item.author}</Text>
                        <Tooltip title={dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.createdAt).fromNow()}</Text>
                        </Tooltip>
                    </Space>
                    <Popconfirm title="Delete this comment?" onConfirm={() => handleDelete(item.id)} okText="Delete" okType="danger">
                        <Button
                            type="text" size="small" icon={<DeleteOutlined />}
                            style={{ opacity: 0.4, fontSize: 11 }}
                            className="comment-delete-btn"
                        />
                    </Popconfirm>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {renderRichText(item.text || '', isDark)}
                </div>
            </div>
        </motion.div>
    );

    // ── Render a single activity entry ──
    const renderActivity = (item: any, idx: number) => (
        <motion.div
            key={item.id || idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            style={{
                display: 'flex', gap: 10, padding: '10px 0', alignItems: 'flex-start',
                borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
            }}
        >
            <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', flexShrink: 0, fontSize: 13,
            }}>
                {ACTIVITY_ICONS[item.type] || <HistoryOutlined style={{ color: '#94a3b8' }} />}
            </div>
            <div style={{ flex: 1 }}>
                <Text style={{ fontSize: 12 }}>
                    {item.type === 'comment'
                        ? <><Text strong>{item.author}</Text> commented</>
                        : item.description || <><Text strong>{item.author || 'System'}</Text> {item.type?.replace(/_/g, ' ')}</>
                    }
                </Text>
                <div>
                    <Tooltip title={dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}>
                        <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(item.createdAt).fromNow()}</Text>
                    </Tooltip>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div style={{ ...glassCard, padding: 16, display: 'flex', flexDirection: 'column' }}>
            {contextHolder}

            {/* ── Tab Selector ── */}
            <div style={{ marginBottom: 14 }}>
                <Segmented
                    value={tab}
                    onChange={(v) => setTab(v as string)}
                    options={[
                        { label: <Space size={4}><MessageOutlined />Comments<Tag style={{ margin: 0, fontSize: 10 }}>{comments.length}</Tag></Space>, value: 'Comments' },
                        { label: <Space size={4}><HistoryOutlined />Activity<Tag style={{ margin: 0, fontSize: 10 }}>{allActivities.length}</Tag></Space>, value: 'Activity' },
                    ]}
                    block
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                />
            </div>

            {/* ── Scrollable Content ── */}
            <div style={{
                maxHeight: 400, overflowY: 'auto', flex: 1, paddingRight: 4,
                scrollbarWidth: 'thin',
            }}>
                <AnimatePresence mode="wait">
                    {tab === 'Comments' ? (
                        <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {comments.length === 0 ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<Text type="secondary" style={{ fontSize: 12 }}>No comments yet. Start the conversation!</Text>}
                                    style={{ padding: '40px 0' }}
                                />
                            ) : (
                                comments.map((item, idx) => renderComment(item, idx))
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {allActivities.length === 0 ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<Text type="secondary" style={{ fontSize: 12 }}>No activity recorded yet.</Text>}
                                    style={{ padding: '40px 0' }}
                                />
                            ) : (
                                allActivities.map((item, idx) => renderActivity(item, idx))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Add Comment Input ── */}
            <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            }}>
                <Input.TextArea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a comment... Use @name to mention someone"
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.08)',
                        borderRadius: 8, fontSize: 13,
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {commentText.length}/{MAX_CHARS} · Ctrl+Enter to send
                    </Text>
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        size="small"
                        loading={submitting}
                        disabled={!commentText.trim()}
                        onClick={handleSubmit}
                        style={{
                            background: commentText.trim()
                                ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                : undefined,
                            border: 'none', borderRadius: 6,
                        }}
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}

