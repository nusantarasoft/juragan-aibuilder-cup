"use client";

import { useCallback, useEffect, useState } from "react";
import {
    studioService,
    type ChatResponse,
    type GuidedTurnResponse,
    type StudioConversation,
    type StudioGuideFlow,
    type StudioMessage,
    type StudioSource,
} from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";

export interface StudioChatMessage {
    role: "user" | "assistant";
    content: string;
    references?: { content: string; docName: string; score: number; chunkId?: string }[];
    timestamp: number;
}

export type StudioChatMode = "free" | "guided";

function mapSourceRefs(refs: unknown): StudioChatMessage["references"] | undefined {
    if (!Array.isArray(refs) || refs.length === 0) return undefined;
    return refs.map((r: Record<string, unknown>) => ({
        content:
            typeof r.content === "string"
                ? r.content
                : `(cuplikan dari ${String(r.filename ?? r.docName ?? "dokumen")})`,
        docName: String(r.filename ?? r.docName ?? "Dokumen"),
        score: typeof r.score === "number" ? r.score : 0,
        chunkId: typeof r.chunkId === "string" ? r.chunkId : undefined,
    }));
}

function mapStudioMessages(messages: StudioMessage[]): StudioChatMessage[] {
    return messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            references: mapSourceRefs(m.source_refs),
            timestamp: new Date(m.created_at).getTime(),
        }));
}

export function buildSuggestedPrompts(
    notebookName: string,
    sources: StudioSource[],
): string[] {
    const indexed = sources.filter((s) => s.parse_status === "done" && (s.chunk_count ?? 0) > 0);
    const first = indexed[0]?.filename;
    const prompts = [
        `Ringkas isi utama notebook "${notebookName}".`,
        first ? `Apa poin penting dari "${first}"?` : "Apa topik utama dari dokumen di notebook ini?",
        "Sebutkan fakta atau angka penting yang ada di sumber.",
    ];
    return prompts.slice(0, 3);
}

export function useStudioChat(
    notebookId: string | null,
    userId: string | undefined,
    sources: StudioSource[] = [],
    notebookName = "",
    selectedSourceIds: string[] = [],
) {
    const message = useAppMessage();
    const [chatHistory, setChatHistory] = useState<StudioChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [isChatting, setIsChatting] = useState(false);
    const [chatMode, setChatMode] = useState<StudioChatMode>("free");
    const [guidedFlow, setGuidedFlow] = useState<StudioGuideFlow | null>(null);
    const [waitingInput, setWaitingInput] = useState(false);
    const [conversations, setConversations] = useState<StudioConversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);

    const suggestedPrompts = buildSuggestedPrompts(notebookName, sources);

    const resetChat = useCallback(() => {
        setChatHistory([]);
        setConversationId(undefined);
        setWaitingInput(false);
    }, []);

    const loadConversations = useCallback(async () => {
        if (!notebookId) return;
        setLoadingConversations(true);
        try {
            const list = await studioService.getConversations(notebookId);
            setConversations(list);
        } catch {
            setConversations([]);
        } finally {
            setLoadingConversations(false);
        }
    }, [notebookId]);

    useEffect(() => {
        if (notebookId) {
            void loadConversations();
        } else {
            setConversations([]);
        }
    }, [notebookId, loadConversations]);

    const applyGuidedReplies = useCallback((res: GuidedTurnResponse) => {
        setConversationId(res.conversationId);
        setWaitingInput(res.waitingForInput);
        if (res.replies?.length) {
            setChatHistory((prev) => [
                ...prev,
                ...res.replies.map((r) => ({
                    role: "assistant" as const,
                    content: r.content,
                    references: r.references,
                    timestamp: Date.now(),
                })),
            ]);
        }
    }, []);

    const resumeConversation = useCallback(
        async (convId: string) => {
            setIsChatting(true);
            try {
                const conv = await studioService.getConversation(convId);
                setChatMode("free");
                setGuidedFlow(null);
                setWaitingInput(false);
                setConversationId(conv.id);
                setChatHistory(mapStudioMessages(conv.messages ?? []));
            } catch (e: unknown) {
                const err = e as { message?: string };
                message.error(err.message || "Gagal memuat percakapan");
            } finally {
                setIsChatting(false);
            }
        },
        [message],
    );

    const initGuidedFromPublished = useCallback(
        async (published: StudioGuideFlow | null) => {
            if (!notebookId || !published) return false;
            setChatMode("guided");
            setGuidedFlow(published);
            resetChat();
            setIsChatting(true);
            try {
                const res = await studioService.startGuidedSession(notebookId, published.id, userId);
                applyGuidedReplies(res);
                return true;
            } catch (e: unknown) {
                const err = e as { message?: string };
                message.error(err.message || "Could not start guided session");
                setChatMode("free");
                setGuidedFlow(null);
                return false;
            } finally {
                setIsChatting(false);
            }
        },
        [notebookId, userId, resetChat, applyGuidedReplies, message],
    );

    const restartGuidedSession = useCallback(async () => {
        if (!guidedFlow) {
            resetChat();
            return false;
        }
        return initGuidedFromPublished(guidedFlow);
    }, [guidedFlow, initGuidedFromPublished, resetChat]);

    const switchToFreeChat = useCallback(() => {
        setChatMode("free");
        setGuidedFlow(null);
        resetChat();
    }, [resetChat]);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!notebookId || !text.trim()) return;
            const userMsg: StudioChatMessage = {
                role: "user",
                content: text.trim(),
                timestamp: Date.now(),
            };
            setChatHistory((prev) => [...prev, userMsg]);
            setIsChatting(true);

            try {
                if (chatMode === "guided" && guidedFlow) {
                    if (!conversationId) {
                        setChatHistory((prev) => prev.slice(0, -1));
                        const started = await initGuidedFromPublished(guidedFlow);
                        if (!started) return;
                        message.info("Sesi guided dimulai. Kirim pesan Anda lagi.");
                        return;
                    }
                    const res = await studioService.guidedChat(
                        notebookId,
                        guidedFlow.id,
                        conversationId,
                        text.trim(),
                        userId,
                    );
                    applyGuidedReplies(res);
                } else {
                    const result: ChatResponse = await studioService.chat(
                        notebookId,
                        text.trim(),
                        conversationId,
                        userId,
                        {
                            sourceIds:
                                selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
                        },
                    );
                    setConversationId(result.conversationId);
                    setChatHistory((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: result.answer,
                            references: result.references,
                            timestamp: Date.now(),
                        },
                    ]);
                    void loadConversations();
                }
            } catch (e: unknown) {
                const err = e as { message?: string };
                message.error(err.message || "Chat failed");
                setChatHistory((prev) => prev.slice(0, -1));
            } finally {
                setIsChatting(false);
            }
        },
        [
            notebookId,
            userId,
            chatMode,
            guidedFlow,
            conversationId,
            applyGuidedReplies,
            initGuidedFromPublished,
            loadConversations,
            message,
            selectedSourceIds,
        ],
    );

    return {
        chatHistory,
        setChatHistory,
        conversationId,
        isChatting,
        chatMode,
        setChatMode,
        guidedFlow,
        setGuidedFlow,
        waitingInput,
        resetChat,
        initGuidedFromPublished,
        restartGuidedSession,
        switchToFreeChat,
        sendMessage,
        conversations,
        loadingConversations,
        loadConversations,
        resumeConversation,
        suggestedPrompts,
    };
}
