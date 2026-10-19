'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { useAdminLayout } from '@/components/layout/CMSLayoutContext';
import { getVOTheme } from '@/components/layout/voTheme';
import RbacGuard from '@/components/common/RbacGuard';
import {
    Alert,
    Button,
    Input,
    Tooltip,
    message,
} from 'antd';
import {
    CopyOutlined,
    MessageOutlined,
    ReloadOutlined,
    RobotOutlined,
    SearchOutlined,
    SendOutlined,
    ThunderboltOutlined,
    UserOutlined,
    UserSwitchOutlined,
} from '@ant-design/icons';
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

type RosterFilter = 'all' | 'takeover' | 'ai';

const QUICK_REPLIES = [
    { label: 'Greeting', text: 'Hello! Nusantarasoft Admin here — how can we help your store today?' },
    { label: 'Stock Checked', text: 'We have verified your store catalog and stock status.' },
    { label: 'Issue Resolved', text: 'Your request has been resolved. Let us know if you need anything else!' },
    { label: 'Handover to AI', text: 'We are returning your channel to the AI Kasir assistant now.' },
];

export default function MessagesPage() {
    const { darkMode, themeColor = '#fb923c' } = useAdminLayout();
    const t = getVOTheme(darkMode);

    const [rows, setRows] = useState<StudioWaConversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<StudioWaMessage[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search & Layout State
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
    const [threadSearch, setThreadSearch] = useState('');
    const [showRosterPane, setShowRosterPane] = useState(true);
    const [showThreadPane, setShowThreadPane] = useState(true);

    const listInFlight = useRef(false);
    const msgInFlight = useRef(false);
    const threadScrollRef = useRef<HTMLDivElement | null>(null);

    const handleResetLayout = useCallback(() => {
        setShowRosterPane(true);
        setShowThreadPane(true);
        setRosterSearch('');
        setRosterFilter('all');
        setThreadSearch('');
    }, []);

    useEffect(() => {
        const onGlobalReset = () => handleResetLayout();
        window.addEventListener('cms-reset-layout', onGlobalReset);
        return () => window.removeEventListener('cms-reset-layout', onGlobalReset);
    }, [handleResetLayout]);

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

    const onTakeover = async (targetId?: string) => {
        const cid = targetId || selectedId;
        if (!cid) return;
        setBusy(true);
        try {
            await studioWaTakeoverStart(cid);
            message.success('Conversation taken over');
            await loadList({ silent: true });
            if (cid === selectedId) {
                await loadMessages(cid);
            }
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to take over');
        } finally {
            setBusy(false);
        }
    };

    const onRelease = async (targetId?: string) => {
        const cid = targetId || selectedId;
        if (!cid) return;
        setBusy(true);
        try {
            await studioWaTakeoverRelease(cid);
            message.success('Returned to AI');
            await loadList({ silent: true });
            if (cid === selectedId) {
                await loadMessages(cid, { silent: true });
            }
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

    const filteredRoster = useMemo(() => {
        return rows.filter((item) => {
            if (rosterFilter === 'takeover' && !item.takeoverActive) return false;
            if (rosterFilter === 'ai' && item.takeoverActive) return false;
            if (!rosterSearch.trim()) return true;
            const q = rosterSearch.toLowerCase();
            return (
                (item.storeName || '').toLowerCase().includes(q) ||
                (item.tenantId || '').toLowerCase().includes(q) ||
                (item.ownerPhone || '').toLowerCase().includes(q) ||
                (item.lastMessagePreview || '').toLowerCase().includes(q)
            );
        });
    }, [rows, rosterFilter, rosterSearch]);

    const filteredMessages = useMemo(() => {
        if (!threadSearch.trim()) return messages;
        const q = threadSearch.toLowerCase();
        return messages.filter(
            (m) =>
                (m.bodyText || '').toLowerCase().includes(q) ||
                (m.authorDisplayName || '').toLowerCase().includes(q) ||
                authorLabel(m).toLowerCase().includes(q),
        );
    }, [messages, threadSearch]);

    const totalThreads = rows.length;
    const takeoverCount = rows.filter((r) => r.takeoverActive).length;
    const aiActiveCount = Math.max(0, totalThreads - takeoverCount);

    const copyText = (val: string, label: string) => {
        if (!val) return;
        void navigator.clipboard.writeText(val);
        message.success(`${label} copied`);
    };

    return (
        <RbacGuard
            requiredRole="super_admin"
            fallback={
                <Alert
                    type="warning"
                    message="This page is restricted to Nusantarasoft super admins."
                    showIcon
                    style={{ borderRadius: 0 }}
                />
            }
        >
            <CMSLayout
                title="Messages"
                subTitle="Realtime WhatsApp Channels · AI Auto-Pilot Telemetry · Human Takeover Dispatch"
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100vh - 134px)',
                        minHeight: 540,
                        gap: 6,
                        overflow: 'hidden',
                    }}
                >
                    {/* TOP 36PX TACTICAL TELEMETRY & DISPATCH RIBBON */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '5px 10px',
                            background: darkMode ? '#0b0e13' : '#ffffff',
                            border: `1px solid ${t.border}`,
                            borderTop: `2px solid ${themeColor}`,
                            flexShrink: 0,
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Left: Heading + Live Counters + Roster Search + Mode Filter Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <h3
                                className="font-mono uppercase"
                                style={{
                                    margin: 0,
                                    fontSize: 10,
                                    letterSpacing: '0.08em',
                                    padding: '2px 6px',
                                    background: `${themeColor}18`,
                                    border: `1px solid ${themeColor}55`,
                                    color: themeColor,
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                }}
                            >
                                <MessageOutlined /> Messages
                            </h3>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                THREADS <strong style={{ color: t.textPrimary }}>{totalThreads}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                AI AUTO <strong style={{ color: '#38bdf8' }}>{aiActiveCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                TAKEOVER <strong style={{ color: '#f59e0b' }}>{takeoverCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9,
                                    padding: '1px 5px',
                                    border: '1px solid rgba(34,197,94,0.4)',
                                    background: 'rgba(34,197,94,0.1)',
                                    color: '#22c55e',
                                }}
                            >
                                ● LIVE POLL ({Math.round(STUDIO_WA_INBOX_POLL_MS / 1000)}S)
                            </span>

                            {/* Instant Roster Search */}
                            <Input
                                size="small"
                                allowClear
                                prefix={<SearchOutlined style={{ fontSize: 11, color: t.textMuted }} />}
                                placeholder="Search store, phone, preview..."
                                value={rosterSearch}
                                onChange={(e) => setRosterSearch(e.target.value)}
                                style={{ width: 185, borderRadius: 0, fontSize: 11, height: 24 }}
                            />

                            {/* Mode Filter Pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {(
                                    [
                                        { value: 'all', label: 'ALL' },
                                        { value: 'takeover', label: 'TAKEOVER' },
                                        { value: 'ai', label: 'AI AUTO' },
                                    ] as { value: RosterFilter; label: string }[]
                                ).map((opt) => {
                                    const active = rosterFilter === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setRosterFilter(opt.value)}
                                            className="font-mono uppercase"
                                            style={{
                                                fontSize: 9.5,
                                                letterSpacing: '0.05em',
                                                padding: '2px 6px',
                                                height: 22,
                                                cursor: 'pointer',
                                                border: `1px solid ${active ? themeColor : t.border}`,
                                                background: active ? `${themeColor}1f` : 'transparent',
                                                color: active ? themeColor : t.textSecondary,
                                                fontWeight: active ? 700 : 500,
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Layout Controls + Reload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                data-testid="messages-toggle-roster"
                                onClick={() => {
                                    if (showRosterPane && !showThreadPane) {
                                        setShowThreadPane(true);
                                    }
                                    setShowRosterPane((v) => !v);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${t.border}`,
                                    background: showRosterPane ? 'transparent' : `${themeColor}1f`,
                                    color: showRosterPane ? t.textSecondary : themeColor,
                                }}
                            >
                                {showRosterPane ? '◀ HIDE ROSTER' : '▶ SHOW ROSTER'}
                            </button>
                            <button
                                type="button"
                                data-testid="messages-reset-layout"
                                onClick={handleResetLayout}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${t.border}`,
                                    background:
                                        showRosterPane && showThreadPane ? 'transparent' : `${themeColor}18`,
                                    color:
                                        showRosterPane && showThreadPane ? t.textSecondary : themeColor,
                                }}
                            >
                                RESET LAYOUT
                            </button>
                            <button
                                type="button"
                                data-testid="messages-focus-thread"
                                onClick={() => {
                                    setShowRosterPane(false);
                                    setShowThreadPane(true);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${
                                        !showRosterPane && showThreadPane ? themeColor : t.border
                                    }`,
                                    background:
                                        !showRosterPane && showThreadPane ? `${themeColor}22` : 'transparent',
                                    color:
                                        !showRosterPane && showThreadPane ? themeColor : t.textSecondary,
                                }}
                            >
                                FOCUS THREAD
                            </button>
                            <button
                                type="button"
                                data-testid="messages-toggle-thread"
                                onClick={() => {
                                    if (showThreadPane && !showRosterPane) {
                                        setShowRosterPane(true);
                                    }
                                    setShowThreadPane((v) => !v);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${t.border}`,
                                    background: showThreadPane ? 'transparent' : `${themeColor}1f`,
                                    color: showThreadPane ? t.textSecondary : themeColor,
                                }}
                            >
                                {showThreadPane ? 'HIDE THREAD ▶' : '◀ SHOW THREAD'}
                            </button>

                            <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={() => void loadList()}
                                loading={loading}
                                style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                            >
                                Reload
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            message={error}
                            showIcon
                            style={{ borderRadius: 0, flexShrink: 0 }}
                        />
                    )}

                    {/* VIEWPORT-LOCKED 2-PANE SPLIT WORKSPACE */}
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'grid',
                            gridTemplateColumns:
                                showRosterPane && showThreadPane
                                    ? 'minmax(310px, 36%) 1fr'
                                    : '1fr',
                            gap: 6,
                            overflow: 'hidden',
                        }}
                    >
                        {/* LEFT PANE: STORE & PHONE CHANNEL ROSTER */}
                        {showRosterPane && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0,
                                    background: darkMode ? '#0b0e13' : '#ffffff',
                                    border: `1px solid ${t.border}`,
                                    borderTop: `2px solid ${themeColor}`,
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 10px',
                                        borderBottom: `1px solid ${t.border}`,
                                        background: darkMode ? '#0f131a' : '#f8fafc',
                                        flexShrink: 0,
                                    }}
                                >
                                    <span
                                        className="font-mono uppercase"
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '0.07em',
                                            color: t.textSecondary,
                                        }}
                                    >
                                        CHANNEL ROSTER // [{filteredRoster.length}]
                                    </span>
                                    <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                        STORE & NUMBER
                                    </span>
                                </div>

                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    {loading && rows.length === 0 ? (
                                        <div
                                            className="font-mono"
                                            style={{
                                                padding: 20,
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            LOADING MESSAGE CHANNELS...
                                        </div>
                                    ) : rows.length === 0 ? (
                                        <div
                                            className="font-mono"
                                            style={{
                                                padding: 24,
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            No WA conversations yet
                                        </div>
                                    ) : filteredRoster.length === 0 ? (
                                        <div
                                            className="font-mono"
                                            style={{
                                                padding: 20,
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            No channels match the current search or filter.
                                        </div>
                                    ) : (
                                        filteredRoster.map((item) => {
                                            const isSelected = item.id === selectedId;
                                            const rem = formatRemaining(item.takeoverUntil);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSelectedId(item.id);
                                                        if (!showThreadPane) setShowThreadPane(true);
                                                    }}
                                                    style={{
                                                        padding: '8px 10px',
                                                        borderBottom: `1px solid ${t.border}`,
                                                        borderLeft: isSelected
                                                            ? `3px solid ${themeColor}`
                                                            : '3px solid transparent',
                                                        background: isSelected
                                                            ? darkMode
                                                                ? 'rgba(251,146,60,0.08)'
                                                                : 'rgba(251,146,60,0.06)'
                                                            : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.12s ease',
                                                    }}
                                                >
                                                    {/* Top Line: Store Name + Takeover / AI Badge */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 6,
                                                            marginBottom: 3,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: t.textPrimary,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}
                                                        >
                                                            {item.storeName || item.tenantId}
                                                        </span>
                                                        {item.takeoverActive ? (
                                                            <span
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 9,
                                                                    padding: '1px 5px',
                                                                    border: '1px solid rgba(245,158,11,0.5)',
                                                                    background: 'rgba(245,158,11,0.14)',
                                                                    color: '#f59e0b',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                Takeover{rem ? ` · ${rem}` : ''}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 8.5,
                                                                    padding: '1px 5px',
                                                                    border: '1px solid rgba(56,189,248,0.35)',
                                                                    background: 'rgba(56,189,248,0.1)',
                                                                    color: '#38bdf8',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                AI AUTO
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Middle Line: Owner Phone + Tenant ID + Last Timestamp */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 6,
                                                            marginBottom: 3,
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                            <span
                                                                className="font-mono"
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: themeColor,
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {item.ownerPhone}
                                                            </span>
                                                            <span
                                                                className="font-mono"
                                                                style={{ fontSize: 9.5, color: t.textMuted }}
                                                            >
                                                                [{item.tenantId}]
                                                            </span>
                                                        </div>
                                                        {item.lastMessageAt && (
                                                            <span
                                                                className="font-mono"
                                                                style={{ fontSize: 9.5, color: t.textMuted }}
                                                            >
                                                                {new Date(item.lastMessageAt).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Bottom Line: Last Message Preview */}
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: t.textSecondary,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {item.lastMessagePreview || '—'}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* RIGHT PANE: ACTIVE COMMS STREAM & TOP-DOCKED OPERATOR COMPOSER */}
                        {showThreadPane && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0,
                                    background: darkMode ? '#0b0e13' : '#ffffff',
                                    border: `1px solid ${t.border}`,
                                    borderTop: `2px solid ${
                                        selected?.takeoverActive ? '#f59e0b' : '#38bdf8'
                                    }`,
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Sticky Thread Header + Search + Takeover Action Bar */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        padding: '5px 10px',
                                        borderBottom: `1px solid ${t.border}`,
                                        background: darkMode ? '#0f131a' : '#f8fafc',
                                        flexShrink: 0,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span
                                            className="font-mono uppercase"
                                            style={{
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                color: t.textPrimary,
                                            }}
                                        >
                                            {selected
                                                ? `${selected.storeName || selected.tenantId} · ${selected.ownerPhone}`
                                                : 'SELECT A CHANNEL'}
                                        </span>
                                        {selected && (
                                            <>
                                                <Tooltip title="Copy Owner Phone">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyText(selected.ownerPhone, 'Phone number')}
                                                        className="font-mono"
                                                        style={{
                                                            fontSize: 9.5,
                                                            padding: '1px 5px',
                                                            border: `1px solid ${t.border}`,
                                                            background: 'transparent',
                                                            color: t.textSecondary,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <CopyOutlined /> COPY PHONE
                                                    </button>
                                                </Tooltip>
                                                <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                                    [{messages.length} MSGS]
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {selected && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <Input
                                                size="small"
                                                allowClear
                                                prefix={<SearchOutlined style={{ fontSize: 10, color: t.textMuted }} />}
                                                placeholder="Filter thread messages..."
                                                value={threadSearch}
                                                onChange={(e) => setThreadSearch(e.target.value)}
                                                style={{ width: 165, borderRadius: 0, fontSize: 10.5, height: 22 }}
                                            />

                                            {selected.takeoverActive ? (
                                                <>
                                                    <span
                                                        className="font-mono uppercase"
                                                        style={{
                                                            fontSize: 9.5,
                                                            padding: '2px 6px',
                                                            border: '1px solid rgba(245,158,11,0.5)',
                                                            background: 'rgba(245,158,11,0.14)',
                                                            color: '#f59e0b',
                                                        }}
                                                    >
                                                        <UserSwitchOutlined /> {selected.takeoverByName || 'Admin'}
                                                        {formatRemaining(selected.takeoverUntil)
                                                            ? ` · ${formatRemaining(selected.takeoverUntil)}`
                                                            : ''}
                                                    </span>
                                                    <Button
                                                        size="small"
                                                        onClick={() => void onRelease()}
                                                        loading={busy}
                                                        style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                    >
                                                        Return to AI
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    icon={<UserSwitchOutlined />}
                                                    onClick={() => void onTakeover()}
                                                    loading={busy}
                                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                >
                                                    Take over
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* TOP-DOCKED HUMAN OPERATOR DISPATCH COMPOSER (WHEN TAKEOVER ACTIVE) */}
                                {selected?.takeoverActive && (
                                    <div
                                        style={{
                                            padding: '6px 10px',
                                            borderBottom: `1px solid ${t.border}`,
                                            borderLeft: `3px solid ${themeColor}`,
                                            background: darkMode
                                                ? 'rgba(251,146,60,0.06)'
                                                : 'rgba(251,146,60,0.04)',
                                            flexShrink: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 5,
                                        }}
                                    >
                                        {/* Quick Reply Templates Row */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 6,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                                <span
                                                    className="font-mono uppercase"
                                                    style={{ fontSize: 9, color: themeColor, fontWeight: 700 }}
                                                >
                                                    <ThunderboltOutlined /> QUICK DISPATCH:
                                                </span>
                                                {QUICK_REPLIES.map((qr) => (
                                                    <button
                                                        key={qr.label}
                                                        type="button"
                                                        onClick={() => setReply(qr.text)}
                                                        className="font-mono"
                                                        style={{
                                                            fontSize: 9.5,
                                                            padding: '1px 6px',
                                                            border: `1px solid ${t.border}`,
                                                            background: darkMode ? '#0f131a' : '#ffffff',
                                                            color: t.textSecondary,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        + {qr.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <span className="font-mono" style={{ fontSize: 9, color: t.textMuted }}>
                                                AUTO-SUFFIX: &ldquo;— Admin Nusantarasoft&rdquo;
                                            </span>
                                        </div>

                                        {/* Composer Input + Send */}
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                                            <Input.TextArea
                                                rows={1}
                                                autoSize={{ minRows: 1, maxRows: 3 }}
                                                value={reply}
                                                onChange={(e) => setReply(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                        e.preventDefault();
                                                        void onSend();
                                                    }
                                                }}
                                                placeholder="Reply to store owner…"
                                                disabled={busy}
                                                style={{ borderRadius: 0, fontSize: 12, flex: 1 }}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<SendOutlined />}
                                                onClick={() => void onSend()}
                                                loading={busy}
                                                disabled={!reply.trim()}
                                                style={{ borderRadius: 0, height: 'auto', fontSize: 11 }}
                                            >
                                                Send
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* SCROLLABLE TACTICAL COMMS STREAM */}
                                <div
                                    ref={threadScrollRef}
                                    style={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: 'auto',
                                        padding: 10,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}
                                >
                                    {!selected ? (
                                        <div
                                            className="font-mono uppercase"
                                            style={{
                                                margin: 'auto',
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            Select a conversation on the left
                                        </div>
                                    ) : msgLoading && messages.length === 0 ? (
                                        <div
                                            className="font-mono uppercase"
                                            style={{
                                                margin: 'auto',
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            LOADING THREAD MESSAGES...
                                        </div>
                                    ) : filteredMessages.length === 0 ? (
                                        <div
                                            className="font-mono"
                                            style={{
                                                margin: 'auto',
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            No messages recorded yet
                                        </div>
                                    ) : (
                                        filteredMessages.map((m) => {
                                            const isOwner = m.authorKind !== 'ai' && m.authorKind !== 'human';
                                            const isHuman = m.authorKind === 'human';
                                            const accentColor = isHuman
                                                ? '#f59e0b'
                                                : m.authorKind === 'ai'
                                                  ? '#38bdf8'
                                                  : '#94a3b8';

                                            return (
                                                <div
                                                    key={m.id}
                                                    style={{
                                                        alignSelf: isOwner ? 'flex-start' : 'flex-end',
                                                        width: 'min(86%, 680px)',
                                                        padding: '6px 10px',
                                                        border: `1px solid ${t.border}`,
                                                        borderLeft: isOwner
                                                            ? `3px solid ${accentColor}`
                                                            : `1px solid ${t.border}`,
                                                        borderRight: !isOwner
                                                            ? `3px solid ${accentColor}`
                                                            : `1px solid ${t.border}`,
                                                        background: isHuman
                                                            ? darkMode
                                                                ? 'rgba(245,158,11,0.08)'
                                                                : 'rgba(245,158,11,0.05)'
                                                            : m.authorKind === 'ai'
                                                              ? darkMode
                                                                  ? 'rgba(56,189,248,0.06)'
                                                                  : 'rgba(56,189,248,0.04)'
                                                              : darkMode
                                                                ? '#0f131a'
                                                                : '#f8fafc',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 8,
                                                            marginBottom: 3,
                                                        }}
                                                    >
                                                        <span
                                                            className="font-mono"
                                                            style={{
                                                                fontSize: 9.5,
                                                                padding: '0 5px',
                                                                border: `1px solid ${accentColor}66`,
                                                                background: `${accentColor}18`,
                                                                color: accentColor,
                                                                fontWeight: 700,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                            }}
                                                        >
                                                            {isHuman ? (
                                                                <UserSwitchOutlined />
                                                            ) : m.authorKind === 'ai' ? (
                                                                <RobotOutlined />
                                                            ) : (
                                                                <UserOutlined />
                                                            )}
                                                            <span>{authorLabel(m)}</span>
                                                        </span>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span
                                                                className="font-mono"
                                                                style={{ fontSize: 9.5, color: t.textMuted }}
                                                            >
                                                                {new Date(m.createdAt).toLocaleString('en-US')}
                                                            </span>
                                                            <Tooltip title="Copy message text">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyText(m.bodyText, 'Message')}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        color: t.textMuted,
                                                                        cursor: 'pointer',
                                                                        padding: 0,
                                                                        fontSize: 10,
                                                                    }}
                                                                >
                                                                    <CopyOutlined />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            lineHeight: 1.5,
                                                            color: t.textPrimary,
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        {m.bodyText}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CMSLayout>
        </RbacGuard>
    );
}
