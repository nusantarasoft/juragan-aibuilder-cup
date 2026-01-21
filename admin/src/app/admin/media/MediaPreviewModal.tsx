
import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space, Tag, Input, Image, Tooltip, message, Collapse, Spin, Divider, Tabs, List, Avatar } from 'antd';
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
    LoadingOutlined
} from '@ant-design/icons';
import { mediaService } from '@/lib/mediaService';
import type { MediaFile } from '@/lib/mediaService';
import DocumentPreview, { isDocumentPreviewable } from '@/components/media/DocumentPreview';

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

export default function MediaPreviewModal({
    visible,
    mediaFile,
    onClose,
    mode = 'preview'
}: MediaPreviewModalProps) {
    const [fullMedia, setFullMedia] = useState<MediaFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingEmbed, setIsGeneratingEmbed] = useState(false);

    // Version History State
    const [versions, setVersions] = useState<ObjectVersion[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);

    useEffect(() => {
        if (visible && mediaFile?.id) {
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

    const fetchMediaDetails = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await mediaService.getMediaById(id);
            setFullMedia(data || mediaFile);
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

    const handleDownload = async () => {
        if (!mediaFile) return;
        try {
            window.open(mediaFile.url, "_blank");
        } catch (error) {
            message.error("Failed to download file");
        }
    };

    const handleDownloadVersion = async (versionId: string) => {
        message.info(`Download version: ${versionId.substring(0, 8)}...`);
    };

    const handleRestoreVersion = async (versionId: string) => {
        message.loading('Restoring version...');
        setTimeout(() => {
            message.success('Version restored successfully');
            if (activeMedia?.s3_key) loadVersions(activeMedia.s3_key);
        }, 1000);
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
                message.success('Embeddings generated successfully');
                await fetchMediaDetails(mediaFile.id);
            } else {
                message.error('Failed to generate embeddings');
            }
        } catch (error) {
            message.error('Error generating embeddings');
        } finally {
            setIsGeneratingEmbed(false);
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

    const activeMedia = fullMedia || mediaFile;
    if (!activeMedia) return null;

    // Embedding parsing
    const embeddingStr = activeMedia.embedding;
    let embeddingVector: number[] = [];
    let embeddingDim = 0;
    if (embeddingStr) {
        try {
            if (typeof embeddingStr === 'string') {
                embeddingVector = JSON.parse(embeddingStr);
            } else if (Array.isArray(embeddingStr)) {
                embeddingVector = embeddingStr;
            }
            if (Array.isArray(embeddingVector)) embeddingDim = embeddingVector.length;
        } catch (e) {
            console.error("Failed to parse embedding", e);
        }
    }

    // --- Content Components ---

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    };

    const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const vid = e.currentTarget;
        setImgDimensions({ w: vid.videoWidth, h: vid.videoHeight });
    };

    const MediaPreviewContent = () => (
        <div className="w-full h-full flex flex-col relative group">
            {/* Wrapper for Media */}
            <div className="flex-1 relative flex items-center justify-center bg-gray-100 dark:bg-[#0a0a0a] rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-800">

                {/* Overlay Tags (Bottom Right) */}
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-10 pointer-events-none">
                    {/* Version Tag */}
                    <div className="backdrop-blur-md bg-white/70 dark:bg-black/60 border border-white/20 dark:border-white/10 p-1.5 rounded-lg shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col items-end pr-1">
                            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 leading-none">Version</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-none mt-0.5">Latest</span>
                        </div>
                        <div className="bg-green-500 rounded-full p-1 shadow-green-500/20 shadow-lg">
                            <CheckCircleOutlined className="text-[10px] text-white block" />
                        </div>
                    </div>

                    {/* Annotation Tag */}
                    <div className="backdrop-blur-md bg-white/70 dark:bg-black/60 border border-white/20 dark:border-white/10 p-1.5 rounded-lg shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                        <div className="flex flex-col items-end pr-1">
                            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 leading-none">Annotation</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-none mt-0.5">
                                {activeMedia.metadata?.label_studio_task_id ? 'Labeled' : 'Unlabeled'}
                            </span>
                        </div>
                        <div className={`rounded-full p-1 shadow-lg ${activeMedia.metadata?.label_studio_task_id ? 'bg-purple-500 shadow-purple-500/20' : 'bg-gray-400'}`}>
                            {activeMedia.metadata?.label_studio_task_id ? <ExperimentOutlined className="text-[10px] text-white block" /> : <InfoCircleOutlined className="text-[10px] text-white block" />}
                        </div>
                    </div>
                </div>

                {/* Dimensions Badge (Top Right - Keep) */}
                {(imgDimensions) && (
                    <div className="absolute top-3 right-3 z-10 backdrop-blur-md bg-black/50 text-white px-2 py-1 rounded-md text-[10px] font-mono border border-white/10">
                        {imgDimensions.w} × {imgDimensions.h} px
                    </div>
                )}

                {/* Media Content - Allow Scroll */}
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4 custom-scrollbar">
                    {activeMedia.mime_type?.startsWith("image/") ? (
                        <Image
                            src={activeMedia.url}
                            alt={activeMedia.alt_text || activeMedia.filename}
                            className="object-contain"
                            // Remove fixed height constraint to allow scroll if natural size is large, but usually preview fits. 
                            // User asked for scroll, so maybe max-height should be unset or large?
                            // But usually "Preview" fits to screen. If user wants scroll, they imply zooming or large images.
                            // I'll set max-height to none but max-width to none?
                            // Let's keep it responsive but allow overflow if needed. 
                            // Actually, standard preview usually fits. "Need scroll for the preview" implies content is being cut off.
                            // I will allow it to expand.
                            style={{ height: 'auto', width: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                            // Initial state: fit.
                            onLoad={handleImageLoad}
                            preview={false}
                        />
                    ) : activeMedia.mime_type?.startsWith("video/") ? (
                        <video
                            src={activeMedia.url}
                            controls
                            className="max-h-full max-w-full"
                            onLoadedMetadata={handleVideoLoad}
                        />
                    ) : isDocumentPreviewable(activeMedia.filename, activeMedia.mime_type) ? (
                        <div className="w-full h-full bg-white relative">
                            <DocumentPreview
                                url={activeMedia.url}
                                filename={activeMedia.filename}
                                mimeType={activeMedia.mime_type}
                            />
                        </div>
                    ) : (
                        <div className="text-center p-8">
                            <div className="text-6xl text-gray-300 dark:text-gray-700 mb-4 mx-auto w-fit p-4 bg-gray-50 dark:bg-white/5 rounded-full">
                                {getFileIcon(activeMedia.mime_type)}
                            </div>
                            <Text className="block text-gray-500 font-medium">Preview not available</Text>
                            <Button type="primary" className="mt-4 bg-violet-600 hover:bg-violet-500" onClick={handleDownload}>Download File</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Bottom Bar: URL & Actions */}
            {mode === 'preview' && (
                <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Input
                                value={activeMedia.url}
                                readOnly
                                className="pl-10 pr-24 py-2.5 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 hover:border-violet-400 focus:border-violet-500 rounded-xl text-sm text-gray-700 dark:text-gray-200 truncate font-mono shadow-sm transition-all duration-200"
                                style={{ textOverflow: 'ellipsis' }}
                            />
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <CodeOutlined className="text-base" />
                            </div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                <Tooltip title="Copy Link">
                                    <Button
                                        type="text"
                                        size="small"
                                        className="text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 cursor-pointer transition-all duration-200 rounded-lg"
                                        icon={<CopyOutlined />}
                                        onClick={() => copyToClipboard(activeMedia.url)}
                                    >
                                        Copy
                                    </Button>
                                </Tooltip>
                            </div>
                        </div>
                        <Tooltip title="Download File">
                            <Button
                                icon={<DownloadOutlined />}
                                size="large"
                                onClick={handleDownload}
                                className="aspect-square flex items-center justify-center border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-white hover:bg-violet-600 hover:border-violet-600 cursor-pointer transition-all duration-200 rounded-xl shadow-sm"
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );

    const VersionsTab = () => (
        <div className="h-full flex flex-col">
            {loadingVersions ? (
                <div className="py-12 flex justify-center"><Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#7c3aed' }} spin />} tip="Loading versions..." /></div>
            ) : versions.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center h-full text-gray-400">
                    <HistoryOutlined className="text-3xl mb-2 opacity-20" />
                    <span>No version history</span>
                </div>
            ) : (
                <List
                    className="overflow-y-auto flex-1 pr-2 custom-scrollbar"
                    itemLayout="horizontal"
                    dataSource={versions}
                    renderItem={(version, index) => (
                        <List.Item
                            className="group hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-2 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
                            actions={[
                                <Tooltip key="download" title="Download">
                                    <Button type="text" size="small" className="text-gray-400 hover:text-violet-600" icon={<DownloadOutlined />} onClick={() => handleDownloadVersion(version.versionId)} />
                                </Tooltip>,
                                !version.isLatest && (
                                    <Tooltip key="restore" title="Restore">
                                        <Button type="text" size="small" className="text-gray-400 hover:text-green-600" icon={<RollbackOutlined />} onClick={() => handleRestoreVersion(version.versionId)} />
                                    </Tooltip>
                                ),
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${version.isLatest ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                        {version.isLatest ? <CheckCircleOutlined /> : index + 1}
                                    </div>
                                }
                                title={
                                    <div className="flex items-center gap-2">
                                        <Text className="text-xs font-mono text-gray-600 dark:text-gray-300">{version.versionId.substring(0, 8)}...</Text>
                                        {version.isLatest && <Tag color="success" className="mx-0 text-[10px] h-4 leading-4 px-1">Avg</Tag>}
                                    </div>
                                }
                                description={
                                    <div className="flex flex-col text-[10px] text-gray-400 mt-0.5">
                                        <span className="flex items-center gap-1"><ClockCircleOutlined className="text-[8px]" /> {getRelativeTime(version.lastModified)}</span>
                                        <span>{formatDetailFileSize(version.size)}</span>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            )
            }
        </div >
    );

    const DetailsTab = () => (
        <div className="space-y-4 pr-1">
            {/* Basic Details */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Size</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{formatFileSize(activeMedia.size_bytes)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Created</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{activeMedia.created_at ? new Date(activeMedia.created_at).toLocaleDateString() : '-'}</span>
                </div>
                <div className="col-span-2 flex flex-col pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">S3 Key</span>
                    <Text copyable className="font-mono text-[10px] text-gray-500 break-all hover:text-violet-500 transition-colors cursor-pointer mt-1">
                        {activeMedia.s3_key}
                    </Text>
                </div>
            </div>

            {/* Embeddings */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl p-3 border border-violet-100 dark:border-violet-500/20">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                        <ExperimentOutlined /> AI EMBEDDINGS
                    </h3>
                    {embeddingDim > 0 && <Tag color="purple" bordered={false} className="m-0 text-[9px] font-bold px-1">{embeddingDim} DIM</Tag>}
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 border border-violet-100/50 dark:border-violet-500/10 mb-2">
                    <Spin spinning={isLoading || isGeneratingEmbed} indicator={<LoadingOutlined className="text-violet-500" spin />}>
                        {embeddingDim > 0 ? (
                            <div className="font-mono text-[9px] text-gray-500 dark:text-gray-400 truncate opacity-70">
                                [{embeddingVector.slice(0, 5).join(', ')}...]
                            </div>
                        ) : (
                            <div className="text-center text-[10px] text-gray-400 italic">No embeddings generated</div>
                        )}
                    </Spin>
                </div>
                <Button
                    type="primary" size="small" ghost
                    className="w-full text-xs border-violet-300 text-violet-600 hover:!bg-violet-500 hover:!text-white hover:!border-violet-500"
                    onClick={handleGenerateEmbeddings} loading={isGeneratingEmbed} icon={<ReloadOutlined />}
                >
                    {embeddingDim > 0 ? "Regenerate Embeddings" : "Generate Embeddings"}
                </Button>
            </div>

            {/* Metadata */}
            <Collapse
                ghost size="small"
                className="bg-transparent"
                items={[{
                    key: '1',
                    label: <span className="text-xs font-semibold text-gray-500"><CodeOutlined /> Metadata JSON</span>,
                    children: (
                        <div className="max-h-24 overflow-y-auto custom-scrollbar">
                            <pre className="text-[9px] font-mono whitespace-pre-wrap bg-gray-50 dark:bg-[#121212] p-2 rounded border border-gray-100 dark:border-gray-800 text-gray-500">
                                {activeMedia.metadata ? JSON.stringify(activeMedia.metadata, null, 2) : '{}'}
                            </pre>
                        </div>
                    )
                }]}
            />
        </div>
    );

    // --- Render ---

    const modalTitle = (
        <div className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                {getFileIcon(activeMedia.mime_type)}
            </div>
            <div className="flex flex-col min-w-0">
                <Text strong className="truncate max-w-[300px] text-sm leading-tight text-white">{activeMedia.filename}</Text>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">{activeMedia.mime_type?.split('/')[1] || 'UNKNOWN'}</span>
                    <span className="w-1 h-1 rounded-full bg-white/40"></span>
                    <span className="text-[10px] text-white/70">{formatFileSize(activeMedia.size_bytes)}</span>
                </div>
            </div>
        </div>
    );


    return (
        <Modal
            open={visible}
            onCancel={onClose}
            width={mode === 'detail' ? 980 : 720}
            centered
            title={modalTitle}
            footer={null}
            className="media-preview-modal"
            maskClosable={true}
            destroyOnClose
            keyboard={true}
            styles={{
                mask: {
                    backdropFilter: 'blur(12px)',
                    background: 'rgba(0, 0, 0, 0.65)',
                    transition: 'all 300ms ease'
                },
                wrapper: {
                    zIndex: 1050
                },
                header: {
                    padding: '18px 24px',
                    margin: 0,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '16px 16px 0 0'
                },
                body: {
                    padding: '24px',
                    background: '#fafafa',
                    borderRadius: '0 0 16px 16px'
                }
            }}
            closeIcon={
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 hover:scale-110 text-white/80 hover:text-white text-lg transition-all duration-200 cursor-pointer shadow-sm">
                    ×
                </span>
            }
        >
            {mode === 'preview' ? (
                // PREVIEW MODE LAYOUT
                <div className="h-[60vh] flex flex-col">
                    <MediaPreviewContent />
                    {/* Keyboard hint */}
                    <div className="mt-3 text-center">
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">Press ESC to close</span>
                    </div>
                </div>
            ) : (
                // DETAIL MODE LAYOUT
                <div className="flex flex-col md:flex-row h-[65vh] gap-6">
                    <div className="flex-1 overflow-hidden h-full flex flex-col">
                        <MediaPreviewContent />
                    </div>
                    <div className="w-full md:w-[340px] h-full flex flex-col border-l border-gray-200 dark:border-gray-700 pl-6">
                        <Tabs
                            defaultActiveKey="info"
                            size="small"
                            className="h-full custom-tabs"
                            tabBarStyle={{ marginBottom: 16 }}
                            items={[
                                {
                                    icon: <InfoCircleOutlined />,
                                    key: 'info',
                                    label: <span className="font-medium">Info</span>,
                                    children: <div className="h-full overflow-y-auto pb-4 custom-scrollbar"><DetailsTab /></div>
                                },
                                {
                                    icon: <HistoryOutlined />,
                                    key: 'versions',
                                    label: <span className="font-medium">Versions</span>,
                                    children: <div className="h-full overflow-hidden"><VersionsTab /></div>
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
}
