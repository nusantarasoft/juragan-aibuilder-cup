
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
    LoadingOutlined,
    CloseOutlined,
    TagOutlined
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
    isPublicBucket?: boolean;
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
    mode = 'preview',
    isPublicBucket
}: MediaPreviewModalProps) {
    const [fullMedia, setFullMedia] = useState<MediaFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingEmbed, setIsGeneratingEmbed] = useState(false);
    const [isAutoLabeling, setIsAutoLabeling] = useState(false);

    // Version History State
    const [versions, setVersions] = useState<ObjectVersion[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

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
            setFetchError(null);
        }
    }, [visible, mediaFile, mode]);

    const fetchMediaDetails = async (idOrKey: string) => {
        setIsLoading(true);
        setFetchError(null);
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

            setFullMedia(data || mediaFile);
        } catch (err) {
            console.error("Failed to fetch media details:", err);
            setFetchError(err instanceof Error ? err.message : 'Unknown error');
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

    const MediaPreviewContent = () => {
        // Privacy Logic:
        // Private -> Show Generated Preview (Thumbnail for image, PreviewPages for PDF)
        // Public -> Show Real File (activeMedia.url)
        const isPublic = isPublicBucket ?? false;

        let displayUrl = activeMedia.url;
        let showGenerated = false;

        if (!isPublic) {
            if (activeMedia.mime_type?.startsWith('image/') && activeMedia.thumbnailUrl) {
                displayUrl = activeMedia.thumbnailUrl;
                showGenerated = true;
            }
            // Video: Thumbnail is poster. We still need URL to play.
            // If URL is presigned (which it is), we can play it.
            // User said "show preview system generated". For video that might mean just thumbnail? 
            // But a modal should probably play it. 
            // Let's stick to Image/PDF focus as per context.
        }

        const isPdf = activeMedia.mime_type === 'application/pdf';
        const hasPdfPreviews = isPdf && activeMedia.previewPages && activeMedia.previewPages.length > 0;

        // Always show generated previews if available (safer and faster than original PDF)
        // User Request: Force Full PDF (iframe) for Detail/Preview Modal.
        const showPdfPreviews = false; // Disable generated previews to show Iframe

        return (
            <div className="w-full h-full flex flex-col relative">
                {/* Standard Preview Container */}
                <div className="flex-1 relative flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">

                    {/* Dimensions Badge */}
                    {(imgDimensions) && (
                        <div className="absolute top-3 right-3 z-10 bg-black/50 text-white px-2 py-0.5 rounded text-xs font-mono">
                            {imgDimensions.w} × {imgDimensions.h}
                        </div>
                    )}

                    {/* Generated Preview Badge */}
                    {showGenerated && (
                        <div className="absolute top-3 left-3 z-10 bg-violet-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            System Preview
                        </div>
                    )}

                    {/* Media Content */}
                    <div className="w-full h-full overflow-auto flex items-center justify-center">
                        {activeMedia.mime_type?.startsWith("image/") ? (
                            <Image
                                src={displayUrl}
                                alt={activeMedia.alt_text || activeMedia.filename}
                                className="object-contain"
                                style={{ height: 'auto', width: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                                onLoad={handleImageLoad}
                                preview={false}
                            />
                        ) : showPdfPreviews ? (
                            <div className="w-full h-full overflow-y-auto bg-gray-100 flex flex-col items-center gap-4 p-4">
                                {activeMedia.previewPages!.map((pageUrl, idx) => (
                                    <img
                                        key={idx}
                                        src={pageUrl}
                                        className="shadow-lg border border-gray-200 max-w-full"
                                        style={{ width: '100%', maxWidth: '600px' }}
                                    />
                                ))}
                            </div>
                        ) : activeMedia.mime_type?.startsWith("video/") ? (
                            <video
                                src={activeMedia.url}
                                poster={activeMedia.thumbnailUrl}
                                controls
                                className="max-h-full max-w-full"
                                onLoadedMetadata={handleVideoLoad}
                            />
                        ) : activeMedia.mime_type?.includes('pdf') ? (
                            <iframe
                                src={displayUrl}
                                className="w-full h-full border-none rounded-sm"
                                title="PDF Preview"
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
                                <div className="text-4xl text-gray-400 mb-4">
                                    {getFileIcon(activeMedia.mime_type)}
                                </div>
                                <Text type="secondary" className="block mb-4">Preview not available</Text>
                                <Button type="primary" onClick={handleDownload}>Download File</Button>
                            </div>
                        )}
                    </div>
                </div>
                {/* Footer Bar */}
                {mode === 'preview' && (
                    <div className="mt-4 space-y-3">
                        {/* Info Tags */}
                        <Space size="small">
                            <Tag color="success" icon={<CheckCircleOutlined />}>Latest Version</Tag>
                            {activeMedia.metadata?.label_studio_task_id ? (
                                <Tag color="purple" icon={<ExperimentOutlined />}>Labeled</Tag>
                            ) : (
                                <Tag color="default" icon={<InfoCircleOutlined />}>Not Labeled</Tag>
                            )}
                            <Tag>{formatFileSize(activeMedia.size_bytes)}</Tag>
                            {isPublic && <Tag color="blue">Public</Tag>}
                            {!isPublic && <Tag color="gold">Private</Tag>}
                        </Space>

                        {/* URL Bar */}
                        <div className="flex items-center gap-2">
                            <Input
                                prefix={<CodeOutlined className="text-gray-400" />}
                                value={activeMedia.url}
                                readOnly
                                suffix={
                                    <Tooltip title="Copy URL">
                                        <CopyOutlined
                                            className="text-gray-400 hover:text-blue-500 cursor-pointer"
                                            onClick={() => copyToClipboard(activeMedia.url)}
                                        />
                                    </Tooltip>
                                }
                            />
                            <Tooltip title="Download">
                                <Button icon={<DownloadOutlined />} onClick={handleDownload} />
                            </Tooltip>
                        </div>
                    </div>
                )}
            </div>
        );
    };

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

            {/* AI Intelligence: Embeddings */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl p-3 border border-violet-100 dark:border-violet-500/20">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                        <ExperimentOutlined /> AI INTELLIGENCE
                    </h3>
                    {embeddingDim > 0 && <Tag color="purple" bordered={false} className="m-0 text-[9px] font-bold px-1">{embeddingDim} DIM</Tag>}
                </div>

                {/* Vector Display */}
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 border border-violet-100/50 dark:border-violet-500/10 mb-3">
                    <Spin spinning={isLoading || isGeneratingEmbed} indicator={<LoadingOutlined className="text-violet-500" spin />}>
                        {embeddingDim > 0 ? (
                            <div className="flex flex-col gap-1">
                                <div className="font-mono text-[9px] text-gray-500 dark:text-gray-400 break-all leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">
                                    <span className="text-violet-500 font-bold">Vector: </span>
                                    [{embeddingVector.slice(0, 50).join(', ')}
                                    {embeddingVector.length > 50 && <span className="text-gray-400 italic"> ... +{embeddingVector.length - 50} more</span>}]
                                </div>
                                <Button
                                    size="small"
                                    type="text"
                                    className="self-end text-[9px] text-violet-500 h-5"
                                    onClick={() => copyToClipboard(JSON.stringify(embeddingVector), "Full embedding vector copied")}
                                >
                                    Copy Full Vector
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center text-[10px] text-gray-400 italic">No embeddings generated</div>
                        )}
                    </Spin>
                </div>

                {/* Generate Button */}
                <Button
                    type="primary" size="small" ghost
                    block
                    className="text-xs border-violet-300 text-violet-600 hover:!bg-violet-500 hover:!text-white hover:!border-violet-500"
                    onClick={handleGenerateEmbeddings} loading={isGeneratingEmbed} icon={<ReloadOutlined />}
                >
                    {embeddingDim > 0 ? "Regenerate Embeddings" : "Generate Embeddings"}
                </Button>
            </div>

            {/* Automation & Labeling Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-500/20">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <ExperimentOutlined /> AUTOMATION & METADATA
                    </h3>
                </div>

                {/* Auto Label Button */}
                <Button
                    type="default" size="small" block
                    className="text-xs border-blue-300 text-blue-600 hover:!bg-blue-500 hover:!text-white hover:!border-blue-500 bg-white/50 mb-3"
                    onClick={handleAutoLabel} loading={isAutoLabeling} icon={<ExperimentOutlined />}
                >
                    Auto Label Media
                </Button>

                {/* Generated Tags Display */}
                {activeMedia.metadata?.tags && Array.isArray(activeMedia.metadata.tags) && activeMedia.metadata.tags.length > 0 && (
                    <div className="mb-3 bg-white/50 dark:bg-black/20 rounded-lg p-2 border border-blue-100/50 dark:border-blue-500/10">
                        <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                            <TagOutlined /> GENERATED LABELS
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {activeMedia.metadata.tags.map((tag: string, i: number) => (
                                <Tag key={i} color="blue" bordered={false} className="m-0 text-[10px] px-1.5 py-0.5 leading-none">
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}

                {/* Metadata / Annotation View */}
                {activeMedia.metadata?.label_studio_task_id ? (
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 border border-blue-100/50 dark:border-blue-500/10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">LabelStudio</span>
                            <Tag color="cyan" className="m-0 text-[9px] px-1">TASK {activeMedia.metadata.label_studio_task_id}</Tag>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-white dark:bg-black/40 p-1.5 rounded border border-gray-100 dark:border-gray-700">
                                <div className="text-[9px] text-gray-400 uppercase">Project ID</div>
                                <div className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300">{activeMedia.metadata.project_id || 'N/A'}</div>
                            </div>
                        </div>

                        <Collapse
                            ghost size="small"
                            className="bg-transparent p-0"
                            items={[{
                                key: '1',
                                label: <span className="text-[10px] font-semibold text-gray-400">View Raw Metadata</span>,
                                children: (
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                        <pre className="text-[9px] font-mono whitespace-pre-wrap bg-gray-50 dark:bg-[#121212] p-2 rounded border border-gray-100 dark:border-gray-800 text-gray-500">
                                            {JSON.stringify(activeMedia.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )
                            }]}
                        />
                    </div>
                ) : (
                    <Collapse
                        ghost size="small"
                        className="bg-transparent"
                        items={[{
                            key: '1',
                            label: <span className="text-xs font-semibold text-gray-500"><CodeOutlined /> Metadata JSON</span>,
                            children: (
                                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                    <pre className="text-[9px] font-mono whitespace-pre-wrap bg-gray-50 dark:bg-[#121212] p-2 rounded border border-gray-100 dark:border-gray-800 text-gray-500">
                                        {activeMedia.metadata ? JSON.stringify(activeMedia.metadata, null, 2) : '{}'}
                                    </pre>
                                </div>
                            )
                        }]}
                    />
                )}
            </div>
        </div>
    );

    // --- Render ---

    const modalTitle = (
        <div className="flex items-center gap-3 px-6 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                {getFileIcon(activeMedia.mime_type)}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="truncate max-w-[300px] text-sm leading-tight tracking-wide font-bold"
                    style={{ background: 'linear-gradient(to right, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {activeMedia.filename}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">{activeMedia.mime_type?.split('/')[1] || 'UNKNOWN'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{formatFileSize(activeMedia.size_bytes)}</span>
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
            closeIcon={
                <div className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 cursor-pointer hover:bg-white/20 active:scale-95">
                    <CloseOutlined className="text-white text-base" />
                </div>
            }
            styles={{
                header: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    padding: 0,
                    borderRadius: '16px 16px 0 0',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                    marginBottom: 0
                },
                body: {
                    padding: 0
                }
            }}
            modalRender={(modal) => (
                <div className="custom-modal-wrapper">
                    <style>{`
                        .custom-modal-wrapper .ant-modal,
                        .media-preview-modal .ant-modal,
                        .custom-modal-wrapper .ant-modal-content,
                        .media-preview-modal .ant-modal-content,
                        .custom-modal-wrapper .ant-modal-body,
                        .media-preview-modal .ant-modal-body,
                        .custom-modal-wrapper .ant-modal-container {
                            padding: 0 !important;
                            padding-bottom: 0 !important;
                            border-radius: 16px !important;
                        }

                        /* Content Styling moved here */
                        .custom-modal-wrapper .ant-modal-content, 
                        .media-preview-modal .ant-modal-content {
                            background: rgba(255, 255, 255, 0.8) !important;
                            backdrop-filter: blur(20px) !important;
                            -webkit-backdrop-filter: blur(20px) !important;
                            border: 1px solid rgba(255, 255, 255, 0.2) !important;
                            box-shadow: 0 20px 50px rgba(0,0,0,0.1) !important;
                        }
                        
                        /* Glass Header specific tweaks */
                        .custom-modal-wrapper .ant-modal-header,
                        .media-preview-modal .ant-modal-header {
                            background: transparent !important; /* Managed by styles prop */
                        }

                        .custom-modal-wrapper .ant-modal-title,
                        .media-preview-modal .ant-modal-title {
                            color: inherit !important;
                            font-weight: 600 !important;
                            font-size: 16px !important;
                            padding: 0 !important;
                        }

                        .custom-modal-wrapper .ant-modal-close,
                        .media-preview-modal .ant-modal-close {
                            top: 14px !important; 
                            right: 16px !important;
                        }
                        
                        /* Dark mode support logic (assumed via class or parent) */
                        :global(.dark) .custom-modal-wrapper .ant-modal-content {
                            background: rgba(15, 23, 42, 0.85) !important;
                            border: 1px solid rgba(139, 92, 246, 0.2) !important;
                        }
                    `}</style>
                    {modal}
                </div>
            )}
        >
            {mode === 'preview' ? (
                // PREVIEW MODE LAYOUT
                <div className="h-[60vh] flex flex-col p-6">
                    <MediaPreviewContent />
                    {/* Keyboard hint */}
                    <div className="mt-2 text-center text-xs text-gray-400">
                        <Space><Text type="secondary" style={{ fontSize: 12 }}>Press ESC to close</Text></Space>
                    </div>
                </div>
            ) : (
                // DETAIL MODE LAYOUT
                <div className="flex flex-col md:flex-row h-[65vh] gap-5 p-6">
                    <div className="flex-1 overflow-hidden h-full flex flex-col">
                        <MediaPreviewContent />
                    </div>
                    <div className="w-full md:w-[320px] h-full flex flex-col border-l border-gray-200 dark:border-gray-700 pl-5">
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

                        {/* DEBUG DATA PANEL - TEMPORARY */}
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-[10px] font-mono text-red-800 break-all">
                            <div className="font-bold mb-1">DEBUG DATA</div>
                            <div>ID: {activeMedia?.id}</div>
                            <div>Source: {fullMedia ? 'FULL (Fetched)' : 'LIST (Local)'}</div>
                            <div>Embedding Raw: {JSON.stringify(activeMedia?.embedding || null).substring(0, 50)}...</div>
                            {fetchError && <div className="text-red-600 font-bold bg-white px-1">Error: {fetchError}</div>}
                            <Button
                                size="small"
                                danger
                                className="mt-2"
                                onClick={() => activeMedia?.id && fetchMediaDetails(activeMedia.id)}
                            >
                                Force Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Modal >
    );
}
