"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import CMSLayout, { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import { Card, Row, Col, Typography, Input, Space, Tag, Empty, Statistic, Tree, Spin, Alert, Descriptions } from "antd";
import {
    ShareAltOutlined, SearchOutlined, NodeIndexOutlined, DatabaseOutlined, LinkOutlined, FileTextOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import {
    StudioDemoBanner, StudioDemoModeTag, StudioLiveBanner, StudioLiveModeTag,
} from "@/components/ai-studio/StudioDemoBanner";
import {
    DEMO_KNOWLEDGE_GRAPH_OVERVIEW,
    knowledgeGraphService,
    type KnowledgeGraphChunkDetail,
    type KnowledgeGraphNode,
    type KnowledgeGraphOverview,
    type KnowledgeGraphSearchHit,
} from "@/lib/knowledgeGraphService";
import { aosGql } from "@/components/agentic-os/lib/api";

const { Text, Paragraph } = Typography;
const { Search } = Input;

function buildAntTree(nodes: KnowledgeGraphNode[]): DataNode[] {
    const byKey = new Map<string, DataNode & { raw: KnowledgeGraphNode }>();
    for (const n of nodes) {
        const icon =
            n.nodeType === "notebook" ? <DatabaseOutlined /> :
            n.nodeType === "source" ? <LinkOutlined /> :
            <FileTextOutlined />;
        byKey.set(n.key, {
            key: n.key,
            title: <span>{n.label}</span>,
            icon,
            isLeaf: n.nodeType === "chunk",
            raw: n,
            children: [],
        });
    }
    const roots: DataNode[] = [];
    for (const n of nodes) {
        const node = byKey.get(n.key)!;
        if (n.parentKey && byKey.has(n.parentKey)) {
            (byKey.get(n.parentKey)!.children as DataNode[]).push(node);
        } else if (!n.parentKey) {
            roots.push(node);
        }
    }
    return roots;
}

function KnowledgeGraphInner({ isDemo, overview, loading, error, onSearch, searching, searchHits, treeData, onSelectNode, inspectorLoading, selectedChunk }: {
    isDemo: boolean;
    overview: KnowledgeGraphOverview | null;
    loading: boolean;
    error: string | null;
    onSearch: (v: string) => void;
    searching: boolean;
    searchHits: KnowledgeGraphSearchHit[];
    treeData: DataNode[];
    onSelectNode: (_keys: React.Key[], info: { node: DataNode & { raw?: KnowledgeGraphNode } }) => void;
    inspectorLoading: boolean;
    selectedChunk: KnowledgeGraphChunkDetail | null;
}) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const { themeColor } = usePreferencesStore();
    const stats = overview?.stats;

    return (
        <div className="flex flex-col gap-1.5 h-[calc(100vh-142px)] min-h-[500px]">
            {/* Compact 38px Tactical Graph Search & Telemetry Ribbon */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "6px 10px",
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderTop: "2px solid #fb923c",
                    flexShrink: 0,
                }}
            >
                <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[540px]">
                    <Search
                        placeholder="Search nodes or semantic concepts (e.g., 'Leave Policy')"
                        enterButton={<SearchOutlined />}
                        size="small"
                        onSearch={onSearch}
                        loading={searching}
                        disabled={isDemo}
                    />
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                    <span style={{ color: t.textSecondary }}>
                        NODES: <strong style={{ color: t.textPrimary }}>{stats?.totalNodes ?? 0}</strong>
                    </span>
                    <span style={{ color: t.textSecondary }}>
                        EDGES: <strong style={{ color: t.textPrimary }}>{stats?.totalEdges ?? 0}</strong>
                    </span>
                    <span style={{ color: t.textSecondary }}>
                        ORPHANED: <strong style={{ color: "#f87171" }}>{stats?.orphanedChunks ?? 0}</strong>
                    </span>
                    <Tag color={isDemo ? "gold" : "green"} className="!m-0 !text-[10px] font-mono" style={{ borderRadius: 0 }}>
                        {isDemo ? "DEMO_TREE" : "PGVECTOR_LIVE"}
                    </Tag>
                </div>
            </div>

            {error && !isDemo ? (
                <Alert type="error" message={error} style={{ borderRadius: 0, padding: "4px 8px" }} showIcon />
            ) : null}

            {!isDemo && searchHits.length > 0 ? (
                <div
                    style={{
                        padding: "6px 10px",
                        background: t.cardBg,
                        border: `1px solid ${t.cardBorder}`,
                        flexShrink: 0,
                    }}
                >
                    <Text type="secondary" className="font-mono text-[10px] uppercase tracking-wider">
                        Semantic matches ({searchHits.length})
                    </Text>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-1">
                        {searchHits.slice(0, 4).map((h) => (
                            <div
                                key={h.chunkId}
                                className="px-2 py-1 text-xs border truncate"
                                style={{ borderColor: t.cardBorder, background: t.surfaceBg }}
                            >
                                <Tag color="orange" className="font-mono !text-[10px] !mr-1.5" style={{ borderRadius: 0 }}>
                                    {Math.round(h.similarity * 100)}%
                                </Tag>
                                <strong style={{ color: t.textPrimary }}>{h.filename}</strong> —{" "}
                                <span style={{ color: t.textSecondary }}>{h.content.slice(0, 90)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 flex-1 min-h-0">
                <Card
                    size="small"
                    title={
                        <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
                            <ShareAltOutlined style={{ color: "#fb923c", marginRight: 6 }} /> Entity Graph
                        </span>
                    }
                    className="lg:col-span-8 flex flex-col min-h-0"
                    style={{ borderRadius: 0, borderTop: "2px solid #fb923c" }}
                    styles={{ body: { padding: 10, flex: 1, overflowY: "auto" } }}
                >
                    <Spin spinning={loading}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320, flexDirection: "column" }}>
                            {treeData.length === 0 && !loading ? (
                                <>
                                    <ShareAltOutlined style={{ fontSize: 42, color: themeColor, opacity: 0.5, marginBottom: 10 }} />
                                    <Text style={{ color: t.textPrimary, fontSize: 13 }}>No indexed notebooks for this tenant yet.</Text>
                                    <Text style={{ color: t.textSecondary, fontSize: 12 }}>Upload sources in AI Studio notebooks to populate the graph.</Text>
                                </>
                            ) : (
                                <div style={{ padding: 12, backgroundColor: t.surfaceBg, border: `1px solid ${t.cardBorder}`, width: "100%", borderRadius: 0 }}>
                                    <Tree
                                        showIcon
                                        defaultExpandAll
                                        treeData={treeData}
                                        onSelect={onSelectNode}
                                        style={{ background: "transparent", color: t.textPrimary }}
                                    />
                                </div>
                            )}
                        </div>
                    </Spin>
                </Card>

                <Card
                    size="small"
                    title={
                        <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
                            <NodeIndexOutlined style={{ color: "#fb923c", marginRight: 6 }} /> Node Inspector
                        </span>
                    }
                    className="lg:col-span-4 flex flex-col min-h-0"
                    style={{ borderRadius: 0, borderTop: "2px solid #fb923c" }}
                    styles={{ body: { padding: 10, flex: 1, overflowY: "auto" } }}
                >
                    <Spin spinning={inspectorLoading}>
                        {selectedChunk ? (
                            <Descriptions column={1} size="small" bordered>
                                <Descriptions.Item label="File">{selectedChunk.filename}</Descriptions.Item>
                                <Descriptions.Item label="Chunk index">{selectedChunk.chunkIndex}</Descriptions.Item>
                                <Descriptions.Item label="Embedding">
                                    {selectedChunk.hasEmbedding ? <Tag color="green" style={{ borderRadius: 0 }}>Yes</Tag> : <Tag color="red" style={{ borderRadius: 0 }}>Missing</Tag>}
                                </Descriptions.Item>
                                <Descriptions.Item label="Content">
                                    <Paragraph style={{ maxHeight: 280, overflow: "auto", marginBottom: 0, fontSize: 12 }}>
                                        {selectedChunk.content}
                                    </Paragraph>
                                </Descriptions.Item>
                            </Descriptions>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Select a chunk node to view its semantic properties and raw text"
                                style={{ marginTop: 60 }}
                            />
                        )}
                    </Spin>
                </Card>
            </div>
        </div>
    );
}

export default function KnowledgeGraphPage() {
    const [uiDemoMode, setUiDemoMode] = useState<boolean | null>(null);
    const [overview, setOverview] = useState<KnowledgeGraphOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchHits, setSearchHits] = useState<KnowledgeGraphSearchHit[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedChunk, setSelectedChunk] = useState<KnowledgeGraphChunkDetail | null>(null);
    const [inspectorLoading, setInspectorLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isDemo = uiDemoMode === true;

    const loadLive = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await knowledgeGraphService.getOverview();
            setOverview(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load knowledge graph");
            setOverview({ stats: { totalNodes: 0, totalEdges: 0, orphanedChunks: 0, embeddedChunks: 0 }, tree: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await aosGql<{ aosSettings: { uiDemoMode: boolean } }>(
                    `query { aosSettings { uiDemoMode } }`,
                );
                if (cancelled) return;
                const demo = d.aosSettings?.uiDemoMode === true;
                setUiDemoMode(demo);
                if (demo) {
                    setOverview(DEMO_KNOWLEDGE_GRAPH_OVERVIEW);
                    setLoading(false);
                } else {
                    await loadLive();
                }
            } catch {
                if (!cancelled) {
                    setUiDemoMode(false);
                    await loadLive();
                }
            }
        })();
        return () => { cancelled = true; };
    }, [loadLive]);

    const treeData = useMemo(() => buildAntTree(overview?.tree ?? []), [overview?.tree]);

    const onSearch = async (value: string) => {
        if (isDemo) return;
        const q = value.trim();
        if (!q) {
            setSearchHits([]);
            return;
        }
        setSearching(true);
        try {
            const hits = await knowledgeGraphService.search(q);
            setSearchHits(hits);
        } finally {
            setSearching(false);
        }
    };

    const onSelectNode = async (_keys: React.Key[], info: { node: DataNode & { raw?: KnowledgeGraphNode } }) => {
        const raw = info.node.raw;
        if (!raw || raw.nodeType !== "chunk" || !raw.entityId) {
            setSelectedChunk(null);
            return;
        }
        if (isDemo) {
            setSelectedChunk({
                id: raw.entityId,
                notebookId: "demo-nb",
                sourceId: "demo-src",
                filename: "Employee Handbook.pdf",
                chunkIndex: Number(raw.meta?.chunkIndex ?? 0),
                content: "Sample demo chunk — enable Live mode (ui_demo_mode off) to inspect real vectors.",
                hasEmbedding: true,
            });
            return;
        }
        setInspectorLoading(true);
        try {
            const detail = await knowledgeGraphService.getChunk(raw.entityId);
            setSelectedChunk(detail);
        } catch {
            setSelectedChunk(null);
        } finally {
            setInspectorLoading(false);
        }
    };

    return (
        <CMSLayout
            title="Knowledge Graph Explorer"
            subTitle="Visualize semantic relationships in your Vector DB"
            extra={[isDemo ? <StudioDemoModeTag key="demo" /> : <StudioLiveModeTag key="live" />]}
        >
            <KnowledgeGraphInner
                isDemo={isDemo}
                overview={overview}
                loading={loading}
                error={error}
                onSearch={onSearch}
                searching={searching}
                searchHits={searchHits}
                treeData={treeData}
                onSelectNode={onSelectNode}
                inspectorLoading={inspectorLoading}
                selectedChunk={selectedChunk}
            />
        </CMSLayout>
    );
}
