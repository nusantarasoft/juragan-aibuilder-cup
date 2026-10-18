'use client';

/**
 * Chat simulasi inbound WhatsApp — pipeline sama webhook WA (tanpa kirim WA live).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Input, Space, Tag, Typography } from 'antd';
import { ClearOutlined, SendOutlined } from '@ant-design/icons';
import { useAdminLayout } from '@/components/layout/CMSLayout';
import { getVOTheme } from '@/components/layout/voTheme';
import { studioService, type StudioWhatsAppConfig } from '@/lib/studioService';

const { Text, Paragraph } = Typography;

type ChatLine = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    path?: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    config: StudioWhatsAppConfig | null;
    /** Prefill composer when opening from command preview (no auto-send). */
    initialMessage?: string;
};

export default function WhatsAppSimChatDrawer({
    open,
    onClose,
    config,
    initialMessage,
}: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const [phone, setPhone] = useState('6280000000001');
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lines, setLines] = useState<ChatLine[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    useEffect(() => {
        if (open) {
            setError(null);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [open, lines.length]);

    useEffect(() => {
        if (!open) return;
        if (initialMessage == null) return;
        setInput(initialMessage);
        // Focus composer so Send is one click away (no auto-send).
        const timer = window.setTimeout(() => {
            inputRef.current?.focus?.();
        }, 50);
        return () => window.clearTimeout(timer);
    }, [open, initialMessage]);

    const tenantId = config?.tenant_id || '';
    const label = config?.label || tenantId;

    const resetChat = async () => {
        setLines([]);
        setError(null);
        setInput('');
        if (!tenantId) return;
        try {
            await studioService.whatsAppSimReset({
                tenantId,
                phone: phone.trim() || undefined,
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to reset session';
            setError(msg);
        }
    };

    const send = async () => {
        const message = input.trim();
        if (!message || !tenantId || sending) return;
        setSending(true);
        setError(null);
        setInput('');
        setLines((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', text: message },
        ]);
        try {
            const res = await studioService.whatsAppSimChat({
                tenantId,
                message,
                phone: phone.trim() || undefined,
            });
            setLines((prev) => [
                ...prev,
                {
                    id: `b-${Date.now()}`,
                    role: 'bot',
                    text: res.answer || '(empty)',
                    path: res.path,
                },
            ]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to send';
            setError(msg);
            setLines((prev) => [
                ...prev,
                {
                    id: `e-${Date.now()}`,
                    role: 'bot',
                    text: `⚠️ ${msg}`,
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    return (
        <Drawer
            title={
                <Space direction="vertical" size={0}>
                    <Space size={6}>
                        <Text strong className="font-mono text-xs uppercase tracking-[0.06em]">WA Chat Simulator</Text>
                        <Tag color="gold" style={{ borderRadius: 0 }}>Demo</Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                        {label} · same pipeline as inbound WhatsApp (without sending live WA)
                    </Text>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={420}
            destroyOnClose={false}
            styles={{ body: { display: 'flex', flexDirection: 'column', padding: 10, gap: 6 } }}
            extra={
                <Button size="small" icon={<ClearOutlined />} onClick={resetChat} style={{ borderRadius: 0 }}>
                    Reset
                </Button>
            }
        >
            {/* Top-Docked WA Simulator Command Box */}
            <div
                style={{
                    padding: '6px 8px',
                    border: `1px solid ${t.cardBorder}`,
                    borderLeft: '2px solid #25d366',
                    background: t.cardBg,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: t.textSecondary }}>
                        MODE: <Tag className="!m-0 !px-1 !text-[9px]" style={{ borderRadius: 0 }}>Direct handleMessage</Tag>
                    </span>
                    <Input
                        size="small"
                        addonBefore={<span className="font-mono text-[10px]">PH</span>}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="628…"
                        disabled={sending}
                        style={{ maxWidth: 185 }}
                    />
                </div>

                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message as in WhatsApp…"
                        disabled={sending || !tenantId}
                        onPressEnter={() => void send()}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={sending}
                        disabled={!input.trim() || !tenantId}
                        onClick={() => void send()}
                        style={{ borderRadius: 0 }}
                    >
                        Send
                    </Button>
                </Space.Compact>

                <div className="flex flex-wrap items-center gap-1">
                    {['jual 2 bakso', 'cek stok', 'belanja', 'ya', 'batal'].map((cmd) => (
                        <button
                            key={cmd}
                            type="button"
                            onClick={() => {
                                setInput(cmd);
                                inputRef.current?.focus?.();
                            }}
                            className="px-1.5 py-0.5 font-mono text-[10px] border cursor-pointer transition-opacity hover:opacity-100 opacity-80"
                            style={{
                                borderColor: t.cardBorder,
                                background: t.surfaceBg,
                                color: t.textPrimary,
                            }}
                        >
                            {cmd}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <Text type="danger" style={{ fontSize: 12 }}>
                    {error}
                </Text>
            )}

            <div
                style={{
                    flex: 1,
                    minHeight: 280,
                    overflowY: 'auto',
                    border: `1px solid ${t.cardBorder}`,
                    borderRadius: 0,
                    padding: 8,
                    background: t.surfaceBg,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                {lines.length === 0 && (
                    <Paragraph style={{ fontSize: 12, margin: 6, color: t.textSecondary }}>
                        Type a message in the box above or click a shortcut button (<Text code>jual 2 bakso</Text>, <Text code>cek stok</Text>) to test the WA pipeline.
                    </Paragraph>
                )}
                {lines.map((line) => (
                    <div
                        key={line.id}
                        style={{
                            alignSelf: line.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '92%',
                        }}
                    >
                        <div
                            style={{
                                whiteSpace: 'pre-wrap',
                                fontSize: 12,
                                lineHeight: 1.45,
                                padding: '6px 9px',
                                borderRadius: 0,
                                background:
                                    line.role === 'user'
                                        ? 'rgba(37, 211, 102, 0.14)'
                                        : t.cardBg,
                                color: t.textPrimary,
                                border: `1px solid ${t.cardBorder}`,
                                borderRight: line.role === 'user' ? '2px solid #25d366' : undefined,
                                borderLeft: line.role === 'bot' ? '2px solid #fb923c' : undefined,
                            }}
                        >
                            {line.text}
                        </div>
                        {line.path && (
                            <Text className="font-mono" style={{ fontSize: 10, marginLeft: 4, color: t.textMuted }}>
                                path: {line.path}
                            </Text>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </Drawer>
    );
}
