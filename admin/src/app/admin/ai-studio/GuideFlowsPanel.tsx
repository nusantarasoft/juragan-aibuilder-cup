"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    Empty,
    Input,
    List,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from "antd";
import {
    PlusOutlined,
    SaveOutlined,
    RocketOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
    SendOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import {
    studioService,
    type StudioGuideFlow,
    type GuidedTurnResponse,
} from "@/lib/studioService";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface GuideFlowsPanelProps {
    notebookId: string | null;
    themeColor: string;
    userId: string;
    sourcesReady: boolean;
}

interface SimMessage {
    role: "user" | "assistant";
    content: string;
    references?: { content: string; docName: string; score: number }[];
    timestamp: number;
}

export default function GuideFlowsPanel({
    notebookId,
    themeColor,
    userId,
    sourcesReady,
}: GuideFlowsPanelProps) {
    const [flows, setFlows] = useState<StudioGuideFlow[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editorJson, setEditorJson] = useState("");
    const [flowName, setFlowName] = useState("");
    const [saving, setSaving] = useState(false);
    const [simConvId, setSimConvId] = useState<string | undefined>();
    const [simHistory, setSimHistory] = useState<SimMessage[]>([]);
    const [simInput, setSimInput] = useState("");
    const [simBusy, setSimBusy] = useState(false);
    const [waitingInput, setWaitingInput] = useState(false);

    const selected = flows.find((f) => f.id === selectedId) ?? null;

    const loadFlows = useCallback(async () => {
        if (!notebookId) return;
        setLoading(true);
        try {
            const list = await studioService.getGuideFlows(notebookId);
            setFlows(list);
        } catch (e: any) {
            message.error(e.message || "Failed to load guide flows");
        } finally {
            setLoading(false);
        }
    }, [notebookId]);

    useEffect(() => {
        loadFlows();
    }, [loadFlows]);

    useEffect(() => {
        if (selectedId && !flows.some((f) => f.id === selectedId)) {
            setSelectedId(null);
        }
    }, [flows, selectedId]);

    useEffect(() => {
        if (selected) {
            setFlowName(selected.name);
            setEditorJson(JSON.stringify(selected.definition, null, 2));
        } else {
            setFlowName("");
            setEditorJson("");
        }
    }, [selected]);

    const resetSimulator = () => {
        setSimConvId(undefined);
        setSimHistory([]);
        setSimInput("");
        setWaitingInput(false);
    };

    const applyGuidedReplies = (res: GuidedTurnResponse) => {
        setSimConvId(res.conversationId);
        setWaitingInput(res.waitingForInput);
        const ts = Date.now();
        setSimHistory((prev) => {
            const next = [...prev];
            for (const r of res.replies) {
                next.push({
                    role: "assistant",
                    content: r.content,
                    references: r.references,
                    timestamp: ts,
                });
            }
            return next;
        });
    };

    const handleCreate = async () => {
        if (!notebookId) return;
        try {
            const f = await studioService.createGuideFlow(notebookId, "New guide flow");
            message.success("Flow created");
            await loadFlows();
            setSelectedId(f.id);
        } catch (e: any) {
            message.error(e.message || "Create failed");
        }
    };

    const handleSave = async () => {
        if (!selected) return;
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(editorJson) as Record<string, unknown>;
        } catch {
            message.error("Definition must be valid JSON");
            return;
        }
        setSaving(true);
        try {
            await studioService.updateGuideFlow(selected.id, {
                name: flowName.trim() || selected.name,
                definition: parsed,
            });
            message.success("Saved");
            await loadFlows();
        } catch (e: any) {
            message.error(e.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!selected) return;
        try {
            await studioService.publishGuideFlow(selected.id);
            message.success("Published (only one published flow per notebook)");
            await loadFlows();
        } catch (e: any) {
            message.error(e.message || "Publish failed");
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        try {
            await studioService.deleteGuideFlow(selected.id);
            message.success("Deleted");
            setSelectedId(null);
            resetSimulator();
            await loadFlows();
        } catch (e: any) {
            message.error(e.message || "Delete failed");
        }
    };

    const handleStartSim = async () => {
        if (!notebookId || !selected) return;
        if (!sourcesReady) {
            message.warning("Need at least one source before simulation.");
            return;
        }
        resetSimulator();
        setSimBusy(true);
        try {
            const res = await studioService.startGuidedSession(notebookId, selected.id, userId);
            applyGuidedReplies(res);
        } catch (e: any) {
            message.error(e.message || "Could not start guided session");
        } finally {
            setSimBusy(false);
        }
    };

    const handleSimSend = async () => {
        if (!notebookId || !selected || !simConvId || !simInput.trim()) return;
        if (!waitingInput) {
            message.warning("Flow is not waiting for input.");
            return;
        }
        const text = simInput.trim();
        setSimInput("");
        setSimHistory((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);
        setSimBusy(true);
        try {
            const res = await studioService.guidedChat(
                notebookId,
                selected.id,
                simConvId,
                text,
                userId,
            );
            applyGuidedReplies(res);
        } catch (e: any) {
            message.error(e.message || "Guided chat failed");
        } finally {
            setSimBusy(false);
        }
    };

    if (!notebookId) {
        return (
            <div className="flex items-center justify-center h-48 opacity-60">
                <Text type="secondary">Select a notebook to manage guide flows.</Text>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 min-h-[480px]">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                    style={{ backgroundColor: themeColor }}
                >
                    New flow
                </Button>
                <Button onClick={() => loadFlows()} loading={loading}>
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                <Card size="small" title="Flows" className="!rounded-xl overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Spin />
                        </div>
                    ) : flows.length === 0 ? (
                        <Empty description="No guide flows yet" />
                    ) : (
                        <List
                            size="small"
                            dataSource={flows}
                            className="max-h-[280px] overflow-auto custom-scrollbar"
                            renderItem={(item) => (
                                <List.Item
                                    className={`cursor-pointer rounded-lg px-2 ${selectedId === item.id ? "bg-[color-mix(in_srgb,var(--theme-color,#7c3aed)_12%,transparent)]" : ""}`}
                                    onClick={() => {
                                        setSelectedId(item.id);
                                        resetSimulator();
                                    }}
                                >
                                    <div className="flex justify-between w-full gap-2">
                                        <Text strong className="text-[13px] truncate">
                                            {item.name}
                                        </Text>
                                        <Tag color={item.status === "published" ? "green" : "default"}>
                                            {item.status}
                                        </Tag>
                                    </div>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>

                <Card
                    size="small"
                    title={selected ? `Edit: ${selected.name}` : "Definition"}
                    className="!rounded-xl flex flex-col min-h-[320px]"
                    extra={
                        selected ? (
                            <Space size={4}>
                                <Button
                                    size="small"
                                    icon={<SaveOutlined />}
                                    onClick={handleSave}
                                    loading={saving}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<RocketOutlined />}
                                    onClick={handlePublish}
                                    style={{ backgroundColor: themeColor }}
                                >
                                    Publish
                                </Button>
                                <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDelete}>
                                    Delete
                                </Button>
                            </Space>
                        ) : null
                    }
                >
                    {!selected ? (
                        <Text type="secondary">Select a flow to edit JSON definition.</Text>
                    ) : (
                        <div className="flex flex-col gap-2 flex-1 min-h-0">
                            <Input
                                value={flowName}
                                onChange={(e) => setFlowName(e.target.value)}
                                placeholder="Flow name"
                            />
                            <Paragraph type="secondary" className="!text-[11px] !mb-0">
                                Nodes: <code>start</code>, <code>message</code>, <code>listen</code> (keyword /
                                regex / default), <code>rag</code> (runs query understanding first; placeholders{" "}
                                <code>{"{{lastUserMessage}}"}</code> prefers rewritten text, plus{" "}
                                <code>{"{{originalUserMessage}}"}</code> / <code>{"{{rewrittenQuery}}"}</code>),{" "}
                                <code>end</code>. Clarification loops back to the same <code>listen</code> when the
                                model asks for more detail.
                            </Paragraph>
                            <TextArea
                                value={editorJson}
                                onChange={(e) => setEditorJson(e.target.value)}
                                className="font-mono text-[11px] flex-1"
                                style={{ minHeight: 220 }}
                            />
                        </div>
                    )}
                </Card>
            </div>

            <Card
                size="small"
                title="Simulator (draft or published)"
                className="!rounded-xl"
                extra={
                    <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={handleStartSim}
                        disabled={!selected || simBusy}
                        style={{ backgroundColor: themeColor }}
                    >
                        Start session
                    </Button>
                }
            >
                {!selected ? (
                    <Text type="secondary">Select a flow to simulate.</Text>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="text-[11px] text-gray-500">
                            Conversation: {simConvId ?? "—"} · Waiting for input: {waitingInput ? "yes" : "no"}
                        </div>
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                            {simHistory.length === 0 ? (
                                <Text type="secondary" className="text-xs">
                                    Click Start session to run automated nodes until the first listen step.
                                </Text>
                            ) : (
                                simHistory.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className="max-w-[90%] rounded-xl px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none [&_p]:m-0"
                                            style={{
                                                background:
                                                    m.role === "user"
                                                        ? themeColor
                                                        : "rgba(var(--theme-color-rgb,139,92,246),0.08)",
                                                color: m.role === "user" ? "#fff" : "inherit",
                                            }}
                                        >
                                            <ReactMarkdown>{m.content}</ReactMarkdown>
                                            {m.references && m.references.length > 0 && (
                                                <div className="mt-1 text-[10px] opacity-80">
                                                    {m.references.length} source(s) cited
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <Space.Compact className="w-full">
                            <Input
                                value={simInput}
                                onChange={(e) => setSimInput(e.target.value)}
                                placeholder={
                                    waitingInput ? "Reply as customer…" : "Start session first or wait for prompt"
                                }
                                disabled={!simConvId || !waitingInput || simBusy}
                                onPressEnter={handleSimSend}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSimSend}
                                loading={simBusy}
                                disabled={!simConvId || !waitingInput}
                                style={{ backgroundColor: themeColor }}
                            />
                        </Space.Compact>
                    </div>
                )}
            </Card>
        </div>
    );
}
