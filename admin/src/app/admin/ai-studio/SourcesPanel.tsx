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
                return <CheckCircleFilled style={{ color: "#52c41a", fontSize: 14 }} />;
            case "parsing":
                return <SyncOutlined spin style={{ color: themeColor, fontSize: 14 }} />;
            case "error":
                return <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: 14 }} />;
            default:
                return <ClockCircleOutlined style={{ color: "#8c8c8c", fontSize: 14 }} />;
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
            await onAddText(textTitle.trim() || "Catatan teks", textBody.trim());
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
            <div className="px-3 pt-2 pb-1 border-b border-[rgba(var(--theme-color-rgb,139,92,246),0.12)]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Checkbox
                        checked={allSelected}
                        indeterminate={selectedSourceIds.length > 0 && !allSelected}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        disabled={indexedIds.length === 0}
                    >
                        <Text className="text-[10px] text-gray-500">
                            {selectedSourceIds.length}/{indexedIds.length} dipakai chat
                        </Text>
                    </Checkbox>
                    {sourceStats.allIndexed ? (
                        <Tag color="success" className="text-[9px] m-0">Siap RAG</Tag>
                    ) : inProgress > 0 ? (
                        <Tag color="processing" icon={<SyncOutlined spin />} className="text-[9px] m-0">
                            Mengindeks
                        </Tag>
                    ) : null}
                </div>
                <Text className="text-[10px] text-gray-400 block mb-1">
                    {indexed}/{total} tervektor
                    {inProgress > 0 ? ` · ${inProgress} diproses` : ""}
                    {errors > 0 ? ` · ${errors} gagal` : ""}
                </Text>
                <Progress
                    percent={overallPercent}
                    size="small"
                    strokeColor={themeColor}
                    status={
                        errors > 0 && indexed === 0
                            ? "exception"
                            : inProgress > 0
                              ? "active"
                              : indexed === total
                                ? "success"
                                : "normal"
                    }
                />
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(var(--theme-color-rgb,139,92,246),0.12)]">
                <Space size={6}>
                    <Text strong className="text-sm">Sources</Text>
                    {sourceStats.inProgress > 0 && (
                        <Badge count={sourceStats.inProgress} size="small" color={themeColor} />
                    )}
                </Space>
                <Space size={2}>
                    <Tooltip title="Configure chat">
                        <Button type="text" size="small" icon={<SettingOutlined />} onClick={onConfigureChat} />
                    </Tooltip>
                    <Tooltip title="Import URL / YouTube / Google Docs">
                        <Button type="text" size="small" icon={<LinkOutlined />} onClick={() => setUrlModalOpen(true)} />
                    </Tooltip>
                    <Tooltip title="Tempel teks">
                        <Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => setTextModalOpen(true)} />
                    </Tooltip>
                    <Tooltip title="Media Library">
                        <Button type="text" size="small" icon={<AppstoreAddOutlined />} onClick={onOpenMedia} />
                    </Tooltip>
                    <Upload customRequest={onUpload} showUploadList={false} multiple>
                        <Tooltip title="Upload">
                            <Button type="text" size="small" icon={<CloudUploadOutlined />} />
                        </Tooltip>
                    </Upload>
                </Space>
            </div>

            {renderSummary()}

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
                {loading ? (
                    <div className="flex justify-center py-8"><Spin size="small" /></div>
                ) : sources.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="text-center">
                                <span className="text-[11px] text-gray-400 block mb-2">Belum ada sumber</span>
                                <Space size={4} wrap className="justify-center">
                                    <Upload customRequest={onUpload} showUploadList={false} multiple>
                                        <Button size="small" icon={<CloudUploadOutlined />}>Upload</Button>
                                    </Upload>
                                    <Button size="small" icon={<LinkOutlined />} onClick={() => setUrlModalOpen(true)}>URL</Button>
                                    <Button size="small" icon={<FileTextOutlined />} onClick={() => setTextModalOpen(true)}>Teks</Button>
                                    <Button size="small" icon={<AppstoreAddOutlined />} onClick={onOpenMedia}>Media</Button>
                                </Space>
                            </div>
                        }
                        className="my-6"
                    />
                ) : (
                    sources.map((source) => {
                        const statusDetail = getSourceStatusDetail(source);
                        const stageLabel = getSourceStageLabel(source);
                        const { color, label } = getSourceStatusTag(source);
                        const canSelect = source.parse_status === "done" && (source.chunk_count ?? 0) > 0;
                        const checked = selectedSourceIds.includes(source.id);

                        return (
                            <Tooltip key={source.id} title={statusDetail ?? stageLabel} placement="right">
                                <div className="group flex items-start gap-2 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 mb-1">
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
                                            <Text className="text-[12px] truncate flex-1">{source.filename}</Text>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            <Text className="text-[10px] text-gray-400">{formatBytes(source.file_size)}</Text>
                                            <Tag color={color} className="text-[9px] m-0 px-1">{label}</Tag>
                                        </div>
                                        {source.parse_status === "error" && source.parse_error ? (
                                            <Text type="danger" className="text-[10px] block mt-0.5 line-clamp-2">
                                                {source.parse_error}
                                            </Text>
                                        ) : null}
                                        {isSourceInProgress(source) && (
                                            <Progress
                                                percent={getSourceProgressPercent(source)}
                                                size="small"
                                                strokeColor={themeColor}
                                                className="mt-1 !mb-0"
                                            />
                                        )}
                                    </button>
                                    <Space size={0} className="opacity-0 group-hover:opacity-100">
                                        <Button type="text" size="small" icon={<SyncOutlined />} onClick={() => onReindex(source.id)} />
                                        <Popconfirm
                                            title="Hapus sumber ini?"
                                            okText="Hapus"
                                            cancelText="Batal"
                                            onConfirm={() => onRemove(source.id)}
                                        >
                                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                </div>
                            </Tooltip>
                        );
                    })
                )}
            </div>

            <Modal
                title="Import dari URL"
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
                    Mendukung halaman web, video YouTube (transkrip/caption), dan Google Docs/Slides
                    yang dibagikan publik. Teks diekstrak lalu diindeks seperti file upload.
                </Text>
            </Modal>

            <Modal
                title="Tempel teks sebagai sumber"
                open={textModalOpen}
                onCancel={() => setTextModalOpen(false)}
                onOk={() => void handleAddText()}
                confirmLoading={savingText}
                okText="Tambah sumber"
                okButtonProps={{ disabled: textBody.trim().length < 20 }}
            >
                <Input
                    placeholder="Judul (opsional)"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    className="mb-2"
                />
                <Input.TextArea
                    placeholder="Tempel teks di sini (minimal 20 karakter)…"
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    autoSize={{ minRows: 6, maxRows: 14 }}
                />
                <Text type="secondary" className="text-[11px] block mt-2">
                    Teks akan disimpan sebagai file .txt dan diindeks untuk RAG.
                </Text>
            </Modal>
        </div>
    );
}
