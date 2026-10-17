"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
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

export default function KnowledgeGraphPage() {
    const { themeColor } = usePreferencesStore();
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

    const stats = overview?.stats;

    return (
        <CMSLayout
            title="Knowledge Graph Explorer"
            subTitle="Visualize semantic relationships in your Vector DB"
            extra={[isDemo ? <StudioDemoModeTag key="demo" /> : <StudioLiveModeTag key="live" />]}
        >
            {isDemo ? (
                <StudioDemoBanner
                    title="Knowledge Graph Explorer"
                    detail="Sample tree and metrics only — turn off Agentic OS UI demo mode to load tenant notebooks and pgvector chunks (P2-2 Live)."
                />
            ) : (
                <StudioLiveBanner
                    title="Knowledge Graph Explorer"
                    detail="Tree and metrics load from Postgres RPC over studio notebooks, sources, and embeddings; search uses match_studio_chunks_for_tenant."
                />
            )}
            {error && !isDemo ? (
                <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
            ) : null}
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card bordered={false} className="shadow-sm">
                        <Row gutter={24} align="middle">
                            <Col span={12}>
                                <Search
                                    placeholder="Search nodes or semantic concepts (e.g., 'Leave Policy')"
                                    enterButton={<SearchOutlined />}
                                    size="large"
                                    onSearch={onSearch}
                                    loading={searching}
                                    disabled={isDemo}
                                />
                            </Col>
                            <Col span={4}>
                                <Statistic title="Total Nodes" value={stats?.totalNodes ?? 0} loading={loading} />
                            </Col>
                            <Col span={4}>
                                <Statistic title="Total Edges" value={stats?.totalEdges ?? 0} loading={loading} />
                            </Col>
                            <Col span={4}>
                                <Statistic
                                    title="Orphaned Chunks"
                                    value={stats?.orphanedChunks ?? 0}
                                    valueStyle={{ color: "#cf1322" }}
                                    loading={loading}
                                />
                            </Col>
                        </Row>
                        {!isDemo && searchHits.length > 0 ? (
                            <div style={{ marginTop: 16 }}>
                                <Text type="secondary">Semantic matches ({searchHits.length})</Text>
                                <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
                                    {searchHits.slice(0, 6).map((h) => (
                                        <Alert
                                            key={h.chunkId}
                                            type="info"
                                            message={
                                                <span>
                                                    <Tag color="blue">{Math.round(h.similarity * 100)}%</Tag>
                                                    {h.filename} — {h.content.slice(0, 120)}
                                                    {h.content.length > 120 ? "…" : ""}
                                                </span>
                                            }
                                        />
                                    ))}
                                </Space>
                            </div>
                        ) : null}
                    </Card>
                </Col>

                <Col span={16}>
                    <Card
                        title={<><ShareAltOutlined /> Entity Graph</>}
                        bordered={false}
                        className="shadow-sm"
                        style={{ minHeight: 500, backgroundColor: "#000" }}
                    >
                        <Spin spinning={loading}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400, flexDirection: "column" }}>
                                {treeData.length === 0 && !loading ? (
                                    <>
                                        <ShareAltOutlined style={{ fontSize: 64, color: themeColor, opacity: 0.5, marginBottom: 16 }} />
                                        <Text style={{ color: "#fff" }}>No indexed notebooks for this tenant yet.</Text>
                                        <Text type="secondary">Upload sources in AI Studio notebooks to populate the graph.</Text>
                                    </>
                                ) : (
                                    <div style={{ marginTop: 24, padding: 24, backgroundColor: "#141414", width: "100%", borderRadius: 8 }}>
                                        <Tree
                                            showIcon
                                            defaultExpandAll
                                            treeData={treeData}
                                            onSelect={onSelectNode}
                                            style={{ background: "transparent", color: "#fff" }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Spin>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title={<><NodeIndexOutlined /> Node Inspector</>} bordered={false} className="shadow-sm" style={{ minHeight: 500 }}>
                        <Spin spinning={inspectorLoading}>
                            {selectedChunk ? (
                                <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label="File">{selectedChunk.filename}</Descriptions.Item>
                                    <Descriptions.Item label="Chunk index">{selectedChunk.chunkIndex}</Descriptions.Item>
                                    <Descriptions.Item label="Embedding">
                                        {selectedChunk.hasEmbedding ? <Tag color="green">Yes</Tag> : <Tag color="red">Missing</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Content">
                                        <Paragraph style={{ maxHeight: 280, overflow: "auto", marginBottom: 0 }}>
                                            {selectedChunk.content}
                                        </Paragraph>
                                    </Descriptions.Item>
                                </Descriptions>
                            ) : (
                                <Empty
                                    description="Select a chunk node to view its semantic properties and raw text"
                                    style={{ marginTop: 100 }}
                                />
                            )}
                        </Spin>
                    </Card>
                </Col>
            </Row>
        </CMSLayout>
    );
}
