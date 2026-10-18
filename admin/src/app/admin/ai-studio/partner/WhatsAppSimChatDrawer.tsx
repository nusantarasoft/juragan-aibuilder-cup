'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    Drawer,
    Empty,
    Input,
    Segmented,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    ClearOutlined,
    RobotOutlined,
    SendOutlined,
    ShopOutlined,
    ThunderboltOutlined,
    UserOutlined,
    WhatsAppOutlined,
} from '@ant-design/icons';
import { studioService } from '@/lib/studioService';
import { useAdminLayout } from '@/components/layout/CMSLayoutContext';
import { getVOTheme } from '@/components/layout/voTheme';

const { Text } = Typography;

type ChatTurn = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    at: string;
    path?: string;
    phone?: string;
};

const QUICK_SIM_PROMPTS: { code: string; label: string; text: string }[] = [
    { code: 'GREET', label: 'Greeting', text: 'Halo, toko buka hari ini?' },
    { code: '1', label: '1 · Menu Hub', text: '1' },
    { code: '2', label: '2 · Check Stock', text: '2' },
    { code: '3', label: '3 · Sales Report', text: '3' },
    { code: 'MENU', label: '0 · Help', text: 'menu' },
    { code: 'PROMO', label: 'Ask Catalog', text: 'Produk apa saja yang tersedia hari ini?' },
];

export interface WhatsAppSimChatProps {
    open?: boolean;
    onClose?: () => void;
    tenantId: string;
    umkmLabel: string;
    ownerPhones?: string[];
    initialMessage?: string;
    onInitialMessageConsumed?: () => void;
    embedded?: boolean;
}

export function WhatsAppSimChatPanel({
    tenantId,
    umkmLabel,
    ownerPhones = [],
    initialMessage,
    onInitialMessageConsumed,
    embedded = false,
}: WhatsAppSimChatProps) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [senderMode, setSenderMode] = useState<'customer' | 'owner'>('owner');
    const [customPhone, setCustomPhone] = useState('628999000111');
    const [dockTop, setDockTop] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTurns([]);
        setInput('');
        setSenderMode(ownerPhones.length > 0 ? 'owner' : 'customer');
    }, [tenantId, ownerPhones.length]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [turns, sending]);

    const effectiveSenderPhone =
        senderMode === 'owner'
            ? ownerPhones[0] || ''
            : customPhone.trim() || '628999000111';

    const sendMessage = async (overrideText?: string) => {
        const text = (overrideText ?? input).trim();
        if (!text || !tenantId || sending) return;
        if (senderMode === 'owner' && !effectiveSenderPhone) {
            message.warning('Owner WhatsApp phone is not configured for this Partner yet.');
            return;
        }
        const userTurn: ChatTurn = {
            id: `${Date.now()}-u`,
            role: 'user',
            text,
            at: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            phone: effectiveSenderPhone,
        };
        setTurns((prev) => [...prev, userTurn]);
        if (!overrideText) setInput('');
        setSending(true);
        try {
            const res = await studioService.whatsAppSimChat({
                tenantId,
                message: text,
                phone: effectiveSenderPhone || undefined,
            });
            const botTurn: ChatTurn = {
                id: `${Date.now()}-b`,
                role: 'assistant',
                text: res.answer || '(empty response)',
                at: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                path: res.path,
                phone: res.phone,
            };
            setTurns((prev) => [...prev, botTurn]);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : 'Failed to send simulation message');
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        if (initialMessage?.trim() && tenantId && !sending) {
            const msgToRun = initialMessage.trim();
            onInitialMessageConsumed?.();
            void sendMessage(msgToRun);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessage, tenantId]);

    if (!tenantId) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Select a Partner from the directory to launch the WhatsApp simulator"
                />
            </div>
        );
    }

    const renderComposer = () => (
        <div
            className="shrink-0 px-2.5 py-2"
            style={{
                background: t.surfaceBg,
                borderBottom: dockTop ? `1px solid ${t.border}` : undefined,
                borderTop: !dockTop ? `1px solid ${t.border}` : undefined,
                borderLeft: '2px solid #25d366',
            }}
        >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400">
                        WA SIM //
                    </span>
                    <Segmented
                        size="small"
                        value={senderMode}
                        onChange={(v) => setSenderMode(v as 'customer' | 'owner')}
                        options={[
                            {
                                value: 'owner',
                                label: (
                                    <span className="font-mono text-[9.5px] uppercase">
                                        <ShopOutlined /> Owner ({ownerPhones[0] || 'unset'})
                                    </span>
                                ),
                            },
                            {
                                value: 'customer',
                                label: (
                                    <span className="font-mono text-[9.5px] uppercase">
                                        <UserOutlined /> Customer
                                    </span>
                                ),
                            },
                        ]}
                    />
                    {senderMode === 'customer' && (
                        <Input
                            size="small"
                            value={customPhone}
                            onChange={(e) => setCustomPhone(e.target.value)}
                            placeholder="628..."
                            style={{ width: 130, borderRadius: 0 }}
                            className="font-mono !text-[10px]"
                        />
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setDockTop((v) => !v)}
                        className="inline-flex items-center gap-1 h-5 px-1.5 font-mono text-[9px] font-bold uppercase tracking-wider border border-white/15 bg-white/[0.03] text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                        {dockTop ? '▲ DOCK: TOP' : '▼ DOCK: BOT'}
                    </button>
                    <Button
                        size="small"
                        icon={<ClearOutlined />}
                        onClick={() => setTurns([])}
                        disabled={turns.length === 0}
                        style={{ borderRadius: 0 }}
                        className="!h-5 !px-1.5 font-mono !text-[9px] uppercase"
                    >
                        Reset
                    </Button>
                </div>
            </div>

            <div className="flex gap-1.5">
                <Input
                    size="small"
                    placeholder="Type a simulated WhatsApp message… (Enter to send)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPressEnter={() => void sendMessage()}
                    disabled={sending}
                    style={{ borderRadius: 0 }}
                    className="flex-1 !text-[11.5px]"
                />
                <Button
                    size="small"
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => void sendMessage()}
                    loading={sending}
                    disabled={!input.trim()}
                    style={{ background: '#25d366', borderColor: '#25d366', borderRadius: 0 }}
                    className="font-mono !text-[10px] uppercase tracking-wider"
                >
                    Send
                </Button>
            </div>

            {/* Quick-fire command triggers */}
            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                <span className="font-mono text-[8.5px] uppercase tracking-widest text-slate-500 shrink-0 mr-0.5">
                    <ThunderboltOutlined /> Quick:
                </span>
                {QUICK_SIM_PROMPTS.map((q) => (
                    <button
                        key={q.code}
                        type="button"
                        disabled={sending}
                        onClick={() => void sendMessage(q.text)}
                        className="shrink-0 px-1.5 py-0.5 font-mono text-[9px] border border-white/10 bg-white/[0.02] hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                        <strong className="text-emerald-400">{q.code}</strong> · {q.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ background: t.cardBg }}>
            {dockTop && renderComposer()}

            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2 custom-scrollbar"
                style={{ background: darkMode ? '#070a0e' : '#f8fafc' }}
            >
                {turns.length === 0 && (
                    <div
                        className="p-2.5 border border-white/10 bg-white/[0.02]"
                        style={{ borderLeft: '2px solid #25d366' }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <WhatsAppOutlined style={{ color: '#25d366', fontSize: 14 }} />
                            <Text strong className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                                WhatsApp Sandbox // {umkmLabel || tenantId}
                            </Text>
                        </div>
                        <Text className="text-[11px] text-slate-400 block">
                            Test Owner Cashier & Stock commands (<code>1</code> Menu Hub, <code>2</code> Check Stock, <code>3</code> Sales Report) or switch to <strong>Customer</strong> mode to test RAG catalog queries without sending live WhatsApp messages.
                        </Text>
                    </div>
                )}

                {turns.map((turn) => {
                    const isUser = turn.role === 'user';
                    return (
                        <div
                            key={turn.id}
                            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                style={{
                                    maxWidth: '88%',
                                    background: isUser
                                        ? darkMode
                                            ? 'rgba(37, 211, 102, 0.14)'
                                            : '#dcf8c6'
                                        : t.cardBg,
                                    color: t.textPrimary,
                                    padding: '6px 10px',
                                    borderRadius: 0,
                                    border: `1px solid ${isUser ? 'rgba(37, 211, 102, 0.35)' : t.border}`,
                                    borderLeft: !isUser ? '2px solid #38bdf8' : undefined,
                                    borderRight: isUser ? '2px solid #25d366' : undefined,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: 11.5,
                                    lineHeight: 1.5,
                                }}
                            >
                                <div className="flex items-center justify-between gap-2 mb-0.5 pb-0.5 border-b border-white/[0.06] font-mono text-[8.5px] uppercase tracking-wider">
                                    <span style={{ color: isUser ? '#25d366' : '#38bdf8', fontWeight: 700 }}>
                                        {isUser ? (
                                            <>
                                                <UserOutlined /> {senderMode === 'owner' ? 'OWNER' : 'CUSTOMER'}
                                            </>
                                        ) : (
                                            <>
                                                <RobotOutlined /> WA CASHIER AI
                                            </>
                                        )}
                                    </span>
                                    <span className="text-slate-500 tabular-nums">{turn.at}</span>
                                </div>
                                <div>{turn.text}</div>
                                {turn.path && (
                                    <div className="flex items-center gap-1 flex-wrap mt-1">
                                        <Tag
                                            color="blue"
                                            className="font-mono !text-[8.5px] !m-0 !px-1 !rounded-none uppercase"
                                        >
                                            PATH: {turn.path}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {sending && (
                    <div
                        className="flex items-center gap-2 px-2.5 py-1.5 border border-white/10 bg-white/[0.02] self-start font-mono text-[10px] text-slate-400"
                        style={{ borderLeft: '2px solid #25d366' }}
                    >
                        <Spin size="small" />
                        <span>PROCESSING WHATSAPP REPLY…</span>
                    </div>
                )}
            </div>

            {!dockTop && renderComposer()}
        </div>
    );
}

export default function WhatsAppSimChatDrawer({
    open = false,
    onClose,
    tenantId,
    umkmLabel,
    ownerPhones = [],
    initialMessage,
    onInitialMessageConsumed,
}: WhatsAppSimChatProps) {
    return (
        <Drawer
            title={
                <Space size={6}>
                    <WhatsAppOutlined style={{ color: '#25d366', fontSize: 15 }} />
                    <span className="font-mono text-xs uppercase tracking-[0.08em]">
                        WhatsApp Simulator — {umkmLabel || tenantId}
                    </span>
                </Space>
            }
            size="default"
            open={open}
            onClose={onClose}
            styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
        >
            <WhatsAppSimChatPanel
                tenantId={tenantId}
                umkmLabel={umkmLabel}
                ownerPhones={ownerPhones}
                initialMessage={initialMessage}
                onInitialMessageConsumed={onInitialMessageConsumed}
                embedded={false}
            />
        </Drawer>
    );
}
