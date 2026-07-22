
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Button, Typography, Space, Tag, Input, Image, Tooltip, message, Collapse, Spin, Divider, Tabs, List, Avatar, theme } from 'antd';
import {
    DownloadOutlined,
    CopyOutlined,
    FileOutlined,
    FileImageOutlined,
    VideoCameraOutlined,
    ExperimentOutlined,
    CodeOutlined,
    ReloadOutlined,
    InfoCircleOutlined,
    HistoryOutlined,
    RollbackOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    LoadingOutlined,
    CloseOutlined,
    TagOutlined,
    RobotOutlined,
    SettingOutlined,
    DeleteOutlined,
    UploadOutlined,
    CheckOutlined,
    EditOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ExpandAltOutlined,
    ScissorOutlined,
    RedoOutlined,
    UndoOutlined,
    ColumnWidthOutlined,
    ColumnHeightOutlined,
    FormatPainterOutlined
} from '@ant-design/icons';
import { mediaService } from '@/lib/mediaService';
import type { MediaFile } from '@/lib/mediaService';
import DocumentPreview, { isDocumentPreviewable } from '@/components/media/DocumentPreview';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const { Text } = Typography;

interface ObjectVersion {
    key: string;
    versionId: string;
    lastModified: string;
    size: number;
    isLatest: boolean;
}

interface MediaPreviewModalProps {
    visible: boolean;
    mediaFile: MediaFile | null;
    onClose: () => void;
    mode?: 'preview' | 'detail';
    isPublicBucket?: boolean;
    onUpdate?: () => void;
    onOpenDetail?: (file: MediaFile) => void;
}

function formatDetailFileSize(bytes?: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// --- Sub-components moved outside to stabilize rendering ---

interface InfoTabProps {
    activeMedia: MediaFile;
    embeddingDim: number;
    embeddingVector: number[];
    versions: ObjectVersion[];
    getRelativeTime: (date: string) => string;
    formatFileSize: (bytes?: number) => string;
    onUpdateDescription?: (newDesc: string) => Promise<void>;
    embeddingStatus?: { status: string; chunkCount: number };
}

const InfoTab = ({ activeMedia, embeddingDim, embeddingVector, versions, getRelativeTime, formatFileSize, onUpdateDescription, embeddingStatus }: InfoTabProps) => {
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [currentDescription, setCurrentDescription] = useState(activeMedia.metadata?.description || '');
    const [descValue, setDescValue] = useState(activeMedia.metadata?.description || '');
    const [isSavingDesc, setIsSavingDesc] = useState(false);

    useEffect(() => {
        setCurrentDescription(activeMedia.metadata?.description || '');
        setDescValue(activeMedia.metadata?.description || '');
    }, [activeMedia.id, activeMedia.metadata?.description]);

    const handleSaveDescription = async () => {
        if (!onUpdateDescription) return;
        setIsSavingDesc(true);
        try {
            await onUpdateDescription(descValue);
            setCurrentDescription(descValue);
            setIsEditingDesc(false);
        } catch (error) {
            message.error("Failed to update description");
        } finally {
            setIsSavingDesc(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Metadata */}
            <div className="glass-card">
                <div className="section-title">FILE DETAILS</div>
                <div className="meta-row"><span className="meta-label">Size</span><span className="meta-value">{formatFileSize(activeMedia.size_bytes)}</span></div>
                <div className="meta-row"><span className="meta-label">Type</span><span className="meta-value font-mono text-[10px]">{activeMedia.mime_type || 'Unknown'}</span></div>
                <div className="meta-row"><span className="meta-label">Created</span><span className="meta-value">{activeMedia.created_at ? new Date(activeMedia.created_at).toLocaleDateString() : '-'}</span></div>
                <div className="meta-row">
                    <span className="meta-label">S3 Key</span>
                    <Text copyable={{ text: activeMedia.s3_key }} className="meta-value font-mono !text-[9px] max-w-[180px] truncate block">{activeMedia.s3_key}</Text>
                </div>
            </div>

            {/* Description */}
            <div className="glass-card">
                <div className="flex justify-between items-center mb-2">
                    <div className="section-title !mb-0">DESCRIPTION</div>
                    {!isEditingDesc && onUpdateDescription && (
                        <button onClick={() => setIsEditingDesc(true)} className="meta-label hover:opacity-80 transition-colors"><EditOutlined style={{ fontSize: 12 }} /></button>
                    )}
                </div>
                {isEditingDesc ? (
                    <div className="space-y-2">
                        <Input.TextArea value={descValue} onChange={(e) => setDescValue(e.target.value)} rows={3}
                            className="text-xs rounded-lg desc-textarea" placeholder="Add a description..." />
                        <div className="flex justify-end gap-2">
                            <Button size="small" onClick={() => { setDescValue(currentDescription); setIsEditingDesc(false); }} disabled={isSavingDesc}
                                className="desc-btn-cancel" style={{ fontSize: 10, borderRadius: 8, height: 24 }}>Cancel</Button>
                            <Button size="small" onClick={handleSaveDescription} loading={isSavingDesc}
                                className="desc-btn-save" style={{ fontSize: 10, borderRadius: 8, height: 24 }}>Save</Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-[11px] leading-relaxed cursor-pointer rounded-lg p-1 -m-1 transition-colors meta-label"
                        onClick={() => onUpdateDescription && setIsEditingDesc(true)}>
                        {currentDescription || <span className="italic" style={{ opacity: 0.4 }}>Click to add description</span>}
                    </div>
                )}
            </div>

            {/* Vector / RAG status */}
            <div className="glass-card">
                <div className="flex justify-between items-center mb-1">
                    <div className="section-title !mb-0 flex items-center gap-1.5"><RobotOutlined style={{ fontSize: 10 }} /> VECTOR</div>
                    {embeddingStatus?.status === 'done' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)' }}>{embeddingStatus?.chunkCount || 0} chunks</span>
                    ) : embeddingStatus?.status === 'parsing' ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded animate-pulse" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>Parsing</span>
                    ) : <span className="text-[9px] meta-label">—</span>}
                </div>
            </div>

            {/* Labels */}
            <div className="glass-card">
                <div className="flex justify-between items-center mb-2">
                    <div className="section-title !mb-0 flex items-center gap-1.5"><TagOutlined style={{ fontSize: 10 }} /> LABELS</div>
                    {Array.isArray(activeMedia.metadata?.tags) && activeMedia.metadata.tags.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'rgba(96,165,250,0.8)', background: 'rgba(96,165,250,0.1)' }}>{activeMedia.metadata.tags.length}</span>
                    )}
                </div>
                {Array.isArray(activeMedia.metadata?.tags) && activeMedia.metadata.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {activeMedia.metadata.tags.map((tag: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(96,165,250,0.1)', color: 'rgba(96,165,250,0.8)', border: '1px solid rgba(96,165,250,0.15)' }}>{tag}</span>
                        ))}
                    </div>
                ) : <div className="text-[10px] italic meta-label">No labels</div>}
            </div>

            {/* Versions Summary */}
            <div className="glass-card">
                <div className="flex justify-between items-center mb-1">
                    <div className="section-title !mb-0 flex items-center gap-1.5"><HistoryOutlined style={{ fontSize: 10 }} /> VERSIONS</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--theme-color, #7c3aed)', background: 'rgba(var(--theme-color-rgb, 139,92,246), 0.08)' }}>{versions.length}</span>
                </div>
                {versions.length > 0 ? (
                    <div className="text-[10px] meta-label">
                        Latest: <span className="font-mono meta-value">{versions[0]?.versionId?.slice(0, 8)}...</span>
                        {versions[0]?.lastModified && <span className="ml-1" style={{ opacity: 0.6 }}>({getRelativeTime(versions[0].lastModified)})</span>}
                    </div>
                ) : <div className="text-[10px] italic meta-label">No history</div>}
            </div>
        </div>
    );
};



interface AIIntelTabProps {
    embeddingDim: number;
    embeddingVector: number[];
    isLoading: boolean;
    isGeneratingEmbed: boolean;
    handleGenerateEmbeddings: () => void;
    handleRemoveEmbeddings: () => void;
    copyToClipboard: (text: string, msg?: string) => void;
    embeddingStatus?: {
        status: string;
        progress: number;
        chunkCount: number;
        progressMsg: string;
    };
}

const AIIntelTab = ({ embeddingDim, embeddingVector, isLoading, isGeneratingEmbed, handleGenerateEmbeddings, handleRemoveEmbeddings, copyToClipboard, embeddingStatus }: AIIntelTabProps) => {
    const status = embeddingStatus?.status || 'none';
    const progress = embeddingStatus?.progress || 0;
    const chunkCount = embeddingStatus?.chunkCount || 0;
    const isParsing = status === 'parsing' || status === 'pending';
    const isDone = status === 'done';
    const isError = status === 'error';
    const hasEmbedding = isDone || embeddingDim > 0;

    return (
    <div className="space-y-4">
        <div className="glass-card">
            <div className="flex justify-between items-center mb-3">
                <div className="section-title !mb-0 flex items-center gap-1.5"><RobotOutlined style={{ fontSize: 12 }} /> MEDIA EMBEDDING</div>
                {hasEmbedding && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'rgba(52,211,153,0.8)', background: 'rgba(52,211,153,0.1)' }}>{chunkCount} Chunks</span>}
            </div>

            <div className="glass-card !p-3 mb-4 ai-inner-card">
                <Spin spinning={isLoading || isGeneratingEmbed || isParsing} indicator={<LoadingOutlined style={{ color: 'var(--theme-color, #7c3aed)' }} spin />}
                    tip={isParsing ? `Parsing... ${Math.round(progress * 100)}%` : isGeneratingEmbed ? "Uploading..." : undefined}>
                    {isDone ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
                                <div className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(52,211,153,0.15)' }}>
                                    <CheckCircleOutlined style={{ color: 'rgba(52,211,153,0.9)', fontSize: 16 }} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold" style={{ color: 'rgba(52,211,153,0.9)' }}>{chunkCount} Chunks</div>
                                    <div className="text-[10px]" style={{ color: 'rgba(52,211,153,0.5)' }}>Stored in media_embeddings (pgvector)</div>
                                </div>
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="text-center py-4">
                            <div className="text-3xl mb-2">⚠️</div>
                            <div className="text-sm font-medium" style={{ color: '#ef4444' }}>Embedding Failed</div>
                            <div className="text-xs mt-1 meta-label">{embeddingStatus?.progressMsg || 'Unknown error'}</div>
                        </div>
                    ) : isParsing ? (
                        <div className="py-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium" style={{ color: 'var(--theme-color, #7c3aed)' }}>Processing...</span>
                                <span className="text-[10px] font-mono meta-label">{Math.round(progress * 100)}%</span>
                            </div>
                            <div className="w-full rounded-full h-1.5 overflow-hidden progress-track">
                                <div className="h-full rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${Math.max(progress * 100, 5)}%`, background: 'var(--theme-color, #7c3aed)' }} />
                            </div>
                            <div className="text-[10px] mt-2 text-center meta-label">Chunking and vectorizing...</div>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <RobotOutlined className="ai-empty-icon" style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                            <div className="text-xs meta-label">No embeddings generated</div>
                            <div className="text-[10px] mt-1 meta-label" style={{ opacity: 0.6 }}>Generate vector for media search, or add file to AI Studio notebook</div>
                        </div>
                    )}
                </Spin>
            </div>

            <div className="flex gap-2">
                <Button size="small" className="flex-1 text-xs"
                    style={{ background: 'var(--theme-color, #7c3aed)', borderColor: 'var(--theme-color, #7c3aed)', color: 'white', borderRadius: 8 }}
                    onClick={handleGenerateEmbeddings} loading={isGeneratingEmbed}
                    disabled={isGeneratingEmbed || isLoading || isParsing}
                    icon={isGeneratingEmbed ? undefined : <ReloadOutlined />}>
                    {isGeneratingEmbed ? "Uploading..." : isParsing ? "Parsing..." : hasEmbedding ? "Regenerate" : "Generate"}
                </Button>
                {hasEmbedding && (
                    <Tooltip title="Remove embeddings">
                        <Button size="small" danger icon={<DeleteOutlined />} className="text-xs"
                            style={{ borderRadius: 8 }} onClick={handleRemoveEmbeddings} />
                    </Tooltip>
                )}
            </div>
        </div>
    </div>
    );
};
interface AutomationTabProps {
    activeMedia: MediaFile;
    isAutoLabeling: boolean;
    handleAutoLabel: () => void;
    copyToClipboard: (text: string, msg?: string) => void;
}

const AutomationTab = ({ activeMedia, isAutoLabeling, handleAutoLabel, copyToClipboard }: AutomationTabProps) => (
    <div className="space-y-4 pr-1">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <TagOutlined /> Auto Labels
                </h3>
                {activeMedia.metadata?.tags?.length > 0 && (
                    <Tag color="blue" bordered={false} className="m-0 text-[10px] font-bold px-2">{activeMedia.metadata.tags.length} Labels</Tag>
                )}
            </div>

            <Button
                type="primary" size="small" block
                className="text-xs bg-blue-600 hover:!bg-blue-700 border-blue-600 hover:!border-blue-700 mb-3"
                onClick={handleAutoLabel}
                loading={isAutoLabeling}
                disabled={isAutoLabeling}
                icon={isAutoLabeling ? undefined : <ExperimentOutlined />}
            >
                {isAutoLabeling ? "Labeling..." : activeMedia.metadata?.tags?.length > 0 ? "Re-generate Labels" : "Auto Label Media"}
            </Button>

            {activeMedia.metadata?.tags && Array.isArray(activeMedia.metadata.tags) && activeMedia.metadata.tags.length > 0 && (
                <div className="bg-white/60 dark:bg-black/30 rounded-lg p-3 border border-blue-100/50 dark:border-blue-500/10">
                    <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                        <TagOutlined /> GENERATED LABELS
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {activeMedia.metadata.tags.map((tag: string, i: number) => (
                            <Tag key={i} color="blue" bordered={false} className="m-0 text-[10px] px-2 py-0.5">
                                {tag}
                            </Tag>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="bg-gray-50 dark:bg-[#121212] rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CodeOutlined /> Metadata
                </h3>
            </div>

            {activeMedia.metadata?.label_studio_task_id && (
                <div className="bg-white dark:bg-black/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">LabelStudio</span>
                        <Tag color="cyan" className="m-0 text-[9px] px-1">TASK {activeMedia.metadata.label_studio_task_id}</Tag>
                    </div>
                    <div className="text-[10px] text-gray-400">Project ID: {activeMedia.metadata.project_id || 'N/A'}</div>
                </div>
            )}

            <Collapse
                ghost size="small"
                className="bg-transparent"
                items={[{
                    key: '1',
                    label: <span className="text-xs font-semibold text-gray-500"><CodeOutlined className="mr-1" />View Raw JSON</span>,
                    children: (
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            <pre className="text-[9px] font-mono whitespace-pre-wrap bg-white dark:bg-black/40 p-2 rounded border border-gray-100 dark:border-gray-800 text-gray-500">
                                {activeMedia.metadata ? JSON.stringify(activeMedia.metadata, null, 2) : '{}'}
                            </pre>
                        </div>
                    )
                }]}
            />
        </div>
    </div>
);

interface VersionsTabProps {
    versions: ObjectVersion[];
    loadingVersions: boolean;
    isUploadingVersion: boolean;
    handleUploadVersion: () => void;
    handlePreviewVersion: (version: ObjectVersion) => void;
    handleDownloadVersion: (versionId: string) => void;
    handleRestoreVersion: (versionId: string) => void;
    previewUrl: string | null;
    getRelativeTime: (date: string) => string;
    formatDetailFileSize: (bytes?: number) => string;
}

const VersionsTab = ({
    versions,
    loadingVersions,
    isUploadingVersion,
    handleUploadVersion,
    handlePreviewVersion,
    handleDownloadVersion,
    handleRestoreVersion,
    previewUrl,
    getRelativeTime,
    formatDetailFileSize
}: VersionsTabProps) => (
    <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <div className="section-title !mb-0 flex items-center gap-1.5"><HistoryOutlined style={{ fontSize: 10 }} /> VERSION HISTORY</div>
            <Button
                type="primary"
                size="small"
                icon={<UploadOutlined />}
                className="text-[10px] h-7 px-3 rounded-lg shadow-sm font-medium tracking-wide"
                style={{ background: 'var(--theme-color, #7c3aed)', borderColor: 'var(--theme-color, #7c3aed)' }}
                onClick={handleUploadVersion}
                loading={isUploadingVersion}
            >
                Upload
            </Button>
        </div>

        {loadingVersions ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'var(--theme-color, #7c3aed)' }} spin />} />
                <span className="text-[10px] meta-label">Loading versions...</span>
            </div>
        ) : versions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center glass-card text-center py-8">
                <HistoryOutlined className="text-2xl mb-3" style={{ color: 'rgba(0,0,0,0.08)' }} />
                <span className="text-xs font-medium meta-label">No version history</span>
                <span className="text-[10px] mt-1 meta-label" style={{ opacity: 0.5 }}>Upload a new version to start tracking</span>
            </div>
        ) : (
            <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                {versions.map((version, index) => {
                    const isActive = previewUrl?.includes(version.versionId);
                    const prevVersion = versions[index + 1];
                    const sizeChange = prevVersion ? version.size - prevVersion.size : 0;
                    return (
                        <div key={version.versionId} className="version-timeline-item">
                            <div className={`version-timeline-dot ${version.isLatest ? 'latest' : ''}`}>
                                {version.isLatest ? <CheckCircleOutlined /> : <span style={{ fontSize: 7 }}>{index + 1}</span>}
                            </div>
                            <div
                                className={`glass-card !p-3 cursor-pointer transition-all ${isActive ? '!border-[color:var(--theme-color,#7c3aed)]' : ''}`}
                                onClick={() => handlePreviewVersion(version)}
                                style={isActive ? { background: 'rgba(var(--theme-color-rgb, 139,92,246), 0.04)' } : {}}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <code className={`text-[10px] font-mono ${isActive ? 'font-bold' : ''}`} style={isActive ? { color: 'var(--theme-color, #7c3aed)' } : {}}>
                                            {version.versionId?.substring(0, 8)}...
                                        </code>
                                        {version.isLatest && (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>CURRENT</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Tooltip title="Download">
                                            <button className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 meta-label"
                                                onClick={(e) => { e.stopPropagation(); handleDownloadVersion(version.versionId); }}>
                                                <DownloadOutlined />
                                            </button>
                                        </Tooltip>
                                        {!version.isLatest && (
                                            <Tooltip title="Restore">
                                                <button className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 meta-label"
                                                    onClick={(e) => { e.stopPropagation(); handleRestoreVersion(version.versionId); }}>
                                                    <RollbackOutlined />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] meta-label">
                                    <span className="flex items-center gap-1"><ClockCircleOutlined style={{ fontSize: 8 }} /> {getRelativeTime(version.lastModified)}</span>
                                    <span>{formatDetailFileSize(version.size)}</span>
                                    {sizeChange !== 0 && index < versions.length - 1 && (
                                        <span style={{ color: sizeChange > 0 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                                            {sizeChange > 0 ? '↑' : '↓'} {formatDetailFileSize(Math.abs(sizeChange))}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

interface MediaPreviewContentProps {
    activeMedia: MediaFile;
    imgDimensions: { w: number; h: number } | null;
    isPublicBucket?: boolean;
    mode: 'preview' | 'detail';
    handleImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    handleVideoLoad: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    handleDownload: () => void;
    copyToClipboard: (text: string, msg?: string) => void;
    getFileIcon: (mimeType?: string) => React.ReactNode;
    formatFileSize: (bytes?: number) => string;
    previewUrl: string | null; // Added previewUrl
}

const MediaPreviewContent = ({
    activeMedia,
    imgDimensions,
    isPublicBucket,
    mode,
    handleImageLoad,
    handleVideoLoad,
    handleDownload,
    copyToClipboard,
    getFileIcon,
    formatFileSize,
    previewUrl // Destructure previewUrl
}: MediaPreviewContentProps) => {
    const isPublic = isPublicBucket ?? false;
    const [isEditing, setIsEditing] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [scaleX, setScaleX] = useState(1);
    const [scaleY, setScaleY] = useState(1);

    let displayUrl = previewUrl || activeMedia.url; // Use previewUrl if available, otherwise activeMedia.url
    let showGenerated = false;

    if (!isPublic && !previewUrl) { // Only show "System Preview" if not public and not a version preview
        if (activeMedia.mime_type?.startsWith('image/') && activeMedia.thumbnailUrl) {
            displayUrl = activeMedia.thumbnailUrl;
            showGenerated = true;
        }
    }

    const isPdf = activeMedia.mime_type === 'application/pdf';
    const hasPdfPreviews = isPdf && activeMedia.previewPages && activeMedia.previewPages.length > 0;
    const showPdfPreviews = hasPdfPreviews && mode === 'preview';

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="flex-1 relative flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {imgDimensions && !isEditing && (
                    <div className="absolute top-3 right-3 z-10 bg-black/50 text-white px-2 py-0.5 rounded text-xs font-mono">
                        {imgDimensions.w} × {imgDimensions.h}
                    </div>
                )}

                {showGenerated && !isEditing && (
                    <div className="absolute top-3 left-3 z-10 bg-[var(--theme-color,#7c3aed)]/90 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        System Preview
                    </div>
                )}

                <div className="w-full h-full flex flex-col items-center justify-center bg-white relative">
                    {activeMedia.mime_type?.startsWith("image/") ? (
                        <>
                            {isEditing && (
                                <div className="absolute top-0 left-0 w-full p-2 flex justify-center gap-2 z-20" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <Tooltip title="Rotate Left">
                                        <Button size="small" icon={<UndoOutlined />} onClick={() => setRotation(r => r - 90)} />
                                    </Tooltip>
                                    <Tooltip title="Rotate Right">
                                        <Button size="small" icon={<RedoOutlined />} onClick={() => setRotation(r => r + 90)} />
                                    </Tooltip>
                                    <Divider orientation="vertical" />
                                    <Tooltip title="Flip Horizontal">
                                        <Button size="small" icon={<ColumnWidthOutlined />} onClick={() => setScaleX(s => s * -1)} />
                                    </Tooltip>
                                    <Tooltip title="Flip Vertical">
                                        <Button size="small" icon={<ColumnHeightOutlined />} onClick={() => setScaleY(s => s * -1)} />
                                    </Tooltip>
                                    <Divider orientation="vertical" />
                                    <Tooltip title="Crop Mode">
                                        <Button size="small" icon={<ScissorOutlined />} />
                                    </Tooltip>
                                    <Tooltip title="Apply Filters">
                                        <Button size="small" icon={<FormatPainterOutlined />} />
                                    </Tooltip>
                                    <div className="flex-1" />
                                    <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button size="small" type="primary" onClick={() => { setIsEditing(false); message.success('Changes saved (stub)'); }}>Save Changes</Button>
                                </div>
                            )}
                            <div className="w-full h-full overflow-auto flex items-center justify-center relative">
                                <Image
                                    src={displayUrl}
                                    alt={activeMedia.alt_text || activeMedia.filename}
                                    className="object-contain transition-transform duration-300"
                                    style={{ 
                                        height: 'auto', width: 'auto', maxWidth: '100%', maxHeight: '100%',
                                        transform: `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`
                                    }}
                                    onLoad={handleImageLoad}
                                    preview={!isEditing}
                                />
                            </div>
                            {!isEditing && (
                                <div className="absolute bottom-4 right-4 z-10">
                                    <Tooltip title="Edit Image">
                                        <Button type="primary" shape="circle" icon={<EditOutlined />} size="large" onClick={() => setIsEditing(true)} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                                    </Tooltip>
                                </div>
                            )}
                        </>
                    ) : showPdfPreviews ? (
                        <div className="w-full h-full overflow-y-auto bg-gray-100 flex flex-col items-center gap-4 p-4">
                            {activeMedia.previewPages!.map((pageUrl, idx) => (
                                <img
                                    key={idx}
                                    src={pageUrl}
                                    alt={`Page ${idx + 1}`}
                                    className="shadow-lg border border-gray-200 max-w-full"
                                    style={{ width: '100%', maxWidth: '600px' }}
                                />
                            ))}
                        </div>
                    ) : activeMedia.mime_type?.startsWith("video/") ? (
                        <div className="w-full h-full overflow-auto flex items-center justify-center">
                            <video
                                src={displayUrl} // Use displayUrl for video as well
                                poster={activeMedia.thumbnailUrl}
                                controls
                                className="max-h-full max-w-full"
                                onLoadedMetadata={handleVideoLoad}
                            />
                        </div>
                    ) : activeMedia.mime_type?.includes('pdf') ? (
                        <iframe
                            src={displayUrl}
                            className="w-full h-full border-none rounded-sm"
                            title="PDF Preview"
                        />
                    ) : isDocumentPreviewable(activeMedia.filename, activeMedia.mime_type) ? (
                        <ErrorBoundary>
                            <DocumentPreview
                                url={displayUrl || ""}
                                filename={activeMedia.filename || ""}
                                mimeType={activeMedia.mime_type || ""}
                            />
                        </ErrorBoundary>
                    ) : (
                        <div className="w-full h-full overflow-auto flex items-center justify-center">
                            <div className="text-center p-8 flex flex-col items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-lg font-black uppercase tracking-wider"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(var(--theme-color-rgb, 139,92,246), 0.08), rgba(var(--theme-color-rgb, 139,92,246), 0.02))',
                                        border: '2px solid rgba(var(--theme-color-rgb, 139,92,246), 0.12)',
                                        color: 'var(--theme-color, #7c3aed)',
                                    }}>
                                    {activeMedia.filename?.split('.').pop()?.substring(0, 4) || '?'}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm font-semibold max-w-[200px] truncate"
                                        style={{ color: 'var(--foreground, #1f2937)' }}>
                                        {activeMedia.filename}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold"
                                        style={{ color: 'rgba(0,0,0,0.25)' }}>
                                        {activeMedia.mime_type || 'Unknown type'} · {formatFileSize(activeMedia.size_bytes)}
                                    </span>
                                </div>
                                <Button type="primary" onClick={handleDownload} icon={<DownloadOutlined />}
                                    style={{ background: 'var(--theme-color, #7c3aed)', borderColor: 'var(--theme-color, #7c3aed)', borderRadius: 10 }}>
                                    Download File
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Preview mode info now shown in hover strip + floating toolbar */}
        </div>
    );
};

export default function MediaPreviewModal({
    visible,
    mediaFile,
    onClose,
    mode = 'preview',
    isPublicBucket,
    onUpdate,
    onOpenDetail
}: MediaPreviewModalProps) {
    const [fullMedia, setFullMedia] = useState<MediaFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingEmbed, setIsGeneratingEmbed] = useState(false);
    const [isAutoLabeling, setIsAutoLabeling] = useState(false);
    const [embeddingStatus, setEmbeddingStatus] = useState<{
        status: string;
        progress: number;
        chunkCount: number;
        progressMsg: string;
    } | undefined>(undefined);

    // Version History State
    const { token } = theme.useToken();
    const isDarkMode = token.colorBgContainer === '#141414' || token.colorBgBase === '#000' || token.colorBgBase === '#000000';
    const [versions, setVersions] = useState<ObjectVersion[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploadingVersion, setIsUploadingVersion] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'vector' | 'history'>('info');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isHoveringPreview, setIsHoveringPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (visible && mediaFile?.id) {
            console.log('[MediaPreviewModal] Opening:', mediaFile.id, mediaFile.filename);
            fetchMediaDetails(mediaFile.id);
            if (mode === 'detail') {
                loadVersions(mediaFile.s3_key || mediaFile.id);
            }
        } else {
            setFullMedia(null);
            setVersions([]);
            setImgDimensions(null);
        }
    }, [visible, mediaFile, mode]);

    // Poll embedding status on load and during parsing
    useEffect(() => {
        if (!visible || !mediaFile?.id) return;

        const fetchStatus = async () => {
            try {
                const status = await mediaService.getEmbeddingStatus(mediaFile.id);
                setEmbeddingStatus(status);
                return status;
            } catch (e) {
                console.error('Failed to fetch embedding status', e);
                return null;
            }
        };

        // Initial fetch
        fetchStatus();

        // Poll while parsing/pending
        const interval = setInterval(async () => {
            const status = await fetchStatus();
            if (status && (status.status === 'done' || status.status === 'error' || status.status === 'none')) {
                clearInterval(interval);
                // Re-fetch media details if just completed
                if (status.status === 'done') {
                    fetchMediaDetails(mediaFile.id);
                }
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [visible, mediaFile?.id]);

    const activeMedia = fullMedia || mediaFile;

    // Diagnostic logging for activeMedia updates
    useEffect(() => {
        if (activeMedia) {
            console.log('[MediaPreviewModal] activeMedia:', {
                id: activeMedia.id,
                filename: activeMedia.filename,
                mime_type: activeMedia.mime_type,
                url: !!activeMedia.url,
                hasTags: Array.isArray(activeMedia.metadata?.tags)
            });
        }
    }, [activeMedia]);

    const fetchMediaDetails = async (idOrKey: string) => {
        setIsLoading(true);
        try {
            // Check if it's a UUID (approximate regex)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);
            let data;

            if (isUuid) {
                data = await mediaService.getMediaById(idOrKey);
            } else {
                // Assume it's an S3 Key if not a UUID
                data = await mediaService.getMediaByS3Key(idOrKey);
            }

            console.log('[MediaPreviewModal] fetchMediaDetails result:', data?.id, 'embedding:', data?.embedding ? 'exists' : 'null');
            // Force new object reference for React state update
            setFullMedia(data ? { ...data } : mediaFile);
        } catch (err) {
            console.error("Failed to fetch media details:", err);
            setFullMedia(mediaFile);
        } finally {
            setIsLoading(false);
        }
    };

    const loadVersions = async (fileKey: string) => {
        setLoadingVersions(true);
        try {
            const data = await mediaService.listObjectVersions(fileKey);
            setVersions(data);
        } catch (error) {
            console.error('Failed to load version history', error);
        }
        setLoadingVersions(false);
    };


    const handleDownloadVersion = async (versionId: string) => {
        if (!activeMedia?.s3_key) return;
        try {
            message.loading({ content: 'Getting download link...', key: 'dl_ver' });
            const url = await mediaService.getVersionPresignedUrl(activeMedia.s3_key, versionId);
            if (url) {
                window.open(url, '_blank');
                message.success({ content: 'Download started', key: 'dl_ver' });
            } else {
                message.error({ content: 'Failed to get download link', key: 'dl_ver' });
            }
        } catch (e) {
            message.error({ content: 'Error downloading version', key: 'dl_ver' });
        }
    };

    const handlePreviewVersion = async (version: ObjectVersion) => {
        if (!version || !activeMedia?.s3_key) return;
        try {
            message.loading({ content: 'Loading version preview...', key: 'preview' });
            if (version.isLatest) {
                setPreviewUrl(null); // Clear manual override to use default
                message.success({ content: 'Showing latest version', key: 'preview' });
            } else {
                const url = await mediaService.getVersionPresignedUrl(activeMedia.s3_key, version.versionId);
                if (url) {
                    setPreviewUrl(url);
                    message.success({ content: 'Previewing selected version', key: 'preview' });
                } else {
                    message.error({ content: 'Failed to get preview URL', key: 'preview' });
                }
            }
        } catch (error) {
            console.error('Preview error:', error);
            message.error({ content: 'Failed to preview version', key: 'preview' });
        }
    };

    const handleRestoreVersion = async (versionId: string) => {
        if (!activeMedia?.s3_key) return;
        try {
            message.loading({ content: 'Restoring version...', key: 'restore' });
            const success = await mediaService.setDefaultVersion(activeMedia.s3_key, versionId);
            if (success) {
                message.success({ content: 'Version restored as default', key: 'restore' });
                if (activeMedia.id) await fetchMediaDetails(activeMedia.id);
                loadVersions(activeMedia.s3_key);
                onUpdate?.();
            } else {
                message.error({ content: 'Failed to restore version', key: 'restore' });
            }
        } catch (error) {
            message.error({ content: 'Error restoring version', key: 'restore' });
        }
    };

    const handleUploadVersion = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeMedia) return;

        setIsUploadingVersion(true);
        try {
            message.loading({ content: 'Uploading new version...', key: 'upload' });

            // Standard upload to same bucket/folder acts as new version if key matches (or overwrites)
            // We reuse uploadMedia. If user uploads same filename, it updates.
            // If strict logic needed, we'd need to force key.
            // Assumption: User knows to upload same file or we accept filename drift (which changes s3 key actually if not renamed).
            // To ensure it updates THIS media entry, we should rename file to match original filename?
            // If filenames differ, it creates a NEW media entry in DB usually.
            // Unless we update existing media entry?
            // `uploadMedia` creates new DB entry.
            // If we want versioning, we typically mean S3 versioning under SAME KEY.
            // So we must force filename match if we rely on `uploadMedia` resolver logic.

            const renamedFile = new File([file], activeMedia.filename, { type: file.type });
            const s3Key = activeMedia.s3_key || '';
            const lastSlash = s3Key.lastIndexOf('/');
            const folder = lastSlash > -1 ? s3Key.substring(0, lastSlash) : '';

            // Using 'OVERWRITE' conflict strategy to force S3 update (new version) and DB update?
            // backend uploadMedia might create duplicate DB entry if not careful.
            // But if we overwrite, maybe it updates?

            const result = await mediaService.uploadMedia(
                renamedFile,
                folder,
                activeMedia.bucket_name,
                activeMedia.alt_text,
                false,
                false,
                'OVERWRITE'
            );

            if (result) {
                message.success({ content: 'New version uploaded', key: 'upload' });
                // Refresh
                if (activeMedia.id) await fetchMediaDetails(activeMedia.id);
                if (activeMedia.s3_key) loadVersions(activeMedia.s3_key);
                onUpdate?.();
            } else {
                message.error({ content: 'Upload failed', key: 'upload' });
            }
        } catch (error) {
            console.error(error);
            message.error({ content: 'Failed to upload version', key: 'upload' });
        } finally {
            setIsUploadingVersion(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveEmbeddings = async () => {
        if (!activeMedia?.id) return;
        try {
            message.loading({ content: 'Removing embeddings...', key: 'embed_rm' });
            console.log('[MediaPreviewModal] Removing embeddings for ID:', activeMedia.id);
            const success = await mediaService.removeMediaEmbeddings(activeMedia.id);
            console.log('[MediaPreviewModal] Remove result:', success);
            if (success) {
                message.success({ content: 'Embeddings removed', key: 'embed_rm' });

                // Clear embedding state
                setEmbeddingStatus(undefined);
                if (fullMedia) {
                    setFullMedia({ ...fullMedia, embedding: undefined });
                }

                // Re-fetch to sync with backend and trigger other updates
                await fetchMediaDetails(activeMedia.id);
                onUpdate?.();
            } else {
                message.error({ content: 'Failed to remove embeddings', key: 'embed_rm' });
            }
        } catch (error) {
            console.error('[MediaPreviewModal] Error removing embeddings:', error);
            message.error({ content: 'Error removing embeddings', key: 'embed_rm' });
        }
    };

    const copyToClipboard = (text: string, msg: string = "Copied to clipboard") => {
        navigator.clipboard.writeText(text);
        message.success(msg);
    };

    const handleGenerateEmbeddings = async () => {
        if (!mediaFile) return;
        setIsGeneratingEmbed(true);
        try {
            const success = await mediaService.generateMediaEmbeddings(mediaFile.id, "");
            if (success) {
                message.success('Embedding generated — indexed in pgvector');
                setEmbeddingStatus({
                    status: 'parsing',
                    progress: 0,
                    chunkCount: 0,
                    progressMsg: 'Starting...',
                });
                // Fetch actual status from backend
                const status = await mediaService.getEmbeddingStatus(mediaFile.id);
                setEmbeddingStatus(status);
                onUpdate?.();
            } else {
                const msg = 'Failed to generate embeddings (Server returned false)';
                message.error(msg);
            }
        } catch (error: any) {
            console.error("Error in handleGenerateEmbeddings:", error);
            const msg = `Error generating embeddings: ${error.message || JSON.stringify(error)}`;
            message.error(msg);
        } finally {
            setIsGeneratingEmbed(false);
        }
    };

    const handleAutoLabel = async () => {
        if (!mediaFile) return;
        setIsAutoLabeling(true);
        try {
            message.loading({ content: 'Auto-labeling in progress...', key: 'autolabel' });
            const labels = await mediaService.autoLabelMedia(mediaFile.id);
            if (labels && labels.length > 0) {
                message.success({ content: `Labels generated: ${labels.join(', ')}`, key: 'autolabel' });
                await fetchMediaDetails(mediaFile.id);
            } else {
                message.warning({ content: 'No labels were generated', key: 'autolabel' });
            }
        } catch (error) {
            console.error(error);
            message.error({ content: 'Failed to auto-label media', key: 'autolabel' });
        } finally {
            setIsAutoLabeling(false);
        }
    };

    const getFileIcon = (mimeType?: string) => {
        if (!mimeType) return <FileOutlined />;
        if (mimeType.startsWith("image/")) return <FileImageOutlined />;
        if (mimeType.startsWith("video/")) return <VideoCameraOutlined />;
        return <FileOutlined />;
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "Unknown";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    // Embedding parsing
    const embeddingVector = useMemo(() => {
        if (!activeMedia?.embedding) return [];
        try {
            let result = typeof activeMedia.embedding === 'string'
                ? JSON.parse(activeMedia.embedding)
                : activeMedia.embedding;

            // Handle potential double-encoding (string inside string)
            if (typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    console.warn('Failed to double-parse embedding', e);
                }
            }

            return Array.isArray(result) ? result : [];
        } catch (e) {
            console.error('Failed to parse embedding', e);
            return [];
        }
    }, [activeMedia]);

    const embeddingDim = embeddingVector.length;

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    };

    const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const vid = e.currentTarget;
        setImgDimensions({ w: vid.videoWidth, h: vid.videoHeight });
    };

    // --- Actions ---

    const handleDownload = async () => {
        if (!activeMedia) return;
        try {
            window.open(activeMedia.url, "_blank");
        } catch (error) {
            message.error("Failed to download file");
        }
    };

    if (!activeMedia) return null;

    const modalTitle = (
        <div className="modal-header-title flex items-center gap-3 px-4 py-2">
            <div className="modal-header-icon w-8 h-8 flex-none rounded-lg flex items-center justify-center text-sm">
                {getFileIcon(activeMedia.mime_type)}
            </div>
            <div className="flex flex-col min-w-0 justify-center">
                <span className="modal-header-filename truncate max-w-[320px] text-sm leading-tight font-semibold tracking-tight">
                    {activeMedia.filename}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="modal-header-meta text-[9px] uppercase tracking-widest font-bold">{activeMedia.mime_type?.split('/')[1] || 'FILE'}</span>
                    <span className="modal-header-dot w-0.5 h-0.5 rounded-full"></span>
                    <span className="modal-header-meta text-[9px] font-medium">{formatFileSize(activeMedia.size_bytes)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            width={mode === 'detail' ? '92vw' : 760}
            centered
            title={modalTitle}
            footer={null}
            className="media-preview-modal"
            maskClosable={true}
            destroyOnClose
            keyboard={true}
            closable={false}
            style={mode === 'detail' ? { top: '3vh', height: '90vh', maxWidth: '100vw', padding: 0, paddingBottom: 0 } : { padding: 0 }}
            styles={{
                header: {
                    padding: 0,
                    marginBottom: 0,
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                },
                body: {
                    padding: 0,
                    height: mode === 'detail' ? 'calc(90vh - 52px)' : 'auto',
                    overflow: 'hidden'
                },
                // @ts-ignore
                content: {
                    padding: 0,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    height: mode === 'detail' ? '90vh' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
            modalRender={(modal) => (
                <div className="redesigned-modal-wrapper modal-scale-enter">
                    <style>{`
                        /* ═══ MODAL RESET ═══ */
                        .redesigned-modal-wrapper .ant-modal,
                        .ant-modal.media-preview-modal {
                            max-width: 100vw !important;
                            padding-bottom: 0 !important;
                            --ant-modal-content-padding: 0 !important;
                        }
                        .redesigned-modal-wrapper .ant-modal .ant-modal-content,
                        .ant-modal.media-preview-modal .ant-modal-content {
                            padding: 0 !important;
                            overflow: hidden !important;
                            background: #ffffff;
                            border: 1px solid rgba(0,0,0,0.08);
                            box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
                        }
                        html.dark .redesigned-modal-wrapper .ant-modal .ant-modal-content,
                        html.dark .ant-modal.media-preview-modal .ant-modal-content {
                            background: #0f1117;
                            border: 1px solid rgba(255,255,255,0.08);
                            box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
                        }
                        .redesigned-modal-wrapper .ant-modal .ant-modal-body,
                        .ant-modal.media-preview-modal .ant-modal-body {
                            padding: 0 !important;
                        }

                        /* ═══ MODAL HEADER ═══ */
                        .redesigned-modal-wrapper .ant-modal-header {
                            background: #ffffff !important;
                            border-bottom: 1px solid rgba(0,0,0,0.06) !important;
                        }
                        html.dark .redesigned-modal-wrapper .ant-modal-header {
                            background: #0f1117 !important;
                            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        }
                        .modal-header-icon {
                            background: rgba(0,0,0,0.04);
                            color: rgba(0,0,0,0.6);
                        }
                        html.dark .modal-header-icon {
                            background: rgba(255,255,255,0.1);
                            color: rgba(255,255,255,0.8);
                        }
                        .modal-header-filename {
                            color: #1f2937;
                        }
                        html.dark .modal-header-filename {
                            color: rgba(255,255,255,0.9);
                        }
                        .modal-header-meta {
                            color: #9ca3af;
                        }
                        html.dark .modal-header-meta {
                            color: rgba(255,255,255,0.4);
                        }
                        .modal-header-dot {
                            background: #d1d5db;
                        }
                        html.dark .modal-header-dot {
                            background: rgba(255,255,255,0.2);
                        }
                        .modal-close-btn {
                            color: #6b7280;
                        }
                        .modal-close-btn:hover {
                            background: rgba(0,0,0,0.06);
                            color: #1f2937;
                        }
                        html.dark .modal-close-btn {
                            color: rgba(255,255,255,0.7);
                        }
                        html.dark .modal-close-btn:hover {
                            background: rgba(255,255,255,0.15);
                            color: #fff;
                        }

                        /* ═══ CHECKERBOARD ═══ */
                        .checker-bg {
                            background-color: #f3f4f6;
                            background-image: repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%);
                            background-size: 16px 16px;
                        }
                        html.dark .checker-bg {
                            background-color: #0c0e14;
                            background-image: repeating-conic-gradient(#151722 0% 25%, #0f1119 0% 50%);
                        }

                        /* ═══ FLOATING TOOLBAR ═══ */
                        .floating-toolbar {
                            background: rgba(255,255,255,0.85);
                            backdrop-filter: blur(16px);
                            -webkit-backdrop-filter: blur(16px);
                            border: 1px solid rgba(0,0,0,0.08);
                            border-radius: 12px;
                            padding: 6px 8px;
                            display: flex;
                            align-items: center;
                            gap: 2px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
                        }
                        html.dark .floating-toolbar {
                            background: rgba(0,0,0,0.65);
                            border: 1px solid rgba(255,255,255,0.1);
                            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                        }
                        .floating-toolbar button {
                            background: transparent !important;
                            border: none !important;
                            color: #4b5563 !important;
                            border-radius: 8px !important;
                            transition: all 0.15s ease !important;
                            height: 32px !important;
                            min-width: 32px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            font-size: 13px !important;
                            padding: 0 10px !important;
                            gap: 6px !important;
                        }
                        .floating-toolbar button:hover {
                            background: rgba(0,0,0,0.06) !important;
                            color: #111827 !important;
                        }
                        html.dark .floating-toolbar button {
                            color: rgba(255,255,255,0.7) !important;
                        }
                        html.dark .floating-toolbar button:hover {
                            background: rgba(255,255,255,0.12) !important;
                            color: white !important;
                        }
                        .floating-toolbar .divider {
                            width: 1px;
                            height: 20px;
                            background: rgba(0,0,0,0.1);
                            margin: 0 4px;
                        }
                        html.dark .floating-toolbar .divider {
                            background: rgba(255,255,255,0.1);
                        }

                        /* ═══ GLASS CARDS ═══ */
                        .glass-card {
                            background: #ffffff;
                            border: 1px solid rgba(0,0,0,0.06);
                            border-radius: 10px;
                            padding: 14px;
                            transition: all 0.2s ease;
                        }
                        .glass-card:hover {
                            border-color: rgba(0,0,0,0.1);
                            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                        }
                        html.dark .glass-card {
                            background: rgba(255,255,255,0.03);
                            border-color: rgba(255,255,255,0.07);
                        }
                        html.dark .glass-card:hover {
                            background: rgba(255,255,255,0.05);
                            border-color: rgba(255,255,255,0.1);
                            box-shadow: none;
                        }

                        /* ═══ VERTICAL TAB RAIL ═══ */
                        .vtab-rail {
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                            padding: 8px 4px;
                            width: 44px;
                            background: #f9fafb;
                            border-left: 1px solid rgba(0,0,0,0.06);
                        }
                        html.dark .vtab-rail {
                            background: rgba(0,0,0,0.3);
                            border-left-color: rgba(255,255,255,0.06);
                        }
                        .vtab-rail button {
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border: none;
                            background: transparent;
                            color: #9ca3af;
                            cursor: pointer;
                            transition: all 0.15s ease;
                            font-size: 15px;
                            position: relative;
                        }
                        html.dark .vtab-rail button {
                            color: rgba(255,255,255,0.35);
                        }
                        .vtab-rail button:hover {
                            color: #4b5563;
                            background: rgba(0,0,0,0.04);
                        }
                        html.dark .vtab-rail button:hover {
                            color: rgba(255,255,255,0.7);
                            background: rgba(255,255,255,0.06);
                        }
                        .vtab-rail button.active {
                            color: var(--theme-color, #7c3aed);
                            background: rgba(var(--theme-color-rgb, 139,92,246), 0.08);
                        }
                        html.dark .vtab-rail button.active {
                            background: rgba(var(--theme-color-rgb, 139,92,246), 0.15);
                        }
                        .vtab-rail button.active::before {
                            content: '';
                            position: absolute;
                            left: -4px;
                            top: 8px;
                            bottom: 8px;
                            width: 2px;
                            border-radius: 2px;
                            background: var(--theme-color, #7c3aed);
                        }

                        /* ═══ DETAIL SIDEBAR ═══ */
                        .detail-sidebar {
                            background: #f9fafb;
                            color: #1f2937;
                            border-left: 1px solid rgba(0,0,0,0.06);
                        }
                        html.dark .detail-sidebar {
                            background: #111827;
                            color: #e5e7eb;
                            border-left-color: rgba(255,255,255,0.06);
                        }
                        .detail-sidebar .section-title {
                            font-size: 9px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                            color: #9ca3af;
                            margin-bottom: 10px;
                            padding-left: 2px;
                        }
                        html.dark .detail-sidebar .section-title {
                            color: rgba(255,255,255,0.3);
                        }
                        .detail-sidebar .meta-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 6px 0;
                            border-bottom: 1px solid rgba(0,0,0,0.04);
                        }
                        html.dark .detail-sidebar .meta-row {
                            border-bottom-color: rgba(255,255,255,0.04);
                        }
                        .detail-sidebar .meta-row:last-child { border-bottom: none; }
                        .detail-sidebar .meta-label {
                            font-size: 11px;
                            color: #6b7280;
                        }
                        html.dark .detail-sidebar .meta-label {
                            color: rgba(255,255,255,0.4);
                        }
                        .detail-sidebar .meta-value {
                            font-size: 11px;
                            color: #1f2937;
                            font-weight: 500;
                        }
                        html.dark .detail-sidebar .meta-value {
                            color: rgba(255,255,255,0.8);
                        }

                        /* ═══ SIDEBAR OVERRIDES FOR ANT COMPONENTS ═══ */
                        .detail-sidebar .ant-typography {
                            color: #6b7280 !important;
                        }
                        html.dark .detail-sidebar .ant-typography {
                            color: rgba(255,255,255,0.5) !important;
                        }
                        .detail-sidebar .ant-typography-copy {
                            color: #9ca3af !important;
                        }
                        html.dark .detail-sidebar .ant-typography-copy {
                            color: rgba(255,255,255,0.3) !important;
                        }

                        /* ═══ DESCRIPTION EDITOR ═══ */
                        .desc-textarea {
                            background: rgba(0,0,0,0.02) !important;
                            border-color: rgba(0,0,0,0.1) !important;
                            color: #1f2937 !important;
                        }
                        html.dark .desc-textarea {
                            background: rgba(0,0,0,0.3) !important;
                            border-color: rgba(255,255,255,0.1) !important;
                            color: rgba(255,255,255,0.8) !important;
                        }
                        .desc-btn-cancel {
                            background: transparent !important;
                            border-color: rgba(0,0,0,0.1) !important;
                            color: #6b7280 !important;
                        }
                        html.dark .desc-btn-cancel {
                            border-color: rgba(255,255,255,0.1) !important;
                            color: rgba(255,255,255,0.5) !important;
                        }
                        .desc-btn-save {
                            background: rgba(var(--theme-color-rgb, 139,92,246), 0.08) !important;
                            border-color: rgba(var(--theme-color-rgb, 139,92,246), 0.2) !important;
                            color: var(--theme-color, #7c3aed) !important;
                        }
                        html.dark .desc-btn-save {
                            background: rgba(255,255,255,0.1) !important;
                            border-color: rgba(255,255,255,0.1) !important;
                            color: rgba(255,255,255,0.8) !important;
                        }

                        /* ═══ AI TAB INNER CARD ═══ */
                        .ai-inner-card {
                            background: rgba(0,0,0,0.015) !important;
                        }
                        html.dark .ai-inner-card {
                            background: rgba(0,0,0,0.2) !important;
                        }
                        .ai-empty-icon {
                            color: rgba(0,0,0,0.08) !important;
                        }
                        html.dark .ai-empty-icon {
                            color: rgba(255,255,255,0.12) !important;
                        }
                        .progress-track {
                            background: rgba(0,0,0,0.06);
                        }
                        html.dark .progress-track {
                            background: rgba(255,255,255,0.06);
                        }

                        /* ═══ DIMENSION BADGE ═══ */
                        .dim-badge {
                            background: rgba(255,255,255,0.85);
                            color: #374151;
                            border: 1px solid rgba(0,0,0,0.08);
                        }
                        html.dark .dim-badge {
                            background: rgba(0,0,0,0.6);
                            color: rgba(255,255,255,0.7);
                            border: 1px solid rgba(255,255,255,0.1);
                        }

                        /* ═══ STATUS BAR & PREVIEW SIZE TEXT ═══ */
                        .toolbar-size-text {
                            color: rgba(0,0,0,0.3);
                        }
                        html.dark .toolbar-size-text {
                            color: rgba(255,255,255,0.3);
                        }
                        .toolbar-public-text {
                            color: #34d399;
                        }

                        /* ═══ HORIZONTAL TAB BAR ═══ */
                        html.dark .detail-sidebar [style*="border-bottom"] {
                            border-bottom-color: rgba(255,255,255,0.06) !important;
                        }
                        html.dark .detail-sidebar [style*="border-top"] {
                            border-top-color: rgba(255,255,255,0.06) !important;
                        }
                        .detail-sidebar button:not(.ant-btn) {
                            border: none;
                            cursor: pointer;
                        }
                        html.dark .detail-sidebar button:not(.ant-btn):not([style*="color"]) {
                            color: rgba(255,255,255,0.5);
                        }
                        html.dark .detail-sidebar button:not(.ant-btn):hover {
                            background: rgba(255,255,255,0.06) !important;
                        }
                    `}</style>
                    {modal}
                </div>
            )}
        >
            {mode === 'preview' ? (
                /* ═══ PREVIEW LIGHTBOX ═══ */
                <div className="h-[65vh] flex flex-col relative">
                    {/* Full-bleed preview area */}
                    <div className="flex-1 checker-bg relative flex items-center justify-center overflow-hidden"
                        onMouseEnter={() => setIsHoveringPreview(true)}
                        onMouseLeave={() => setIsHoveringPreview(false)}>
                        {imgDimensions && (
                            <div className="absolute top-3 right-3 z-20 dim-badge backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-mono">
                                {imgDimensions.w} × {imgDimensions.h}
                            </div>
                        )}
                        <MediaPreviewContent
                            activeMedia={activeMedia}
                            imgDimensions={null}
                            isPublicBucket={isPublicBucket}
                            mode={mode}
                            handleImageLoad={handleImageLoad}
                            handleVideoLoad={handleVideoLoad}
                            handleDownload={handleDownload}
                            copyToClipboard={copyToClipboard}
                            getFileIcon={getFileIcon}
                            formatFileSize={formatFileSize}
                            previewUrl={previewUrl}
                        />
                        {/* Hover info strip */}
                        {isHoveringPreview && (
                            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-xl text-[10px]"
                                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.85)', animation: 'infoStripIn 0.2s ease-out' }}>
                                <span className="font-medium truncate max-w-[200px]">{activeMedia.filename}</span>
                                <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
                                <span className="uppercase font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{activeMedia.mime_type?.split('/')[1] || 'FILE'}</span>
                                {imgDimensions && <>
                                    <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
                                    <span className="font-mono">{imgDimensions.w}×{imgDimensions.h}</span>
                                </>}
                                <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
                                <span>{formatFileSize(activeMedia.size_bytes)}</span>
                            </div>
                        )}
                        {/* Bottom gradient for toolbar visual continuity */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-10"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.08), transparent)' }} />
                    </div>

                    {/* Floating toolbar */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 floating-toolbar">
                        <span className="text-[10px] font-semibold px-2 truncate max-w-[120px] toolbar-size-text">{activeMedia.filename?.split('.').pop()?.toUpperCase()}</span>
                        <div className="divider" />
                        <Tooltip title="Download"><Button icon={<DownloadOutlined />} onClick={handleDownload} /></Tooltip>
                        <Tooltip title="Copy URL"><Button icon={<CopyOutlined />} onClick={() => copyToClipboard(activeMedia.url)} /></Tooltip>
                        <div className="divider" />
                        <Tooltip title="Open Details">
                            <Button icon={<ExpandAltOutlined />} onClick={() => {
                                if (onOpenDetail && activeMedia) {
                                    const file = { ...activeMedia };
                                    onClose();
                                    setTimeout(() => onOpenDetail(file), 200);
                                }
                            }}>
                                <span className="text-[11px]">Details</span>
                            </Button>
                        </Tooltip>
                        <div className="divider" />
                        <span className="text-[9px] toolbar-size-text px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(0,0,0,0.04)' }}>ESC</span>
                    </div>
                </div>
            ) : (
                /* ═══ CINEMA DETAIL MODE ═══ */
                <div className="flex h-full w-full overflow-hidden">
                    {/* LEFT: Preview Area */}
                    <div className="flex-1 checker-bg relative overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
                            {imgDimensions && (
                                <div className="absolute top-3 right-3 z-20 dim-badge backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-mono">
                                    {imgDimensions.w} × {imgDimensions.h}
                                </div>
                            )}
                            <MediaPreviewContent
                                activeMedia={activeMedia}
                                imgDimensions={null}
                                isPublicBucket={isPublicBucket}
                                mode={mode}
                                handleImageLoad={handleImageLoad}
                                handleVideoLoad={handleVideoLoad}
                                handleDownload={handleDownload}
                                copyToClipboard={copyToClipboard}
                                getFileIcon={getFileIcon}
                                formatFileSize={formatFileSize}
                                previewUrl={previewUrl}
                            />
                        </div>
                        {/* Floating toolbar */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 floating-toolbar">
                            <Tooltip title="Download"><Button icon={<DownloadOutlined />} onClick={handleDownload} /></Tooltip>
                            <Tooltip title="Copy URL"><Button icon={<CopyOutlined />} onClick={() => copyToClipboard(activeMedia.url)} /></Tooltip>
                            {isPublicBucket && <><div className="divider" /><span className="text-[10px] toolbar-public-text px-1">Public</span></>}
                            <div className="divider" />
                            <Tooltip title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}>
                                <Button icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
                            </Tooltip>
                        </div>
                    </div>

                    {/* RIGHT: Sidebar with horizontal tabs */}
                    <div className={`sidebar-collapsible detail-sidebar flex flex-col h-full overflow-hidden ${sidebarCollapsed ? 'collapsed' : ''}`}
                        style={{ width: sidebarCollapsed ? 0 : 380, flexShrink: 0 }}>

                        {/* Horizontal Tab Bar */}
                        <div className="flex items-center gap-1 px-4 pt-4 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {([
                                { key: 'info', icon: <InfoCircleOutlined />, label: 'Info' },
                                { key: 'vector', icon: <RobotOutlined />, label: 'AI' },
                                { key: 'history', icon: <HistoryOutlined />, label: 'History' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
                                    style={{
                                        background: activeTab === tab.key ? 'rgba(var(--theme-color-rgb, 139,92,246), 0.08)' : 'transparent',
                                        color: activeTab === tab.key ? 'var(--theme-color, #7c3aed)' : undefined,
                                        fontWeight: activeTab === tab.key ? 600 : 400,
                                    }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content with animation */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5" key={activeTab}>
                            <div className="tab-content-animated">
                                {activeTab === 'info' && (
                                    <InfoTab
                                        activeMedia={activeMedia}
                                        embeddingDim={embeddingDim}
                                        embeddingVector={embeddingVector}
                                        versions={versions}
                                        getRelativeTime={getRelativeTime}
                                        formatFileSize={formatFileSize}
                                        embeddingStatus={embeddingStatus}
                                        onUpdateDescription={async (newDesc) => {
                                            const updatedMedia = await mediaService.updateMedia(activeMedia.id, { description: newDesc });
                                            if (updatedMedia) {
                                                if (onUpdate) onUpdate();
                                                message.success("Description updated successfully");
                                            } else {
                                                throw new Error("Failed to update");
                                            }
                                        }}
                                    />
                                )}
                                {activeTab === 'vector' && (
                                    <AIIntelTab
                                        embeddingDim={embeddingDim}
                                        embeddingVector={embeddingVector}
                                        isLoading={isLoading}
                                        isGeneratingEmbed={isGeneratingEmbed}
                                        handleGenerateEmbeddings={handleGenerateEmbeddings}
                                        handleRemoveEmbeddings={handleRemoveEmbeddings}
                                        copyToClipboard={copyToClipboard}
                                        embeddingStatus={embeddingStatus}
                                    />
                                )}
                                {activeTab === 'history' && (
                                    <VersionsTab
                                        versions={versions}
                                        loadingVersions={loadingVersions}
                                        isUploadingVersion={isUploadingVersion}
                                        handleUploadVersion={handleUploadVersion}
                                        handlePreviewVersion={handlePreviewVersion}
                                        handleDownloadVersion={handleDownloadVersion}
                                        handleRestoreVersion={handleRestoreVersion}
                                        previewUrl={previewUrl}
                                        getRelativeTime={getRelativeTime}
                                        formatDetailFileSize={formatDetailFileSize}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Sticky Action Bar */}
                        <div className="flex-shrink-0 px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}
                                className="flex-1 text-[11px]" style={{ borderRadius: 8 }}>
                                Download
                            </Button>
                            <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(activeMedia.url)}
                                className="flex-1 text-[11px]" style={{ borderRadius: 8 }}>
                                Copy URL
                            </Button>
                            <Tooltip title="Delete">
                                <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}
                                    onClick={() => {
                                        message.warning('Delete from the media library grid');
                                    }} />
                            </Tooltip>
                        </div>
                    </div>
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={onFileChange}
            />
        </Modal >
    );
}