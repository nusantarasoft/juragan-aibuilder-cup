"use client";

import React, { useRef, useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dropdown,
    Input,
    Segmented,
    Space,
    Spin,
    Tag,
    Typography,
} from "antd";
import {
    CheckCircleFilled,
    HistoryOutlined,
    LoadingOutlined,
    RobotOutlined,
    SendOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { StudioGuideFlow, StudioSource } from "@/lib/studioService";
import type { StudioChatMessage, StudioChatMode } from "./useStudioChat";
import type { SourceStats } from "./studioSourceStatus";

const { Text } = Typography;

type Props = {
    themeColor: string;
    notebookName?: string;
    briefSummary?: string;
    sources: StudioSource[];
    sourceStats: SourceStats;
    publishedGuideFlow: StudioGuideFlow | null;
    chatHistory: StudioChatMessage[];
    conversationId?: string;
    isChatting: boolean;
    chatMode: StudioChatMode;
    guidedFlow: StudioGuideFlow | null;
    waitingInput: boolean;
    suggestedPrompts: string[];
    conversations: { id: string; title: string; updated_at?: string; created_at: string }[];
    loadingConversations: boolean;
    onSend: (text: string) => void;
    onNewChat: () => void;
    onSwitchToFree: () => void;
    onStartGuided: () => void;
    onSetChatMode: (mode: StudioChatMode) => void;
    onResumeConversation: (id: string) => void;
    onCitationClick?: (chunkId: string, docName: string, score: number) => void;
};

export default function AIAssistantPanel({
    themeColor,
    notebookName,
    briefSummary,
    sources,
    sourceStats,
    publishedGuideFlow,
    chatHistory,
    conversationId,
    isChatting,
    chatMode,
    guidedFlow,
    waitingInput,
    suggestedPrompts,
    conversations,
    loadingConversations,
    onSend,
    onNewChat,
    onSwitchToFree,
    onStartGuided,
    onSetChatMode,
    onResumeConversation,
    onCitationClick,
}: Props) {
    const [chatInput, setChatInput] = useState("");
    const [showReferences, setShowReferences] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, isChatting]);

    const sourcesIndexing = sourceStats.inProgress > 0;
    const canSendFree =
        sources.length > 0 && (sourceStats.anyIndexed || sourcesIndexing);

    const chatInputPlaceholder =
        sources.length === 0
            ? "Tambahkan sumber dulu…"
            : chatMode === "guided" && guidedFlow
              ? waitingInput
                  ? "Balas di sini…"
                  : "Tunggu respons asisten…"
              : "Tanya tentang sumber Anda…";

    const inputDisabled =
        isChatting ||
        sources.length === 0 ||
        (!canSendFree && !sourcesIndexing) ||
        (chatMode === "guided" && !waitingInput && chatHistory.length > 0);

    const handleSend = () => {
        const q = chatInput.trim();
        if (!q || inputDisabled) return;
        setChatInput("");
        onSend(q);
    };

    const historyItems = conversations.map((c) => ({
        key: c.id,
        label: (
            <div className="max-w-[240px]">
                <div className="text-xs truncate">{c.title || "Percakapan"}</div>
                <div className="text-[10px] text-gray-400">
                    {new Date(c.updated_at ?? c.created_at).toLocaleString()}
                </div>
            </div>
        ),
        onClick: () => onResumeConversation(c.id),
    }));

    return (
        <div className="flex flex-col h-full">
            {/* Mode + history toolbar */}
            <div className="px-3 pt-2 pb-1 flex flex-wrap items-center gap-2 border-b border-[rgba(var(--theme-color-rgb,139,92,246),0.12)]">
                <Segmented
                    size="small"
                    value={chatMode}
                    onChange={(v) => {
                        const mode = v as StudioChatMode;
                        if (mode === "free") onSwitchToFree();
                        else if (publishedGuideFlow) onStartGuided();
                        else onSetChatMode(mode);
                    }}
                    options={[
                        { label: "Chat bebas", value: "free" },
                        {
                            label: "Guided",
                            value: "guided",
                            disabled: !publishedGuideFlow,
                        },
                    ]}
                />
                <Dropdown
                    menu={{ items: historyItems }}
                    trigger={["click"]}
                    disabled={loadingConversations || conversations.length === 0}
                >
                    <Button size="small" icon={<HistoryOutlined />} loading={loadingConversations}>
                        Riwayat
                    </Button>
                </Dropdown>
                {(conversationId || (chatMode === "guided" && guidedFlow)) && (
                    <Button type="link" size="small" className="text-[10px] ml-auto p-0" onClick={onNewChat}>
                        Chat baru
                    </Button>
                )}
            </div>

            {chatMode === "guided" && guidedFlow && (
                <div
                    className="mx-3 mt-2 px-3 py-2 rounded-lg text-[11px] border"
                    style={{ borderColor: `${themeColor}33`, backgroundColor: `${themeColor}0d` }}
                >
                    <Text strong className="text-[11px] block" style={{ color: themeColor }}>
                        Guided: {guidedFlow.name}
                    </Text>
                    <Text type="secondary" className="text-[10px]">
                        {waitingInput
                            ? "Menunggu balasan Anda — jawaban memakai sumber terindeks."
                            : "Alur sedang berjalan…"}
                    </Text>
                </div>
            )}

            {publishedGuideFlow && chatMode === "free" && (
                <Alert
                    className="mx-3 mt-2 text-[11px]"
                    type="info"
                    showIcon
                    message={`Guide flow "${publishedGuideFlow.name}" tersedia`}
                    description="Mode chat bebas (RAG) aktif. Gunakan tab Guided jika ingin alur terstruktur."
                />
            )}

            {sources.length > 0 && !sourceStats.allIndexed && (
                <motion.div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 text-[11px] text-amber-800 dark:text-amber-200">
                    {sourcesIndexing
                        ? sourceStats.embedding > 0
                            ? `${sourceStats.embedding} file sedang vektorisasi.`
                            : `${sourceStats.inProgress} sumber diproses.`
                        : sourceStats.errors > 0
                          ? `${sourceStats.errors} sumber gagal — lihat Sources.`
                          : "Sumber belum tervektor. Tunggu atau Reindex."}
                </motion.div>
            )}

            {sourceStats.allIndexed && sources.length > 0 && (
                <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200/60 text-[11px] text-green-800 dark:text-green-200 flex items-center gap-1.5">
                    <CheckCircleFilled style={{ color: "#52c41a", fontSize: 12 }} />
                    Siap RAG — {sourceStats.indexed} file,{" "}
                    {sources.reduce((n, s) => n + (s.chunk_count ?? 0), 0)} chunk
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                {chatHistory.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-70">
                        <RobotOutlined style={{ fontSize: 44, color: themeColor }} />
                        <div className="text-center px-2">
                            <Text strong className="block text-sm mb-1">
                                {notebookName ? `Asisten — ${notebookName}` : "AI Assistant"}
                            </Text>
                            {briefSummary ? (
                                <div className="text-left max-w-[420px] mx-auto mt-2 p-3 rounded-lg bg-[rgba(var(--theme-color-rgb,139,92,246),0.06)] border border-[rgba(var(--theme-color-rgb,139,92,246),0.15)]">
                                    <Text className="text-[10px] text-gray-400 uppercase block mb-1">Notebook Brief</Text>
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                        <ReactMarkdown>{briefSummary}</ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <Text className="text-xs text-gray-400 block max-w-[280px]">
                                    {chatMode === "guided"
                                        ? "Ikuti alur guided flow. Jawaban berdasarkan sumber terindeks."
                                        : "Tanya jawab bebas dengan RAG — jawaban dikaitkan ke dokumen notebook."}
                                </Text>
                            )}
                        </div>
                        {chatMode === "free" && suggestedPrompts.length > 0 && canSendFree && (
                            <div className="flex flex-col gap-1.5 w-full max-w-[300px]">
                                <Text className="text-[10px] text-gray-400 text-center">Saran pertanyaan</Text>
                                {suggestedPrompts.map((p) => (
                                    <Button
                                        key={p}
                                        size="small"
                                        type="dashed"
                                        className="!text-[11px] !h-auto !py-1.5 !whitespace-normal !text-left"
                                        disabled={isChatting}
                                        onClick={() => onSend(p)}
                                    >
                                        {p}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
                        <div className="max-w-[85%]">
                            <div
                                style={{
                                    padding: "12px 16px",
                                    borderRadius:
                                        msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    background:
                                        msg.role === "user"
                                            ? themeColor
                                            : "rgba(var(--theme-color-rgb, 139, 92, 246), 0.06)",
                                    color: msg.role === "user" ? "#fff" : "inherit",
                                    wordBreak: "break-word",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                }}
                            >
                                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                            {msg.references && msg.references.length > 0 && (
                                <div className="mt-1.5">
                                    <Button
                                        type="text"
                                        size="small"
                                        className="text-[10px] text-gray-400 p-0 h-auto"
                                        onClick={() => setShowReferences(showReferences === i ? null : i)}
                                    >
                                        {msg.references.length} sumber dikutip
                                    </Button>
                                    <AnimatePresence>
                                        {showReferences === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-1 space-y-1">
                                                    {msg.references.map((ref, ri) => (
                                                        <div
                                                            key={ri}
                                                            role={ref.chunkId && onCitationClick ? "button" : undefined}
                                                            tabIndex={ref.chunkId && onCitationClick ? 0 : undefined}
                                                            className={`bg-gray-50 dark:bg-gray-800/50 rounded-md p-2 text-[11px] ${
                                                                ref.chunkId && onCitationClick
                                                                    ? "cursor-pointer hover:ring-1 hover:ring-[color:var(--theme-color)]"
                                                                    : ""
                                                            }`}
                                                            onClick={() => {
                                                                if (ref.chunkId && onCitationClick) {
                                                                    onCitationClick(ref.chunkId, ref.docName, ref.score);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    ref.chunkId &&
                                                                    onCitationClick &&
                                                                    (e.key === "Enter" || e.key === " ")
                                                                ) {
                                                                    onCitationClick(ref.chunkId, ref.docName, ref.score);
                                                                }
                                                            }}
                                                        >
                                                            <Space size={4} wrap>
                                                                <Text
                                                                    strong
                                                                    className="text-[10px]"
                                                                    style={{ color: themeColor }}
                                                                >
                                                                    {ref.docName}
                                                                </Text>
                                                                <Tag className="!text-[9px] !m-0">
                                                                    {(ref.score * 100).toFixed(0)}% relevan
                                                                </Tag>
                                                            </Space>
                                                            <Text className="text-gray-500 text-[10px] line-clamp-3 block mt-0.5">
                                                                {ref.content}
                                                            </Text>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isChatting && (
                    <div className="flex justify-start mb-4">
                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                            <Spin indicator={<LoadingOutlined spin />} size="small" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-[rgba(var(--theme-color-rgb,139,92,246),0.1)]">
                <Space.Compact className="w-full" style={{ borderRadius: 10 }}>
                    <Input
                        size="large"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onPressEnter={handleSend}
                        placeholder={chatInputPlaceholder}
                        disabled={inputDisabled}
                        style={{ borderBottomLeftRadius: 10, borderTopLeftRadius: 10 }}
                    />
                    <Button
                        size="large"
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSend}
                        loading={isChatting}
                        disabled={inputDisabled || !chatInput.trim()}
                        style={{
                            borderBottomRightRadius: 10,
                            borderTopRightRadius: 10,
                            backgroundColor: themeColor,
                        }}
                    />
                </Space.Compact>
            </div>
        </div>
    );
}
