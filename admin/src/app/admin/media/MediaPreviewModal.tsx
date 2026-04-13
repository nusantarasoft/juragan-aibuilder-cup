
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
    EditOutlined
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
}

const InfoTab = ({ activeMedia, embeddingDim, embeddingVector, versions, getRelativeTime, formatFileSize, onUpdateDescription }: InfoTabProps) => {
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [currentDescription, setCurrentDescription] = useState(activeMedia.metadata?.description || '');
    const [descValue, setDescValue] = useState(activeMedia.metadata?.description || '');
    const [isSavingDesc, setIsSavingDesc] = useState(false);

    // Update local state when activeMedia changes from external sources
    useEffect(() => {
        setCurrentDescription(activeMedia.metadata?.description || '');
        setDescValue(activeMedia.metadata?.description || '');
    }, [activeMedia.id, activeMedia.metadata?.description]);

    const handleSaveDescription = async () => {
        if (!onUpdateDescription) return;
        setIsSavingDesc(true);
        try {
            await onUpdateDescription(descValue);
            setCurrentDescription(descValue); // Optimistic UI update
            setIsEditingDesc(false);
        } catch (error) {
            console.error("Failed to update description", error);
            message.error("Failed to update description");
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleCancelEdit = () => {
        setDescValue(currentDescription);
        setIsEditingDesc(false);
    };

    return (
        <div className="space-y-3 pr-1">
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
                    <Text copyable className="font-mono text-[10px] text-gray-500 break-all hover:text-[color:var(--theme-color, #7c3aed)] transition-colors cursor-pointer mt-1">
                        {activeMedia.s3_key}
                    </Text>
                </div>
                <div className="col-span-2 flex flex-col pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Description</span>
                        {!isEditingDesc && onUpdateDescription && (
                            <Tooltip title="Edit Description">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => setIsEditingDesc(true)}
                                    className="text-gray-400 hover:text-[color:var(--theme-color, #7c3aed)] hover:bg-[rgba(var(--theme-color-rgb,139,92,246),0.05)] dark:hover:bg-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                                />
                            </Tooltip>
                        )}
                    </div>
                    {isEditingDesc ? (
                        <div className="mt-2 text-xs space-y-2">
                            <Input.TextArea
                                value={descValue}
                                onChange={(e) => setDescValue(e.target.value)}
                                rows={3}
                                className="text-xs custom-scrollbar rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1A] hover:border-[rgba(var(--theme-color-rgb,139,92,246),0.6)] focus:border-violet-500 transition-colors shadow-sm w-full"
                                placeholder="Add a description..."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <Button
                                    size="small"
                                    onClick={handleCancelEdit}
                                    disabled={isSavingDesc}
                                    icon={<CloseOutlined />}
                                    className="text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md shadow-none"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="small"
                                    onClick={handleSaveDescription}
                                    loading={isSavingDesc}
                                    icon={<CheckOutlined />}
                                    className="text-xs bg-gray-800 hover:bg-black dark:bg-gray-200 dark:hover:bg-white dark:text-black text-white border-none shadow-sm rounded-md"
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="mt-1 group relative cursor-pointer rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-[#1A1A1A] p-2 -mx-2 transition-all"
                            onClick={() => onUpdateDescription && setIsEditingDesc(true)}
                        >
                            <Text className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                {currentDescription || <span className="italic opacity-50">No description</span>}
                            </Text>
                            {onUpdateDescription && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-700">Click to edit</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gradient-to-br from-[rgba(var(--theme-color-rgb,139,92,246),0.05)] to-[rgba(var(--theme-color-rgb,139,92,246),0.02)] dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl p-3 border border-violet-100 dark:border-violet-500/20">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-[color:var(--theme-color,#7c3aed)] dark:text-[color:var(--theme-color,#c4b5fd)] flex items-center gap-1.5">
                        <RobotOutlined /> VECTOR INTEL
                    </h3>
                    {embeddingDim > 0 ? (
                        <Tag  bordered={false} className="m-0 text-[9px] font-bold px-1">{embeddingDim} DIM</Tag>
                    ) : (
                        <Tag color="default" bordered={false} className="m-0 text-[9px] px-1">No Vector</Tag>
                    )}
                </div>
                {embeddingDim > 0 ? (
                    <div className="font-mono text-[9px] text-gray-500 dark:text-gray-400 truncate bg-white/50 dark:bg-black/20 rounded p-1.5">
                        [{embeddingVector.slice(0, 8).join(', ')}...]
                    </div>
                ) : (
                    <div className="text-[10px] text-gray-400 italic">Click Vector tab to generate</div>
                )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-500/20">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <SettingOutlined /> LABEL AUTOMATION
                    </h3>
                    {activeMedia.metadata?.tags?.length > 0 ? (
                        <Tag color="blue" bordered={false} className="m-0 text-[9px] font-bold px-1">{activeMedia.metadata?.tags?.length} LABELS</Tag>
                    ) : (
                        <Tag color="default" bordered={false} className="m-0 text-[9px] px-1">No Labels</Tag>
                    )}
                </div>
                {Array.isArray(activeMedia.metadata?.tags) && activeMedia.metadata.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {activeMedia.metadata?.tags?.slice(0, 5).map((tag: string, i: number) => (
                            <Tag key={i} color="blue" bordered={false} className="m-0 text-[9px] px-1">{tag}</Tag>
                        ))}
                        {activeMedia.metadata?.tags?.length > 5 && <span className="text-[9px] text-gray-400">+{activeMedia.metadata.tags.length - 5} more</span>}
                    </div>
                ) : (
                    <div className="text-[10px] text-gray-400 italic">Click Label tab to generate labels</div>
                )}
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-3 border border-green-100 dark:border-green-500/20">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-green-700 dark:text-green-300 flex items-center gap-1.5">
                        <HistoryOutlined /> VERSIONS
                    </h3>
                    <Tag color="green" bordered={false} className="m-0 text-[9px] font-bold px-1">{versions.length} VER</Tag>
                </div>
                {versions.length > 0 ? (
                    <div className="text-[10px] text-gray-600 dark:text-gray-400">
                        Latest: <span className="font-mono">{versions[0]?.versionId?.slice(0, 8)}...</span>
                        {versions[0]?.lastModified && <span className="text-gray-400 ml-1">({getRelativeTime(versions[0].lastModified)})</span>}
                    </div>
                ) : (
                    <div className="text-[10px] text-gray-400 italic">No versions history</div>
                )}
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
}

const AIIntelTab = ({ embeddingDim, embeddingVector, isLoading, isGeneratingEmbed, handleGenerateEmbeddings, handleRemoveEmbeddings, copyToClipboard }: AIIntelTabProps) => (
    <div className="space-y-4 pr-1">
        <div className="bg-gradient-to-br from-[rgba(var(--theme-color-rgb,139,92,246),0.05)] to-[rgba(var(--theme-color-rgb,139,92,246),0.02)] dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl p-4 border border-violet-100 dark:border-violet-500/20">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-[color:var(--theme-color,#7c3aed)] dark:text-[color:var(--theme-color,#c4b5fd)] flex items-center gap-2">
                    <RobotOutlined /> Vector Embeddings
                </h3>
                {embeddingDim > 0 && <Tag  bordered={false} className="m-0 text-[10px] font-bold px-2">{embeddingDim} Dimensions</Tag>}
            </div>

            <div className="bg-white/60 dark:bg-black/30 rounded-lg p-3 border border-[rgba(var(--theme-color-rgb,139,92,246),0.15)] dark:border-[rgba(var(--theme-color-rgb,139,92,246),0.1)] mb-4">
                <Spin spinning={isLoading || isGeneratingEmbed} indicator={<LoadingOutlined className="text-[color:var(--theme-color, #7c3aed)]" spin />} tip={isGeneratingEmbed ? "Generating embeddings..." : undefined}>
                    {embeddingDim > 0 ? (
                        <div className="flex flex-col gap-2">
                            <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400 break-all leading-relaxed max-h-28 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-black/20 p-2 rounded">
                                <span className="text-[color:var(--theme-color, #7c3aed)] font-bold">Vector: </span>
                                [{embeddingVector.slice(0, 30).join(', ')}
                                {embeddingVector.length > 30 && <span className="text-gray-400 italic"> ... +{embeddingVector.length - 30} more</span>}]
                            </div>
                            <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                className="self-end text-[10px] text-[color:var(--theme-color, #7c3aed)] hover:text-[color:var(--theme-color,#7c3aed)]"
                                onClick={() => copyToClipboard(JSON.stringify(embeddingVector), "Full embedding vector copied")}
                            >
                                Copy Full Vector
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <RobotOutlined className="text-4xl text-[color:var(--theme-color,#c4b5fd)] mb-2" />
                            <div className="text-sm text-gray-500">No embeddings generated yet</div>
                            <div className="text-xs text-gray-400 mt-1">Click the button below to generate</div>
                        </div>
                    )}
                </Spin>
            </div>

            <div className="flex gap-2">
                <Button
                    type="primary" size="small"
                    className="flex-1 text-xs bg-[var(--theme-color,#7c3aed)] hover:!bg-[var(--theme-color,#6d28d9)] border-[var(--theme-color,#7c3aed)] hover:!border-[var(--theme-color,#6d28d9)]"
                    onClick={handleGenerateEmbeddings}
                    loading={isGeneratingEmbed}
                    disabled={isGeneratingEmbed || isLoading}
                    icon={isGeneratingEmbed ? undefined : <ReloadOutlined />}
                >
                    {isGeneratingEmbed ? "Generating..." : embeddingDim > 0 ? "Regenerate" : "Generate Embeddings"}
                </Button>
                {embeddingDim > 0 && (
                    <Tooltip title="Remove embeddings">
                        <Button
                            type="default" size="small" danger
                            icon={<DeleteOutlined />}
                            className="text-xs"
                            onClick={handleRemoveEmbeddings}
                        />
                    </Tooltip>
                )}
            </div>
        </div>
    </div>
);

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
    <div className="h-full flex flex-col px-5 py-5">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <HistoryOutlined /> VERSION HISTORY
            </h3>
            <Button
                type="primary"
                size="small"
                icon={<UploadOutlined />}
                className="bg-green-600 hover:!bg-green-700 border-green-600 text-[10px] h-7 px-3 rounded-lg shadow-sm font-medium tracking-wide"
                onClick={handleUploadVersion}
                loading={isUploadingVersion}
            >
                Upload
            </Button>
        </div>

        {loadingVersions ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#16a34a' }} spin />} />
                <span className="text-xs">Loading versions...</span>
            </div>
        ) : versions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5 m-1">
                <HistoryOutlined className="text-3xl mb-3 opacity-20" />
                <span className="text-xs font-medium">No version history</span>
                <span className="text-[10px] opacity-60 mt-1">Upload a new version to see it here</span>
            </div>
        ) : (
            <List
                className="overflow-y-auto flex-1 pr-2 custom-scrollbar"
                itemLayout="horizontal"
                dataSource={versions}
                renderItem={(version, index) => (
                    <List.Item
                        className={`group hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-2 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0 cursor-pointer ${previewUrl?.includes(version.versionId) ? 'bg-[rgba(var(--theme-color-rgb,139,92,246),0.05)] dark:bg-violet-900/10 border-violet-100' : ''}`}
                        onClick={() => handlePreviewVersion(version)}
                        actions={[
                            <Tooltip key="download" title="Download">
                                <Button type="text" size="small" className="text-gray-400 hover:text-[color:var(--theme-color, #7c3aed)]" icon={<DownloadOutlined />} onClick={(e) => { e.stopPropagation(); handleDownloadVersion(version.versionId); }} />
                            </Tooltip>,
                            !version.isLatest && (
                                <Tooltip key="restore" title="Restore as Default">
                                    <Button type="text" size="small" className="text-gray-400 hover:text-green-600" icon={<RollbackOutlined />} onClick={(e) => { e.stopPropagation(); handleRestoreVersion(version.versionId); }} />
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
                                    <Text className={`text-xs font-mono ${previewUrl?.includes(version.versionId) ? 'text-[color:var(--theme-color, #7c3aed)] font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {version.versionId?.substring(0, 8) || 'unknown'}...
                                    </Text>
                                    {version.isLatest && <Tag color="success" className="mx-0 text-[10px] h-4 leading-4 px-1">Current</Tag>}
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
                {imgDimensions && (
                    <div className="absolute top-3 right-3 z-10 bg-black/50 text-white px-2 py-0.5 rounded text-xs font-mono">
                        {imgDimensions.w} × {imgDimensions.h}
                    </div>
                )}

                {showGenerated && (
                    <div className="absolute top-3 left-3 z-10 bg-[var(--theme-color,#7c3aed)]/90 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        System Preview
                    </div>
                )}

                <div className="w-full h-full flex items-center justify-center bg-white relative">
                    {activeMedia.mime_type?.startsWith("image/") ? (
                        <div className="w-full h-full overflow-auto flex items-center justify-center">
                            <Image
                                src={displayUrl}
                                alt={activeMedia.alt_text || activeMedia.filename}
                                className="object-contain"
                                style={{ height: 'auto', width: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                                onLoad={handleImageLoad}
                                preview={false}
                            />
                        </div>
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
                            <div className="text-center p-8">
                                <div className="text-4xl text-gray-400 mb-4">
                                    {getFileIcon(activeMedia.mime_type)}
                                </div>
                                <Text type="secondary" className="block mb-4">Preview not available</Text>
                                <Button type="primary" onClick={handleDownload}>Download File</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {mode === 'preview' && (
                <div className="mt-4 space-y-3">
                    <Space size="small">
                        <Tag color="success" icon={<CheckCircleOutlined />}>Latest Version</Tag>
                        {activeMedia.metadata?.label_studio_task_id ? (
                            <Tag  icon={<ExperimentOutlined />}>Labeled</Tag>
                        ) : (
                            <Tag color="default" icon={<InfoCircleOutlined />}>Not Labeled</Tag>
                        )}
                        <Tag>{formatFileSize(activeMedia.size_bytes)}</Tag>
                        {isPublic && <Tag color="blue">Public</Tag>}
                        {!isPublic && <Tag color="gold">Private</Tag>}
                    </Space>

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

export default function MediaPreviewModal({
    visible,
    mediaFile,
    onClose,
    mode = 'preview',
    isPublicBucket,
    onUpdate
}: MediaPreviewModalProps) {
    const [fullMedia, setFullMedia] = useState<MediaFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingEmbed, setIsGeneratingEmbed] = useState(false);
    const [isAutoLabeling, setIsAutoLabeling] = useState(false);

    // Version History State
    const { token } = theme.useToken();
    const isDarkMode = token.colorBgContainer === '#141414' || token.colorBgBase === '#000' || token.colorBgBase === '#000000';
    const [versions, setVersions] = useState<ObjectVersion[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploadingVersion, setIsUploadingVersion] = useState(false);
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

                // Explicitly clear the embedding in local state to ensure UI reacts immediately
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
            console.log("Calling generateMediaEmbeddings...");
            const success = await mediaService.generateMediaEmbeddings(mediaFile.id, "");
            console.log("Result:", success);
            if (success) {
                message.success('Embeddings generated successfully');
                await fetchMediaDetails(mediaFile.id);
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
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 flex-none rounded-lg bg-white/20 flex items-center justify-center text-white shadow-sm border border-white/10">
                {getFileIcon(activeMedia.mime_type)}
            </div>
            <div className="flex flex-col min-w-0 justify-center">
                <span className="truncate max-w-[300px] text-base leading-none tracking-tight font-bold text-white"
                    style={{ paddingBottom: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {activeMedia.filename}
                </span>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">{activeMedia.mime_type?.split('/')[1] || 'UNKNOWN'}</span>
                    <span className="w-1 h-1 rounded-full bg-white/40"></span>
                    <span className="text-[10px] text-blue-100 font-medium">{formatFileSize(activeMedia.size_bytes)}</span>
                </div>
            </div>
        </div>
    );


    return (
        <Modal
            open={visible}
            onCancel={onClose}
            width={mode === 'detail' ? '90vw' : 720}
            centered={mode !== 'detail'}
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
            style={mode === 'detail' ? { top: '5vh', height: '85vh', maxWidth: '100vw', padding: 0, paddingBottom: 0 } : undefined}
            styles={{
                header: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: 0,
                    // borderRadius removed as requested
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: 0,
                    height: '60px', // Explicit height
                    display: 'flex',
                    alignItems: 'center',
                    color: 'white'
                },
                body: {
                    padding: 0,
                    height: mode === 'detail' ? 'calc(85vh - 60px)' : 'auto', // Match header height subtraction
                    overflow: 'hidden'
                },
                // @ts-ignore
                content: {
                    padding: 0,
                    borderRadius: '16px 16px 0 0',
                    overflow: 'hidden',
                    height: mode === 'detail' ? '85vh' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    background: isDarkMode
                        ? 'rgba(15, 23, 42, 0.95)'
                        : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isDarkMode ? 'rgba(var(--theme-color-rgb, 139, 92, 246), 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                }
            }}
            modalRender={(modal) => (
                <div className="custom-modal-wrapper">
                    <style>{`
                        .custom-modal-wrapper .ant-modal,
                        .ant-modal.media-preview-modal {
                            max-width: 100vw !important;
                            width: ${mode === 'detail' ? '90vw !important' : 'auto'};
                            padding-bottom: 0 !important;
                            
                            /* User requested overrides */
                            --ant-modal-content-padding: 0 !important;
                            --ant-border-radius-xs: 2px !important;
                            --ant-border-radius-sm: 4px !important;
                            --ant-border-radius-lg: 8px !important;
                            --ant-border-radius-outer: 4px !important;
                        }

                        /* Force override padding on content and body */
                        .custom-modal-wrapper .ant-modal .ant-modal-content,
                        .ant-modal.media-preview-modal .ant-modal-content {
                            padding: 0 !important;
                            overflow: hidden !important;
                        }

                        .custom-modal-wrapper .ant-modal .ant-modal-body,
                        .ant-modal.media-preview-modal .ant-modal-body {
                            padding: 0 !important;
                        }

                        /* Ensure tabs fit */
                        .custom-tabs .ant-tabs-nav {
                            margin-bottom: 0 !important;
                            padding: 0 12px;
                        }
                        .custom-tabs .ant-tabs-nav::before {
                            border-bottom: 1px solid #f0f0f0;
                        }
                        .custom-tabs .ant-tabs-content-holder {
                            height: 100%;
                            overflow: hidden;
                            flex: 1; /* Ensure flex grow */
                        }
                        .custom-tabs .ant-tabs-content {
                            height: 100%;
                        }
                        .custom-tabs .ant-tabs-tabpane-active {
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                        }
                    `}</style>
                    {modal}
                </div>
            )}
        >
            {mode === 'preview' ? (
                // PREVIEW MODE LAYOUT
                <div className="h-[60vh] flex flex-col p-6">
                    <MediaPreviewContent
                        activeMedia={activeMedia}
                        imgDimensions={imgDimensions}
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
                    {/* Keyboard hint */}
                    <div className="mt-2 text-center text-xs text-gray-400">
                        <Space><Text type="secondary" style={{ fontSize: 12 }}>Press ESC to close</Text></Space>
                    </div>
                </div>
            ) : (
                // CINEMA DETAIL MODE LAYOUT
                <div className="flex h-full w-full overflow-hidden">
                    {/* LEFT PANEL: PREVIEW (70-75%) */}
                    <div className="flex-1 bg-gray-100 dark:bg-black/40 relative overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-hidden relative p-4 flex items-center justify-center">
                            <MediaPreviewContent
                                activeMedia={activeMedia}
                                imgDimensions={imgDimensions}
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
                    </div>

                    {/* RIGHT PANEL: SIDEBAR (Fixed Width) */}
                    <div className="w-[380px] flex-none bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full z-10 shadow-xl">
                        <Tabs
                            defaultActiveKey="info"
                            size="small"
                            className="flex-1 flex flex-col custom-tabs h-full"
                            items={[
                                {
                                    icon: <InfoCircleOutlined />,
                                    key: 'info',
                                    label: <span className="font-medium text-xs">Info</span>,
                                    children: (
                                        <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                                            <InfoTab
                                                activeMedia={activeMedia}
                                                embeddingDim={embeddingDim}
                                                embeddingVector={embeddingVector}
                                                versions={versions}
                                                getRelativeTime={getRelativeTime}
                                                formatFileSize={formatFileSize}
                                                onUpdateDescription={async (newDesc) => {
                                                    const updatedMedia = await mediaService.updateMedia(activeMedia.id, { description: newDesc });
                                                    if (updatedMedia) {
                                                        // Call parent onUpdate to refresh parent list
                                                        if (onUpdate) onUpdate();
                                                        message.success("Description updated successfully");
                                                    } else {
                                                        throw new Error("Failed to update");
                                                    }
                                                }}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    icon: <RobotOutlined />,
                                    key: 'ai-intel',
                                    label: <span className="font-medium text-xs">Vector</span>,
                                    children: (
                                        <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                                            <AIIntelTab
                                                embeddingDim={embeddingDim}
                                                embeddingVector={embeddingVector}
                                                isLoading={isLoading}
                                                isGeneratingEmbed={isGeneratingEmbed}
                                                handleGenerateEmbeddings={handleGenerateEmbeddings}
                                                handleRemoveEmbeddings={handleRemoveEmbeddings}
                                                copyToClipboard={copyToClipboard}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    icon: <SettingOutlined />,
                                    key: 'automation',
                                    label: <span className="font-medium text-xs">Label</span>,
                                    disabled: !(
                                        activeMedia.mime_type?.startsWith('image/') ||
                                        activeMedia.mime_type?.startsWith('video/') ||
                                        activeMedia.mime_type?.startsWith('audio/') ||
                                        activeMedia.mime_type === 'application/pdf'
                                    ),
                                    children: (
                                        <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                                            <AutomationTab
                                                activeMedia={activeMedia}
                                                isAutoLabeling={isAutoLabeling}
                                                handleAutoLabel={handleAutoLabel}
                                                copyToClipboard={copyToClipboard}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    icon: <HistoryOutlined />,
                                    key: 'versions',
                                    label: <span className="font-medium text-xs">History</span>,
                                    children: (
                                        <div className="h-full overflow-hidden flex flex-col p-0">
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
                                        </div>
                                    )
                                },
                            ]}
                        />
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
