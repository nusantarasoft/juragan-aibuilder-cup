"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { useAppMessage } from "@/hooks/useAppMessage";
import { mediaService, MediaFile } from "@/lib/mediaService";
import { studioService, StudioNotebook, StudioSource, type StudioGuideFlow, type StudioPlaygroundResult } from "@/lib/studioService";
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
    BookOutlined,
    CloudUploadOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    SyncOutlined,
    ExclamationCircleOutlined,
    AppstoreAddOutlined,
    ApartmentOutlined
} from "@ant-design/icons";
import GuideFlowsPanel from "./GuideFlowsPanel";
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
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/context/AuthContext";
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
    const [publishedGuideFlow, setPublishedGuideFlow] = useState<StudioGuideFlow | null>(null);

    const [chatInput, setChatInput] = useState("");
    const [showReferences, setShowReferences] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
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
        setChatMode,
        setGuidedFlow,
    } = useStudioChat(activeNotebook?.id ?? null, userId);

    // ── Layout State ──
    const [showSources, setShowSources] = useState(true);
    const [showChat, setShowChat] = useState(true);
    const [studioMainTab, setStudioMainTab] = useState<"workspace" | "playground" | "flows">("workspace");

    // ── Playground (UC-18) ──
    const [pgSystemPrompt, setPgSystemPrompt] = useState(
        "You are a helpful assistant. Answer clearly and concisely.",
    );
    const [pgUserPrompt, setPgUserPrompt] = useState("");
    const [pgOutput, setPgOutput] = useState("");
    const [pgTemperature, setPgTemperature] = useState(0.7);
    const [pgMaxTokens, setPgMaxTokens] = useState(2048);
    const [pgLoading, setPgLoading] = useState(false);
    const [pgLastResult, setPgLastResult] = useState<StudioPlaygroundResult | null>(null);
    const [pgMetrics, setPgMetrics] = useState<
        { label: string; latencyMs: number; totalTokens?: number }[]
    >([]);

    // ── Report State ──
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportQuery, setReportQuery] = useState("");
    const [generatedReport, setGeneratedReport] = useState("");
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

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
        setShowReferences(null);
        setStudioMainTab("workspace");
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

    const switchToFreeChat = () => {
        setChatMode("free");
        setGuidedFlow(null);
        resetChat();
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

            const notebookId = pollNotebookIdRef.current;
            const stillIndexing = list.some(isSourceInProgress);
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
        [notifySourceChange],
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
            await studioService.uploadFileToNotebook(activeNotebook.id, file);
            onSuccess?.({}, file);
            message.success(`"${(file as File).name}" diupload — indeksasi dimulai`);
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            onError?.(e);
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

    const sourceStats = summarizeSources(sources);
    const sourcesIndexed = sourceStats.anyIndexed;
    const sourcesIndexing = sourceStats.inProgress > 0;

    const handleChatSend = async () => {
        if (!chatInput.trim() || !activeNotebook) return;
        if (sources.length === 0) {
            message.warning("Belum ada sumber. Tambahkan file atau media terlebih dahulu.");
            return;
        }
        if (!sourcesIndexed && !sourcesIndexing) {
            message.warning("Sumber belum terindeks. Tunggu proses selesai atau gunakan Reindex.");
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
            message.success("Indeksasi ulang dimulai");
            await loadSourceStatus(activeNotebook.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Reindex failed");
        }
    };

    const handleGenerateReport = async () => {
        if (!reportQuery.trim() || !activeNotebook) return;
        setIsGeneratingReport(true);
        try {
            const report = await studioService.generateReport(activeNotebook.id, reportQuery);
            setGeneratedReport(report);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to generate report");
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
        const { color, label } = getSourceStatusTag(source);
        return <Tag color={color} className="text-[10px] m-0 leading-tight px-1.5">{label}</Tag>;
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

    const renderSourceSummary = () => {
        if (sources.length === 0) return null;
        const { total, indexed, inProgress, errors } = sourceStats;
        const overallPercent = total > 0
            ? Math.round(sources.reduce((sum, s) => sum + getSourceProgressPercent(s), 0) / total)
            : 0;

        return (
            <div className="px-3 pt-2 pb-1 border-b border-[rgba(var(--theme-color-rgb,139,92,246),0.12)]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Text className="text-[10px] text-gray-500">
                        {indexed}/{total} tervektor
                        {inProgress > 0 ? ` · ${inProgress} diproses` : ''}
                        {sourceStats.embedding > 0 ? ` · ${sourceStats.embedding} vektorisasi` : ''}
                        {errors > 0 ? ` · ${errors} gagal` : ''}
                    </Text>
                    {sourceStats.allIndexed ? (
                        <Tag color="success" className="text-[9px] m-0 leading-tight px-1.5">Siap RAG</Tag>
                    ) : sourceStats.embedding > 0 ? (
                        <Tag color="processing" icon={<SyncOutlined spin />} className="text-[9px] m-0 leading-tight px-1.5">
                            Vektorisasi
                        </Tag>
                    ) : inProgress > 0 ? (
                        <Tag color="processing" icon={<SyncOutlined spin />} className="text-[9px] m-0 leading-tight px-1.5">
                            Mengindeks
                        </Tag>
                    ) : null}
                </div>
                <Progress
                    percent={overallPercent}
                    status={errors > 0 && indexed === 0 ? 'exception' : inProgress > 0 ? 'active' : indexed === total ? 'success' : 'normal'}
                    size="small"
                    strokeColor={themeColor}
                />
            </div>
        );
    };

    const renderSourceList = () => (
        <div className="flex flex-col gap-1 px-2 pb-2">
            {loadingSources ? (
                <div className="flex justify-center py-4"><Spin size="small" /></div>
            ) : sources.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-4 px-2">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span className="text-[11px] text-gray-400">Belum ada sumber di notebook ini</span>}
                        className="my-1"
                    />
                    <Space size={8} wrap className="justify-center">
                        <Button
                            size="small"
                            icon={<AppstoreAddOutlined />}
                            onClick={openMediaModal}
                        >
                            Media Library
                        </Button>
                        <Upload customRequest={handleUploadFile} showUploadList={false} multiple>
                            <Button size="small" icon={<CloudUploadOutlined />}>
                                Upload
                            </Button>
                        </Upload>
                    </Space>
                    <Text className="text-[10px] text-gray-400 text-center block">
                        PDF, DOCX, PPTX, TXT — otomatis diekstrak &amp; tervektor untuk RAG
                    </Text>
                </div>
            ) : (
                sources.map((source: StudioSource) => {
                    const statusDetail = getSourceStatusDetail(source);
                    const stageLabel = getSourceStageLabel(source);
                    return (
                    <Tooltip key={source.id} title={statusDetail ?? stageLabel} placement="right">
                    <div
                        className="group flex items-center justify-between gap-2 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getStatusIcon(source.parse_status)}
                            <div className="min-w-0 flex-1">
                                <Text className="text-[12px] block truncate">{source.filename}</Text>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Text className="text-[10px] text-gray-400">{formatBytes(source.file_size)}</Text>
                                    {isSourceInProgress(source) && (
                                        <Text className="text-[10px]" style={{ color: themeColor }}>{stageLabel}</Text>
                                    )}
                                    {getStatusTag(source)}
                                </div>
                                {source.parse_status === 'error' && source.parse_error && (
                                    <Text className="text-[10px] text-red-500 block truncate mt-0.5" title={source.parse_error}>
                                        {source.parse_error}
                                    </Text>
                                )}
                                {(source.parse_status === 'parsing' || source.parse_status === 'pending') && (
                                    <Progress
                                        percent={getSourceProgressPercent(source)}
                                        size="small"
                                        strokeColor={themeColor}
                                        status={source.parse_status === 'pending' ? 'active' : 'normal'}
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
                    </Tooltip>
                ); })
            )}
        </div>
    );

    const chatInputPlaceholder = !activeNotebook
        ? "Select a notebook first"
        : chatMode === "guided" && guidedFlow
          ? waitingInput
              ? "Balas di sini…"
              : "Tunggu respons asisten…"
          : "Ask about your sources...";

    const renderChatPanel = () => (
        <div className="flex flex-col h-full">
            {chatMode === "guided" && guidedFlow && (
                <div
                    className="mx-3 mt-2 px-3 py-2 rounded-lg text-[11px] border flex items-start justify-between gap-2"
                    style={{
                        borderColor: `${themeColor}33`,
                        backgroundColor: `${themeColor}0d`,
                    }}
                >
                    <div>
                        <Text strong className="text-[11px] block" style={{ color: themeColor }}>
                            Guided session: {guidedFlow.name}
                        </Text>
                        <Text type="secondary" className="text-[10px] block mt-0.5">
                            {waitingInput
                                ? "Menunggu balasan Anda — jawaban memakai sumber terindeks."
                                : "Alur sedang berjalan…"}
                        </Text>
                    </div>
                    <Button type="link" size="small" className="text-[10px] p-0 h-auto shrink-0" onClick={switchToFreeChat}>
                        Chat bebas
                    </Button>
                </div>
            )}
            {publishedGuideFlow && chatMode === "free" && (
                <Alert
                    className="mx-3 mt-2 text-[11px]"
                    type="info"
                    showIcon
                    message={`Guide flow "${publishedGuideFlow.name}" tersedia`}
                    description="Chat bebas (RAG) aktif. Mulai guided hanya jika ingin mengikuti alur WA UMKM."
                    action={
                        <Button size="small" type="primary" onClick={startPublishedGuidedFlow}>
                            Mulai guided
                        </Button>
                    }
                />
            )}
            {sources.length > 0 && !sourceStats.allIndexed && (
                <motion.div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 text-[11px] text-amber-800 dark:text-amber-200">
                    {sourcesIndexing
                        ? sourceStats.embedding > 0
                            ? `${sourceStats.embedding} file sedang vektorisasi (embed chunk). Progress per file di panel Sources.`
                            : `${sourceStats.inProgress} sumber diproses (ekstrak teks → chunk → vektor).`
                        : sourceStats.errors > 0
                          ? `${sourceStats.errors} sumber gagal (lihat pesan error di Sources). Gunakan Reindex.`
                          : "Sumber belum tervektor. Tunggu proses atau gunakan Reindex."}
                </motion.div>
            )}
            {sourceStats.allIndexed && sources.length > 0 && (
                <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200/60 text-[11px] text-green-800 dark:text-green-200 flex items-center gap-1.5">
                    <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />
                    Semua sumber tervektor ({sourceStats.indexed} file, {sources.reduce((n, s) => n + (s.chunk_count ?? 0), 0)} chunk) — siap untuk chat RAG.
                </div>
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
                        placeholder={chatInputPlaceholder}
                        disabled={
                            isChatting ||
                            !activeNotebook ||
                            (chatMode === "guided" && !waitingInput && chatHistory.length > 0)
                        }
                        style={{ borderBottomLeftRadius: 10, borderTopLeftRadius: 10 }}
                    />
                    <Button
                        size="large"
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleChatSend}
                        loading={isChatting}
                        disabled={
                            !activeNotebook ||
                            (chatMode === "guided" && !waitingInput && chatHistory.length > 0)
                        }
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
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Tag style={{ color: themeColor, borderColor: `${themeColor}44`, backgroundColor: `${themeColor}11` }}>
                                {sourceStats.total} sumber
                            </Tag>
                            <Tag color={sourceStats.allIndexed ? 'success' : sourceStats.indexed > 0 ? 'processing' : 'default'}>
                                {sourceStats.indexed} tervektor
                            </Tag>
                            {sourceStats.embedding > 0 && (
                                <Tag color="processing" icon={<SyncOutlined spin />}>
                                    Vektorisasi {sourceStats.embedding}
                                </Tag>
                            )}
                            {sourceStats.errors > 0 && (
                                <Tag color="error">{sourceStats.errors} gagal</Tag>
                            )}
                        </div>
                        {sources.length > 0 && !sourceStats.allIndexed && (
                            <Alert
                                type={sourceStats.errors > 0 && sourceStats.indexed === 0 ? 'error' : 'info'}
                                showIcon
                                className="mt-3 !text-xs"
                                message={
                                    sourcesIndexing
                                        ? sourceStats.embedding > 0
                                            ? 'Vektorisasi embedding berjalan'
                                            : 'Indeksasi berjalan di background'
                                        : 'Beberapa sumber belum siap'
                                }
                                description={
                                    sourcesIndexing
                                        ? sourceStats.embedding > 0
                                            ? 'Tahap vektorisasi: setiap chunk di-embed dan disimpan. Lihat "Vektorisasi X/Y" di panel Sources.'
                                            : 'Tahap: ekstraksi teks → chunking → vektorisasi. Pantau di panel Sources.'
                                        : 'Buka panel Sources untuk detail error atau jalankan Reindex.'
                                }
                            />
                        )}
                        {sources.length === 0 && (
                            <Alert
                                type="info"
                                showIcon
                                className="mt-3 !text-xs"
                                message="Belum ada sumber"
                                description="Tambahkan file lewat panel Sources di sidebar (Media Library atau Upload). Setelah tervektor, chat RAG siap dipakai."
                            />
                        )}
                    </div>

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

    const renderPlayground = () => {
        const chartData = pgMetrics.map((m) => ({
            name: m.label,
            latency: m.latencyMs,
            tokens: m.totalTokens ?? 0,
        }));

        const runPlaygroundTest = async () => {
            if (!pgUserPrompt.trim()) {
                message.warning("Isi user prompt terlebih dahulu.");
                return;
            }
            setPgLoading(true);
            try {
                const result = await studioService.playgroundTest({
                    systemPrompt: pgSystemPrompt,
                    userPrompt: pgUserPrompt.trim(),
                    temperature: pgTemperature,
                    maxTokens: pgMaxTokens,
                });
                setPgOutput(result.output);
                setPgLastResult(result);
                const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                setPgMetrics((prev) => [
                    ...prev.slice(-9),
                    { label: stamp, latencyMs: result.latencyMs, totalTokens: result.totalTokens },
                ]);
            } catch (e: unknown) {
                const err = e as { message?: string };
                message.error(err.message || "Playground test failed");
            } finally {
                setPgLoading(false);
            }
        };

        return (
            <div className="flex h-full gap-4 px-4 pb-4 pt-2">
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <Alert
                        type="info"
                        showIcon
                        className="!text-xs"
                        message="Sandbox prompt — tidak memakai sumber notebook (RAG)"
                        description="Uji system prompt, user prompt, temperature, dan max tokens sebelum dipakai di chat atau guide flow."
                    />
                    <Card size="small" title={<Text strong className="text-sm">System Prompt</Text>} className="flex-1" style={{ ...glass }}>
                        <TextArea
                            value={pgSystemPrompt}
                            onChange={(e) => setPgSystemPrompt(e.target.value)}
                            placeholder="Instruksi perilaku model (system)..."
                            style={{ height: "100%", minHeight: 120, resize: "none", background: "transparent", border: "none" }}
                        />
                    </Card>
                    <Card size="small" title={<Text strong className="text-sm">User Prompt</Text>} style={{ ...glass }}>
                        <TextArea
                            value={pgUserPrompt}
                            onChange={(e) => setPgUserPrompt(e.target.value)}
                            placeholder="Pesan pengguna untuk diuji..."
                            rows={3}
                            style={{ resize: "none", background: "transparent", border: "none" }}
                            onPressEnter={(e) => {
                                if (e.shiftKey) return;
                                e.preventDefault();
                                void runPlaygroundTest();
                            }}
                        />
                    </Card>
                    <Card size="small" title={<Text strong className="text-sm">Generation Preview</Text>} className="flex-1" style={{ ...glass }}>
                        <Spin spinning={pgLoading}>
                            <TextArea
                                value={pgOutput}
                                readOnly
                                placeholder="Output model akan muncul di sini..."
                                style={{ height: "100%", minHeight: 160, resize: "none", background: "rgba(0,0,0,0.02)", border: "none" }}
                            />
                        </Spin>
                    </Card>
                </div>
                <div className="w-[300px] flex flex-col gap-4 shrink-0">
                    <Card size="small" title={<Text strong className="text-sm">Model Config</Text>} style={{ ...glass }}>
                        <Text className="text-xs mb-1 block">Temperature ({pgTemperature.toFixed(1)})</Text>
                        <Input
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={pgTemperature}
                            onChange={(e) => setPgTemperature(parseFloat(e.target.value))}
                            className="w-full mb-3"
                        />
                        <Text className="text-xs mb-1 block">Max Tokens</Text>
                        <Input
                            type="number"
                            min={64}
                            max={8192}
                            value={pgMaxTokens}
                            onChange={(e) => setPgMaxTokens(Math.min(8192, Math.max(64, Number(e.target.value) || 2048)))}
                            className="w-full mb-4"
                        />
                        <Button
                            type="primary"
                            block
                            loading={pgLoading}
                            onClick={() => void runPlaygroundTest()}
                            style={{ backgroundColor: themeColor, border: "none" }}
                        >
                            Test Prompt
                        </Button>
                    </Card>
                    {pgLastResult && (
                        <Card size="small" title={<Text strong className="text-sm">Last Run</Text>} style={{ ...glass }}>
                            <div className="space-y-1 text-[11px] text-gray-500">
                                <div><Text type="secondary">Provider:</Text> {pgLastResult.provider}</div>
                                <div><Text type="secondary">Model:</Text> {pgLastResult.model}</div>
                                <div><Text type="secondary">Latency:</Text> {pgLastResult.latencyMs} ms</div>
                                {pgLastResult.totalTokens != null && (
                                    <div><Text type="secondary">Tokens:</Text> {pgLastResult.totalTokens}</div>
                                )}
                            </div>
                        </Card>
                    )}
                    <Card size="small" title={<Text strong className="text-sm">Performance</Text>} className="flex-1" style={{ ...glass }}>
                        {chartData.length === 0 ? (
                            <div className="h-[160px] flex items-center justify-center">
                                <Text type="secondary" className="text-[11px]">Jalankan Test Prompt untuk melihat latency</Text>
                            </div>
                        ) : (
                            <>
                                <div style={{ height: 160, width: "100%" }}>
                                    <ResponsiveContainer>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.2)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                                            <Line yAxisId="left" type="monotone" dataKey="latency" stroke={themeColor} strokeWidth={2} dot={{ r: 3, fill: themeColor }} />
                                            <RechartsTooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <Text type="secondary" className="text-[10px] text-center block mt-2">
                                    Latency (ms) — {chartData.length} run terakhir
                                </Text>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        );
    };

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
                                            <Space size={6}>
                                                <span style={{
                                                    background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    fontWeight: 600,
                                                    fontSize: '14px'
                                                }}>
                                                    Sources
                                                </span>
                                                {sourceStats.inProgress > 0 && (
                                                    <Badge count={sourceStats.inProgress} size="small" color={themeColor} title="Sedang diindeks" />
                                                )}
                                            </Space>
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
                                        {renderSourceSummary()}
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
                            onChange={(k) => setStudioMainTab(k as "workspace" | "playground" | "flows")}
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
                                    key: "playground",
                                    label: (
                                        <span className="text-xs">
                                            <RobotOutlined className="mr-1" />
                                            Playground
                                        </span>
                                    ),
                                    children: renderPlayground(),
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
                                            sourcesReady={sourceStats.anyIndexed}
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
                                        activeNotebook &&
                                        (conversationId || (chatMode === "guided" && guidedFlow)) ? (
                                            <Button
                                                type="text"
                                                size="small"
                                                className="text-[10px] text-gray-400 hover:!text-[color:var(--theme-color)]"
                                                onClick={() => void handleNewChat()}
                                                loading={isChatting}
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
