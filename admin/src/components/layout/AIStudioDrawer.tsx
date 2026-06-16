import React, { useState, useRef, useEffect, useCallback } from "react";
import { mediaService, MediaFile } from "@/lib/mediaService";
import { studioService, StudioNotebook, StudioSource, ChatResponse } from "@/lib/studioService";
import {
    List, Typography, Input, Button, Avatar, Spin, message, Tag, Progress,
    Modal, Upload, Drawer, Empty, Space, Popconfirm
} from "antd";
import type { UploadProps } from "antd";
import {
    RobotOutlined, SendOutlined, FileOutlined, LoadingOutlined,
    FileTextOutlined, PlusOutlined, DeleteOutlined, CloseOutlined,
    BookOutlined, CloudUploadOutlined, CheckCircleFilled, ClockCircleOutlined,
    SyncOutlined, ExclamationCircleOutlined, AppstoreAddOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, MessageOutlined
} from "@ant-design/icons";
import ReactMarkdown from 'react-markdown';
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import {
    getSourceProgressPercent,
    getSourceStageLabel,
    getSourceStatusDetail,
    getSourceStatusTag,
    isSourceInProgress,
    seedSourceStatusMap,
    summarizeSources,
    trackSourceStatusChanges,
} from "@/app/admin/ai-studio/studioSourceStatus";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface AIStudioDrawerProps { visible: boolean; onClose: () => void; }

export default function AIStudioDrawer({ visible, onClose }: AIStudioDrawerProps) {
    const { themeColor } = usePreferencesStore();
    const { user: contextUser, loading: authLoading } = useAuth();
    const userId = useAuthStore((s) => s.user?.id) ?? contextUser?.id;
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains('dark'));
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // Theme-aware colors
    const bg = isDark ? '#141414' : '#ffffff';
    const textColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.88)';
    const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
    const bgSoft = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textMuted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
    const textFaint = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';
    const refBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const aiBubbleBg = isDark ? `${themeColor}18` : `${themeColor}0a`;

    // Notebook
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [activeNotebook, setActiveNotebook] = useState<StudioNotebook | null>(null);
    const [loadingNotebooks, setLoadingNotebooks] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState("");
    const [creatingNotebook, setCreatingNotebook] = useState(false);

    // Sources
    const [sources, setSources] = useState<StudioSource[]>([]);
    const [loadingSources, setLoadingSources] = useState(false);
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [addingMedia, setAddingMedia] = useState<Set<string>>(new Set());

    // Chat
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string; references?: any[]; timestamp: number }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [showReferences, setShowReferences] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Layout
    const [showSources, setShowSources] = useState(true);

    // Poll
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevSourceStatusRef = useRef<Map<string, string>>(new Map());
    const pollNotebookIdRef = useRef<string | null>(null);
    const sourceStats = summarizeSources(sources);

    const loadNotebooks = useCallback(async () => {
        if (!userId) {
            setLoadingNotebooks(false);
            return;
        }
        setLoadingNotebooks(true);
        try { setNotebooks(await studioService.getNotebooks(userId)); } catch { }
        finally { setLoadingNotebooks(false); }
    }, [userId]);

    useEffect(() => {
        if (!visible || authLoading) return;
        loadNotebooks();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [visible, authLoading, loadNotebooks]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

    const selectNotebook = async (nb: StudioNotebook) => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        prevSourceStatusRef.current = new Map();
        pollNotebookIdRef.current = nb.id;
        setActiveNotebook(nb);
        setChatHistory([]);
        setConversationId(undefined);
        setShowReferences(null);
        await loadSourceStatus(nb.id, true);
    };

    const notifySourceChange = useCallback(
        (type: 'success' | 'error' | 'warning', text: string) => {
            if (type === 'success') message.success(text);
            else if (type === 'error') message.error(text);
            else message.warning(text);
        },
        [],
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
            } catch { /* ignore */ } finally {
                setLoadingSources(false);
            }
        },
        [applySourcesUpdate],
    );

    const handleCreateNotebook = async () => {
        if (!newNotebookName.trim()) return;
        setCreatingNotebook(true);
        try {
            if (!userId) return;
            const nb = await studioService.createNotebook(newNotebookName, "", userId);
            message.success(`Notebook "${newNotebookName}" created`);
            setNewNotebookName(""); setShowCreateModal(false);
            await loadNotebooks(); selectNotebook(nb);
        } catch (e: any) { message.error(e.message || "Failed"); }
        finally { setCreatingNotebook(false); }
    };

    const handleDeleteNotebook = async (id: string) => {
        try {
            await studioService.deleteNotebook(id); message.success("Deleted");
            if (activeNotebook?.id === id) { setActiveNotebook(null); setSources([]); setChatHistory([]); }
            loadNotebooks();
        } catch (e: any) { message.error(e.message || "Failed"); }
    };

    const openMediaModal = async () => {
        setShowAddMediaModal(true); setLoadingMedia(true);
        try { setMediaFiles(await mediaService.getMedia({ limit: 50 })); } catch { message.error("Failed to load media"); }
        finally { setLoadingMedia(false); }
    };

    const handleAddMedia = async (mediaId: string) => {
        if (!activeNotebook) return;
        setAddingMedia(prev => new Set(prev).add(mediaId));
        try { await studioService.addMediaToNotebook(activeNotebook.id, mediaId); message.success("Sumber ditambahkan — indeksasi dimulai"); await loadSourceStatus(activeNotebook.id); }
        catch (e: any) { message.error(e.message || "Failed"); }
        finally { setAddingMedia(prev => { const s = new Set(prev); s.delete(mediaId); return s; }); }
    };

    const handleUploadFile: UploadProps['customRequest'] = async (options) => {
        if (!activeNotebook) return;
        const { file, onSuccess, onError } = options as any;
        try { await studioService.uploadFileToNotebook(activeNotebook.id, file); onSuccess?.({}, file); message.success(`"${(file as File).name}" diupload — indeksasi dimulai`); await loadSourceStatus(activeNotebook.id); }
        catch (e: any) { onError?.(e); message.error(e.message || "Upload failed"); }
    };

    const handleRemoveSource = async (sourceId: string) => {
        if (!activeNotebook) return;
        try { await studioService.removeSource(activeNotebook.id, sourceId); message.success("Removed"); loadSourceStatus(activeNotebook.id); }
        catch (e: any) { message.error(e.message || "Failed"); }
    };

    const handleChatSend = async () => {
        if (!chatInput.trim() || !activeNotebook) return;
        const indexed = sourceStats.anyIndexed;
        if (!indexed) { message.warning("Sumber belum terindeks."); return; }
        const userMsg = { role: 'user' as const, content: chatInput, timestamp: Date.now() };
        setChatHistory(prev => [...prev, userMsg]); setChatInput(""); setIsChatting(true);
        try {
            const result: ChatResponse = await studioService.chat(activeNotebook.id, userMsg.content, conversationId, userId);
            setConversationId(result.conversationId);
            setChatHistory(prev => [...prev, { role: 'assistant', content: result.answer, references: result.references, timestamp: Date.now() }]);
        } catch (e: any) { message.error(e.message || "Chat failed"); }
        finally { setIsChatting(false); }
    };

    const getStatusIcon = (status: string) => {
        if (status === 'done') return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />;
        if (status === 'parsing') return <SyncOutlined spin style={{ color: themeColor, fontSize: 12 }} />;
        if (status === 'error') return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />;
        return <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />;
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
    };

    return (
        <Drawer title={null} size={760} onClose={onClose} open={visible} closable={false}
            styles={{ header: { display: 'none' }, body: { padding: 0, overflow: 'hidden', background: bg, color: textColor } }}>
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden', color: textColor }}>

                {/* LEFT: Notebooks + Sources */}
                <AnimatePresence mode="wait">
                    {showSources && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}`, overflow: 'hidden', height: '100%' }}
                        >
                            {/* Header */}
                            <div style={{ padding: '12px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <RobotOutlined style={{ fontSize: 14, color: themeColor }} />
                                    <Text strong style={{ fontSize: 13, color: textColor }}>AI Studio</Text>
                                </div>
                                <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: bgSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: textMuted }}>
                                    <CloseOutlined />
                                </button>
                            </div>

                            {/* Notebooks Section */}
                            <div style={{ padding: '8px 10px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <Text style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: textMuted }}>Notebooks</Text>
                                <Button type="text" size="small" icon={<PlusOutlined style={{ fontSize: 11 }} />} onClick={() => setShowCreateModal(true)}
                                    style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textFaint }} />
                            </div>
                            <div style={{ flex: activeNotebook ? '0 0 auto' : '1', maxHeight: activeNotebook ? 180 : undefined, overflowY: 'auto', padding: '0 6px' }} className="custom-scrollbar">
                                {loadingNotebooks ? <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div> :
                                    notebooks.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ fontSize: 10, opacity: 0.4 }}>No notebooks</span>} style={{ margin: '16px 0' }} /> :
                                        notebooks.map(nb => (
                                            <div key={nb.id} onClick={() => selectNotebook(nb)}
                                                style={{
                                                    padding: '6px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8,
                                                    background: activeNotebook?.id === nb.id ? `${themeColor}14` : 'transparent',
                                                    border: activeNotebook?.id === nb.id ? `1px solid ${themeColor}33` : '1px solid transparent',
                                                }}>
                                                <span style={{ fontSize: 14 }}>{nb.icon || '📓'}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <Text ellipsis style={{ fontSize: 11, fontWeight: 500, display: 'block', color: textColor }}>{nb.name}</Text>
                                                    <Text style={{ fontSize: 9, color: textMuted }}>{nb.source_count || 0} sources</Text>
                                                </div>
                                                <Popconfirm title="Delete?" onConfirm={(e) => { e?.stopPropagation(); handleDeleteNotebook(nb.id); }} onCancel={e => e?.stopPropagation()}>
                                                    <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                                                        onClick={e => e.stopPropagation()} style={{ width: 20, height: 20, opacity: 0.3 }} />
                                                </Popconfirm>
                                            </div>
                                        ))
                                }
                            </div>

                            {/* Sources Section (when notebook selected) */}
                            {activeNotebook && (
                                <>
                                    <div style={{ padding: '8px 10px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
                                        <Text style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: textMuted }}>
                                            Sources ({sourceStats.indexed}/{sourceStats.total} tervektor)
                                        </Text>
                                        <Space size={2}>
                                            <Button type="text" size="small" icon={<AppstoreAddOutlined style={{ fontSize: 11 }} />} onClick={openMediaModal}
                                                style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textFaint }} />
                                            <Upload customRequest={handleUploadFile} showUploadList={false} multiple>
                                                <Button type="text" size="small" icon={<CloudUploadOutlined style={{ fontSize: 11 }} />}
                                                    style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textFaint }} />
                                            </Upload>
                                        </Space>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 6px' }} className="custom-scrollbar">
                                        {loadingSources ? <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div> :
                                            sources.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ fontSize: 10, opacity: 0.4 }}>Add sources</span>} style={{ margin: '12px 0' }} /> :
                                                sources.map(s => {
                                                    const statusTag = getSourceStatusTag(s);
                                                    const stageLabel = getSourceStageLabel(s);
                                                    const detail = getSourceStatusDetail(s);
                                                    return (
                                                    <div key={s.id} title={detail ?? stageLabel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, marginBottom: 1 }} className="group">
                                                        {getStatusIcon(s.parse_status)}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Text ellipsis style={{ fontSize: 10, display: 'block', color: textSecondary }}>{s.filename}</Text>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                                                <Text style={{ fontSize: 9, color: textMuted }}>{formatBytes(s.file_size)}</Text>
                                                                {isSourceInProgress(s) && (
                                                                    <Text style={{ fontSize: 9, color: themeColor }}>{stageLabel}</Text>
                                                                )}
                                                                <Tag color={statusTag.color} style={{ fontSize: 8, margin: 0, lineHeight: '14px', padding: '0 3px' }}>{statusTag.label}</Tag>
                                                            </div>
                                                            {s.parse_status === 'error' && s.parse_error && (
                                                                <Text style={{ fontSize: 8, color: '#ff4d4f', display: 'block' }} ellipsis>{s.parse_error}</Text>
                                                            )}
                                                            {(s.parse_status === 'parsing' || s.parse_status === 'pending') && (
                                                                <Progress percent={getSourceProgressPercent(s)} size="small" strokeColor={themeColor} style={{ marginTop: 2 }} status={s.parse_status === 'pending' ? 'active' : 'normal'} />
                                                            )}
                                                        </div>
                                                        <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 9 }} />}
                                                            onClick={() => handleRemoveSource(s.id)} style={{ width: 18, height: 18, opacity: 0 }} className="group-hover:!opacity-100" />
                                                    </div>
                                                ); })
                                        }
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* RIGHT: Chat */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>
                    {/* Chat Header */}
                    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Button type="text" size="small" icon={showSources ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                onClick={() => setShowSources(!showSources)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                            <Text strong style={{ fontSize: 12, color: textColor }}>{activeNotebook ? activeNotebook.name : 'Select a notebook'}</Text>
                            {activeNotebook && sourceStats.embedding > 0 && (
                                <Tag color="processing" icon={<SyncOutlined spin />} style={{ fontSize: 9, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                                    Vektor {sourceStats.embedding}
                                </Tag>
                            )}
                            {activeNotebook && sourceStats.inProgress > 0 && sourceStats.embedding === 0 && (
                                <Tag color="processing" icon={<SyncOutlined spin />} style={{ fontSize: 9, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                                    Indeks
                                </Tag>
                            )}
                            {activeNotebook && sourceStats.allIndexed && sourceStats.total > 0 && (
                                <Tag color="success" style={{ fontSize: 9, margin: 0, lineHeight: '16px', padding: '0 4px' }}>Siap RAG</Tag>
                            )}
                        </div>
                        {conversationId && (
                            <Button type="text" size="small" style={{ fontSize: 10, color: textMuted }}
                                onClick={() => { setChatHistory([]); setConversationId(undefined); }}>New Chat</Button>
                        )}
                    </div>

                    {/* Chat Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14 }} className="custom-scrollbar">
                        {!activeNotebook ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.5 }}>
                                <BookOutlined style={{ fontSize: 36, color: themeColor }} />
                                <Text style={{ fontSize: 11, textAlign: 'center', maxWidth: 200, color: textSecondary }}>Select or create a notebook to start chatting with your documents.</Text>
                            </div>
                        ) : chatHistory.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.5 }}>
                                <RobotOutlined style={{ fontSize: 36, color: themeColor }} />
                                <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4, color: textColor }}>Ask about your sources</Text>
                                    <Text style={{ fontSize: 10, color: textMuted, maxWidth: 220, display: 'block' }}>AI will reference parsed documents to answer your questions.</Text>
                                </div>
                            </div>
                        ) : (
                            chatHistory.map((msg, i) => (
                                <div key={i} style={{ marginBottom: 14, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ maxWidth: '85%' }}>
                                        <div style={{
                                            padding: '10px 14px', fontSize: 12, lineHeight: 1.6, wordBreak: 'break-word',
                                            borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                            background: msg.role === 'user' ? themeColor : aiBubbleBg,
                                            color: msg.role === 'user' ? '#fff' : textColor,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                        }}>
                                            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                        {msg.references && msg.references.length > 0 && (
                                            <div style={{ marginTop: 4 }}>
                                                <button onClick={() => setShowReferences(showReferences === i ? null : i)}
                                                    style={{ fontSize: 9, color: textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                    📄 {msg.references.length} source{msg.references.length > 1 ? 's' : ''} cited
                                                </button>
                                                <AnimatePresence>
                                                    {showReferences === i && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {msg.references.map((ref: any, ri: number) => (
                                                                    <div key={ri} style={{ padding: '6px 8px', borderRadius: 6, background: refBg, fontSize: 10 }}>
                                                                        <Text strong style={{ fontSize: 9, color: themeColor, display: 'block', marginBottom: 2 }}>{ref.docName}</Text>
                                                                        <Text style={{ fontSize: 9, color: textMuted }} className="line-clamp-2">{ref.content}</Text>
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
                            ))
                        )}
                        {isChatting && <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}><div style={{ padding: 10, borderRadius: 14, background: `${themeColor}08` }}><Spin indicator={<LoadingOutlined spin />} size="small" /></div></div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
                        <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onPressEnter={handleChatSend}
                            placeholder={activeNotebook ? "Ask about your sources..." : "Select a notebook"} disabled={isChatting || !activeNotebook}
                            style={{ borderRadius: 10, flex: 1 }} />
                        <Button type="primary" icon={<SendOutlined />} onClick={handleChatSend} loading={isChatting} disabled={!activeNotebook}
                            style={{ borderRadius: 10, backgroundColor: themeColor, borderColor: themeColor }} />
                    </div>
                </div>
            </div>

            {/* Create Notebook Modal */}
            <Modal title={<span><BookOutlined style={{ color: themeColor, marginRight: 8 }} />Create Notebook</span>}
                open={showCreateModal} onCancel={() => setShowCreateModal(false)} onOk={handleCreateNotebook}
                confirmLoading={creatingNotebook} okText="Create" okButtonProps={{ style: { backgroundColor: themeColor } }} centered>
                <div style={{ paddingTop: 16 }}>
                    <Input size="large" value={newNotebookName} onChange={e => setNewNotebookName(e.target.value)}
                        placeholder="e.g. Q4 Research Analysis" onPressEnter={handleCreateNotebook} />
                </div>
            </Modal>

            {/* Add from Media Library Modal */}
            <Modal title={<span><AppstoreAddOutlined style={{ color: themeColor, marginRight: 8 }} />Add from Media Library</span>}
                open={showAddMediaModal} onCancel={() => setShowAddMediaModal(false)} footer={null} width={500} centered>
                {loadingMedia ? <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div> : (
                    <List className="max-h-[350px] overflow-y-auto" dataSource={mediaFiles} renderItem={item => {
                        const added = sources.some(s => s.media_id === item.id);
                        return (
                            <List.Item actions={[added ? <Tag key="a" color="success">Added</Tag> :
                                <Button key="b" type="primary" size="small" icon={<PlusOutlined />} loading={addingMedia.has(item.id)}
                                    onClick={() => handleAddMedia(item.id)} style={{ backgroundColor: themeColor }}>Add</Button>]}>
                                <List.Item.Meta
                                    avatar={<Avatar icon={<FileOutlined />} shape="square" style={{ backgroundColor: `${themeColor}22`, color: themeColor }} />}
                                    title={<Text style={{ fontSize: 12, color: textColor }}>{item.filename}</Text>}
                                    description={<Text style={{ fontSize: 10, color: textMuted }}>{item.mime_type}</Text>} />
                            </List.Item>);
                    }} />
                )}
            </Modal>
        </Drawer>
    );
}
