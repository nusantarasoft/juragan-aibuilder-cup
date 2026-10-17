"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
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
    { kind: "trigger", label: "Webhook Trigger", detail: "Awaits incoming JSON payload", tag: "Input", icon: <GlobalOutlined />, color: "#1890ff" },
    { kind: "llm", label: "Intent Classifier", detail: "Model: Claude 3.5 Sonnet", tag: "LLM", icon: <RobotOutlined />, color: "" },
    { kind: "tool", label: "Context Retrieval", detail: "Queries Supabase pgvector", tag: "Tool", icon: <DatabaseOutlined />, color: "#52c41a" },
    { kind: "tool", label: "REST API Call", detail: "HTTP request to external API", tag: "Tool", icon: <ApiOutlined />, color: "#52c41a" },
    { kind: "logic", label: "Python Script", detail: "Executes custom formatting", tag: "Logic", icon: <CodeOutlined />, color: "#faad14" },
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

export default function AgentBuilderPage() {
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
            node.kind === "trigger" ? "#1890ff" : node.kind === "tool" ? "#52c41a" : node.kind === "logic" ? "#faad14" : themeColor;
        return (
            <React.Fragment key={node.id}>
                {index > 0 ? <div style={{ height: 32, width: 2, backgroundColor: "#d9d9d9" }} /> : null}
                <Card style={{ width: 320, borderTop: `4px solid ${borderColor}` }} size="small">
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Space style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                            <Text strong>
                                {palette?.icon ?? <RobotOutlined />} {node.label}
                            </Text>
                            <Tag color={tagColor(node.kind)}>{node.tag ?? node.kind.toUpperCase()}</Tag>
                        </Space>
                        {node.detail ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {node.detail}
                            </Text>
                        ) : null}
                        {node.kind === "llm" ? (
                            <Button size="small" type="dashed" block icon={<SettingOutlined />} disabled>
                                Edit Prompt (coming soon)
                            </Button>
                        ) : null}
                    </Space>
                </Card>
            </React.Fragment>
        );
    };

    return (
        <CMSLayout
            title="Visual Agent Builder"
            subTitle="Orchestrate autonomous AI agents and toolchains"
            extra={[<StudioLiveModeTag key="live" />]}
        >
            <StudioLiveBanner
                title="Visual Agent Builder"
                detail="Workflows persist per tenant in studio_agent_workflows (GraphQL). Agentic OS playbooks remain separate step templates for task queue."
            />
            <Alert
                type="warning"
                showIcon={false}
                message={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <strong>Demo path:</strong> node palette cards are static UX samples — only the canvas graph is saved to your tenant.
                    </Text>
                }
                style={{ marginBottom: 16 }}
            />
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col flex="auto">
                    <Space wrap>
                        <Select
                            style={{ minWidth: 280 }}
                            placeholder="Select workflow"
                            loading={loading}
                            value={selectedId ?? undefined}
                            onChange={onSelectWorkflow}
                            options={workflows.map((w) => ({ value: w.id, label: w.name }))}
                            notFoundContent={<Empty description="No workflows yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                        />
                        <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                            New workflow
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={saveGraph}
                            loading={saving}
                            disabled={!selectedId}
                            data-testid="agent-builder-save"
                        >
                            Save
                        </Button>
                        <Popconfirm title="Delete this workflow?" onConfirm={deleteWorkflow} disabled={!selectedId}>
                            <Button danger icon={<DeleteOutlined />} disabled={!selectedId}>
                                Delete
                            </Button>
                        </Popconfirm>
                    </Space>
                </Col>
                <Col>
                    {selected?.lastTestedAt ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Last test: {new Date(selected.lastTestedAt).toLocaleString()}
                        </Text>
                    ) : null}
                </Col>
            </Row>
            <Row gutter={24}>
                <Col span={6}>
                    <Card title="Node Library (palette)" size="small" bordered={false} className="shadow-sm">
                        <Collapse defaultActiveKey={["1", "2"]} ghost>
                            <Panel header="LLM Engines" key="1">
                                {PALETTE.filter((p) => p.kind === "llm").map((p) => (
                                    <Card
                                        key={p.label}
                                        size="small"
                                        hoverable
                                        style={{ marginBottom: 8, borderLeft: `4px solid ${themeColor}`, cursor: "pointer" }}
                                        onClick={() => addPaletteNode(p)}
                                    >
                                        <Space>
                                            <RobotOutlined /> {p.label}
                                        </Space>
                                    </Card>
                                ))}
                            </Panel>
                            <Panel header="Triggers, Tools & Logic" key="2">
                                {PALETTE.filter((p) => p.kind !== "llm").map((p) => (
                                    <Card
                                        key={p.label}
                                        size="small"
                                        hoverable
                                        style={{ marginBottom: 8, borderLeft: `4px solid ${p.color || themeColor}`, cursor: "pointer" }}
                                        onClick={() => addPaletteNode(p)}
                                    >
                                        <Space>
                                            {p.icon} {p.label}
                                        </Space>
                                    </Card>
                                ))}
                            </Panel>
                        </Collapse>
                    </Card>
                </Col>
                <Col span={18}>
                    <Card
                        title={
                            <>
                                <NodeIndexOutlined /> Workflow Canvas
                                {selected ? `: ${selected.name}` : ""}
                            </>
                        }
                        extra={
                            <Button type="primary" icon={<PlayCircleOutlined />} onClick={testRun} disabled={!selectedId}>
                                Test Run
                            </Button>
                        }
                        bordered={false}
                        className="shadow-sm"
                        style={{
                            minHeight: 600,
                            backgroundColor: "#fafafa",
                            backgroundImage: "radial-gradient(#e5e5e5 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                        }}
                    >
                        <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            {!selectedId ? (
                                <Empty description="Create a workflow to start building" />
                            ) : draftGraph.nodes.length === 0 ? (
                                <Empty description="Click a node in the palette to add steps" />
                            ) : (
                                draftGraph.nodes.map((n, i) => renderNode(n, i))
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
            <Modal
                title="New agent workflow"
                open={createOpen}
                onOk={createWorkflow}
                onCancel={() => setCreateOpen(false)}
                okText="Create"
            >
                <Input placeholder="Workflow name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </Modal>
        </CMSLayout>
    );
}
