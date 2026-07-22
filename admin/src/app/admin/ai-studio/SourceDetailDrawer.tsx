"use client";

import React, { useEffect, useState } from "react";
import { Drawer, Empty, Spin, Tag, Typography } from "antd";
import { studioService, type StudioSourceDetail } from "@/lib/studioService";
import { getSourceStatusTag } from "./studioSourceStatus";

const { Text, Paragraph } = Typography;

type Props = {
    notebookId: string | null;
    sourceId: string | null;
    themeColor: string;
    onClose: () => void;
    onOpenChunk?: (chunkId: string, docName: string) => void;
};

export default function SourceDetailDrawer({
    notebookId,
    sourceId,
    themeColor,
    onClose,
    onOpenChunk,
}: Props) {
    const [detail, setDetail] = useState<StudioSourceDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!notebookId || !sourceId) {
            setDetail(null);
            return;
        }
        setLoading(true);
        studioService
            .getSourceDetail(notebookId, sourceId)
            .then(setDetail)
            .catch(() => setDetail(null))
            .finally(() => setLoading(false));
    }, [notebookId, sourceId]);

    const source = detail?.source;

    return (
        <Drawer
            title={source?.filename ?? "Detail sumber"}
            open={!!sourceId}
            onClose={onClose}
            size={480}
        >
            {loading ? (
                <div className="flex justify-center py-8"><Spin /></div>
            ) : !detail || !source ? (
                <Text type="secondary">Sumber tidak ditemukan.</Text>
            ) : (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                        <Tag color={getSourceStatusTag(source).color}>{getSourceStatusTag(source).label}</Tag>
                        <Tag>{detail.totalChunks} chunk</Tag>
                        {source.file_type ? <Tag>{source.file_type}</Tag> : null}
                    </div>
                    {source.parse_error ? (
                        <Paragraph type="danger" className="text-xs mb-0">
                            {source.parse_error}
                        </Paragraph>
                    ) : null}
                    <Text strong className="text-xs" style={{ color: themeColor }}>
                        Cuplikan terindeks
                    </Text>
                    {detail.chunks.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada chunk" />
                    ) : (
                        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                            {detail.chunks.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    className="text-left rounded-lg border border-black/5 p-2 hover:bg-black/[0.03] transition-colors"
                                    onClick={() => onOpenChunk?.(c.id, source.filename)}
                                >
                                    <Tag className="mb-1">#{c.chunk_index + 1}</Tag>
                                    <Paragraph className="text-xs mb-0 whitespace-pre-wrap text-gray-700">
                                        {c.content}
                                        {c.content.length >= 800 ? "…" : ""}
                                    </Paragraph>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Drawer>
    );
}
