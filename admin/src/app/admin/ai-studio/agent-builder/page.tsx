"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import CMSLayout, { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import {
    Card,
    Row,
    Col,
    Typography,
    Button,
    Space,
    Tag,
    Collapse,
    Select,
    Input,
    Modal,
    message,
    Popconfirm,
    Empty,
    Alert,
} from "antd";
import {
    RobotOutlined,
    NodeIndexOutlined,
    SettingOutlined,
    PlayCircleOutlined,
    ApiOutlined,
    DatabaseOutlined,
    GlobalOutlined,
    CodeOutlined,
    PlusOutlined,
    SaveOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { StudioLiveBanner, StudioLiveModeTag } from "@/components/ai-studio/StudioDemoBanner";
import {
    agentBuilderService,
    type AgentWorkflow,
    type WorkflowNode,
    type WorkflowNodeKind,
} from "@/lib/agentBuilderService";

const { Text } = Typography;
const { Panel } = Collapse;

const PALETTE: Array<{ kind: WorkflowNodeKind; label: string; detail: string; tag: string; icon: React.ReactNode; color: string }> = [
    { kind: "trigger", label: "Webhook Trigger", detail: "Awaits incoming JSON payload", tag: "Input", icon: <GlobalOutlined />, color: "#38bdf8" },
    { kind: "llm", label: "Intent Classifier", detail: "Model: Claude 3.5 Sonnet", tag: "LLM", icon: <RobotOutlined />, color: "" },
    { kind: "tool", label: "Context Retrieval", detail: "Queries Supabase pgvector", tag: "Tool", icon: <DatabaseOutlined />, color: "#34d399" },
    { kind: "tool", label: "REST API Call", detail: "HTTP request to external API", tag: "Tool", icon: <ApiOutlined />, color: "#34d399" },
    { kind: "logic", label: "Python Script", detail: "Executes custom formatting", tag: "Logic", icon: <CodeOutlined />, color: "#fb923c" },
];

function tagColor(kind: WorkflowNodeKind): string {
    switch (kind) {
        case "trigger":
            return "blue";
        case "llm":
            return "purple";
        case "tool":
            return "green";
        default:
            return "orange";
    }
}

function newNodeId() {
    return `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function AgentBuilderInner() {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const { themeColor } = usePreferencesStore();
    const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draftGraph, setDraftGraph] = useState<AgentWorkflow["graph"]>({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");

    const selected = useMemo(
        () => workflows.find((w) => w.id === selectedId) ?? null,
        [workflows, selectedId],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await agentBuilderService.listWorkflows();
            setWorkflows(list);
            if (!selectedId && list.length > 0) {
                setSelectedId(list[0].id);
                setDraftGraph(list[0].graph);
            } else if (selectedId) {
                const cur = list.find((w) => w.id === selectedId);
                if (cur) setDraftGraph(cur.graph);
            }
        } catch {
            message.error("Failed to load workflows from the server.");
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (selected) setDraftGraph(selected.graph);
    }, [selected?.id, selected?.updatedAt]);

    const onSelectWorkflow = (id: string) => {
        setSelectedId(id);
        const w = workflows.find((x) => x.id === id);
        if (w) setDraftGraph(w.graph);
    };

    const addPaletteNode = (entry: (typeof PALETTE)[number]) => {
        const node: WorkflowNode = {
            id: newNodeId(),
            kind: entry.kind,
            label: entry.label,
            detail: entry.detail,
            tag: entry.tag,
        };
        setDraftGraph((g) => {
            const nodes = [...g.nodes, node];
            const edges = [...g.edges];
            if (nodes.length > 1) {
                const prev = nodes[nodes.length - 2];
                edges.push({ from: prev.id, to: node.id });
            }
            return { nodes, edges };
        });
    };

    const saveGraph = async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            const updated = await agentBuilderService.updateWorkflow(selectedId, { graph: draftGraph });
            setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
            message.success("Workflow saved to the database.");
        } catch {
            message.error("Save failed.");
        } finally {
            setSaving(false);
        }
    };

    const createWorkflow = async () => {
        const name = newName.trim() || "Untitled workflow";
        try {
            const created = await agentBuilderService.createWorkflow(name);
            setWorkflows((prev) => [created, ...prev]);
            setSelectedId(created.id);
            setDraftGraph(created.graph);
            setCreateOpen(false);
            setNewName("");
            message.success("Workflow created.");
        } catch {
            message.error("Could not create workflow.");
        }
    };

    const deleteWorkflow = async () => {
        if (!selectedId) return;
        try {
            await agentBuilderService.deleteWorkflow(selectedId);
            message.success("Workflow deleted.");
            setSelectedId(null);
            setDraftGraph({ nodes: [], edges: [] });
            await load();
        } catch {
            message.error("Delete failed.");
        }
    };

    const testRun = async () => {
        if (!selectedId) {
            message.warning("Create or select a workflow first.");
            return;
        }
        if (draftGraph.nodes.length === 0) {
            message.warning("Add at least one node before a test run.");
            return;
        }
        try {
            await agentBuilderService.updateWorkflow(selectedId, { graph: draftGraph });
            const updated = await agentBuilderService.recordTestRun(selectedId);
            setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? { ...w, lastTestedAt: updated.lastTestedAt } : w)));
            message.success("Test run recorded (dry-run metadata only — execution uses Agentic OS tasks).");
        } catch {
            message.error("Test run failed.");
        }
    };

    const renderNode = (node: WorkflowNode, index: number) => {
        const palette = PALETTE.find((p) => p.label === node.label);
        const borderColor =
            node.kind === "trigger" ? "#38bdf8" : node.kind === "tool" ? "#34d399" : node.kind === "logic" ? "#fb923c" : themeColor;
        return (
            <React.Fragment key={node.id}>
                {index > 0 ? <div style={{ height: 18, width: 2, backgroundColor: t.cardBorder }} /> : null}
                <Card
                    style={{
                        width: 310,
                        borderRadius: 0,
                        background: t.cardBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderTop: `2px solid ${borderColor}`,
                    }}
                    size="small"
                    styles={{ body: { padding: "8px 10px" } }}
                >
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Space style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                            <Text strong style={{ color: t.textPrimary, fontSize: 12 }}>
                                {palette?.icon ?? <RobotOutlined />} {node.label}
                            </Text>
                            <Tag color={tagColor(node.kind)} className="!m-0 !text-[10px] font-mono" style={{ borderRadius: 0 }}>
                                {node.tag ?? node.kind.toUpperCase()}
                            </Tag>
                        </Space>
                        {node.detail ? (
                            <Text style={{ fontSize: 11, color: t.textSecondary }}>
                                {node.detail}
                            </Text>
                        ) : null}
                        {node.kind === "llm" ? (
                            <Button size="small" type="dashed" block icon={<SettingOutlined />} disabled style={{ borderRadius: 0 }}>
                                Edit Prompt (coming soon)
                            </Button>
                        ) : null}
                    </Space>
                </Card>
            </React.Fragment>
        );
    };

    return (
        <div className="flex flex-col gap-1.5 h-[calc(100vh-142px)] min-h-[500px]">
            {/* Single 38px Tactical Workflow Control Ribbon */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "5px 10px",
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderTop: "2px solid #fb923c",
                    flexShrink: 0,
                }}
            >
                <Space size={6} wrap>
                    <Select
                        size="small"
                        style={{ minWidth: 230 }}
                        placeholder="Select workflow"
                        loading={loading}
                        value={selectedId ?? undefined}
                        onChange={onSelectWorkflow}
                        options={workflows.map((w) => ({ value: w.id, label: w.name }))}
                        notFoundContent={<Empty description="No workflows yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    />
                    <Button size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ borderRadius: 0 }}>
                        New workflow
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={saveGraph}
                        loading={saving}
                        disabled={!selectedId}
                        data-testid="agent-builder-save"
                        style={{ borderRadius: 0 }}
                    >
                        Save
                    </Button>
                    <Popconfirm title="Delete this workflow?" onConfirm={deleteWorkflow} disabled={!selectedId}>
                        <Button size="small" danger icon={<DeleteOutlined />} disabled={!selectedId} style={{ borderRadius: 0 }}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>

                <Space size={8} wrap>
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: t.textSecondary }}>
                        NODES: <strong style={{ color: t.textPrimary }}>{draftGraph.nodes.length}</strong> · EDGES:{" "}
                        <strong style={{ color: t.textPrimary }}>{draftGraph.edges.length}</strong>
                    </span>
                    {selected?.lastTestedAt ? (
                        <Text type="secondary" className="font-mono" style={{ fontSize: 10 }}>
                            LAST_TEST: {new Date(selected.lastTestedAt).toLocaleTimeString()}
                        </Text>
                    ) : null}
                    <Button
                        size="small"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={testRun}
                        disabled={!selectedId}
                        style={{ borderRadius: 0, backgroundColor: themeColor }}
                    >
                        Test Run
                    </Button>
                </Space>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 flex-1 min-h-0">
                <Card
                    title={<span className="font-mono text-[11px] uppercase tracking-[0.06em]">Node Library (palette)</span>}
                    size="small"
                    className="lg:col-span-3 flex flex-col min-h-0"
                    style={{ borderRadius: 0, borderTop: "2px solid #fb923c" }}
                    styles={{ body: { padding: 8, flex: 1, overflowY: "auto" } }}
                >
                    <div className="mb-2 px-1.5 py-1 border border-white/[0.06] font-mono text-[10px]" style={{ color: t.textSecondary }}>
                        Click any node below to append to active canvas graph.
                    </div>
                    <Collapse defaultActiveKey={["1", "2"]} ghost size="small">
                        <Panel header={<span className="font-mono text-[11px] uppercase">LLM Engines</span>} key="1">
                            {PALETTE.filter((p) => p.kind === "llm").map((p) => (
                                <Card
                                    key={p.label}
                                    size="small"
                                    hoverable
                                    style={{
                                        marginBottom: 6,
                                        borderRadius: 0,
                                        borderLeft: `2px solid ${themeColor}`,
                                        cursor: "pointer",
                                    }}
                                    styles={{ body: { padding: "6px 8px" } }}
                                    onClick={() => addPaletteNode(p)}
                                >
                                    <Space size={6} className="text-xs">
                                        <RobotOutlined /> {p.label}
                                    </Space>
                                </Card>
                            ))}
                        </Panel>
                        <Panel header={<span className="font-mono text-[11px] uppercase">Triggers, Tools & Logic</span>} key="2">
                            {PALETTE.filter((p) => p.kind !== "llm").map((p) => (
                                <Card
                                    key={p.label}
                                    size="small"
                                    hoverable
                                    style={{
                                        marginBottom: 6,
                                        borderRadius: 0,
                                        borderLeft: `2px solid ${p.color || themeColor}`,
                                        cursor: "pointer",
                                    }}
                                    styles={{ body: { padding: "6px 8px" } }}
                                    onClick={() => addPaletteNode(p)}
                                >
                                    <Space size={6} className="text-xs">
                                        {p.icon} {p.label}
                                    </Space>
                                </Card>
                            ))}
                        </Panel>
                    </Collapse>
                </Card>

                <Card
                    size="small"
                    title={
                        <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
                            <NodeIndexOutlined style={{ color: "#fb923c", marginRight: 6 }} /> Workflow Canvas
                            {selected ? `: ${selected.name}` : ""}
                        </span>
                    }
                    className="lg:col-span-9 flex flex-col min-h-0"
                    style={{
                        borderRadius: 0,
                        borderTop: "2px solid #fb923c",
                        backgroundColor: t.surfaceBg,
                        backgroundImage: `radial-gradient(${t.cardBorder} 1px, transparent 1px)`,
                        backgroundSize: "18px 18px",
                    }}
                    styles={{ body: { padding: 16, flex: 1, overflowY: "auto" } }}
                >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {!selectedId ? (
                            <Empty description="Create a workflow to start building" />
                        ) : draftGraph.nodes.length === 0 ? (
                            <Empty description="Click a node in the palette to add steps" />
                        ) : (
                            draftGraph.nodes.map((n, i) => renderNode(n, i))
                        )}
                    </div>
                </Card>
            </div>

            <Modal
                title="New agent workflow"
                open={createOpen}
                onOk={createWorkflow}
                onCancel={() => setCreateOpen(false)}
                okText="Create"
            >
                <Input placeholder="Workflow name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </Modal>
        </div>
    );
}

export default function AgentBuilderPage() {
    return (
        <CMSLayout
            title="Visual Agent Builder"
            subTitle="Orchestrate autonomous AI agents and toolchains"
            extra={[<StudioLiveModeTag key="live" />]}
        >
            <AgentBuilderInner />
        </CMSLayout>
    );
}
