"use client";

import React, { useState } from "react";
import {
    Badge,
    Button,
    Checkbox,
    Empty,
    Input,
    Modal,
    Popconfirm,
    Progress,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
    Upload,
} from "antd";
import type { UploadProps } from "antd";
import {
    AppstoreAddOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    CloudUploadOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    LinkOutlined,
    SettingOutlined,
    SyncOutlined,
} from "@ant-design/icons";
import type { StudioSource } from "@/lib/studioService";
import {
    getSourceProgressPercent,
    getSourceStageLabel,
    getSourceStatusDetail,
    getSourceStatusTag,
    isSourceInProgress,
    type SourceStats,
} from "./studioSourceStatus";

const { Text } = Typography;

type Props = {
    themeColor: string;
    sources: StudioSource[];
    sourceStats: SourceStats;
    loading: boolean;
    selectedSourceIds: string[];
    onToggleSource: (sourceId: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    onOpenMedia: () => void;
    onUpload: UploadProps["customRequest"];
    onImportUrl: (url: string) => Promise<void>;
    onAddText: (title: string, content: string) => Promise<void>;
    onRemove: (sourceId: string) => void;
    onReindex: (sourceId: string) => void;
    onConfigureChat: () => void;
    onOpenSource?: (sourceId: string) => void;
    onCollapse?: () => void;
};

export default function SourcesPanel({
    themeColor,
    sources,
    sourceStats,
    loading,
    selectedSourceIds,
    onToggleSource,
    onSelectAll,
    onOpenMedia,
    onUpload,
    onImportUrl,
    onAddText,
    onRemove,
    onReindex,
    onConfigureChat,
    onOpenSource,
    onCollapse,
}: Props) {
    const [urlModalOpen, setUrlModalOpen] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    const [importing, setImporting] = useState(false);
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [textTitle, setTextTitle] = useState("");
    const [textBody, setTextBody] = useState("");
    const [savingText, setSavingText] = useState(false);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "done":
                return <CheckCircleFilled style={{ color: "#52c41a", fontSize: 12 }} />;
            case "parsing":
                return <SyncOutlined spin style={{ color: themeColor, fontSize: 12 }} />;
            case "error":
                return <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: 12 }} />;
            default:
                return <ClockCircleOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />;
        }
    };

    const indexedIds = sources.filter((s) => s.parse_status === "done" && (s.chunk_count ?? 0) > 0).map((s) => s.id);
    const allSelected = indexedIds.length > 0 && indexedIds.every((id) => selectedSourceIds.includes(id));

    const handleImportUrl = async () => {
        if (!urlInput.trim()) return;
        setImporting(true);
        try {
            await onImportUrl(urlInput.trim());
            setUrlInput("");
            setUrlModalOpen(false);
        } finally {
            setImporting(false);
        }
    };

    const handleAddText = async () => {
        if (textBody.trim().length < 20) return;
        setSavingText(true);
        try {
            await onAddText(textTitle.trim() || "Text note", textBody.trim());
            setTextTitle("");
            setTextBody("");
            setTextModalOpen(false);
        } finally {
            setSavingText(false);
        }
    };

    const renderSummary = () => {
        if (sources.length === 0) return null;
        const { total, indexed, inProgress, errors } = sourceStats;
        const overallPercent =
            total > 0
                ? Math.round(sources.reduce((sum, s) => sum + getSourceProgressPercent(s), 0) / total)
                : 0;

        return (
            <div className="px-2.5 py-1.5 border-b border-white/10 bg-white/[0.015]">
                <div className="flex items-center justify-between gap-1.5">
                    <Checkbox
                        checked={allSelected}
                        indeterminate={selectedSourceIds.length > 0 && !allSelected}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        disabled={indexedIds.length === 0}
                    >
                        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                            CTX {selectedSourceIds.length}/{indexedIds.length}
                        </span>
                    </Checkbox>
                    <span className="font-mono text-[9.5px] text-slate-400 tabular-nums">
                        {indexed}/{total} VEC
                        {inProgress > 0 ? ` · ${inProgress} RUN` : ""}
                        {errors > 0 ? ` · ${errors} ERR` : ""}
                    </span>
                    {sourceStats.allIndexed ? (
                        <Tag color="success" className="font-mono !text-[9px] !m-0 !px-1 !py-0 !leading-4 !rounded-none uppercase">
                            READY
                        </Tag>
                    ) : inProgress > 0 ? (
                        <Tag color="processing" icon={<SyncOutlined spin />} className="font-mono !text-[9px] !m-0 !px-1 !py-0 !leading-4 !rounded-none uppercase">
                            INDEXING
                        </Tag>
                    ) : null}
                </div>
                {inProgress > 0 && (
                    <Progress
                        percent={overallPercent}
                        size="small"
                        showInfo={false}
                        strokeColor={themeColor}
                        className="!m-0 !mt-1"
                    />
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Compact 32px Tactical Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-orange-400" />
                    <Text strong className="text-[11px] font-mono uppercase tracking-[0.14em]">
                        Sources
                    </Text>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        [{sources.length}]
                    </span>
                    {sourceStats.inProgress > 0 && (
                        <Badge count={sourceStats.inProgress} size="small" color={themeColor} />
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Tooltip title="Configure chat instructions" placement="bottom">
                        <Button
                            type="text"
                            size="small"
                            aria-label="setting"
                            icon={<SettingOutlined />}
                            onClick={onConfigureChat}
                            className="!h-6 !w-6 !p-0"
                        />
                    </Tooltip>
                    {onCollapse && (
                        <Tooltip title="Hide Sources panel" placement="bottom">
                            <button
                                type="button"
                                onClick={onCollapse}
                                className="inline-flex items-center gap-1 h-6 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] border border-orange-400/50 bg-orange-500/15 text-orange-300 hover:border-orange-400 hover:bg-orange-500/25 transition-colors cursor-pointer"
                            >
                                <span>◀ HIDE</span>
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Always-Visible 4-Action Tactical Ingestion Strip */}
            <div className="grid grid-cols-4 gap-1 px-2 py-1.5 border-b border-white/10 shrink-0 font-mono">
                <Upload customRequest={onUpload} showUploadList={false} multiple className="w-full block [&_.ant-upload]:!w-full [&_.ant-upload]:!block">
                    <Button
                        size="small"
                        icon={<CloudUploadOutlined />}
                        className="w-full !px-1 !text-[10px] font-mono uppercase !rounded-none"
                    >
                        File
                    </Button>
                </Upload>
                <Button
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() => setUrlModalOpen(true)}
                    className="w-full !px-1 !text-[10px] font-mono uppercase !rounded-none"
                >
                    URL
                </Button>
                <Button
                    size="small"
                    icon={<FileTextOutlined />}
                    onClick={() => setTextModalOpen(true)}
                    className="w-full !px-1 !text-[10px] font-mono uppercase !rounded-none"
                >
                    Text
                </Button>
                <Button
                    size="small"
                    icon={<AppstoreAddOutlined />}
                    onClick={onOpenMedia}
                    className="w-full !px-1 !text-[10px] font-mono uppercase !rounded-none"
                >
                    Media
                </Button>
            </div>

            {renderSummary()}

            <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 py-1.5 min-h-0">
                {loading ? (
                    <div className="flex justify-center py-6"><Spin size="small" /></div>
                ) : sources.length === 0 ? (
                    <div className="px-2.5 py-4 border border-dashed border-white/10 text-center font-mono">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-1">
                            No sources yet
                        </div>
                        <div className="text-[10px] text-slate-500 leading-relaxed">
                            Use the File, URL, Text, or Media buttons above to index documents into RAG.
                        </div>
                    </div>
                ) : (
                    sources.map((source) => {
                        const statusDetail = getSourceStatusDetail(source);
                        const stageLabel = getSourceStageLabel(source);
                        const { color, label } = getSourceStatusTag(source);
                        const canSelect = source.parse_status === "done" && (source.chunk_count ?? 0) > 0;
                        const checked = selectedSourceIds.includes(source.id);

                        return (
                            <div
                                key={source.id}
                                className="group flex items-start gap-1.5 rounded-none px-2 py-1.5 border border-transparent hover:border-white/10 hover:bg-white/[0.03] mb-0.5 transition-colors"
                                style={{
                                    borderLeft: checked ? `2px solid ${themeColor}` : "2px solid transparent",
                                    background: checked ? "rgba(251, 146, 60, 0.04)" : undefined,
                                }}
                            >
                                <Checkbox
                                    checked={checked}
                                    disabled={!canSelect}
                                    onChange={(e) => onToggleSource(source.id, e.target.checked)}
                                    className="mt-0.5"
                                />
                                <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                                    onClick={() => onOpenSource?.(source.id)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {getStatusIcon(source.parse_status)}
                                        <Text className="text-[11.5px] font-medium truncate flex-1">{source.filename}</Text>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <Text className="font-mono text-[9.5px] text-slate-400 tabular-nums">
                                            {formatBytes(source.file_size)}
                                        </Text>
                                        <Tooltip title={statusDetail ?? stageLabel} placement="top">
                                            <Tag color={color} className="font-mono !text-[8.5px] !m-0 !px-1 !py-0 !leading-3.5 !rounded-none uppercase">
                                                {label}
                                            </Tag>
                                        </Tooltip>
                                    </div>
                                    {source.parse_status === "error" && source.parse_error ? (
                                        <Text type="danger" className="text-[9.5px] block mt-0.5 line-clamp-1">
                                            {source.parse_error}
                                        </Text>
                                    ) : null}
                                    {isSourceInProgress(source) && (
                                        <Progress
                                            percent={getSourceProgressPercent(source)}
                                            size="small"
                                            showInfo={false}
                                            strokeColor={themeColor}
                                            className="mt-1 !mb-0"
                                        />
                                    )}
                                </button>
                                <Space size={0} className="opacity-0 group-hover:opacity-100 shrink-0">
                                    <Tooltip title="Reindex source" placement="top">
                                        <Button
                                            type="text"
                                            size="small"
                                            className="!h-5 !w-5 !p-0"
                                            icon={<SyncOutlined style={{ fontSize: 11 }} />}
                                            onClick={() => onReindex(source.id)}
                                        />
                                    </Tooltip>
                                    <Popconfirm
                                        title="Remove this source?"
                                        okText="Remove"
                                        cancelText="Cancel"
                                        onConfirm={() => onRemove(source.id)}
                                    >
                                        <Button
                                            type="text"
                                            size="small"
                                            className="!h-5 !w-5 !p-0"
                                            danger
                                            icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                        />
                                    </Popconfirm>
                                </Space>
                            </div>
                        );
                    })
                )}
            </div>

            <Modal
                title="Import from URL"
                open={urlModalOpen}
                onCancel={() => setUrlModalOpen(false)}
                onOk={() => void handleImportUrl()}
                confirmLoading={importing}
                okText="Import"
            >
                <Input
                    placeholder="https://... / youtu.be/... / docs.google.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onPressEnter={() => void handleImportUrl()}
                />
                <Text type="secondary" className="text-[11px] block mt-2">
                    Supports web pages, YouTube videos (transcripts/captions), and publicly shared Google Docs/Slides.
                    Extracted text is indexed just like an uploaded file.
                </Text>
            </Modal>

            <Modal
                title="Paste Text as Source"
                open={textModalOpen}
                onCancel={() => setTextModalOpen(false)}
                onOk={() => void handleAddText()}
                confirmLoading={savingText}
                okText="Add Source"
                okButtonProps={{ disabled: textBody.trim().length < 20 }}
            >
                <Input
                    placeholder="Title (optional)"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    className="mb-2"
                />
                <Input.TextArea
                    placeholder="Paste text here (minimum 20 characters)…"
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    autoSize={{ minRows: 6, maxRows: 14 }}
                />
                <Text type="secondary" className="text-[11px] block mt-2">
                    Text will be saved as a .txt file and indexed for RAG.
                </Text>
            </Modal>
        </div>
    );
}
