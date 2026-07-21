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
    const [language, setLanguage] = useState<string>("id");

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

    /**
     * Runs a free (RAG) chat turn for `text`, streaming into a fresh assistant
     * bubble. When `appendUser` is false the user message is assumed to already
     * be in history (used by regenerate).
     */
    const runFreeChat = useCallback(
        async (text: string, appendUser: boolean) => {
            if (!notebookId || !text.trim()) return;
            const sourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : undefined;
            if (appendUser) {
                setChatHistory((prev) => [
                    ...prev,
                    { role: "user", content: text.trim(), timestamp: Date.now() },
                ]);
            }
            setIsChatting(true);

            // Append an empty assistant bubble that fills in as tokens stream.
            setChatHistory((prev) => [
                ...prev,
                { role: "assistant", content: "", timestamp: Date.now() },
            ]);

            const updateAssistant = (patch: Partial<StudioChatMessage>) => {
                setChatHistory((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.role === "assistant") {
                        copy[copy.length - 1] = { ...last, ...patch };
                    }
                    return copy;
                });
            };

            try {
                let acc = "";
                try {
                    await studioService.chatStream(
                        notebookId,
                        text.trim(),
                        {
                            onMeta: (m) => setConversationId(m.conversationId),
                            onDelta: (t) => {
                                acc += t;
                                updateAssistant({ content: acc });
                            },
                            onDone: (d) => {
                                setConversationId(d.conversationId);
                                updateAssistant({
                                    content: d.answer || acc,
                                    references: d.references,
                                });
                            },
                        },
                        { conversationId, userId, sourceIds, language },
                    );
                    void loadConversations();
                } catch {
                    // Streaming unavailable → fall back to single-shot chat.
                    const result: ChatResponse = await studioService.chat(
                        notebookId,
                        text.trim(),
                        conversationId,
                        userId,
                        { sourceIds, language },
                    );
                    setConversationId(result.conversationId);
                    updateAssistant({
                        content: result.answer,
                        references: result.references,
                    });
                    void loadConversations();
                }
            } catch (e: unknown) {
                message.error(e instanceof Error ? e.message : "Chat failed");
                // Drop the empty assistant bubble (and the just-added user bubble).
                setChatHistory((prev) => {
                    const copy = [...prev];
                    if (copy[copy.length - 1]?.role === "assistant") copy.pop();
                    if (appendUser && copy[copy.length - 1]?.role === "user") copy.pop();
                    return copy;
                });
            } finally {
                setIsChatting(false);
            }
        },
        [
            notebookId,
            userId,
            conversationId,
            loadConversations,
            message,
            selectedSourceIds,
            language,
        ],
    );

    const sendMessage = useCallback(
        async (text: string) => {
            if (!notebookId || !text.trim()) return;
            if (chatMode === "guided" && guidedFlow) {
                setChatHistory((prev) => [
                    ...prev,
                    { role: "user", content: text.trim(), timestamp: Date.now() },
                ]);
                setIsChatting(true);
                try {
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
                } catch (e: unknown) {
                    message.error(e instanceof Error ? e.message : "Chat failed");
                    setChatHistory((prev) => prev.slice(0, -1));
                } finally {
                    setIsChatting(false);
                }
                return;
            }
            await runFreeChat(text, true);
        },
        [
            notebookId,
            userId,
            chatMode,
            guidedFlow,
            conversationId,
            applyGuidedReplies,
            initGuidedFromPublished,
            message,
            runFreeChat,
        ],
    );

    /** Re-run the last user question (free mode only), replacing the last answer. */
    const regenerateLast = useCallback(async () => {
        if (chatMode !== "free" || isChatting) return;
        let lastUser: string | null = null;
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === "user") {
                lastUser = chatHistory[i].content;
                break;
            }
        }
        if (!lastUser) return;
        // Drop trailing assistant answers so the fresh one replaces them.
        setChatHistory((prev) => {
            const copy = [...prev];
            while (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
            return copy;
        });
        await runFreeChat(lastUser, false);
    }, [chatMode, isChatting, chatHistory, runFreeChat]);

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
        regenerateLast,
        language,
        setLanguage,
        conversations,
        loadingConversations,
        loadConversations,
        resumeConversation,
        suggestedPrompts,
    };
}
