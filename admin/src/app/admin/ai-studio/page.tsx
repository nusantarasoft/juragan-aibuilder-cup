"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { useAppMessage } from "@/hooks/useAppMessage";
import { mediaService, MediaFile } from "@/lib/mediaService";
import { studioService, StudioNotebook, StudioSource, type StudioGuideFlow } from "@/lib/studioService";
import {
    Card,
    Row,
    Col,
    List,
    Typography,
    Input,
    Button,
    Avatar,
    Space,
    Spin,
    Modal,
    Empty,
    Breadcrumb,
    Tag,
    Progress,
    Upload,
    Tabs,
    Popconfirm,
    Tooltip,
    Alert,
    Badge,
    Select,
    Segmented,
} from "antd";
import type { UploadProps } from "antd";
import {
    RobotOutlined,
    SendOutlined,
    FileOutlined,
    LoadingOutlined,
    FileTextOutlined,
    FundProjectionScreenOutlined,
    DownloadOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    BookOutlined,
    CloudUploadOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    SyncOutlined,
    ExclamationCircleOutlined,
    AppstoreAddOutlined,
    ApartmentOutlined,
    SettingOutlined,
    ShareAltOutlined,
    ReloadOutlined,
    CompressOutlined,
    ExpandOutlined,
} from "@ant-design/icons";
import SourcesPanel from "./SourcesPanel";
import StudioOutputsPanel from "./StudioOutputsPanel";
import NotesPanel from "./NotesPanel";
import { normalizeNotebookIcon } from "./notebookIcon";
import ConfigureChatModal from "./ConfigureChatModal";
import ChunkPreviewDrawer from "./ChunkPreviewDrawer";
import SourceDetailDrawer from "./SourceDetailDrawer";
import {
    indexedSourceIds,
    selectAllSourceIds,
    shouldAutoGenerateBrief,
    syncSelectedSourceIds,
    toggleSourceId,
} from "./notebookSourceSelection";
import {
    getSourceProgressPercent,
    getSourceStageLabel,
    getSourceStatusDetail,
    getSourceStatusTag,
    isSourceInProgress,
    seedSourceStatusMap,
    summarizeSources,
    trackSourceStatusChanges,
} from "./studioSourceStatus";
import { useStudioChat } from "./useStudioChat";
import AIAssistantPanel from "./AIAssistantPanel";
import { useAuth } from "@/context/AuthContext";
import { useStudioUserId } from "./useStudioUserId";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useAdminLayout } from "@/components/layout/CMSLayoutContext";
import { getVOTheme } from "@/components/layout/voTheme";
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';
import { motion, AnimatePresence } from "framer-motion";

const { Text } = Typography;
const { TextArea } = Input;

// ── Main Component ───────────────────────────────────────────────────

export default function AIStudioPage() {
    const message = useAppMessage();
    const { themeColor } = usePreferencesStore();
    const darkMode = useAdminLayout((s) => s.darkMode);
    const t = getVOTheme(darkMode);
    const { loading: authLoading } = useAuth();
    const userId = useStudioUserId();

    // ── Notebook State ──
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [activeNotebook, setActiveNotebook] = useState<StudioNotebook | null>(null);
    const [loadingNotebooks, setLoadingNotebooks] = useState(true);
    const [creatingNotebook, setCreatingNotebook] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState("");
    const [newNotebookDesc, setNewNotebookDesc] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editIcon, setEditIcon] = useState("📓");
    const [savingEdit, setSavingEdit] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [shareLoading, setShareLoading] = useState(false);

    // ── Source State ──
    const [sources, setSources] = useState<StudioSource[]>([]);
    const [loadingSources, setLoadingSources] = useState(false);
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [addingMedia, setAddingMedia] = useState<Set<string>>(new Set());
    const [publishedGuideFlow, setPublishedGuideFlow] = useState<StudioGuideFlow | null>(null);
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
    const previouslyIndexedIdsRef = useRef<string[]>([]);
    const [configureChatOpen, setConfigureChatOpen] = useState(false);
    const [savingChatConfig, setSavingChatConfig] = useState(false);
    const [chunkPreview, setChunkPreview] = useState<{ chunkId: string; docName: string; score: number } | null>(null);
    const [sourceDetailId, setSourceDetailId] = useState<string | null>(null);
    const [rightTab, setRightTab] = useState<"studio" | "notes">("studio");
    const [notesRefresh, setNotesRefresh] = useState(0);
    const briefGeneratedRef = useRef<Set<string>>(new Set());

    const sourceStats = summarizeSources(sources);

    const {
        chatHistory,
        conversationId,
        isChatting,
        chatMode,
        guidedFlow,
        waitingInput,
        resetChat,
        initGuidedFromPublished,
        restartGuidedSession,
        sendMessage,
        regenerateLast,
        language: chatLanguage,
        setLanguage: setChatLanguage,
        setChatMode,
        setGuidedFlow,
        switchToFreeChat,
        conversations,
        loadingConversations,
        resumeConversation,
        suggestedPrompts,
    } = useStudioChat(
        activeNotebook?.id ?? null,
        userId,
        sources,
        activeNotebook?.name ?? "",
        selectedSourceIds,
    );

    // ── Layout State ──
    const [showSources, setShowSources] = useState(true);
    const [showStudio, setShowStudio] = useState(true);
    const [layoutResetSignal, setLayoutResetSignal] = useState(0);

    const handleResetStudioLayout = useCallback(() => {
        setShowSources(true);
        setShowStudio(true);
        setRightTab("studio");
        setLayoutResetSignal((n) => n + 1);
    }, []);

    useEffect(() => {
        const onReset = () => handleResetStudioLayout();
        window.addEventListener("cms-reset-layout", onReset);
        return () => window.removeEventListener("cms-reset-layout", onReset);
    }, [handleResetStudioLayout]);

    // ── Poll timer ──
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevSourceStatusRef = useRef<Map<string, string>>(new Map());
    const pollNotebookIdRef = useRef<string | null>(null);

    const selectNotebook = useCallback(async (notebook: StudioNotebook) => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        prevSourceStatusRef.current = new Map();
        pollNotebookIdRef.current = notebook.id;
        setActiveNotebook(notebook);
        resetChat();
        setChatMode("free");
        setGuidedFlow(null);
        setPublishedGuideFlow(null);
        setSelectedSourceIds([]);
        previouslyIndexedIdsRef.current = [];
        try {
            const list = await studioService.getSourceStatus(notebook.id);
            prevSourceStatusRef.current = seedSourceStatusMap(list);
            setSources(list);
            const indexedIds = indexedSourceIds(list);
            setSelectedSourceIds(indexedIds);
            previouslyIndexedIdsRef.current = indexedIds;
        } catch {
            /* ignore initial load error */
        }
        try {
            const published = await studioService.getPublishedGuideFlow(notebook.id);
            if (published) {
                setPublishedGuideFlow(published);
            }
        } catch { /* no published flow */ }
    }, [resetChat, setChatMode, setGuidedFlow]);

    const loadNotebooks = useCallback(async () => {
        if (!userId) {
            setLoadingNotebooks(false);
            return;
        }
        setLoadingNotebooks(true);
        try {
            const list = await studioService.getNotebooks(userId);
            setNotebooks(list);
            if (list.length > 0 && !pollNotebookIdRef.current) {
                void selectNotebook(list[0]);
            }
        } catch (e) {
            console.error("Failed to load notebooks:", e);
            message.error("Failed to load notebooks");
        } finally {
            setLoadingNotebooks(false);
        }
    }, [userId, message, selectNotebook]);

    // ── Load Notebooks ──
    useEffect(() => {
        if (authLoading) return;
        loadNotebooks();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [authLoading, loadNotebooks]);

    const startPublishedGuidedFlow = async () => {
        if (!publishedGuideFlow) return;
        await initGuidedFromPublished(publishedGuideFlow);
    };

    const handleNewChat = async () => {
        if (chatMode === "guided" && guidedFlow) {
            await restartGuidedSession();
        } else {
            resetChat();
        }
    };

    const notifySourceChange = useCallback(
        (type: 'success' | 'error' | 'warning', text: string) => {
            if (type === 'success') message.success(text);
            else if (type === 'error') message.error(text);
            else message.warning(text);
        },
        [message],
    );

    const applySourcesUpdate = useCallback(
        (list: StudioSource[], options?: { seedOnly?: boolean }) => {
            if (options?.seedOnly) {
                prevSourceStatusRef.current = seedSourceStatusMap(list);
            } else {
                prevSourceStatusRef.current = trackSourceStatusChanges(
                    prevSourceStatusRef.current,
                    list,
                    notifySourceChange,
                );
            }
            setSources(list);

            const indexedIds = indexedSourceIds(list);
            setSelectedSourceIds((prev) => {
                const next = syncSelectedSourceIds(prev, indexedIds, previouslyIndexedIdsRef.current);
                previouslyIndexedIdsRef.current = indexedIds;
                return next;
            });

            const notebookId = pollNotebookIdRef.current;
            const stillIndexing = list.some(isSourceInProgress);
            const stats = summarizeSources(list);
            const cfg = activeNotebook?.context_config as { brief_summary?: string } | undefined;
            if (
                notebookId &&
                shouldAutoGenerateBrief({
                    allIndexed: stats.allIndexed,
                    indexedCount: stats.indexed,
                    alreadyTriggered: briefGeneratedRef.current.has(notebookId),
                    hasBrief: Boolean(cfg?.brief_summary?.trim()),
                })
            ) {
                briefGeneratedRef.current.add(notebookId);
                void studioService.generateBrief(notebookId).then((res) => {
                    if (!res.cached && activeNotebook?.id === notebookId) {
                        setActiveNotebook((nb) =>
                            nb
                                ? {
                                      ...nb,
                                      context_config: {
                                          ...(nb.context_config as object),
                                          brief_summary: res.summary,
                                      },
                                  }
                                : nb,
                        );
                    }
                }).catch(() => { /* optional */ });
            }
            if (notebookId && stillIndexing && !pollRef.current) {
                pollRef.current = setInterval(async () => {
                    try {
                        const updated = await studioService.getSourceStatus(notebookId);
                        prevSourceStatusRef.current = trackSourceStatusChanges(
                            prevSourceStatusRef.current,
                            updated,
                            notifySourceChange,
                        );
                        setSources(updated);
                        if (!updated.some(isSourceInProgress) && pollRef.current) {
                            clearInterval(pollRef.current);
                            pollRef.current = null;
                        }
                    } catch { /* ignore */ }
                }, 3000);
            } else if (!stillIndexing && pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        },
        [notifySourceChange, activeNotebook?.context_config, activeNotebook?.id],
    );

    const loadSourceStatus = useCallback(
        async (notebookId: string, seedOnly = false) => {
            pollNotebookIdRef.current = notebookId;
            setLoadingSources(true);
            try {
                const list = await studioService.getSourceStatus(notebookId);
                applySourcesUpdate(list, { seedOnly });
            } catch (e) {
                console.error("Failed to load sources:", e);
            } finally {
                setLoadingSources(false);
            }
        },
        [applySourcesUpdate],
    );

    // ── Actions ──

    const handleCreateNotebook = async () => {
        if (!newNotebookName.trim()) return;
        setCreatingNotebook(true);
        try {
            if (!userId) {
                message.error("Sign in to create a notebook");
                return;
            }
            const notebook = await studioService.createNotebook(newNotebookName, newNotebookDesc, userId);
            message.success(`Notebook "${newNotebookName}" created`);
            setNewNotebookName("");
            setNewNotebookDesc("");
            setShowCreateModal(false);
            await loadNotebooks();
            selectNotebook(notebook);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to create notebook");
        } finally {
            setCreatingNotebook(false);
        }
    };

    const openEditNotebook = () => {
        if (!activeNotebook) return;
        setEditName(activeNotebook.name);
        setEditDesc(activeNotebook.description ?? "");
        setEditIcon(normalizeNotebookIcon(activeNotebook.icon));
        setShowEditModal(true);
    };

    const handleUpdateNotebook = async () => {
        if (!activeNotebook || !editName.trim()) return;
        setSavingEdit(true);
        try {
            const updated = await studioService.updateNotebook(activeNotebook.id, {
                name: editName.trim(),
                description: editDesc,
                icon: normalizeNotebookIcon(editIcon),
            });
            setActiveNotebook(updated);
            setNotebooks((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
            message.success("Notebook updated");
            setShowEditModal(false);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to update notebook");
        } finally {
            setSavingEdit(false);
        }
    };

    const shareUrl =
        shareToken && typeof window !== "undefined"
            ? `${window.location.origin}/shared/studio/${shareToken}`
            : "";

    const openShareModal = async () => {
        if (!activeNotebook) return;
        setShowShareModal(true);
        setShareLoading(true);
        try {
            const res = await studioService.createShareLink(activeNotebook.id);
            setShareToken(res.token);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to create share link");
        } finally {
            setShareLoading(false);
        }
    };

    const handleRevokeShare = async () => {
        if (!activeNotebook) return;
        setShareLoading(true);
        try {
            await studioService.revokeShareLink(activeNotebook.id);
            setShareToken(null);
            message.success("Sharing disabled");
            setShowShareModal(false);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to disable sharing");
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyShareLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard?.writeText(shareUrl);
            message.success("Link copied");
        } catch {
            message.error("Failed to copy link");
        }
    };

    const handleDeleteNotebook = async (notebookId: string) => {
        try {
            await studioService.deleteNotebook(notebookId);
            message.success("Notebook deleted");
            if (activeNotebook?.id === notebookId) {
                setActiveNotebook(null);
                setSources([]);
                resetChat();
            }
            loadNotebooks();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to delete");
        }
    };

    const handleAddMediaFromLibrary = async (mediaId: string) => {
        if (!activeNotebook) return;
        setAddingMedia(prev => new Set(prev).add(mediaId));
        try {
            await studioService.addMediaToNotebook(activeNotebook.id, mediaId);
            message.success("Source added — indexing started");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to add source");
        } finally {
            setAddingMedia(prev => { const s = new Set(prev); s.delete(mediaId); return s; });
        }
    };

    const openMediaModal = async () => {
        setShowAddMediaModal(true);
        setLoadingMedia(true);
        try {
            const files = await mediaService.getMedia({ limit: 50 });
            setMediaFiles(files);
        } catch {
            message.error("Failed to load media library");
        } finally {
            setLoadingMedia(false);
        }
    };

    const handleUploadFile: UploadProps['customRequest'] = async (options) => {
        if (!activeNotebook) return;
        const { file, onSuccess, onError } = options;
        try {
            await studioService.uploadFileToNotebook(activeNotebook.id, file as File);
            onSuccess?.({}, file);
            message.success(`"${(file as File).name}" uploaded — indexing started`);
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            onError?.(e as Error);
            message.error(e instanceof Error ? e.message : "Upload failed");
        }
    };

    const handleRemoveSource = async (sourceId: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.removeSource(activeNotebook.id, sourceId);
            message.success("Source removed");
            loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to remove source");
        }
    };

    const sourcesIndexed = sourceStats.anyIndexed;
    const sourcesIndexing = sourceStats.inProgress > 0;

    const handleChatSend = async (text: string) => {
        if (!activeNotebook || !text.trim()) return;
        if (sources.length === 0) {
            message.warning("No sources yet. Add files or media first.");
            return;
        }
        if (!sourcesIndexed && !sourcesIndexing) {
            message.warning("Sources are not indexed yet. Wait for indexing to finish or click Reindex.");
            return;
        }
        if (chatMode === "guided" && !waitingInput && chatHistory.length > 0) {
            message.warning("Guided flow is not waiting for input yet.");
            return;
        }
        await sendMessage(text.trim());
    };

    const handleReindexSource = async (sourceId: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.reindexSource(activeNotebook.id, sourceId);
            message.success("Reindexing started");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Reindex failed");
        }
    };

    const handleToggleSource = (sourceId: string, checked: boolean) => {
        setSelectedSourceIds((prev) => toggleSourceId(prev, sourceId, checked));
    };

    const handleSelectAllSources = (checked: boolean) => {
        setSelectedSourceIds(selectAllSourceIds(checked, indexedSourceIds(sources)));
    };

    const handleImportUrl = async (url: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.importUrl(activeNotebook.id, url);
            message.success("URL imported — indexing started");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to import URL");
        }
    };

    const handleAddText = async (title: string, content: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.addTextSource(activeNotebook.id, title, content);
            message.success("Text added — indexing started");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to add text");
        }
    };

    const handleSaveChatToNote = async (content: string) => {
        if (!activeNotebook || !content.trim()) return;
        try {
            await studioService.createNote(activeNotebook.id, {
                title: content.trim().slice(0, 60) || "Note",
                content,
                origin: "chat",
            });
            message.success("Saved to Notes");
            setNotesRefresh((n) => n + 1);
            setShowStudio(true);
            setRightTab("notes");
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to save note");
        }
    };

    const handleNoteConvertedToSource = () => {
        if (activeNotebook) void loadSourceStatus(activeNotebook.id);
    };

    const handleSaveChatInstruction = async (instruction: string) => {
        if (!activeNotebook) {
            message.info("Select or create a notebook first to save chat instructions");
            setConfigureChatOpen(false);
            return;
        }
        setSavingChatConfig(true);
        try {
            const updated = await studioService.updateNotebook(activeNotebook.id, {
                chatInstruction: instruction,
            });
            setActiveNotebook(updated);
            message.success("Chat instructions saved");
            setConfigureChatOpen(false);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setSavingChatConfig(false);
        }
    };

    const chatInstruction =
        (activeNotebook?.context_config as { chat_instruction?: string } | undefined)?.chat_instruction ?? "";
    const briefSummary =
        (activeNotebook?.context_config as { brief_summary?: string } | undefined)?.brief_summary ?? "";

    // ── MAIN RENDER ──

    const notebookOptions =
        notebooks.length > 0
            ? notebooks.map((nb) => ({
                  value: nb.id,
                  label: `${normalizeNotebookIcon(nb.icon)} ${nb.name}`,
              }))
            : [{ value: "__empty__", label: "No notebooks yet", disabled: true }];

    const panelCardStyle: React.CSSProperties = {
        background: t.cardBg,
        boxShadow: "none",
        border: `1px solid ${t.border}`,
        borderRadius: 0,
    };

    const STUDIO_QUICK_LINKS = [
        { code: "PTN", label: "Partner", href: "/admin/ai-studio/partner" },
        { code: "KR", label: "Research", href: "/admin/ai-studio/knowledge-research" },
        { code: "SHW", label: "Showcase", href: "/admin/ai-studio/showcase" },
        { code: "MSG", label: "Messages", href: "/admin/ai-studio/messages" },
        { code: "CFG", label: "Settings", href: "/admin/ai-studio/settings" },
    ];

    const isFocusChat = !showSources && !showStudio;
    const isModifiedLayout = !showSources || !showStudio || rightTab !== "studio";

    return (
        <CMSLayout
            title="AI Studio"
            subTitle="Sources · Chat · Studio — Tactical RAG Command Deck"
            extra={[
                <div key="studio-quick-nav" className="hidden lg:flex items-center gap-1 font-mono">
                    {STUDIO_QUICK_LINKS.map((item) => (
                        <a
                            key={item.code}
                            href={item.href}
                            className="px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider border border-white/10 bg-white/[0.02] hover:border-orange-400/50 hover:text-orange-300 transition-colors"
                            style={{ color: t.textSecondary }}
                        >
                            <span style={{ color: themeColor }} className="font-bold mr-0.5">
                                {item.code}
                            </span>
                            · {item.label}
                        </a>
                    ))}
                </div>,
            ]}
        >
            <div
                className="flex flex-col gap-1.5 overflow-hidden"
                style={{
                    height: "calc(100vh - 142px)",
                    minHeight: 460,
                    maxHeight: "calc(100vh - 142px)",
                }}
            >
                {/* Compact 36px Tactical Notebook Command Ribbon */}
                <div
                    style={{
                        ...panelCardStyle,
                        borderTop: `2px solid ${themeColor}`,
                        padding: "4px 8px",
                    }}
                    className="shrink-0 flex flex-wrap items-center gap-1.5"
                >
                    <AnimatedTooltip
                        content={
                            showSources
                                ? "Hide Sources panel (Left Dock)"
                                : "Show Sources panel (Left Dock)"
                        }
                        position="bottom"
                    >
                        <button
                            type="button"
                            data-testid="toggle-sources-panel"
                            onClick={() => setShowSources(!showSources)}
                            className={`inline-flex items-center gap-1.5 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                                showSources
                                    ? "border-orange-400/60 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25"
                                    : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-orange-400/50 hover:text-orange-300"
                            }`}
                        >
                            {showSources ? (
                                <>
                                    <MenuFoldOutlined style={{ fontSize: 10 }} />
                                    <span>◀ HIDE SOURCES</span>
                                </>
                            ) : (
                                <>
                                    <MenuUnfoldOutlined style={{ fontSize: 10 }} />
                                    <span>▶ SHOW SOURCES</span>
                                </>
                            )}
                        </button>
                    </AnimatedTooltip>
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-orange-400 hidden sm:inline">
                        NB //
                    </span>
                    <Select
                        size="small"
                        className="min-w-[160px] flex-1 max-w-xs"
                        placeholder="Select notebook"
                        loading={loadingNotebooks}
                        value={activeNotebook?.id}
                        options={notebookOptions}
                        onChange={(id) => {
                            const nb = notebooks.find((n) => n.id === id);
                            if (nb) void selectNotebook(nb);
                        }}
                    />
                    <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setShowCreateModal(true)}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                        className="!text-[10.5px] !h-6 !px-2 font-mono uppercase tracking-wider"
                    >
                        Notebook
                    </Button>
                    {activeNotebook && (
                        <AnimatedTooltip content="Edit notebook" position="bottom">
                            <Button icon={<EditOutlined />} size="small" className="!h-6 !w-6 !p-0" onClick={openEditNotebook} />
                        </AnimatedTooltip>
                    )}
                    {activeNotebook && (
                        <AnimatedTooltip content="Share notebook" position="bottom">
                            <Button icon={<ShareAltOutlined />} size="small" className="!h-6 !w-6 !p-0" onClick={() => void openShareModal()} />
                        </AnimatedTooltip>
                    )}
                    {activeNotebook && (
                        <Popconfirm title="Delete notebook?" onConfirm={() => void handleDeleteNotebook(activeNotebook.id)}>
                            <Button danger icon={<DeleteOutlined />} size="small" className="!h-6 !w-6 !p-0" />
                        </Popconfirm>
                    )}

                    {/* Workspace Layout Controls: RESET LAYOUT + FOCUS CHAT */}
                    <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-white/15">
                        <AnimatedTooltip
                            content="Reset AI Studio layout to default 3-pane workspace (Sources + Chat + Studio)"
                            position="bottom"
                        >
                            <button
                                type="button"
                                data-testid="studio-reset-layout"
                                onClick={handleResetStudioLayout}
                                className={`inline-flex items-center gap-1.5 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                                    isModifiedLayout
                                        ? "border-orange-400/70 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
                                        : "border-white/20 bg-white/[0.04] text-slate-300 hover:border-orange-400/60 hover:bg-orange-500/15 hover:text-orange-200"
                                }`}
                            >
                                <ReloadOutlined style={{ fontSize: 10 }} />
                                <span>RESET LAYOUT</span>
                            </button>
                        </AnimatedTooltip>
                        <AnimatedTooltip
                            content={
                                isFocusChat
                                    ? "Exit Focus Chat mode and restore side panels"
                                    : "Focus Chat mode — hide side panels for full-width RAG conversation"
                            }
                            position="bottom"
                        >
                            <button
                                type="button"
                                data-testid="studio-focus-chat"
                                onClick={() => {
                                    if (isFocusChat) {
                                        setShowSources(true);
                                        setShowStudio(true);
                                    } else {
                                        setShowSources(false);
                                        setShowStudio(false);
                                    }
                                }}
                                className={`inline-flex items-center gap-1.5 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                                    isFocusChat
                                        ? "border-sky-400/70 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30"
                                        : "border-sky-400/35 bg-sky-500/[0.08] text-sky-300 hover:border-sky-400/65 hover:bg-sky-500/15 hover:text-white"
                                }`}
                            >
                                {isFocusChat ? (
                                    <ExpandOutlined style={{ fontSize: 10 }} />
                                ) : (
                                    <CompressOutlined style={{ fontSize: 10 }} />
                                )}
                                <span>FOCUS CHAT</span>
                            </button>
                        </AnimatedTooltip>
                    </div>

                    <div
                        className="hidden md:flex items-center gap-2.5 ml-auto mr-1 font-mono text-[9.5px] uppercase tracking-[0.12em]"
                        style={{ color: t.textSecondary }}
                    >
                        <span className="tabular-nums">
                            NB: <strong style={{ color: t.textPrimary }}>{notebooks.length}</strong>
                        </span>
                        <span className="tabular-nums">
                            SRC:{" "}
                            <strong style={{ color: sourceStats.anyIndexed ? "#4ade80" : t.textPrimary }}>
                                {sourceStats.indexed}/{sourceStats.total}
                            </strong>
                        </span>
                    </div>
                    <AnimatedTooltip
                        content={
                            showStudio
                                ? "Hide Studio & Notes panel (Right Dock)"
                                : "Show Studio & Notes panel (Right Dock)"
                        }
                        position="bottom"
                    >
                        <button
                            type="button"
                            data-testid="toggle-studio-panel"
                            onClick={() => setShowStudio(!showStudio)}
                            className={`md:ml-0 ml-auto inline-flex items-center gap-1.5 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                                showStudio
                                    ? "border-purple-400/60 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25"
                                    : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-purple-400/50 hover:text-purple-300"
                            }`}
                        >
                            {showStudio ? (
                                <>
                                    <span>HIDE STUDIO ▶</span>
                                    <MenuUnfoldOutlined style={{ fontSize: 10 }} />
                                </>
                            ) : (
                                <>
                                    <MenuFoldOutlined style={{ fontSize: 10 }} />
                                    <span>◀ SHOW STUDIO</span>
                                </>
                            )}
                        </button>
                    </AnimatedTooltip>
                </div>

                {/* Viewport-Locked 3-Column Tactical Surface (Zero outer scroll) */}
                <div className="flex gap-1.5 flex-1 min-h-0 overflow-hidden">
                    {/* LEFT: Sources (or Collapsed Vertical Dock Rail) */}
                    <AnimatePresence mode="wait">
                        {showSources ? (
                            <motion.div
                                key="sources-open"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 264, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="flex flex-col shrink-0 overflow-hidden h-full"
                                style={{ width: 264, minWidth: 264 }}
                            >
                                <div
                                    className="h-full flex flex-col min-h-0 overflow-hidden"
                                    style={{ ...panelCardStyle, borderTop: "2px solid #fb923c" }}
                                >
                                    <SourcesPanel
                                        themeColor={themeColor}
                                        sources={sources}
                                        sourceStats={sourceStats}
                                        loading={loadingSources}
                                        selectedSourceIds={selectedSourceIds}
                                        onToggleSource={handleToggleSource}
                                        onSelectAll={handleSelectAllSources}
                                        onOpenMedia={() => {
                                            if (!activeNotebook) {
                                                setShowCreateModal(true);
                                                return;
                                            }
                                            void openMediaModal();
                                        }}
                                        onUpload={handleUploadFile}
                                        onImportUrl={handleImportUrl}
                                        onAddText={handleAddText}
                                        onRemove={(id) => void handleRemoveSource(id)}
                                        onReindex={(id) => void handleReindexSource(id)}
                                        onConfigureChat={() => setConfigureChatOpen(true)}
                                        onOpenSource={(id) => setSourceDetailId(id)}
                                        onCollapse={() => setShowSources(false)}
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <Tooltip title="Expand Sources panel" placement="right">
                                <button
                                    key="sources-rail"
                                    type="button"
                                    onClick={() => setShowSources(true)}
                                    style={{ ...panelCardStyle, borderTop: "2px solid #fb923c", width: 26 }}
                                    className="shrink-0 h-full flex flex-col items-center justify-between py-2.5 px-1 hover:border-orange-400/60 hover:bg-orange-500/10 transition-colors cursor-pointer group"
                                >
                                    <span className="font-mono text-[10px] font-bold text-orange-400">▶</span>
                                    <span
                                        className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-orange-300 select-none"
                                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                                    >
                                        SHOW SOURCES [{sources.length}]
                                    </span>
                                    <span className="h-1.5 w-1.5 bg-orange-400" />
                                </button>
                            </Tooltip>
                        )}
                    </AnimatePresence>

                    {/* CENTER: Chat (Viewport-locked, top-docked composer by default) */}
                    <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-hidden">
                        <div
                            className="h-full flex flex-col min-h-0 overflow-hidden"
                            style={{ ...panelCardStyle, borderTop: "2px solid #38bdf8" }}
                        >
                            {!activeNotebook && (
                                <div
                                    style={{
                                        padding: "4px 10px",
                                        background: t.surfaceBg,
                                        borderBottom: `1px solid ${t.border}`,
                                        borderLeft: "2px solid #fb923c",
                                    }}
                                    className="flex items-center justify-between gap-2 shrink-0"
                                >
                                    <Text style={{ fontSize: 10.5, color: t.textSecondary }} className="truncate">
                                        Select or create a notebook to store sources & conversations.
                                    </Text>
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setShowCreateModal(true)}
                                        className="!text-[10px] !h-5 !px-2"
                                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                                    >
                                        Create Notebook
                                    </Button>
                                </div>
                            )}
                            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                                <AIAssistantPanel
                                    themeColor={themeColor}
                                    notebookName={activeNotebook?.name}
                                    briefSummary={briefSummary}
                                    sources={sources}
                                    sourceStats={sourceStats}
                                    publishedGuideFlow={publishedGuideFlow}
                                    chatHistory={chatHistory}
                                    conversationId={conversationId}
                                    isChatting={isChatting}
                                    chatMode={chatMode}
                                    guidedFlow={guidedFlow}
                                    waitingInput={waitingInput}
                                    suggestedPrompts={suggestedPrompts}
                                    conversations={conversations}
                                    loadingConversations={loadingConversations}
                                    onSend={(text) => void handleChatSend(text)}
                                    onNewChat={() => void handleNewChat()}
                                    onSwitchToFree={switchToFreeChat}
                                    onStartGuided={() => void startPublishedGuidedFlow()}
                                    onSetChatMode={setChatMode}
                                    onResumeConversation={(id) => void resumeConversation(id)}
                                    onCitationClick={(chunkId, docName, score) => setChunkPreview({ chunkId, docName, score })}
                                    onSaveToNote={(content) => void handleSaveChatToNote(content)}
                                    onRegenerate={() => void regenerateLast()}
                                    language={chatLanguage}
                                    onSetLanguage={setChatLanguage}
                                    layoutResetSignal={layoutResetSignal}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Studio / Notes (or Collapsed Vertical Dock Rail) */}
                    <AnimatePresence mode="wait">
                        {showStudio ? (
                            <motion.div
                                key="studio-open"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 304, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="shrink-0 overflow-hidden h-full"
                                style={{ width: 304, minWidth: 304 }}
                            >
                                <div
                                    className="h-full flex flex-col min-h-0 overflow-hidden"
                                    style={{ ...panelCardStyle, borderTop: "2px solid #a855f7" }}
                                >
                                    <div className="px-2 pt-1.5 pb-1 border-b border-white/10 shrink-0 flex items-center gap-1.5">
                                        <Segmented
                                            block
                                            size="small"
                                            className="flex-1"
                                            value={rightTab}
                                            onChange={(v) => setRightTab(v as "studio" | "notes")}
                                            options={[
                                                { label: "Studio", value: "studio" },
                                                { label: "Notes", value: "notes" },
                                            ]}
                                        />
                                        <Tooltip title="Hide Studio & Notes panel" placement="bottom">
                                            <button
                                                type="button"
                                                onClick={() => setShowStudio(false)}
                                                className="inline-flex items-center gap-1 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] border border-purple-400/50 bg-purple-500/15 text-purple-300 hover:border-purple-400 hover:bg-purple-500/25 transition-colors cursor-pointer shrink-0"
                                            >
                                                <span>HIDE ▶</span>
                                                <MenuUnfoldOutlined style={{ fontSize: 9 }} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-hidden">
                                        {rightTab === "studio" ? (
                                            <StudioOutputsPanel
                                                themeColor={themeColor}
                                                notebookId={activeNotebook?.id ?? null}
                                                notebookName={activeNotebook?.name}
                                                sourcesReady={sourceStats.anyIndexed}
                                                selectedSourceIds={selectedSourceIds}
                                                onNoteSaved={() => setNotesRefresh((n) => n + 1)}
                                                onAskNode={(q) => void handleChatSend(q)}
                                            />
                                        ) : (
                                            <NotesPanel
                                                themeColor={themeColor}
                                                notebookId={activeNotebook?.id ?? null}
                                                refreshSignal={notesRefresh}
                                                onSourceAdded={handleNoteConvertedToSource}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <Tooltip title="Expand Studio & Notes panel" placement="left">
                                <button
                                    key="studio-rail"
                                    type="button"
                                    onClick={() => setShowStudio(true)}
                                    style={{ ...panelCardStyle, borderTop: "2px solid #a855f7", width: 26 }}
                                    className="shrink-0 h-full flex flex-col items-center justify-between py-2.5 px-1 hover:border-purple-400/60 hover:bg-purple-500/10 transition-colors cursor-pointer group"
                                >
                                    <span className="font-mono text-[10px] font-bold text-purple-400">◀</span>
                                    <span
                                        className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-purple-300 select-none"
                                        style={{ writingMode: "vertical-rl" }}
                                    >
                                        SHOW STUDIO · NOTES
                                    </span>
                                    <span className="h-1.5 w-1.5 bg-purple-400" />
                                </button>
                            </Tooltip>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── MODALS ── */}

            {/* Create Notebook Modal */}
            <Modal
                title={<span><BookOutlined style={{ color: themeColor, marginRight: 8 }} />Create Notebook</span>}
                open={showCreateModal}
                onCancel={() => setShowCreateModal(false)}
                onOk={handleCreateNotebook}
                confirmLoading={creatingNotebook}
                okText="Create"
                okButtonProps={{ style: { backgroundColor: themeColor } }}
                centered
            >
                <div className="py-2 space-y-3">
                    <div>
                        <Text strong className="font-mono text-[10px] uppercase tracking-wider block mb-1">Notebook Name</Text>
                        <Input
                            size="small"
                            value={newNotebookName}
                            onChange={e => setNewNotebookName(e.target.value)}
                            placeholder="e.g. Q4 Research Analysis"
                            onPressEnter={handleCreateNotebook}
                        />
                    </div>
                    <div>
                        <Text strong className="font-mono text-[10px] uppercase tracking-wider block mb-1">Description (optional)</Text>
                        <TextArea
                            size="small"
                            rows={3}
                            value={newNotebookDesc}
                            onChange={e => setNewNotebookDesc(e.target.value)}
                            placeholder="What is this notebook about?"
                        />
                    </div>
                </div>
            </Modal>

            {/* Share Notebook Modal */}
            <Modal
                title={<span><ShareAltOutlined style={{ color: themeColor, marginRight: 8 }} />Share Notebook</span>}
                open={showShareModal}
                onCancel={() => setShowShareModal(false)}
                footer={[
                    <Button key="revoke" size="small" danger loading={shareLoading} onClick={() => void handleRevokeShare()}>
                        Disable sharing
                    </Button>,
                    <Button key="close" size="small" onClick={() => setShowShareModal(false)}>Close</Button>,
                ]}
                centered
            >
                <div className="py-2 space-y-2.5">
                    <Text type="secondary" className="text-[11px] block">
                        Anyone with this link can view the notebook (read-only): generated outputs and source list,
                        without modifying anything. Disable sharing at any time to revoke the link.
                    </Text>
                    <Space.Compact style={{ width: "100%" }}>
                        <Input size="small" readOnly value={shareLoading ? "Generating link…" : shareUrl} />
                        <Button
                            size="small"
                            type="primary"
                            icon={<DownloadOutlined />}
                            disabled={!shareUrl || shareLoading}
                            onClick={() => void handleCopyShareLink()}
                            style={{ backgroundColor: themeColor, borderColor: themeColor }}
                        >
                            Copy
                        </Button>
                    </Space.Compact>
                    {shareUrl && (
                        <a href={shareUrl} target="_blank" rel="noreferrer" className="font-mono text-[10.5px] uppercase" style={{ color: themeColor }}>
                            Open public preview →
                        </a>
                    )}
                </div>
            </Modal>

            {/* Edit Notebook Modal */}
            <Modal
                title={<span><EditOutlined style={{ color: themeColor, marginRight: 8 }} />Edit Notebook</span>}
                open={showEditModal}
                onCancel={() => setShowEditModal(false)}
                onOk={handleUpdateNotebook}
                confirmLoading={savingEdit}
                okText="Save"
                okButtonProps={{ style: { backgroundColor: themeColor }, disabled: !editName.trim() }}
                centered
            >
                <div className="py-2 space-y-3">
                    <div>
                        <Text strong className="font-mono text-[10px] uppercase tracking-wider block mb-1">Icon</Text>
                        <Row gutter={[8, 8]} align="middle">
                            <Col>
                                <Input
                                    size="small"
                                    value={editIcon}
                                    onChange={(e) => setEditIcon(e.target.value.slice(0, 4))}
                                    style={{ width: 52, textAlign: "center", fontSize: 15 }}
                                    maxLength={4}
                                />
                            </Col>
                            <Col flex="auto">
                                <Space size={4} wrap>
                                    {["📓", "📕", "📗", "📘", "📙", "🧠", "💡", "📊", "🛒", "🍽️", "🏪", "🚀"].map((emo) => (
                                        <Button
                                            key={emo}
                                            size="small"
                                            type={editIcon === emo ? "primary" : "default"}
                                            style={editIcon === emo ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                                            onClick={() => setEditIcon(emo)}
                                        >
                                            {emo}
                                        </Button>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                    </div>
                    <div>
                        <Text strong className="font-mono text-[10px] uppercase tracking-wider block mb-1">Notebook Name</Text>
                        <Input
                            size="small"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Notebook name"
                            onPressEnter={handleUpdateNotebook}
                        />
                    </div>
                    <div>
                        <Text strong className="font-mono text-[10px] uppercase tracking-wider block mb-1">Description (optional)</Text>
                        <TextArea
                            size="small"
                            rows={3}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="What is this notebook about?"
                        />
                    </div>
                </div>
            </Modal>

            {/* Add from Media Library Modal */}
            <Modal
                title={<span><AppstoreAddOutlined style={{ color: themeColor, marginRight: 8 }} />Add from Media Library</span>}
                open={showAddMediaModal}
                onCancel={() => setShowAddMediaModal(false)}
                footer={null}
                width={560}
                centered
            >
                {loadingMedia ? (
                    <div className="flex justify-center py-8"><Spin size="small" /></div>
                ) : (
                    <List
                        size="small"
                        className="max-h-[360px] overflow-y-auto"
                        dataSource={mediaFiles}
                        renderItem={item => {
                            const alreadyAdded = sources.some(s => s.media_id === item.id);
                            return (
                                <List.Item
                                    actions={[
                                        alreadyAdded ? (
                                            <Tag key="added" color="success">Added</Tag>
                                        ) : (
                                            <Button
                                                key="add"
                                                type="primary"
                                                size="small"
                                                icon={<PlusOutlined />}
                                                loading={addingMedia.has(item.id)}
                                                onClick={() => handleAddMediaFromLibrary(item.id)}
                                                style={{ backgroundColor: themeColor }}
                                            >
                                                Add
                                            </Button>
                                        )
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar size="small" icon={<FileOutlined />} shape="square" style={{ backgroundColor: `${themeColor}22`, color: themeColor }} />}
                                        title={<Text className="text-[11.5px] font-medium">{item.filename}</Text>}
                                        description={<Text className="font-mono text-[10px] text-gray-400">{item.mime_type}</Text>}
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Modal>

            <ConfigureChatModal
                open={configureChatOpen}
                loading={savingChatConfig}
                initialInstruction={chatInstruction}
                onCancel={() => setConfigureChatOpen(false)}
                onSave={handleSaveChatInstruction}
            />

            <ChunkPreviewDrawer
                chunkId={chunkPreview?.chunkId ?? null}
                docName={chunkPreview?.docName}
                score={chunkPreview?.score}
                onClose={() => setChunkPreview(null)}
            />

            <SourceDetailDrawer
                notebookId={activeNotebook?.id ?? null}
                sourceId={sourceDetailId}
                themeColor={themeColor}
                onClose={() => setSourceDetailId(null)}
                onOpenChunk={(chunkId, docName) => {
                    setChunkPreview({ chunkId, docName, score: 0 });
                }}
            />
        </CMSLayout>
    );
}
