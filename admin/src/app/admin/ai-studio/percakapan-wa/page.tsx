'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const { Text, Title } = Typography;

function formatRemaining(until?: string): string | null {
    if (!until) return null;
    const ms = new Date(until).getTime() - Date.now();
    if (ms <= 0) return 'Segera kembali ke AI';
    const min = Math.ceil(ms / 60_000);
    return `${min} menit lagi`;
}

function authorLabel(msg: StudioWaMessage): string {
    if (msg.authorKind === 'human') {
        return msg.authorDisplayName ? `Manusia (${msg.authorDisplayName})` : 'Manusia';
    }
    if (msg.authorKind === 'ai') return 'AI';
    return 'Pemilik';
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

    const selected = useMemo(
        () => rows.find((r) => r.id === selectedId) ?? null,
        [rows, selectedId],
    );

    const loadList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchStudioWaConversations();
            setRows(list);
            if (!selectedId && list[0]) setSelectedId(list[0].id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal memuat daftar percakapan');
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    const loadMessages = useCallback(async (conversationId: string) => {
        setMsgLoading(true);
        try {
            const msgs = await fetchStudioWaMessages(conversationId);
            setMessages(msgs);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Gagal memuat thread');
        } finally {
            setMsgLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadList();
    }, [loadList]);

    useEffect(() => {
        if (selectedId) void loadMessages(selectedId);
    }, [selectedId, loadMessages]);

    const onTakeover = async () => {
        if (!selectedId) return;
        setBusy(true);
        try {
            await studioWaTakeoverStart(selectedId);
            message.success('Percakapan diambil alih');
            await loadList();
            await loadMessages(selectedId);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Gagal ambil alih');
        } finally {
            setBusy(false);
        }
    };

    const onRelease = async () => {
        if (!selectedId) return;
        setBusy(true);
        try {
            await studioWaTakeoverRelease(selectedId);
            message.success('Dikembalikan ke AI');
            await loadList();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Gagal kembalikan ke AI');
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
            message.success('Pesan terkirim');
            await loadList();
            await loadMessages(selectedId);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Gagal kirim');
        } finally {
            setBusy(false);
        }
    };

    const content = (
        <div style={{ padding: 16 }}>
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Title level={3} style={{ margin: 0 }}>
                    <MessageOutlined /> Percakapan WA
                </Title>
                <Button icon={<ReloadOutlined />} onClick={() => void loadList()} loading={loading}>
                    Muat ulang
                </Button>
            </Space>

            {error ? <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon /> : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: 16 }}>
                <Card title="Toko & nomor" size="small">
                    {loading ? (
                        <Spin />
                    ) : rows.length === 0 ? (
                        <Empty description="Belum ada percakapan WA" />
                    ) : (
                        <List
                            dataSource={rows}
                            renderItem={(item) => (
                                <List.Item
                                    onClick={() => setSelectedId(item.id)}
                                    style={{
                                        cursor: 'pointer',
                                        background: item.id === selectedId ? 'rgba(59,130,246,0.08)' : undefined,
                                        borderRadius: 8,
                                        padding: 8,
                                    }}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space wrap>
                                                <Text strong>{item.storeName || item.tenantId}</Text>
                                                {item.takeoverActive ? (
                                                    <Tag color="orange">Ambil alih</Tag>
                                                ) : null}
                                            </Space>
                                        }
                                        description={
                                            <>
                                                <div>{item.ownerPhone}</div>
                                                <Text type="secondary" ellipsis>
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

                <Card
                    title={
                        selected
                            ? `${selected.storeName || selected.tenantId} · ${selected.ownerPhone}`
                            : 'Thread'
                    }
                    size="small"
                    extra={
                        selected ? (
                            <Space wrap>
                                {selected.takeoverActive ? (
                                    <>
                                        <Tag icon={<UserSwitchOutlined />} color="processing">
                                            {selected.takeoverByName || 'Admin'}
                                            {formatRemaining(selected.takeoverUntil)
                                                ? ` · ${formatRemaining(selected.takeoverUntil)}`
                                                : ''}
                                        </Tag>
                                        <Button size="small" onClick={() => void onRelease()} loading={busy}>
                                            Kembalikan ke AI
                                        </Button>
                                    </>
                                ) : (
                                    <Button type="primary" size="small" onClick={() => void onTakeover()} loading={busy}>
                                        Ambil alih
                                    </Button>
                                )}
                            </Space>
                        ) : null
                    }
                >
                    {!selected ? (
                        <Empty description="Pilih percakapan di kiri" />
                    ) : msgLoading ? (
                        <Spin />
                    ) : messages.length === 0 ? (
                        <Empty description="Belum ada pesan tercatat" />
                    ) : (
                        <List
                            dataSource={messages}
                            renderItem={(m) => (
                                <List.Item>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Tag color={m.authorKind === 'human' ? 'gold' : m.authorKind === 'ai' ? 'blue' : 'default'}>
                                            {authorLabel(m)}
                                        </Tag>
                                        <Text style={{ whiteSpace: 'pre-wrap' }}>{m.bodyText}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {new Date(m.createdAt).toLocaleString('id-ID')}
                                        </Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    )}

                    {selected?.takeoverActive ? (
                        <Space.Compact style={{ width: '100%', marginTop: 16 }}>
                            <Input.TextArea
                                rows={2}
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                placeholder="Balas pemilik toko…"
                                disabled={busy}
                            />
                            <Button type="primary" onClick={() => void onSend()} loading={busy} disabled={!reply.trim()}>
                                Kirim
                            </Button>
                        </Space.Compact>
                    ) : null}
                </Card>
            </div>
        </div>
    );

    return (
        <CMSLayout>
            <RbacGuard requiredRole="super_admin" fallback={<Alert type="warning" message="Halaman ini hanya untuk super admin Nusantarasoft." showIcon />}>
                {content}
            </RbacGuard>
        </CMSLayout>
    );
}
