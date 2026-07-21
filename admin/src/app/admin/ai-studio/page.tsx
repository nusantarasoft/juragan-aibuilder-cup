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
} from "@ant-design/icons";
import SourcesPanel from "./SourcesPanel";
import StudioOutputsPanel from "./StudioOutputsPanel";
import NotesPanel from "./NotesPanel";
import ConfigureChatModal from "./ConfigureChatModal";
import ChunkPreviewDrawer from "./ChunkPreviewDrawer";
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
import ReactMarkdown from 'react-markdown';
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';
import { motion, AnimatePresence } from "framer-motion";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const { Title, Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const { TextArea } = Input;

// ── Main Component ───────────────────────────────────────────────────

export default function AIStudioPage() {
    const message = useAppMessage();
    const { themeColor } = usePreferencesStore();
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
    const [configureChatOpen, setConfigureChatOpen] = useState(false);
    const [savingChatConfig, setSavingChatConfig] = useState(false);
    const [chunkPreview, setChunkPreview] = useState<{ chunkId: string; docName: string; score: number } | null>(null);
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

    // ── Poll timer ──
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevSourceStatusRef = useRef<Map<string, string>>(new Map());
    const pollNotebookIdRef = useRef<string | null>(null);

    const loadNotebooks = useCallback(async () => {
        if (!userId) {
            setLoadingNotebooks(false);
            return;
        }
        setLoadingNotebooks(true);
        try {
            const list = await studioService.getNotebooks(userId);
            setNotebooks(list);
        } catch (e) {
            console.error("Failed to load notebooks:", e);
            message.error("Gagal memuat notebooks");
        } finally {
            setLoadingNotebooks(false);
        }
    }, [userId, message]);

    // ── Load Notebooks ──
    useEffect(() => {
        if (authLoading) return;
        loadNotebooks();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [authLoading, loadNotebooks]);

    const selectNotebook = async (notebook: StudioNotebook) => {
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
        await loadSourceStatus(notebook.id, true);
        try {
            const published = await studioService.getPublishedGuideFlow(notebook.id);
            if (published) {
                setPublishedGuideFlow(published);
            }
        } catch { /* no published flow */ }
    };

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
            setSelectedSourceIds((prev) => syncSelectedSourceIds(prev, indexedIds));

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
        setEditIcon(activeNotebook.icon || "📓");
        setShowEditModal(true);
    };

    const handleUpdateNotebook = async () => {
        if (!activeNotebook || !editName.trim()) return;
        setSavingEdit(true);
        try {
            const updated = await studioService.updateNotebook(activeNotebook.id, {
                name: editName.trim(),
                description: editDesc,
                icon: editIcon,
            });
            setActiveNotebook(updated);
            setNotebooks((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
            message.success("Notebook diperbarui");
            setShowEditModal(false);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal memperbarui notebook");
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
            message.error(e instanceof Error ? e.message : "Gagal membuat tautan berbagi");
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
            message.success("Berbagi dinonaktifkan");
            setShowShareModal(false);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menonaktifkan berbagi");
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyShareLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard?.writeText(shareUrl);
            message.success("Tautan disalin");
        } catch {
            message.error("Gagal menyalin tautan");
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
            message.success("Sumber ditambahkan — indeksasi dimulai");
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
            message.success(`"${(file as File).name}" diupload — indeksasi dimulai`);
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
            message.warning("Belum ada sumber. Tambahkan file atau media terlebih dahulu.");
            return;
        }
        if (!sourcesIndexed && !sourcesIndexing) {
            message.warning("Sumber belum terindeks. Tunggu proses selesai atau gunakan Reindex.");
            return;
        }
        if (chatMode === "guided" && !waitingInput && chatHistory.length > 0) {
            message.warning("Guided flow belum menunggu input.");
            return;
        }
        await sendMessage(text.trim());
    };

    const handleReindexSource = async (sourceId: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.reindexSource(activeNotebook.id, sourceId);
            message.success("Indeksasi ulang dimulai");
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
            message.success("URL diimport — indeksasi dimulai");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal import URL");
        }
    };

    const handleAddText = async (title: string, content: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.addTextSource(activeNotebook.id, title, content);
            message.success("Teks ditambahkan — indeksasi dimulai");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menambah teks");
        }
    };

    const handleSaveChatToNote = async (content: string) => {
        if (!activeNotebook || !content.trim()) return;
        try {
            await studioService.createNote(activeNotebook.id, {
                title: content.trim().slice(0, 60) || "Catatan",
                content,
                origin: "chat",
            });
            message.success("Disimpan ke Notes");
            setNotesRefresh((n) => n + 1);
            setShowStudio(true);
            setRightTab("notes");
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menyimpan catatan");
        }
    };

    const handleNoteConvertedToSource = () => {
        if (activeNotebook) void loadSourceStatus(activeNotebook.id);
    };

    const handleSaveChatInstruction = async (instruction: string) => {
        if (!activeNotebook) return;
        setSavingChatConfig(true);
        try {
            const updated = await studioService.updateNotebook(activeNotebook.id, {
                chatInstruction: instruction,
            });
            setActiveNotebook(updated);
            message.success("Instruksi chat disimpan");
            setConfigureChatOpen(false);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menyimpan");
        } finally {
            setSavingChatConfig(false);
        }
    };

    const chatInstruction =
        (activeNotebook?.context_config as { chat_instruction?: string } | undefined)?.chat_instruction ?? "";
    const briefSummary =
        (activeNotebook?.context_config as { brief_summary?: string } | undefined)?.brief_summary ?? "";

    // ── MAIN RENDER ──

    const notebookOptions = notebooks.map((nb) => ({
        value: nb.id,
        label: `${nb.icon || "📓"} ${nb.name}`,
    }));

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>AI Studio</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Sources · Chat · Studio — notebook knowledge base ala NotebookLM"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={15}
                    sequential={true}
                />
            }
        >
            <div className="flex flex-col gap-3 h-full">
                {/* Header: notebook dropdown + actions */}
                <Card size="small" style={glass} className="dark:!bg-[rgba(15,15,23,0.6)]">
                    <div className="flex flex-wrap items-center gap-3">
                        <AnimatedTooltip content={showSources ? "Sembunyikan Sources" : "Tampilkan Sources"}>
                            <Button type="text" icon={showSources ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                onClick={() => setShowSources(!showSources)} size="small" />
                        </AnimatedTooltip>
                        <Select
                            className="min-w-[200px] flex-1 max-w-md"
                            placeholder="Pilih notebook"
                            loading={loadingNotebooks}
                            value={activeNotebook?.id}
                            options={notebookOptions}
                            onChange={(id) => {
                                const nb = notebooks.find((n) => n.id === id);
                                if (nb) void selectNotebook(nb);
                            }}
                            disabled={!userId || notebooks.length === 0}
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}
                            style={{ backgroundColor: themeColor, borderColor: themeColor }}>
                            Notebook
                        </Button>
                        {activeNotebook && (
                            <AnimatedTooltip content="Edit notebook">
                                <Button icon={<EditOutlined />} size="small" onClick={openEditNotebook} />
                            </AnimatedTooltip>
                        )}
                        {activeNotebook && (
                            <AnimatedTooltip content="Bagikan notebook">
                                <Button icon={<ShareAltOutlined />} size="small" onClick={() => void openShareModal()} />
                            </AnimatedTooltip>
                        )}
                        {activeNotebook && (
                            <Popconfirm title="Hapus notebook?" onConfirm={() => void handleDeleteNotebook(activeNotebook.id)}>
                                <Button danger icon={<DeleteOutlined />} size="small" />
                            </Popconfirm>
                        )}
                        <AnimatedTooltip content={showStudio ? "Sembunyikan Studio" : "Tampilkan Studio"}>
                            <Button type="text" icon={showStudio ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                onClick={() => setShowStudio(!showStudio)} size="small" className="ml-auto" />
                        </AnimatedTooltip>
                    </div>
                </Card>

                <div className="flex gap-3 flex-1 min-h-0" style={{ minHeight: 560 }}>
                    {/* LEFT: Sources */}
                    <AnimatePresence mode="wait">
                        {showSources && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 280, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="flex flex-col shrink-0 overflow-hidden"
                                style={{ width: 280, minWidth: 280 }}
                            >
                                <Card size="small" className="h-full flex flex-col dark:!bg-transparent"
                                    style={{ background: "transparent", boxShadow: "none", border: `1px solid ${themeColor}22` }}
                                    styles={{ body: { padding: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" } }}>
                                    {activeNotebook ? (
                                        <SourcesPanel
                                            themeColor={themeColor}
                                            sources={sources}
                                            sourceStats={sourceStats}
                                            loading={loadingSources}
                                            selectedSourceIds={selectedSourceIds}
                                            onToggleSource={handleToggleSource}
                                            onSelectAll={handleSelectAllSources}
                                            onOpenMedia={() => void openMediaModal()}
                                            onUpload={handleUploadFile}
                                            onImportUrl={handleImportUrl}
                                            onAddText={handleAddText}
                                            onRemove={(id) => void handleRemoveSource(id)}
                                            onReindex={(id) => void handleReindexSource(id)}
                                            onConfigureChat={() => setConfigureChatOpen(true)}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
                                            <BookOutlined style={{ fontSize: 36, color: themeColor }} />
                                            <Text type="secondary" className="text-xs text-center">Buat atau pilih notebook</Text>
                                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}
                                                style={{ backgroundColor: themeColor }}>Buat Notebook</Button>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CENTER: Chat */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <Card size="small" className="h-full flex flex-col dark:!bg-transparent"
                            style={{ background: "transparent", boxShadow: "none", border: `1px solid ${themeColor}22` }}
                            styles={{ body: { padding: 0, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 } }}>
                            {activeNotebook ? (
                                <AIAssistantPanel
                                    themeColor={themeColor}
                                    notebookName={activeNotebook.name}
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
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-80 p-6">
                                    <Title level={4} className="!mb-0">
                                        <AuroraText colors={[themeColor, `${themeColor}cc`]}>Welcome to AI Studio</AuroraText>
                                    </Title>
                                    <Text className="text-gray-400 text-sm text-center max-w-md">
                                        Tambahkan sumber, chat di tengah, generate artefak di panel Studio — layout seperti NotebookLM.
                                    </Text>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* RIGHT: Studio */}
                    <AnimatePresence mode="wait">
                        {showStudio && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="shrink-0 overflow-hidden"
                                style={{ width: 320, minWidth: 320 }}
                            >
                                <Card size="small" className="h-full dark:!bg-transparent"
                                    style={{ background: "transparent", boxShadow: "none", border: `1px solid ${themeColor}22` }}
                                    styles={{ body: { padding: 0, height: "100%", overflow: "hidden" } }}>
                                    <div className="flex flex-col h-full">
                                        <div className="px-2 pt-2">
                                            <Segmented
                                                block
                                                size="small"
                                                value={rightTab}
                                                onChange={(v) => setRightTab(v as "studio" | "notes")}
                                                options={[
                                                    { label: "Studio", value: "studio" },
                                                    { label: "Notes", value: "notes" },
                                                ]}
                                            />
                                        </div>
                                        <div className="flex-1 min-h-0">
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
                                </Card>
                            </motion.div>
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
                <div className="py-4 space-y-4">
                    <div>
                        <Text strong className="text-xs block mb-1.5">Notebook Name</Text>
                        <Input
                            size="large"
                            value={newNotebookName}
                            onChange={e => setNewNotebookName(e.target.value)}
                            placeholder="e.g. Q4 Research Analysis"
                            onPressEnter={handleCreateNotebook}
                        />
                    </div>
                    <div>
                        <Text strong className="text-xs block mb-1.5">Description (optional)</Text>
                        <TextArea
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
                title={<span><ShareAltOutlined style={{ color: themeColor, marginRight: 8 }} />Bagikan Notebook</span>}
                open={showShareModal}
                onCancel={() => setShowShareModal(false)}
                footer={[
                    <Button key="revoke" danger loading={shareLoading} onClick={() => void handleRevokeShare()}>
                        Nonaktifkan berbagi
                    </Button>,
                    <Button key="close" onClick={() => setShowShareModal(false)}>Tutup</Button>,
                ]}
                centered
            >
                <div className="py-2 space-y-3">
                    <Text type="secondary" className="text-xs block">
                        Siapa pun dengan tautan ini dapat melihat notebook (hanya-baca): output, daftar sumber,
                        tanpa bisa mengubah apa pun. Nonaktifkan kapan saja untuk mematikan tautan.
                    </Text>
                    <Space.Compact style={{ width: "100%" }}>
                        <Input readOnly value={shareLoading ? "Membuat tautan…" : shareUrl} />
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            disabled={!shareUrl || shareLoading}
                            onClick={() => void handleCopyShareLink()}
                            style={{ backgroundColor: themeColor, borderColor: themeColor }}
                        >
                            Salin
                        </Button>
                    </Space.Compact>
                    {shareUrl && (
                        <a href={shareUrl} target="_blank" rel="noreferrer" className="text-xs" style={{ color: themeColor }}>
                            Buka pratinjau publik →
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
                okText="Simpan"
                okButtonProps={{ style: { backgroundColor: themeColor }, disabled: !editName.trim() }}
                centered
            >
                <div className="py-4 space-y-4">
                    <div>
                        <Text strong className="text-xs block mb-1.5">Ikon</Text>
                        <Row gutter={[8, 8]} align="middle">
                            <Col>
                                <Input
                                    value={editIcon}
                                    onChange={(e) => setEditIcon(e.target.value.slice(0, 4))}
                                    style={{ width: 64, textAlign: "center", fontSize: 20 }}
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
                        <Text strong className="text-xs block mb-1.5">Nama Notebook</Text>
                        <Input
                            size="large"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nama notebook"
                            onPressEnter={handleUpdateNotebook}
                        />
                    </div>
                    <div>
                        <Text strong className="text-xs block mb-1.5">Deskripsi (opsional)</Text>
                        <TextArea
                            rows={3}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Tentang notebook ini?"
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
                width={600}
                centered
            >
                {loadingMedia ? (
                    <div className="flex justify-center py-12"><Spin size="large" /></div>
                ) : (
                    <List
                        className="max-h-[400px] overflow-y-auto"
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
                                        avatar={<Avatar icon={<FileOutlined />} shape="square" style={{ backgroundColor: `${themeColor}22`, color: themeColor }} />}
                                        title={<Text className="text-[13px]">{item.filename}</Text>}
                                        description={<Text className="text-[11px] text-gray-400">{item.mime_type}</Text>}
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
        </CMSLayout>
    );
}
