'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import RbacGuard from '@/components/common/RbacGuard';
import {
    Alert,
    Button,
    Card,
    Empty,
    Input,
    List,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';
import { MessageOutlined, ReloadOutlined, UserSwitchOutlined } from '@ant-design/icons';
import {
    fetchStudioWaConversations,
    fetchStudioWaMessages,
    studioWaHumanReply,
    studioWaTakeoverRelease,
    studioWaTakeoverStart,
    type StudioWaConversation,
    type StudioWaMessage,
} from '@/lib/studioWaConversationsApi';
import {
    messagesChanged,
    shouldPollStudioWaInbox,
    shouldSkipInboxFetch,
    STUDIO_WA_INBOX_POLL_MS,
} from '@/lib/studioWaInboxPoll';

const { Text, Title } = Typography;

function formatRemaining(until?: string): string | null {
    if (!until) return null;
    const ms = new Date(until).getTime() - Date.now();
    if (ms <= 0) return 'Returning to AI soon';
    const min = Math.ceil(ms / 60_000);
    return `${min} min left`;
}

function authorLabel(msg: StudioWaMessage): string {
    if (msg.authorKind === 'human') {
        return msg.authorDisplayName ? `Human (${msg.authorDisplayName})` : 'Human';
    }
    if (msg.authorKind === 'ai') return 'AI';
    return 'Owner';
}

export default function PercakapanWaPage() {
    const [rows, setRows] = useState<StudioWaConversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<StudioWaMessage[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const listInFlight = useRef(false);
    const msgInFlight = useRef(false);
    const threadScrollRef = useRef<HTMLDivElement | null>(null);

    const selected = useMemo(
        () => rows.find((r) => r.id === selectedId) ?? null,
        [rows, selectedId],
    );

    const loadList = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (shouldSkipInboxFetch(listInFlight.current)) return;
            listInFlight.current = true;
            if (!opts?.silent) {
                setLoading(true);
                setError(null);
            }
            try {
                const list = await fetchStudioWaConversations();
                setRows(list);
                if (!selectedId && list[0]) setSelectedId(list[0].id);
            } catch (e) {
                if (!opts?.silent) {
                    setError(e instanceof Error ? e.message : 'Failed to load conversation list');
                }
            } finally {
                listInFlight.current = false;
                if (!opts?.silent) setLoading(false);
            }
        },
        [selectedId],
    );

    const loadMessages = useCallback(
        async (conversationId: string, opts?: { silent?: boolean }) => {
            if (shouldSkipInboxFetch(msgInFlight.current)) return;
            msgInFlight.current = true;
            const scrollEl = threadScrollRef.current;
            const prevScrollTop = scrollEl?.scrollTop ?? 0;
            const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
            const stickToBottom =
                scrollEl != null &&
                prevScrollHeight - prevScrollTop - scrollEl.clientHeight < 80;

            if (!opts?.silent) setMsgLoading(true);
            try {
                const msgs = await fetchStudioWaMessages(conversationId);
                setMessages((prev) => (messagesChanged(prev, msgs) ? msgs : prev));
                if (stickToBottom && scrollEl) {
                    requestAnimationFrame(() => {
                        scrollEl.scrollTop = scrollEl.scrollHeight;
                    });
                } else if (scrollEl) {
                    requestAnimationFrame(() => {
                        scrollEl.scrollTop = prevScrollTop;
                    });
                }
            } catch (e) {
                if (!opts?.silent) {
                    message.error(e instanceof Error ? e.message : 'Failed to load thread');
                }
            } finally {
                msgInFlight.current = false;
                if (!opts?.silent) setMsgLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        void loadList();
    }, [loadList]);

    useEffect(() => {
        if (selectedId) void loadMessages(selectedId);
    }, [selectedId, loadMessages]);

    useEffect(() => {
        const tick = () => {
            if (!shouldPollStudioWaInbox(document.hidden)) return;
            void loadList({ silent: true });
            if (selectedId) void loadMessages(selectedId, { silent: true });
        };
        const id = window.setInterval(tick, STUDIO_WA_INBOX_POLL_MS);
        const onVis = () => {
            if (!document.hidden) tick();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [loadList, loadMessages, selectedId]);

    const onTakeover = async () => {
        if (!selectedId) return;
        setBusy(true);
        try {
            await studioWaTakeoverStart(selectedId);
            message.success('Conversation taken over');
            await loadList({ silent: true });
            await loadMessages(selectedId);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to take over');
        } finally {
            setBusy(false);
        }
    };

    const onRelease = async () => {
        if (!selectedId) return;
        setBusy(true);
        try {
            await studioWaTakeoverRelease(selectedId);
            message.success('Returned to AI');
            await loadList({ silent: true });
            if (selectedId) await loadMessages(selectedId, { silent: true });
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to return to AI');
        } finally {
            setBusy(false);
        }
    };

    const onSend = async () => {
        if (!selectedId || !reply.trim()) return;
        setBusy(true);
        try {
            await studioWaHumanReply(selectedId, reply.trim());
            setReply('');
            message.success('Message sent');
            await loadList({ silent: true });
            await loadMessages(selectedId);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to send');
        } finally {
            setBusy(false);
        }
    };

    const content = (
        <div
            className="flex flex-col gap-1.5 overflow-hidden"
            style={{ height: 'calc(100vh - 142px)', minHeight: 460 }}
        >
            {/* Compact 38px Tactical Header Ribbon */}
            <div
                className="flex items-center justify-between gap-2 px-3 py-1.5 border border-white/10 bg-white/[0.02] shrink-0"
                style={{ borderTop: '2px solid #fb923c' }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <Title level={3} className="!m-0 !text-[13px] font-mono uppercase tracking-[0.1em] flex items-center gap-1.5">
                        <MessageOutlined style={{ color: '#fb923c' }} /> WA Conversations
                    </Title>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        [{rows.length} THREADS · {rows.filter((r) => r.takeoverActive).length} TAKEOVER]
                    </span>
                </div>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadList()} loading={loading} style={{ borderRadius: 0 }}>
                    Reload
                </Button>
            </div>

            {error ? <Alert type="error" message={error} className="shrink-0" style={{ borderRadius: 0 }} showIcon /> : null}

            {/* Viewport-Locked 2-Pane Split View */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 flex-1 min-h-0 overflow-hidden">
                {/* Left Pane: Store & Phone Roster */}
                <Card
                    title={<span className="font-mono text-[11px] uppercase tracking-[0.12em]">Store & number</span>}
                    size="small"
                    className="md:col-span-4 flex flex-col h-full min-h-0 overflow-hidden"
                    style={{ borderRadius: 0, borderTop: '2px solid #fb923c' }}
                    styles={{ body: { padding: 6, flex: 1, overflowY: 'auto', minHeight: 0 } }}
                >
                    {loading ? (
                        <div className="flex justify-center py-6"><Spin size="small" /></div>
                    ) : rows.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No WA conversations yet" />
                    ) : (
                        <List
                            size="small"
                            dataSource={rows}
                            renderItem={(item) => (
                                <List.Item
                                    onClick={() => setSelectedId(item.id)}
                                    style={{
                                        cursor: 'pointer',
                                        background: item.id === selectedId ? 'rgba(251,146,60,0.08)' : undefined,
                                        borderLeft: item.id === selectedId ? '2px solid #fb923c' : '2px solid transparent',
                                        borderRadius: 0,
                                        padding: '6px 8px',
                                    }}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space size={4} wrap>
                                                <Text strong className="text-xs">{item.storeName || item.tenantId}</Text>
                                                {item.takeoverActive ? (
                                                    <Tag color="orange" className="font-mono !text-[9px] !m-0 !px-1" style={{ borderRadius: 0 }}>Takeover</Tag>
                                                ) : null}
                                            </Space>
                                        }
                                        description={
                                            <>
                                                <div className="font-mono text-[11px]">{item.ownerPhone}</div>
                                                <Text type="secondary" className="text-[11px] block" ellipsis>
                                                    {item.lastMessagePreview || '—'}
                                                </Text>
                                            </>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </Card>

                {/* Right Pane: Active Thread & Top-Docked Takeover Composer */}
                <Card
                    title={
                        <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                            {selected
                                ? `${selected.storeName || selected.tenantId} · ${selected.ownerPhone}`
                                : 'Thread'}
                        </span>
                    }
                    size="small"
                    className="md:col-span-8 flex flex-col h-full min-h-0 overflow-hidden"
                    style={{ borderRadius: 0, borderTop: '2px solid #38bdf8' }}
                    styles={{
                        body: {
                            padding: 0,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            overflow: 'hidden',
                        },
                    }}
                    extra={
                        selected ? (
                            <Space size={6} wrap>
                                {selected.takeoverActive ? (
                                    <>
                                        <Tag icon={<UserSwitchOutlined />} color="processing" className="font-mono !text-[10px] !m-0" style={{ borderRadius: 0 }}>
                                            {selected.takeoverByName || 'Admin'}
                                            {formatRemaining(selected.takeoverUntil)
                                                ? ` · ${formatRemaining(selected.takeoverUntil)}`
                                                : ''}
                                        </Tag>
                                        <Button size="small" onClick={() => void onRelease()} loading={busy} style={{ borderRadius: 0 }}>
                                            Return to AI
                                        </Button>
                                    </>
                                ) : (
                                    <Button type="primary" size="small" onClick={() => void onTakeover()} loading={busy} style={{ borderRadius: 0 }}>
                                        Take over
                                    </Button>
                                )}
                            </Space>
                        ) : null
                    }
                >
                    {/* Top-Docked Human Reply Bar when Takeover is Active (zero scrolling required) */}
                    {selected?.takeoverActive ? (
                        <div className="p-2 border-b border-white/10 bg-orange-500/[0.05] shrink-0" style={{ borderLeft: '2px solid #fb923c' }}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input.TextArea
                                    rows={1}
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Reply to store owner…"
                                    disabled={busy}
                                    style={{ borderRadius: 0, fontSize: 12 }}
                                />
                                <Button type="primary" onClick={() => void onSend()} loading={busy} disabled={!reply.trim()} style={{ borderRadius: 0 }}>
                                    Send
                                </Button>
                            </Space.Compact>
                        </div>
                    ) : null}

                    <div
                        ref={threadScrollRef}
                        className="flex-1 overflow-y-auto p-2.5 custom-scrollbar min-h-0"
                    >
                        {!selected ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a conversation on the left" />
                        ) : msgLoading ? (
                            <div className="flex justify-center py-6"><Spin size="small" /></div>
                        ) : messages.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No messages recorded yet" />
                        ) : (
                            <List
                                size="small"
                                dataSource={messages}
                                renderItem={(m) => (
                                    <List.Item className="!px-2 !py-1.5 border-b border-white/[0.06]">
                                        <div className="w-full flex flex-col gap-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <Tag
                                                    className="font-mono !text-[9.5px] !m-0 !px-1.5"
                                                    style={{ borderRadius: 0 }}
                                                    color={
                                                        m.authorKind === 'human'
                                                            ? 'gold'
                                                            : m.authorKind === 'ai'
                                                              ? 'blue'
                                                              : 'default'
                                                    }
                                                >
                                                    {authorLabel(m)}
                                                </Tag>
                                                <Text type="secondary" className="font-mono" style={{ fontSize: 10 }}>
                                                    {new Date(m.createdAt).toLocaleString('en-US')}
                                                </Text>
                                            </div>
                                            <Text className="text-xs" style={{ whiteSpace: 'pre-wrap' }}>{m.bodyText}</Text>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );

    return (
        <CMSLayout>
            <RbacGuard requiredRole="super_admin" fallback={<Alert type="warning" message="This page is restricted to Nusantarasoft super admins." showIcon />}>
                {content}
            </RbacGuard>
        </CMSLayout>
    );
}
