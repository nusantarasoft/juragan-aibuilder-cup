'use client';

/**
 * Chat simulasi inbound WhatsApp — pipeline sama webhook WA (tanpa WAHA).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Input, Space, Tag, Typography } from 'antd';
import { ClearOutlined, SendOutlined } from '@ant-design/icons';
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
        const t = window.setTimeout(() => {
            inputRef.current?.focus?.();
        }, 50);
        return () => window.clearTimeout(t);
    }, [open, initialMessage]);

    const tenantId = config?.tenant_id || '';
    const label = config?.label || tenantId;

    const resetChat = () => {
        setLines([]);
        setError(null);
        setInput('');
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
                    text: res.answer || '(kosong)',
                    path: res.path,
                },
            ]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Gagal kirim';
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
                    <Text strong>Simulasi chat WA</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                        {label} · pipeline sama inbound WhatsApp (tanpa WAHA)
                    </Text>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={420}
            destroyOnClose={false}
            styles={{ body: { display: 'flex', flexDirection: 'column', padding: 12, gap: 8 } }}
            extra={
                <Button size="small" icon={<ClearOutlined />} onClick={resetChat}>
                    Reset
                </Button>
            }
        >
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 4 }}
                message={
                    <span style={{ fontSize: 12 }}>
                        Mode config:{' '}
                        {config?.use_guided_flow ? (
                            <Tag color="blue">guided flow</Tag>
                        ) : (
                            <Tag>handleMessage langsung</Tag>
                        )}
                        — sama seperti WA live untuk tenant ini.
                    </span>
                }
            />

            <Space.Compact style={{ width: '100%' }}>
                <Input
                    addonBefore="HP sim"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="628…"
                    disabled={sending}
                />
            </Space.Compact>

            <div
                style={{
                    flex: 1,
                    minHeight: 280,
                    maxHeight: 'calc(100vh - 280px)',
                    overflowY: 'auto',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 10,
                    padding: 10,
                    background: 'rgba(37, 211, 102, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {lines.length === 0 && (
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: 8 }}>
                        Coba: <Text code>jual 2 bakso</Text>, <Text code>cek stok</Text>,{' '}
                        <Text code>belanja</Text>, <Text code>ya</Text> / <Text code>batal</Text>
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
                                fontSize: 13,
                                lineHeight: 1.45,
                                padding: '8px 10px',
                                borderRadius: 12,
                                background:
                                    line.role === 'user'
                                        ? 'rgba(37, 211, 102, 0.35)'
                                        : 'rgba(255,255,255,0.92)',
                                border: '1px solid rgba(0,0,0,0.06)',
                            }}
                        >
                            {line.text}
                        </div>
                        {line.path && (
                            <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                                path: {line.path}
                            </Text>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {error && (
                <Text type="danger" style={{ fontSize: 12 }}>
                    {error}
                </Text>
            )}

            <Space.Compact style={{ width: '100%' }}>
                <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ketik seperti di WhatsApp…"
                    disabled={sending || !tenantId}
                    onPressEnter={() => void send()}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    disabled={!input.trim() || !tenantId}
                    onClick={() => void send()}
                >
                    Kirim
                </Button>
            </Space.Compact>
        </Drawer>
    );
}
