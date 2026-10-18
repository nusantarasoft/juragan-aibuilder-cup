"use client";

import React, { useRef, useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dropdown,
    Input,
    Segmented,
    Select,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    CheckCircleFilled,
    CheckOutlined,
    CopyOutlined,
    FileAddOutlined,
    HistoryOutlined,
    LoadingOutlined,
    RedoOutlined,
    RobotOutlined,
    SendOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { StudioGuideFlow, StudioSource } from "@/lib/studioService";
import type { StudioChatMessage, StudioChatMode } from "./useStudioChat";
import type { SourceStats } from "./studioSourceStatus";
import { rewriteInlineCitations, citationIndexFromHref } from "./chatActions";

const { Text } = Typography;

export const CHAT_LANGUAGES: { value: string; label: string }[] = [
    { value: "en", label: "English" },
    { value: "id", label: "Indonesian" },
    { value: "jv", label: "Javanese" },
    { value: "ms", label: "Malay" },
    { value: "ar", label: "Arabic" },
    { value: "zh", label: "Chinese" },
];

type CitationRef = NonNullable<StudioChatMessage["references"]>[number];

/**
 * Renders assistant markdown, turning inline `[n]` markers into clickable
 * citation pills that jump to the n-th reference. Falls back to plain markdown
 * when there are no references to link against.
 */
function MessageContent({
    content,
    references,
    onCitationClick,
}: {
    content: string;
    references?: CitationRef[];
    onCitationClick?: (chunkId: string, docName: string, score: number) => void;
}) {
    const hasRefs = !!references && references.length > 0;
    const source = hasRefs ? rewriteInlineCitations(content, references) : content;

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0">
            <ReactMarkdown
                components={{
                    a: ({ href, children, ...rest }) => {
                        const idx = citationIndexFromHref(href);
                        if (idx !== null && references) {
                            const ref = references[idx];
                            const clickable = !!(ref?.chunkId && onCitationClick);
                            return (
                                <sup
                                    role={clickable ? "button" : undefined}
                                    tabIndex={clickable ? 0 : undefined}
                                    title={ref?.docName}
                                    onClick={() => {
                                        if (clickable) onCitationClick!(ref.chunkId!, ref.docName, ref.score);
                                    }}
                                    onKeyDown={(e) => {
                                        if (clickable && (e.key === "Enter" || e.key === " ")) {
                                            onCitationClick!(ref.chunkId!, ref.docName, ref.score);
                                        }
                                    }}
                                    className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 mx-0.5 rounded-full text-[9px] font-semibold align-super bg-[color:var(--theme-color)]/15 text-[color:var(--theme-color)] ${
                                        clickable ? "cursor-pointer hover:bg-[color:var(--theme-color)]/30" : ""
                                    }`}
                                >
                                    {String(idx + 1)}
                                </sup>
                            );
                        }
                        return (
                            <a href={href} target="_blank" rel="noreferrer" {...rest}>
                                {children}
                            </a>
                        );
                    },
                }}
            >
                {source}
            </ReactMarkdown>
        </div>
    );
}

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
    onSaveToNote?: (content: string) => void;
    onRegenerate?: () => void;
    language?: string;
    onSetLanguage?: (lang: string) => void;
    layoutResetSignal?: number;
};

export const QUICK_TACTICAL_PROMPTS: { code: string; label: string; prompt: string }[] = [
    {
        code: "SUM",
        label: "Executive Summary",
        prompt: "Provide a concise, structured executive summary of all selected sources.",
    },
    {
        code: "KEY",
        label: "Key Findings",
        prompt: "Extract the key takeaways, critical metrics, and primary conclusions from these sources.",
    },
    {
        code: "FAQ",
        label: "Generate FAQ",
        prompt: "Compile a list of the most frequently asked questions (FAQ) with accurate answers grounded in the sources.",
    },
    {
        code: "GAP",
        label: "Risk & Gap Analysis",
        prompt: "Identify potential risks, information gaps, or action items based on the indexed documents.",
    },
];

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
    onSaveToNote,
    onRegenerate,
    language = "en",
    onSetLanguage,
    layoutResetSignal = 0,
}: Props) {
    const [chatInput, setChatInput] = useState("");
    const [showReferences, setShowReferences] = useState<number | null>(null);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [dockTop, setDockTop] = useState<boolean>(true);
    const [showBrief, setShowBrief] = useState<boolean>(true);
    const [showPrompts, setShowPrompts] = useState<boolean>(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    useEffect(() => {
        if (layoutResetSignal > 0) {
            setDockTop(true);
            setShowBrief(true);
            setShowPrompts(true);
        }
    }, [layoutResetSignal]);

    // Press "/" anywhere (when not inside an input/textarea) to focus chat command bar
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (document.activeElement as HTMLElement | null)?.tagName;
            if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                inputRef.current?.focus?.();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const handleCopy = async (idx: number, text: string) => {
        try {
            await navigator.clipboard?.writeText(text);
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
        } catch {
            /* clipboard unavailable */
        }
    };

    const lastAssistantIdx = (() => {
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === "assistant") return i;
        }
        return -1;
    })();

    useEffect(() => {
        if (chatHistory.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isChatting]);

    const sourcesIndexing = sourceStats.inProgress > 0;
    const canSendFree =
        sources.length > 0 && (sourceStats.anyIndexed || sourcesIndexing);
    const totalChunks = sources.reduce((n, s) => n + (s.chunk_count ?? 0), 0);

    const chatInputPlaceholder =
        sources.length === 0
            ? "Add sources in the left panel first…"
            : chatMode === "guided" && guidedFlow
              ? waitingInput
                  ? "Reply here… (press / to focus)"
                  : "Waiting for assistant response…"
              : "Ask anything about your sources… (press / to focus)";

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
                <div className="text-xs truncate">{c.title || "Conversation"}</div>
                <div className="text-[10px] text-gray-400">
                    {new Date(c.updated_at ?? c.created_at).toLocaleString()}
                </div>
            </div>
        ),
        onClick: () => onResumeConversation(c.id),
    }));

    const renderCommandComposer = (position: "top" | "bottom") => (
        <div
            className={`px-2.5 py-2 shrink-0 bg-white/[0.02] ${
                position === "top" ? "border-b border-white/10" : "border-t border-white/10"
            }`}
            style={{ borderLeft: `2px solid ${themeColor}` }}
        >
            <div className="flex items-center gap-1.5">
                <Tooltip title="Press / anywhere to focus the command bar" placement="bottom">
                    <span
                        className="hidden sm:inline-flex items-center justify-center px-1.5 h-7 font-mono text-[10px] font-bold uppercase tracking-wider border shrink-0 select-none"
                        style={{
                            borderColor: `${themeColor}66`,
                            backgroundColor: `${themeColor}18`,
                            color: themeColor,
                        }}
                    >
                        / CMD
                    </span>
                </Tooltip>
                <Space.Compact className="w-full flex-1" style={{ borderRadius: 0 }}>
                    <Input
                        ref={inputRef}
                        size="middle"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onPressEnter={handleSend}
                        placeholder={chatInputPlaceholder}
                        disabled={inputDisabled}
                        style={{ borderRadius: 0, fontSize: 12 }}
                    />
                    <Button
                        size="middle"
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSend}
                        loading={isChatting}
                        disabled={inputDisabled || !chatInput.trim()}
                        style={{
                            borderRadius: 0,
                            backgroundColor: themeColor,
                            borderColor: themeColor,
                        }}
                    >
                        Send
                    </Button>
                </Space.Compact>
            </div>

            {/* Instant Tactical Prompt Strip (always accessible without scrolling) */}
            {chatMode === "free" && canSendFree && (
                <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 shrink-0 mr-0.5">
                        QUICK //
                    </span>
                    {QUICK_TACTICAL_PROMPTS.map((item) => (
                        <button
                            key={item.code}
                            type="button"
                            disabled={isChatting}
                            onClick={() => onSend(item.prompt)}
                            className="shrink-0 px-1.5 py-0.5 font-mono text-[9.5px] border border-white/10 bg-white/[0.02] hover:border-orange-400/50 hover:bg-orange-500/10 transition-colors cursor-pointer disabled:opacity-40"
                        >
                            <span style={{ color: themeColor }} className="font-bold mr-1">
                                [{item.code}]
                            </span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const effectiveDockTop = dockTop || chatHistory.length === 0;

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Compact 34px Single-Line Tactical Header + Inline Telemetry */}
            <div className="px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 border-b border-white/10 shrink-0">
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
                        { label: "Free Chat", value: "free" },
                        {
                            label: "Guided",
                            value: "guided",
                            disabled: !publishedGuideFlow,
                        },
                    ]}
                />

                {/* Inline Live RAG Status Badge (replaces stacked multi-line banners) */}
                {sourceStats.allIndexed && sources.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 tabular-nums">
                        <CheckCircleFilled style={{ color: "#22c55e", fontSize: 10 }} />
                        RAG Ready · {sourceStats.indexed} files · {totalChunks} chunks
                    </span>
                ) : sources.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-400 tabular-nums">
                        {sourcesIndexing
                            ? `${sourceStats.inProgress} sources indexing`
                            : sourceStats.errors > 0
                              ? `${sourceStats.errors} failed`
                              : "Not vectorized"}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider border border-white/10 text-slate-400">
                        0 Sources
                    </span>
                )}

                {publishedGuideFlow && chatMode === "free" && (
                    <Tooltip title={`Start Guide Flow: ${publishedGuideFlow.name}`} placement="bottom">
                        <button
                            type="button"
                            onClick={onStartGuided}
                            className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9.5px] border border-sky-400/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 cursor-pointer"
                        >
                            FLOW: {publishedGuideFlow.name} →
                        </button>
                    </Tooltip>
                )}

                <div className="ml-auto flex items-center gap-1">
                    <Dropdown
                        menu={{ items: historyItems }}
                        trigger={["click"]}
                        disabled={loadingConversations || conversations.length === 0}
                    >
                        <Button size="small" icon={<HistoryOutlined />} loading={loadingConversations} className="!text-[11px] !px-2">
                            History
                        </Button>
                    </Dropdown>
                    {onSetLanguage && (
                        <Tooltip title="Response language" placement="bottom">
                            <Select
                                size="small"
                                value={language}
                                onChange={onSetLanguage}
                                options={CHAT_LANGUAGES}
                                style={{ minWidth: 92 }}
                                popupMatchSelectWidth={false}
                            />
                        </Tooltip>
                    )}
                    <Tooltip
                        title={
                            effectiveDockTop
                                ? "Dock command input to bottom"
                                : "Dock command input to top (zero scrolling)"
                        }
                        placement="bottom"
                    >
                        <button
                            type="button"
                            onClick={() => setDockTop((prev) => !prev)}
                            className={`inline-flex items-center gap-1 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                                effectiveDockTop
                                    ? "border-sky-400/50 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
                                    : "border-white/15 bg-white/[0.03] text-slate-400 hover:border-sky-400/50 hover:text-sky-300"
                            }`}
                        >
                            {effectiveDockTop ? "▲ DOCK: TOP" : "▼ DOCK: BOT"}
                        </button>
                    </Tooltip>
                    {(conversationId || chatHistory.length > 0 || (chatMode === "guided" && guidedFlow)) && (
                        <button
                            type="button"
                            onClick={onNewChat}
                            className="inline-flex items-center gap-1 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-wider border border-white/15 bg-white/[0.03] hover:border-orange-400/50 hover:bg-orange-500/15 transition-colors cursor-pointer"
                            style={{ color: themeColor }}
                        >
                            + Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Slim 1-line Guided Flow indicator only when Guided mode is active */}
            {chatMode === "guided" && guidedFlow && (
                <div
                    className="px-2.5 py-1 text-[10.5px] border-b flex items-center justify-between gap-2 shrink-0"
                    style={{
                        borderColor: `${themeColor}33`,
                        borderLeft: `2px solid ${themeColor}`,
                        backgroundColor: `${themeColor}0d`,
                    }}
                >
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: themeColor }}>
                        GUIDED // {guidedFlow.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                        {waitingInput ? "Waiting for your reply" : "Flow running…"}
                    </span>
                </div>
            )}

            {/* TOP-DOCKED COMMAND COMPOSER: Zero scrolling required! */}
            {effectiveDockTop && renderCommandComposer("top")}

            {/* Independent Scrollable Message & Brief Surface */}
            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar min-h-0">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col gap-2">
                        {/* Compact Tactical Welcome Strip */}
                        <div
                            className="flex items-center justify-between gap-2.5 px-2.5 py-1.5 border border-white/10 bg-white/[0.02]"
                            style={{ borderLeft: `2px solid ${themeColor}` }}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <RobotOutlined style={{ fontSize: 15, color: themeColor }} />
                                <div className="min-w-0">
                                    <Text strong className="block font-mono text-[10.5px] uppercase tracking-[0.12em] truncate">
                                        {notebookName ? `RAG CONSOLE // ${notebookName}` : "AI STUDIO RAG CONSOLE"}
                                    </Text>
                                    <Text className="text-[10.5px] text-slate-400 block">
                                        {sources.length === 0
                                            ? "Add documents in the left panel (File, URL, Text, Media) to start querying."
                                            : "Type a question in the top command bar or click a suggested prompt below."}
                                    </Text>
                                </div>
                            </div>
                            <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-white/15 text-slate-400 shrink-0 hidden sm:inline">
                                SHORTCUT: [/]
                            </span>
                        </div>

                        {/* Suggested Prompts Grid (high density, 2 columns) */}
                        {chatMode === "free" && suggestedPrompts.length > 0 && canSendFree && (
                            <div className="border border-white/10 bg-white/[0.015] p-2">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <Text className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Contextual Suggested Prompts //
                                    </Text>
                                    <button
                                        type="button"
                                        onClick={() => setShowPrompts((v) => !v)}
                                        className="inline-flex items-center gap-1 h-5 px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] border border-white/15 bg-white/[0.03] text-slate-300 hover:border-orange-400/60 hover:bg-orange-500/15 hover:text-orange-200 transition-colors cursor-pointer"
                                    >
                                        {showPrompts ? "▲ HIDE" : "▼ SHOW"}
                                    </button>
                                </div>
                                {showPrompts && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                        {suggestedPrompts.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                disabled={isChatting}
                                                onClick={() => onSend(p)}
                                                className="text-left px-2 py-1 border border-white/10 bg-white/[0.02] hover:border-orange-400/50 hover:bg-white/[0.04] transition-colors cursor-pointer text-[11px] leading-snug"
                                                style={{ borderLeft: `2px solid ${themeColor}` }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notebook Brief (collapsible with Tactical HUD HIDE / SHOW button) */}
                        {briefSummary && (
                            <div
                                className="p-2 border border-white/10 bg-white/[0.02]"
                                style={{ borderLeft: `2px solid ${themeColor}` }}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <Text className="font-mono text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.14em]">
                                        Notebook Executive Brief //
                                    </Text>
                                    <button
                                        type="button"
                                        onClick={() => setShowBrief((v) => !v)}
                                        className="inline-flex items-center gap-1 h-5 px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] border border-white/15 bg-white/[0.03] text-slate-300 hover:border-orange-400/60 hover:bg-orange-500/15 hover:text-orange-200 transition-colors cursor-pointer"
                                    >
                                        {showBrief ? "▲ HIDE BRIEF" : "▼ SHOW BRIEF"}
                                    </button>
                                </div>
                                {showBrief && (
                                    <div className="studio-markdown prose prose-sm dark:prose-invert max-w-none text-[11.5px] leading-relaxed">
                                        <ReactMarkdown>{briefSummary}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {chatHistory.map((msg, i) => {
                    if (msg.role === "assistant" && !msg.content.trim()) return null;
                    const isUser = msg.role === "user";
                    return (
                        <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
                            <div className={isUser ? "max-w-[85%]" : "w-full"}>
                                <div
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: 0,
                                        border: "1px solid rgba(148, 163, 184, 0.16)",
                                        borderLeft: !isUser ? `2px solid ${themeColor}` : undefined,
                                        borderRight: isUser ? `2px solid ${themeColor}` : undefined,
                                        background: isUser
                                            ? `${themeColor}1f`
                                            : "rgba(148, 163, 184, 0.04)",
                                        wordBreak: "break-word",
                                        fontSize: 11.5,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {/* Compact Tactical Message Header with Inline Actions */}
                                    <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-white/[0.06]">
                                        <span
                                            className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                                            style={{ color: isUser ? themeColor : "#38bdf8" }}
                                        >
                                            {isUser ? "YOU // QUERY" : "ASSISTANT // RAG SYNTHESIS"}
                                        </span>
                                        {!isUser && msg.content.trim() && (
                                            <Space size={4}>
                                                {msg.references && msg.references.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowReferences(showReferences === i ? null : i)}
                                                        className={`inline-flex items-center gap-1 h-5 px-1.5 font-mono text-[9px] font-bold uppercase tracking-wider border transition-colors cursor-pointer tabular-nums ${
                                                            showReferences === i
                                                                ? "border-orange-400/60 bg-orange-500/20 text-orange-300"
                                                                : "border-orange-400/35 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                                                        }`}
                                                    >
                                                        {showReferences === i
                                                            ? `▲ HIDE CITATIONS [${msg.references.length}]`
                                                            : `▼ SHOW CITATIONS [${msg.references.length}]`}
                                                    </button>
                                                )}
                                                <Tooltip title={copiedIdx === i ? "Copied" : "Copy response"} placement="top">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={
                                                            copiedIdx === i ? (
                                                                <CheckOutlined style={{ color: "#52c41a", fontSize: 11 }} />
                                                            ) : (
                                                                <CopyOutlined style={{ fontSize: 11 }} />
                                                            )
                                                        }
                                                        className="!text-[10px] text-slate-400 !p-0 !px-1 !h-5"
                                                        onClick={() => handleCopy(i, msg.content)}
                                                    />
                                                </Tooltip>
                                                {chatMode === "free" && onRegenerate && i === lastAssistantIdx && (
                                                    <Tooltip title="Regenerate response" placement="top">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<RedoOutlined style={{ fontSize: 11 }} />}
                                                            className="!text-[10px] text-slate-400 !p-0 !px-1 !h-5"
                                                            disabled={isChatting}
                                                            onClick={onRegenerate}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {onSaveToNote && (
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<FileAddOutlined style={{ fontSize: 11 }} />}
                                                        className="font-mono !text-[9.5px] text-slate-400 !p-0 !px-1 !h-5"
                                                        onClick={() => onSaveToNote(msg.content)}
                                                    >
                                                        +Note
                                                    </Button>
                                                )}
                                            </Space>
                                        )}
                                    </div>

                                    {!isUser ? (
                                        <MessageContent
                                            content={msg.content}
                                            references={msg.references}
                                            onCitationClick={onCitationClick}
                                        />
                                    ) : (
                                        <div className="studio-markdown prose prose-sm dark:prose-invert max-w-none text-[11.5px] [&_p]:m-0">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {/* Expandable Citations Drawer inline */}
                                {msg.references && msg.references.length > 0 && (
                                    <AnimatePresence>
                                        {showReferences === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                    {msg.references.map((ref, ri) => (
                                                        <div
                                                            key={ri}
                                                            role={ref.chunkId && onCitationClick ? "button" : undefined}
                                                            tabIndex={ref.chunkId && onCitationClick ? 0 : undefined}
                                                            className={`bg-white/[0.03] border border-white/10 rounded-none p-1.5 text-[10.5px] ${
                                                                ref.chunkId && onCitationClick
                                                                    ? "cursor-pointer hover:border-orange-400/50"
                                                                    : ""
                                                            }`}
                                                            style={{ borderLeft: `2px solid ${themeColor}` }}
                                                            onClick={() => {
                                                                if (ref.chunkId && onCitationClick) {
                                                                    onCitationClick(ref.chunkId, ref.docName, ref.score);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between gap-1">
                                                                <Text strong className="text-[10px] truncate" style={{ color: themeColor }}>
                                                                    #{ri + 1} {ref.docName}
                                                                </Text>
                                                                <Tag className="font-mono !text-[8.5px] !m-0 !px-1 !py-0 !rounded-none tabular-nums">
                                                                    {(ref.score * 100).toFixed(0)}%
                                                                </Tag>
                                                            </div>
                                                            <Text className="text-slate-400 text-[9.5px] line-clamp-2 block mt-0.5">
                                                                {ref.content}
                                                            </Text>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isChatting && (
                    <div className="flex justify-start mb-2">
                        <div
                            className="px-3 py-1.5 rounded-none border border-white/10 bg-white/[0.03] flex items-center gap-2 font-mono text-[10px] text-slate-400"
                            style={{ borderLeft: `2px solid ${themeColor}` }}
                        >
                            <Spin indicator={<LoadingOutlined spin />} size="small" />
                            <span>SYNTHESIZING ANSWER FROM SOURCES...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* BOTTOM-DOCKED COMMAND COMPOSER (when user toggles ▼ DOCK: BOT) */}
            {!effectiveDockTop && renderCommandComposer("bottom")}
        </div>
    );
}
