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
            title={source?.filename ?? "Source Details"}
            open={!!sourceId}
            onClose={onClose}
            size={480}
        >
            {loading ? (
                <div className="flex justify-center py-8"><Spin /></div>
            ) : !detail || !source ? (
                <Text type="secondary">Source not found.</Text>
            ) : (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                        <Tag color={getSourceStatusTag(source).color} className="font-mono !rounded-none uppercase">
                            {getSourceStatusTag(source).label}
                        </Tag>
                        <Tag className="font-mono !rounded-none tabular-nums">{detail.totalChunks} chunks</Tag>
                        {source.file_type ? <Tag className="font-mono !rounded-none uppercase">{source.file_type}</Tag> : null}
                    </div>
                    {source.parse_error ? (
                        <Paragraph type="danger" className="text-xs mb-0">
                            {source.parse_error}
                        </Paragraph>
                    ) : null}
                    <Text strong className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: themeColor }}>
                        Indexed Chunks
                    </Text>
                    {detail.chunks.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No chunks indexed yet" />
                    ) : (
                        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                            {detail.chunks.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    className="text-left rounded-none border border-white/10 bg-white/[0.02] p-2.5 hover:bg-white/[0.05] transition-colors cursor-pointer"
                                    style={{ borderLeft: `2px solid ${themeColor}` }}
                                    onClick={() => onOpenChunk?.(c.id, source.filename)}
                                >
                                    <Tag className="font-mono mb-1 !rounded-none tabular-nums">#{c.chunk_index + 1}</Tag>
                                    <Paragraph className="text-xs mb-0 whitespace-pre-wrap">
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
