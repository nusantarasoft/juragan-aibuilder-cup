"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { mediaService, MediaFile } from "@/lib/mediaService";
import { studioService, StudioNotebook, StudioSource, ChatResponse } from "@/lib/studioService";
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
    message,
    Modal,
    Empty,
    Divider,
    Breadcrumb,
    Tag,
    Progress,
    Upload,
    Tabs,
    Badge,
    Popconfirm,
    Tooltip,
    Dropdown
} from "antd";
import type { UploadProps } from "antd";
import {
    RobotOutlined,
    SendOutlined,
    FileOutlined,
    LoadingOutlined,
    FileTextOutlined,
    FundProjectionScreenOutlined,
    PictureOutlined,
    DownloadOutlined,
    AudioOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    PlusOutlined,
    DeleteOutlined,
    BookOutlined,
    CloudUploadOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    SyncOutlined,
    ExclamationCircleOutlined,
    FileAddOutlined,
    AppstoreAddOutlined,
    InboxOutlined,
    MessageOutlined,
    HistoryOutlined,
    ArrowLeftOutlined,
    EditOutlined,
    MoreOutlined,
    ApartmentOutlined
} from "@ant-design/icons";
import GuideFlowsPanel from "./GuideFlowsPanel";
import { useStudioChat } from "./useStudioChat";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from 'react-markdown';
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';
import { motion, AnimatePresence } from "framer-motion";

const { Title, Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const { TextArea } = Input;
const { Dragger } = Upload;

// ── Types ────────────────────────────────────────────────────────────

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    references?: { content: string; docName: string; score: number }[];
    timestamp: number;
}

// ── Main Component ───────────────────────────────────────────────────

export default function AIStudioPage() {
    const { themeColor } = usePreferencesStore();
    const { user: contextUser, loading: authLoading } = useAuth();
    const authUser = useAuthStore((s) => s.user);
    const userId = authUser?.id ?? contextUser?.id;

    // ── Notebook State ──
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [activeNotebook, setActiveNotebook] = useState<StudioNotebook | null>(null);
    const [loadingNotebooks, setLoadingNotebooks] = useState(true);
    const [creatingNotebook, setCreatingNotebook] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState("");
    const [newNotebookDesc, setNewNotebookDesc] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    // ── Source State ──
    const [sources, setSources] = useState<StudioSource[]>([]);
    const [loadingSources, setLoadingSources] = useState(false);
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [addingMedia, setAddingMedia] = useState<Set<string>>(new Set());

    const [chatInput, setChatInput] = useState("");
    const [showReferences, setShowReferences] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [useFreeChat, setUseFreeChat] = useState(false);

    const {
        chatHistory,
        conversationId,
        isChatting,
        chatMode,
        guidedFlow,
        waitingInput,
        resetChat,
        initGuidedFromPublished,
        sendMessage,
        setChatMode,
        setGuidedFlow,
    } = useStudioChat(activeNotebook?.id ?? null, userId);

    // ── Layout State ──
    const [showSources, setShowSources] = useState(true);
    const [showChat, setShowChat] = useState(true);
    const [studioMainTab, setStudioMainTab] = useState<"workspace" | "flows">("workspace");

    // ── Report State ──
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportQuery, setReportQuery] = useState("");
    const [generatedReport, setGeneratedReport] = useState("");
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // ── Poll timer ──
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    }, [userId]);

    // ── Load Notebooks ──
    useEffect(() => {
        if (authLoading) return;
        loadNotebooks();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [authLoading, loadNotebooks]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const selectNotebook = async (notebook: StudioNotebook) => {
        setActiveNotebook(notebook);
        resetChat();
        setUseFreeChat(false);
        setChatMode("free");
        setGuidedFlow(null);
        setShowReferences(null);
        setStudioMainTab("workspace");
        await loadSourceStatus(notebook.id);
        if (!useFreeChat) {
            try {
                const published = await studioService.getPublishedGuideFlow(notebook.id);
                if (published) {
                    await initGuidedFromPublished(published);
                }
            } catch { /* no published flow */ }
        }
    };

    const loadSourceStatus = async (notebookId: string) => {
        setLoadingSources(true);
        try {
            const list = await studioService.getSourceStatus(notebookId);
            setSources(list);

            if (list.some((s: StudioSource) => s.parse_status === 'parsing' || s.parse_status === 'pending')) {
                startPolling(notebookId);
            } else if (pollRef.current) {
                clearInterval(pollRef.current);
            }
        } catch (e) {
            console.error("Failed to load sources:", e);
        } finally {
            setLoadingSources(false);
        }
    };

    const startPolling = (notebookId: string) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const list = await studioService.getSourceStatus(notebookId);
                setSources(list);
                if (!list.some((s: StudioSource) => s.parse_status === 'parsing' || s.parse_status === 'pending')) {
                    if (pollRef.current) clearInterval(pollRef.current);
                }
            } catch { /* ignore */ }
        }, 4000);
    };

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
        } catch (e: any) {
            message.error(e.message || "Failed to create notebook");
        } finally {
            setCreatingNotebook(false);
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
        } catch (e: any) {
            message.error(e.message || "Failed to delete");
        }
    };

    const handleAddMediaFromLibrary = async (mediaId: string) => {
        if (!activeNotebook) return;
        setAddingMedia(prev => new Set(prev).add(mediaId));
        try {
            await studioService.addMediaToNotebook(activeNotebook.id, mediaId);
            message.success("Source added to notebook");
            loadSourceStatus(activeNotebook.id);
            startPolling(activeNotebook.id);
        } catch (e: any) {
            message.error(e.message || "Failed to add source");
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
        const { file, onSuccess, onError } = options as any;
        try {
            await studioService.uploadFileToNotebook(activeNotebook.id, file);
            onSuccess?.({}, file);
            message.success(`"${(file as File).name}" uploaded`);
            loadSourceStatus(activeNotebook.id);
            startPolling(activeNotebook.id);
        } catch (e: any) {
            onError?.(e);
            message.error(e.message || "Upload failed");
        }
    };

    const handleRemoveSource = async (sourceId: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.removeSource(activeNotebook.id, sourceId);
            message.success("Source removed");
            loadSourceStatus(activeNotebook.id);
        } catch (e: any) {
            message.error(e.message || "Failed to remove source");
        }
    };

    const sourcesIndexed = sources.some((s) => s.parse_status === 'done' && (s.chunk_count ?? 0) > 0);
    const sourcesIndexing = sources.some((s) => s.parse_status === 'parsing' || s.parse_status === 'pending');

    const handleChatSend = async () => {
        if (!chatInput.trim() || !activeNotebook) return;
        if (sources.length === 0) {
            message.warning("No sources yet. Add files or media first.");
            return;
        }
        if (!sourcesIndexed && !sourcesIndexing) {
            message.warning("Sources are not indexed yet. Wait for indexing or use Reindex.");
            return;
        }
        if (chatMode === 'guided' && !waitingInput && chatHistory.length > 0) {
            message.warning("Guided flow is not waiting for input.");
            return;
        }
        const q = chatInput;
        setChatInput("");
        await sendMessage(q);
    };

    const handleReindexSource = async (sourceId: string) => {
        if (!activeNotebook) return;
        try {
            await studioService.reindexSource(activeNotebook.id, sourceId);
            message.success("Reindex started");
            startPolling(activeNotebook.id);
            loadSourceStatus(activeNotebook.id);
        } catch (e: any) {
            message.error(e.message || "Reindex failed");
        }
    };

    const handleGenerateReport = async () => {
        if (!reportQuery.trim() || !activeNotebook) return;
        setIsGeneratingReport(true);
        try {
            const report = await studioService.generateReport(activeNotebook.id, reportQuery);
            setGeneratedReport(report);
        } catch (e: any) {
            message.error(e.message || "Failed to generate report");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // ── Parse Status Helpers ──

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />;
            case 'parsing': return <SyncOutlined spin style={{ color: themeColor, fontSize: 14 }} />;
            case 'error': return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />;
            default: return <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />;
        }
    };

    const getStatusTag = (source: StudioSource) => {
        if (source.parse_status === 'done' && (source.chunk_count ?? 0) > 0) {
            return <Tag color="success" className="text-[10px] m-0 leading-tight px-1.5">Indexed ({source.chunk_count})</Tag>;
        }
        switch (source.parse_status) {
            case 'done': return <Tag color="warning" className="text-[10px] m-0 leading-tight px-1.5">No chunks</Tag>;
            case 'parsing': return <Tag color="processing" className="text-[10px] m-0 leading-tight px-1.5">Indexing</Tag>;
            case 'error': return <Tag color="error" className="text-[10px] m-0 leading-tight px-1.5">Error</Tag>;
            default: return <Tag className="text-[10px] m-0 leading-tight px-1.5">Pending</Tag>;
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // ── Renderers ──

    const renderNotebookList = () => (
        <div className="flex flex-col gap-1 p-2">
            {loadingNotebooks || authLoading ? (
                <motion.div className="flex justify-center py-8"><Spin /></motion.div>
            ) : !userId ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-xs text-gray-400">Sign in to view notebooks</span>}
                    className="my-8"
                />
            ) : notebooks.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-xs text-gray-400">No notebooks yet</span>}
                    className="my-8"
                />
            ) : (
                notebooks.map(nb => (
                    <motion.div
                        key={nb.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group cursor-pointer rounded-lg p-2.5 transition-all duration-200 ${activeNotebook?.id === nb.id
                            ? 'bg-[rgba(var(--theme-color-rgb,139,92,246),0.1)] border border-[rgba(var(--theme-color-rgb,139,92,246),0.3)]'
                            : 'hover:bg-[rgba(var(--theme-color-rgb,139,92,246),0.05)] border border-transparent'
                            }`}
                        onClick={() => selectNotebook(nb)}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <span className="text-lg mt-0.5">{nb.icon || '📓'}</span>
                                <div className="min-w-0 flex-1">
                                    <Text strong className="text-[13px] block truncate">{nb.name}</Text>
                                    <Text className="text-[10px] text-gray-400 block truncate">{nb.description || 'No description'}</Text>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Tag className="text-[9px] m-0 leading-tight px-1 py-0 border-0 bg-gray-100 dark:bg-gray-800 text-gray-500">
                                            {nb.source_count || 0} sources
                                        </Tag>
                                    </div>
                                </div>
                            </div>
                            <Popconfirm
                                title="Delete this notebook?"
                                description="All sources and conversations will be lost."
                                onConfirm={(e) => { e?.stopPropagation(); handleDeleteNotebook(nb.id); }}
                                onCancel={(e) => e?.stopPropagation()}
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:!text-red-500 flex items-center justify-center w-6 h-6"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </Popconfirm>
                        </div>
                    </motion.div>
                ))
            )}
        </div>
    );

    const renderSourceList = () => (
        <div className="flex flex-col gap-1 px-2 pb-2">
            {loadingSources ? (
                <div className="flex justify-center py-4"><Spin size="small" /></div>
            ) : sources.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-[11px] text-gray-400">Add sources to this notebook</span>}
                    className="my-4"
                />
            ) : (
                sources.map((source: StudioSource) => (
                    <div
                        key={source.id}
                        className="group flex items-center justify-between gap-2 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getStatusIcon(source.parse_status)}
                            <div className="min-w-0 flex-1">
                                <Text className="text-[12px] block truncate">{source.filename}</Text>
                                <div className="flex items-center gap-1.5">
                                    <Text className="text-[10px] text-gray-400">{formatBytes(source.file_size)}</Text>
                                    {source.chunk_count > 0 && (
                                        <Text className="text-[10px] text-gray-400">· {source.chunk_count} chunks</Text>
                                    )}
                                    {getStatusTag(source)}
                                </div>
                                {source.parse_status === 'parsing' && (
                                    <Progress
                                        percent={Math.round(source.parse_progress * 100)}
                                        size="small"
                                        strokeColor={themeColor}
                                        className="mt-1 !mb-0"
                                    />
                                )}
                            </div>
                        </div>
                        <Space size={0}>
                            <Tooltip title="Reindex">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<SyncOutlined />}
                                    className="opacity-0 group-hover:opacity-100 w-5 h-5"
                                    onClick={() => handleReindexSource(source.id)}
                                />
                            </Tooltip>
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center"
                                onClick={() => handleRemoveSource(source.id)}
                            />
                        </Space>
                    </div>
                ))
            )}
        </div>
    );

    const renderChatPanel = () => (
        <div className="flex flex-col h-full">
            {sources.length > 0 && !sourcesIndexed && (
                <motion.div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 text-[11px] text-amber-800 dark:text-amber-200">
                    {sourcesIndexing
                        ? "Sources are being indexed. Answers improve once indexing completes."
                        : "Sources are not indexed yet. Use Reindex on a source or wait for processing."}
                </motion.div>
            )}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-60">
                        <RobotOutlined style={{ fontSize: 48, color: themeColor }} />
                        <div className="text-center">
                            <Text strong className="block text-sm mb-1">Ask about your sources</Text>
                            <Text className="text-xs text-gray-400 block max-w-[280px]">
                                {chatMode === "guided" && guidedFlow
                                    ? `Guided session: ${guidedFlow.name}. Answers use indexed sources and optional database context.`
                                    : "Ask questions grounded in indexed notebook sources (RAG) and configured database views."}
                            </Text>
                        </div>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className="max-w-[85%]">
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: msg.role === 'user' ? `${themeColor}` : 'rgba(var(--theme-color-rgb, 139, 92, 246), 0.06)',
                                color: msg.role === 'user' ? '#fff' : 'inherit',
                                wordBreak: 'break-word',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                            {/* References */}
                            {msg.references && msg.references.length > 0 && (
                                <div className="mt-1.5">
                                    <Button
                                        type="text"
                                        size="small"
                                        className="text-[10px] text-gray-400 hover:!text-[color:var(--theme-color)] p-0 h-auto"
                                        onClick={() => setShowReferences(showReferences === i ? null : i)}
                                    >
                                        📄 {msg.references.length} source{msg.references.length > 1 ? 's' : ''} cited
                                    </Button>
                                    <AnimatePresence>
                                        {showReferences === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-1 space-y-1">
                                                    {msg.references.map((ref, ri) => (
                                                        <div key={ri} className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2 text-[11px]">
                                                            <Text strong className="text-[10px] block mb-0.5" style={{ color: themeColor }}>{ref.docName}</Text>
                                                            <Text className="text-gray-500 text-[10px] line-clamp-2">{ref.content}</Text>
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
            {/* Chat Input */}
            <div className="p-3 border-t border-[rgba(var(--theme-color-rgb,139,92,246),0.1)]">
                <Space.Compact className="w-full" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 10 }}>
                    <Input
                        size="large"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onPressEnter={handleChatSend}
                        placeholder={activeNotebook ? "Ask about your sources..." : "Select a notebook first"}
                        disabled={isChatting || !activeNotebook}
                        style={{ borderBottomLeftRadius: 10, borderTopLeftRadius: 10 }}
                    />
                    <Button
                        size="large"
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleChatSend}
                        loading={isChatting}
                        disabled={!activeNotebook}
                        style={{ borderBottomRightRadius: 10, borderTopRightRadius: 10, backgroundColor: themeColor }}
                    />
                </Space.Compact>
            </div>
        </div>
    );

    const renderStudioGuide = () => (
        <div className="flex-1 overflow-auto custom-scrollbar px-4 pb-4 pt-2">
            {!activeNotebook ? (
                /* No notebook selected — show welcome */
                <div className="flex flex-col items-center justify-center h-full gap-6 opacity-80">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                    >
                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{
                            background: `linear-gradient(135deg, ${themeColor}22, ${themeColor}08)`,
                            border: `2px dashed ${themeColor}44`
                        }}>
                            <BookOutlined style={{ fontSize: 40, color: themeColor }} />
                        </div>
                    </motion.div>
                    <div className="text-center max-w-md">
                        <Title level={3} className="!mb-2">
                            <AuroraText colors={[themeColor, `${themeColor}cc`, `${themeColor}88`]}>Welcome to AI Studio</AuroraText>
                        </Title>
                        <Text className="text-gray-400 text-sm block mb-6">
                            Create a notebook, add your documents, and let AI help you understand, analyze, and generate insights from your knowledge base.
                        </Text>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => setShowCreateModal(true)}
                            style={{ backgroundColor: themeColor, borderColor: themeColor, borderRadius: 12, height: 44, paddingInline: 32 }}
                        >
                            Create Your First Notebook
                        </Button>
                    </div>
                </div>
            ) : (
                /* Active notebook — show guide + generators */
                <>
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{activeNotebook.icon || '📓'}</span>
                            <div>
                                <Title level={4} className="!mb-0">
                                    <AuroraText colors={[themeColor, `${themeColor}cc`, `${themeColor}88`]}>{activeNotebook.name}</AuroraText>
                                </Title>
                                <Text className="text-gray-400 text-xs">{activeNotebook.description || 'No description'}</Text>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Tag style={{ color: themeColor, borderColor: `${themeColor}44`, backgroundColor: `${themeColor}11` }}>{sources.length} source{sources.length !== 1 ? 's' : ''}</Tag>
                            <Tag style={{ color: themeColor, borderColor: `${themeColor}44`, backgroundColor: `${themeColor}11` }}>{sources.filter(s => s.parse_status !== 'error').length} ready</Tag>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <Title level={5} className="!text-gray-400 uppercase tracking-wider !text-xs !mb-3">Add Knowledge</Title>
                    <Row gutter={[12, 12]} className="mb-8">
                        <Col span={12}>
                            <Card
                                hoverable
                                size="small"
                                className="!rounded-xl cursor-pointer group"
                                style={{ borderColor: 'rgba(var(--theme-color-rgb,139,92,246),0.15)' }}
                                onClick={openMediaModal}
                            >
                                <Space align="center" size={12}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                                        <AppstoreAddOutlined style={{ fontSize: 18, color: themeColor }} />
                                    </div>
                                    <div>
                                        <Text strong className="text-[13px] block">Media Library</Text>
                                        <Text className="text-[10px] text-gray-400">Add from existing files</Text>
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Upload
                                customRequest={handleUploadFile}
                                showUploadList={false}
                                multiple
                            >
                                <Card
                                    hoverable
                                    size="small"
                                    className="!rounded-xl cursor-pointer"
                                    style={{ borderColor: 'rgba(var(--theme-color-rgb,139,92,246),0.15)', width: '100%' }}
                                >
                                    <Space align="center" size={12}>
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                                            <CloudUploadOutlined style={{ fontSize: 18, color: themeColor }} />
                                        </div>
                                        <div>
                                            <Text strong className="text-[13px] block">Upload Files</Text>
                                            <Text className="text-[10px] text-gray-400">PDF, DOCX, TXT, etc.</Text>
                                        </div>
                                    </Space>
                                </Card>
                            </Upload>
                        </Col>
                    </Row>

                    {/* Generate Tools */}
                    <Title level={5} className="!text-gray-400 uppercase tracking-wider !text-xs !mb-3">Generate</Title>
                    <Row gutter={[12, 12]}>
                        <Col span={24}>
                            <Card
                                hoverable
                                size="small"
                                className="!rounded-xl cursor-pointer"
                                onClick={() => {
                                    if (sources.length === 0) {
                                        message.warning("No sources yet.");
                                        return;
                                    }
                                    setReportModalOpen(true);
                                }}
                            >
                                <Space align="center" size={12}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                                        <FileTextOutlined style={{ fontSize: 18, color: themeColor }} />
                                    </div>
                                    <div>
                                        <Text strong className="text-[13px] block">Executive Report</Text>
                                        <Text className="text-[10px] text-gray-400">Generate a comprehensive analysis from your sources</Text>
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );

    // ── MAIN RENDER ──

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>AI Studio</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Notebook-powered AI knowledge base — upload sources, parse, and chat with your documents"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={15}
                    sequential={true}
                />
            }
        >
            <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-4 flex-1" style={{ minHeight: 600, alignItems: 'stretch' }}>

                    {/* ── LEFT SIDEBAR: Notebooks + Sources ── */}
                    <AnimatePresence mode="wait">
                        {showSources && (
                            <motion.div
                                initial={{ width: 0, opacity: 0, x: -20 }}
                                animate={{ width: 280, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                                className="flex flex-col"
                                style={{ width: 280, minWidth: 280 }}
                            >
                                <Card
                                    size="small"
                                    title={
                                        <span style={{
                                            background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontWeight: 600,
                                            fontSize: '14px'
                                        }}>
                                            Notebooks
                                        </span>
                                    }
                                    extra={
                                        <AnimatedTooltip content="New Notebook">
                                            <Button
                                                type="text"
                                                icon={<PlusOutlined style={{ fontSize: 14 }} />}
                                                size="small"
                                                className="text-gray-400 hover:text-[color:var(--theme-color,#7c3aed)] flex items-center justify-center w-7 h-7"
                                                onClick={() => setShowCreateModal(true)}
                                            />
                                        </AnimatedTooltip>
                                    }
                                    style={{
                                        display: 'flex', flexDirection: 'column',
                                        background: 'transparent', boxShadow: 'none', border: 'none',
                                        ...(activeNotebook ? { height: '40%', minHeight: 200 } : { height: '100%' })
                                    }}
                                    className="dark:!bg-transparent"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(var(--theme-color-rgb,139,92,246),0.2)',
                                            minHeight: 40, padding: '0 12px'
                                        },
                                        body: { padding: 0, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }
                                    }}
                                >
                                    {renderNotebookList()}
                                </Card>

                                {/* Sources Panel (only when notebook selected) */}
                                {activeNotebook && (
                                    <Card
                                        size="small"
                                        title={
                                            <span style={{
                                                background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                Sources
                                            </span>
                                        }
                                        extra={
                                            <Space size={2}>
                                                <AnimatedTooltip content="From Library">
                                                    <Button type="text" icon={<AppstoreAddOutlined style={{ fontSize: 13 }} />} size="small"
                                                        className="text-gray-400 hover:text-[color:var(--theme-color)] w-6 h-6 flex items-center justify-center"
                                                        onClick={openMediaModal}
                                                    />
                                                </AnimatedTooltip>
                                                <Upload customRequest={handleUploadFile} showUploadList={false} multiple>
                                                    <AnimatedTooltip content="Upload File">
                                                        <Button type="text" icon={<CloudUploadOutlined style={{ fontSize: 13 }} />} size="small"
                                                            className="text-gray-400 hover:text-[color:var(--theme-color)] w-6 h-6 flex items-center justify-center"
                                                        />
                                                    </AnimatedTooltip>
                                                </Upload>
                                            </Space>
                                        }
                                        style={{
                                            display: 'flex', flexDirection: 'column', flex: 1,
                                            background: 'transparent', boxShadow: 'none', border: 'none', marginTop: 4
                                        }}
                                        className="dark:!bg-transparent"
                                        styles={{
                                            header: {
                                                background: 'transparent',
                                                borderBottom: '1px solid rgba(var(--theme-color-rgb,139,92,246),0.2)',
                                                minHeight: 40, padding: '0 12px'
                                            },
                                            body: { padding: 0, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }
                                        }}
                                    >
                                        {renderSourceList()}
                                    </Card>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── MIDDLE: Studio Guide / Generators ── */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4">
                        {/* Header */}
                        <Card
                            size="small"
                            style={{
                                ...glass,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid rgba(255,255,255,0.5)'
                            }}
                            className="dark:!bg-[rgba(15,15,23,0.6)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                            styles={{
                                header: { background: 'rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(var(--theme-color-rgb,139,92,246),0.2)' }
                            }}
                            title={
                                <div className="flex items-center gap-3">
                                    <AnimatedTooltip content={showSources ? "Hide Sidebar" : "Show Sidebar"}>
                                        <Button type="text" icon={showSources ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                            onClick={() => setShowSources(!showSources)} size="small"
                                            className="text-gray-400 hover:text-[color:var(--theme-color)] w-7 h-7 flex items-center justify-center -ml-2"
                                        />
                                    </AnimatedTooltip>
                                    <span style={{
                                        background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                        fontWeight: 600, fontSize: '14px'
                                    }}>
                                        {activeNotebook ? activeNotebook.name : 'Studio Guide'}
                                    </span>
                                </div>
                            }
                            extra={
                                <AnimatedTooltip content={showChat ? "Hide Chat" : "Show Chat"}>
                                    <Button type="text" icon={showChat ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                        onClick={() => setShowChat(!showChat)} size="small"
                                        className="text-gray-400 hover:text-[color:var(--theme-color)] w-7 h-7 flex items-center justify-center"
                                    />
                                </AnimatedTooltip>
                            }
                        >
                            <Breadcrumb
                                items={[
                                    { title: <><RobotOutlined className="mr-1" /> AI Studio</> },
                                    { title: activeNotebook ? activeNotebook.name : "Guide" }
                                ]}
                                className="text-xs"
                            />
                        </Card>
                        <Tabs
                            activeKey={studioMainTab}
                            onChange={(k) => setStudioMainTab(k as "workspace" | "flows")}
                            className="studio-main-tabs"
                            items={[
                                {
                                    key: "workspace",
                                    label: (
                                        <span className="text-xs">
                                            <FundProjectionScreenOutlined className="mr-1" />
                                            Workspace
                                        </span>
                                    ),
                                    children: renderStudioGuide(),
                                },
                                {
                                    key: "flows",
                                    label: (
                                        <span className="text-xs">
                                            <ApartmentOutlined className="mr-1" />
                                            Guide flows
                                        </span>
                                    ),
                                    children: (
                                        <GuideFlowsPanel
                                            notebookId={activeNotebook?.id ?? null}
                                            themeColor={themeColor}
                                            userId={userId || ""}
                                            sourcesReady={sourcesIndexed}
                                        />
                                    ),
                                },
                            ]}
                        />
                    </div>

                    {/* ── RIGHT SIDEBAR: Chat ── */}
                    <AnimatePresence mode="wait">
                        {showChat && (
                            <motion.div
                                initial={{ width: 0, opacity: 0, x: 20 }}
                                animate={{ width: 380, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: 20 }}
                                transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                                className="flex flex-col"
                                style={{ width: 380, minWidth: 380 }}
                            >
                                <Card
                                    size="small"
                                    title={
                                        <span style={{
                                            background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                            fontWeight: 600, fontSize: '14px'
                                        }}>
                                            AI Assistant
                                        </span>
                                    }
                                    extra={
                                        conversationId ? (
                                            <Button type="text" size="small"
                                                className="text-[10px] text-gray-400 hover:!text-[color:var(--theme-color)]"
                                                onClick={() => resetChat()}
                                            >
                                                New Chat
                                            </Button>
                                        ) : null
                                    }
                                    style={{
                                        display: 'flex', flexDirection: 'column', height: '100%',
                                        background: 'transparent', boxShadow: 'none', border: 'none'
                                    }}
                                    className="dark:!bg-transparent"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(var(--theme-color-rgb,139,92,246),0.2)',
                                            minHeight: 40, padding: '0 12px'
                                        },
                                        body: { padding: 0, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }
                                    }}
                                >
                                    {renderChatPanel()}
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

            {/* Report Modal */}
            <Modal
                title={<span><FileTextOutlined style={{ color: themeColor, marginRight: 8 }} />Generate Executive Report</span>}
                open={reportModalOpen}
                onCancel={() => setReportModalOpen(false)}
                footer={null}
                width={700}
                centered
            >
                {!generatedReport ? (
                    <div className="pt-4">
                        <Paragraph type="secondary">Describe what you want the report to focus on based on your notebook sources.</Paragraph>
                        <TextArea
                            rows={4}
                            value={reportQuery}
                            onChange={e => setReportQuery(e.target.value)}
                            placeholder="E.g. Analyze the Q3 growth based on the provided logs..."
                            className="mb-4"
                        />
                        <Button type="primary" size="large" onClick={handleGenerateReport} loading={isGeneratingReport}
                            style={{ width: '100%', backgroundColor: themeColor }}>
                            Generate Report
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 flex justify-end">
                            <Space>
                                <Button onClick={() => setGeneratedReport("")}>Reset</Button>
                                <Button type="primary" icon={<DownloadOutlined />} style={{ backgroundColor: themeColor }}>Export</Button>
                            </Space>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{generatedReport}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </CMSLayout>
    );
}
