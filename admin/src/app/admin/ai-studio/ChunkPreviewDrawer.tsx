"use client";

import React, { useEffect, useState } from "react";
import { Drawer, Spin, Tag, Typography } from "antd";
import { studioService, type StudioChunk } from "@/lib/studioService";

const { Text, Paragraph } = Typography;

type Props = {
    chunkId: string | null;
    docName?: string;
    score?: number;
    onClose: () => void;
};

export default function ChunkPreviewDrawer({ chunkId, docName, score, onClose }: Props) {
    const [chunk, setChunk] = useState<StudioChunk | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!chunkId) {
            setChunk(null);
            return;
        }
        setLoading(true);
        studioService
            .getChunk(chunkId)
            .then(setChunk)
            .catch(() => setChunk(null))
            .finally(() => setLoading(false));
    }, [chunkId]);

    return (
        <Drawer
            title={docName ?? chunk?.filename ?? "Source Excerpt"}
            open={!!chunkId}
            onClose={onClose}
            size={420}
        >
            {loading ? (
                <div className="flex justify-center py-8"><Spin /></div>
            ) : chunk ? (
                <>
                    <div className="flex gap-2 mb-3">
                        <Tag>Chunk #{chunk.chunk_index + 1}</Tag>
                        {typeof score === "number" && (
                            <Tag color="blue">Relevance {(score * 100).toFixed(0)}%</Tag>
                        )}
                    </div>
                    <Paragraph className="text-sm whitespace-pre-wrap">{chunk.content}</Paragraph>
                </>
            ) : (
                <Text type="secondary">Excerpt not found.</Text>
            )}
        </Drawer>
    );
}
