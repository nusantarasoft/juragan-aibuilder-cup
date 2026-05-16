"use client";

import { useCallback, useState } from "react";
import { studioService, type ChatResponse, type GuidedTurnResponse, type StudioGuideFlow } from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";

export interface StudioChatMessage {
    role: "user" | "assistant";
    content: string;
    references?: { content: string; docName: string; score: number }[];
    timestamp: number;
}

export type StudioChatMode = "free" | "guided";

export function useStudioChat(notebookId: string | null, userId: string | undefined) {
    const message = useAppMessage();
    const [chatHistory, setChatHistory] = useState<StudioChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [isChatting, setIsChatting] = useState(false);
    const [chatMode, setChatMode] = useState<StudioChatMode>("free");
    const [guidedFlow, setGuidedFlow] = useState<StudioGuideFlow | null>(null);
    const [waitingInput, setWaitingInput] = useState(false);

    const resetChat = useCallback(() => {
        setChatHistory([]);
        setConversationId(undefined);
        setWaitingInput(false);
    }, []);

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

    /** New guided conversation (same published flow) — for production chat "New Chat". */
    const restartGuidedSession = useCallback(async () => {
        if (!guidedFlow) {
            resetChat();
            return false;
        }
        return initGuidedFromPublished(guidedFlow);
    }, [guidedFlow, initGuidedFromPublished, resetChat]);

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
                }
            } catch (e: unknown) {
                const err = e as { message?: string };
                message.error(err.message || "Chat failed");
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
            message,
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
        sendMessage,
    };
}
